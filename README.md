# Smart IoT Health Monitoring System 🏥⚡

A professional, full-stack IoT telemetry dashboard built with a **FastAPI** backend, **React** frontend, and a highly secure **Supabase (PostgreSQL)** database architecture. 

This system aggregates high-frequency telemetry from hardware devices (or simulated mock sensors), buffers normal readings to save database space, instantly overrides the buffer to log critical medical alerts, and renders everything onto a role-based clinical dashboard with official PDF export capabilities.

---

## 🛠 Tech Stack
* **Frontend:** React (Vite), Recharts, jsPDF (Bulletproof Clinical Printouts)
* **Backend:** FastAPI, Pydantic, Python 
* **Database:** Supabase (PostgreSQL) with Row-Level Security (RLS)
* **Simulation:** Python Mock Sensor (replacing the physical ESP32 for local testing)

---

## 🔒 Configuration & Environment Variables

Before running the application, you must configure your secure environment variables. Your lecturer or team lead will provide you with the exact credentials.

### 1. The Backend Configuration
Navigate to the `backend/` folder and create a file named `.env`:
```env
SUPABASE_URL="your-supabase-project-url"
SUPABASE_KEY="your-supabase-anon-key"
```
*Note: Ensure you also place the provided `serviceAccountKey.json` inside the `backend/` directory if required by your specific grading/deployment constraints.*

### 2. The Frontend Configuration
Navigate to the `frontend/` folder and create a file named `.env`:
```env
VITE_SUPABASE_URL="your-supabase-project-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

---

## 🚀 How to Run the Project Locally

You will need to open **three separate terminal windows** to run the complete ecosystem.

### Step 1: Start the FastAPI Backend
Open your first terminal and navigate to the backend directory:
```bash
cd backend
```
Create and activate your Python virtual environment:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```
Install the dependencies:
```bash
pip install -r requirements.txt
```
*(If on Kali Linux/Debian and prompted about externally managed environments, use: `pip install -r requirements.txt --break-system-packages`)*

Start the server:
```bash
uvicorn main:app --reload
```
*The backend is now live at `http://127.0.0.1:8000`. You can view the interactive Swagger API documentation at `http://127.0.0.1:8000/docs`.*

---

### Step 2: Start the Live IoT Mock Sensor
*Before running this step, open `backend/mock_sensor.py` and change the `USER_UUID` variable to match the actual Supabase User ID of the patient you want to stream data to.*

Open a **second terminal**, navigate to the backend, and activate your virtual environment:
```bash
cd backend
source venv/bin/activate  # Or Windows equivalent
```
Run the sensor stream:
```bash
python mock_sensor.py
```
*You will see the console logging successful HTTP `POST` requests, simulating live hardware telemetry sending data to the backend.*

---

### Step 3: Start the React Frontend
Open a **third terminal** and navigate to the frontend directory:
```bash
cd frontend
```
Install Node modules and start the Vite development server:
```bash
npm install
npm run dev
```
*Click the `http://localhost:5173/` link generated in your terminal to open the web application in your browser.*

---

## ✨ Key Features & Architectural Highlights

1. **Intelligent Data Aggregation:** The backend buffers telemetry in memory. Normal readings are averaged and saved every 60 seconds to prevent database bloat, while critical `ALERTS` bypass the buffer and are written to the database with exact, immediate timestamps.
2. **Role-Based Access Control (RBAC):** Users default to a `'patient'` role and can only view their own data. Users assigned an `'admin'` role in the database gain access to a secure VIP Admin Gateway, featuring a modern grid UI of all patients and their live statuses.
3. **Bulletproof PDF Export:** Patients and Doctors can click "Download Official PDF" to generate a highly structured, vector-based clinical log using `jsPDF` and `jspdf-autotable`.
4. **Timezone Normalization:** Raw UTC timestamps from PostgreSQL are dynamically converted by the React client to match the exact local timezone of the viewing doctor.
5. **State Persistence:** Integrated browser `localStorage` with the Supabase authentication state prevents the React application from defaulting to the login screen upon a page refresh.
