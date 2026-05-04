# Backend & IoT Data Pipeline Implementation Plan

This document outlines the step-by-step progression for building out the backend database architecture and ESP32 IoT connectivity. Each phase is deliberately scoped to provide you with a concrete deliverable and an immediate **Progress Report snippet** tailored for your Software Quality Testing sprint.

## User Review Required

> [!IMPORTANT]
> Please review the sequential phases below to ensure they align directly with your expected progress reports for ICS 2313. Once approved, we will begin executing Phase 1!

## Proposed Phases & SQA Deliverables

### Phase 1: Database Migration to NoSQL (Firebase Schema Design)
- **Action Item**: Translate the relational models (`Clients` and `Vitals_Log`) outlined in your provided design document into a NoSQL JSON structure optimized for Firebase Realtime Database.
- **What We Code**: Initializing the correct data structure and establishing rigorous Firebase Security Rules.
- **Progress Report (SQA Focus)**: *Security Testing & Schema Validation*. Implementing and verifying security constraints to enforce strict data typing on incoming payloads (checking that `heart_rate` is numerical format) preventing unauthorized access to the `vitals` endpoint.

### Phase 2: Hardware Network Resilience (ESP32 Wi-Fi module)
- **Action Item**: Build the foundation of the ESP32 firmware using C++ to successfully connect to local networks dynamically.
- **What We Code**: ESP32 `setup()` logic utilizing `<WiFi.h>` complete with intelligent reconnection routines.
- **Progress Report (SQA Focus)**: *Fault Tolerance Testing*. Validating the hardware logic by simulating network latency and deliberate Wi-Fi drops, ensuring the system can recover gracefully without triggering system crashes.

### Phase 3: Firebase Authentication Pipeline & Data Transmission
- **Action Item**: Wire the ESP32 directly to the backend. We authenticate securely via your Firebase Web API key and push correctly formatted logs natively from the microcontroller.
- **What We Code**: Integrating `Firebase_ESP_Client` to execute authenticated database writes to the exact node your frontend React `onValue` hooks are listening to.
- **Progress Report (SQA Focus)**: *Data Protocol & Integration Validation*. Tracking API reliability by ensuring hardware payload requests are executed cleanly, minimizing data loss during IoT-to-Cloud telemetry transmission.

### Phase 4: Edge Processing & Alerting Logic Validation
- **Action Item**: Adding the physiological threshold conditions (BPM and Temperature validation) directly inside the ESP32, computing the correct `status_flag` ('NORMAL' or 'ALERT') before pushing to the cloud and updating the hardware's local OLED display.
- **What We Code**: C++ conditional functions parsing raw measurements against configurable limits.
- **Progress Report (SQA Focus)**: *Boundary Value Analysis*. Conducting rigorous unit tests around precise hardware boundary conditions (e.g., verifying states precisely at 37.5°C vs. 37.6°C, or < 60 BPM) to confirm alerting states fire flawlessly without false positives.

### Phase 5: The "Full-Bridge" Testing (Sensors to Dashboard)
- **Action Item**: Completing the loop! Combining our live database writes with your frontend dashboard rendering logic. 
- **What We Code**: Final cleanups of your React Dashboard connection to ensure live metrics populate instantly into charts natively.
- **Progress Report (SQA Focus)**: *End-to-End (E2E) System Testing*. Providing holistic system validation by tracing physiological data endpoints starting from device capture straight to analytical visualization in the browser. 

## Open Questions

> [!WARNING]
> Before we write the actual ESP32 code:
> 1. Will you be using the **Arduino IDE** or **PlatformIO (VS Code)** to manage and flash your ESP32 code?
> 2. Should we start by writing a firmware script that generates **synthetic/mock sensor data** first? (This allows us to test the backend connectivity before wiring the physical medical sensors on breadboards).

## Verification Plan

### Automated Tests
- Writing deterministic Firebase Security Rule unit tests to ensure that malformed data structures are explicitly rejected by the backend servers.

### Manual Verification
- Using the ESP32 Serial Monitor to visually verify Wi-Fi status.
- Confirming Firebase Realtime Data UI flashes upon receiving hardware telemetry.
- Observing the local React dashboard update synchronously when the hardware publishes a new payload. 
