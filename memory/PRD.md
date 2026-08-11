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

## Recent Changes (December 2025)
- **Rebranding**: Changed from "The Tamale Man" to "Nic Nackables BBQ & More" across all code
- **Image Upload Fix**: Added ImageUploader components for mascot_image, hero_image, and chef_image in admin settings
- **Media Manager Rewrite**: Complete rewrite with improved error handling, loading states, proper URL construction, and data-testid attributes for testing

## User Personas
1. **Restaurant Owner/Admin**: Manages menu, orders, content, and settings via admin panel
2. **Customers**: Browse menu, place orders, make payments

## Core Architecture
```
/app/
├── backend/
│   ├── .env (Stripe LIVE key, MongoDB, etc.)
│   ├── requirements.txt
│   └── server.py (FastAPI - all routes)
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── components/ui/ (shadcn)
│       └── pages/
│           ├── LandingPage.jsx
│           ├── MenuPage.jsx
│           ├── OrderPage.jsx
│           └── admin/
│               ├── AdminDashboard.jsx
│               ├── VisitorStats.jsx
│               └── SettingsManager.jsx
```

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Payments**: Stripe Checkout Sessions (LIVE)
- **Auth**: Emergent-managed Google OAuth

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

### Admin Panel
- [x] Google OAuth authentication
- [x] Menu management (categories, items, toppings)
- [x] Order management
- [x] Contact form submissions
- [x] Site settings (colors, fonts, social links)
- [x] Media library with image dimension guides
- [x] Blog post management
- [x] FAQ management
- [x] SEO management per page
- [x] Stripe/SendGrid settings
- [x] Visitor analytics dashboard (NEW)
- [x] Page builder for custom sections

## API Endpoints Summary
- `/api/health` - Health check
- `/api/settings` - Site settings (GET/PUT)
- `/api/menu/*` - Menu items and categories
- `/api/orders/*` - Order management
- `/api/track-visit` - Visitor tracking (POST)
- `/api/admin/visitor-stats` - Analytics dashboard (GET)
- `/api/auth/*` - Authentication
- `/api/webhook/stripe` - Stripe webhooks

## Known Issues

### P0 - Critical
- **Data Persistence**: User reported data loss on container restarts. 
  - Investigation: Seed function is safe (checks before seeding)
  - Root cause: Likely platform infrastructure (volume mounting)
  - Status: Requires platform-level investigation

### P2 - Low Priority
- **App.js Linting**: ESLint shows no issues currently - was resolved

## Completed This Session (Dec 2025)
1. Stripe LIVE key configuration verified (`cs_live_` prefix)
2. Stripe LIVE/TEST status indicator in admin
3. CashApp/Venmo/PayPal QR code flow fixed
4. YouTube video embed added to homepage
5. Image dimension guides across admin uploaders
6. Visitor tracking API and dashboard implemented
7. Stripe checkout redirect UI ("Redirecting to Stripe...")

## Future Backlog

### P1 - High Priority
- Refactor `SettingsManager.jsx` into smaller components
- Add email notifications for manual payments

### P2 - Medium Priority
- Add-ons functionality improvements
- Order status tracking for customers

### P3 - Nice to Have
- Multi-language support
- Customer accounts and order history
- Inventory management

## Third-Party Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Stripe | LIVE | Live key configured |
| SendGrid | Optional | For email notifications |
| Google OAuth | Active | Emergent-managed |
| YouTube | Active | Embed on homepage |

---
*Last Updated: December 2025*
