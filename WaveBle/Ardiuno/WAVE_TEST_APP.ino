// use pwm to control the speed of air pump rate when meet pressure requirement sie

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <vector>
#include <Preferences.h>

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
unsigned long fullyCycleTime = 360000;  // Default 3 times of interval (3 * 3000ms)
unsigned long interval = fullyCycleTime / 3 ;
unsigned long pumpTime = 30000;  // Default pump time (in milliseconds)
unsigned long cushionInitTime = 20000;
unsigned long previousPumpTime = 0;
unsigned int pwmvalue = 255;

Preferences preferences;

void sendMessage(const char* message)
{
  Serial.println("Sending message: " + String(message));
  pCharacteristic->setValue(message);
  pCharacteristic->notify();
  delay(100); // Add small delay after notification
}


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
          //          pCharacteristic->setValue("Cycle ON");
          //          pCharacteristic->notify();
          //          sendMessage("cycle_on");
          //          fullyCycleTime = 360000;
          //          interval = fullyCycleTime / 3 ;
          //          pumpTime = 30000;
          currentState = SOLENOID_A; // Start with solenoid A
          automationActive = true;  // Start the automation sequence
          Serial.println("Automation started: Power ON");

          // Notify the connected device


        }
        else if ( rxValue == "cycle_off") {
          // Deactivate all solenoids
          digitalWrite(SOLENOID_A_PIN, HIGH);
          digitalWrite(SOLENOID_B_PIN, HIGH);
          digitalWrite(SOLENOID_C_PIN, HIGH);
          ledcWrite(PUMP_PIN, 0);
          sendMessage("deenergies all");
          delay(cushionInitTime);
          digitalWrite(SOLENOID_A_PIN, LOW);  //  Deengergies solenoid A
          digitalWrite(SOLENOID_B_PIN, LOW);  //  Deengergies solenoid B
          digitalWrite(SOLENOID_C_PIN, LOW);  //  Deengergies solenoid C

          currentState = SOLENOID_A; // Start with solenoid A
          automationActive = false;  // Stop automation
          Serial.println("All Solenoids OFF");

          // Notify the connected device
          //          pCharacteristic->setValue("Cycle OFF");
          //          pCharacteristic->notify();
          sendMessage("Cycle OFF");
        }

        if (rxValue == "pump_on")
        {
          //          digitalWrite(PUMP_PIN, HIGH);
          ledcWrite(PUMP_PIN, pwmvalue);

          Serial.println("Pump ON");

          // Notify the connected device
          // pCharacteristic->setValue("Pump ON");
          // pCharacteristic->notify();
          sendMessage("Pump ON");
        }
        else if (rxValue == "pump_off")
        {

          //          digitalWrite(PUMP_PIN, LOW);
          ledcWrite(PUMP_PIN, 0);

          Serial.println("Pump OFF");
          // Notify the connected device
          // pCharacteristic->setValue("Pump OFF");
          // pCharacteristic->notify();
          sendMessage("Pump OFF");
        }
        if (rxValue == "sola_on")
        {

          digitalWrite(SOLENOID_A_PIN, LOW);
          //          insertSol(SOLENOID_A_PIN);
          Serial.println("Solenoid A ON");
          // Notify the connected device
          // pCharacteristic->setValue("Solenoid A ON");
          // pCharacteristic->notify();
          sendMessage("Solenoid A ON");
        }
        else if (rxValue == "sola_off")
        {
          digitalWrite(SOLENOID_A_PIN, HIGH);
          //          removeSol(SOLENOID_A_PIN);
          Serial.println("Solenoid A OFF");
          // Notify the connected device
          // pCharacteristic->setValue("Solenoid A OFF");
          // pCharacteristic->notify();
          sendMessage("Solenoid A OFF");
        }
        if (rxValue == "solb_on")
        {
          digitalWrite(SOLENOID_B_PIN, LOW);
          //          insertSol(SOLENOID_B_PIN);
          Serial.println("Solenoid B ON");
          // Notify the connected device
          // pCharacteristic->setValue("Solenoid B ON");
          // pCharacteristic->notify();
          sendMessage("Solenoid B ON");
        }
        if (rxValue == "solb_off")
        {
          //          removeSol(SOLENOID_B_PIN);
          digitalWrite(SOLENOID_B_PIN, HIGH);
          Serial.println("Solenoid B OFF");
          // Notify the connected device
          // pCharacteristic->setValue("Solenoid B OFF");
          // pCharacteristic->notify();
          sendMessage("Solenoid B OFF");
        }
        if (rxValue == "solc_on")
        {

          digitalWrite(SOLENOID_C_PIN, LOW);
          //          insertSol(SOLENOID_C_PIN);
          Serial.println("Solenoid C ON");
          // Notify the connected device
          // pCharacteristic->setValue("Solenoid C ON");
          // pCharacteristic->notify();
          sendMessage("Solenoid C ON");
        }
        if (rxValue == "solc_off")
        {
          digitalWrite(SOLENOID_C_PIN, HIGH);
          //          removeSol(SOLENOID_C_PIN);
          Serial.println("Solenoid C OFF");

          // Notify the connected device
          // pCharacteristic->setValue("Solenoid C OFF");
          // pCharacteristic->notify();
          sendMessage("Solenoid C OFF");
        }
        //set full cycle time and pump time
        if (rxValue.startsWith("set_params"))
        {
          int sep1 = rxValue.indexOf(';');
          int sep2 = rxValue.indexOf(';', sep1 + 1);
          int sep3 = rxValue.indexOf(';', sep2 + 1);

          fullyCycleTime = rxValue.substring(sep1 + 1, sep2).toInt();
          pumpTime = rxValue.substring(sep2 + 1, sep3).toInt();
          pwmvalue = rxValue.substring(sep3 + 1).toInt();
          interval = fullyCycleTime / 3;

          // Store values in non-volatile memory
          preferences.putULong("cycleTime", fullyCycleTime);
          preferences.putULong("pumpTime", pumpTime);
          preferences.putUInt("pwmValue", pwmvalue);

          Serial.print("Stored Full Cycle Time: ");
          Serial.println(fullyCycleTime);
          Serial.print("Stored Pump Time: ");
          Serial.println(pumpTime);
          Serial.print("Stored PWM Value: ");
          Serial.println(pwmvalue);

          sendMessage("Cycle ON");
          sendMessage("Cycle A On");
          currentState = SOLENOID_A;
          automationActive = true;
          Serial.println("Automation started: Power ON");
        }

      }
    }
};



