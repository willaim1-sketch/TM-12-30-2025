"""Tests for /api/admin/media endpoints - ensuring no MongoDB _id serialization error."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for backend-only container
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = "admin@nicnackables.com"
ADMIN_PASSWORD = "NicNack2024!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


def test_get_media_list(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/media", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    for item in data:
        assert "_id" not in item, f"Response should NOT contain MongoDB _id: {item}"


def test_add_media_item_no_id_serialization_error(admin_session):
    payload = {
        "url": "https://example.com/TEST_media.jpg",
        "filename": "TEST_media.jpg",
        "file_type": "image/jpeg",
        "file_size": 12345,
        "category": "other",
        "alt_text": "TEST media item",
    }
    r = admin_session.post(f"{BASE_URL}/api/admin/media", json=payload, timeout=20)
    assert r.status_code == 200, f"POST /api/admin/media failed: {r.status_code} {r.text}"
    # Must be valid JSON without _id
    body = r.json()
    assert "_id" not in body, f"Response leaked MongoDB _id: {body}"
    assert body.get("url") == payload["url"]
    assert body.get("filename") == payload["filename"]
    assert "media_id" in body and body["media_id"].startswith("media_")

    # Verify GET reflects the new item
    r2 = admin_session.get(f"{BASE_URL}/api/admin/media", timeout=20)
    assert r2.status_code == 200
    items = r2.json()
    match = [i for i in items if i.get("media_id") == body["media_id"]]
    assert len(match) == 1
    assert "_id" not in match[0]

    # Cleanup
    d = admin_session.delete(f"{BASE_URL}/api/admin/media/{body['media_id']}", timeout=20)
    assert d.status_code in (200, 204)


def test_media_requires_admin():
    r = requests.get(f"{BASE_URL}/api/admin/media", timeout=20)
    assert r.status_code in (401, 403)
