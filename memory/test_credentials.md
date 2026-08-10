# Test Credentials for The Tamale Man

## Admin Access
- **Authentication Method**: Google OAuth (Emergent-managed)
- **First user to login becomes admin**
- **Login URL**: `/admin/login`

## Stripe
- **Mode**: LIVE
- **Key Prefix**: `sk_live_` (stored in backend/.env)
- **Testing**: Use real cards only in LIVE mode (or switch to test key for testing)

## Database
- **Type**: MongoDB
- **Connection**: Via MONGO_URL in backend/.env
- **DB Name**: Via DB_NAME in backend/.env

## API Testing
- **Base URL**: `https://tamale-man-preview.preview.emergentagent.com`
- **Health Check**: `GET /api/health`
- **Public Settings**: `GET /api/settings`

## Notes
- No hardcoded test accounts - authentication is via Google OAuth
- Admin status is granted to the first user who signs in
- All subsequent users are regular users unless manually promoted

---
*Last Updated: December 2025*