void setup() {
  Serial.begin(115200);

  // Open preferences with namespace "params"
  preferences.begin("params", false);

  // Retrieve stored values or use defaults if not found
  fullyCycleTime = preferences.getULong("cycleTime", 360000);
  pumpTime = preferences.putULong("pumpTime", 30000);
  pwmvalue = preferences.getUInt("pwmValue", 255);
  interval = fullyCycleTime / 3;

  // Initialize the GPIO pins for the solenoids
  pinMode(SOLENOID_A_PIN, OUTPUT);
  pinMode(SOLENOID_B_PIN, OUTPUT);
  pinMode(SOLENOID_C_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(SOLENOID_A_PIN, LOW);  // Start with all solenoids open
  digitalWrite(SOLENOID_B_PIN, LOW);
  digitalWrite(SOLENOID_C_PIN, LOW);

  // Configure PWM for the pump
  ledcAttach(PUMP_PIN, PWM_FREQ, PWM_RESOLUTION);

  // Allow ambiant air goes into all zones
  digitalWrite(SOLENOID_A_PIN, HIGH);  //  Energies solenoid A
  digitalWrite(SOLENOID_B_PIN, HIGH);  //  Energies solenoid B
  digitalWrite(SOLENOID_C_PIN, HIGH);  //  Energies solenoid C
  delay(cushionInitTime);
  digitalWrite(SOLENOID_A_PIN, LOW);  //  Deengergies solenoid A
  digitalWrite(SOLENOID_B_PIN, LOW);  //  Deengergies solenoid B
  digitalWrite(SOLENOID_C_PIN, LOW);  //  Deengergies solenoid C

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

  Serial.print("Stored Full Cycle Time: ");
  Serial.println(fullyCycleTime);
  Serial.print("Stored Pump Time: ");
  Serial.println(pumpTime);
  Serial.print("Stored PWM Value: ");
  Serial.println(pwmvalue);
};


void loop() {
  // Disconnect handling
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Give the Bluetooth stack the chance to handle it
    pServer->startAdvertising(); // Restart advertising
    Serial.println("Start advertising");
    oldDeviceConnected = deviceConnected;

    //shutdown pump and all solenoids
    digitalWrite(SOLENOID_A_PIN, LOW);  //  Deengergies solenoid A
    digitalWrite(SOLENOID_B_PIN, LOW);  //  Deengergies solenoid B
    digitalWrite(SOLENOID_C_PIN, LOW);  //  Deengergies solenoid C
    ledcWrite(PUMP_PIN, 0);
  }

  // Connect handling
  if (deviceConnected && !oldDeviceConnected) {
    Serial.println("Device connected");
    oldDeviceConnected = deviceConnected;
    
    // Send setupFinished first
    sendMessage("setupFinished");
    Serial.println("Sent: setupFinished");
    
    // Add longer delay between messages
    delay(5000);
    
    // Format and send parameters
    String params = 
                    String(fullyCycleTime) + ";" + 
                    String(pumpTime) + ";" + 
                    String(pwmvalue);
                    
    Serial.println("Sending stored params: " + params);
    sendMessage(params.c_str());  // Convert to c-string for better compatibility
    Serial.println("Params sent");
  }



  // Automate solenoid activation sequence
  if (automationActive) {

    // Control the solenoids in sequence
    switch (currentState) {

      case SOLENOID_A:

        digitalWrite(SOLENOID_A_PIN, LOW);  //  Deengergies solenoid A
        digitalWrite(SOLENOID_B_PIN, HIGH);  //  Energies solenoid B
        digitalWrite(SOLENOID_C_PIN, HIGH);  //  Energies solenoid C
        ledcWrite(PUMP_PIN, pwmvalue);

        sendMessage("Cycle A On");

        Serial.println("State A");
        delay(pumpTime);
        ledcWrite(PUMP_PIN, 0);
        digitalWrite(SOLENOID_A_PIN, LOW);  //  Deengergies solenoid A
        digitalWrite(SOLENOID_B_PIN, LOW);  //  Deengergies solenoid B
        digitalWrite(SOLENOID_C_PIN, LOW);  //  Deengergies solenoid C
        sendMessage("Cycle A OFF");

        delay(interval - pumpTime);
        currentState = SOLENOID_B;  // Move to next state
        break;

      case SOLENOID_B:
        digitalWrite(SOLENOID_A_PIN, HIGH);   //  Energies solenoid A
        digitalWrite(SOLENOID_B_PIN, LOW);  // Deengergies solenoid B
        digitalWrite(SOLENOID_C_PIN, HIGH);  //  Energies solenoid C
        ledcWrite(PUMP_PIN, pwmvalue);
        Serial.println(pwmvalue);
        Serial.println("Solenoid B ON");

        sendMessage("Cycle B On");
        Serial.println("State B");
        delay(pumpTime);

        ledcWrite(PUMP_PIN, 0);
        digitalWrite(SOLENOID_A_PIN, LOW);   //  Deengergies solenoid A
        digitalWrite(SOLENOID_B_PIN, LOW);  // Deengergies solenoid B
        digitalWrite(SOLENOID_C_PIN, LOW);  //  Deengergies solenoid C
        sendMessage("Cycle B OFF");

        delay(interval - pumpTime);
        currentState = SOLENOID_C;  // Move to next state
        break;

      case SOLENOID_C:

        digitalWrite(SOLENOID_A_PIN, HIGH);  // Energies on solenoid C
        digitalWrite(SOLENOID_B_PIN, HIGH);  // Energies off solenoid C
        digitalWrite(SOLENOID_C_PIN, LOW);  // Deengergies off solenoid C
        ledcWrite(PUMP_PIN, pwmvalue);
        Serial.println("Solenoid C ON");

        sendMessage("Cycle C On");
        delay(pumpTime);

        ledcWrite(PUMP_PIN, 0);
        digitalWrite(SOLENOID_A_PIN, LOW);   //  Deengergies solenoid A
        digitalWrite(SOLENOID_B_PIN, LOW);  // Deengergies solenoid B
        digitalWrite(SOLENOID_C_PIN, LOW);  //  Deengergies solenoid C

        sendMessage("Cycle C OFF");

        delay(interval - pumpTime);
        currentState = SOLENOID_A;  // Loop back to solenoid A
        break;

      default:
        currentState = SOLENOID_A;  // Default state
        break;
    }



  }
};