"""Tests for Staff Role management and Order History features"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tamale-man-preview.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "Mrterpenes@gmail.com"
ADMIN_PASSWORD = "NicNack2024!"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    return s, r


@pytest.fixture(scope="module")
def admin_session():
    s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def test_customer():
    """Create a fresh test customer user"""
    email = f"TEST_staff_{uuid.uuid4().hex[:8]}@example.com"
    password = "Passw0rd!"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": "Test Staff Candidate",
        "first_name": "Test",
        "last_name": "Staff",
        "phone": "555-9999"
    })
    assert r.status_code in (200, 201), f"Register failed: {r.status_code} {r.text}"
    # Fetch user_id via login
    s, lr = _login(email, password)
    assert lr.status_code == 200
    me = s.get(f"{BASE_URL}/api/auth/me").json()
    return {"email": email, "password": password, "user_id": me.get("user_id"), "session": s}


# ============ Order History Tests ============

def test_my_orders_requires_auth():
    r = requests.get(f"{BASE_URL}/api/orders/my-orders")
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


def test_my_orders_returns_list_for_customer(test_customer):
    s = test_customer["session"]
    r = s.get(f"{BASE_URL}/api/orders/my-orders")
    assert r.status_code == 200, f"my-orders failed: {r.status_code} {r.text}"
    data = r.json()
    assert isinstance(data, list)
    # No mongo _id should leak
    for order in data:
        assert "_id" not in order


def test_my_orders_returns_list_for_admin(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/orders/my-orders")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ============ Staff Role Endpoint Tests ============

def test_promote_user_to_staff(admin_session, test_customer):
    user_id = test_customer["user_id"]
    r = admin_session.put(
        f"{BASE_URL}/api/admin/users/{user_id}/role",
        json={"role": "staff"}
    )
    assert r.status_code == 200, f"Promote to staff failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("is_staff") is True
    assert data.get("role") == "staff"
    assert data.get("is_admin") is False
    assert "_id" not in data
    assert "password_hash" not in data


def test_staff_can_login_and_see_is_staff(test_customer):
    s, r = _login(test_customer["email"], test_customer["password"])
    assert r.status_code == 200
    me = s.get(f"{BASE_URL}/api/auth/me").json()
    assert me.get("is_staff") is True
    assert me.get("is_admin") is False


def test_staff_can_access_admin_orders(test_customer):
    s, _ = _login(test_customer["email"], test_customer["password"])
    r = s.get(f"{BASE_URL}/api/admin/orders")
    assert r.status_code == 200, f"Staff should access /admin/orders, got {r.status_code}"
    assert isinstance(r.json(), list)


def test_staff_cannot_access_admin_menu_items(test_customer):
    s, _ = _login(test_customer["email"], test_customer["password"])
    r = s.get(f"{BASE_URL}/api/admin/menu/items")
    assert r.status_code == 403, f"Staff should NOT access /admin/menu/items, got {r.status_code}"


def test_staff_cannot_access_admin_users(test_customer):
    s, _ = _login(test_customer["email"], test_customer["password"])
    r = s.get(f"{BASE_URL}/api/admin/users")
    assert r.status_code == 403, f"Staff should NOT access /admin/users, got {r.status_code}"


def test_staff_cannot_update_settings(test_customer):
    s, _ = _login(test_customer["email"], test_customer["password"])
    r = s.put(f"{BASE_URL}/api/admin/settings", json={"site_name": "hack"})
    assert r.status_code == 403


def test_staff_cannot_change_roles(test_customer, admin_session):
    """A staff user should NOT be able to promote/demote another user"""
    s, _ = _login(test_customer["email"], test_customer["password"])
    # Create another test user
    other_email = f"TEST_other_{uuid.uuid4().hex[:8]}@example.com"
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": other_email, "password": "Passw0rd!", "name": "Other",
        "first_name": "Other", "last_name": "User"
    })
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    other = next((u for u in users if u.get("email", "").lower() == other_email.lower()), None)
    assert other is not None
    r = s.put(f"{BASE_URL}/api/admin/users/{other['user_id']}/role", json={"role": "staff"})
    assert r.status_code == 403


def test_demote_staff_to_customer(admin_session, test_customer):
    user_id = test_customer["user_id"]
    r = admin_session.put(
        f"{BASE_URL}/api/admin/users/{user_id}/role",
        json={"role": "customer"}
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("is_staff") is False
    assert data.get("role") == "customer"


def test_demoted_user_cannot_access_admin_orders(test_customer):
    s, _ = _login(test_customer["email"], test_customer["password"])
    r = s.get(f"{BASE_URL}/api/admin/orders")
    assert r.status_code == 403


def test_invalid_role_rejected(admin_session, test_customer):
    r = admin_session.put(
        f"{BASE_URL}/api/admin/users/{test_customer['user_id']}/role",
        json={"role": "superadmin"}
    )
    assert r.status_code == 400


def test_cannot_change_primary_admin_role(admin_session):
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    admin_user = next((u for u in users if u.get("is_admin")), None)
    assert admin_user is not None
    r = admin_session.put(
        f"{BASE_URL}/api/admin/users/{admin_user['user_id']}/role",
        json={"role": "staff"}
    )
    assert r.status_code == 403


def test_non_admin_cannot_change_role():
    r = requests.put(
        f"{BASE_URL}/api/admin/users/fake-id/role",
        json={"role": "staff"}
    )
    assert r.status_code in (401, 403)
