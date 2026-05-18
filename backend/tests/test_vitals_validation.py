import os

# Configure environment mocks before importing main
os.environ["SKIP_SUPABASE_INIT"] = "1"
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("DEVICE_SECRET_TOKEN", "device_secure_token_juja_2026")

from fastapi.testclient import TestClient
import main
from main import VitalsPayload, app

client = TestClient(app)

# --- MOCK SUPABASE DATABASE HELPERS ---

class FakeResult:
    def __init__(self, data=None):
        self.data = data or []


class FakeTable:
    def __init__(self, database, name):
        self.database = database
        self.name = name
        self.action = None
        self.payload = None
        self.returning = None
        self.filters = []

    def insert(self, payload, returning="minimal"):
        self.action = "insert"
        self.payload = payload
        self.returning = returning
        return self

    def select(self, columns):
        self.action = "select"
        self.payload = columns
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def execute(self):
        self.database.operations.append({
            "table": self.name,
            "action": self.action,
            "payload": self.payload,
            "returning": self.returning,
            "filters": self.filters,
        })
        return FakeResult(self.database.select_data.get(self.name, []))


class FakeSupabase:
    def __init__(self):
        self.operations = []
        self.select_data = {}

    def table(self, name):
        return FakeTable(self, name)


def install_fake_supabase(monkeypatch):
    fake = FakeSupabase()
    # We patch "supabase_client" to match our updated main.py client reference
    monkeypatch.setattr(main, "supabase_client", fake)
    return fake


# --- API GATEWAY SECURITY & HEADER TESTS ---

def test_ingestion_without_device_token_returns_401():
    response = client.post(
        "/api/vitals",
        json={
            "user_uid": "test-user",
            "heart_rate": 75.0,
            "temperature": 36.6,
        },
    )
    assert response.status_code == 401
    assert "Device token mismatch" in response.json()["detail"]


def test_ingestion_with_incorrect_device_token_returns_401():
    response = client.post(
        "/api/vitals",
        json={
            "user_uid": "test-user",
            "heart_rate": 75.0,
            "temperature": 36.6,
        },
        headers={"X-Device-Token": "wrong_device_token_123"}
    )
    assert response.status_code == 401


def test_successful_secured_ingestion(monkeypatch):
    fake = install_fake_supabase(monkeypatch)
    
    response = client.post(
        "/api/vitals",
        json={
            "user_uid": "patient-123",
            "heart_rate": 80.0,
            "temperature": 36.8,
            "status": "NORMAL"
        },
        headers={"X-Device-Token": "device_secure_token_juja_2026"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Assert database operations wrote with minimal return payload configuration
    assert len(fake.operations) == 1
    op = fake.operations[0]
    assert op["table"] == "vitals"
    assert op["action"] == "insert"
    assert op["returning"] == "minimal"
    assert op["payload"]["user_id"] == "patient-123"


# --- INPUT VALIDATION & SQA BOUNDARY TESTS ---

def test_negative_heart_rate_is_rejected():
    response = client.post(
        "/api/vitals",
        json={
            "user_uid": "test-user",
            "heart_rate": -1,
            "temperature": 36.6,
        },
        headers={"X-Device-Token": "device_secure_token_juja_2026"}
    )
    assert response.status_code == 422


def test_unrealistic_heart_rate_is_rejected():
    response = client.post(
        "/api/vitals",
        json={
            "user_uid": "test-user",
            "heart_rate": 500,
            "temperature": 36.6,
        },
        headers={"X-Device-Token": "device_secure_token_juja_2026"}
    )
    assert response.status_code == 422


def test_payload_accepts_valid_boundary_values():
    payload = VitalsPayload(
        user_uid="test-user",
        heart_rate=30,
        temperature=30,
    )
    assert payload.heart_rate == 30
    assert payload.temperature == 30


# --- RBAC SECURITY ENFORCEMENT TESTS ---

def test_admin_roster_requires_bearer_token():
    response = client.get("/api/admin/all-users-status")
    assert response.status_code == 401