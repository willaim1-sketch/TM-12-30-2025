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
Customers register via /register or /login page. Sample test accounts created during testing.

## Authentication Methods
1. **Email/Password Login**: POST /api/auth/login
2. **Customer Registration**: POST /api/auth/customer/register
3. **Google OAuth**: Emergent-managed (GET /api/auth/session)

## Auth Endpoints
- POST /api/auth/customer/register - Register new customer
- POST /api/auth/login - Login with email/password
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Reset password with token

## Admin User Management Endpoints
- GET /api/admin/users - List all users (admin only)
- GET /api/admin/users/{user_id} - Get specific user
- PUT /api/admin/users/{user_id} - Update user info
- PUT /api/admin/users/{user_id}/role - Change user role (staff/customer)
- POST /api/admin/users/{user_id}/reset-password - Reset user password
- DELETE /api/admin/users/{user_id} - Delete user account

## Customer Order History
- GET /api/orders/my-orders - Get logged-in user's order history

## Testing Commands
```bash
# Admin Login
curl -c cookies.txt -X POST https://tamale-man-preview.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Mrterpenes@gmail.com","password":"NicNack2024!"}'

# Staff Login
curl -c cookies.txt -X POST https://tamale-man-preview.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nicnackables.com","password":"NicNack2024!"}'

# Get order history (requires auth cookie)
curl -b cookies.txt https://tamale-man-preview.preview.emergentagent.com/api/orders/my-orders

# Promote user to staff (admin only)
curl -b cookies.txt -X PUT https://tamale-man-preview.preview.emergentagent.com/api/admin/users/{user_id}/role \
  -H "Content-Type: application/json" \
  -d '{"role":"staff"}'
```

## Important Notes
- Only Mrterpenes@gmail.com can have admin privileges
- Admin account is protected from deletion and password reset via admin panel
- Staff users can manage orders and messages but not settings/menu/users
- On startup, server demotes any other users from admin status
- Customers are redirected to homepage after login (no account settings page)
- Order history is linked by user_id or customer_email

---
*Last Updated: December 2025*
