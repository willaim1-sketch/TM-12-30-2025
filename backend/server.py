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
    payment_method: Optional[str] = "stripe"  # stripe, paypal, venmo, cashapp

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

class NavMenuItem(BaseModel):
    id: str = Field(default_factory=lambda: f"nav_{uuid.uuid4().hex[:8]}")
    label: str
    url: str
    is_external: bool = False
    visible: bool = True

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
    notification_emails: List[str] = []
    header_logo: Optional[str] = None
    footer_logo: Optional[str] = None
    favicon: Optional[str] = None
    nav_menu: List[NavMenuItem] = []
    # Merch promo images (landing page)
    merch_tshirt_image: Optional[str] = None
    merch_cups_image: Optional[str] = None
    merch_hats_image: Optional[str] = None
    merch_souvenirs_image: Optional[str] = None
    mascot_image: Optional[str] = None  # Custom image to replace the default silhouette
    google_maps_embed: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    snapchat_url: Optional[str] = None
    youtube_url: Optional[str] = None
    linkedin_url: Optional[str] = None
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
    nav_menu: Optional[List[NavMenuItem]] = None
    # Merch promo images (landing page)
    merch_tshirt_image: Optional[str] = None
    merch_cups_image: Optional[str] = None
    merch_hats_image: Optional[str] = None
    merch_souvenirs_image: Optional[str] = None
    mascot_image: Optional[str] = None  # Custom image to replace the default silhouette
    google_maps_embed: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    snapchat_url: Optional[str] = None
    youtube_url: Optional[str] = None
    linkedin_url: Optional[str] = None
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
    file_size: Optional[int] = None
    alt_text: Optional[str] = None
    category: str = "other"  # homepage, menu, merch, branding, locations, other
    width: Optional[int] = None
    height: Optional[int] = None
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

# =============================================================================
# VISITOR TRACKING
# =============================================================================

@api_router.post("/track-visit")
async def track_visit(request: Request):
    """Track a page visit"""
    try:
        body = await request.json()
        page = body.get("page", "/")
        referrer = body.get("referrer", "")
        user_agent = request.headers.get("user-agent", "")
        
        # Get client IP (handle proxies)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        visit = {
            "visit_id": f"visit_{uuid.uuid4().hex[:12]}",
            "page": page,
            "referrer": referrer,
            "user_agent": user_agent,
            "ip_hash": str(hash(ip))[:12],  # Hash IP for privacy
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        }
        
        await db.visitor_tracking.insert_one(visit)
        
        # Also update daily stats
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await db.visitor_stats.update_one(
            {"date": today},
            {
                "$inc": {"total_visits": 1, f"pages.{page.replace('/', '_') or 'home'}": 1},
                "$addToSet": {"unique_visitors": ip_hash} if (ip_hash := str(hash(ip))[:12]) else {},
                "$setOnInsert": {"date": today, "created_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking visit: {e}")
        return {"success": False}

@api_router.get("/admin/visitor-stats")
async def get_visitor_stats(user: User = Depends(require_admin)):
    """Get visitor statistics for admin dashboard"""
    try:
        # Get stats for last 30 days
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
        
        stats = await db.visitor_stats.find(
            {"date": {"$gte": thirty_days_ago}},
            {"_id": 0}
        ).sort("date", -1).to_list(30)
        
        # Calculate totals
        total_visits = sum(s.get("total_visits", 0) for s in stats)
        
        # Get unique visitors (approximate)
        unique_ips = set()
        for s in stats:
            unique_ips.update(s.get("unique_visitors", []))
        
        # Today's stats
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_stats = await db.visitor_stats.find_one({"date": today}, {"_id": 0})
        
        # Get page breakdown
        page_totals = {}
        for s in stats:
            pages = s.get("pages", {})
            for page, count in pages.items():
                page_totals[page] = page_totals.get(page, 0) + count
        
        return {
            "total_visits_30d": total_visits,
            "unique_visitors_30d": len(unique_ips),
            "today_visits": today_stats.get("total_visits", 0) if today_stats else 0,
            "today_unique": len(today_stats.get("unique_visitors", [])) if today_stats else 0,
            "daily_stats": stats,
            "page_breakdown": page_totals,
            "top_pages": sorted(page_totals.items(), key=lambda x: x[1], reverse=True)[:10]
        }
    except Exception as e:
        logger.error(f"Error getting visitor stats: {e}")
        return {
            "total_visits_30d": 0,
            "unique_visitors_30d": 0,
            "today_visits": 0,
            "today_unique": 0,
            "daily_stats": [],
            "page_breakdown": {},
            "top_pages": []
        }

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
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in order_data.items)
    tax = round(subtotal * 0.0825, 2)  # 8.25% tax
    total = round(subtotal + tax, 2)
    
    # Get payment method (default to stripe)
    payment_method = getattr(order_data, 'payment_method', 'stripe') or 'stripe'
    
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
    order_dict["payment_method"] = payment_method
    
    # Handle different payment methods
    if payment_method == 'stripe':
        from emergentintegrations.payments.stripe.checkout import (
            StripeCheckout, CheckoutSessionRequest
        )
        
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
            "payment_method": "stripe",
            "customer_email": order.customer_email,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "order_id": order.order_id,
            "checkout_url": session.url,
            "session_id": session.session_id
        }
    else:
        # For PayPal, Venmo, Cash App - create order with pending payment
        order_dict["payment_status"] = "unpaid"
        order_dict["status"] = "pending"
        await db.orders.insert_one(order_dict)
        
        # Create payment transaction record
        await db.payment_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "order_id": order.order_id,
            "amount": float(total),
            "currency": "usd",
            "status": "awaiting_payment",
            "payment_status": "pending",
            "payment_method": payment_method,
            "customer_email": order.customer_email,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "order_id": order.order_id,
            "payment_method": payment_method,
            "total": total
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

