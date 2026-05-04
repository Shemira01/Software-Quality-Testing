# Smart IoT Health Monitoring

This project connects an ESP32 vitals simulator to a FastAPI backend, stores the latest readings in Firebase Realtime Database, and preserves historical readings for the React Reports charts.

## What The System Does

The ESP32 firmware in `Hardware/stqa.ino` sends simulated temperature and heart-rate readings to FastAPI over HTTP. The backend validates the payload, classifies the reading as `NORMAL` or `ALERT`, writes the latest reading to `users/{uid}/vitals`, and appends chart-ready history under `users/{uid}/history`. The React frontend listens to those Firebase paths in real time.

`backend/mock_sensor.py` is an optional laptop-only simulator. It sends the same payload shape as the ESP32, so the backend can be tested without hardware.

## Project Structure

- `Hardware/stqa.ino` - ESP32 firmware simulation client.
- `Hardware/secrets.h.example` - safe template for WiFi/IP configuration.
- `backend/main.py` - FastAPI API, validation logic, Firebase writes, history aggregation.
- `backend/mock_sensor.py` - optional software sensor client for quick testing.
- `backend/tests/` - pytest checks for alert logic and invalid payload rejection.
- `frontend/` - React dashboard and reports UI.

## Secure Configuration

Create `Hardware/secrets.h` from `Hardware/secrets.h.example`:

```cpp
#define SECRET_SSID "your-wifi-name"
#define SECRET_PASS "your-wifi-password"
#define SECRET_IP "your-laptop-ip"
```

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
DATABASE_SECRET=replace-with-your-database-secret
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
```

Place your Firebase Admin SDK key at `backend/serviceAccountKey.json`.

Private files are ignored by Git:

- `Hardware/secrets.h`
- `backend/.env`
- `backend/serviceAccountKey.json`

## Backend Setup

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open these checks in the browser:

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/docs
```

Use `--host 0.0.0.0` so the ESP32 can reach the backend through the laptop IP.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

The frontend reads:

- Dashboard: `users/{uid}/vitals`
- Reports: `users/{uid}/history`

Sign in with the same Firebase user UID used in `stqa.ino` or `mock_sensor.py`.

## Firmware Setup

1. Fill in `Hardware/secrets.h`.
2. Set `userUID` in `Hardware/stqa.ino` to the Firebase Auth UID of the test user.
3. Start the backend using `--host 0.0.0.0`.
4. Upload the sketch and open Serial Monitor at `115200` baud.

Expected Serial Monitor success:

```text
POST http://<SECRET_IP>:8000/api/vitals -> 200
```

## Simulation States

- State `0` - Normal vitals: temperature around 36.4-37.1 C and heart rate 65-85 BPM.
- State `1` - Fever: high temperature around 38.5-39.5 C and elevated heart rate.
- State `2` - Tachycardia: normal temperature with high heart rate around 120-150 BPM.
- State `3` - Critical emergency: very high fever and dangerous heart rate.

The state changes every 30 seconds to prove the backend and UI respond to different medical scenarios.

## Test Everything

Backend health:

```powershell
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend unit and boundary tests:

```powershell
cd backend
pytest
```

Laptop-only Firebase integration test:

```powershell
cd backend
python mock_sensor.py
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Manual Firebase verification:

1. Run either `mock_sensor.py` or the ESP32 sketch.
2. Open Firebase Console.
3. Confirm `users/{uid}/vitals` updates with the latest reading.
4. Confirm `users/{uid}/history/daily` grows over time.
5. Open the frontend Reports tab and confirm the chart shows multiple points.

## SQA Measures Implemented

- Architecture decoupling: ESP32 talks to FastAPI, not directly to Firebase.
- Secret isolation: WiFi credentials and Firebase credentials live outside tracked source files.
- Boundary validation: impossible vitals such as heart rate `-1` or `500` are rejected with HTTP `422`.
- Alert classification: fever, tachycardia, and bradycardia are classified as `ALERT`.
- Data persistence: backend writes both latest vitals and historical chart data.
- Hardware abstraction: ESP32 and `mock_sensor.py` exercise the same backend endpoint.
- UI synchronization: React listens to Firebase paths written by the backend.

## Group Communication Note

The database secrets have been moved out of the hardware code and into a secure backend environment. This protects credentials and enables historical charts in the Reports section because the backend now creates persistent `history` entries for every reading.
