# Nic Nackables BBQ & More - Restaurant Website PRD

## Original Problem Statement
Build a modern, high-converting restaurant website for "Nic Nackables BBQ & More" (rebranded from "The Tamale Man") with:
- Full-stack React/FastAPI/MongoDB architecture
- Standard restaurant sections (Hero, About, Menu)
- Comprehensive admin panel for Divi-like page building, media management, and settings
- Stripe integration for payments (LIVE mode)
- Manual payment support (CashApp, Venmo, PayPal) with QR codes
- YouTube video section on homepage
- Visitor tracking system for SEO performance monitoring
- **Emergent Object Store** for persistent media storage across deployments

## User Personas
1. **Restaurant Owner/Admin (Mrterpenes@gmail.com)**: Exclusive admin who manages menu, orders, content, settings, and users via admin panel
2. **Staff Members**: Can manage orders and messages but cannot access settings/menu/users
3. **Customers**: Browse menu, register to place orders (tracked for order history), no settings access

## Authentication Architecture
- **Customers**: Register/login via email+password or Google OAuth. Redirected to homepage after auth. No account settings page - registration is purely for order tracking.
- **Admin**: Only `Mrterpenes@gmail.com` can be admin. Login via `/admin/login` (footer link). Full admin panel access.
- **Staff**: Promoted by admin via User Management. Login via `/admin/login`. Limited access (Orders, Messages only).
- **Separation**: Customer navbar shows "Sign In" or "Hi, {name} | Sign Out". Admin/Staff login is hidden in footer.

## Core Architecture
```
/app/
├── backend/
│   ├── .env (ADMIN_EMAIL, ADMIN_PASSWORD, Stripe, MongoDB, EMERGENT_LLM_KEY)
│   ├── requirements.txt
│   └── server.py (FastAPI - all routes ~3300 lines)
├── frontend/
│   └── src/
│       ├── App.js (AuthContext, ProtectedRoute - allows admin OR staff)
│       ├── pages/
│       │   ├── LandingPage.jsx (Navbar with customer auth, Footer with admin link)
│       │   ├── CustomerAuth.jsx (Registration/Login, redirects to homepage)
│       │   ├── OrderPage.jsx (Order history for logged-in users)
│       │   └── admin/
│       │       ├── AdminDashboard.jsx (Filtered sidebar based on role)
│       │       ├── AdminLogin.jsx (Allows admin AND staff login)
│       │       ├── UserManager.jsx (Admin-only: manage users, change roles)
│       │       ├── MediaManager.jsx (Media Library, Storage Dashboard)
│       │       └── ... (MenuManager, SettingsManager, etc.)
```

## Key Features Implemented

### Customer-Facing
- [x] Hero section with YouTube video embed
- [x] About section with chef image
- [x] Menu browsing with categories
- [x] Cart and checkout flow
- [x] Stripe payment integration (LIVE)
- [x] Manual payment options (CashApp, Venmo, PayPal) with QR codes
- [x] Order success page
- [x] Blog section
- [x] Merch store
- [x] Customer registration/login (email+password or Google)
- [x] Simplified auth flow - customers go to homepage after login
- [x] **Order History** - logged-in users can view past orders on /order page

### Admin Panel
- [x] Google OAuth + Email/Password authentication
- [x] Menu management (categories, items, toppings)
- [x] Order management
- [x] Contact form submissions
- [x] Site settings (colors, fonts, social links)
- [x] **Media library with cloud storage and dimension guides**
- [x] Blog post management
- [x] FAQ management
- [x] SEO management per page
- [x] Stripe/SendGrid settings
- [x] Visitor analytics dashboard
- [x] Page builder for custom sections
- [x] **User Management** (view users, reset passwords, delete accounts, change roles)
- [x] **Staff Role Support** - promote users to staff for limited admin access
- [x] **Storage Dashboard** - view cloud vs local storage stats, migrate files to cloud

### Media Manager Features (December 2025)
- [x] 4 Tabs: Media Library, Site Images, Size Guide, **Storage**
- [x] **Storage Dashboard** with cloud/local storage statistics
- [x] Cloud migration progress bar and percentage
- [x] "Local Files Detected" warning with "Migrate All to Cloud" button
- [x] "All Files in Cloud" success banner when migration complete
- [x] **Cloud/Local badges** on media cards (green for cloud, yellow for local)
- [x] **Drag-and-drop bulk upload** with multiple file support
- [x] Single-file migration via clicking Local badge or cloud button
- [x] Local files deleted after successful migration to reclaim disk space

## Role System
| Role | is_admin | is_staff | Admin Panel Access |
|------|----------|----------|-------------------|
| Customer | false | false | None |
| Staff | false | true | Orders, Messages |
| Admin | true | false | Full access |

## API Endpoints Summary
- `/api/health` - Health check
- `/api/settings` - Site settings (GET/PUT)
- `/api/menu/*` - Menu items and categories
- `/api/orders/*` - Order management
- `/api/orders/my-orders` - Customer order history
- `/api/track-visit` - Visitor tracking (POST)
- `/api/admin/visitor-stats` - Analytics dashboard (GET)
- `/api/auth/*` - Authentication (login, register, logout, me, etc.)
- `/api/admin/users` - User management (GET, PUT, DELETE)
- `/api/admin/users/{id}/role` - Role changes (PUT)
- `/api/admin/storage/stats` - Storage statistics (GET)
- `/api/admin/storage/migrate` - Bulk migration to cloud (POST)
- `/api/admin/storage/migrate-single/{media_id}` - Single file migration (POST)
- `/api/upload` - File upload (stores to cloud by default)
- `/api/storage/{path}` - Serve cloud-stored files
- `/api/webhook/stripe` - Stripe webhooks

## Known Issues

### Resolved This Session
- ✅ Storage Dashboard now fully functional with stats, progress bar, and migration
- ✅ onMigrate prop now passed to ImageCard components
- ✅ Storage tab added to Media Manager
- ✅ Local files deleted after successful migration

### P2 - Low Priority (Not Blocking)
- Minor a11y warnings on Radix dialogs (missing aria-describedby)

## Future Backlog

### P1 - High Priority
- Verify SendGrid email integration for password resets/order notifications (currently logging to console)
- Refactor `server.py` into modular routers (~3300 lines currently)

### P2 - Medium Priority  
- Add-ons functionality improvements
- Refactor `SettingsManager.jsx` into smaller components
- Refactor `MediaManager.jsx` into smaller components (~1450 lines)
- Minor UX Bug in Menu Manager Add Item (stale form values on dialog open)

### P3 - Nice to Have
- Multi-language support
- Real-time order status tracking for customers
- Inventory management
- Export customer emails as CSV for marketing
- Menu Price Alerts (admin notification when price changes)

## Third-Party Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Stripe | LIVE | Live key configured |
| SendGrid | MOCKED | Logs to console, needs verification |
| Google OAuth | Active | Emergent-managed |
| YouTube | Active | Embed on homepage |
| **Emergent Object Store** | Active | Cloud media persistence |

---
*Last Updated: December 2025*