@api_router.post("/admin/orders/{order_id}/send-email")
async def send_order_email(order_id: str, data: dict, user: User = Depends(require_admin)):
    """Send order details to kitchen/chef via email"""
    email_to = data.get("email")
    if not email_to:
        raise HTTPException(status_code=400, detail="Email address required")
    
    # Get order
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get settings for branding
    settings = await db.site_settings.find_one({"settings_id": "main_settings"}, {"_id": 0})
    site_name = settings.get("site_name", "The Tamale Man") if settings else "The Tamale Man"
    
    # Build items HTML
    items_html = ""
    for item in order.get("items", []):
        toppings_str = ""
        if item.get("toppings"):
            toppings_str = f"<br><small style='color:#666;'>Add-ons: {', '.join([t.get('name', '') for t in item['toppings']])}</small>"
        meat_str = f"<br><small style='color:#666;'>Meat: {item['meat_choice']}</small>" if item.get("meat_choice") else ""
        items_html += f"""
        <tr>
            <td style="padding:12px;border-bottom:1px solid #eee;">{item.get('quantity', 1)}x {item.get('name', '')}{meat_str}{toppings_str}</td>
            <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${item.get('price', 0) * item.get('quantity', 1):.2f}</td>
        </tr>
        """
    
    # Notes section
    # Notes section - always show, with default text if empty
    if order.get("comments"):
        notes_html = f"""
        <div style="background:#fff3cd;border:2px solid #ffc107;border-radius:8px;padding:16px;margin-top:20px;">
            <h3 style="margin:0 0 10px 0;color:#856404;">📝 NOTES / Special Instructions</h3>
            <p style="margin:0;color:#856404;white-space:pre-wrap;">{order.get('comments')}</p>
        </div>
        """
    else:
        notes_html = """
        <div style="background:#f0f0f0;border:2px solid #ccc;border-radius:8px;padding:16px;margin-top:20px;">
            <h3 style="margin:0 0 10px 0;color:#666;">📝 NOTES / Special Instructions</h3>
            <p style="margin:0;color:#888;font-style:italic;">No Special Instructions</p>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <div style="background:#DC2626;color:white;padding:20px;text-align:center;">
                <h1 style="margin:0;font-size:24px;">🌽 {site_name}</h1>
                <p style="margin:5px 0 0 0;opacity:0.9;">Kitchen Order</p>
            </div>
            
            <div style="padding:20px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
                    <div>
                        <p style="margin:0;color:#666;font-size:12px;">ORDER ID</p>
                        <p style="margin:0;font-weight:bold;font-family:monospace;">{order_id}</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="margin:0;color:#666;font-size:12px;">PICKUP</p>
                        <p style="margin:0;font-weight:bold;">{order.get('pickup_date', '')} at {order.get('pickup_time', '')}</p>
                    </div>
                </div>
                
                <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <h3 style="margin:0 0 10px 0;color:#333;">Customer</h3>
                    <p style="margin:0;font-weight:bold;">{order.get('customer_name', '')}</p>
                    <p style="margin:5px 0 0 0;color:#666;">{order.get('customer_phone', '')}</p>
                </div>
                
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f0f0f0;">
                            <th style="padding:12px;text-align:left;">Item</th>
                            <th style="padding:12px;text-align:right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <div style="margin-top:20px;padding-top:20px;border-top:2px solid #eee;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:#666;">Subtotal</span>
                        <span>${order.get('subtotal', 0):.2f}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:#666;">Tax</span>
                        <span>${order.get('tax', 0):.2f}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:bold;padding-top:10px;border-top:1px solid #eee;">
                        <span>TOTAL</span>
                        <span style="color:#DC2626;">${order.get('total', 0):.2f}</span>
                    </div>
                </div>
                
                {notes_html}
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send email via SendGrid
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        sg_api_key = os.environ.get("SENDGRID_API_KEY")
        if not sg_api_key:
            raise HTTPException(status_code=500, detail="SendGrid not configured")
        
        sg = sendgrid.SendGridAPIClient(api_key=sg_api_key)
        
        # Get SendGrid settings for from_email
        sg_settings = await db.sendgrid_settings.find_one({"settings_id": "sendgrid"}, {"_id": 0})
        from_email = sg_settings.get("from_email", "info@thetamaleman.xyz") if sg_settings else "info@thetamaleman.xyz"
        from_name = sg_settings.get("from_name", site_name) if sg_settings else site_name
        
        message = Mail(
            from_email=Email(from_email, from_name),
            to_emails=To(email_to),
            subject=f"🌽 Kitchen Order: {order_id} - {order.get('customer_name', '')}",
            html_content=Content("text/html", html_content)
        )
        
        sg.send(message)
        return {"status": "sent", "email": email_to}
        
    except Exception as e:
        print(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

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
    # Include all fields that are explicitly set (even empty strings to allow clearing)
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:  # Include the field if it has any value (including empty string)
            update_data[k] = v
    
    if update_data:
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
        file_size=data.get("file_size"),
        alt_text=data.get("alt_text"),
        category=data.get("category", "other"),
        width=data.get("width"),
        height=data.get("height")
    )
    media_dict = media_item.model_dump()
    media_dict["created_at"] = media_dict["created_at"].isoformat()
    await db.media_library.insert_one(media_dict)
    return media_dict

@api_router.put("/admin/media/{media_id}")
async def update_media_item(media_id: str, data: dict, user: User = Depends(require_admin)):
    update_data = {}
    allowed_fields = ["filename", "alt_text", "category"]
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    if update_data:
        await db.media_library.update_one(
            {"media_id": media_id},
            {"$set": update_data}
        )
    return {"status": "updated"}

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

# Public endpoint to get page content (for rendering on frontend)
@api_router.get("/page-content/{page_id}")
async def get_public_page_content(page_id: str):
    """Public endpoint to fetch page builder content for rendering"""
    page = await db.page_content.find_one({"page_id": page_id}, {"_id": 0})
    if not page:
        return {"page_id": page_id, "sections": []}
    return page

# Admin endpoint to get page content
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
        {"$set": {
            "page_id": page_id, 
            "sections_top": data.get("sections_top", []),
            "sections_bottom": data.get("sections_bottom", []),
            "sections": data.get("sections", []),  # Keep for backward compatibility
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
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

# SendGrid Settings
@api_router.get("/admin/sendgrid-settings")
async def get_sendgrid_settings(user: User = Depends(require_admin)):
    settings = await db.sendgrid_settings.find_one({"settings_id": "sendgrid"}, {"_id": 0})
    
    # Check if configured via environment or database
    env_key = os.environ.get("SENDGRID_API_KEY", "")
    
    response = {
        "settings": {
            "sendgrid_api_key": "",
            "from_email": "",
            "from_name": ""
        },
        "status": {
            "configured": False,
            "tested": False,
            "lastTest": None,
            "lastTestSuccess": False
        }
    }
    
    if settings:
        # Mask the API key
        if settings.get("sendgrid_api_key"):
            key = settings["sendgrid_api_key"]
            response["settings"]["sendgrid_api_key"] = f"SG.{'*' * 20}...{key[-4:]}" if len(key) > 10 else "SG.****"
            response["status"]["configured"] = True
        response["settings"]["from_email"] = settings.get("from_email", "")
        response["settings"]["from_name"] = settings.get("from_name", "")
        response["status"]["tested"] = settings.get("tested", False)
        response["status"]["lastTest"] = settings.get("last_test")
        response["status"]["lastTestSuccess"] = settings.get("last_test_success", False)
    elif env_key:
        response["settings"]["sendgrid_api_key"] = f"SG.{'*' * 20}...{env_key[-4:]}" if len(env_key) > 10 else "SG.****"
        response["status"]["configured"] = True
    
    return response

@api_router.put("/admin/sendgrid-settings")
async def update_sendgrid_settings(data: dict, user: User = Depends(require_admin)):
    update_data = {"settings_id": "sendgrid"}
    
    # Only update API key if it's a new value (not masked)
    if data.get("sendgrid_api_key") and data["sendgrid_api_key"].startswith("SG.") and "*" not in data["sendgrid_api_key"]:
        update_data["sendgrid_api_key"] = data["sendgrid_api_key"]
        # Also update environment for immediate use
        os.environ["SENDGRID_API_KEY"] = data["sendgrid_api_key"]
    elif data.get("sendgrid_api_key") and "*" in data["sendgrid_api_key"]:
        # Keep existing key if masked value sent
        existing = await db.sendgrid_settings.find_one({"settings_id": "sendgrid"}, {"_id": 0})
        if existing and existing.get("sendgrid_api_key"):
            update_data["sendgrid_api_key"] = existing["sendgrid_api_key"]
    
    if "from_email" in data:
        update_data["from_email"] = data["from_email"]
    if "from_name" in data:
        update_data["from_name"] = data["from_name"]
    
    await db.sendgrid_settings.update_one(
        {"settings_id": "sendgrid"},
        {"$set": update_data},
        upsert=True
    )
    return {"status": "updated"}

@api_router.post("/admin/sendgrid-test")
async def test_sendgrid(user: User = Depends(require_admin)):
    """Test SendGrid connection by sending a test email"""
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        # Get API key from database or environment
        settings = await db.sendgrid_settings.find_one({"settings_id": "sendgrid"}, {"_id": 0})
        api_key = settings.get("sendgrid_api_key") if settings else None
        if not api_key:
            api_key = os.environ.get("SENDGRID_API_KEY")
        
        if not api_key:
            return {"success": False, "error": "SendGrid API key not configured"}
        
        from_email = settings.get("from_email", "test@example.com") if settings else "test@example.com"
        from_name = settings.get("from_name", "Test") if settings else "Test"
        
        # Get admin's email for test
        admin_email = user.email
        
        sg = sendgrid.SendGridAPIClient(api_key=api_key)
        
        message = Mail(
            from_email=Email(from_email, from_name),
            to_emails=To(admin_email),
            subject="🌽 SendGrid Test - Connection Successful!",
            html_content=Content("text/html", f"""
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                    <div style="background:#DC2626;color:white;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="margin:0;">✅ SendGrid Working!</h1>
                    </div>
                    <div style="background:#f9f9f9;padding:20px;border-radius:0 0 12px 12px;">
                        <p>Great news! Your SendGrid configuration is working correctly.</p>
                        <p><strong>From Email:</strong> {from_email}</p>
                        <p><strong>From Name:</strong> {from_name}</p>
                        <p style="color:#666;font-size:12px;margin-top:20px;">
                            This is a test email sent from your admin panel.
                        </p>
                    </div>
                </div>
            """)
        )
        
        response = sg.send(message)
        
        # Update test status in database
        await db.sendgrid_settings.update_one(
            {"settings_id": "sendgrid"},
            {"$set": {
                "tested": True,
                "last_test": datetime.now(timezone.utc).isoformat(),
                "last_test_success": response.status_code in [200, 201, 202]
            }},
            upsert=True
        )
        
        if response.status_code in [200, 201, 202]:
            return {"success": True, "message": f"Test email sent to {admin_email}"}
        else:
            return {"success": False, "error": f"SendGrid returned status {response.status_code}"}
            
    except Exception as e:
        # Update test status as failed
        await db.sendgrid_settings.update_one(
            {"settings_id": "sendgrid"},
            {"$set": {
                "tested": True,
                "last_test": datetime.now(timezone.utc).isoformat(),
                "last_test_success": False
            }},
            upsert=True
        )
        return {"success": False, "error": str(e)}

# PayPal Settings
@api_router.get("/admin/paypal-settings")
async def get_paypal_settings(user: User = Depends(require_admin)):
    settings = await db.paypal_settings.find_one({"settings_id": "paypal"}, {"_id": 0})
    if settings:
        # Mask secret
        if settings.get("client_secret"):
            settings["client_secret"] = "****" + settings["client_secret"][-4:] if len(settings["client_secret"]) > 4 else "****"
        return settings
    return {"enabled": False, "mode": "sandbox", "client_id": "", "client_secret": "", "email": ""}

@api_router.put("/admin/paypal-settings")
async def update_paypal_settings(data: dict, user: User = Depends(require_admin)):
    update_data = {"settings_id": "paypal"}
    
    if "enabled" in data:
        update_data["enabled"] = data["enabled"]
    if "mode" in data:
        update_data["mode"] = data["mode"]
    if "email" in data:
        update_data["email"] = data["email"]
    if "client_id" in data:
        update_data["client_id"] = data["client_id"]
    
    # Only update secret if it's not masked
    if data.get("client_secret") and not data["client_secret"].startswith("****"):
        update_data["client_secret"] = data["client_secret"]
    elif data.get("client_secret") and data["client_secret"].startswith("****"):
        existing = await db.paypal_settings.find_one({"settings_id": "paypal"})
        if existing:
            update_data["client_secret"] = existing.get("client_secret", "")
    
    await db.paypal_settings.update_one(
        {"settings_id": "paypal"},
        {"$set": update_data},
        upsert=True
    )
    return {"status": "updated"}

# Venmo Settings
@api_router.get("/admin/venmo-settings")
async def get_venmo_settings(user: User = Depends(require_admin)):
    settings = await db.venmo_settings.find_one({"settings_id": "venmo"}, {"_id": 0})
    if settings:
        return settings
    return {"enabled": False, "username": "", "display_name": ""}

@api_router.put("/admin/venmo-settings")
async def update_venmo_settings(data: dict, user: User = Depends(require_admin)):
    update_data = {"settings_id": "venmo"}
    
    if "enabled" in data:
        update_data["enabled"] = data["enabled"]
    if "username" in data:
        update_data["username"] = data["username"].replace("@", "")  # Remove @ if included
    if "display_name" in data:
        update_data["display_name"] = data["display_name"]
    
    await db.venmo_settings.update_one(
        {"settings_id": "venmo"},
        {"$set": update_data},
        upsert=True
    )
    return {"status": "updated"}

# Cash App Settings
@api_router.get("/admin/cashapp-settings")
async def get_cashapp_settings(user: User = Depends(require_admin)):
    settings = await db.cashapp_settings.find_one({"settings_id": "cashapp"}, {"_id": 0})
    if settings:
        return settings
    return {"enabled": False, "cashtag": "", "display_name": ""}

@api_router.put("/admin/cashapp-settings")
async def update_cashapp_settings(data: dict, user: User = Depends(require_admin)):
    update_data = {"settings_id": "cashapp"}
    
    if "enabled" in data:
        update_data["enabled"] = data["enabled"]
    if "cashtag" in data:
        update_data["cashtag"] = data["cashtag"].replace("$", "")  # Remove $ if included
    if "display_name" in data:
        update_data["display_name"] = data["display_name"]
    
    await db.cashapp_settings.update_one(
        {"settings_id": "cashapp"},
        {"$set": update_data},
        upsert=True
    )
    return {"status": "updated"}

# Get all enabled payment methods (public)
@api_router.get("/payment-methods")
async def get_payment_methods():
    """Get all enabled payment methods for the checkout page"""
    methods = []
    
    # Check Stripe
    stripe_key = os.environ.get("STRIPE_API_KEY")
    if stripe_key and stripe_key.startswith("sk_"):
        methods.append({"type": "stripe", "name": "Credit/Debit Card", "enabled": True})
    
    # Check PayPal
    paypal = await db.paypal_settings.find_one({"settings_id": "paypal"}, {"_id": 0})
    if paypal and paypal.get("enabled"):
        methods.append({
            "type": "paypal", 
            "name": "PayPal", 
            "enabled": True,
            "email": paypal.get("email", ""),
            "mode": paypal.get("mode", "sandbox")
        })
    
    # Check Venmo
    venmo = await db.venmo_settings.find_one({"settings_id": "venmo"}, {"_id": 0})
    if venmo and venmo.get("enabled"):
        methods.append({
            "type": "venmo", 
            "name": "Venmo", 
            "enabled": True,
            "username": venmo.get("username", ""),
            "display_name": venmo.get("display_name", "")
        })
    
    # Check Cash App
    cashapp = await db.cashapp_settings.find_one({"settings_id": "cashapp"}, {"_id": 0})
    if cashapp and cashapp.get("enabled"):
        methods.append({
            "type": "cashapp", 
            "name": "Cash App", 
            "enabled": True,
            "cashtag": cashapp.get("cashtag", ""),
            "display_name": cashapp.get("display_name", "")
        })
    
    return methods

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
    
    # Seed default merch items
    merch_items = [
        {"item_id": "merch_tshirt_black", "name": "Super Dooper Dooper T-Shirt - Black", "description": "Classic black tee featuring our legendary Super Dooper Dooper Tamale design. 100% cotton, pre-shrunk.", "price": 24.99, "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", "category": "apparel", "sizes": ["S", "M", "L", "XL", "2XL"], "is_featured": True},
        {"item_id": "merch_tshirt_red", "name": "The Tamale Man Logo Tee - Red", "description": "Show your tamale pride with our signature red logo tee. Soft, comfortable, and ready to flex.", "price": 24.99, "image_url": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400", "category": "apparel", "sizes": ["S", "M", "L", "XL", "2XL"], "is_featured": True},
        {"item_id": "merch_hoodie", "name": "Tamale Man Hoodie", "description": "Stay cozy with our premium hoodie. Features the Super Dooper Dooper Tamale on the back.", "price": 49.99, "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400", "category": "apparel", "sizes": ["S", "M", "L", "XL", "2XL"], "is_featured": False},
        {"item_id": "merch_cap", "name": "Tamale Man Dad Cap", "description": "Classic dad cap with embroidered Tamale Man logo. Adjustable strap, one size fits most.", "price": 19.99, "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400", "category": "accessories", "sizes": ["One Size"], "is_featured": True},
        {"item_id": "merch_mug", "name": "Super Dooper Coffee Mug", "description": "Start your morning right with our 12oz ceramic mug. Dishwasher and microwave safe.", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400", "category": "drinkware", "sizes": ["12oz"], "is_featured": True},
        {"item_id": "merch_tumbler", "name": "Tamale Man Tumbler", "description": "20oz insulated tumbler keeps drinks hot or cold for hours. Perfect for on-the-go!", "price": 29.99, "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", "category": "drinkware", "sizes": ["20oz"], "is_featured": False},
        {"item_id": "merch_apron", "name": "Chef's Apron", "description": "Cook like a pro with our branded apron. Adjustable neck strap, two front pockets.", "price": 22.99, "image_url": "https://images.unsplash.com/photo-1591634616938-1dfa7ee2e617?w=400", "category": "accessories", "sizes": ["One Size"], "is_featured": False},
        {"item_id": "merch_ornament", "name": "Tamale Ornament Set", "description": "Festive set of 3 tamale-shaped ornaments. Perfect for the holidays!", "price": 16.99, "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", "category": "souvenirs", "sizes": ["Set of 3"], "is_featured": False},
    ]
    await db.merch_items.insert_many(merch_items)
    
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
