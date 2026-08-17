"""Shared pytest fixtures for FixIt backend tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or "https://fixit-service-match.preview.emergentagent.com"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": "admin@fixit.com", "password": "Admin@12345"})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def customer(session):
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={
        "name": "TEST Customer", "email": email, "password": "pass1234", "role": "customer"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["access_token"], "user": data["user"], "email": email, "password": "pass1234"}


@pytest.fixture(scope="session")
def professional(session, admin_token):
    email = f"TEST_pro_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={
        "name": "TEST Pro", "email": email, "password": "pass1234", "role": "professional"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    token = data["access_token"]
    # get pro profile
    p = session.get(f"{API}/pro/profile", headers=_auth_header(token))
    assert p.status_code == 200, p.text
    pro = p.json()
    # Set category to plumbing and verify
    session.patch(f"{API}/pro/profile", headers=_auth_header(token),
                  json={"category": "plumbing", "price_min": 300, "price_max": 800})
    v = session.patch(f"{API}/admin/professionals/{pro['id']}/verify",
                      headers=_auth_header(admin_token), json={"status": "verified"})
    assert v.status_code == 200, v.text
    # Set availability available
    session.patch(f"{API}/pro/availability", headers=_auth_header(token),
                  json={"availability": "available"})
    return {"token": token, "user": data["user"], "pro_id": pro["id"], "email": email}


@pytest.fixture
def auth_header():
    return _auth_header
