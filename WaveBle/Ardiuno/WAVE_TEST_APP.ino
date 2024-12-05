// use pwm to control the speed of air pump rate when meet pressure requirement sie

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <EEPROM.h>

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
enum State { 
  OFF, 
  SOLENOID_A_ON, 
  SOLENOID_A_OFF, 
  SOLENOID_B_ON, 
  SOLENOID_B_OFF, 
  SOLENOID_C_ON, 
  SOLENOID_C_OFF 
};
State currentState = OFF;
unsigned long previousMillis = 0;
unsigned long currentMillis = 0;  
bool automationActive = true;
unsigned long fullyCycleTime = 360000;  // Default 3 times of interval (3 * 3000ms)
unsigned long interval = fullyCycleTime / 3 ;
unsigned long pumpTime = 30000;  // Default pump time (in milliseconds)
unsigned long cushionInitTime = 20000;
unsigned long previousPumpTime = 0;
unsigned int pwmvalue = 255;

// Define EEPROM addresses for each variable
#define EEPROM_SIZE 12  // 4 bytes for each variable (3 variables)
#define CYCLE_TIME_ADDR 0
#define PUMP_TIME_ADDR 4
#define PUMP_SPEED_ADDR 8

void sendMessage(const char* message)
{
  Serial.println("Sending message: " + String(message));
  pCharacteristic->setValue(message);
  pCharacteristic->notify();
  delay(500); // Small delay between messages to prevent overrun
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
      
          currentState = SOLENOID_A_ON; // Start with solenoid A
          automationActive = true;  // Start the automation sequence
          previousMillis = millis() - interval;  // Force immediate first cycle
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

          currentState = SOLENOID_A_ON; // Start with solenoid A
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

          // Store values in EEPROM
          EEPROM.writeULong(CYCLE_TIME_ADDR, fullyCycleTime);
          EEPROM.writeULong(PUMP_TIME_ADDR, pumpTime);
          EEPROM.writeUInt(PUMP_SPEED_ADDR, pwmvalue);
          EEPROM.commit();

          Serial.print("Stored Full Cycle Time: ");
          Serial.println(fullyCycleTime);
          Serial.print("Stored Pump Time: ");
          Serial.println(pumpTime);
          Serial.print("Stored PWM Value: ");
          Serial.println(pwmvalue);

          sendMessage("Cycle ON");
          sendMessage("Cycle A On");
          currentState = SOLENOID_A_ON;
          automationActive = true;
          Serial.println("Automation started: Power ON");
        }

        // Send immediate status updates after each command
        if (rxValue == "pump_on") {
            ledcWrite(PUMP_PIN, pwmvalue);
            sendMessage("Pump ON");
        }
        else if (rxValue == "pump_off") {
            ledcWrite(PUMP_PIN, 0);
            sendMessage("Pump OFF");
        }
      }
    }
};

// Add this new function to send current status
void sendCurrentStatus() {
    // Send current automation state
    if (automationActive) {
        sendMessage("Cycle ON");
    } else {
        sendMessage("Cycle OFF");
    }
    
    // Send current solenoid states based on current state during automation
    if (automationActive) {
        switch (currentState) {
            case SOLENOID_A_ON:
                sendMessage("Cycle A On");
                break;
            case SOLENOID_A_OFF:
                sendMessage("Cycle A OFF");
                break;
            case SOLENOID_B_ON:
                sendMessage("Cycle B On");
                break;
            case SOLENOID_B_OFF:
                sendMessage("Cycle B OFF");
                break;
            case SOLENOID_C_ON:
                sendMessage("Cycle C On");
                break;
            case SOLENOID_C_OFF:
                sendMessage("Cycle C OFF");
                break;
        }
    } else {
        // Send individual solenoid states when not in automation
        if (digitalRead(SOLENOID_A_PIN) == HIGH) {
            sendMessage("Solenoid A OFF");
        } else {
            sendMessage("Solenoid A ON");
        }
        if (digitalRead(SOLENOID_B_PIN) == HIGH) {
            sendMessage("Solenoid B OFF");
        } else {
            sendMessage("Solenoid B ON");
        }
        if (digitalRead(SOLENOID_C_PIN) == HIGH) {
            sendMessage("Solenoid C OFF");
        } else {
            sendMessage("Solenoid C ON");
        }
    }

    

    // Send current parameters
    String params = String(fullyCycleTime) + ";" + 
                   String(pumpTime) + ";" + 
                   String(pwmvalue) + ";" +
                   String(automationActive);
    sendMessage(params.c_str());
}

