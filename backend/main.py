import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv
from supabase import create_client, Client

# Load local environment configuration
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
DEVICE_SECRET_TOKEN = os.getenv("DEVICE_SECRET_TOKEN", "device_secure_token_juja_2026")

# Diagnostic start-up validation
if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ STARTUP ERROR: Missing 'SUPABASE_URL' or 'SUPABASE_ANON_KEY' in backend/.env!")

# Safe, low-privileged Client Initialization
try:
    # We only use the public anon client. We do not require any administrative master keys!
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
except Exception as e:
    print(f"❌ Critical Failure: Could not initialize Supabase client. Reason: {e}")
    supabase_client = None


app = FastAPI(
    title="Smart IoT Health Monitoring System",
    description="Least-Privilege Ingestion API with client-side token validation.",
    version="1.2.0"
)

# Enable secure cross-origin sharing for your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Input Validation Schema
class VitalsPayload(BaseModel):
    user_id: str = Field(..., alias="user_uid", description="The Supabase UUID of the patient")
    heart_rate: float = Field(..., description="Heart rate in beats per minute")
    temperature: float = Field(..., description="Body temperature in Celsius")
    status: Optional[str] = "NORMAL"

    # Physiological boundary assertions (SQA validation)
    @field_validator("heart_rate")
    @classmethod
    def validate_heart_rate(cls, v):
        if v < 0 or v > 300:
            raise ValueError("Heart rate out of physiological boundaries")
        return v

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v):
        if v < 25.0 or v > 45.0:
            raise ValueError("Temperature out of physiological boundaries")
        return v

    model_config = {
        "populate_by_name": True
    }


# Helper Function: Validate Admin Roles strictly using User JWT (No master admin key needed!)
async def verify_admin_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: Missing or invalid token format")
    
    token = authorization.split(" ")[1]
    
    try:
        if not supabase_client:
            raise HTTPException(status_code=500, detail="Database client unavailable")
            
        # 1. Create a client scoped to the caller's JWT token
        user_scoped_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user_scoped_client.postgrest.auth(token)
        
        # 2. Grab the logged-in user profile details safely
        user_response = user_scoped_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
        
        # 3. Check their role in the profiles table (under their own read permissions)
        profile_response = user_scoped_client.table("profiles").select("role").eq("id", user.id).execute()
        profile_data = profile_response.data
        
        if not profile_data or len(profile_data) == 0 or profile_data[0].get("role") != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
            
        return token
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


# --- LEAST-PRIVILEGE INGESTION ENDPOINT (Option A Gateway) ---
@app.post("/api/vitals")
async def receive_vitals(
    payload: VitalsPayload,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token")
):
    """
    Ingests live sensor readings safely.
    Validates device authenticity at the Gateway, then writes to the database
    using the restricted public ANON_KEY (No Admin Service Key used!).
    """
    # 1. Device Token Authentication Check
    if not x_device_token or x_device_token != DEVICE_SECRET_TOKEN:
        print(f"⚠️ UNAUTHORIZED ATTEMPT: Rejected write request with token: {x_device_token}")
        raise HTTPException(
            status_code=401, 
            detail="Security Verification Failed: Device token mismatch."
        )

    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database client offline.")
        
    try:
        # Construct exact schema properties to write
        db_data = {
            "user_id": payload.user_id,
            "heart_rate": payload.heart_rate,
            "temperature": payload.temperature,
            "status": payload.status
        }
        
        # --- THE FIX IS HERE ---
        # Adding returning="minimal" prevents Supabase from running a SELECT query on the row we write,
        # which satisfies RLS and lets us ingest data without any database read permissions!
        supabase_client.table("vitals").insert(db_data, returning="minimal").execute()
        
        return {
            "status": "success",
            "message": f"[OK] Safe Ingestion Accepted for User ID {payload.user_id}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database write rejected by RLS: {str(e)}")


# --- PROTECTED ADMIN ROSTER (Authenticated Query) ---
@app.get("/api/admin/all-users-status")
async def get_all_users_status(token: str = Depends(verify_admin_token)):
    try:
        # Create user-scoped connection mapping
        user_scoped_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user_scoped_client.postgrest.auth(token)
        
        # Admin can view all profile states because they are authorized as an admin
        response = user_scoped_client.table("profiles").select("*").execute()
        return {
            "status": "success",
            "role_verified": "admin",
            "data": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch administrative data: {str(e)}")