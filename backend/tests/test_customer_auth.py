"""Tests for customer registration & profile system."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://tamale-man-preview.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "admin@nicnackables.com"
ADMIN_PASSWORD = "NicNack2024!"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def new_customer_payload():
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com"
    return {
        "email": email,
        "password": "CustPass123!",
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "+15551234567",
        "newsletter_subscribed": True,
    }


# ------ Customer register ------
class TestCustomerRegister:
    def test_register_creates_customer(self, client, new_customer_payload):
        r = client.post(f"{BASE_URL}/api/auth/customer/register", json=new_customer_payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == new_customer_payload["email"].lower()
        assert d["first_name"] == "Jane"
        assert d["last_name"] == "Doe"
        assert d["role"] == "customer"
        assert d["is_admin"] is False
        assert d["newsletter_subscribed"] is True
        assert d["phone"] == "+15551234567"
        # cookies set
        cookies = {c.name for c in client.cookies}
        assert "access_token" in cookies
        assert "refresh_token" in cookies

    def test_register_duplicate_email(self, client, new_customer_payload):
        r1 = client.post(f"{BASE_URL}/api/auth/customer/register", json=new_customer_payload)
        assert r1.status_code == 200
        # Use fresh session
        s2 = requests.Session()
        s2.headers.update({"Content-Type": "application/json"})
        r2 = s2.post(f"{BASE_URL}/api/auth/customer/register", json=new_customer_payload)
        assert r2.status_code == 400

    def test_register_short_password(self, client):
        payload = {
            "email": f"TEST_short_{uuid.uuid4().hex[:6]}@example.com",
            "password": "abc",
            "first_name": "A",
            "last_name": "B",
        }
        r = client.post(f"{BASE_URL}/api/auth/customer/register", json=payload)
        assert r.status_code == 400


# ------ Login as customer ------
class TestCustomerLogin:
    def test_customer_can_login(self, client, new_customer_payload):
        r = client.post(f"{BASE_URL}/api/auth/customer/register", json=new_customer_payload)
        assert r.status_code == 200
        # New session for login
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r2 = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": new_customer_payload["email"], "password": new_customer_payload["password"]},
        )
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d["email"] == new_customer_payload["email"].lower()
        assert d.get("is_admin") is False


# ------ Profile update ------
class TestProfileUpdate:
    def test_profile_update_persists(self, client, new_customer_payload):
        # register (sets cookies on client)
        r = client.post(f"{BASE_URL}/api/auth/customer/register", json=new_customer_payload)
        assert r.status_code == 200
        # update profile
        upd = client.put(
            f"{BASE_URL}/api/auth/profile",
            json={"first_name": "Janet", "last_name": "Smith", "phone": "+15550000000", "newsletter_subscribed": False},
        )
        assert upd.status_code == 200, upd.text
        d = upd.json()
        assert d["first_name"] == "Janet"
        assert d["last_name"] == "Smith"
        assert d["phone"] == "+15550000000"
        assert d["newsletter_subscribed"] is False
        # verify via /me
        me = client.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200
        me_data = me.json()
        assert me_data["first_name"] == "Janet"
        assert me_data["newsletter_subscribed"] is False

    def test_profile_update_requires_auth(self, client):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.put(f"{BASE_URL}/api/auth/profile", json={"first_name": "X"})
        assert r.status_code == 401


# ------ Newsletter subscribers (admin) ------
class TestNewsletterSubscribers:
    def test_admin_can_list_subscribers(self, client, new_customer_payload):
        # Register a customer subscribed to newsletter
        reg = requests.Session()
        reg.headers.update({"Content-Type": "application/json"})
        r_reg = reg.post(f"{BASE_URL}/api/auth/customer/register", json=new_customer_payload)
        assert r_reg.status_code == 200

        # Admin login on a fresh session
        admin = requests.Session()
        admin.headers.update({"Content-Type": "application/json"})
        r = admin.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        sub = admin.get(f"{BASE_URL}/api/admin/newsletter-subscribers")
        assert sub.status_code == 200, sub.text
        d = sub.json()
        assert "subscribers" in d
        assert "count" in d
        assert isinstance(d["subscribers"], list)
        emails = [s.get("email") for s in d["subscribers"]]
        assert new_customer_payload["email"].lower() in emails

    def test_non_admin_cannot_list_subscribers(self, client, new_customer_payload):
        r = client.post(f"{BASE_URL}/api/auth/customer/register", json=new_customer_payload)
        assert r.status_code == 200
        sub = client.get(f"{BASE_URL}/api/admin/newsletter-subscribers")
        assert sub.status_code in (401, 403)