void setup() {
  Serial.begin(115200);
  
  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  

  // Read stored values from EEPROM or use defaults
  fullyCycleTime = EEPROM.readULong(CYCLE_TIME_ADDR);
  if (fullyCycleTime == 0xFFFFFFFF) { // Check if EEPROM is empty
    fullyCycleTime = 360000; // Default value
  }
  
  pumpTime = EEPROM.readULong(PUMP_TIME_ADDR);
  if (pumpTime == 0xFFFFFFFF) {
    pumpTime = 30000;
  }
  
  pwmvalue = EEPROM.readUInt(PUMP_SPEED_ADDR);
  if (pwmvalue == 0xFFFF) {
    pwmvalue = 255;
  }
  
  interval = fullyCycleTime / 3;
  
  Serial.println("initalSetup: " + String(fullyCycleTime));
  Serial.println("initalSetup: " + String(pumpTime));
  Serial.println("initalSetup: " + String(pwmvalue));

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
  unsigned long currentMillis = millis();

  // Disconnect handling
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Start advertising");
    oldDeviceConnected = deviceConnected;
  }

  // Connect handling
  if (deviceConnected && !oldDeviceConnected) {
    Serial.println("Device connected");
    oldDeviceConnected = deviceConnected;
    sendMessage("setupFinished");
    Serial.println("Sent: setupFinished");
    delay(100);
  }

  // Automate solenoid activation sequence
  if (automationActive) {
    // Initialize if in OFF state
    if (currentState == OFF) {
      previousMillis = currentMillis;  // Start interval timing
      previousPumpTime = currentMillis; // Start pump timing
      currentState = SOLENOID_A_ON;
      
      // Set initial solenoid state and start pump
      digitalWrite(SOLENOID_A_PIN, LOW);
      digitalWrite(SOLENOID_B_PIN, HIGH);
      digitalWrite(SOLENOID_C_PIN, HIGH);
      ledcWrite(PUMP_PIN, pwmvalue);
      sendMessage("Cycle A On");
      Serial.println("State A ON");
    }
    sendCurrentStatus();
    // Check if pump should be turned off (pump time reached within current interval)
    if ((currentState == SOLENOID_A_ON || currentState == SOLENOID_B_ON || currentState == SOLENOID_C_ON) && 
        (currentMillis - previousPumpTime >= pumpTime)) {
      // Turn off pump and change to OFF state for current solenoid
      ledcWrite(PUMP_PIN, 0);
      sendMessage("Pump OFF");
      
      switch (currentState) {
        case SOLENOID_A_ON:
          currentState = SOLENOID_A_OFF;
          sendMessage("Cycle A OFF");
          break;
        case SOLENOID_B_ON:
          currentState = SOLENOID_B_OFF;
          sendMessage("Cycle B OFF");
          break;
        case SOLENOID_C_ON:
          currentState = SOLENOID_C_OFF;
          sendMessage("Cycle C OFF");
          break;
      }
    }

    // Check if interval time is reached (time to move to next solenoid)
    if (currentMillis - previousMillis >= interval) {
      previousMillis = currentMillis;   // Reset interval timer
      previousPumpTime = currentMillis; // Reset pump timer for new cycle
      
      // Determine next state based on current state
      switch (currentState) {
        case SOLENOID_A_ON:
        case SOLENOID_A_OFF:
          // Move to Zone B
          digitalWrite(SOLENOID_A_PIN, HIGH);
          digitalWrite(SOLENOID_B_PIN, LOW);
          digitalWrite(SOLENOID_C_PIN, HIGH);
          ledcWrite(PUMP_PIN, pwmvalue);
          sendMessage("Cycle B On");
          sendMessage("Pump ON");
          Serial.println("State B ON");
          currentState = SOLENOID_B_ON;
          break;

        case SOLENOID_B_ON:
        case SOLENOID_B_OFF:
          // Move to Zone C
          digitalWrite(SOLENOID_A_PIN, HIGH);
          digitalWrite(SOLENOID_B_PIN, HIGH);
          digitalWrite(SOLENOID_C_PIN, LOW);
          ledcWrite(PUMP_PIN, pwmvalue);
          sendMessage("Cycle C On");
          sendMessage("Pump ON");
          Serial.println("State C ON");
          currentState = SOLENOID_C_ON;
          break;

        case SOLENOID_C_ON:
        case SOLENOID_C_OFF:
          // Move back to Zone A
          digitalWrite(SOLENOID_A_PIN, LOW);
          digitalWrite(SOLENOID_B_PIN, HIGH);
          digitalWrite(SOLENOID_C_PIN, HIGH);
          ledcWrite(PUMP_PIN, pwmvalue);
          sendMessage("Cycle A On");
          sendMessage("Pump ON");
          Serial.println("State A ON");
          currentState = SOLENOID_A_ON;
          break;
      }
    }
  }
}