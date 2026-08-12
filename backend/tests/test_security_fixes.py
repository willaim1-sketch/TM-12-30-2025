"""
Regression tests for security fixes (iteration 17):
1. /api/auth/forgot-password must NOT leak reset_url or token in response
2. Order creation must validate prices from DB, not trust client-supplied prices
3. OAuth new-user default admin flag can be validated only via unit-style check
   (we test the accessible path: /api/auth/register keeps is_admin=false, and
   /api/admin/settings show_hours toggle round-trips.)
"""
import os
import time
import uuid
import pytest
import requests

from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "mrterpenes@gmail.com"
ADMIN_PASSWORD = "NicNack2024!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return s


# ---------- 1) forgot-password token leak ----------
class TestForgotPasswordNoLeak:
    def test_existing_email_no_token_in_response(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
                          json={"email": ADMIN_EMAIL}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        text = r.text.lower()
        # Must not include token/reset_url fields
        assert "reset_url" not in body
        assert "token" not in body
        assert "reset_token" not in body
        # Full body text shouldn't contain a URL-encoded token or a bare 32+ char token pattern
        assert "reset-password?token=" not in text
        assert "http://" not in text and "https://" not in text
        # Should be generic message
        assert "message" in body

    def test_nonexistent_email_generic_response(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
                          json={"email": f"TEST_nobody_{uuid.uuid4().hex[:6]}@example.com"},
                          timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "reset_url" not in body and "token" not in body


# ---------- 2) Order creation uses DB prices ----------
class TestOrderPriceValidation:
    def test_order_recomputes_totals_from_db(self, admin_session):
        # Fetch a real menu item
        items_resp = requests.get(f"{BASE_URL}/api/menu/items", timeout=30)
        assert items_resp.status_code == 200
        items = items_resp.json()
        if not items:
            pytest.skip("No menu items available")
        item = next((i for i in items if float(i.get("price", 0)) > 0), None)
        if not item:
            pytest.skip("No priced menu item found")

        real_price = float(item["price"])
        tampered_price = 0.01  # attacker tries $0.01

        payload = {
            "customer_name": "TEST_SecUser",
            "customer_email": "TEST_secuser@example.com",
            "customer_phone": "5125550000",
            "items": [{
                "item_id": item["item_id"],
                "name": item["name"],
                "price": tampered_price,   # tampered client price
                "quantity": 2,
                "toppings": [],
                "special_instructions": ""
            }],
            "subtotal": tampered_price * 2,
            "tax": 0.0,
            "total": tampered_price * 2,
            "pickup_date": "2026-12-31",
            "pickup_time": "12:00",
            "comments": "TEST_price_tamper",
            "payment_method": "pay_on_pickup"
        }
        r = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        # Server must compute using real DB price
        expected_subtotal = round(real_price * 2, 2)
        # Response may have order details nested
        # Try a few shapes:
        srv_total = data.get("total") or (data.get("order") or {}).get("total")
        srv_subtotal = data.get("subtotal") or (data.get("order") or {}).get("subtotal")
        assert srv_subtotal is not None, f"No subtotal in response: {data}"
        assert abs(float(srv_subtotal) - expected_subtotal) < 0.01, \
            f"Subtotal {srv_subtotal} != expected {expected_subtotal} (tamper accepted!)"
        assert float(srv_total) > tampered_price * 2 + 0.01, \
            "Server accepted tampered total"


# ---------- 3) Show Hours toggle in settings ----------
class TestShowHoursToggle:
    def test_settings_show_hours_roundtrip(self, admin_session):
        # GET current settings via public endpoint
        r = requests.get(f"{BASE_URL}/api/settings", timeout=30)
        assert r.status_code == 200, r.text
        current = r.json()
        original = current.get("show_hours", True)

        # Toggle to False
        upd = admin_session.put(f"{BASE_URL}/api/admin/settings",
                                 json={"show_hours": False}, timeout=30)
        assert upd.status_code in (200, 201), upd.text

        r2 = requests.get(f"{BASE_URL}/api/settings", timeout=30)
        # If backend supports show_hours it should be False now
        val = r2.json().get("show_hours")
        # Restore before asserting
        admin_session.put(f"{BASE_URL}/api/admin/settings",
                          json={"show_hours": original}, timeout=30)
        assert val is False, (
            "show_hours toggle did NOT persist. "
            "Field likely missing from SiteSettings/SiteSettingsUpdate Pydantic models."
        )


# ---------- 4) OAuth default is_admin=false (proxy: register endpoint) ----------
class TestNewUserDefaultsNotAdmin:
    def test_register_defaults_customer(self):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "TempPass123!",
            "name": "Test Reg", "first_name": "Test", "last_name": "Reg",
            "phone": "5125550001"
        }, timeout=30)
        assert r.status_code in (200, 201), r.text
        # Login and inspect /api/auth/me
        s = requests.Session()
        lr = s.post(f"{BASE_URL}/api/auth/login",
                    json={"email": email, "password": "TempPass123!"}, timeout=30)
        assert lr.status_code == 200
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=30).json()
        assert me.get("is_admin") is False
        assert me.get("is_staff", False) is False
