import os

os.environ["SKIP_FIREBASE_INIT"] = "1"
os.environ.setdefault("DATABASE_URL", "https://example.firebaseio.com/")

from fastapi.testclient import TestClient

from main import VitalsPayload, app, determine_status


client = TestClient(app)


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
            "client_id": 1,
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
            "client_id": 1,
            "user_uid": "test-user",
            "heart_rate": 500,
            "temperature": 36.6,
        },
    )

    assert response.status_code == 422


def test_payload_accepts_valid_boundary_values():
    payload = VitalsPayload(
        client_id=1,
        user_uid="test-user",
        heart_rate=30,
        temperature=30,
    )

    assert payload.heart_rate == 30
    assert payload.temperature == 30
