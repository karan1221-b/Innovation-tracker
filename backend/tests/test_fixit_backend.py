"""FixIt backend test suite - covers auth, AI, professionals, bookings, messages,
notifications, admin, upload, and pro dashboard."""
import io
import os
import uuid
import pytest
import requests


def h(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------------ AUTH ------------------------
class TestAuth:
    def test_register_customer(self, session, api_url):
        email = f"TEST_a_{uuid.uuid4().hex[:6]}@example.com"
        r = session.post(f"{api_url}/auth/register",
                         json={"name": "T", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["role"] == "customer"
        assert "access_token" in j

    def test_register_professional_creates_profile(self, session, api_url):
        email = f"TEST_p_{uuid.uuid4().hex[:6]}@example.com"
        r = session.post(f"{api_url}/auth/register",
                         json={"name": "P", "email": email, "password": "pass1234", "role": "professional"})
        assert r.status_code == 200
        token = r.json()["access_token"]
        pp = session.get(f"{api_url}/pro/profile", headers=h(token))
        assert pp.status_code == 200
        assert pp.json()["verification_status"] == "pending"

    def test_public_register_cannot_create_admin(self, session, api_url):
        email = f"TEST_admin_{uuid.uuid4().hex[:6]}@example.com"
        r = session.post(f"{api_url}/auth/register",
                         json={"name": "X", "email": email, "password": "pass1234", "role": "admin"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] != "admin"

    def test_login_admin(self, admin_token):
        assert admin_token

    def test_me_and_patch(self, session, api_url, customer):
        r = session.get(f"{api_url}/auth/me", headers=h(customer["token"]))
        assert r.status_code == 200
        p = session.patch(f"{api_url}/auth/me", headers=h(customer["token"]),
                          json={"phone": "1234567890"})
        assert p.status_code == 200
        assert p.json()["phone"] == "1234567890"

    def test_login_wrong_password(self, session, api_url, customer):
        r = session.post(f"{api_url}/auth/login",
                         json={"email": customer["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_duplicate_email(self, session, api_url, customer):
        r = session.post(f"{api_url}/auth/register",
                         json={"name": "X", "email": customer["email"], "password": "pass1234"})
        assert r.status_code == 409


# ------------------------ CATEGORIES & AI ------------------------
class TestCategoriesAndAI:
    def test_categories(self, session, api_url, customer):
        r = session.get(f"{api_url}/categories", headers=h(customer["token"]))
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) >= 11
        slugs = [c["slug"] for c in cats]
        assert "plumbing" in slugs and "appliance_repair" in slugs

    def test_ai_classify_appliance(self, session, api_url, customer):
        r = session.post(f"{api_url}/ai/classify", headers=h(customer["token"]),
                         json={"text": "My washing machine fills with water but does not start"})
        assert r.status_code == 200
        data = r.json()
        for k in ("category", "category_name", "likely_professional", "summary",
                  "needs_more_info", "follow_up_question", "disclaimer"):
            assert k in data, f"missing key {k}"
        # AI may fallback but expect either appliance_repair or a valid slug
        assert data["category"] in ("appliance_repair", "electrical", "plumbing", "other")

    def test_ai_classify_plumbing(self, session, api_url, customer):
        r = session.post(f"{api_url}/ai/classify", headers=h(customer["token"]),
                         json={"text": "bathroom tap leaking"})
        assert r.status_code == 200
        assert r.json()["category"] in ("plumbing", "other")


# ------------------------ PROFESSIONALS ------------------------
class TestProfessionals:
    def test_list_by_category(self, session, api_url, customer):
        r = session.get(f"{api_url}/professionals?category=plumbing", headers=h(customer["token"]))
        assert r.status_code == 200
        pros = r.json()
        assert len(pros) >= 1
        for p in pros:
            assert p["verification_status"] == "verified"
            assert p["category"] == "plumbing"

    def test_get_professional_details(self, session, api_url, customer):
        r = session.get(f"{api_url}/professionals?category=plumbing", headers=h(customer["token"]))
        pro_id = r.json()[0]["id"]
        d = session.get(f"{api_url}/professionals/{pro_id}", headers=h(customer["token"]))
        assert d.status_code == 200
        assert "reviews" in d.json()


# ------------------------ BOOKINGS ------------------------
@pytest.fixture(scope="module")
def booking_ctx(session, customer, professional, api_url):
    """Create a booking against the freshly registered+verified professional."""
    r = session.post(f"{api_url}/bookings", headers=h(customer["token"]),
                     json={
                         "professional_id": professional["pro_id"],
                         "category": "plumbing",
                         "problem_text": "tap leaking",
                         "address": "TEST addr",
                         "scheduled_date": "2026-01-20",
                         "scheduled_time": "10:00",
                         "urgency": "normal",
                         "estimated_price_min": 300,
                         "estimated_price_max": 700,
                     })
    assert r.status_code == 200, r.text
    return {"booking": r.json()}


class TestBookingLifecycle:
    def test_created_status(self, booking_ctx):
        assert booking_ctx["booking"]["status"] == "requested"

    def test_customer_cannot_confirm(self, session, api_url, customer, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = session.patch(f"{api_url}/bookings/{bid}/status", headers=h(customer["token"]),
                          json={"status": "confirmed"})
        assert r.status_code == 403

    def test_pro_confirms(self, session, api_url, professional, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = session.patch(f"{api_url}/bookings/{bid}/status", headers=h(professional["token"]),
                          json={"status": "confirmed"})
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"

    def test_pro_advances_status(self, session, api_url, professional, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        for st in ("on_the_way", "arrived", "work_started", "work_completed"):
            r = session.patch(f"{api_url}/bookings/{bid}/status", headers=h(professional["token"]),
                              json={"status": st})
            assert r.status_code == 200, f"{st}: {r.text}"
            assert r.json()["status"] == st

    def test_pro_sets_quote(self, session, api_url, professional, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = session.patch(f"{api_url}/bookings/{bid}/quote", headers=h(professional["token"]),
                          json={"final_price": 550})
        assert r.status_code == 200
        assert r.json()["final_price"] == 550

    def test_pro_cannot_pay(self, session, api_url, professional, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = session.post(f"{api_url}/bookings/{bid}/pay", headers=h(professional["token"]),
                         json={"method": "cash"})
        assert r.status_code == 403

    def test_customer_pays(self, session, api_url, customer, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = session.post(f"{api_url}/bookings/{bid}/pay", headers=h(customer["token"]),
                         json={"method": "cash"})
        assert r.status_code == 200
        assert r.json()["status"] == "paid"

    def test_customer_reviews(self, session, api_url, customer, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = session.post(f"{api_url}/bookings/{bid}/review", headers=h(customer["token"]),
                         json={"rating": 5, "comment": "Excellent"})
        assert r.status_code == 200
        assert r.json()["rating"] == 5

    def test_pro_rating_updated(self, session, api_url, customer, professional, booking_ctx):
        d = session.get(f"{api_url}/professionals/{professional['pro_id']}", headers=h(customer["token"]))
        assert d.status_code == 200
        assert d.json().get("rating", 0) > 0


# ------------------------ MESSAGES ------------------------
class TestMessages:
    def test_send_and_get_between_parties(self, session, api_url, customer, professional, booking_ctx):
        bid = booking_ctx["booking"]["id"]
        r = session.post(f"{api_url}/bookings/{bid}/messages", headers=h(customer["token"]),
                         json={"text": "hi"})
        assert r.status_code == 200
        g = session.get(f"{api_url}/bookings/{bid}/messages", headers=h(professional["token"]))
        assert g.status_code == 200
        assert any(m["text"] == "hi" for m in g.json())

    def test_other_user_forbidden(self, session, api_url, booking_ctx):
        # Register a random customer
        email = f"TEST_other_{uuid.uuid4().hex[:6]}@example.com"
        r = session.post(f"{api_url}/auth/register",
                         json={"name": "O", "email": email, "password": "pass1234"})
        token = r.json()["access_token"]
        bid = booking_ctx["booking"]["id"]
        g = session.get(f"{api_url}/bookings/{bid}/messages", headers=h(token))
        assert g.status_code == 403


# ------------------------ NOTIFICATIONS ------------------------
class TestNotifications:
    def test_notifications_for_customer(self, session, api_url, customer, booking_ctx):
        r = session.get(f"{api_url}/notifications", headers=h(customer["token"]))
        assert r.status_code == 200
        notes = r.json()
        # customer should have received status updates
        assert len(notes) >= 1
        if notes:
            nid = notes[0]["id"]
            m = session.patch(f"{api_url}/notifications/{nid}/read", headers=h(customer["token"]))
            assert m.status_code == 200


# ------------------------ PRO DASHBOARD ------------------------
class TestProDashboard:
    def test_dashboard(self, session, api_url, professional):
        r = session.get(f"{api_url}/pro/dashboard", headers=h(professional["token"]))
        assert r.status_code == 200
        d = r.json()
        assert "metrics" in d and "new_requests" in d and "active" in d and "completed" in d

    def test_availability_toggle(self, session, api_url, professional):
        r = session.patch(f"{api_url}/pro/availability", headers=h(professional["token"]),
                          json={"availability": "busy"})
        assert r.status_code == 200
        assert r.json()["availability"] == "busy"
        # restore
        session.patch(f"{api_url}/pro/availability", headers=h(professional["token"]),
                      json={"availability": "available"})


# ------------------------ ADMIN ------------------------
class TestAdmin:
    def test_stats(self, session, api_url, admin_token):
        r = session.get(f"{api_url}/admin/stats", headers=h(admin_token))
        assert r.status_code == 200
        for k in ("total_users", "professionals", "total_bookings", "commission_pct"):
            assert k in r.json()

    def test_users_list_excludes_admin(self, session, api_url, admin_token):
        r = session.get(f"{api_url}/admin/users", headers=h(admin_token))
        assert r.status_code == 200
        assert all(u["role"] != "admin" for u in r.json())

    def test_pending_pros_list(self, session, api_url, admin_token):
        r = session.get(f"{api_url}/admin/professionals?status=pending", headers=h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_suspend_user(self, session, api_url, admin_token):
        # Register test user
        email = f"TEST_sus_{uuid.uuid4().hex[:6]}@example.com"
        rr = session.post(f"{api_url}/auth/register",
                          json={"name": "S", "email": email, "password": "pass1234"})
        uid = rr.json()["user"]["id"]
        r = session.patch(f"{api_url}/admin/users/{uid}/suspend", headers=h(admin_token),
                          json={"disabled": True})
        assert r.status_code == 200
        # Verify user cannot login
        l = session.post(f"{api_url}/auth/login", json={"email": email, "password": "pass1234"})
        assert l.status_code == 403

    def test_bookings_list(self, session, api_url, admin_token):
        r = session.get(f"{api_url}/admin/bookings", headers=h(admin_token))
        assert r.status_code == 200

    def test_commission_update(self, session, api_url, admin_token):
        r = session.patch(f"{api_url}/admin/settings/commission", headers=h(admin_token),
                          json={"commission_pct": 12})
        assert r.status_code == 200
        assert r.json()["commission_pct"] == 12
        # reset
        session.patch(f"{api_url}/admin/settings/commission", headers=h(admin_token),
                      json={"commission_pct": 10})

    def test_customer_forbidden_from_admin(self, session, api_url, customer):
        r = session.get(f"{api_url}/admin/stats", headers=h(customer["token"]))
        assert r.status_code == 403


# ------------------------ UPLOADS ------------------------
class TestUpload:
    def test_upload_and_fetch(self, api_url, customer):
        # 1x1 PNG bytes
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
