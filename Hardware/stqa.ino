#include <WiFi.h>
#include <FirebaseESP32.h>

// 1. WiFi & Firebase Credentials
#define WIFI_SSID "LEE 8843"
#define WIFI_PASSWORD "Bankaiii"
#define DATABASE_URL "https://healthtracker-5678a-default-rtdb.europe-west1.firebasedatabase.app"
#define DATABASE_SECRET "4fGOWNv8llLfgaTP921A1cpmNBz0Co8tsnDVEC1f"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Initial Mock Values
float currentTemp = 36.6;
int currentBPM = 75;

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nConnected!");
  
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

// 1. Replace this with your actual UID from the Firebase Auth console
String userUID = "yOcs5uJVZmNCiBod1zrHrZgZkv63"; 

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

  if (Firebase.ready()) {
    String path = "users/" + userUID + "/vitals/";
    Firebase.setFloat(fbdo, path + "temperature", currentTemp);
    Firebase.setInt(fbdo, path + "heartRate", currentBPM);
    
    // Logic check: This should match your DashboardUI logic
    bool alarming = (currentTemp > 37.5 || currentBPM > 100 || currentBPM < 60);
    Firebase.setString(fbdo, path + "status", alarming ? "ALARMING" : "NATURAL");
    
    Serial.printf("[%d] Sent: %.1f C, %d BPM (%s)\n", 
                  simulationState, currentTemp, currentBPM, alarming ? "ALARM" : "OK");
  }
  delay(2000); 
}

