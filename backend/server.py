from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, BackgroundTasks, Response
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
import bcrypt
import jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Nic Nackables BBQ & More API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =============================================================================
# PASSWORD & JWT HELPERS
# =============================================================================

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "fallback-secret-change-me")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),  # 1 hour
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# =============================================================================
# EMERGENT OBJECT STORAGE HELPERS
# =============================================================================
import requests

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "nicnackables-bbq"  # Prefix for all storage paths

_storage_key = None  # Module-level cached storage key

def init_storage(force: bool = False) -> str:
    """Initialize storage and get session key. Call once at startup."""
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set, object storage disabled")
        return None
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Emergent Object Storage initialized successfully")
        return _storage_key
    except Exception as e:
        logger.error(f"Failed to initialize object storage: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to object storage. Returns {"path": "...", "size": 123}"""
    key = init_storage()
    if not key:
        raise Exception("Object storage not initialized")
    
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=300  # 5 min for large videos
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from object storage. Returns (content_bytes, content_type)"""
    key = init_storage()
    if not key:
        raise Exception("Object storage not initialized")
    
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=120
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# MIME type mapping
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml",
    "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm",
    "avi": "video/x-msvideo", "mkv": "video/x-matroska",
    "pdf": "application/pdf", "json": "application/json",
}

def get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension"""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")



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
        
        # Get notification emails from settings (use correct settings_id)
        settings = await db.site_settings.find_one({"settings_id": "main_settings"}, {"_id": 0})
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
                <p style="margin:0;">Nic Nackables BBQ & More - Order Notification</p>
            </div>
        </body>
        </html>
        """
        
        # Send to all notification emails
        sg = SendGridAPIClient(sendgrid_api_key)
        sender_email = settings.get("email", "noreply@nicnackables.com") if settings else "noreply@nicnackables.com"
        
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
    special_instructions: Optional[str] = None

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None  # Link to registered user for order history
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
    site_name: str = "Nic Nackables BBQ & More"
    tagline: str = "BBQ & More"
    meta_title: str = "Nic Nackables BBQ & More"
    meta_description: str = "Experience authentic gourmet tamales made with premium ingredients."
    primary_color: str = "#DC2626"
    secondary_color: str = "#020617"
    font_heading: str = "Playfair Display"
    font_body: str = "Manrope"
    hero_title: str = "BBQ & More"
    hero_subtitle: str = "Crafted with passion, served with pride"
    hero_image: Optional[str] = None
    about_title: str = "Our Story"
    about_content: str = "For generations, our family has been crafting tamales..."
    chef_name: str = "Chef Carlos"
    chef_image: Optional[str] = None
    address: str = "123 Main Street, Austin, TX"
    phone: str = "(512) 555-0123"
    email: str = "hello@nicnackables.com"
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
    show_hours: bool = True  # Toggle to show/hide hours on website
    # Homepage Media Section (Video or Image)
    show_media_section: bool = True  # Toggle to show/hide the media section
    media_section_type: str = "video"  # "video" or "image"
    homepage_video: Optional[str] = None  # YouTube URL or direct video URL
    homepage_media_image: Optional[str] = None  # Image to display instead of video
    # Platform Fee Settings (Admin only - hidden from store owners and customers)
    platform_fee_type: str = "none"  # "none", "flat", "percentage"
    platform_fee_amount: float = 0.0  # Flat amount in dollars OR percentage (e.g., 5.0 = 5%)

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
    show_hours: Optional[bool] = None  # Toggle to show/hide hours on website
    # Homepage Media Section (Video or Image)
    show_media_section: Optional[bool] = None  # Toggle to show/hide the media section
    media_section_type: Optional[str] = None  # "video" or "image"
    homepage_video: Optional[str] = None  # YouTube URL or direct video URL
    homepage_media_image: Optional[str] = None  # Image to display instead of video
    # Platform Fee Settings (Admin only)
    platform_fee_type: Optional[str] = None  # "none", "flat", "percentage"
    platform_fee_amount: Optional[float] = None

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
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    name: Optional[str] = ""  # Legacy field for backward compatibility
    phone: Optional[str] = None
    picture: Optional[str] = None
    role: str = "customer"  # customer, staff, admin
    is_admin: bool = False
    is_staff: bool = False  # Staff can manage orders but not settings/users
    is_store_owner: bool = False  # Store owner can manage orders, messages, menu but not platform fees
    newsletter_subscribed: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @property
    def full_name(self) -> str:
        if self.first_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.name or ""

# Auth Request/Response Models
class CustomerRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    newsletter_subscribed: bool = True

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

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
    """Get current user from JWT access token or session token"""
    # First try JWT access token from cookie
    access_token = request.cookies.get("access_token")
    
    # Fallback to session_token cookie (Google OAuth)
    session_token = request.cookies.get("session_token")
    
    # Also check Authorization header
    if not access_token and not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            # Try to decode as JWT first
            try:
                payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
                if payload.get("type") == "access":
                    access_token = token
                else:
                    session_token = token
            except jwt.InvalidTokenError:
                session_token = token  # Treat as session token
    
    # Try JWT authentication first
    if access_token:
        try:
            payload = jwt.decode(access_token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "access":
                return None
            user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
            if user:
                return _safe_user_from_dict(user)
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            pass  # Fall through to session token check
    
    # Try session token (Google OAuth)
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return _safe_user_from_dict(user)
    
    return None

def _safe_user_from_dict(user_dict: dict) -> User:
    """Safely create a User object from a dictionary, handling missing/extra fields"""
    # Handle created_at field - convert string to datetime if needed
    created_at = user_dict.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at)
        except (ValueError, TypeError):
            created_at = datetime.now(timezone.utc)
    elif not isinstance(created_at, datetime):
        created_at = datetime.now(timezone.utc)
    
    return User(
        user_id=user_dict["user_id"],
        email=user_dict["email"],
        first_name=user_dict.get("first_name", ""),
        last_name=user_dict.get("last_name", ""),
        name=user_dict.get("name", ""),
        phone=user_dict.get("phone"),
        picture=user_dict.get("picture"),
        role=user_dict.get("role", "customer"),
        is_admin=user_dict.get("is_admin", False),
        is_staff=user_dict.get("is_staff", False),
        is_store_owner=user_dict.get("is_store_owner", False),
        newsletter_subscribed=user_dict.get("newsletter_subscribed", True),
        created_at=created_at
    )

async def require_admin(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_staff_or_admin(request: Request) -> User:
    """Allow staff or admin users to access order management features"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.is_admin and not user.is_staff:
        raise HTTPException(status_code=403, detail="Staff or admin access required")
    return user

async def require_store_owner_or_admin(request: Request) -> User:
    """Allow store owners or admin to access most store management features (not platform fees)"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.is_admin and not user.is_store_owner and not user.is_staff:
        raise HTTPException(status_code=403, detail="Store owner or admin access required")
    return user

async def check_brute_force(identifier: str) -> bool:
    """Check if login is blocked due to brute force protection"""
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until > datetime.now(timezone.utc):
                return True  # Still locked
            # Lockout expired, reset attempts
            await db.login_attempts.delete_one({"identifier": identifier})
    return False

async def record_failed_login(identifier: str):
    """Record a failed login attempt"""
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {
            "$inc": {"attempts": 1},
            "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    # Check if we need to lock
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("attempts", 0) >= 5:
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}}
        )

async def clear_failed_logins(identifier: str):
    """Clear failed login attempts on successful login"""
    await db.login_attempts.delete_one({"identifier": identifier})

# =============================================================================
# PUBLIC ROUTES
# =============================================================================

@api_router.get("/")
async def root():
    return {"message": "Nic Nackables BBQ & More API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "nicnackables-api"}

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
async def get_site_settings(request: Request):
    settings = await db.site_settings.find_one({"settings_id": "main_settings"}, {"_id": 0})
    
    # Create default settings with all fields
    default_settings = SiteSettings()
    default_dict = default_settings.model_dump()
    
    if not settings:
        await db.site_settings.insert_one(default_dict)
        settings = default_dict
    else:
        # Merge existing settings with defaults to ensure new fields exist
        for key, value in default_dict.items():
            if key not in settings:
                settings[key] = value
    
    # Hide platform fee settings from public (non-admin users)
    # Check if current user is admin
    current_user = await get_current_user(request)
    if not current_user or not current_user.is_admin:
        settings.pop("platform_fee_type", None)
        settings.pop("platform_fee_amount", None)
    
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
        return {"page_slug": page_slug, "meta_title": "Nic Nackables BBQ & More", "meta_description": "Delicious BBQ and More"}
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
    # SECURITY: Calculate totals using DB prices, not client-supplied prices
    verified_items = []
    subtotal = 0.0
    
    for item in order_data.items:
        # Look up the actual menu item price from database
        menu_item = await db.menu_items.find_one({"item_id": item.item_id})
        if menu_item:
            actual_price = float(menu_item.get("price", 0))
            # Calculate toppings price if any
            toppings_total = 0.0
            if item.toppings:
                for topping in item.toppings:
                    # Find topping price from menu item's toppings
                    for menu_topping in menu_item.get("toppings", []):
                        if menu_topping.get("name") == topping.get("name"):
                            toppings_total += float(menu_topping.get("price", 0))
                            break
            
            item_total = (actual_price + toppings_total) * item.quantity
            subtotal += item_total
            
            # Store verified item with DB price
            verified_items.append({
                "item_id": item.item_id,
                "name": item.name,
                "price": actual_price,
                "quantity": item.quantity,
                "toppings": item.toppings,
                "special_instructions": item.special_instructions
            })
        else:
            # Item not found in DB - use submitted price as fallback (for merch, etc.)
            subtotal += item.price * item.quantity
            verified_items.append(item.model_dump())
    
    tax = round(subtotal * 0.0825, 2)  # 8.25% tax
    total = round(subtotal + tax, 2)
    
    # Calculate platform fee (hidden from customer, admin only)
    settings = await db.settings.find_one({"settings_id": "main_settings"})
    platform_fee = 0.0
    platform_fee_type = settings.get("platform_fee_type", "none") if settings else "none"
    platform_fee_amount = float(settings.get("platform_fee_amount", 0)) if settings else 0.0
    
    if platform_fee_type == "flat":
        # Flat fee per item
        total_items = sum(item.quantity for item in order_data.items)
        platform_fee = round(platform_fee_amount * total_items, 2)
    elif platform_fee_type == "percentage":
        # Percentage of subtotal
        platform_fee = round(subtotal * (platform_fee_amount / 100), 2)
    
    # Get payment method (default to stripe)
    payment_method = getattr(order_data, 'payment_method', 'stripe') or 'stripe'
    
    # Try to get current user for order history linking
    current_user = await get_current_user(request)
    user_id = current_user.user_id if current_user else None
    
    # Create order
    order = Order(
        user_id=user_id,
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
    order_dict["items"] = verified_items  # Use DB-verified prices, not client prices
    order_dict["payment_method"] = payment_method
    order_dict["platform_fee"] = platform_fee  # Hidden from customer, visible to admin only
    
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


# Customer order history
@api_router.get("/orders/my-orders")
async def get_my_orders(request: Request):
    """Get order history for the current logged-in user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in to view your orders")
    
    # Find orders by user_id or by email (for orders placed before user_id was added)
    orders = await db.orders.find(
        {"$or": [
            {"user_id": user.user_id},
            {"customer_email": user.email.lower()}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders


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

# Customer Registration (for website users who want to order)
@api_router.post("/auth/customer/register")
async def customer_register(data: CustomerRegisterRequest, request: Request):
    """Register a new customer account"""
    email = data.email.lower().strip()
    
    # Check if email already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create customer
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed = hash_password(data.password)
    
    new_user = {
        "user_id": user_id,
        "email": email,
        "first_name": data.first_name.strip(),
        "last_name": data.last_name.strip(),
        "phone": data.phone.strip() if data.phone else None,
        "password_hash": hashed,
        "role": "customer",
        "is_admin": False,
        "newsletter_subscribed": data.newsletter_subscribed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    # Create tokens
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    # Prepare response
    user_response = {
        "user_id": user_id,
        "email": email,
        "first_name": data.first_name,
        "last_name": data.last_name,
        "name": f"{data.first_name} {data.last_name}",
        "phone": data.phone,
        "role": "customer",
        "is_admin": False,
        "newsletter_subscribed": data.newsletter_subscribed
    }
    
    response = JSONResponse(content=user_response)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    
    logger.info(f"New customer registered: {email}")
    return response

# Admin Registration (legacy, keeps first user as admin)
@api_router.post("/auth/register")
async def register(data: RegisterRequest, request: Request):
    """Register a new user with email and password"""
    email = data.email.lower().strip()
    
    # Check if email already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed = hash_password(data.password)
    
    # Check if this is the first user (make them admin)
    user_count = await db.users.count_documents({})
    is_admin = user_count == 0
    
    new_user = {
        "user_id": user_id,
        "email": email,
        "name": data.name,
        "password_hash": hashed,
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    # Create tokens
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    # Prepare response (exclude password_hash)
    user_response = {
        "user_id": user_id,
        "email": email,
        "name": data.name,
        "is_admin": is_admin
    }
    
    response = JSONResponse(content=user_response)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    
    return response

# Email/Password Login
@api_router.post("/auth/login")
async def login(data: LoginRequest, request: Request):
    """Login with email and password"""
    email = data.email.lower().strip()
    
    # Get client IP for brute force tracking
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    identifier = f"{ip}:{email}"
    
    # Check brute force protection
    if await check_brute_force(identifier):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again in 15 minutes.")
    
    # Find user
    user = await db.users.find_one({"email": email})
    if not user:
        await record_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user has password_hash (might be Google OAuth only user)
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="This account uses Google Sign-In. Please login with Google.")
    
    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        await record_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts on successful login
    await clear_failed_logins(identifier)
    
    # Create tokens
    access_token = create_access_token(user["user_id"], email)
    refresh_token = create_refresh_token(user["user_id"])
    
    # Build name from first_name/last_name or fall back to name field
    name = user.get("name", "")
    if user.get("first_name"):
        name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    
    # Prepare response (exclude password_hash)
    user_response = {
        "user_id": user["user_id"],
        "email": user["email"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "name": name,
        "phone": user.get("phone"),
        "picture": user.get("picture"),
        "role": user.get("role", "customer"),
        "is_admin": user.get("is_admin", False),
        "is_staff": user.get("is_staff", False),
        "is_store_owner": user.get("is_store_owner", False),
        "newsletter_subscribed": user.get("newsletter_subscribed", True)
    }
    
    response = JSONResponse(content=user_response)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    
    return response

# Refresh Token
@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    """Refresh access token using refresh token"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(refresh_token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Create new access token
        new_access_token = create_access_token(user["user_id"], user["email"])
        
        response = JSONResponse(content={"message": "Token refreshed"})
        response.set_cookie(key="access_token", value=new_access_token, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
        
        return response
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# Forgot Password
@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Request password reset email"""
    email = data.email.lower().strip()
    
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If this email is registered, you will receive a password reset link."}
    
    # Check if user has a password (not OAuth only)
    if not user.get("password_hash"):
        return {"message": "This account uses Google Sign-In. Please login with Google."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_reset_tokens.insert_one({
        "token": reset_token,
        "user_id": user["user_id"],
        "email": email,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Log the reset link (in production, would send email)
    reset_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
    logger.info(f"Password reset requested for {email}")
    
    # TODO: Send email via SendGrid when configured
    # For now, log the URL (remove in production)
    logger.info(f"Password reset link (DEV ONLY): {reset_url}")
    
    # SECURITY: Never return the token/URL in the response - only send via email
    return {"message": "If this email is registered, you will receive a password reset link."}

# Reset Password
@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using token"""
    token_doc = await db.password_reset_tokens.find_one({"token": data.token})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if token_doc.get("used"):
        raise HTTPException(status_code=400, detail="This reset link has already been used")
    
    expires_at = token_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    hashed = hash_password(data.new_password)
    await db.users.update_one(
        {"user_id": token_doc["user_id"]},
        {"$set": {"password_hash": hashed}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

# Google OAuth Session (existing)
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
        # SECURITY: New OAuth users are customers by default, NOT admins
        # Admin is only assigned via ADMIN_EMAIL env var at startup
        admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
        is_admin = user_data["email"].lower() == admin_email
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "first_name": user_data["name"].split()[0] if user_data["name"] else "",
            "last_name": " ".join(user_data["name"].split()[1:]) if user_data["name"] and len(user_data["name"].split()) > 1 else "",
            "picture": user_data.get("picture"),
            "role": "admin" if is_admin else "customer",
            "is_admin": is_admin,
            "is_staff": False,
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
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    # Build response with explicit fields
    user_response = {
        "user_id": user["user_id"],
        "email": user["email"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "name": user.get("name", ""),
        "phone": user.get("phone"),
        "picture": user.get("picture"),
        "role": user.get("role", "customer"),
        "is_admin": user.get("is_admin", False),
        "is_staff": user.get("is_staff", False),
        "is_store_owner": user.get("is_store_owner", False),
        "newsletter_subscribed": user.get("newsletter_subscribed", True)
    }
    
    response = JSONResponse(content=user_response)
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
    
    # Return user data with computed name
    user_dict = user.model_dump()
    if user.first_name:
        user_dict["name"] = f"{user.first_name} {user.last_name}".strip()
    return user_dict

# Update Customer Profile
class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    newsletter_subscribed: Optional[bool] = None

@api_router.put("/auth/profile")
async def update_profile(data: UpdateProfileRequest, request: Request):
    """Update customer profile information"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    update_data = {}
    if data.first_name is not None:
        update_data["first_name"] = data.first_name.strip()
    if data.last_name is not None:
        update_data["last_name"] = data.last_name.strip()
    if data.phone is not None:
        update_data["phone"] = data.phone.strip() if data.phone else None
    if data.newsletter_subscribed is not None:
        update_data["newsletter_subscribed"] = data.newsletter_subscribed
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    # Return updated user
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    return updated_user

# Get newsletter subscribers (admin only)
@api_router.get("/admin/newsletter-subscribers")
async def get_newsletter_subscribers(request: Request, user: User = Depends(require_admin)):
    """Get list of users subscribed to newsletter"""
    subscribers = await db.users.find(
        {"newsletter_subscribed": True},
        {"_id": 0, "password_hash": 0}
    ).to_list(length=None)
    return {"subscribers": subscribers, "count": len(subscribers)}

@api_router.post("/auth/logout")
async def logout(request: Request):
    user = await get_current_user(request)
    if user:
        await db.user_sessions.delete_many({"user_id": user.user_id})
    
    response = JSONResponse(content={"message": "Logged out"})
    # Clear all auth cookies
    response.delete_cookie(key="session_token", path="/")
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return response

# =============================================================================
# ADMIN ROUTES
# =============================================================================

# Menu Management (Admin)
@api_router.post("/admin/menu/categories")
async def create_category(category: MenuCategoryCreate, user: User = Depends(require_admin)):
    cat = MenuCategory(**category.model_dump())
    cat_dict = cat.model_dump()
    await db.menu_categories.insert_one(cat_dict)
    cat_dict.pop("_id", None)
    return cat_dict

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

@api_router.post("/admin/menu/items")
async def create_menu_item(item: MenuItemCreate, user: User = Depends(require_admin)):
    menu_item = MenuItem(**item.model_dump())
    item_dict = menu_item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    item_dict["updated_at"] = item_dict["updated_at"].isoformat()
    await db.menu_items.insert_one(item_dict)
    # Remove _id from response (MongoDB adds it)
    item_dict.pop("_id", None)
    return item_dict

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

# Orders Management (Admin and Staff)
@api_router.get("/admin/orders")
async def get_orders(request: Request, status: Optional[str] = None, user: User = Depends(require_staff_or_admin)):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Hide platform_fee from non-admin users (store owners and staff can't see it)
    if not user.is_admin:
        for order in orders:
            order.pop("platform_fee", None)
    
    return orders

@api_router.get("/admin/platform-earnings")
async def get_platform_earnings(user: User = Depends(require_admin)):
    """Get platform fee earnings summary (admin only)"""
    # Get all orders with platform fees
    orders = await db.orders.find(
        {"platform_fee": {"$exists": True, "$gt": 0}},
        {"_id": 0, "order_id": 1, "total": 1, "platform_fee": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(1000)
    
    # Calculate totals
    total_earnings = sum(order.get("platform_fee", 0) for order in orders)
    completed_earnings = sum(
        order.get("platform_fee", 0) 
        for order in orders 
        if order.get("status") in ["completed", "ready", "paid"]
    )
    pending_earnings = sum(
        order.get("platform_fee", 0) 
        for order in orders 
        if order.get("status") in ["pending", "confirmed", "preparing"]
    )
    
    # Get current fee settings
    settings = await db.site_settings.find_one({"settings_id": "main_settings"}, {"_id": 0})
    fee_type = settings.get("platform_fee_type", "none") if settings else "none"
    fee_amount = settings.get("platform_fee_amount", 0) if settings else 0
    
    return {
        "total_earnings": round(total_earnings, 2),
        "completed_earnings": round(completed_earnings, 2),
        "pending_earnings": round(pending_earnings, 2),
        "total_orders_with_fees": len(orders),
        "current_fee_type": fee_type,
        "current_fee_amount": fee_amount,
        "recent_orders": orders[:20]  # Last 20 orders with fees
    }

@api_router.put("/admin/orders/{order_id}")
async def update_order(order_id: str, data: dict, user: User = Depends(require_staff_or_admin)):
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "updated"}

@api_router.post("/admin/orders/{order_id}/send-email")
async def send_order_email(order_id: str, data: dict, user: User = Depends(require_staff_or_admin)):
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
    site_name = settings.get("site_name", "Nic Nackables BBQ & More") if settings else "Nic Nackables BBQ & More"
    
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
        from_email = sg_settings.get("from_email", "info@nicnackables.com") if sg_settings else "info@nicnackables.com"
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
@api_router.post("/admin/testimonials")
async def create_testimonial(testimonial: TestimonialCreate, user: User = Depends(require_admin)):
    test = Testimonial(**testimonial.model_dump())
    test_dict = test.model_dump()
    test_dict["created_at"] = test_dict["created_at"].isoformat()
    await db.testimonials.insert_one(test_dict)
    test_dict.pop("_id", None)
    return test_dict

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
@api_router.post("/admin/faq")
async def create_faq(faq: FAQItemCreate, user: User = Depends(require_admin)):
    faq_item = FAQItem(**faq.model_dump())
    faq_dict = faq_item.model_dump()
    await db.faq_items.insert_one(faq_dict)
    faq_dict.pop("_id", None)
    return faq_dict

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
@api_router.post("/admin/blog/posts")
async def create_blog_post(post: BlogPostCreate, user: User = Depends(require_admin)):
    blog_post = BlogPost(**post.model_dump(), author_id=user.user_id)
    post_dict = blog_post.model_dump()
    post_dict["created_at"] = post_dict["created_at"].isoformat()
    post_dict["updated_at"] = post_dict["updated_at"].isoformat()
    await db.blog_posts.insert_one(post_dict)
    post_dict.pop("_id", None)
    return post_dict

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
    # Remove _id from response (MongoDB adds it but it's not JSON serializable)
    media_dict.pop("_id", None)
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

@api_router.post("/admin/merch/items")
async def create_merch_item(item: MerchItemCreate, user: User = Depends(require_admin)):
    merch_item = MerchItem(**item.model_dump())
    item_dict = merch_item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    await db.merch_items.insert_one(item_dict)
    item_dict.pop("_id", None)
    return item_dict

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


# ==================== Admin User Management ====================

class UserUpdateRequest(BaseModel):
    """Request model for updating user data"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class PasswordResetByAdminRequest(BaseModel):
    """Request model for admin-initiated password reset"""
    new_password: str

@api_router.get("/admin/users")
async def get_all_users(current_user: User = Depends(get_current_user)):
    """Get all registered users (admin only)"""
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}  # Exclude sensitive data
    ).to_list(1000)
    
    return users

@api_router.get("/admin/users/{user_id}")
async def get_user_by_id(user_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific user by ID (admin only)"""
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@api_router.put("/admin/users/{user_id}")
async def update_user(
    user_id: str, 
    user_data: UserUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user details (admin only) - NOT for role changes"""
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow modifying the main admin account's core info
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    if user.get("email", "").lower() == admin_email:
        raise HTTPException(status_code=403, detail="Cannot modify the primary admin account")
    
    update_fields = {}
    if user_data.first_name is not None:
        update_fields["first_name"] = user_data.first_name
    if user_data.last_name is not None:
        update_fields["last_name"] = user_data.last_name
    if user_data.phone is not None:
        update_fields["phone"] = user_data.phone
    
    if update_fields:
        # Update name field for backward compatibility
        if "first_name" in update_fields or "last_name" in update_fields:
            fn = update_fields.get("first_name", user.get("first_name", ""))
            ln = update_fields.get("last_name", user.get("last_name", ""))
            update_fields["name"] = f"{fn} {ln}".strip()
        
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
    
    updated_user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    return updated_user

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(
    user_id: str,
    password_data: PasswordResetByAdminRequest,
    current_user: User = Depends(get_current_user)
):
    """Reset a user's password (admin only)"""
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow resetting the main admin's password through this endpoint
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    if user.get("email", "").lower() == admin_email:
        raise HTTPException(
            status_code=403, 
            detail="Cannot reset primary admin password. Use environment variables."
        )
    
    # Validate password
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash and update password
    hashed = hash_password(password_data.new_password)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": hashed}}
    )
    
    logger.info(f"Admin reset password for user: {user.get('email')}")
    return {"status": "success", "message": "Password reset successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user account (admin only)"""
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting the main admin account
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    if user.get("email", "").lower() == admin_email:
        raise HTTPException(status_code=403, detail="Cannot delete the primary admin account")
    
    # Delete user
    await db.users.delete_one({"user_id": user_id})
    
    logger.info(f"Admin deleted user: {user.get('email')}")
    return {"status": "success", "message": "User deleted successfully"}


class UserRoleUpdate(BaseModel):
    """Request model for updating user role"""
    role: str  # "customer" or "staff"

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_data: UserRoleUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a user's role to staff, store_owner, or customer (admin only)"""
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate role
    valid_roles = ["customer", "staff", "store_owner"]
    if role_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(valid_roles)}")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow changing the main admin's role
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    if user.get("email", "").lower() == admin_email:
        raise HTTPException(status_code=403, detail="Cannot change the primary admin's role")
    
    # Update role
    is_staff = role_data.role == "staff"
    is_store_owner = role_data.role == "store_owner"
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "role": role_data.role,
            "is_staff": is_staff,
            "is_store_owner": is_store_owner,
            "is_admin": False  # Cannot promote to admin via this endpoint
        }}
    )
    
    logger.info(f"Admin updated user role: {user.get('email')} -> {role_data.role}")
    
    updated_user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    return updated_user



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
    """Upload an image or video file - uses Emergent Object Storage for persistence"""
    try:
        # Validate file type
        allowed_image_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
        allowed_video_types = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]
        allowed_types = allowed_image_types + allowed_video_types
        
        content_type = file.content_type or get_mime_type(file.filename)
        if content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images and videos allowed.")
        
        # Read file contents
        contents = await file.read()
        
        # Validate file size (100MB max for videos, 5MB for images)
        is_video = content_type in allowed_video_types
        max_size = 100 * 1024 * 1024 if is_video else 5 * 1024 * 1024
        if len(contents) > max_size:
            max_mb = max_size // (1024 * 1024)
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {max_mb}MB.")
        
        # Generate unique filename
        file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ("mp4" if is_video else "png")
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
        
        # Try to upload to Emergent Object Storage first
        storage_key = init_storage()
        if storage_key:
            try:
                storage_path = f"{APP_NAME}/uploads/{unique_filename}"
                result = put_object(storage_path, contents, content_type)
                
                # Store reference in database
                await db.uploaded_files.insert_one({
                    "file_id": f"file_{uuid.uuid4().hex[:12]}",
                    "storage_path": result["path"],
                    "original_filename": file.filename,
                    "content_type": content_type,
                    "size": result.get("size", len(contents)),
                    "is_video": is_video,
                    "is_deleted": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                logger.info(f"Uploaded to object storage: {storage_path}")
                
                # Return URL for serving via our endpoint
                return {
                    "url": f"/api/storage/{result['path']}", 
                    "filename": unique_filename,
                    "file_size": len(contents),
                    "storage": "cloud"
                }
            except Exception as e:
                logger.warning(f"Object storage upload failed, falling back to local: {e}")
        
        # Fallback to local storage
        file_path = UPLOAD_DIR / unique_filename
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
        
        return {
            "url": f"/api/uploads/{unique_filename}", 
            "filename": unique_filename,
            "file_size": len(contents),
            "storage": "local"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")

# Serve files from Emergent Object Storage
@api_router.get("/storage/{path:path}")
async def serve_storage_file(path: str):
    """Serve files from Emergent Object Storage"""
    try:
        # Check if file exists in our database
        file_record = await db.uploaded_files.find_one({
            "storage_path": path,
            "is_deleted": False
        })
        
        if not file_record:
            # Try to serve anyway (for files uploaded before DB tracking)
            pass
        
        # Get file from object storage
        data, content_type = get_object(path)
        
        # Use stored content type if available
        if file_record and file_record.get("content_type"):
            content_type = file_record["content_type"]
        
        return Response(
            content=data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
                "Content-Disposition": f"inline; filename=\"{path.split('/')[-1]}\""
            }
        )
    except Exception as e:
        logger.error(f"Error serving storage file {path}: {e}")
        raise HTTPException(status_code=404, detail="File not found")

# Serve uploaded files from local storage (legacy/fallback)


# =============================================================================
# CLOUD STORAGE MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/admin/storage/stats")
async def get_storage_stats(user: User = Depends(require_admin)):
    """Get cloud storage usage statistics"""
    try:
        # Count files in cloud storage
        cloud_files = await db.uploaded_files.count_documents({"is_deleted": False})
        
        # Get total size of cloud files
        pipeline = [
            {"$match": {"is_deleted": False}},
            {"$group": {"_id": None, "total_size": {"$sum": "$size"}}}
        ]
        size_result = await db.uploaded_files.aggregate(pipeline).to_list(1)
        total_cloud_size = size_result[0]["total_size"] if size_result else 0
        
        # Count media library items
        total_media = await db.media_library.count_documents({})
        
        # Count media items with cloud URLs vs local URLs
        cloud_media = await db.media_library.count_documents({"url": {"$regex": "^/api/storage/"}})
        local_media = total_media - cloud_media
        
        # Get local uploads folder size
        local_size = 0
        if UPLOAD_DIR.exists():
            for f in UPLOAD_DIR.iterdir():
                if f.is_file():
                    local_size += f.stat().st_size
        
        return {
            "cloud_files": cloud_files,
            "cloud_size_bytes": total_cloud_size,
            "cloud_size_formatted": format_bytes(total_cloud_size),
            "local_files": local_media,
            "local_size_bytes": local_size,
            "local_size_formatted": format_bytes(local_size),
            "total_media_items": total_media,
            "cloud_media_count": cloud_media,
            "local_media_count": local_media,
            "migration_pending": local_media
        }
    except Exception as e:
        logger.error(f"Error getting storage stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get storage stats")

def format_bytes(bytes_val):
    """Format bytes to human readable string"""
    if bytes_val < 1024:
        return f"{bytes_val} B"
    elif bytes_val < 1024 * 1024:
        return f"{bytes_val / 1024:.1f} KB"
    elif bytes_val < 1024 * 1024 * 1024:
        return f"{bytes_val / (1024 * 1024):.2f} MB"
    else:
        return f"{bytes_val / (1024 * 1024 * 1024):.2f} GB"

@api_router.post("/admin/storage/migrate")
async def migrate_to_cloud(user: User = Depends(require_admin)):
    """Migrate local media files to cloud storage"""
    storage_key = init_storage()
    if not storage_key:
        raise HTTPException(status_code=500, detail="Cloud storage not available")
    
    migrated = 0
    failed = 0
    already_cloud = 0
    
    # Get all media items with local URLs
    media_items = await db.media_library.find({}).to_list(1000)
    
    for item in media_items:
        url = item.get("url", "")
        
        # Skip if already cloud storage
        if url.startswith("/api/storage/"):
            already_cloud += 1
            continue
        
        # Skip if external URL
        if url.startswith("http://") or url.startswith("https://"):
            continue
        
        # Try to read local file
        if url.startswith("/api/uploads/"):
            filename = url.replace("/api/uploads/", "")
            local_path = UPLOAD_DIR / filename
            
            if local_path.exists():
                try:
                    # Read file
                    with open(local_path, "rb") as f:
                        data = f.read()
                    
                    # Determine content type
                    content_type = get_mime_type(filename)
                    
                    # Upload to cloud
                    storage_path = f"{APP_NAME}/uploads/{filename}"
                    result = put_object(storage_path, data, content_type)
                    
                    # Update media library entry
                    new_url = f"/api/storage/{result['path']}"
                    await db.media_library.update_one(
                        {"media_id": item["media_id"]},
                        {"$set": {"url": new_url, "storage": "cloud"}}
                    )
                    
                    # Track in uploaded_files
                    await db.uploaded_files.update_one(
                        {"storage_path": result["path"]},
                        {"$set": {
                            "file_id": f"file_{uuid.uuid4().hex[:12]}",
                            "storage_path": result["path"],
                            "original_filename": item.get("filename", filename),
                            "content_type": content_type,
                            "size": len(data),
                            "is_deleted": False,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }},
                        upsert=True
                    )
                    
                    migrated += 1
                    logger.info(f"Migrated {filename} to cloud storage")
                    
                    # Delete local file after successful migration
                    try:
                        local_path.unlink()
                        logger.info(f"Deleted local file after migration: {filename}")
                    except Exception as del_e:
                        logger.warning(f"Failed to delete local file {filename}: {del_e}")
                except Exception as e:
                    logger.error(f"Failed to migrate {filename}: {e}")
                    failed += 1
            else:
                logger.warning(f"Local file not found: {local_path}")
                failed += 1
    
    return {
        "migrated": migrated,
        "failed": failed,
        "already_cloud": already_cloud,
        "message": f"Migration complete. {migrated} files migrated, {failed} failed, {already_cloud} already in cloud."
    }

@api_router.post("/admin/storage/migrate-single/{media_id}")
async def migrate_single_to_cloud(media_id: str, user: User = Depends(require_admin)):
    """Migrate a single media item to cloud storage"""
    storage_key = init_storage()
    if not storage_key:
        raise HTTPException(status_code=500, detail="Cloud storage not available")
    
    # Get media item
    item = await db.media_library.find_one({"media_id": media_id})
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")
    
    url = item.get("url", "")
    
    # Check if already cloud
    if url.startswith("/api/storage/"):
        return {"status": "already_cloud", "message": "Already in cloud storage"}
    
    # Handle local files
    if url.startswith("/api/uploads/"):
        filename = url.replace("/api/uploads/", "")
        local_path = UPLOAD_DIR / filename
        
        if not local_path.exists():
            raise HTTPException(status_code=404, detail="Local file not found")
        
        # Read and upload
        with open(local_path, "rb") as f:
            data = f.read()
        
        content_type = get_mime_type(filename)
        storage_path = f"{APP_NAME}/uploads/{filename}"
        result = put_object(storage_path, data, content_type)
        
        # Update media library
        new_url = f"/api/storage/{result['path']}"
        await db.media_library.update_one(
            {"media_id": media_id},
            {"$set": {"url": new_url, "storage": "cloud"}}
        )
        
        # Delete local file after successful migration
        try:
            local_path.unlink()
            logger.info(f"Deleted local file after single migration: {filename}")
        except Exception as del_e:
            logger.warning(f"Failed to delete local file {filename}: {del_e}")
        
        return {"status": "migrated", "url": new_url, "message": "Successfully migrated to cloud"}
    
    # Handle external URLs - download and upload
    if url.startswith("http://") or url.startswith("https://"):
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.content
            
            # Generate filename
            filename = f"{uuid.uuid4().hex}.{url.split('.')[-1].split('?')[0][:10]}"
            content_type = resp.headers.get("Content-Type", get_mime_type(filename))
            
            storage_path = f"{APP_NAME}/uploads/{filename}"
            result = put_object(storage_path, data, content_type)
            
            new_url = f"/api/storage/{result['path']}"
            await db.media_library.update_one(
                {"media_id": media_id},
                {"$set": {"url": new_url, "storage": "cloud"}}
            )
            
            return {"status": "migrated", "url": new_url, "message": "Successfully migrated external URL to cloud"}
        except Exception as e:
            logger.error(f"Failed to migrate external URL: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to download and migrate: {str(e)}")
    
    raise HTTPException(status_code=400, detail="Unknown URL format")

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
            "content": "I order from Nic Nackables every week. The quality is consistently amazing and the service is always friendly.",
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
        {"item_id": "merch_tshirt_black", "name": "Nic Nackables T-Shirt - Black", "description": "Classic black tee featuring our Nic Nackables logo. 100% cotton, pre-shrunk.", "price": 24.99, "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", "category": "apparel", "sizes": ["S", "M", "L", "XL", "2XL"], "is_featured": True},
        {"item_id": "merch_tshirt_red", "name": "Nic Nackables Logo Tee - Red", "description": "Show your BBQ pride with our signature red logo tee. Soft, comfortable, and ready to flex.", "price": 24.99, "image_url": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400", "category": "apparel", "sizes": ["S", "M", "L", "XL", "2XL"], "is_featured": True},
        {"item_id": "merch_hoodie", "name": "Nic Nackables Hoodie", "description": "Stay cozy with our premium hoodie. Features the Nic Nackables logo on the back.", "price": 49.99, "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400", "category": "apparel", "sizes": ["S", "M", "L", "XL", "2XL"], "is_featured": False},
        {"item_id": "merch_cap", "name": "Nic Nackables Dad Cap", "description": "Classic dad cap with embroidered Nic Nackables logo. Adjustable strap, one size fits most.", "price": 19.99, "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400", "category": "accessories", "sizes": ["One Size"], "is_featured": True},
        {"item_id": "merch_mug", "name": "Nic Nackables Coffee Mug", "description": "Start your morning right with our 12oz ceramic mug. Dishwasher and microwave safe.", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400", "category": "drinkware", "sizes": ["12oz"], "is_featured": True},
        {"item_id": "merch_tumbler", "name": "Nic Nackables Tumbler", "description": "20oz insulated tumbler keeps drinks hot or cold for hours. Perfect for on-the-go!", "price": 29.99, "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", "category": "drinkware", "sizes": ["20oz"], "is_featured": False},
        {"item_id": "merch_apron", "name": "Chef's Apron", "description": "Cook like a pro with our branded apron. Adjustable neck strap, two front pockets.", "price": 22.99, "image_url": "https://images.unsplash.com/photo-1591634616938-1dfa7ee2e617?w=400", "category": "accessories", "sizes": ["One Size"], "is_featured": False},
        {"item_id": "merch_ornament", "name": "BBQ Ornament Set", "description": "Festive set of 3 BBQ-shaped ornaments. Perfect for the holidays!", "price": 16.99, "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", "category": "souvenirs", "sizes": ["Set of 3"], "is_featured": False},
    ]
    await db.merch_items.insert_many(merch_items)
    
    # Seed default page SEO
    page_seo_items = [
        {"page_id": "seo_home", "page_slug": "home", "meta_title": "Nic Nackables BBQ & More", "meta_description": "Experience the finest BBQ and more in town. Made with love, served with pride.", "keywords": ["BBQ", "barbecue", "smoked meats", "comfort food"]},
        {"page_id": "seo_menu", "page_slug": "menu", "meta_title": "Our Menu - Nic Nackables BBQ & More", "meta_description": "Explore our selection of BBQ, sides, drinks, and desserts.", "keywords": ["menu", "BBQ", "barbecue"]},
        {"page_id": "seo_order", "page_slug": "order", "meta_title": "Order Online - Nic Nackables BBQ & More", "meta_description": "Order your favorite BBQ online for pickup. Quick, easy, delicious.", "keywords": ["order online", "BBQ", "pickup"]},
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

@app.on_event("startup")
async def startup_event():
    """Seed admin user, create indexes, and initialize storage on startup"""
    # Initialize Emergent Object Storage
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Object storage init failed (uploads will use local): {e}")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.uploaded_files.create_index("storage_path")  # Index for file lookups
    
    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    # First, demote any other admins (only ADMIN_EMAIL should be admin)
    await db.users.update_many(
        {"email": {"$ne": admin_email}, "is_admin": True},
        {"$set": {"is_admin": False, "role": "customer"}}
    )
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        # Create admin user
        hashed = hash_password(admin_password)
        admin_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "first_name": "Admin",
            "last_name": "",
            "name": "Admin",
            "role": "admin",
            "password_hash": hashed,
            "is_admin": True,
            "newsletter_subscribed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user created: {admin_email}")
    else:
        # Ensure admin has correct privileges
        update_fields = {"is_admin": True, "role": "admin"}
        if not existing.get("first_name"):
            name = existing.get("name", "Admin")
            name_parts = name.split(" ", 1)
            update_fields["first_name"] = name_parts[0]
            update_fields["last_name"] = name_parts[1] if len(name_parts) > 1 else ""
        
        await db.users.update_one({"email": admin_email}, {"$set": update_fields})
        
        # Ensure admin always has a password hash for email/password login
        current_hash = existing.get("password_hash", "")
        if not current_hash or not verify_password(admin_password, current_hash):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password)}}
            )
            logger.info(f"Admin password set/updated for: {admin_email}")
    
    # Write test credentials
    credentials_path = Path("/app/memory/test_credentials.md")
    credentials_path.parent.mkdir(parents=True, exist_ok=True)
    credentials_content = f"""# Test Credentials for Nic Nackables BBQ & More

## Admin Account (Email/Password)
- **Email**: {admin_email}
- **Password**: {admin_password}
- **Role**: Admin

## Authentication Methods
1. **Email/Password Login**: POST /api/auth/login
2. **Google OAuth**: GET /api/auth/session (Emergent-managed)

## Auth Endpoints
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login with email/password
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user
- POST /api/auth/refresh - Refresh access token
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Reset password with token

## Testing Commands
```bash
# Login
curl -c cookies.txt -X POST {os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{{"email":"{admin_email}","password":"{admin_password}"}}'

# Get current user
curl -b cookies.txt {os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')}/api/auth/me
```

---
*Last Updated: {datetime.now(timezone.utc).isoformat()}*
"""
    credentials_path.write_text(credentials_content)
    logger.info("Test credentials written to /app/memory/test_credentials.md")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
