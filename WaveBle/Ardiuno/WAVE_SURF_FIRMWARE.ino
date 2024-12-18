//Imports
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <EEPROM.h>

// Pin definitions
#define CyclStart 1
#define VaccInit 25000  //Number of seconds to vacuum during the initialize sequence
#define PresInit 20000  //Number of seconds to pressurize during the initialize sequence
#define CombIntvl 22000 //Number of seconds to combination pressurize & vacuum during the main operations loop
#define SAPPin 32 //Declare Solenoid A Pressure Pin
#define SBPPin 33 //Declare Solenoid B Pressure Pin
#define SCPPin 25 //Declare Solenoid C Pressure Pin
#define SAVPin 26 //Declare Solenoid A Vacuum Pin
#define SBVPin 27 //Declare Solenoid B Vacuum Pin
#define SCVPin 14 //Declare Solenoid C Vacuum Pin
#define AINPin 2  //Declare Ambient In Solenoid Pin
#define AOUPin 15 //Declare Ambient Out Solenoid Pin
#define PUMP_PIN 4  //Declare Pump Pin

// State variables for automation
enum State {
  OFF,
  STATE_A_ON,
  STATE_A_OFF,
  STATE_B_ON,
  STATE_B_OFF,
  STATE_C_ON,
  STATE_C_OFF
};
State currentState = OFF;
unsigned long previousMillis = 0;
unsigned long currentMillis = 0;
bool automationActive = true; // once turn on device automatically start the cycle
bool CombIntvlActive = false;
bool VaccIntvlActive = false;
bool PresIntvlActive = false;
bool ResetActive = false;

unsigned long fullyCycleTime = 360000;  // Default 3 times of interval (3 * 3000ms)
unsigned long interval = fullyCycleTime / 3 ;
unsigned long pumpTime = 30000;  // Default pump time (in milliseconds)
unsigned long cushionInitTime = 20000;
unsigned int pwmvalue = 255;
unsigned long CyclIntvl = 120000;
unsigned long VaccIntvl = 9000;
unsigned long PresIntvl = 7000;

// Define EEPROM addresses for each variable
#define EEPROM_SIZE 16  // 4 bytes for each variable (4 variables)
#define CYCLE_TIME_ADDR 0
#define VACC_TIME_ADDR 4
#define PRES_TIME_ADDR 8
#define PUMP_SPEED_ADDR 12

unsigned long previousPumpTime = 0;
unsigned long previousCombIntvl = 0;
unsigned long previousVaccIntvl = 0;
unsigned long previousPresIntvl = 0;
unsigned long previousCyclIntvl = 0;

// Add these variables to track active solenoids
bool pumpActive = false;
bool currentZoneVacuum = false;
bool nextZonePressure = false;

// Add BLE server and characteristic variables
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Add UUIDs for BLE
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "db000752-8165-4eca-bcbd-8cad0f11127c"

// Add message sending function
void sendMessage(const char* message) {
  if (deviceConnected) {
    Serial.println("Sending message: " + String(message));
    pCharacteristic->setValue(message);
    pCharacteristic->notify();
    delay(500); // Small delay between messages
  }
}

