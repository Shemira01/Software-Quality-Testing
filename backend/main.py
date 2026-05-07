from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import os

import firebase_admin
from firebase_admin import credentials, db

app = FastAPI(title="Smart IoT Health Monitoring API")

app.add_middleware(
+     CORSMiddleware,
+     allow_origins=["*"],  
+     allow_credentials=True,
+     allow_methods=["*"],
+     allow_headers=["*"],
+ )

@app.get("/")
async def root():
    return {
        "status": "Backend is running",
        "health_check": "/api/health",
        "vitals_endpoint": "/api/vitals",
        "docs": "/docs",
    }


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

FIREBASE_RTDB_URL = os.environ.get("DATABASE_URL")
FIREBASE_DATABASE_SECRET = os.environ.get("DATABASE_SECRET")

if not FIREBASE_RTDB_URL:
    raise RuntimeError("DATABASE_URL must be set in backend/.env")

service_account_path = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "serviceAccountKey.json",
)
if not os.path.isabs(service_account_path):
    service_account_path = os.path.join(
        os.path.dirname(__file__), service_account_path
    )

if os.environ.get("SKIP_FIREBASE_INIT") != "1" and not firebase_admin._apps:
    if not os.path.isfile(service_account_path):
        raise RuntimeError(
            f"Firebase service account file not found: {service_account_path}"
        )

    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_RTDB_URL})


def determine_status(heart_rate: float, temperature: float) -> str:
    """Classify vitals after payload boundary validation has passed."""
    if temperature > 37.5 or heart_rate > 100 or heart_rate < 60:
        return "ALERT"
    return "NORMAL"


class VitalsPayload(BaseModel):
    client_id: int = Field(..., ge=1)
    user_uid: Optional[str] = None
    heart_rate: float = Field(..., ge=30, le=220)
    temperature: float = Field(..., ge=30, le=45)
    status_flag: Optional[str] = "NORMAL"

@app.post("/api/vitals")
async def receive_vitals(payload: VitalsPayload):
    """
    Endpoint for the ESP32 to push telemetry.
    The FastAPI backend then validates and forwards to Firebase RTDB.
    """
    try:
        # Business Logic / Validation (Boundary Analysis testing point)
        payload.status_flag = determine_status(
            payload.heart_rate,
            payload.temperature,
        )

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

# Admin endpoint to backend/main.py

@app.get("/api/admin/all-users-status")
async def get_all_users_status():
    """Fetches the latest vitals and status for every user in the system."""
    try:
        users_ref = db.reference("users")
        all_users_data = users_ref.get()
        
        if not all_users_data:
            return []

        summary = []
        for uid, data in all_users_data.items():
            vitals = data.get("vitals", {})
            summary.append({
                "uid": uid,
                "name": data.get("profile", {}).get("name", f"Patient {uid}"), # Falls back if no profile name
                "heartRate": vitals.get("heartRate", 0),
                "temperature": vitals.get("temperature", 0),
                "status": vitals.get("status", "UNKNOWN"),
                "lastUpdate": vitals.get("timestamp", "N/A")
            })
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Add this inside backend/main.py

@app.get("/api/admin/user/{uid}")
async def get_single_user_details(uid: str):
    """Admin endpoint to fetch the complete history and vitals for a specific user."""
    try:
        user_ref = db.reference(f"users/{uid}")
        user_data = user_ref.get()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return user_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Admin endpoint to backend/main.py

@app.get("/api/admin/all-users-status")
async def get_all_users_status():
    """Fetches the latest vitals and status for every user in the system."""
    try:
        users_ref = db.reference("users")
        all_users_data = users_ref.get()
        
        if not all_users_data:
            return []

        summary = []
        for uid, data in all_users_data.items():
            vitals = data.get("vitals", {})
            summary.append({
                "uid": uid,
                "name": data.get("profile", {}).get("name", f"Patient {uid}"), # Falls back if no profile name
                "heartRate": vitals.get("heartRate", 0),
                "temperature": vitals.get("temperature", 0),
                "status": vitals.get("status", "UNKNOWN"),
                "lastUpdate": vitals.get("timestamp", "N/A")
            })
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
