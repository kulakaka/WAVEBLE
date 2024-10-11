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

// PWM settings
#define PUMP_CHANNEL 0        // PWM channel for the pump (0-15)
#define PWM_FREQ 5000         // Frequency of 5kHz
#define PWM_RESOLUTION 8      // 8-bit resolution (0-255)

// UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "db000752-8165-4eca-bcbd-8cad0f11127c"

// State variables for automation
enum State { OFF, SOLENOID_A, SOLENOID_B, SOLENOID_C };
State currentState = OFF;
unsigned long previousMillis = 0;
bool automationActive = false;
unsigned long fullyCycleTime = 9000;  // Default 3 times of interval (3 * 3000ms)
unsigned long interval = 3000;
unsigned long pumpTime = 1000;  // Default pump time (in milliseconds)
unsigned long previousPumpTime = 0;
unsigned int pwmvalue = 0;
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
        automationActive = false;  // Stop automation
        rxValue.toLowerCase();
        // Control solenoids based on received value
        if (rxValue == "cycle_on") {
          automationActive = true;  // Start the automation sequence
          currentState = SOLENOID_A; // Start with solenoid A
          Serial.println("Automation started: Power ON");

          // Notify the connected device
          pCharacteristic->setValue("Automation started: Power ON");
          pCharacteristic->notify();
        }
        else if (rxValue == "cycle_off") {
          // Deactivate all solenoids
          digitalWrite(SOLENOID_A_PIN, LOW);
          digitalWrite(SOLENOID_B_PIN, LOW);
          digitalWrite(SOLENOID_C_PIN, LOW);
          digitalWrite(PUMP_PIN, LOW);
          automationActive = false;  // Stop automation
          Serial.println("All Solenoids OFF");

          // Notify the connected device
          pCharacteristic->setValue("All Solenoids OFF");
          pCharacteristic->notify();
        }
        if (rxValue == "pump_on")
        {
          //          digitalWrite(PUMP_PIN, HIGH);
          ledcWrite(PUMP_PIN, 255);

          Serial.println("Pump ON");

          // Notify the connected device
          pCharacteristic->setValue("Pump ON");
          pCharacteristic->notify();
        }
        else if (rxValue == "pump_off")
        {

          //          digitalWrite(PUMP_PIN, LOW);
          ledcWrite(PUMP_PIN, 0);

          Serial.println("Pump OFF");
          // Notify the connected device
          pCharacteristic->setValue("Pump OFF");
          pCharacteristic->notify();
        }
        if (rxValue == "sola_on")
        {

          digitalWrite(SOLENOID_A_PIN, HIGH);
          Serial.println("Solenoid A ON");
          // Notify the connected device
          pCharacteristic->setValue("Solenoid A ON");
          pCharacteristic->notify();
        }
        else if (rxValue == "sola_off")
        {
          digitalWrite(SOLENOID_A_PIN, LOW);
          Serial.println("Solenoid A OFF");
          // Notify the connected device
          pCharacteristic->setValue("Solenoid A OFF");
          pCharacteristic->notify();
        }
        if (rxValue == "solb_on")
        {
          digitalWrite(SOLENOID_B_PIN, HIGH);
          Serial.println("Solenoid B ON");
          // Notify the connected device
          pCharacteristic->setValue("Solenoid B ON");
          pCharacteristic->notify();
        }
        if (rxValue == "solb_off")
        {
          digitalWrite(SOLENOID_B_PIN, LOW);
          Serial.println("Solenoid B OFF");
          // Notify the connected device
          pCharacteristic->setValue("Solenoid B OFF");
          pCharacteristic->notify();
        }
        if (rxValue == "solc_on")
        {
          digitalWrite(SOLENOID_C_PIN, HIGH);
          Serial.println("Solenoid C ON");
          // Notify the connected device
          pCharacteristic->setValue("Solenoid C ON");
          pCharacteristic->notify();
        }
        if (rxValue == "solc_off")
        {
          digitalWrite(SOLENOID_C_PIN, LOW);
          Serial.println("Solenoid C OFF");
          // Notify the connected device
          pCharacteristic->setValue("Solenoid C OFF");
          pCharacteristic->notify();
        }
        //set full cycle time and pump time
        if (rxValue.startsWith("set_times"))
        {
          int sep1 = rxValue.indexOf(';');
          int sep2 = rxValue.indexOf(';', sep1 + 1);

          fullyCycleTime = rxValue.substring(sep1 + 1, sep2).toInt();
          pumpTime = rxValue.substring(sep2 + 1).toInt();
          interval = fullyCycleTime / 3;

          Serial.print("Set fullyCycleTime: ");
          Serial.println(fullyCycleTime);
          Serial.print("Set pumpTime: ");
          Serial.println(pumpTime);
          Serial.println("Interval");
          Serial.println(interval);
          automationActive = true;  // Start the automation sequence

          pCharacteristic->setValue("Times Setted.");
          pCharacteristic->notify();

        }

        if (rxValue.startsWith("pump_pwm"))
        {
          //          pwmvalue = rxValue.indexOf(';');
          //          Serial.println(pwmvalue);
          // Extract the value after the semicolon
          int sep = rxValue.indexOf(';');

          // Ensure there is something after the semicolon
          if (sep != -1 && sep + 1 < rxValue.length()) {
            String pwmStr = rxValue.substring(sep + 1); // Get the substring after the semicolon
            pwmvalue = pwmStr.toInt();                  // Convert to integer

            Serial.print("Received PWM Value: ");
            Serial.println(pwmvalue);
          } else {
            Serial.println("Invalid PWM command format");
          }
        }

        if (rxValue == "stop")
        {
          digitalWrite(SOLENOID_A_PIN, LOW);
          digitalWrite(SOLENOID_B_PIN, LOW);
          digitalWrite(SOLENOID_C_PIN, LOW);
          digitalWrite(PUMP_PIN, LOW);
          Serial.println("ALL STOPPED");
          // Notify the connected device
          pCharacteristic->setValue("ALL STOPPED");
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
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(SOLENOID_A_PIN, LOW);  // Start with all solenoids off
  digitalWrite(SOLENOID_B_PIN, LOW);
  digitalWrite(SOLENOID_C_PIN, LOW);
  //  digitalWrite(PUMP_PIN, LOW);

  // Configure PWM for the pump
  ledcAttach(PUMP_PIN, PWM_FREQ, PWM_RESOLUTION);

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
};


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
          //                    digitalWrite(PUMP_PIN,HIGH);
          ledcWrite(PUMP_PIN, pwmvalue);
          Serial.println(pwmvalue);

          digitalWrite(SOLENOID_C_PIN, LOW);
          Serial.println("Solenoid A ON");
          delay(pumpTime);
          digitalWrite(SOLENOID_A_PIN, LOW);  // Turn on solenoid A
          //                    digitalWrite(PUMP_PIN,LOW);
          ledcWrite(PUMP_PIN, 0);
          Serial.print("Waitinig");
          currentState = SOLENOID_B;  // Move to next state
          break;

        case SOLENOID_B:
          digitalWrite(SOLENOID_A_PIN, LOW);   // Turn off solenoid A
          //                    digitalWrite(PUMP_PIN,HIGH);

          digitalWrite(SOLENOID_B_PIN, HIGH);  // Turn on solenoid B
          ledcWrite(PUMP_PIN, pwmvalue);
          Serial.println(pwmvalue);

          Serial.println("Solenoid B ON");
          delay(pumpTime);
          digitalWrite(SOLENOID_B_PIN, LOW);  // Turn on solenoid A
          //                    digitalWrite(PUMP_PIN,LOW);
          ledcWrite(PUMP_PIN, 0);

          Serial.print("Waitinig");
          currentState = SOLENOID_C;  // Move to next state
          break;

        case SOLENOID_C:
          digitalWrite(SOLENOID_B_PIN, LOW);   // Turn off solenoid B
          digitalWrite(SOLENOID_C_PIN, HIGH);  // Turn on solenoid C
          //                    digitalWrite(PUMP_PIN,HIGH);
          ledcWrite(PUMP_PIN, pwmvalue);
          Serial.println(pwmvalue);

          Serial.println("Solenoid C ON");
          delay(pumpTime);
          digitalWrite(SOLENOID_C_PIN, LOW);  // Turn on solenoid A
          //                    digitalWrite(PUMP_PIN,LOW);
          ledcWrite(PUMP_PIN, 0);

          Serial.print("Waitinig");
          currentState = SOLENOID_A;  // Loop back to solenoid A
          break;

        default:
          currentState = SOLENOID_A;  // Default state
          break;
      }

      // Notify the connected device
      String stateMessage = "";
      stateMessage += (currentState == SOLENOID_A) ? "Solenoid A ON" :
                      (currentState == SOLENOID_B) ? "Solenoid B ON" :
                      (currentState == SOLENOID_C) ? "Solenoid C ON" : "Unknown State";
      pCharacteristic->setValue(stateMessage.c_str());
      pCharacteristic->notify();
    }
  }
};
