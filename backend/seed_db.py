import os
import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime

# 1. Load Environment Variables exactly like main.py
def load_dotenv(dotenv_path):
    if os.path.isfile(dotenv_path):
        with open(dotenv_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, val = line.strip().split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"\'')

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# 2. Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {"databaseURL": os.environ.get("DATABASE_URL")})

print("Seeding database with presentation data...")

# 3. Define Mock Patients
patients = {
    "patient_001": {
        "profile": {"name": "Alice Johnson", "age": 32},
        "vitals": {"heartRate": 72, "temperature": 36.8, "status": "NORMAL", "timestamp": datetime.utcnow().isoformat() + "Z"},
        "history": {
            "daily": [
                {"time": "08:00", "heartRate": 70, "temp": 36.7},
                {"time": "12:00", "heartRate": 75, "temp": 36.9},
                {"time": "16:00", "heartRate": 72, "temp": 36.8}
            ],
            "weekly": [{"day": "2023-10-01", "avgHR": 71, "avgTemp": 36.8, "count": 3}],
            "alerts": []
        }
    },
    "patient_002": {
        "profile": {"name": "Marcus Smith", "age": 45},
        "vitals": {"heartRate": 105, "temperature": 38.2, "status": "ALERT", "timestamp": datetime.utcnow().isoformat() + "Z"},
        "history": {
            "daily": [
                {"time": "08:00", "heartRate": 85, "temp": 37.5},
                {"time": "12:00", "heartRate": 95, "temp": 37.9},
                {"time": "16:00", "heartRate": 105, "temp": 38.2}
            ],
            "weekly": [{"day": "2023-10-01", "avgHR": 90, "avgTemp": 37.6, "count": 3}],
            "alerts": [
                {"date": "2023-10-01", "time": "16:00", "message": "High Temperature Alert: 38.2°C"},
                {"date": "2023-10-01", "time": "16:00", "message": "Elevated Heart Rate: 105 BPM"}
            ]
        }
    },
    "patient_003": {
        "profile": {"name": "Sarah Connor", "age": 28},
        "vitals": {"heartRate": 120, "temperature": 39.5, "status": "ALERT", "timestamp": datetime.utcnow().isoformat() + "Z"},
        "history": {
            "daily": [
                {"time": "10:00", "heartRate": 110, "temp": 38.8},
                {"time": "14:00", "heartRate": 115, "temp": 39.1},
                {"time": "18:00", "heartRate": 120, "temp": 39.5}
            ],
            "weekly": [{"day": "2023-10-01", "avgHR": 115, "avgTemp": 39.1, "count": 3}],
            "alerts": [
                {"date": "2023-10-01", "time": "18:00", "message": "CRITICAL: Severe Fever (39.5°C) & Tachycardia"}
            ]
        }
    }
}

# 4. Push to Firebase
db.reference("users").set(patients)
print("✅ Database successfully populated! You can now check the Admin Dashboard.")