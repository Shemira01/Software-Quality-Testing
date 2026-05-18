# SQA Testing Guide

## Purpose

This guide explains how the backend tests prove the current Supabase architecture works correctly. The tests are designed for SQA evidence: they verify validation, data integrity, downsampling, immediate alert logging, and API discoverability without writing to the live Supabase database.

## API Documentation URL

FastAPI automatically exposes interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

This is not a frontend page. It is a developer and examiner tool generated from `backend/main.py`.

It shows:

- All available backend routes.
- Required request JSON schemas.
- Validation rules from Pydantic.
- Response examples.
- A `Try it out` button for manual API testing.

Important routes:

- `GET /` - confirms backend is running and links to useful routes.
- `GET /api/health` - simple backend health check.
- `POST /api/vitals` - receives ESP32 or mock sensor vitals.
- `GET /api/admin/all-users-status` - returns current patient status summaries for the admin dashboard.
- `GET /api/admin/user/{uid}` - returns one patient's profile and historical vitals for charts and PDF reports.

## How To Run Automated Tests

From the backend folder:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

In Git Bash:

```bash
cd backend
source .venv/Scripts/activate
python -m pytest
```

## Why Tests Do Not Touch Supabase

The tests set:

```python
os.environ["SKIP_SUPABASE_INIT"] = "1"
```

This prevents the real Supabase client from connecting during test import. The tests replace `main.supabase` with a fake in-memory client. This makes the test run safe, fast, and repeatable.

## What The Tests Prove

### 1. Boundary Validation

The tests send invalid heart rates such as `-1` and `500` to `/api/vitals`.

Expected result:

```text
HTTP 422
```

SQA meaning: impossible clinical data is rejected before it reaches Supabase.

### 2. Clinical Status Classification

The tests verify:

- Normal vitals return `NORMAL`.
- Heart rate above `100` returns `ALERT`.
- Heart rate below `60` returns `ALERT`.
- Temperature above `37.5` returns `ALERT`.

SQA meaning: clinical boundary logic is deterministic and testable.

### 3. Live Dashboard Updates

Normal readings update the `profiles` table fields:

- `current_hr`
- `current_temp`
- `current_status`
- `last_active`

SQA meaning: the live dashboard receives current telemetry without waiting for historical aggregation.

### 4. Aggregation And Downsampling

Normal readings are held in `aggregation_buffer`. After the configured interval, the backend writes one averaged row into `vitals`.

SQA meaning: the system avoids database bloat while preserving useful historical trends.

### 5. High-Priority Alert Override

Alert readings bypass the aggregation buffer and immediately write an exact reading into the `vitals` table.

SQA meaning: emergency events are not delayed by optimization logic.

### 6. Alert Throttling

Repeated alerts inside 60 seconds are throttled to avoid spamming the database.

SQA meaning: the system balances emergency logging with operational stability.

## Manual End-To-End Test

1. Start backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

2. Open:

```text
http://127.0.0.1:8000/docs
```

3. Use `POST /api/vitals` with:

```json
{
  "user_uid": "your-supabase-user-id",
  "heart_rate": 78,
  "temperature": 36.8
}
```

4. Confirm the user's `profiles` row updates.

5. Send alert data:

```json
{
  "user_uid": "your-supabase-user-id",
  "heart_rate": 130,
  "temperature": 38.5
}
```

6. Confirm an `ALERT` row appears in the `vitals` table immediately.

7. Start frontend and verify the dashboard and reports show the same data.
