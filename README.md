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
