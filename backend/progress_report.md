# Backend Progress Report

**Project**: Smart IoT Health Monitoring System
**Phase Completed**: Phase 1 & 2 (FastAPI Backend and Network Integration)
**Report Focus**: Data connectivity validation and schema implementation.

## Overview
As the backend integration team, we have successfully decoupled the backend pipeline from direct Firebase connection dependencies to introduce a structured API layer. This ensures that sensor telemetry data and database rules can be verified before connecting the physical IoT sensors.

## What We Have Done

1. **FastAPI Server Initialization (`backend/main.py`)** 
   - We prioritized a Python backend to accept data directly from the ESP32. 
   - A POST endpoint (`/api/vitals`) is implemented mapping exactly to the schema fields `client_id`, `heart_rate`, and `temperature`.
   - **SQA Validation Strategy Implemented**: We injected edge-processing logic directly into the backend. If the payload indicates boundaries crossed (Heart rate > 100 or Temp > 37.5), the API forcefully flags it as `status_flag: "ALERT"`.

2. **Firebase Synchronous Pipeline**
   - We configured the backend to connect natively. Upon data validation, it immediately pushes the payload to `users/{client_id}/vitals.json` inside your Realtime Database. 
   - This directly bridges the gap from the hardware to the React dashboard (`onValue` listeners).

3. **Software Defect Testing Mechanism (`backend/mock_sensor.py`)**
   - Since the physical ESP32 and sensors are not wired yet, we proactively built a Python script (`mock_sensor.py`) representing the hardware node. 
   - It fires simulated randomized telemetry (HTTP POST requests) every 3 seconds to our FastAPI server and logs connection latency.
   - **SQA Validation Strategy Implemented**: We can analyze exactly how our backend handles continuous streams (Network Load Testing) and ensure our alerting systems accurately register database updates.

## IoT Handoff Readiness

> [!TIP]
> **Instructions for the IoT Team**
>
> The IoT team (working with the ESP32 via VS Code / PlatformIO) is **ready to take charge immediately**.
> 
> They no longer need to figure out complex Google Firebase Certificates or ESP Client authentication on the microcontroller. Here is their scope of work:
> 
> 1. Wire the **Pulse Sensor** and the **DS18B20 Temperature Sensor** to the ESP32 on a breadboard.
> 2. Connect the ESP32 to the local Wi-Fi router (e.g., using `#include <WiFi.h>`).
> 3. Instead of hitting Firebase natively, simply make an **HTTP POST** request to the IPv4 address of the computer running this FastAPI backend. 
> 4. Ensure their JSON structure perfectly matches our established schema:
> ```json
> {
>   "client_id": 1,
>   "heart_rate": 84.5,
>   "temperature": 36.6
> }
> ```

## Next Steps for Next Sprint
1. Turn on the FastAPI backend using `uvicorn main:app --reload`.
2. Run `mock_sensor.py` to trigger our first wave of successful simulated database entries.
3. Observe real-time changes appearing on the front-end React dashboard to conclude purely-software end-to-end integration validation.