// Add BLE callbacks classes
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    }

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      delay(500);
      pServer->startAdvertising();
      Serial.println("Device disconnected, restarting advertising...");
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String rxValue = pCharacteristic->getValue();

      if (rxValue.length() > 0) {
        Serial.print("Received Value: ");
        Serial.println(rxValue.c_str());
        rxValue.toLowerCase();
        if (rxValue.startsWith("set_params"))
        {
          int sep1 = rxValue.indexOf(';');
          int sep2 = rxValue.indexOf(';', sep1 + 1);
          int sep3 = rxValue.indexOf(';', sep2 + 1);
          int sep4 = rxValue.indexOf(';', sep3 + 1);

          CyclIntvl = rxValue.substring(sep1 + 1, sep2).toInt();
          PresIntvl = rxValue.substring(sep2 + 1, sep3).toInt();
          VaccIntvl = rxValue.substring(sep3 + 1, sep4).toInt();
          pwmvalue = rxValue.substring(sep4 + 1).toInt();

          // Store values in EEPROM
          EEPROM.writeULong(CYCLE_TIME_ADDR, CyclIntvl);
          EEPROM.writeUInt(PRES_TIME_ADDR, PresIntvl);
          EEPROM.writeUInt(VACC_TIME_ADDR, VaccIntvl);
          EEPROM.writeUInt(PUMP_SPEED_ADDR, pwmvalue);
          EEPROM.commit();

          Serial.print("Cycle Intvl: ");
          Serial.println(CyclIntvl);
          Serial.print("Pres Intvl: ");
          Serial.println(PresIntvl);
          Serial.print("Vacc Intvl: ");
          Serial.println(VaccIntvl);
          Serial.print("Pump Speed: ");
          Serial.println(pwmvalue);
          Serial.println("Parameters set and EEPROM updated");
          automationActive = true;
          previousCyclIntvl = millis();
          currentState = STATE_A_ON;

        }
        if (rxValue == "cycle_on") {
          automationActive = true;
          previousCyclIntvl = millis();
          currentState = STATE_A_ON;
          sendMessage("Cycle ON");
        }
        if (rxValue == "cycle_off") {
          automationActive = false;
          currentState = OFF;
          handleReinitalPhase();
          sendMessage("Cycle OFF");
        }
        if (rxValue == "pump_on")
        {
          ledcWrite(PUMP_PIN, pwmvalue);
          Serial.println("Pump ON");
          sendMessage("Pump ON");
        }
        else if (rxValue == "pump_off")
        {
          ledcWrite(PUMP_PIN, 0);
          Serial.println("Pump OFF");
          sendMessage("Pump OFF");
        }

        if (rxValue == "a_pressure")
        {
            digitalWrite(SAPPin, HIGH);
            digitalWrite(AINPin, HIGH);
            digitalWrite(SAVPin, LOW);
            digitalWrite(AOUPin, LOW);
            sendMessage("A Pressure");
        }
        if (rxValue == "a_vaccum")
        {
            digitalWrite(SAPPin, LOW);
            digitalWrite(AINPin, LOW);
            digitalWrite(SAVPin, HIGH);
            digitalWrite(AOUPin, HIGH);
            sendMessage("A Vaccum");
        }
        if (rxValue == "a_hold")
        {
            digitalWrite(SAPPin, LOW);
            digitalWrite(AINPin, LOW);
            digitalWrite(SAVPin, LOW);
            digitalWrite(AOUPin, LOW);
            sendMessage("A Hold");
        }
        if (rxValue == "b_pressure")
        {
            digitalWrite(SBPPin, HIGH);
            digitalWrite(AINPin, HIGH);
            digitalWrite(SBVPin, LOW);
            digitalWrite(AOUPin, LOW);
            sendMessage("B Pressure");
        }
        if (rxValue == "b_vaccum")
        {
            digitalWrite(SBPPin, LOW);
            digitalWrite(AINPin, LOW);
            digitalWrite(SBVPin, HIGH);
            digitalWrite(AOUPin, HIGH);
            sendMessage("B Vaccum");
        }
        if (rxValue == "b_hold")
        {
            digitalWrite(SBPPin, LOW);
            digitalWrite(AINPin, LOW);
            digitalWrite(SBVPin, LOW);
            digitalWrite(AOUPin, LOW);
            sendMessage("B Hold");
        }
        if (rxValue == "c_pressure")
        {
            digitalWrite(SCPPin, HIGH);
            digitalWrite(AINPin, HIGH);
            digitalWrite(SCVPin, LOW);
            digitalWrite(AOUPin, LOW);
            sendMessage("C Pressure");
        }
        if (rxValue == "c_vaccum")
        {
            digitalWrite(SCPPin, LOW);
            digitalWrite(AINPin, LOW);
            digitalWrite(SCVPin, HIGH);
            digitalWrite(AOUPin, HIGH);
            sendMessage("C Vaccum");
        }
        if (rxValue == "c_hold")
        {
            digitalWrite(SCPPin, LOW);
            digitalWrite(AINPin, LOW);
            digitalWrite(SCVPin, LOW);
            digitalWrite(AOUPin, LOW);
            sendMessage("C Hold");
        }

      }
    }
};

