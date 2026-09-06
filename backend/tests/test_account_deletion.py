"""Tests for DELETE /api/auth/me — customer + professional account deletion,
data cleanup, token invalidation, and regression of related endpoints.

Corresponds to iteration_2 review: deployment-readiness fix for Apple/Play store
account-deletion requirement.
"""
import uuid
import pytest
import requests


def h(token):
    return {"Authorization": f"Bearer {token}"}


def _register(session, api_url, role="customer"):
    email = f"TEST_del_{role[:3]}_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "pass1234"
    r = session.post(f"{api_url}/auth/register", json={
        "name": f"TEST Del {role}", "email": email, "password": pwd, "role": role,
    })
    assert r.status_code == 200, r.text
    j = r.json()
    return {"token": j["access_token"], "user": j["user"], "email": email, "password": pwd}


# ---------------- Customer deletion ----------------
class TestCustomerAccountDeletion:
    def test_delete_customer_with_data_cascades(self, session, api_url, admin_token):
        # 1) fresh customer
        cust = _register(session, api_url, "customer")

        # 2) fresh professional + verify + set category
        pro = _register(session, api_url, "professional")
        prof = session.get(f"{api_url}/pro/profile", headers=h(pro["token"])).json()
        session.patch(f"{api_url}/pro/profile", headers=h(pro["token"]),
                      json={"category": "plumbing", "price_min": 300, "price_max": 800})
        v = session.patch(f"{api_url}/admin/professionals/{prof['id']}/verify",
                          headers=h(admin_token), json={"status": "verified"})
        assert v.status_code == 200
        session.patch(f"{api_url}/pro/availability", headers=h(pro["token"]),
                      json={"availability": "available"})

        # 3) create booking (generates notifications for the pro/customer)
        b = session.post(f"{api_url}/bookings", headers=h(cust["token"]), json={
            "professional_id": prof["id"],
            "category": "plumbing",
            "problem_text": "tap leaking",
            "address": "TEST addr",
            "scheduled_date": "2026-01-20",
            "scheduled_time": "10:00",
            "urgency": "normal",
            "estimated_price_min": 300,
            "estimated_price_max": 700,
        })
        assert b.status_code == 200, b.text
        bid = b.json()["id"]

        # 4) send a message
        m = session.post(f"{api_url}/bookings/{bid}/messages", headers=h(cust["token"]),
                         json={"text": "hi from soon-to-be-deleted"})
        assert m.status_code == 200

        # sanity: customer should have some data
        nb = session.get(f"{api_url}/bookings", headers=h(cust["token"]))
        assert nb.status_code == 200 and len(nb.json()) >= 1

        # 5) DELETE /api/auth/me
        d = session.delete(f"{api_url}/auth/me", headers=h(cust["token"]))
        assert d.status_code == 200, d.text
        body = d.json()
        assert body.get("ok") is True

        # 6) token invalidated (user record gone -> 401)
        me = session.get(f"{api_url}/auth/me", headers=h(cust["token"]))
        assert me.status_code == 401, f"expected 401 after delete, got {me.status_code}: {me.text}"

        # 7) cannot login again with same credentials
        lg = session.post(f"{api_url}/auth/login",
                          json={"email": cust["email"], "password": cust["password"]})
        assert lg.status_code == 401, lg.text

        # 8) customer's bookings/messages/notifications gone (verify via admin bookings list)
        ab = session.get(f"{api_url}/admin/bookings", headers=h(admin_token))
        assert ab.status_code == 200
        remaining = [x for x in ab.json() if x.get("id") == bid]
        assert remaining == [], "booking should be removed after customer account deletion"

    def test_delete_requires_auth(self, session, api_url):
        r = session.delete(f"{api_url}/auth/me")
        assert r.status_code in (401, 403), r.text


# ---------------- Professional deletion ----------------
class TestProfessionalAccountDeletion:
    def test_delete_pro_removes_profile_and_token(self, session, api_url, admin_token):
        pro = _register(session, api_url, "professional")
        # verify so the pro is visible to admin professionals-list (used for post-check)
        prof = session.get(f"{api_url}/pro/profile", headers=h(pro["token"])).json()
        pid = prof["id"]
        session.patch(f"{api_url}/pro/profile", headers=h(pro["token"]),
                      json={"category": "plumbing", "price_min": 300, "price_max": 800})
        v = session.patch(f"{api_url}/admin/professionals/{pid}/verify",
                          headers=h(admin_token), json={"status": "verified"})
        assert v.status_code == 200

        # Confirm it currently appears in admin list
        alist = session.get(f"{api_url}/admin/professionals?status=verified",
                            headers=h(admin_token))
        assert alist.status_code == 200
        assert any(p.get("id") == pid for p in alist.json())

        # Delete
        d = session.delete(f"{api_url}/auth/me", headers=h(pro["token"]))
        assert d.status_code == 200, d.text
        assert d.json().get("ok") is True

        # Token invalidated
        me = session.get(f"{api_url}/auth/me", headers=h(pro["token"]))
        assert me.status_code == 401

        # Login rejected
        lg = session.post(f"{api_url}/auth/login",
                          json={"email": pro["email"], "password": pro["password"]})
        assert lg.status_code == 401

        # Professional profile no longer listed
        alist2 = session.get(f"{api_url}/admin/professionals?status=verified",
                             headers=h(admin_token))
        assert alist2.status_code == 200
        assert not any(p.get("id") == pid for p in alist2.json()), \
            "pro profile should be removed after account deletion"


# ---------------- Regression: upload roundtrip (INTEGRATION_PROXY_URL env) ----------------
class TestUploadRoundtripAfterEnvPin:
    def test_upload_and_fetch(self, api_url, customer):
        import io
        png_bytes = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
                     b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff'
                     b'\xff?\x00\x05\xfe\x02\xfe\xa1\xf1\x91\x00\x00\x00\x00IEND\xaeB`\x82')
        r = requests.post(f"{api_url}/upload",
                          headers={"Authorization": f"Bearer {customer['token']}"},
                          files={"file": ("test.png", io.BytesIO(png_bytes), "image/png")})
        assert r.status_code == 200, r.text
        path = r.json()["path"]
        g = requests.get(f"{api_url}/files/{path}")
        assert g.status_code == 200
        assert len(g.content) > 0
