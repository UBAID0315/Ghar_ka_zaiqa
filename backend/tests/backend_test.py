"""Backend API tests for Ghar Ka Zaiqa."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://food-flow-42.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@gharkazaiqa.com"
ADMIN_PASSWORD = "GharKaZaiqa@2026"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Auth ---
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == ADMIN_EMAIL
        assert isinstance(d["token"], str) and len(d["token"]) > 20

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WrongPass"}, timeout=20)
        assert r.status_code == 401

    def test_me_requires_token(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# --- Public order creation ---
class TestOrderCreate:
    def test_create_cart_order(self):
        payload = {
            "order_type": "cart",
            "customer_name": "TEST_Cart Customer",
            "phone": "03001234567",
            "area": "Gulberg",
            "address": "House 1",
            "note": "ring bell",
            "items": [
                {"name": "Biryani", "price": 400, "qty": 2},
                {"name": "Daal", "price": 300, "qty": 1},
            ],
            "total": 1100,
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"] and d["status"] == "new"
        assert d["customer_name"] == payload["customer_name"]
        assert d["total"] == 1100
        assert len(d["items"]) == 2
        pytest.cart_order_id = d["id"]

    def test_create_booking_order(self):
        payload = {
            "order_type": "booking",
            "customer_name": "TEST_Booking Customer",
            "phone": "03007654321",
            "area": "DHA",
            "week_choice": "Week One",
            "meals": "3-5 meals",
            "items": [],
            "total": 0,
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["order_type"] == "booking"
        assert d["week_choice"] == "Week One"
        assert d["meals"] == "3-5 meals"
        assert d["total"] == 0
        pytest.booking_order_id = d["id"]


# --- Protected endpoints ---
class TestProtected:
    def test_list_orders_no_auth(self):
        r = requests.get(f"{API}/orders", timeout=20)
        assert r.status_code == 401

    def test_stats_no_auth(self):
        r = requests.get(f"{API}/orders/stats", timeout=20)
        assert r.status_code == 401

    def test_patch_no_auth(self):
        r = requests.patch(f"{API}/orders/x/status", json={"status": "preparing"}, timeout=20)
        assert r.status_code == 401

    def test_delete_no_auth(self):
        r = requests.delete(f"{API}/orders/x", timeout=20)
        assert r.status_code == 401

    def test_list_orders_with_auth(self, auth_headers):
        r = requests.get(f"{API}/orders", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_orders_with_status_filter(self, auth_headers):
        r = requests.get(f"{API}/orders", headers=auth_headers, params={"status": "new"}, timeout=20)
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "new"

    def test_stats_with_auth(self, auth_headers):
        r = requests.get(f"{API}/orders/stats", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "new", "today", "revenue"):
            assert k in d
            assert isinstance(d[k], int)


# --- Status update flow ---
class TestStatusUpdate:
    def test_status_update_flow(self, auth_headers):
        # Create order
        payload = {
            "order_type": "cart",
            "customer_name": "TEST_StatusFlow",
            "phone": "03000000000",
            "area": "Model Town",
            "items": [{"name": "Roti", "price": 50, "qty": 4}],
            "total": 200,
        }
        cr = requests.post(f"{API}/orders", json=payload, timeout=20)
        assert cr.status_code == 200
        oid = cr.json()["id"]

        # Update to preparing
        r = requests.patch(f"{API}/orders/{oid}/status", json={"status": "preparing"}, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert r.json()["status"] == "preparing"

        # Update to delivered
        for s in ("out_for_delivery", "delivered", "cancelled"):
            r = requests.patch(f"{API}/orders/{oid}/status", json={"status": s}, headers=auth_headers, timeout=20)
            assert r.status_code == 200, f"status={s} failed: {r.text}"
            assert r.json()["status"] == s

        # Invalid status
        r = requests.patch(f"{API}/orders/{oid}/status", json={"status": "invalid"}, headers=auth_headers, timeout=20)
        assert r.status_code == 400

        # Unknown id
        r = requests.patch(f"{API}/orders/nonexistent-id/status", json={"status": "preparing"}, headers=auth_headers, timeout=20)
        assert r.status_code == 404

        # cleanup
        requests.delete(f"{API}/orders/{oid}", headers=auth_headers, timeout=20)


class TestRevenue:
    def test_revenue_excludes_cancelled(self, auth_headers):
        # Create one delivered + one cancelled order, check stats
        # Get baseline
        s0 = requests.get(f"{API}/orders/stats", headers=auth_headers, timeout=20).json()

        a = requests.post(f"{API}/orders", json={
            "order_type": "cart", "customer_name": "TEST_RevA", "phone": "0300", "area": "X",
            "items": [{"name": "x", "price": 100, "qty": 1}], "total": 500
        }, timeout=20).json()
        b = requests.post(f"{API}/orders", json={
            "order_type": "cart", "customer_name": "TEST_RevB", "phone": "0300", "area": "X",
            "items": [{"name": "x", "price": 100, "qty": 1}], "total": 700
        }, timeout=20).json()

        # cancel b
        requests.patch(f"{API}/orders/{b['id']}/status", json={"status": "cancelled"}, headers=auth_headers, timeout=20)

        s1 = requests.get(f"{API}/orders/stats", headers=auth_headers, timeout=20).json()
        # Revenue should increase by 500 only (b is cancelled)
        assert s1["revenue"] - s0["revenue"] == 500, f"baseline={s0['revenue']} new={s1['revenue']}"

        # cleanup
        requests.delete(f"{API}/orders/{a['id']}", headers=auth_headers, timeout=20)
        requests.delete(f"{API}/orders/{b['id']}", headers=auth_headers, timeout=20)


class TestDelete:
    def test_delete_flow(self, auth_headers):
        cr = requests.post(f"{API}/orders", json={
            "order_type": "cart", "customer_name": "TEST_Delete", "phone": "0300", "area": "X",
            "items": [], "total": 0
        }, timeout=20)
        oid = cr.json()["id"]
        r = requests.delete(f"{API}/orders/{oid}", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        # delete again → 404
        r = requests.delete(f"{API}/orders/{oid}", headers=auth_headers, timeout=20)
        assert r.status_code == 404


def test_cleanup_test_orders(admin_token):
    """Remove any TEST_-prefixed orders left over."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.get(f"{API}/orders", headers=headers, timeout=20)
    for o in r.json():
        if str(o.get("customer_name", "")).startswith("TEST_"):
            requests.delete(f"{API}/orders/{o['id']}", headers=headers, timeout=20)
