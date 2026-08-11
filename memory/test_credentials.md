# Test Credentials for Nic Nackables BBQ & More

## Admin Account (Email/Password)
- **Email**: admin@nicnackables.com
- **Password**: NicNack2024!
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
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nicnackables.com","password":"NicNack2024!"}'

# Get current user
curl -b cookies.txt http://localhost:8001/api/auth/me
```

---
*Last Updated: 2026-08-11T15:58:44.650550+00:00*
