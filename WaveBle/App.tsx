import React, { useEffect, useState, } from 'react';
import {
  Button, View,
  Text,
  PermissionsAndroid,
  Platform, Alert,
  SafeAreaView, ScrollView,
  TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator
} from 'react-native';
import { BleManager, Characteristic, Device, State } from 'react-native-ble-plx';
// import utf8 from 'utf8';
import base64 from 'react-native-base64';
import QRCodeScanner from 'react-native-qrcode-scanner';
import Slider from '@react-native-community/slider';
import { RNCamera } from 'react-native-camera';
import Header from './components/header';
import Controlling from './components/controlling';
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID_TX = "db000752-8165-4eca-bcbd-8cad0f11127c"

const bleManager = new BleManager();

const App = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  //What device is connected?
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  //Is a device connected?
  const [isConnected, setIsConnected] = useState(false);
  const [isModealVisible, setIsModealVisible] = useState(false);
  const [ledStatus, setLedStatus] = useState('cycle_off');
  const [pumpStatus, setPumpStatus] = useState('Pump_OFF');
  const [solAStatus, setSolAStatus] = useState('sola_on');
  const [solBStatus, setSolBStatus] = useState('solb_on');
  const [solCStatus, setSolCStatus] = useState('solc_on');

  const [text, onChangeText] = React.useState("");
  const [outputText, setOutputText] = useState('Output will be displayed here...');
  const [fullcycleValue, setfullcycleValue] = useState(0);
  const [halfcycleValue, sethalfcycleValue] = useState(120);
  const [pumpTime, setPumpTime] = useState(30);
  const [pumpSpeed, setPumpSpeed] = useState(255);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraAuthorized, setCameraAuthorized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isStoppingCycle, setIsStoppingCycle] = useState(false);

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'This app needs access to your camera to scan QR codes.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            setCameraAuthorized(true);
          } else {
            console.log('Camera permission denied');
          }
        } catch (err) {
          console.warn(err);
        }
      } else {
        setCameraAuthorized(true);
      }
    };

    requestCameraPermission();


    const subscription = bleManager.onStateChange(async state => {

      if (state === 'PoweredOn') {
        console.log('BLE powered on');
        await requestPermissions();
      }
    }, true);

    return () =>
      subscription.remove();
  }, [bleManager]
  );



  const requestPermissions = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ]);

        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }

    Alert.alert('Permission have not been granted');
    return false;
  };

  const scanQrAndConnect = (qr: string) => {
    setIsSearching(true);
    
    const timeout = setTimeout(() => {
      if (isSearching) {
        bleManager.stopDeviceScan();
        setIsSearching(false);
        setIsConnecting(false);
        setDevices([]);
        Alert.alert(
          'Device Not Found',
          'Unable to find the device. Please try reconnecting.',
          [{ text: 'OK' }]
        );
      }
    }, 10000);
    
    setSearchTimeout(timeout);

    try {
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log('error', error);
          setIsSearching(false);
          clearTimeout(timeout);
          return;
        }
        if (device && device.id) {
          setDevices((prevState) => {
            if (!prevState.find((prevDevice) => prevDevice.id === device.id)) {
              return [...prevState, device];
            }
            return prevState;
          });

          if (device.id === qr) {
            console.log('Device found', device.name);
            setConnectedDevice(device);
            bleManager.stopDeviceScan();
            clearTimeout(timeout);
            connect(device).then(() => {
              setIsSearching(false);
            });
          }
        }
      });
    } catch (error) {
      console.log('Error scanning for devices', error);
      setIsSearching(false);
      clearTimeout(timeout);
    }
  };



  const connect = async (device: Device) => {
    console.log('Connecting to device', device.id);
    try {
      const connectedDevice = await bleManager.connectToDevice(device.id);
      console.log('Connected to device', device.id);
      setIsConnected(true);
      setConnectedDevice(connectedDevice);
      setIsModealVisible(true);
      
      // Add delay of 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Discover services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('Services and characteristics discovered');
      
      // Monitor characteristic
      bleManager.monitorCharacteristicForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            console.log('Error monitoring characteristic', error);
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      );
      
    } catch (error) {
      console.log('Connection error', error);
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };
  

  // Function to handle BLE notification and update UI accordingly
  const handleNotification = (decodedValue: string) => {
    console.log('Notification received:', decodedValue);
    if (decodedValue === 'Solenoid A ON') {
      setSolAStatus('sola_on');
      // setSolBStatus('solb_off');
      // setSolCStatus('solc_off');
    }
    if (decodedValue === 'Solenoid B ON') {
      // setSolAStatus('sola_off');
      setSolBStatus('solb_on');
      // setSolCStatus('solc_off');
    }
    if (decodedValue === 'Solenoid C ON') {
      // setSolAStatus('sola_off');
      // setSolBStatus('solb_off');
      setSolCStatus('solc_on');
    }
    if (decodedValue === 'Solenoid A OFF') {
      setSolAStatus('sola_off');
    }
    if (decodedValue === 'Solenoid B OFF') {
      setSolBStatus('solb_off');
    }
    if (decodedValue === 'Solenoid C OFF') {
      setSolCStatus('solc_off');
    }
    if (decodedValue === 'Pump ON') {
      console.log('Testt1');
      setPumpStatus('Pump_ON');
    }
    if (decodedValue === 'Pump OFF') {
      setPumpStatus('Pump_OFF');
    }
    if (decodedValue === 'Cycle ON') {
      setLedStatus('cycle_on');
      // setPumpStatus('Pump_ON');
      // setSolAStatus('sola_off');
      // setSolBStatus('solb_on');
      // setSolCStatus('solc_on');

    }
    if (decodedValue === 'Cycle OFF') {
      setLedStatus('cycle_off');

      setSolAStatus('sola_on');
      setSolBStatus('solb_on');
      setSolCStatus('solc_on');
      setPumpStatus('Pump_OFF');
      setIsStoppingCycle(false);
    }
    if (decodedValue === 'setupFinished') {
      setSolAStatus('sola_on');
      setSolBStatus('solb_on');
      setSolCStatus('solc_on');
    }
    if (decodedValue === 'deenergies all') {
      setSolAStatus('sola_on');
      setSolBStatus('solb_on');
      setSolCStatus('solc_on');
    }
    if (decodedValue === 'Cycle A On') {
      setPumpStatus('Pump_ON');
      setSolAStatus('sola_off');
      setSolBStatus('solb_on');
      setSolCStatus('solc_on');
    }
    if (decodedValue === 'Cycle A OFF') {
      setPumpStatus('Pump_OFF');
      setSolAStatus('sola_on');
      setSolBStatus('solb_on');
      setSolCStatus('solc_on');
    }
    if (decodedValue === 'Cycle B On') {
      setPumpStatus('Pump_ON');
      setSolAStatus('sola_on');
      setSolBStatus('solb_off');
      setSolCStatus('solc_on');
    }
    if (decodedValue === 'Cycle B OFF') {
      setPumpStatus('Pump_OFF');
      setSolAStatus('sola_on');
      setSolBStatus('solb_on');
      setSolCStatus('solc_on');
    }
    if (decodedValue === 'Cycle C On') {
      setPumpStatus('Pump_ON');
      setSolAStatus('sola_on');
      setSolBStatus('solb_on');
      setSolCStatus('solc_off');
    }
    if (decodedValue === 'Cycle C OFF') {
      setPumpStatus('Pump_OFF');
      setSolAStatus('sola_on');
      setSolBStatus('solb_on');
      setSolCStatus('solc_on');
    }


    // if (decodedValue !== 'Solenoid A ON' && decodedValue !== 'Solenoid B ON' && decodedValue !== 'Solenoid C ON' && decodedValue !== 'Pump ON' && decodedValue !== 'Pump OFF' && decodedValue !== 'Cycle ON' && decodedValue !== 'Cycle OFF' && decodedValue !== 'All Solenoids OFF') {
    //   console.log('Unknown status:', decodedValue);
    // }
  };
  const DisconnectFromDevice = async () => {
    if (!connectedDevice) {
      console.log('No device currently connected');
      return;
    }
    try {
      await bleManager.cancelDeviceConnection(connectedDevice.id);
      setIsConnected(false);
      setConnectedDevice(null);
      setSolAStatus('sola_off');
      setSolBStatus('solb_off');
      setSolCStatus('solc_off');
      setPumpStatus('Pump_OFF');
      setLedStatus('cycle_off'); // Reset cycle status
      setIsConnecting(false);
      setDevices([]); // Clear devices list
      console.log('Disconnected from device', connectedDevice.name);

      // Reset other states if needed
      setfullcycleValue(120);
      setPumpTime(30);
      setPumpSpeed(255);

      Alert.alert('Device Disconnected', 'Successfully disconnected from the cushion.');
    } catch (error) {
      console.log('Error disconnecting from device', error);
      Alert.alert('Error', 'Failed to disconnect from the device');
    }
  };

  const deviceDisconnected = () => {
    setIsConnected(false);
    setConnectedDevice(null);
    setSolAStatus('sola_off');
    setSolBStatus('solb_off');
    setSolCStatus('solc_off');
    setPumpStatus('Pump_OFF');
    setLedStatus('cycle_off'); // Reset cycle status
    setIsConnecting(false);
    setDevices([]); // Clear devices list
    console.log('Disconnected from device');
    Alert.alert('Device Disconnected', 'Successfully disconnected from the cushion.');
  }

  const togglecycle = async (status: string, halfcycleValue: number, pumpTime: number) => {
    console.log('Toggle Cycle:', status);
    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');
      setOutputText(prevText => `${prevText}\n${'No device connected'}`)
      return;
    }
    if (status === 'cycle_off') {
      setIsStoppingCycle(true);
      bleManager.writeCharacteristicWithResponseForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        base64.encode("cycle_off")
      )
      .then(() => {
        bleManager.monitorCharacteristicForDevice(
          connectedDevice.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID_TX,
          (error, characteristic) => {
            if (error) {
              console.log('Error monitoring characteristic', error);
              setIsStoppingCycle(false);
              return;
            }
            const value = characteristic?.value;
            const decodedValue = value ? base64.decode(value) : '';
            handleNotification(decodedValue);
          }
        )
      })
    }
    if (status === 'cycle_on') {
      console.log('Half Cycle:', halfcycleValue);
      console.log('Pump Time:', pumpTime);
      if (halfcycleValue/1000 >= 600 || pumpTime/1000 >= 31) {
        console.log('Invalid time values');
        Alert.alert('Invalid time values');
        return;
      }
      const fullcycleValue = halfcycleValue * 3;
      const timeMessage = `set_times;${fullcycleValue};${pumpTime}`;
      console.log('Time Message:', timeMessage);
      bleManager.writeCharacteristicWithResponseForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        base64.encode(timeMessage)
      )
      .then(() => {
  
        bleManager.monitorCharacteristicForDevice(
          connectedDevice.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID_TX,
          (error, characteristic) => {
            if (error) {
              console.log('Error monitoring characteristic', error);
              return;
            }
            const value = characteristic?.value;
            const decodedValue = value ? base64.decode(value) : '';
            handleNotification(decodedValue);
          }
        )  })
    }
    };


  const handleCycleChange = (text: any) => {
    sethalfcycleValue(text);
    const fullCycle = text * 3;
    setfullcycleValue(fullCycle);
  }

  const handlePumpChange = (text: any) => {
    setPumpTime(text);
  }


  const togglePump = async (status: string) => {

    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');

      return;
    }

    bleManager.writeCharacteristicWithResponseForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      base64.encode(status)
    )
    .then(() => {
  
      bleManager.monitorCharacteristicForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            console.log('Error monitoring characteristic', error);
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      )  })
  }



  const toggleSolA = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');

      return;
    }

    bleManager.writeCharacteristicWithResponseForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      base64.encode(status)
    )

    .then(() => {
  
      bleManager.monitorCharacteristicForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            console.log('Error monitoring characteristic', error);
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      )  })
  };

  const toggleSolB = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');

      return;
    }
    console.log('SolB Status:', status);
    bleManager.writeCharacteristicWithResponseForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      base64.encode(status)
    )

    .then(() => {
  
      bleManager.monitorCharacteristicForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            console.log('Error monitoring characteristic', error);
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      )  })

  };

  const toggleSolC = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');

      return;
    }
    console.log('SolC Status:', status);
    bleManager.writeCharacteristicWithResponseForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      base64.encode(status)
    )
    .then(() => {
  
      bleManager.monitorCharacteristicForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            console.log('Error monitoring characteristic', error);
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      )  })
  };


  const handlePumpSpeedChange = (value: any) => {
    setPumpSpeed(value);
  };



  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (

    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F6F0E6' }]}>
      <Header />
      <View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => {
              if (isConnected) {
                DisconnectFromDevice();
                setIsScannerVisible(false);
              } else {
                setIsScannerVisible(true);
              }
            }}
            style={styles.mainButton}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
              {isConnected ? 'Disconnect Cushion' : 'Connect Cushion'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {


              // updateCycleTime(halfcycleValue*1000, pumpTime*1000);
              togglecycle(ledStatus === 'cycle_on' ? 'cycle_off' : 'cycle_on', halfcycleValue * 1000, pumpTime * 1000);

            }}
            style={[
              styles.mainButton,
              {
                backgroundColor: !isConnected ? '#808080' : (ledStatus === 'cycle_on' ? '#008080' : '#808080'),
                opacity: !isConnected ? 0.5 : 1
              }
            ]}
            disabled={!isConnected}
          >
            <Text style={{
              color: !isConnected ? 'white' : (ledStatus === 'cycle_on' ? 'white' : 'black'),
              textAlign: 'center'
            }}>
              {ledStatus === 'cycle_off' ? 'Start Cycle' : 'Stop Cycle'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Controlling
        isConnected={isConnected}
        pumpStatus={pumpStatus}
        solAStatus={solAStatus}
        solBStatus={solBStatus}
        solCStatus={solCStatus}
        togglePump={togglePump}
        toggleSolA={toggleSolA}
        toggleSolB={toggleSolB}
        toggleSolC={toggleSolC}
      />
      <View style={styles.controlsContainer}>
        <View style={styles.inputsRow}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.numericInput}
              keyboardType='numeric'
              onChangeText={(text) => handleCycleChange(text)}
              value={halfcycleValue.toString()}
            />
            <Text style={styles.smallInputLabel}>Cycle Time (s)</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.numericInput}
              keyboardType='numeric'
              onChangeText={(text) => handlePumpChange(text)}
              value={pumpTime.toString()}
            />
            <Text style={styles.smallInputLabel}>Pump Time (s)</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.numericInput}
              keyboardType='numeric'
              onChangeText={(text) => handlePumpSpeedChange(text)}
              value={pumpSpeed.toString()}
            />
            <Text style={styles.smallInputLabel}>Pump Speed</Text>
          </View>
        </View>

      </View>

      {isScannerVisible && (
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerContainer}>
            <QRCodeScanner
              onRead={(e) => {
                console.log('QR Code:', e.data);
                scanQrAndConnect(e.data);
                setIsScannerVisible(false);
              }}
              cameraStyle={styles.camera}
            // containerStyle={styles.cameraContainer}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsScannerVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close Scanner</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isSearching && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#008080" />
            <Text style={styles.loadingText}>Searching for device...</Text>
          </View>
        </View>
      )}

      {isStoppingCycle && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#008080" />
            <Text style={styles.loadingText}>Stopping the cycle...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>


  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  outputContainer: {
    height: 200,
    borderWidth: 1,
    padding: 10,
    marginVertical: 10,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  scannerContainer: {
    flex: 1,
    width: '80%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 20,
    position: 'relative',
    height: "100%",
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  safeArea: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  inputContainer: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  inputLabel: {
    flex: 3,
    fontSize: 16,
    paddingRight: 10,
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    minWidth: 80,
    maxWidth: 120,
  },
  partialCycleText: {
    fontSize: 16,
    marginVertical: 10,
  },
  controlsContainer: {
    padding: 16,
    marginTop: 10,
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  numericInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  smallInputLabel: {
    textAlign: 'center',
    color: '#333',
  },
  updateButton: {
    backgroundColor: '#008080',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 30,
    marginBottom: 10,
    paddingHorizontal: 16, // Add padding to align with buttons below
  },
  mainButton: {
    width: '45%', // Match the width of the buttons below
    height: 60,
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});
export default App;



