#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

// Define your own WiFi network credentials
const char *ssid = "Melatonin_ESP"; // Name of the WiFi network the ESP8266 will create
const char *password = "12345678";  // Password for the WiFi network
float dose = 0;                     // value of dosage (ml)
int calls = 10;                     // number of calls
float mgPermL = 0.5;                // miligrams per mililiter
float pumpRate = 1.5;               // rate that it pumps at

ESP8266WebServer server(80);

void handleDose()
{
    // Add CORS headers for all requests
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight OPTIONS request
    if (server.method() == HTTP_OPTIONS)
    {
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

    // fail case condition
    if (!server.hasArg("value"))
    {
        Serial.println("Error: No value parameter received");
        server.send(400, "text/plain", "Missing 'value' parameter");
        return;
    }

    // takes in the input from website and stores it
    String doseStr = server.arg("value");
    dose = doseStr.toFloat();

    // prints out dose recieved
    Serial.print("Received dose: ");
    Serial.println(dose);

    // Send response to ensure hardware received dose
    String response = "Dose received: " + doseStr;
    server.send(200, "text/plain", response);
    Serial.println("Response sent: " + response);
    Serial.println("--- End Request ---\n");
}

void setup()
{
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
    Serial.println(WiFi.softAPIP()); // This will typically be 192.168.4.1

    // Define the route and attach the handler
    server.on("/dose", HTTP_GET, handleDose);

    // Start the web server
    server.begin();
    Serial.println("HTTP server started on port 80");
    Serial.println("Waiting for requests...");
}

void loop()
{
    server.handleClient();

    /* algrebra to find how long we should discrete fluid for (duration of a call)
       and to find how long the pump should wait before discreting more fluid */
    float mgPerCall = dose / calls int durationOfCall = int(((mgPerCall * mgPerL) / pumpRate) * 1000);
    int timeBetwCall = int(round((3600000 - durationOfCall * calls) / calls));

    // sends signal to the arduino so it can dispense the melatonin
    if (dose > 0)
    {
        for (int i = 0; i < calls; i++)
        {
            digitalWrite(2, HIGH);
            delay(durationOfCall);
            digitalWrite(2, LOW);
            delay(timeBetwCall);
        }
    }

    // Add periodic status check
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 30000)
    { // Check every 30 seconds
        lastCheck = millis();
        Serial.print("Server running. Connected devices: ");
        Serial.println(WiFi.softAPgetStationNum());
    }
}