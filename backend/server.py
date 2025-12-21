from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="The Tamale Man API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =============================================================================
# EMAIL NOTIFICATION HELPER (SendGrid)
# =============================================================================

async def send_order_notification_emails(order: dict):
    """Send order notification emails to all configured notification emails"""
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, To
        
        # Get SendGrid API key from env
        sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
        if not sendgrid_api_key:
            logger.warning("SendGrid API key not configured, skipping email notification")
            return False
        
        # Get notification emails from settings
        settings = await db.site_settings.find_one({"settings_id": "main"}, {"_id": 0})
        notification_emails = settings.get("notification_emails", []) if settings else []
        
        # Also include the main email if no notification emails are set
        if not notification_emails and settings:
            notification_emails = [settings.get("email", "")]
        
        notification_emails = [e for e in notification_emails if e]  # Filter empty
        
        if not notification_emails:
            logger.warning("No notification emails configured")
            return False
        
        # Build order items HTML
        items_html = ""
        for item in order.get("items", []):
            toppings_text = ""
            if item.get("toppings"):
                toppings_text = f"<br><small style='color:#666;'>+ {', '.join(t.get('name', '') for t in item['toppings'])}</small>"
            items_html += f"""
            <tr>
                <td style="padding:10px; border-bottom:1px solid #eee;">{item.get('name', 'Item')}{toppings_text}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">{item.get('quantity', 1)}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${item.get('price', 0):.2f}</td>
            </tr>
            """
        
        # Email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #DC2626; color: white; padding: 20px; text-align: center;">
                <h1 style="margin:0;">🌽 New Order Received!</h1>
            </div>
            
            <div style="padding: 20px; background: #f9f9f9;">
                <h2 style="color:#333; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">Order #{order.get('order_id', 'N/A')}</h2>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h3 style="margin-top:0; color:#DC2626;">Customer Details</h3>
                    <p><strong>Name:</strong> {order.get('customer_name', 'N/A')}</p>
                    <p><strong>Email:</strong> {order.get('customer_email', 'N/A')}</p>
                    <p><strong>Phone:</strong> {order.get('customer_phone', 'N/A')}</p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h3 style="margin-top:0; color:#DC2626;">Pickup Details</h3>
                    <p><strong>Date:</strong> {order.get('pickup_date', 'N/A')}</p>
                    <p><strong>Time:</strong> {order.get('pickup_time', 'N/A')}</p>
                    {f"<p><strong>Comments:</strong> {order.get('comments')}</p>" if order.get('comments') else ""}
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <h3 style="margin-top:0; color:#DC2626;">Order Items</h3>
                    <table style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background:#f0f0f0;">
                                <th style="padding:10px; text-align:left;">Item</th>
                                <th style="padding:10px; text-align:center;">Qty</th>
                                <th style="padding:10px; text-align:right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #DC2626;">
                        <p style="text-align:right;"><strong>Subtotal:</strong> ${order.get('subtotal', 0):.2f}</p>
                        <p style="text-align:right;"><strong>Tax (8.25%):</strong> ${order.get('tax', 0):.2f}</p>
                        <p style="text-align:right; font-size: 18px; color:#DC2626;"><strong>Total:</strong> ${order.get('total', 0):.2f}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #333; color: white; padding: 15px; text-align: center;">
                <p style="margin:0;">The Tamale Man - Order Notification</p>
            </div>
        </body>
        </html>
        """
        
        # Send to all notification emails
        sg = SendGridAPIClient(sendgrid_api_key)
        sender_email = settings.get("email", "noreply@thetamaleman.com") if settings else "noreply@thetamaleman.com"
        
        for email in notification_emails:
            try:
                message = Mail(
                    from_email=sender_email,
                    to_emails=email,
                    subject=f"🌽 New Order #{order.get('order_id', 'N/A')} - ${order.get('total', 0):.2f}",
                    html_content=html_content
                )
                response = sg.send(message)
                logger.info(f"Order notification sent to {email}, status: {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to send email to {email}: {e}")
        
        return True
    except Exception as e:
        logger.error(f"Error sending order notifications: {e}")
        return False

# =============================================================================
# MODELS
# =============================================================================

class MenuItem(BaseModel):
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    category_id: str
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    is_featured: bool = False
    is_available: bool = True
    toppings: List[Dict[str, Any]] = []
    meat_choices: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    category_id: str
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    is_featured: bool = False
    toppings: List[Dict[str, Any]] = []
    meat_choices: List[Dict[str, Any]] = []

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_available: Optional[bool] = None
    category_id: Optional[str] = None
    toppings: Optional[List[Dict[str, Any]]] = None
    meat_choices: Optional[List[Dict[str, Any]]] = None

class MenuCategory(BaseModel):
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = ""
    display_order: int = 0
    is_active: bool = True

class MenuCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    display_order: int = 0

class ToppingItem(BaseModel):
    name: str
    price: float = 0.0

class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    toppings: List[ToppingItem] = []
    meat_choice: Optional[str] = None

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    customer_name: str
    customer_email: str
    customer_phone: str
    items: List[OrderItem]
    subtotal: float
    tax: float
    total: float
    status: str = "pending"
    payment_status: str = "unpaid"
    payment_session_id: Optional[str] = None
    pickup_date: str
    pickup_time: str
    comments: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    items: List[OrderItem]
    pickup_date: str
    pickup_time: str
    comments: Optional[str] = None

class ContactSubmission(BaseModel):
    submission_id: str = Field(default_factory=lambda: f"contact_{uuid.uuid4().hex[:12]}")
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactSubmissionCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

class Testimonial(BaseModel):
    testimonial_id: str = Field(default_factory=lambda: f"test_{uuid.uuid4().hex[:12]}")
    author_name: str
    author_title: Optional[str] = None
    content: str
    rating: int = 5
    is_featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TestimonialCreate(BaseModel):
    author_name: str
    author_title: Optional[str] = None
    content: str
    rating: int = 5
    is_featured: bool = False

class OpeningHours(BaseModel):
    day: str
    open_time: str
    close_time: str
    is_closed: bool = False

class SiteSettings(BaseModel):
    settings_id: str = "main_settings"
    site_name: str = "The Tamale Man"
    tagline: str = "Authentic Gourmet Tamales"
    meta_title: str = "The Tamale Man - Gourmet Tamales"
    meta_description: str = "Experience authentic gourmet tamales made with premium ingredients."
    primary_color: str = "#DC2626"
    secondary_color: str = "#020617"
    font_heading: str = "Playfair Display"
    font_body: str = "Manrope"
    hero_title: str = "Authentic Gourmet Tamales"
    hero_subtitle: str = "Crafted with passion, served with pride"
    hero_image: Optional[str] = None
    about_title: str = "Our Story"
    about_content: str = "For generations, our family has been crafting tamales..."
    chef_name: str = "Chef Carlos"
    chef_image: Optional[str] = None
    address: str = "123 Main Street, Austin, TX"
    phone: str = "(512) 555-0123"
    email: str = "hello@thetamaleman.com"
    notification_emails: List[str] = []  # Multiple emails for order notifications
    header_logo: Optional[str] = None  # 200x60px
    footer_logo: Optional[str] = None  # 250x150px (bigger for footer)
    favicon: Optional[str] = None  # 64x64px
    google_maps_embed: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    opening_hours: List[OpeningHours] = []

class SiteSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    tagline: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    font_heading: Optional[str] = None
    font_body: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image: Optional[str] = None
    about_title: Optional[str] = None
    about_content: Optional[str] = None
    chef_name: Optional[str] = None
    chef_image: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notification_emails: Optional[List[str]] = None
    header_logo: Optional[str] = None
    footer_logo: Optional[str] = None
    favicon: Optional[str] = None
    google_maps_embed: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    opening_hours: Optional[List[OpeningHours]] = None

class BlogPost(BaseModel):
    post_id: str = Field(default_factory=lambda: f"post_{uuid.uuid4().hex[:12]}")
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: bool = False
    author_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogPostCreate(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: bool = False

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: Optional[bool] = None

class MediaItem(BaseModel):
    media_id: str = Field(default_factory=lambda: f"media_{uuid.uuid4().hex[:12]}")
    filename: str
    url: str
    file_type: str
    alt_text: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FAQItem(BaseModel):
    faq_id: str = Field(default_factory=lambda: f"faq_{uuid.uuid4().hex[:12]}")
    question: str
    answer: str
    category: str = "general"
    display_order: int = 0
    is_active: bool = True

class FAQItemCreate(BaseModel):
    question: str
    answer: str
    category: str = "general"
    display_order: int = 0

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PageSEO(BaseModel):
    page_id: str = Field(default_factory=lambda: f"seo_{uuid.uuid4().hex[:12]}")
    page_slug: str
    meta_title: str
    meta_description: str
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    keywords: List[str] = []

class PageSEOCreate(BaseModel):
    page_slug: str
    meta_title: str
    meta_description: str
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    keywords: List[str] = []

# =============================================================================
# AUTH HELPERS
# =============================================================================

async def get_current_user(request: Request) -> Optional[User]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        return None
    
    return User(**user)

async def require_admin(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# =============================================================================
# PUBLIC ROUTES
# =============================================================================

@api_router.get("/")
async def root():
    return {"message": "The Tamale Man API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tamale-man-api"}

# Menu Routes (Public)
@api_router.get("/menu/categories", response_model=List[MenuCategory])
async def get_categories():
    categories = await db.menu_categories.find({"is_active": True}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return categories

@api_router.get("/menu/items", response_model=List[MenuItem])
async def get_menu_items(category_id: Optional[str] = None, featured: Optional[bool] = None):
    query = {"is_available": True}
    if category_id:
        query["category_id"] = category_id
    if featured is not None:
        query["is_featured"] = featured
    items = await db.menu_items.find(query, {"_id": 0}).to_list(500)
    return items

@api_router.get("/menu/items/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item

# Testimonials (Public)
@api_router.get("/testimonials", response_model=List[Testimonial])
async def get_testimonials(featured: Optional[bool] = None):
    query = {}
    if featured is not None:
        query["is_featured"] = featured
    testimonials = await db.testimonials.find(query, {"_id": 0}).to_list(100)
    return testimonials

# Site Settings (Public)
@api_router.get("/settings")
async def get_site_settings():
    settings = await db.site_settings.find_one({"settings_id": "main_settings"}, {"_id": 0})
    
    # Create default settings with all fields
    default_settings = SiteSettings()
    default_dict = default_settings.model_dump()
    
    if not settings:
        await db.site_settings.insert_one(default_dict)
        return default_dict
    
    # Merge existing settings with defaults to ensure new fields exist
    for key, value in default_dict.items():
        if key not in settings:
            settings[key] = value
    
    return settings

# FAQ (Public)
@api_router.get("/faq", response_model=List[FAQItem])
async def get_faq_items():
    faqs = await db.faq_items.find({"is_active": True}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return faqs

# Blog (Public)
@api_router.get("/blog/posts")
async def get_blog_posts(published_only: bool = True):
    query = {"is_published": True} if published_only else {}
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return posts

@api_router.get("/blog/posts/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post

# Page SEO (Public)
@api_router.get("/seo/{page_slug}")
async def get_page_seo(page_slug: str):
    seo = await db.page_seo.find_one({"page_slug": page_slug}, {"_id": 0})
    if not seo:
        return {"page_slug": page_slug, "meta_title": "The Tamale Man", "meta_description": "Authentic Gourmet Tamales"}
    return seo

# Contact Form (Public)
@api_router.post("/contact", response_model=ContactSubmission)
async def submit_contact_form(submission: ContactSubmissionCreate, background_tasks: BackgroundTasks):
    contact = ContactSubmission(**submission.model_dump())
    contact_dict = contact.model_dump()
    contact_dict["created_at"] = contact_dict["created_at"].isoformat()
    await db.contact_submissions.insert_one(contact_dict)
    return contact

# =============================================================================
# ORDER & PAYMENT ROUTES
# =============================================================================

@api_router.post("/orders/create")
async def create_order(order_data: OrderCreate, request: Request):
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )
    
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in order_data.items)
    tax = round(subtotal * 0.0825, 2)  # 8.25% tax
    total = round(subtotal + tax, 2)
    
    # Create order
    order = Order(
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        items=order_data.items,
        subtotal=subtotal,
        tax=tax,
        total=total,
        pickup_date=order_data.pickup_date,
        pickup_time=order_data.pickup_time,
        comments=order_data.comments
    )
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["items"] = [item.model_dump() for item in order_data.items]
    
    # Create Stripe checkout session
    host_url = str(request.headers.get("origin", request.base_url))
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY"),
        webhook_url=webhook_url
    )
    
    success_url = f"{host_url}/order/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/order?cancelled=true"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": order.order_id,
            "customer_email": order.customer_email
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    order_dict["payment_session_id"] = session.session_id
    await db.orders.insert_one(order_dict)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "order_id": order.order_id,
        "amount": float(total),
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "customer_email": order.customer_email,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "order_id": order.order_id,
        "checkout_url": session.url,
        "session_id": session.session_id
    }

@api_router.get("/orders/status/{session_id}")
async def get_order_status(session_id: str):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY"),
        webhook_url=""
    )
    
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and order if payment completed
    if checkout_status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "payment_status": "paid"}}
        )
        await db.orders.update_one(
            {"payment_session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "confirmed"}}
        )
    
    order = await db.orders.find_one({"payment_session_id": session_id}, {"_id": 0})
    
    return {
        "payment_status": checkout_status.payment_status,
        "status": checkout_status.status,
        "order": order
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY"),
        webhook_url=""
    )
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
            await db.orders.update_one(
                {"payment_session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid", "status": "confirmed"}}
            )
            
            # Send order notification emails
            order = await db.orders.find_one({"payment_session_id": webhook_response.session_id}, {"_id": 0})
            if order:
                background_tasks.add_task(send_order_notification_emails, order)
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# =============================================================================
# AUTH ROUTES
# =============================================================================

@api_router.get("/auth/session")
async def process_session(session_id: str, request: Request):
    # Exchange session_id for user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_data = response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": user_data["name"], "picture": user_data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "is_admin": True,  # First user is admin
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = JSONResponse(content=user)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return response

@api_router.get("/auth/me")
async def get_current_user_info(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request):
    user = await get_current_user(request)
    if user:
        await db.user_sessions.delete_many({"user_id": user.user_id})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response

# =============================================================================
# ADMIN ROUTES
# =============================================================================

# Menu Management (Admin)
@api_router.post("/admin/menu/categories", response_model=MenuCategory)
async def create_category(category: MenuCategoryCreate, user: User = Depends(require_admin)):
    cat = MenuCategory(**category.model_dump())
    cat_dict = cat.model_dump()
    await db.menu_categories.insert_one(cat_dict)
    return cat

@api_router.put("/admin/menu/categories/{category_id}")
async def update_category(category_id: str, data: dict, user: User = Depends(require_admin)):
    result = await db.menu_categories.update_one(
        {"category_id": category_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "updated"}

@api_router.delete("/admin/menu/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(require_admin)):
    await db.menu_categories.delete_one({"category_id": category_id})
    return {"status": "deleted"}

@api_router.post("/admin/menu/items", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, user: User = Depends(require_admin)):
    menu_item = MenuItem(**item.model_dump())
    item_dict = menu_item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    item_dict["updated_at"] = item_dict["updated_at"].isoformat()
    await db.menu_items.insert_one(item_dict)
    return menu_item

@api_router.put("/admin/menu/items/{item_id}")
async def update_menu_item(item_id: str, data: MenuItemUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.menu_items.update_one(
        {"item_id": item_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"status": "updated"}

@api_router.delete("/admin/menu/items/{item_id}")
async def delete_menu_item(item_id: str, user: User = Depends(require_admin)):
    await db.menu_items.delete_one({"item_id": item_id})
    return {"status": "deleted"}

# Get all menu items for admin (including unavailable)
@api_router.get("/admin/menu/items")
async def get_all_menu_items(user: User = Depends(require_admin)):
    items = await db.menu_items.find({}, {"_id": 0}).to_list(500)
    return items

@api_router.get("/admin/menu/categories")
async def get_all_categories(user: User = Depends(require_admin)):
    categories = await db.menu_categories.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return categories

# Orders Management (Admin)
@api_router.get("/admin/orders")
async def get_orders(status: Optional[str] = None, user: User = Depends(require_admin)):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.put("/admin/orders/{order_id}")
async def update_order(order_id: str, data: dict, user: User = Depends(require_admin)):
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "updated"}

# Contact Submissions (Admin)
@api_router.get("/admin/contacts")
async def get_contacts(user: User = Depends(require_admin)):
    contacts = await db.contact_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return contacts

@api_router.put("/admin/contacts/{submission_id}")
async def update_contact(submission_id: str, data: dict, user: User = Depends(require_admin)):
    await db.contact_submissions.update_one(
        {"submission_id": submission_id},
        {"$set": data}
    )
    return {"status": "updated"}

@api_router.delete("/admin/contacts/{submission_id}")
async def delete_contact(submission_id: str, user: User = Depends(require_admin)):
    await db.contact_submissions.delete_one({"submission_id": submission_id})
    return {"status": "deleted"}

# Site Settings (Admin)
@api_router.put("/admin/settings")
async def update_site_settings(data: SiteSettingsUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    await db.site_settings.update_one(
        {"settings_id": "main_settings"},
        {"$set": update_data},
        upsert=True
    )
    return {"status": "updated"}

# Testimonials (Admin)
@api_router.post("/admin/testimonials", response_model=Testimonial)
async def create_testimonial(testimonial: TestimonialCreate, user: User = Depends(require_admin)):
    test = Testimonial(**testimonial.model_dump())
    test_dict = test.model_dump()
    test_dict["created_at"] = test_dict["created_at"].isoformat()
    await db.testimonials.insert_one(test_dict)
    return test

@api_router.get("/admin/testimonials")
async def get_all_testimonials(user: User = Depends(require_admin)):
    testimonials = await db.testimonials.find({}, {"_id": 0}).to_list(100)
    return testimonials

@api_router.put("/admin/testimonials/{testimonial_id}")
async def update_testimonial(testimonial_id: str, data: dict, user: User = Depends(require_admin)):
    await db.testimonials.update_one(
        {"testimonial_id": testimonial_id},
        {"$set": data}
    )
    return {"status": "updated"}

@api_router.delete("/admin/testimonials/{testimonial_id}")
async def delete_testimonial(testimonial_id: str, user: User = Depends(require_admin)):
    await db.testimonials.delete_one({"testimonial_id": testimonial_id})
    return {"status": "deleted"}

# FAQ (Admin)
@api_router.post("/admin/faq", response_model=FAQItem)
async def create_faq(faq: FAQItemCreate, user: User = Depends(require_admin)):
    faq_item = FAQItem(**faq.model_dump())
    faq_dict = faq_item.model_dump()
    await db.faq_items.insert_one(faq_dict)
    return faq_item

@api_router.get("/admin/faq")
async def get_all_faq(user: User = Depends(require_admin)):
    faqs = await db.faq_items.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return faqs

@api_router.put("/admin/faq/{faq_id}")
async def update_faq(faq_id: str, data: dict, user: User = Depends(require_admin)):
    await db.faq_items.update_one(
        {"faq_id": faq_id},
        {"$set": data}
    )
    return {"status": "updated"}

@api_router.delete("/admin/faq/{faq_id}")
async def delete_faq(faq_id: str, user: User = Depends(require_admin)):
    await db.faq_items.delete_one({"faq_id": faq_id})
    return {"status": "deleted"}

# Blog (Admin)
@api_router.post("/admin/blog/posts", response_model=BlogPost)
async def create_blog_post(post: BlogPostCreate, user: User = Depends(require_admin)):
    blog_post = BlogPost(**post.model_dump(), author_id=user.user_id)
    post_dict = blog_post.model_dump()
    post_dict["created_at"] = post_dict["created_at"].isoformat()
    post_dict["updated_at"] = post_dict["updated_at"].isoformat()
    await db.blog_posts.insert_one(post_dict)
    return blog_post

@api_router.get("/admin/blog/posts")
async def get_all_blog_posts(user: User = Depends(require_admin)):
    posts = await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return posts

@api_router.put("/admin/blog/posts/{post_id}")
async def update_blog_post(post_id: str, data: BlogPostUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.blog_posts.update_one(
        {"post_id": post_id},
        {"$set": update_data}
    )
    return {"status": "updated"}

@api_router.delete("/admin/blog/posts/{post_id}")
async def delete_blog_post(post_id: str, user: User = Depends(require_admin)):
    await db.blog_posts.delete_one({"post_id": post_id})
    return {"status": "deleted"}

# Page SEO (Admin)
@api_router.post("/admin/seo", response_model=PageSEO)
async def create_page_seo(seo: PageSEOCreate, user: User = Depends(require_admin)):
    page_seo = PageSEO(**seo.model_dump())
    seo_dict = page_seo.model_dump()
    await db.page_seo.upsert_one({"page_slug": seo.page_slug}, {"$set": seo_dict}, upsert=True)
    return page_seo

@api_router.put("/admin/seo/{page_slug}")
async def update_page_seo(page_slug: str, data: dict, user: User = Depends(require_admin)):
    await db.page_seo.update_one(
        {"page_slug": page_slug},
        {"$set": data},
        upsert=True
    )
    return {"status": "updated"}

@api_router.get("/admin/seo")
async def get_all_page_seo(user: User = Depends(require_admin)):
    seo_items = await db.page_seo.find({}, {"_id": 0}).to_list(100)
    return seo_items

# Media Library (Admin)
@api_router.get("/admin/media")
async def get_media_items(user: User = Depends(require_admin)):
    media = await db.media_library.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return media

@api_router.post("/admin/media")
async def add_media_item(data: dict, user: User = Depends(require_admin)):
    media_item = MediaItem(
        filename=data.get("filename", ""),
        url=data.get("url", ""),
        file_type=data.get("file_type", "image"),
        alt_text=data.get("alt_text")
    )
    media_dict = media_item.model_dump()
    media_dict["created_at"] = media_dict["created_at"].isoformat()
    await db.media_library.insert_one(media_dict)
    return media_dict

@api_router.delete("/admin/media/{media_id}")
async def delete_media_item(media_id: str, user: User = Depends(require_admin)):
    await db.media_library.delete_one({"media_id": media_id})
    return {"status": "deleted"}

# AI Image Generation (Admin)
@api_router.post("/admin/generate-image")
async def generate_image(data: dict, user: User = Depends(require_admin)):
    from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
    
    prompt = data.get("prompt", "A delicious gourmet tamale on a plate")
    
    image_gen = OpenAIImageGeneration(api_key=os.environ.get("EMERGENT_LLM_KEY"))
    
    images = await image_gen.generate_images(
        prompt=prompt,
        model="gpt-image-1",
        number_of_images=1
    )
    
    if images and len(images) > 0:
        image_base64 = base64.b64encode(images[0]).decode('utf-8')
        return {"image_base64": image_base64}
    else:
        raise HTTPException(status_code=500, detail="No image was generated")

# =============================================================================
# PAGE BUILDER
# =============================================================================

@api_router.get("/admin/page-builder/{page_id}")
async def get_page_content(page_id: str, user: User = Depends(require_admin)):
    page = await db.page_content.find_one({"page_id": page_id}, {"_id": 0})
    if not page:
        return {"page_id": page_id, "sections": []}
    return page

@api_router.put("/admin/page-builder/{page_id}")
async def update_page_content(page_id: str, data: dict, user: User = Depends(require_admin)):
    await db.page_content.update_one(
        {"page_id": page_id},
        {"$set": {"page_id": page_id, "sections": data.get("sections", []), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"status": "updated"}

# =============================================================================
# MERCH STORE
# =============================================================================

class MerchItem(BaseModel):
    item_id: str = Field(default_factory=lambda: f"merch_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    category: str = "apparel"  # apparel, drinkware, accessories, souvenirs
    sizes: List[str] = ["One Size"]
    is_featured: bool = False
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MerchItemCreate(BaseModel):
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    category: str = "apparel"
    sizes: List[str] = ["One Size"]
    is_featured: bool = False

# Public merch endpoints
@api_router.get("/merch/items")
async def get_merch_items(category: Optional[str] = None):
    query = {"is_available": True}
    if category:
        query["category"] = category
    items = await db.merch_items.find(query, {"_id": 0}).to_list(100)
    return items

@api_router.get("/merch/items/{item_id}")
async def get_merch_item(item_id: str):
    item = await db.merch_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Merch item not found")
    return item

# Admin merch endpoints
@api_router.get("/admin/merch/items")
async def get_all_merch_items(user: User = Depends(require_admin)):
    items = await db.merch_items.find({}, {"_id": 0}).to_list(100)
    return items

@api_router.post("/admin/merch/items", response_model=MerchItem)
async def create_merch_item(item: MerchItemCreate, user: User = Depends(require_admin)):
    merch_item = MerchItem(**item.model_dump())
    item_dict = merch_item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    await db.merch_items.insert_one(item_dict)
    return merch_item

@api_router.put("/admin/merch/items/{item_id}")
async def update_merch_item(item_id: str, data: dict, user: User = Depends(require_admin)):
    result = await db.merch_items.update_one(
        {"item_id": item_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Merch item not found")
    return {"status": "updated"}

@api_router.delete("/admin/merch/items/{item_id}")
async def delete_merch_item(item_id: str, user: User = Depends(require_admin)):
    await db.merch_items.delete_one({"item_id": item_id})
    return {"status": "deleted"}

# =============================================================================
# STRIPE SETTINGS (Admin)
# =============================================================================

@api_router.get("/admin/stripe-settings")
async def get_stripe_settings(user: User = Depends(require_admin)):
    settings = await db.stripe_settings.find_one({"settings_id": "stripe"}, {"_id": 0})
    if not settings:
        return {"stripe_api_key": "", "stripe_webhook_secret": ""}
    # Mask the key for security
    masked_key = ""
    if settings.get("stripe_api_key"):
        key = settings["stripe_api_key"]
        masked_key = key[:7] + "..." + key[-4:] if len(key) > 11 else "***"
    return {
        "stripe_api_key": masked_key,
        "stripe_webhook_secret": "***" if settings.get("stripe_webhook_secret") else ""
    }

@api_router.put("/admin/stripe-settings")
async def update_stripe_settings(data: dict, user: User = Depends(require_admin)):
    update_data = {"settings_id": "stripe"}
    
    # Only update if new value provided (not masked)
    if data.get("stripe_api_key") and not data["stripe_api_key"].startswith("sk_"):
        # Keep existing key if masked value sent
        existing = await db.stripe_settings.find_one({"settings_id": "stripe"}, {"_id": 0})
        if existing:
            update_data["stripe_api_key"] = existing.get("stripe_api_key", "")
    elif data.get("stripe_api_key"):
        update_data["stripe_api_key"] = data["stripe_api_key"]
        # Also update environment for immediate use
        os.environ["STRIPE_API_KEY"] = data["stripe_api_key"]
    
    if data.get("stripe_webhook_secret") and data["stripe_webhook_secret"] != "***":
        update_data["stripe_webhook_secret"] = data["stripe_webhook_secret"]
    
    await db.stripe_settings.update_one(
        {"settings_id": "stripe"},
        {"$set": update_data},
        upsert=True
    )
    return {"status": "updated"}

# =============================================================================
# MENU RATINGS (Public)
# =============================================================================

class MenuRating(BaseModel):
    rating_id: str = Field(default_factory=lambda: f"rating_{uuid.uuid4().hex[:12]}")
    item_id: str
    rating: int  # 1-5
    customer_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/menu/items/{item_id}/rate")
async def rate_menu_item(item_id: str, data: dict):
    rating_value = data.get("rating", 5)
    if rating_value < 1 or rating_value > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    rating = MenuRating(
        item_id=item_id,
        rating=rating_value,
        customer_name=data.get("customer_name")
    )
    rating_dict = rating.model_dump()
    rating_dict["created_at"] = rating_dict["created_at"].isoformat()
    await db.menu_ratings.insert_one(rating_dict)
    
    # Calculate new average
    all_ratings = await db.menu_ratings.find({"item_id": item_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_ratings) / len(all_ratings) if all_ratings else 0
    
    # Update item with average rating
    await db.menu_items.update_one(
        {"item_id": item_id},
        {"$set": {"average_rating": round(avg_rating, 1), "rating_count": len(all_ratings)}}
    )
    
    return {"average_rating": round(avg_rating, 1), "rating_count": len(all_ratings)}

@api_router.get("/menu/items/{item_id}/ratings")
async def get_menu_item_ratings(item_id: str):
    ratings = await db.menu_ratings.find({"item_id": item_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    item = await db.menu_items.find_one({"item_id": item_id}, {"_id": 0, "average_rating": 1, "rating_count": 1})
    return {
        "ratings": ratings,
        "average_rating": item.get("average_rating", 0) if item else 0,
        "rating_count": item.get("rating_count", 0) if item else 0
    }

# =============================================================================
# FILE UPLOAD
# =============================================================================

from fastapi import File, UploadFile
import shutil

UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload an image file and return its URL"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")
        
        # Generate unique filename
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return URL (served via static files)
        return {"url": f"/api/uploads/{unique_filename}", "filename": unique_filename}
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")

# Serve uploaded files
from fastapi.staticfiles import StaticFiles

# =============================================================================
# SEED DATA
# =============================================================================

@api_router.post("/seed")
async def seed_database():
    """Seed database with initial data"""
    
    # Check if already seeded
    existing_categories = await db.menu_categories.count_documents({})
    if existing_categories > 0:
        return {"message": "Database already seeded"}
    
    # Seed categories
    categories = [
        {"category_id": "cat_tamales", "name": "Signature Tamales", "description": "Our handcrafted tamales", "display_order": 1, "is_active": True},
        {"category_id": "cat_sides", "name": "Sides", "description": "Perfect accompaniments", "display_order": 2, "is_active": True},
        {"category_id": "cat_drinks", "name": "Drinks", "description": "Refreshing beverages", "display_order": 3, "is_active": True},
        {"category_id": "cat_desserts", "name": "Desserts", "description": "Sweet endings", "display_order": 4, "is_active": True},
    ]
    await db.menu_categories.insert_many(categories)
    
    # Seed menu items
    items = [
        {
            "item_id": "item_pork", "category_id": "cat_tamales", "name": "Pork Carnitas Tamale",
            "description": "Slow-cooked pork carnitas wrapped in masa and corn husk, served with salsa verde",
            "price": 4.99, "is_featured": True, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1582170090097-b251ddbbf7f3?w=400",
            "toppings": [{"name": "Extra Salsa", "price": 0.5}, {"name": "Sour Cream", "price": 0.5}],
            "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": "item_chicken", "category_id": "cat_tamales", "name": "Chicken Tinga Tamale",
            "description": "Shredded chicken in chipotle sauce, wrapped in traditional masa",
            "price": 4.99, "is_featured": True, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400",
            "toppings": [{"name": "Extra Salsa", "price": 0.5}, {"name": "Cheese", "price": 0.75}],
            "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": "item_beef", "category_id": "cat_tamales", "name": "Beef Barbacoa Tamale",
            "description": "Tender beef barbacoa with red chile sauce",
            "price": 5.49, "is_featured": True, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=400",
            "toppings": [{"name": "Extra Salsa", "price": 0.5}, {"name": "Jalapeños", "price": 0.5}],
            "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": "item_veggie", "category_id": "cat_tamales", "name": "Vegetable & Cheese Tamale",
            "description": "Fresh vegetables and melted cheese in herb-infused masa",
            "price": 4.49, "is_featured": False, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
            "toppings": [{"name": "Guacamole", "price": 1.0}],
            "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": "item_rice", "category_id": "cat_sides", "name": "Mexican Rice",
            "description": "Fluffy rice cooked with tomatoes and spices",
            "price": 2.99, "is_featured": False, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400",
            "toppings": [], "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": "item_beans", "category_id": "cat_sides", "name": "Refried Beans",
            "description": "Creamy refried pinto beans topped with cheese",
            "price": 2.99, "is_featured": False, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400",
            "toppings": [], "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": "item_horchata", "category_id": "cat_drinks", "name": "Horchata",
            "description": "Traditional rice drink with cinnamon",
            "price": 3.49, "is_featured": False, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400",
            "toppings": [], "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": "item_churros", "category_id": "cat_desserts", "name": "Churros",
            "description": "Crispy fried dough dusted with cinnamon sugar, served with chocolate sauce",
            "price": 4.99, "is_featured": False, "is_available": True,
            "image_url": "https://images.unsplash.com/photo-1624371414361-e670edf4898b?w=400",
            "toppings": [], "meat_choices": [], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    await db.menu_items.insert_many(items)
    
    # Seed testimonials
    testimonials = [
        {
            "testimonial_id": "test_1", "author_name": "Maria G.", "author_title": "Food Blogger",
            "content": "The best tamales I've ever had outside of my grandmother's kitchen. Authentic flavors that transport you to Mexico!",
            "rating": 5, "is_featured": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "testimonial_id": "test_2", "author_name": "James R.", "author_title": "Local Regular",
            "content": "I order from The Tamale Man every week. The quality is consistently amazing and the service is always friendly.",
            "rating": 5, "is_featured": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "testimonial_id": "test_3", "author_name": "Sarah L.", "author_title": "First-time Visitor",
            "content": "Discovered this gem last month and I'm hooked! The pork carnitas tamale is absolutely incredible.",
            "rating": 5, "is_featured": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    await db.testimonials.insert_many(testimonials)
    
    # Seed FAQ
    faqs = [
        {"faq_id": "faq_1", "question": "Do you offer vegetarian options?", "answer": "Yes! We have delicious vegetable and cheese tamales that are completely vegetarian.", "category": "dietary", "display_order": 1, "is_active": True},
        {"faq_id": "faq_2", "question": "Are your tamales gluten-free?", "answer": "Traditional tamales are made with masa (corn flour) and are naturally gluten-free. However, please inform us of any allergies when ordering.", "category": "dietary", "display_order": 2, "is_active": True},
        {"faq_id": "faq_3", "question": "Do you have parking available?", "answer": "Yes, we have a dedicated parking lot behind the restaurant with 20 spaces available for customers.", "category": "general", "display_order": 3, "is_active": True},
        {"faq_id": "faq_4", "question": "Can I place a large catering order?", "answer": "Absolutely! We love catering events. Please contact us at least 48 hours in advance for orders of 50+ tamales.", "category": "ordering", "display_order": 4, "is_active": True},
        {"faq_id": "faq_5", "question": "What are your pickup hours?", "answer": "We're open for pickup Monday-Saturday 10am-8pm and Sunday 11am-6pm.", "category": "general", "display_order": 5, "is_active": True},
    ]
    await db.faq_items.insert_many(faqs)
    
    # Seed default settings
    default_settings = SiteSettings(
        opening_hours=[
            {"day": "Monday", "open_time": "10:00", "close_time": "20:00", "is_closed": False},
            {"day": "Tuesday", "open_time": "10:00", "close_time": "20:00", "is_closed": False},
            {"day": "Wednesday", "open_time": "10:00", "close_time": "20:00", "is_closed": False},
            {"day": "Thursday", "open_time": "10:00", "close_time": "20:00", "is_closed": False},
            {"day": "Friday", "open_time": "10:00", "close_time": "21:00", "is_closed": False},
            {"day": "Saturday", "open_time": "10:00", "close_time": "21:00", "is_closed": False},
            {"day": "Sunday", "open_time": "11:00", "close_time": "18:00", "is_closed": False},
        ]
    )
    settings_dict = default_settings.model_dump()
    settings_dict["opening_hours"] = [oh.model_dump() if hasattr(oh, 'model_dump') else oh for oh in settings_dict["opening_hours"]]
    await db.site_settings.insert_one(settings_dict)
    
    # Seed default page SEO
    page_seo_items = [
        {"page_id": "seo_home", "page_slug": "home", "meta_title": "The Tamale Man - Authentic Gourmet Tamales", "meta_description": "Experience the finest handcrafted tamales in town. Made with love, served with pride.", "keywords": ["tamales", "mexican food", "gourmet", "authentic"]},
        {"page_id": "seo_menu", "page_slug": "menu", "meta_title": "Our Menu - The Tamale Man", "meta_description": "Explore our selection of authentic tamales, sides, drinks, and desserts.", "keywords": ["menu", "tamales", "mexican cuisine"]},
        {"page_id": "seo_order", "page_slug": "order", "meta_title": "Order Online - The Tamale Man", "meta_description": "Order your favorite tamales online for pickup. Quick, easy, delicious.", "keywords": ["order online", "tamales", "pickup"]},
    ]
    await db.page_seo.insert_many(page_seo_items)
    
    return {"message": "Database seeded successfully"}

# Include the router
app.include_router(api_router)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
