import requests
import time
import random
import sys
from typing import Optional

# The URL of your local FastAPI backend that we are testing
FASTAPI_URL = "http://127.0.0.1:8000/api/vitals"
TEST_USER_UID = "jrxcww8HuJTxOK1a64PvMjlu29q1"

def simulate_sensor(client_id: int, user_uid: Optional[str] = None):
    """
    Simulates the ESP32 generating physiological data and sending it
    to the FastAPI endpoint over local Wi-Fi.
    """
    print(f"--- Starting Mock Sensor for Client ID: {client_id} ---")
    print("This script simulates the ESP32 sending HTTP POST requests to your FastAPI backend.\n")
    
    try:
        while True:
            # Generate random baseline values
            heart_rate = round(random.uniform(60, 105), 1)   # Normal: 60-100
            temperature = round(random.uniform(36.1, 38.0), 1) # Normal: < 37.5
            
            payload = {
                "client_id": client_id,
                "user_uid": user_uid,
                "heart_rate": heart_rate,
                "temperature": temperature
            }
            
            print(f"> Sending Telemetry: BPM={heart_rate}, Temp={temperature}°C")
            
            # Send the mocked physiological data
            start_time = time.time()
            response = requests.post(FASTAPI_URL, json=payload)
            latency = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                print(f"  [SUCCESS] {response.json()} (Latency: {latency:.2f}ms)\n")
            else:
                print(f"  [ERROR] Backend rejected data. Status: {response.status_code}, Msg: {response.text}\n")
            
            # Wait 3 seconds before next "sensor reading"
            time.sleep(3)
            
    except KeyboardInterrupt:
        print("\nHalting mock sensor execution.")
        sys.exit(0)
    except requests.exceptions.ConnectionError:
        print(f"\n[FATAL] Unable to connect to backend at {FASTAPI_URL}.")
        print("Please ensure your FastAPI server is running ('uvicorn main:app --reload').")
        sys.exit(1)

if __name__ == "__main__":
    test_client_id = 1
    simulate_sensor(test_client_id, TEST_USER_UID)
