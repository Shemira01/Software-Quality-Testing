from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime
import os
import time

from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

app = FastAPI(title="Smart IoT Health Monitoring API (Precise Alerts)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_dotenv(dotenv_path: str) -> None:
    if not os.path.isfile(dotenv_path): return
    with open(dotenv_path, "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"\'')

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_KEY")
    or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)

if os.environ.get("SKIP_SUPABASE_INIT") == "1":
    supabase = None
else:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_KEY "
            "in backend/.env. SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_ROLE_KEY "
            "are also accepted."
        )
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def create_user_scoped_client(access_token: str) -> Client:
    """Create a Supabase client that uses the caller's JWT so RLS applies."""
    return create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
        options=ClientOptions(
            headers={"Authorization": f"Bearer {access_token}"},
            persist_session=False,
            auto_refresh_token=False,
        ),
    )


async def get_current_user_context(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    access_token = authorization.removeprefix("Bearer ").strip()
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        auth_response = supabase.auth.get_user(access_token)
        user = auth_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid bearer token")

        user_client = create_user_scoped_client(access_token)
        profile_response = (
            user_client
            .table("profiles")
            .select("id, role")
            .eq("id", user.id)
            .execute()
        )
        profile = profile_response.data[0] if profile_response.data else {}

        return {
            "user_id": user.id,
            "role": profile.get("role", "patient"),
            "client": user_client,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired bearer token") from exc


async def require_admin(context=Depends(get_current_user_context)):
    if context["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return context


async def require_admin_or_self(uid: str, context=Depends(get_current_user_context)):
    if context["role"] != "admin" and context["user_id"] != uid:
        raise HTTPException(status_code=403, detail="Not authorized for this patient")
    return context


@app.get("/")
async def root():
    return {
        "status": "Backend is running",
        "health_check": "/api/health",
        "interactive_api_docs": "/docs",
        "vitals_endpoint": "/api/vitals",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "Backend is active"}

def determine_status(heart_rate: float, temperature: float) -> str:
    if temperature > 37.5 or heart_rate > 100 or heart_rate < 60: return "ALERT"
    return "NORMAL"

class VitalsPayload(BaseModel):
    user_uid: str
    heart_rate: float = Field(..., ge=30, le=220)
    temperature: float = Field(..., ge=30, le=45)

# --- THE AGGREGATION BUFFER ---
aggregation_buffer = {}
AGGREGATION_INTERVAL_SECONDS = 60  

@app.post("/api/vitals")
async def receive_vitals(payload: VitalsPayload):
    uid = payload.user_uid
    hr = payload.heart_rate
    temp = payload.temperature
    status = determine_status(hr, temp)
    now = time.time()

    try:
        # 1. LIVE DASHBOARD STREAM
        supabase.table("profiles").update({
            "current_hr": hr,
            "current_temp": temp,
            "current_status": status,
            "last_active": datetime.utcnow().isoformat() + "Z"
        }).eq("id", uid).execute()

        # Initialize buffer for user
        if uid not in aggregation_buffer:
            aggregation_buffer[uid] = {"hr": [], "temp": [], "last_save": now, "last_alert": 0}
            
        buffer = aggregation_buffer[uid]

        # 2. THE ALERT OVERRIDE (Exact Timestamps)
        if status == "ALERT":
            # Throttle to 1 exact alert log per 60 seconds so we don't spam the DB
            if now - buffer["last_alert"] >= 60:
                supabase.table("vitals").insert({
                    "user_id": uid,
                    "heart_rate": hr,
                    "temperature": temp,
                    "status": "ALERT"
                }).execute()
                buffer["last_alert"] = now
                print(f"*** IMMEDIATE EXACT ALERT SAVED FOR {uid} ***")
        else:
            # Normal Readings go into the average buffer
            buffer["hr"].append(hr)
            buffer["temp"].append(temp)

        # 3. STANDARD AGGREGATION (Only for normal readings)
        if now - buffer["last_save"] >= AGGREGATION_INTERVAL_SECONDS:
            if len(buffer["hr"]) > 0: # Ensure we actually have normal readings
                avg_hr = round(sum(buffer["hr"]) / len(buffer["hr"]), 1)
                avg_temp = round(sum(buffer["temp"]) / len(buffer["temp"]), 1)
                avg_status = determine_status(avg_hr, avg_temp)
                
                supabase.table("vitals").insert({
                    "user_id": uid,
                    "heart_rate": avg_hr,
                    "temperature": avg_temp,
                    "status": avg_status
                }).execute()
                print(f"*** AVERAGED NORMAL DATA SAVED FOR {uid} ***")
            
            buffer["hr"].clear()
            buffer["temp"].clear()
            buffer["last_save"] = now

        return {"message": "Live data updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/all-users-status")
async def get_all_users_status(context=Depends(require_admin)):
    try:
        scoped_client = context["client"]
        profiles_res = scoped_client.table("profiles").select("*").execute()
        summary = []
        for p in profiles_res.data:
            summary.append({
                "uid": p["id"],
                "name": p.get("name", "Unknown"),
                "heartRate": p.get("current_hr", 0),
                "temperature": p.get("current_temp", 0),
                "status": p.get("current_status", "UNKNOWN"),
                "lastUpdate": p.get("last_active", "N/A")
            })
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/user/{uid}")
async def get_single_user_details(uid: str, context=Depends(require_admin_or_self)):
    try:
        scoped_client = context["client"]
        profile_res = scoped_client.table("profiles").select("*").eq("id", uid).execute()
        name = profile_res.data[0].get("name", "Unknown") if profile_res.data else "Unknown"
        
        vitals_res = (
            scoped_client
            .table("vitals")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", desc=False)
            .execute()
        )
        
        daily, alerts = [], []
        for log in vitals_res.data:
            # We now send the RAW timestamp string directly to the frontend
            timestamp = log["created_at"] 
            
            daily.append({"timestamp": timestamp, "heartRate": log["heart_rate"], "temp": log["temperature"]})
            if log["status"] == "ALERT":
                alerts.append({"timestamp": timestamp, "message": f"Critical Incident: HR {log['heart_rate']}, Temp {log['temperature']}"})

        return {"uid": uid, "name": name, "history": {"daily": daily, "weekly": [], "alerts": alerts}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
