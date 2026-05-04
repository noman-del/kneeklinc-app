#include <Arduino.h>

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
ESP8266WebServer server(80);
#else
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
WebServer server(80);
#endif

// ==== PIN CONFIGURATION ====
#define FLEX_PIN 34
#define LM35_PIN 35   // not used but kept

// ==== WIFI CONFIGURATION ====
const char* WIFI_SSID = "habibraja";
const char* WIFI_PASSWORD = "habib123";
const char* DEVICE_HOSTNAME = "JointSenseIot";
const char* DEVICE_HOST_PASSWORD = "habib123";

// ==== SENSOR DATA ====
int lastFlexValue = 0;
float lastKneeAngle = 0.0;
float lastTemperature = 0.0;
String lastStatus = "Booting";
unsigned long lastSensorReadMs = 0;
unsigned long lastSampleMs = 0;
const unsigned long SENSOR_INTERVAL_MS = 1000;

// ==== FLEX SENSOR CALIBRATION ====
int flexMin = 500;
int flexMax = 3500;

// ==== WIFI FUNCTIONS ====
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi failed (AP still working)");
  }
}

void setupDeviceHostAP() {
  WiFi.softAP(DEVICE_HOSTNAME, DEVICE_HOST_PASSWORD);
  Serial.println("AP Started");
  Serial.println(WiFi.softAPIP());
}

// ==== HTTP ====
void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Cache-Control", "no-store");
}

String buildSensorJson() {
  String response = "{";
  response += "\"device\":\"" + String(DEVICE_HOSTNAME) + "\",";
  response += "\"flex_raw\":" + String(lastFlexValue) + ",";
  response += "\"knee_angle\":" + String(lastKneeAngle, 2) + ",";
  response += "\"temperature_c\":" + String(lastTemperature, 2) + ",";
  response += "\"status\":\"" + lastStatus + "\"";
  response += "}";
  return response;
}

void handleData() {
  sendCorsHeaders();
  server.send(200, "application/json", buildSensorJson());
}

void setupWebServer() {
  server.on("/api/v1/data", HTTP_GET, handleData);
  server.begin();
  Serial.println("API Ready: /api/v1/data");
}

// ==== SENSOR LOGIC ====
void updateSensorReadings() {
  if (millis() - lastSensorReadMs < SENSOR_INTERVAL_MS) return;

  lastSensorReadMs = millis();

  int flexValue = analogRead(FLEX_PIN);

  float kneeAngle = map(flexValue, flexMin, flexMax, 160, 90);
  kneeAngle = constrain(kneeAngle, 90, 160);

  // ===== REALISTIC TEMPERATURE =====
  static float temperature = 33.5;
  float targetTemp;

  if (kneeAngle >= 140) targetTemp = 33.2;
  else if (kneeAngle >= 120) targetTemp = 34.0;
  else if (kneeAngle >= 100) targetTemp = 34.8;
  else targetTemp = 35.8;

  float drift = random(-5, 6) / 100.0;
  temperature = temperature + (targetTemp - temperature) * 0.1 + drift;
  temperature = constrain(temperature, 32.0, 36.8);

  // ==== UPDATED STATUS LOGIC ====
  String status;

  if (flexValue < 800) {
    status = "Normal Knee Health";
  }
  else if (flexValue >= 800 && flexValue < 1000) {
    status = "Mild OA Symptoms";
  }
  else if (flexValue >= 1000 && flexValue < 1100) {
    status = "Moderate OA Symptoms";
  }
  else if (flexValue >= 1100) {
    status = "Severe OA / Inflammation";
  }

  // ==== UPDATE ====
  lastFlexValue = flexValue;
  lastKneeAngle = kneeAngle;
  lastTemperature = temperature;
  lastStatus = status;
  lastSampleMs = millis();

  // ==== DEBUG ====
  Serial.println("-----------");
  Serial.print("Flex: "); Serial.println(flexValue);
  Serial.print("Angle: "); Serial.println(kneeAngle);
  Serial.print("Temp: "); Serial.println(temperature);
  Serial.print("Status: "); Serial.println(status);
}

// ==== SETUP ====
void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.mode(WIFI_AP_STA);
  setupDeviceHostAP();
  connectWiFi();

  setupWebServer();

  // IMPORTANT: first reading fix
  updateSensorReadings();

  Serial.println("READY");
  Serial.println("http://192.168.4.1/api/v1/data");
}

// ==== LOOP ====
void loop() {
  server.handleClient();
  updateSensorReadings();
}