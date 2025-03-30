#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

// Define your own WiFi network credentials
const char* ssid = "Melatonin_ESP";     // Name of the WiFi network the ESP8266 will create
const char* password = "12345678";      // Password for the WiFi network
float dose = 0;
int calls = 30;
float mgPerL = 0.005;
float pumpRate = 1.5;


ESP8266WebServer server(80);

void handleDose() {
  // Add CORS headers for all requests
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Handle preflight OPTIONS request
  if (server.method() == HTTP_OPTIONS) {
    server.send(200);
    return;
  }
  
  // Log the incoming request
  Serial.println("\n--- New Request ---");
  Serial.print("Client IP: ");
  Serial.println(server.client().remoteIP());
  Serial.print("Request URI: ");
  Serial.println(server.uri());
  Serial.print("Request Method: ");
  Serial.println(server.method());
  
  if (!server.hasArg("value")) {
    Serial.println("Error: No value parameter received");
    server.send(400, "text/plain", "Missing 'value' parameter");
    return;
  }
  
  String doseStr = server.arg("value");
  dose = doseStr.toFloat();
  
  Serial.print("Received dose: ");
  Serial.println(dose);
  
  // Send response
  String response = "Dose received: " + doseStr;
  server.send(200, "text/plain", response);
  Serial.println("Response sent: " + response);
  Serial.println("--- End Request ---\n");
}

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(2, OUTPUT);
  
  Serial.println("\n\nESP8266 Starting...");
  Serial.println("Setting up Access Point...");
  
  // Set up Access Point
  WiFi.softAP(ssid, password);
  
  Serial.println("Access Point started successfully!");
  Serial.print("SSID: ");
  Serial.println(ssid);
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());  // This will typically be 192.168.4.1

  // Define the route and attach the handler
  server.on("/dose", HTTP_GET, handleDose);
  
  // Start the web server
  server.begin();
  Serial.println("HTTP server started on port 80");
  Serial.println("Waiting for requests...");
}

void loop() {
  server.handleClient();

  float mgPerCall = dose/calls;
  int durationOfCall = int(((mgPerCall)/(pumpRate * mgPerL)) * 1000);
  int timeBetwCall = int(round((3600000 - durationOfCall * calls)/calls));
  Serial.print("mgPerCall: ");
  Serial.print(mgPerCall);
  Serial.print("durationOfCall: ");
  Serial.print(durationOfCall);
  Serial.print("timeBetwCall: ");
  Serial.print(timeBetwCall);

  if (dose > 0) {
    for (int i = 0; i < calls; i++) {
      digitalWrite(2, HIGH);
      delay(durationOfCall);
      digitalWrite(2, LOW);
      delay(timeBetwCall);
    }
  }
  
  // Add periodic status check
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 30000) { // Check every 30 seconds
    lastCheck = millis();
    Serial.print("Server running. Connected devices: ");
    Serial.println(WiFi.softAPgetStationNum());
  }
}