void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);  // Need to initialize EEPROM before using it

  // Read stored values from EEPROM or use defaults
  pwmvalue = EEPROM.readUInt(PUMP_SPEED_ADDR);
  if (pwmvalue == 0xFFFF) {
    pwmvalue = 255;
  }

  CyclIntvl = EEPROM.readUInt(CYCLE_TIME_ADDR);
  if (CyclIntvl == 0xFFFF) {
    CyclIntvl = 120000;
  }

  VaccIntvl = EEPROM.readUInt(VACC_TIME_ADDR);
  if (VaccIntvl == 0xFFFF) {
    VaccIntvl = 9000;
  }

  PresIntvl = EEPROM.readUInt(PRES_TIME_ADDR);
  if (PresIntvl == 0xFFFF) {
    PresIntvl = 7000;
  }
  ledcAttach(PUMP_PIN, 5000, 8);
  // Initialize the GPIO pins for the solenoids
  pinMode(SAPPin, OUTPUT);
  pinMode(SBPPin, OUTPUT);
  pinMode(SCPPin, OUTPUT);
  pinMode(SAVPin, OUTPUT);
  pinMode(SBVPin, OUTPUT);
  pinMode(SCVPin, OUTPUT);
  pinMode(AINPin, OUTPUT);
  pinMode(AOUPin, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);

  digitalWrite(SAPPin, LOW); //Set Solenoid A Pressure Pin to LOW
  digitalWrite(SBPPin, LOW); //Set Solenoid B Pressure Pin to LOW
  digitalWrite(SCPPin, LOW); //Set Solenoid C Pressure Pin to LOW
  digitalWrite(SAVPin, LOW); //Set Solenoid A Vacuum Pin to LOW
  digitalWrite(SBVPin, LOW); //Set Solenoid B Vacuum Pin to LOW
  digitalWrite(SCVPin, LOW); //Set Solenoid C Vacuum Pin to LOW
  digitalWrite(AINPin, LOW); //Set Ambient In Solenoid Pin to LOW
  digitalWrite(AOUPin, LOW); //Set Ambient Out Solenoid Pin to LOW
  digitalWrite(PUMP_PIN, LOW); //Set Pump Pin to LOW
  //
  //  //Initialize beginning state of cushion, taking everything to zero position
  //  digitalWrite(AOUPin, HIGH); //Energize the AOU solenoid, opening an exhaust port to ambient air
  //  digitalWrite(PUMP_PIN, HIGH); //Energize the pump
  //  digitalWrite(SAVPin, HIGH); //Energize the SAV solenoid, vacuum out the A zone, venting the air to ambient
  //  delay(VaccInit);           //Do this for the amount of time specified by the VaccIntvl constant
  //  digitalWrite(SAVPin, LOW);  //De-energize the SAV solenoid, closing off the A zone in a fully deflated state
  //  digitalWrite(SBVPin, HIGH); //Energize the SBV solenoid, vacuum out the B zone, venting the air to ambient
  //  delay(VaccInit);           //Do this for the amount of time specified by the VaccIntvl constant
  //  digitalWrite(SBVPin, LOW);  //De-energize the SBV solenoid, closing off the B zone in a fully deflated state
  //  digitalWrite(SCVPin, HIGH); //Energize the SCV solenoid, vacuum out the C zone, venting the air to ambient
  //  delay(VaccInit);           //Do this for the amount of time specified by the VaccIntvl constant
  //  digitalWrite(SCVPin, LOW);  //De-energize the SCV solenoid, closing off the C zone in a fully deflated state
  //  digitalWrite(AOUPin, LOW);  //De-energize the AOU solenoid, closing the exhaust port to ambient air
  //  //At this point all zones should be fully deflated and locked off
  //
  //  digitalWrite(AINPin, HIGH); //Energize the AIN solenoid, opening the input port to ambient air
  //  digitalWrite(SAPPin, HIGH); //Energize the SAP solenoid, pressurize the A zone, drawing in air from ambient
  //  delay(PresInit);           //Do this for the amount of time specified by the PresIntvl constant
  //  digitalWrite(SAPPin, LOW);  //De-energize the SAP solenoid, closing off the A zone in a fully inflated state
  //  digitalWrite(SBPPin, HIGH); //Energize the SBP solenoid, pressurize the B zone, drawing air in from ambient
  //  delay(PresInit);           //Do this for the amount of time specified by the PresIntvl constant
  //  digitalWrite(SBPPin, LOW);  //De-energize the SBP solenoid, closing off the B zone in a fully inflated state
  //  digitalWrite(AINPin, LOW);  //De-energize the AIN solenoid, closing the input port to ambient air
  //  digitalWrite(PUMP_PIN, LOW);  //De-energize the pump
  //At this point the A & B zones should be fully inflated and locked

  Serial.println("Initialization complete");
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

  unsigned long currentMillis = millis();
  // Handle BLE connection state changes
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Start advertising");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    sendMessage("setupFinished");
    Serial.println("Sent: setupFinished");
    delay(100);
  }

  if (automationActive) {
    if (currentState == OFF) {
      previousCyclIntvl = currentMillis;
      currentState = STATE_A_ON;
      CombIntvlActive = true;
      Serial.println("Starting cycle with Zone A");
    }
    sendCurrentStatus();
    unsigned long timeInCycle = currentMillis - previousCyclIntvl;

    // More precise phase transitions
    if (timeInCycle < CombIntvl) {
      if (CombIntvlActive) {
        Serial.println("Starting combination phase");
        handleCombinationPhase();
        CombIntvlActive = false;
        VaccIntvlActive = true;
      }
    }
    else if (timeInCycle < (CombIntvl + VaccIntvl)) {
      if (VaccIntvlActive) {
        Serial.println("Starting vacuum phase");
        handleVacuumPhase();
        VaccIntvlActive = false;
        PresIntvlActive = true;
      }
    }
    else if (timeInCycle < (CombIntvl + VaccIntvl + PresIntvl)) {
      if (PresIntvlActive) {
        Serial.println("Starting pressure phase");
        handlePressurePhase();
        PresIntvlActive = false;
        ResetActive = true;
      }
    }
    else if (timeInCycle < CyclIntvl) {
      // Send HOLD message every 500ms during resting phase
      static unsigned long lastHoldMessage = 0;
      if (currentMillis - lastHoldMessage >= 500) {
        sendMessage("HOLD");
        lastHoldMessage = currentMillis;
      }
      
      if (ResetActive) {
        Serial.println("Starting reset phase");
        switch (currentState) {
          case STATE_A_ON:
            currentState = STATE_A_OFF;
            break;
          case STATE_B_ON:
            currentState = STATE_B_OFF;
            break;
          case STATE_C_ON:
            currentState = STATE_C_OFF;
            break;
        }
        handleResetPhase();
        ResetActive = false;
      }
    }
    else {
      // Cycle complete - prepare for next zone
      previousCyclIntvl = currentMillis;
      CombIntvlActive = true;

      // Transition to next state
      switch (currentState) {
        case STATE_A_OFF:
          currentState = STATE_B_ON;
          Serial.println("Complete cycle A, moving to B");
          break;
        case STATE_B_OFF:
          currentState = STATE_C_ON;
          Serial.println("Complete cycle B, moving to C");
          break;
        case STATE_C_OFF:
          currentState = STATE_A_ON;
          Serial.println("Complete cycle C, moving to A");
          break;
      }
    }
  }
}

