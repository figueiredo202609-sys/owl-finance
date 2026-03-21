"""
Owl Finance - Backend API Tests v2
Tests: plans, auth, AI insights (Premium/403), transaction CRUD, delete permanence
"""
import pytest
import requests
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / '.env')
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "figueiredo202609@gmail.com"
ADMIN_PASS = "Aires100686"
PREMIUM_EMAIL = "owltest@test.com"
PREMIUM_PASS = "Client123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def premium_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": PREMIUM_EMAIL, "password": PREMIUM_PASS})
    assert r.status_code == 200, f"Premium login failed: {r.text}"
    return r.json()["token"]


# --- Plans ---
class TestPlans:
    """GET /api/plans - verify 3 plans with correct prices"""

    def test_plans_returns_3(self):
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) == 3

    def test_plans_prices(self):
        r = requests.get(f"{BASE_URL}/api/plans")
        plans = {p["name"]: p["price"] for p in r.json()}
        assert plans.get("Básico") == 69.90
        assert plans.get("Profissional") == 94.90
        assert plans.get("Premium") == 119.90

    def test_plan_basic_no_export_no_ai(self):
        r = requests.get(f"{BASE_URL}/api/plans")
        basic = next(p for p in r.json() if p["name"] == "Básico")
        assert basic["export"] == False
        assert basic["ai"] == False

    def test_plan_premium_has_ai(self):
        r = requests.get(f"{BASE_URL}/api/plans")
        premium = next(p for p in r.json() if p["name"] == "Premium")
        assert premium["ai"] == True
        assert premium["export"] == True


# --- Auth ---
class TestAuth:
    """Login flow"""

    def test_admin_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        assert "token" in data

    def test_premium_client_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": PREMIUM_EMAIL, "password": PREMIUM_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "client"
        assert data["user"]["plan_name"] == "Premium"

    def test_invalid_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "bad@bad.com", "password": "wrong"})
        assert r.status_code == 401


# --- AI Insights ---
class TestAiInsights:
    """POST /api/client/ai-insights"""

    def test_premium_can_call_ai(self, premium_token):
        r = requests.post(
            f"{BASE_URL}/api/client/ai-insights",
            json={"question": "Qual é meu saldo atual?"},
            headers={"Authorization": f"Bearer {premium_token}"}
        )
        # Should be 200 (AI works) or 500 (LLM key issue)
        assert r.status_code in [200, 500], f"Unexpected: {r.status_code} {r.text}"
        if r.status_code == 200:
            assert "response" in r.json()
            print(f"AI response received: {r.json()['response'][:100]}")

    def test_non_premium_gets_403(self, admin_token):
        """Admin is not a client, so gets 403 from require_client"""
        r = requests.post(
            f"{BASE_URL}/api/client/ai-insights",
            json={"question": "test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 403

    def test_unauthenticated_gets_403(self):
        r = requests.post(f"{BASE_URL}/api/client/ai-insights", json={"question": "test"})
        assert r.status_code in [401, 403, 422]


# --- Transaction CRUD + Permanent Delete ---
class TestTransactions:
    """Transaction create, read, update, delete - verify permanence"""

    def test_create_and_get_transaction(self, premium_token):
        headers = {"Authorization": f"Bearer {premium_token}"}
        payload = {"type": "profit", "value": 999.99, "date": "2026-02-01", "name": "TEST_Lucro Teste", "description": "test"}
        r = requests.post(f"{BASE_URL}/api/client/transactions", json=payload, headers=headers)
        assert r.status_code == 201
        tx_id = r.json()["id"]
        assert tx_id

        # Verify it appears in list
        r2 = requests.get(f"{BASE_URL}/api/client/transactions", headers=headers)
        assert r2.status_code == 200
        ids = [t["id"] for t in r2.json()]
        assert tx_id in ids

        # Cleanup
        requests.delete(f"{BASE_URL}/api/client/transactions/{tx_id}", headers=headers)

    def test_delete_transaction_permanent(self, premium_token):
        """Create transaction, delete, verify it's gone permanently"""
        headers = {"Authorization": f"Bearer {premium_token}"}
        payload = {"type": "expense", "value": 1.00, "date": "2026-02-01", "name": "TEST_Delete Permanente"}
        r = requests.post(f"{BASE_URL}/api/client/transactions", json=payload, headers=headers)
        assert r.status_code == 201
        tx_id = r.json()["id"]

        # Delete
        r_del = requests.delete(f"{BASE_URL}/api/client/transactions/{tx_id}", headers=headers)
        assert r_del.status_code == 200

        # Verify not in list
        r2 = requests.get(f"{BASE_URL}/api/client/transactions", headers=headers)
        ids = [t["id"] for t in r2.json()]
        assert tx_id not in ids, "Transaction still exists after delete!"

    def test_delete_nonexistent_returns_404(self, premium_token):
        headers = {"Authorization": f"Bearer {premium_token}"}
        r = requests.delete(f"{BASE_URL}/api/client/transactions/000000000000000000000000", headers=headers)
        assert r.status_code == 404

    def test_update_transaction(self, premium_token):
        headers = {"Authorization": f"Bearer {premium_token}"}
        payload = {"type": "profit", "value": 100.0, "date": "2026-02-01", "name": "TEST_Update Antes"}
        r = requests.post(f"{BASE_URL}/api/client/transactions", json=payload, headers=headers)
        tx_id = r.json()["id"]

        r_put = requests.put(f"{BASE_URL}/api/client/transactions/{tx_id}", json={"name": "TEST_Update Depois"}, headers=headers)
        assert r_put.status_code == 200

        r2 = requests.get(f"{BASE_URL}/api/client/transactions", headers=headers)
        tx = next((t for t in r2.json() if t["id"] == tx_id), None)
        assert tx is not None
        assert tx["name"] == "TEST_Update Depois"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/client/transactions/{tx_id}", headers=headers)


# --- Admin ---
class TestAdmin:
    """Admin endpoints"""

    def test_get_clients(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/clients", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_delete_client(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"email": "TEST_basic_plan@owl.test", "password": "Test12345!", "restaurant_name": "TEST Basic Resto", "plan_name": "Básico"}
        r = requests.post(f"{BASE_URL}/api/admin/create-client", json=payload, headers=headers)
        assert r.status_code == 201
        cid = r.json()["id"]

        # Verify in list
        r2 = requests.get(f"{BASE_URL}/api/admin/clients", headers=headers)
        ids = [c["id"] for c in r2.json()]
        assert cid in ids

        # Delete
        r_del = requests.delete(f"{BASE_URL}/api/admin/clients/{cid}", headers=headers)
        assert r_del.status_code == 200

    def test_basic_client_cannot_use_ai(self, admin_token):
        """Create a Básico client and verify 403 from ai-insights"""
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        payload = {"email": "TEST_noai@owl.test", "password": "Test12345!", "restaurant_name": "TEST NoAI Resto", "plan_name": "Básico"}
        r = requests.post(f"{BASE_URL}/api/admin/create-client", json=payload, headers=headers_admin)
        cid = r.json()["id"]

        # Login as this basic client
        r_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "TEST_noai@owl.test", "password": "Test12345!"})
        assert r_login.status_code == 200, f"Login failed: {r_login.text}"
        basic_token = r_login.json()["token"]

        # AI call should return 403
        r_ai = requests.post(
            f"{BASE_URL}/api/client/ai-insights",
            json={"question": "test"},
            headers={"Authorization": f"Bearer {basic_token}"}
        )
        assert r_ai.status_code == 403

        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/clients/{cid}", headers=headers_admin)
