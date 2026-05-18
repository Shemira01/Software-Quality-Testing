import os

os.environ["SKIP_SUPABASE_INIT"] = "1"
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")

from fastapi.testclient import TestClient

import main
from main import VitalsPayload, app, determine_status


client = TestClient(app)


class FakeResult:
    def __init__(self, data=None):
        self.data = data or []


class FakeTable:
    def __init__(self, database, name):
        self.database = database
        self.name = name
        self.action = None
        self.payload = None
        self.filters = []
        self.ordering = None

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def select(self, columns):
        self.action = "select"
        self.payload = columns
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def order(self, column, desc=False):
        self.ordering = (column, desc)
        return self

    def execute(self):
        self.database.operations.append({
            "table": self.name,
            "action": self.action,
            "payload": self.payload,
            "filters": self.filters,
            "ordering": self.ordering,
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
    monkeypatch.setattr(main, "supabase", fake)
    main.aggregation_buffer.clear()
    return fake


def vitals_inserts(fake):
    return [
        operation
        for operation in fake.operations
        if operation["table"] == "vitals" and operation["action"] == "insert"
    ]


def test_normal_vitals_are_classified_normal():
    assert determine_status(heart_rate=75, temperature=36.6) == "NORMAL"


def test_high_heart_rate_triggers_alert():
    assert determine_status(heart_rate=120, temperature=36.8) == "ALERT"


def test_high_temperature_triggers_alert():
    assert determine_status(heart_rate=80, temperature=38.5) == "ALERT"


def test_low_heart_rate_triggers_alert():
    assert determine_status(heart_rate=55, temperature=36.8) == "ALERT"


def test_negative_heart_rate_is_rejected():
    response = client.post(
        "/api/vitals",
        json={
            "user_uid": "test-user",
            "heart_rate": -1,
            "temperature": 36.6,
        },
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


def test_normal_reading_updates_live_profile_without_immediate_history_insert(monkeypatch):
    fake = install_fake_supabase(monkeypatch)
    monkeypatch.setattr(main.time, "time", lambda: 1000)

    response = client.post(
        "/api/vitals",
        json={"user_uid": "patient-1", "heart_rate": 80, "temperature": 36.8},
    )

    assert response.status_code == 200
    assert any(
        operation["table"] == "profiles" and operation["action"] == "update"
        for operation in fake.operations
    )
    assert vitals_inserts(fake) == []
    assert main.aggregation_buffer["patient-1"]["hr"] == [80.0]


def test_normal_readings_are_downsampled_to_average_after_interval(monkeypatch):
    fake = install_fake_supabase(monkeypatch)
    now = {"value": 1000}
    monkeypatch.setattr(main.time, "time", lambda: now["value"])

    client.post(
        "/api/vitals",
        json={"user_uid": "patient-1", "heart_rate": 80, "temperature": 36.6},
    )
    now["value"] = 1061
    response = client.post(
        "/api/vitals",
        json={"user_uid": "patient-1", "heart_rate": 82, "temperature": 36.8},
    )

    inserts = vitals_inserts(fake)
    assert response.status_code == 200
    assert len(inserts) == 1
    assert inserts[0]["payload"]["heart_rate"] == 81.0
    assert inserts[0]["payload"]["temperature"] == 36.7
    assert inserts[0]["payload"]["status"] == "NORMAL"
    assert main.aggregation_buffer["patient-1"]["hr"] == []


def test_alert_bypasses_aggregation_and_writes_exact_vitals(monkeypatch):
    fake = install_fake_supabase(monkeypatch)
    monkeypatch.setattr(main.time, "time", lambda: 2000)

    response = client.post(
        "/api/vitals",
        json={"user_uid": "patient-1", "heart_rate": 130, "temperature": 36.8},
    )

    inserts = vitals_inserts(fake)
    assert response.status_code == 200
    assert len(inserts) == 1
    assert inserts[0]["payload"] == {
        "user_id": "patient-1",
        "heart_rate": 130.0,
        "temperature": 36.8,
        "status": "ALERT",
    }


def test_repeated_alerts_are_throttled_for_sixty_seconds(monkeypatch):
    fake = install_fake_supabase(monkeypatch)
    now = {"value": 3000}
    monkeypatch.setattr(main.time, "time", lambda: now["value"])

    client.post(
        "/api/vitals",
        json={"user_uid": "patient-1", "heart_rate": 130, "temperature": 36.8},
    )
    now["value"] = 3020
    client.post(
        "/api/vitals",
        json={"user_uid": "patient-1", "heart_rate": 140, "temperature": 39.0},
    )

    assert len(vitals_inserts(fake)) == 1


def test_admin_roster_requires_bearer_token():
    response = client.get("/api/admin/all-users-status")

    assert response.status_code == 401


def test_patient_report_requires_bearer_token():
    response = client.get("/api/admin/user/patient-1")

    assert response.status_code == 401
