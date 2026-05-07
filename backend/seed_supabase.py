import os
from supabase import create_client, Client
from datetime import datetime, timedelta

def load_dotenv(dotenv_path):
    if os.path.isfile(dotenv_path):
        with open(dotenv_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, val = line.strip().split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"\'')

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

patients_to_seed = [
    {"email": "alice@test.com", "name": "Alice Johnson", "hr": 72, "temp": 36.8, "status": "NORMAL"},
    {"email": "marcus@test.com", "name": "Marcus Smith", "hr": 105, "temp": 38.2, "status": "ALERT"},
    {"email": "sarah@test.com", "name": "Sarah Connor", "hr": 120, "temp": 39.5, "status": "ALERT"}
]

print("Starting Supabase Seeding...")

for p in patients_to_seed:
    try:
        # 1. Sign them up (Creates Auth User)
        auth_res = supabase.auth.sign_up({"email": p["email"], "password": "password123"})
        
        if not auth_res.user:
            print(f"Skipping {p['name']}, user might already exist.")
            continue
            
        user_id = auth_res.user.id
        
        # 2. Create Profile
        supabase.table("profiles").insert({"id": user_id, "name": p["name"], "role": "patient"}).execute()
        
        # 3. Create historical Vitals (Morning, Afternoon, Now)
        now = datetime.utcnow()
        vitals_data = [
            {"user_id": user_id, "heart_rate": p["hr"] - 5, "temperature": p["temp"] - 0.2, "status": "NORMAL", "created_at": (now - timedelta(hours=4)).isoformat()},
            {"user_id": user_id, "heart_rate": p["hr"] - 2, "temperature": p["temp"] - 0.1, "status": p["status"], "created_at": (now - timedelta(hours=2)).isoformat()},
            {"user_id": user_id, "heart_rate": p["hr"], "temperature": p["temp"], "status": p["status"], "created_at": now.isoformat()}
        ]
        supabase.table("vitals").insert(vitals_data).execute()
        
        print(f"✅ Successfully seeded {p['name']}")
        
    except Exception as e:
        print(f"Error seeding {p['name']}: {e}")

print("Seeding Complete! You can now check the Admin Dashboard.")