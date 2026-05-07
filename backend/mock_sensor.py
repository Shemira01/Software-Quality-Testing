import requests
import time
import random

API_URL = "http://127.0.0.1:8000/api/vitals"

# ---> PASTE SHEM MUGO'S SUPABASE UUID HERE <---
SHEM_UUID = "a2dbc06a-08f0-4dd7-98ee-87c66904d454" 

def simulate_shem_vitals():
    print(f"Starting Live Sensor Stream for Shem Mugo...")
    
    # Starting baseline vitals
    hr = 75.0
    temp = 36.8

    try:
        while True:
            # Add slight random fluctuations to simulate human vitals
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

            try:
                response = requests.post(API_URL, json=payload)
                if response.status_code == 200:
                    print(f"[OK] Sent Vitals -> HR: {payload['heart_rate']} BPM, Temp: {payload['temperature']}°C")
                else:
                    print(f"[ERROR] Backend rejected data: {response.status_code} - {response.text}")
            except requests.exceptions.ConnectionError:
                print("Failed to connect. Is your FastAPI server running?")

            time.sleep(3) # Wait 3 seconds before the next reading

    except KeyboardInterrupt:
        print("\nSimulation stopped.")

if __name__ == "__main__":
    simulate_shem_vitals()