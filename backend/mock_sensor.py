import requests
import time
import random

API_URL = "http://127.0.0.1:8000/api/vitals"

# Patient UUID mapping
SHEM_UUID = "d0771902-9ce3-4533-9902-a6e538ce0ae5" 

# Secure Device Token (must match the token in backend/.env)
DEVICE_SECRET_TOKEN = "device_secure_token_juja_2026"

def simulate_shem_vitals():
    print(f"Starting Secure Live Sensor Stream for Shem Mugo...")
    
    # Baseline vitals setup
    hr = 75.0
    temp = 36.8

    try:
        while True:
            # Generate minor random fluctuations
            hr += random.uniform(-2, 2)
            temp += random.uniform(-0.1, 0.1)

            # Keep values realistic
            hr = max(60.0, min(hr, 100.0))
            temp = max(36.0, min(temp, 38.0))

            payload = {
                "user_uid": SHEM_UUID,
                "heart_rate": round(hr, 1),
                "temperature": round(temp, 1)
            }

            # Map the secure hardware token in the HTTP Header
            headers = {
                "X-Device-Token": DEVICE_SECRET_TOKEN,
                "Content-Type": "application/json"
            }

            try:
                response = requests.post(API_URL, json=payload, headers=headers)
                if response.status_code == 200:
                    print(f"[OK] Sent Vitals -> HR: {payload['heart_rate']} BPM, Temp: {payload['temperature']}°C")
                elif response.status_code == 401:
                    print(f"❌ [UNAUTHORIZED] Ingestion rejected! Provided Device Token is invalid.")
                else:
                    print(f"[ERROR] Ingestion rejected: {response.status_code} - {response.text}")
            except requests.exceptions.ConnectionError:
                print("Connection failed. Is your FastAPI server running on port 8000?")

            time.sleep(3)

    except KeyboardInterrupt:
        print("\nSimulation stopped.")

if __name__ == "__main__":
    simulate_shem_vitals()