// Add these helper functions
void handleCombinationPhase() {
  pumpActive = true;
  currentZoneVacuum = true;
  nextZonePressure = true;

  digitalWrite(PUMP_PIN, HIGH);
  //sendMessage here the squence are (ABC);
  switch (currentState) {
    case STATE_A_ON:
    case STATE_A_OFF:
      digitalWrite(SAVPin, HIGH);  // Vacuum A
      digitalWrite(SCPPin, HIGH);  // Pressurize C
      Serial.println("Combination: A vacuum, C pressure");
      sendMessage("VHP");
      break;
    case STATE_B_ON:
    case STATE_B_OFF:
      digitalWrite(SBVPin, HIGH);  // Vacuum B
      digitalWrite(SAPPin, HIGH);  // Pressurize A
      Serial.println("Combination: B vacuum, A pressure");
      sendMessage("PVH");
      break;
    case STATE_C_ON:
    case STATE_C_OFF:
      digitalWrite(SCVPin, HIGH);  // Vacuum C
      digitalWrite(SBPPin, HIGH);  // Pressurize B
      Serial.println("Combination: C vacuum, B pressure");
      sendMessage("HPV");
      break;
  }
}

void handleVacuumPhase() {
  // Maintain previous states and add AOU
  digitalWrite(AOUPin, HIGH);
  Serial.println("Vacuum phase: AOU opened");
}

