"""Tests for admin menu category & item creation (verifies _id serialization fix)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tamale-man-preview.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@nicnackables.com"
ADMIN_PASSWORD = "NicNack2024!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


def test_admin_login(admin_session):
    me = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert me.status_code == 200
    data = me.json()
    assert data.get("is_admin") is True


def test_get_categories(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/menu/categories", timeout=10)
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list)
    assert len(cats) > 0, "need at least one category to attach items to"


def test_create_category_no_id_leak(admin_session):
    payload = {"name": "TEST_CAT_pytest", "description": "temp", "display_order": 999}
    r = admin_session.post(f"{BASE_URL}/api/admin/menu/categories", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "_id" not in body, f"_id leaked in create_category response: {body}"
    assert body.get("name") == "TEST_CAT_pytest"
    cat_id = body["category_id"]
    # cleanup
    admin_session.delete(f"{BASE_URL}/api/admin/menu/categories/{cat_id}", timeout=10)


def test_create_menu_item_no_id_leak_and_persist(admin_session):
    # get any category
    cats = admin_session.get(f"{BASE_URL}/api/admin/menu/categories", timeout=10).json()
    cat_id = cats[0]["category_id"]

    payload = {
        "category_id": cat_id,
        "name": "TEST_ITEM_pytest",
        "description": "test description",
        "price": 9.99,
        "image_url": "https://example.com/x.jpg",
        "is_featured": False,
        "toppings": [],
        "meat_choices": [],
    }
    r = admin_session.post(f"{BASE_URL}/api/admin/menu/items", json=payload, timeout=15)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    body = r.json()
    assert "_id" not in body, f"_id leaked: {body}"
    assert body["name"] == "TEST_ITEM_pytest"
    assert body["price"] == 9.99
    assert body["category_id"] == cat_id
    item_id = body["item_id"]

    # Verify persisted via GET admin list
    listing = admin_session.get(f"{BASE_URL}/api/admin/menu/items", timeout=10).json()
    found = [i for i in listing if i["item_id"] == item_id]
    assert len(found) == 1, "created item not found in admin listing"
    assert "_id" not in found[0]

    # Update
    up = admin_session.put(
        f"{BASE_URL}/api/admin/menu/items/{item_id}",
        json={"price": 12.50, "name": "TEST_ITEM_pytest_updated"},
        timeout=10,
    )
    assert up.status_code == 200

    # Delete
    d = admin_session.delete(f"{BASE_URL}/api/admin/menu/items/{item_id}", timeout=10)
    assert d.status_code == 200


def test_unauth_cannot_create_item():
    r = requests.post(
        f"{BASE_URL}/api/admin/menu/items",
        json={"category_id": "x", "name": "x", "description": "x", "price": 1.0},
        timeout=10,
    )
    assert r.status_code in (401, 403)
