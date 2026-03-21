"""Backend tests for Owl Finance API"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "figueiredo202609@gmail.com"
ADMIN_PASS = "Aires100686"
CLIENT_EMAIL = "owltest@test.com"
CLIENT_PASS = "Client123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def client_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": CLIENT_EMAIL, "password": CLIENT_PASS})
    assert r.status_code == 200, f"Client login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def client_headers(client_token):
    return {"Authorization": f"Bearer {client_token}"}


# --- Auth Tests ---
class TestAuth:
    """Authentication endpoint tests"""

    def test_admin_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["role"] == "admin"

    def test_client_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": CLIENT_EMAIL, "password": CLIENT_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["role"] == "client"
        assert data["user"]["plan_name"] == "Profissional"

    def test_invalid_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@wrong.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_get_me_admin(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_get_me_client(self, client_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=client_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "client"

    def test_no_token_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in [401, 403]


# --- Admin Tests ---
class TestAdmin:
    """Admin endpoint tests"""

    def test_get_admin_stats(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_clients" in data
        assert "monthly_revenue" in data
        assert "active_clients" in data
        assert "inactive_clients" in data
        assert "plan_distribution" in data
        assert "revenue_trend" in data

    def test_get_clients(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        assert r.status_code == 200
        clients = r.json()
        assert isinstance(clients, list)
        assert len(clients) >= 1
        # Verify structure
        c = clients[0]
        assert "id" in c
        assert "email" in c
        assert "plan_name" in c
        assert "status" in c

    def test_create_and_delete_client(self, admin_headers):
        # Create
        payload = {"email": "TEST_newclient@owl.com", "password": "Test123!", "restaurant_name": "TEST Restaurant", "plan_name": "Básico"}
        r = requests.post(f"{BASE_URL}/api/admin/create-client", json=payload, headers=admin_headers)
        assert r.status_code == 201
        client_id = r.json()["id"]

        # Verify via list
        r2 = requests.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        emails = [c["email"] for c in r2.json()]
        assert "test_newclient@owl.com" in emails

        # Delete
        r3 = requests.delete(f"{BASE_URL}/api/admin/clients/{client_id}", headers=admin_headers)
        assert r3.status_code == 200

    def test_toggle_client_status(self, admin_headers):
        # Get first client
        r = requests.get(f"{BASE_URL}/api/admin/clients", headers=admin_headers)
        clients = r.json()
        if not clients:
            pytest.skip("No clients to toggle")
        cid = clients[0]["id"]
        original_status = clients[0]["status"]

        r2 = requests.put(f"{BASE_URL}/api/admin/clients/{cid}/toggle-status", headers=admin_headers)
        assert r2.status_code == 200
        new_status = r2.json()["status"]
        assert new_status != original_status

        # Toggle back
        requests.put(f"{BASE_URL}/api/admin/clients/{cid}/toggle-status", headers=admin_headers)

    def test_get_all_transactions(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/all-transactions", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_plans(self):
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) == 3
        names = [p["name"] for p in plans]
        assert "Básico" in names
        assert "Profissional" in names
        assert "Premium" in names


# --- Client Tests ---
class TestClient:
    """Client endpoint tests"""

    def test_client_dashboard(self, client_headers):
        r = requests.get(f"{BASE_URL}/api/client/dashboard", headers=client_headers)
        assert r.status_code == 200
        data = r.json()
        assert "profits" in data
        assert "expenses" in data
        assert "balance" in data
        assert data["profits"] > 0
        assert data["expenses"] > 0
        assert data["balance"] == round(data["profits"] - data["expenses"], 2)

    def test_get_transactions(self, client_headers):
        r = requests.get(f"{BASE_URL}/api/client/transactions", headers=client_headers)
        assert r.status_code == 200
        txs = r.json()
        assert len(txs) >= 7

    def test_get_transactions_filter_profit(self, client_headers):
        r = requests.get(f"{BASE_URL}/api/client/transactions?type=profit", headers=client_headers)
        assert r.status_code == 200
        txs = r.json()
        assert all(t["type"] == "profit" for t in txs)

    def test_create_update_delete_transaction(self, client_headers):
        # Create
        payload = {"type": "profit", "value": 100.00, "date": "2026-02-01", "name": "TEST Transaction", "description": "Test"}
        r = requests.post(f"{BASE_URL}/api/client/transactions", json=payload, headers=client_headers)
        assert r.status_code == 201
        tx_id = r.json()["id"]

        # Update
        r2 = requests.put(f"{BASE_URL}/api/client/transactions/{tx_id}", json={"value": 200.00}, headers=client_headers)
        assert r2.status_code == 200

        # Delete
        r3 = requests.delete(f"{BASE_URL}/api/client/transactions/{tx_id}", headers=client_headers)
        assert r3.status_code == 200

    def test_get_profile(self, client_headers):
        r = requests.get(f"{BASE_URL}/api/client/profile", headers=client_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == CLIENT_EMAIL
        assert data["plan_name"] == "Profissional"

    def test_client_cannot_access_admin(self, client_headers):
        r = requests.get(f"{BASE_URL}/api/admin/clients", headers=client_headers)
        assert r.status_code == 403

    def test_admin_cannot_access_client(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/client/dashboard", headers=admin_headers)
        assert r.status_code == 403