void handlePressurePhase() {
  // Close AOU and open AIN while maintaining other states
  digitalWrite(AOUPin, LOW);
  digitalWrite(AINPin, HIGH);
  Serial.println("Pressure phase: AOU closed, AIN opened");
}

void handleResetPhase() {
  // Reset all states
  pumpActive = false;
  currentZoneVacuum = false;
  nextZonePressure = false;

  digitalWrite(SAPPin, LOW);
  digitalWrite(SBPPin, LOW);
  digitalWrite(SCPPin, LOW);
  digitalWrite(SAVPin, LOW);
  digitalWrite(SBVPin, LOW);
  digitalWrite(SCVPin, LOW);
  digitalWrite(AINPin, LOW);
  digitalWrite(AOUPin, LOW);
  digitalWrite(PUMP_PIN, LOW);
  sendMessage("HOLD");
  Serial.println("Reset phase: All valves closed");
}

void handleReinitalPhase() {
  digitalWrite(AINPin, HIGH);
  digitalWrite(AOUPin, HIGH);
  digitalWrite(SAPPin, HIGH); //Set Solenoid A Pressure Pin to LOW
  digitalWrite(SBPPin, HIGH); //Set Solenoid B Pressure Pin to LOW
  digitalWrite(SCPPin, HIGH); //Set Solenoid C Pressure Pin to LOW
  digitalWrite(SAVPin, HIGH); //Set Solenoid A Vacuum Pin to LOW
  digitalWrite(SBVPin, HIGH); //Set Solenoid B Vacuum Pin to LOW
  digitalWrite(SCVPin, HIGH); //Set Solenoid C Vacuum Pin to LOW
  delay(cushionInitTime);
  digitalWrite(SAPPin, LOW);
  digitalWrite(SBPPin, LOW);
  digitalWrite(SCPPin, LOW);
  digitalWrite(SAVPin, LOW);
  digitalWrite(SBVPin, LOW);
  digitalWrite(SCVPin, LOW);
  digitalWrite(AINPin, LOW);
  digitalWrite(AOUPin, LOW);
}

void sendCurrentStatus() {
  // Send current automation state
  if (automationActive) {
    sendMessage("Cycle ON");
    switch (currentState) {
      case STATE_A_ON:
        sendMessage("VHP");
        break;
      case STATE_B_ON:
        sendMessage("PVH");
        break;
      case STATE_C_ON:
        sendMessage("HPV");
        break;
      case STATE_A_OFF:
        sendMessage("HOLD");
        break;
      case STATE_B_OFF:
        sendMessage("HOLD");
        break;
      case STATE_C_OFF:
        sendMessage("HOLD");
        break;
    }
  } else {
    sendMessage("Cycle OFF");
  }


}