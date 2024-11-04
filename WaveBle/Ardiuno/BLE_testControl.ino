//add sensor to detect the pressure, temperature, humidity
// use pwm to control the speed of air pump rate when meet pressure requirement sie

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;

bool deviceConnected = false;
bool oldDeviceConnected = false;

// Pin definitions for solenoids
#define SOLENOID_A_PIN 26
#define SOLENOID_B_PIN 27
#define SOLENOID_C_PIN 14
#define PUMP_PIN 4
// UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "db000752-8165-4eca-bcbd-8cad0f11127c"

// State variables for automation
enum State { OFF, SOLENOID_A, SOLENOID_B, SOLENOID_C };
State currentState = OFF;
unsigned long previousMillis = 0;
const long interval = 3000;  // 3 seconds interval
bool automationActive = false;

class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
    }

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        pServer->startAdvertising();
        Serial.println("Device disconnected, restarting advertising...");
    }
};

class MyCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String rxValue = pCharacteristic->getValue();  // Get the value written to the characteristic

        if (rxValue.length() > 0) {
            Serial.print("Received Value: ");
            Serial.println(rxValue.c_str());

            // Control solenoids based on received value
            if (rxValue == "1") {
                automationActive = true;  // Start the automation sequence
                currentState = SOLENOID_A; // Start with solenoid A
                Serial.println("Automation started: Power ON");
            } 
            else if (rxValue == "2") {
                // Deactivate all solenoids
                digitalWrite(SOLENOID_A_PIN, LOW);
                digitalWrite(SOLENOID_B_PIN, LOW);
                digitalWrite(SOLENOID_C_PIN, LOW);
                digitalWrite(PUMP_PIN,LOW);
                automationActive = false;  // Stop automation
                Serial.println("All Solenoids OFF");
                
                // Notify the connected device
                pCharacteristic->setValue("All Solenoids OFF");
                pCharacteristic->notify();
            }
        }
    }
};

void setup() {
    Serial.begin(115200);

    // Initialize the GPIO pins for the solenoids
    pinMode(SOLENOID_A_PIN, OUTPUT);
    pinMode(SOLENOID_B_PIN, OUTPUT);
    pinMode(SOLENOID_C_PIN, OUTPUT);
    pinMode(PUMP_PIN,OUTPUT);
    digitalWrite(SOLENOID_A_PIN, LOW);  // Start with all solenoids off
    digitalWrite(SOLENOID_B_PIN, LOW);
    digitalWrite(SOLENOID_C_PIN, LOW);
    digitalWrite(PUMP_PIN,LOW);

    // Create the BLE Device
    BLEDevice::init("ESP32");

    // Create the BLE Server
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    // Create the BLE Service
    BLEService *pService = pServer->createService(SERVICE_UUID);

    // Create a BLE Characteristic for writing and notifying
    pCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ |
                        BLECharacteristic::PROPERTY_WRITE |
                        BLECharacteristic::PROPERTY_NOTIFY   // Enable write and notify
                    );

    pCharacteristic->setCallbacks(new MyCallbacks());

    // Add BLE2902 descriptor to enable notifications
    pCharacteristic->addDescriptor(new BLE2902());

    // Start the service
    pService->start();

    // Start advertising
    pServer->getAdvertising()->start();
    Serial.println("Waiting for a client connection...");
}

void loop() {
    // Disconnect handling
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); // Give the Bluetooth stack the chance to handle it
        pServer->startAdvertising(); // Restart advertising
        Serial.println("Start advertising");
        oldDeviceConnected = deviceConnected;
    }

    // Connect handling
    if (deviceConnected && !oldDeviceConnected) {
        Serial.println("Device connected");
        oldDeviceConnected = deviceConnected;
    }

    // Automate solenoid activation sequence
    if (automationActive) {
        unsigned long currentMillis = millis();
        if (currentMillis - previousMillis >= interval) {
            previousMillis = currentMillis; // Save the last time a solenoid was activated

            // Control the solenoids in sequence
            switch (currentState) {
                case SOLENOID_A:
                    digitalWrite(SOLENOID_A_PIN, HIGH);  // Turn on solenoid A
                    digitalWrite(PUMP_PIN,HIGH);
                    digitalWrite(SOLENOID_C_PIN, LOW);
                    Serial.println("Solenoid A ON");
                    currentState = SOLENOID_B;  // Move to next state
                    break;

                case SOLENOID_B:
                    digitalWrite(SOLENOID_A_PIN, LOW);   // Turn off solenoid A
                    digitalWrite(PUMP_PIN,LOW);
                    digitalWrite(SOLENOID_B_PIN, HIGH);  // Turn on solenoid B
                    Serial.println("Solenoid B ON");
                    currentState = SOLENOID_C;  // Move to next state
                    break;

                case SOLENOID_C:
                    digitalWrite(SOLENOID_B_PIN, LOW);   // Turn off solenoid B
                    digitalWrite(SOLENOID_C_PIN, HIGH);  // Turn on solenoid C
                    Serial.println("Solenoid C ON");
                    currentState = SOLENOID_A;  // Loop back to solenoid A
                    break;

                default:
                    currentState = SOLENOID_A;  // Default state
                    break;
            }

            // Notify the connected device
            String stateMessage = "Current State: ";
            stateMessage += (currentState == SOLENOID_A) ? "Solenoid A ON" :
                            (currentState == SOLENOID_B) ? "Solenoid B ON" :
                            (currentState == SOLENOID_C) ? "Solenoid C ON" : "Unknown State";
            pCharacteristic->setValue(stateMessage.c_str());
            pCharacteristic->notify();
        }
    }
}
