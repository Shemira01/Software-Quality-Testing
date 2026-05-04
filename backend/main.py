from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import os

import firebase_admin
from firebase_admin import credentials, db

app = FastAPI(title="Smart IoT Health Monitoring API")


def load_dotenv(dotenv_path: str) -> None:
    if not os.path.isfile(dotenv_path):
        return

    with open(dotenv_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"\'')
            if key and key not in os.environ:
                os.environ[key] = value


load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

FIREBASE_RTDB_URL = (
    os.environ.get("DATABASE_URL")
)

service_account_path = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "serviceAccountKey.json",
)
if not os.path.isabs(service_account_path):
    service_account_path = os.path.join(
        os.path.dirname(__file__), service_account_path
    )

if not firebase_admin._apps:
    if not os.path.isfile(service_account_path):
        raise RuntimeError(
            f"Firebase service account file not found: {service_account_path}"
        )

    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_RTDB_URL})

class VitalsPayload(BaseModel):
    client_id: int
    user_uid: Optional[str] = None
    heart_rate: float
    temperature: float
    status_flag: Optional[str] = "NORMAL"

@app.post("/api/vitals")
async def receive_vitals(payload: VitalsPayload):
    """
    Endpoint for the ESP32 to push telemetry.
    The FastAPI backend then validates and forwards to Firebase RTDB.
    """
    try:
        # Business Logic / Validation (Boundary Analysis testing point)
        if payload.temperature > 37.5 or payload.heart_rate > 100:
            payload.status_flag = "ALERT"
        else:
            payload.status_flag = "NORMAL"

        # Format data for Firebase to match the frontend dashboard shape
        data = {
            "heartRate": payload.heart_rate,
            "temperature": payload.temperature,
            "status": payload.status_flag,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        # Choose the database path based on Firebase auth UID if provided.
        base_path = (
            f"users/{payload.user_uid}"
            if payload.user_uid
            else f"users/{payload.client_id}"
        )
        vitals_path = f"{base_path}/vitals"
        history_path = f"{base_path}/history"

        # Store the latest vitals snapshot.
        vitals_ref = db.reference(vitals_path)
        vitals_ref.set(data)

        # Build history entries for charts.
        timestamp = datetime.utcnow()
        formatted_date = timestamp.strftime("%Y-%m-%d")
        formatted_time = timestamp.strftime("%H:%M")

        history_ref = db.reference(history_path)
        history_snapshot = history_ref.get() or {}

        daily = history_snapshot.get("daily", [])
        weekly = history_snapshot.get("weekly", [])
        alerts = history_snapshot.get("alerts", [])

        daily.append({
            "time": formatted_time,
            "heartRate": payload.heart_rate,
            "temp": payload.temperature,
        })

        if weekly and weekly[-1].get("day") == formatted_date:
            last_day = weekly[-1]
            count = last_day.get("count", 1)
            avg_hr = (last_day.get("avgHR", 0) * count + payload.heart_rate) / (count + 1)
            avg_temp = (last_day.get("avgTemp", 0) * count + payload.temperature) / (count + 1)
            last_day["avgHR"] = round(avg_hr, 1)
            last_day["avgTemp"] = round(avg_temp, 1)
            last_day["count"] = count + 1
        else:
            weekly.append({
                "day": formatted_date,
                "avgHR": payload.heart_rate,
                "avgTemp": payload.temperature,
                "count": 1,
            })

        if payload.status_flag == "ALERT":
            alerts.append({
                "date": formatted_date,
                "time": formatted_time,
                "message": "Most recent vitals triggered an alert.",
            })

        history_ref.set({
            "daily": daily,
            "weekly": weekly,
            "alerts": alerts,
        })

        return {
            "message": "Data logged successfully",
            "path": vitals_path,
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TestInjectErrorPayload(BaseModel):
    client_id: int
    user_uid: Optional[str] = None
    scenario: Optional[str] = "alert"

@app.post("/api/test/inject-error")
async def inject_error(payload: TestInjectErrorPayload):
    """Simulate a sensor failure or alert to validate frontend ALERT behavior."""
    try:
        if payload.scenario == "alert":
            test_payload = VitalsPayload(
                client_id=payload.client_id,
                user_uid=payload.user_uid,
                heart_rate=120.0,
                temperature=38.5,
            )
        elif payload.scenario == "invalid":
            test_payload = VitalsPayload(
                client_id=payload.client_id,
                user_uid=payload.user_uid,
                heart_rate=999.0,
                temperature=999.0,
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported scenario. Use 'alert' or 'invalid'.")

        result = await receive_vitals(test_payload)
        return {
            "message": "Test injection completed.",
            "scenario": payload.scenario,
            "result": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "Backend is active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
