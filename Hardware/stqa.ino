#include "secrets.h"
#include <WiFi.h>
#include <HTTPClient.h>

// 1. WiFi credentials and backend endpoint
#define WIFI_SSID SECRET_SSID
#define WIFI_PASSWORD SECRET_PASS
#define BACKEND_URL "http://" SECRET_IP ":8000/api/vitals"

// Initial Mock Values
float currentTemp = 36.6;
int currentBPM = 75;

// 2. Replace this with the signed-in user's UID from Firebase Auth.
String userUID = "jrxcww8HuJTxOK1a64PvMjlu29q1";
int clientId = 1;

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nConnected!");
}

// Add this at the top of your code
int simulationState = 0; 
unsigned long lastStateChange = 0;

void loop() {
  // Switch medical scenarios every 30 seconds for testing
  if (millis() - lastStateChange > 30000) {
    simulationState = (simulationState + 1) % 4; // Cycles 0, 1, 2, 3
    lastStateChange = millis();
    Serial.print("--- SWITCHING TO SCENARIO: ");
    Serial.println(simulationState);
  }

  switch (simulationState) {
    case 0: // NORMAL STATE
      currentTemp = random(364, 371) / 10.0; // 36.4 - 37.1
      currentBPM = random(65, 85);           // 65 - 85 BPM
      break;

    case 1: // FEVER (High Temp)
      currentTemp = random(385, 395) / 10.0; // 38.5 - 39.5
      currentBPM = random(90, 110);          // Elevated HR
      break;

    case 2: // TACHYCARDIA (High Heart Rate)
      currentTemp = 36.8;                    // Normal Temp
      currentBPM = random(120, 150);         // High HR
      break;

    case 3: // CRITICAL / EMERGENCY
      currentTemp = random(395, 405) / 10.0; // Very high fever
      currentBPM = random(140, 170);         // Dangerous HR
      break;
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"client_id\":" + String(clientId) + ",";
    payload += "\"user_uid\":\"" + userUID + "\",";
    payload += "\"heart_rate\":" + String(currentBPM) + ",";
    payload += "\"temperature\":" + String(currentTemp, 1);
    payload += "}";

    int responseCode = http.POST(payload);

    Serial.printf("[%d] POST %s -> %d | %.1f C, %d BPM\n",
                  simulationState, BACKEND_URL, responseCode, currentTemp, currentBPM);

    if (responseCode > 0) {
      Serial.println(http.getString());
    } else {
      Serial.printf("HTTP error: %s\n", http.errorToString(responseCode).c_str());
    }

    http.end();
  } else {
    Serial.println("Wi-Fi disconnected; reconnecting...");
    WiFi.reconnect();
  }
  delay(2000); 
}

