"""Auth endpoint tests for JWT email/password + admin flows."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tamale-man-preview.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@nicnackables.com"
ADMIN_PASSWORD = "NicNack2024!"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Login ----------------
class TestLogin:
    def test_login_success_sets_cookies(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["is_admin"] is True
        assert "user_id" in data
        # httpOnly cookies
        cookies = {c.name: c for c in client.cookies}
        assert "access_token" in cookies
        assert "refresh_token" in cookies

    def test_login_invalid_password(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": "wrongPass!!"})
        assert r.status_code == 401

    def test_login_nonexistent_user(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": f"nope_{uuid.uuid4().hex}@x.com", "password": "whatever"})
        assert r.status_code == 401


# ---------------- Me / Logout ----------------
class TestMeLogout:
    def test_me_authenticated(self, client):
        client.post(f"{BASE_URL}/api/auth/login",
                    json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d.get("is_admin") is True

    def test_me_unauthenticated(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookies(self, client):
        client.post(f"{BASE_URL}/api/auth/login",
                    json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = client.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        # After logout, /me should be 401
        r2 = client.get(f"{BASE_URL}/api/auth/me")
        assert r2.status_code == 401


# ---------------- Register ----------------
class TestRegister:
    def test_register_new_user(self, client):
        email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"email": email, "password": "SafePass123!", "name": "Test User"})
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["email"].lower() == email.lower()
        assert d.get("is_admin") in (False, None, 0)

    def test_register_duplicate_email(self, client):
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"email": ADMIN_EMAIL, "password": "SafePass123!", "name": "Dup"})
        assert r.status_code in (400, 409), r.text


# ---------------- Forgot / Reset ----------------
class TestForgotReset:
    def test_forgot_password_ok(self, client):
        r = client.post(f"{BASE_URL}/api/auth/forgot-password",
                        json={"email": ADMIN_EMAIL})
        assert r.status_code == 200

    def test_forgot_password_unknown_email_returns_generic(self, client):
        r = client.post(f"{BASE_URL}/api/auth/forgot-password",
                        json={"email": f"unknown_{uuid.uuid4().hex}@x.com"})
        # Should still return 200 to avoid user enumeration
        assert r.status_code == 200

    def test_reset_password_invalid_token(self, client):
        r = client.post(f"{BASE_URL}/api/auth/reset-password",
                        json={"token": "invalid-token-xyz", "new_password": "NewPass123!"})
        assert r.status_code in (400, 401)


# ---------------- Brute force (uses a throwaway user to avoid locking admin) ----------------
class TestBruteForce:
    def test_brute_force_lockout(self, client):
        # Register a fresh throwaway user
        email = f"TEST_bf_{uuid.uuid4().hex[:8]}@example.com"
        reg = client.post(f"{BASE_URL}/api/auth/register",
                          json={"email": email, "password": "Correct123!", "name": "BF"})
        assert reg.status_code in (200, 201), reg.text

        # Fresh session to clear cookies
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})

        codes = []
        for _ in range(6):
            r = s.post(f"{BASE_URL}/api/auth/login",
                       json={"email": email, "password": "wrongPass!!"})
            codes.append(r.status_code)
        assert any(c in (429, 403) for c in codes[-2:]), f"No lockout observed, codes={codes}"
