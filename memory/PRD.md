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

## User Personas
1. **Restaurant Owner/Admin (Mrterpenes@gmail.com)**: Exclusive admin who manages menu, orders, content, settings, and users via admin panel
2. **Customers**: Browse menu, register to place orders (tracked for order history), no settings access

## Authentication Architecture
- **Customers**: Register/login via email+password or Google OAuth. Redirected to homepage after auth. No account settings page - registration is purely for order tracking.
- **Admin**: Only `Mrterpenes@gmail.com` can be admin. Login via `/admin/login` (footer link). Admin panel protected.
- **Separation**: Customer navbar shows "Sign In" or "Hi, {name} | Sign Out". Admin login is hidden in footer.

## Core Architecture
```
/app/
├── backend/
│   ├── .env (ADMIN_EMAIL, ADMIN_PASSWORD, Stripe, MongoDB, etc.)
│   ├── requirements.txt
│   └── server.py (FastAPI - all routes ~2800 lines)
├── frontend/
│   └── src/
│       ├── App.js (AuthContext, ProtectedRoute)
│       ├── pages/
│       │   ├── LandingPage.jsx (Navbar with customer auth, Footer with admin link)
│       │   ├── CustomerAuth.jsx (Registration/Login, redirects to homepage)
│       │   ├── AccountPage.jsx (Redirects to homepage - no settings for customers)
│       │   └── admin/
│       │       ├── AdminDashboard.jsx
│       │       ├── UserManager.jsx (NEW - admin user management)
│       │       └── ... (MenuManager, MediaManager, etc.)
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
- [x] Simplified auth flow - customers go to homepage after login (no account page)

### Admin Panel
- [x] Google OAuth + Email/Password authentication
- [x] Menu management (categories, items, toppings)
- [x] Order management
- [x] Contact form submissions
- [x] Site settings (colors, fonts, social links)
- [x] Media library with image dimension guides
- [x] Blog post management
- [x] FAQ management
- [x] SEO management per page
- [x] Stripe/SendGrid settings
- [x] Visitor analytics dashboard
- [x] Page builder for custom sections
- [x] **User Management** (NEW - view users, reset passwords, delete accounts)

## Admin User Management (December 2025)
- **Exclusive Admin**: Only `Mrterpenes@gmail.com` has `is_admin: true`
- **Admin Protection**: Cannot delete or reset password for admin account
- **Auto-demotion**: On startup, any other users with `is_admin: true` are demoted to customer
- **Features**: View all users, search/filter, reset customer passwords, delete customer accounts
- **UI**: `/admin/users` route in admin panel with UserManager component

## API Endpoints Summary
- `/api/health` - Health check
- `/api/settings` - Site settings (GET/PUT)
- `/api/menu/*` - Menu items and categories
- `/api/orders/*` - Order management
- `/api/track-visit` - Visitor tracking (POST)
- `/api/admin/visitor-stats` - Analytics dashboard (GET)
- `/api/auth/*` - Authentication (login, register, logout, me, etc.)
- `/api/admin/users` - User management (GET, PUT, DELETE, POST reset-password)
- `/api/webhook/stripe` - Stripe webhooks

## Known Issues

### Resolved This Session
- Admin User Management fully implemented and tested
- Customer auth now properly updates navbar state after login/register
- Removed "My Account" link - customers redirected to homepage
- Admin login moved to footer only

### P2 - Low Priority (Not Blocking)
- Reset Password dialog doesn't show inline error for short passwords (backend validates correctly)
- Minor a11y warnings on Radix dialogs (missing aria-describedby)
- Data Persistence: Container restart data loss (infrastructure/volume mount issue, not code)

## Future Backlog

### P1 - High Priority
- Verify SendGrid email integration for password resets/order notifications (currently logging to console)
- Refactor `server.py` into modular routers (~2800 lines currently)

### P2 - Medium Priority  
- Add-ons functionality improvements
- Refactor `SettingsManager.jsx` into smaller components

### P3 - Nice to Have
- Multi-language support
- Order status tracking for customers
- Inventory management

## Third-Party Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Stripe | LIVE | Live key configured |
| SendGrid | MOCKED | Logs to console, needs verification |
| Google OAuth | Active | Emergent-managed |
| YouTube | Active | Embed on homepage |

---
*Last Updated: December 2025*
