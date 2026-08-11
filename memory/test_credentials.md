# Test Credentials for Nic Nackables BBQ & More

## Admin Account (Exclusive)
- **Email**: Mrterpenes@gmail.com
- **Password**: NicNack2024!
- **Role**: Admin (only this account can be admin)
- **Access**: /admin/login (link in footer)

## Customer Test Accounts
Customers register via /register or /login page. Sample test accounts created:
- testuser1734032685@example.com / Test123!
- newuser1734032685@example.com / Test123!

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
- POST /api/admin/users/{user_id}/reset-password - Reset user password
- DELETE /api/admin/users/{user_id} - Delete user account

## Testing Commands
```bash
# Admin Login
curl -c cookies.txt -X POST https://tamale-man-preview.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Mrterpenes@gmail.com","password":"NicNack2024!"}'

# Get current user
curl -b cookies.txt https://tamale-man-preview.preview.emergentagent.com/api/auth/me

# List all users (admin only)
curl -b cookies.txt https://tamale-man-preview.preview.emergentagent.com/api/admin/users
```

## Important Notes
- Only Mrterpenes@gmail.com can have admin privileges
- Admin account is protected from deletion and password reset via admin panel
- On startup, server demotes any other users from admin status
- Customers are redirected to homepage after login (no account settings page)

---
*Last Updated: December 2025*
