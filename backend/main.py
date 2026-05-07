from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime
import os
import time

from supabase import create_client, Client

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
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
async def get_all_users_status():
    try:
        profiles_res = supabase.table("profiles").select("*").execute()
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
async def get_single_user_details(uid: str):
    try:
        profile_res = supabase.table("profiles").select("*").eq("id", uid).execute()
        name = profile_res.data[0].get("name", "Unknown") if profile_res.data else "Unknown"
        
        vitals_res = supabase.table("vitals").select("*").eq("user_id", uid).order("created_at", desc=False).execute()
        
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