# Test Credentials for Nic Nackables BBQ & More

## Admin Account (Exclusive)
- **Email**: Mrterpenes@gmail.com
- **Password**: NicNack2024!
- **Role**: Admin (only this account can be admin)
- **Access**: /admin/login (link in footer)
- **Permissions**: Full access to all admin features

## Staff Account
- **Email**: admin@nicnackables.com
- **Password**: NicNack2024!
- **Role**: Staff
- **Access**: /admin/login
- **Permissions**: Orders, Messages only (no Menu, Settings, Users, Analytics, etc.)

## Customer Test Accounts
Customers register via /register or /login page.

## Authentication Methods
1. **Email/Password Login**: POST /api/auth/login
2. **Customer Registration**: POST /api/auth/customer/register
3. **Google OAuth**: Emergent-managed (GET /api/auth/session)

## Security Notes (December 2025)
- Password reset tokens are NO LONGER returned in API responses (security fix)
- New OAuth users are created as customers by default, NOT admins
- Order prices are validated against database prices, not client-submitted prices
- Only ADMIN_EMAIL env var can have admin privileges

---
*Last Updated: December 2025*
