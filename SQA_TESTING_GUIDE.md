# SQA Testing Guide: Smart IoT Health Monitoring System

## Purpose

This guide explains how the updated backend tests prove that the new least-privilege, zero-trust Supabase architecture works correctly. These tests verify validation constraints, data integrity rules, role-based security, and edge-token gateway verification without executing live, destructive queries against your production Supabase tables.

---

# API Documentation Portal

FastAPI automatically generates interactive Swagger API documentation at:

```text
http://127.0.0.1:8000/docs
```

This serves as an invaluable tool for developers and examiners to inspect:

* Unified endpoints and parameter schemas.
* Pydantic-enforced boundary validation constraints.
* Header requirements (including the new `X-Device-Token` gateway security field).
* Live sandbox requests via the "Try it out" feature.

---

# How To Run Automated Tests

To run the test suite, navigate to your backend directory, activate your python virtual environment, and run the pytest runner.

## Using PowerShell (Windows)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -v
```

---

## Using Git Bash / macOS / Linux

```bash
cd backend
source .venv/Scripts/activate
python -m pytest -v
```

---

## Using Windows Command Prompt (CMD)

```cmd
cd backend
.venv\Scripts\activate.bat
python -m pytest -v
```

---

# Why Tests Do Not Touch Supabase (Mock Isolation)

The test configuration injects:

```python
os.environ["SKIP_SUPABASE_INIT"] = "1"
```

This intercepts active network handshakes to Supabase on import. The test suite dynamically overrides `main.supabase_client` with an in-memory `FakeSupabase` instance. This guarantees that test runs are:

* Isolated: Completely safe to run without database pollution.
* Fast & Deterministic: No latency or offline API failures.
* Repeatable: Restarts with an empty simulated state database every run.

---

# What the Tests Prove (SQA Verification Metrics)

## 1. Edge Ingestion Security (`X-Device-Token` Gate)

### The Test

Attempts to post vitals without the `X-Device-Token` header, or with an invalid token.

### Expected Result

```text
401 Unauthorized
```

### SQA Value

Proves unauthorized external clients cannot inject random telemetry or pollute patient histories.

---

## 2. Physical Data Boundaries (Pydantic Filtering)

### The Test

Sends impossible boundaries such as a negative heart rate (`-1`) or extreme values (`500`).

### Expected Result

```text
422 Unprocessable Entity
```

validation error.

### SQA Value

Ensures corrupt hardware signals or malicious payload injections are safely rejected at the API edge.

---

## 3. Least-Privilege Database Mutations (`returning="minimal"`)

### The Test

Verifies successful ingestion calls use the `.insert(db_data, returning="minimal")` instruction.

### Expected Result

Write succeeds securely under public anonymous permissions.

### SQA Value

Verifies that write operations do not attempt to read back database rows, successfully bypassing the classic Supabase `42501` Row-Level Security violation.

---

## 4. Admin Roster Access Controls (RBAC Verification)

### The Test

Attempts to fetch patient list summaries from `/api/admin/all-users-status` without an authorization token.

### Expected Result

```text
401 Unauthorized
```

response.

### SQA Value

Proves patient administrative dashboards are structurally sealed from the public internet.

---

# Manual End-to-End Handshake Verification

To manually trace a secure telemetry write:

## Ensure your backend server is active

```bash
python -m uvicorn main:app --reload
```

---

## Navigate to your browser sandbox

```text
http://127.0.0.1:8000/docs
```

---

## Select `POST /api/vitals`

Click `"Try it out"`, insert your secure token into the header input field:

```text
Header name: X-Device-Token
Value: THE DEVICE TOKEN YOU SET 
```

---

## Provide a test JSON payload matching a valid patient UUID

```json
{
  "user_uid": "YOUR UID HERE",
  "heart_rate": 78.0,
  "temperature": 36.8
}
```

---

## Execute the Request

Click Execute and verify a `200 OK` return code showing your ingestion was accepted and written securely!
