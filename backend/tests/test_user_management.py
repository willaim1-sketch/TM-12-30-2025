"""Tests for Admin User Management endpoints (/api/admin/users*)"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tamale-man-preview.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "Mrterpenes@gmail.com"
ADMIN_PASSWORD = "NicNack2024!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    # Some APIs return token in body; also cookies may be set
    token = data.get("access_token") or data.get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def customer_creds():
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    password = "Passw0rd!"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": "Test User",
        "first_name": "Test",
        "last_name": "User",
        "phone": "555-1234"
    })
    assert r.status_code in (200, 201), f"Register failed: {r.status_code} {r.text}"
    return {"email": email, "password": password}


@pytest.fixture(scope="module")
def customer_session(customer_creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": customer_creds["email"],
        "password": customer_creds["password"]
    })
    assert r.status_code == 200, f"Customer login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def test_admin_login_and_is_admin(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    me = r.json()
    assert me.get("is_admin") is True
    assert me.get("email", "").lower() == ADMIN_EMAIL.lower()


def test_list_users_as_admin(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/users")
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    assert len(users) >= 1
    # No sensitive fields
    for u in users:
        assert "_id" not in u
        assert "password_hash" not in u
    # Exactly one admin (Mrterpenes)
    admins = [u for u in users if u.get("is_admin")]
    assert len(admins) == 1, f"Expected exactly 1 admin, got {len(admins)}: {[a.get('email') for a in admins]}"
    assert admins[0]["email"].lower() == ADMIN_EMAIL.lower()


def test_non_admin_forbidden_list_users(customer_session):
    r = customer_session.get(f"{BASE_URL}/api/admin/users")
    assert r.status_code == 403


def test_non_admin_forbidden_delete(customer_session, admin_session):
    # find any user id
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    target = next((u for u in users if not u.get("is_admin")), None)
    assert target
    r = customer_session.delete(f"{BASE_URL}/api/admin/users/{target['user_id']}")
    assert r.status_code == 403


def test_unauthenticated_forbidden():
    r = requests.get(f"{BASE_URL}/api/admin/users")
    assert r.status_code in (401, 403)


def test_admin_account_protected_from_password_reset(admin_session):
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    admin_user = next(u for u in users if u.get("is_admin"))
    r = admin_session.post(
        f"{BASE_URL}/api/admin/users/{admin_user['user_id']}/reset-password",
        json={"new_password": "SomeNewPass123"}
    )
    assert r.status_code == 403


def test_admin_account_protected_from_delete(admin_session):
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    admin_user = next(u for u in users if u.get("is_admin"))
    r = admin_session.delete(f"{BASE_URL}/api/admin/users/{admin_user['user_id']}")
    assert r.status_code == 403


def test_reset_password_min_length(admin_session, customer_creds):
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    target = next(u for u in users if u.get("email", "").lower() == customer_creds["email"].lower())
    r = admin_session.post(
        f"{BASE_URL}/api/admin/users/{target['user_id']}/reset-password",
        json={"new_password": "abc"}
    )
    assert r.status_code == 400


def test_reset_customer_password_and_login(admin_session, customer_creds):
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    target = next(u for u in users if u.get("email", "").lower() == customer_creds["email"].lower())
    new_password = "NewSecure123!"
    r = admin_session.post(
        f"{BASE_URL}/api/admin/users/{target['user_id']}/reset-password",
        json={"new_password": new_password}
    )
    assert r.status_code == 200, r.text
    # Login with new password
    login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": customer_creds["email"], "password": new_password
    })
    assert login.status_code == 200
    # Old password fails
    bad = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": customer_creds["email"], "password": customer_creds["password"]
    })
    assert bad.status_code in (401, 403, 429)


def test_delete_customer_user(admin_session):
    # Create a throwaway user then delete via admin
    email = f"TEST_del_{uuid.uuid4().hex[:8]}@example.com"
    reg = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "Passw0rd!", "name": "Del Me", "first_name": "Del", "last_name": "Me", "phone": "555-0000"
    })
    assert reg.status_code in (200, 201)
    users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
    target = next(u for u in users if u.get("email", "").lower() == email.lower())
    r = admin_session.delete(f"{BASE_URL}/api/admin/users/{target['user_id']}")
    assert r.status_code == 200
    # Confirm deletion
    r2 = admin_session.get(f"{BASE_URL}/api/admin/users/{target['user_id']}")
    assert r2.status_code == 404
