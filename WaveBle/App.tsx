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
  const [solAStatus, setSolAStatus] = useState<'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure'>('pressure');
  const [solBStatus, setSolBStatus] = useState<'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure'>('pressure');
  const [solCStatus, setSolCStatus] = useState<'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure'>('pressure');

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
  const [disconnectSubscription, setDisconnectSubscription] = useState<any>(null);

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

    return () => {
      subscription.remove();
      if (disconnectSubscription) {
        disconnectSubscription.remove();
      }
    };
  }, [bleManager, disconnectSubscription]);

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
    }, 20000);

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

  const setupDisconnectListener = (device: Device) => {
    if (disconnectSubscription) {
      disconnectSubscription.remove();
    }

    const subscription = bleManager.onDeviceDisconnected(device.id, (error, disconnectedDevice) => {
      console.log('Device disconnected:', disconnectedDevice?.name);
      
      if (error) {
        console.log('Disconnection error:', error);
        setIsConnected(false);
        setConnectedDevice(null);
        setDevices([]);
        setSolAStatus('pressure');
        setSolBStatus('pressure');
        setSolCStatus('pressure');
        setPumpStatus('Pump_OFF');
        setLedStatus('cycle_off');
        setIsConnecting(false);
        
        Alert.alert(
          'Device Disconnected',
          'The connection to the device was lost. Please reconnect.',
          [{ text: 'OK' }]
        );
      }
    });

    setDisconnectSubscription(subscription);
  };

  const connect = async (device: Device) => {
    console.log('Connecting to device', device.id);
    try {
      const connectedDevice = await bleManager.connectToDevice(device.id);
      console.log('Connected to device', device.id);
      setIsConnected(true);
      setConnectedDevice(connectedDevice);
      setIsModealVisible(true);

      setupDisconnectListener(connectedDevice);

      await new Promise(resolve => setTimeout(resolve, 2000));

      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('Services and characteristics discovered');

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

  const handleNotification = (decodedValue: string) => {
    console.log('Raw notification received:', decodedValue);
    
    if (decodedValue.split(';').length === 4) {
      const params = decodedValue.split(';');
      console.log('Correct number of parameters found');
      const storedCycleTime = parseInt(params[0]) / 3000;
      const storedPumpTime = parseInt(params[1])/1000;
      const storedPumpSpeed = parseInt(params[2]);
      const storedCycleStatus = params[3] === '1';
      
      console.log('Parsed values:');
      console.log('Cycle Time:', storedCycleTime);
      console.log('Pump Time:', storedPumpTime);
      console.log('Pump Speed:', storedPumpSpeed);
      console.log('Cycle Status:', storedCycleStatus);
      
      sethalfcycleValue(storedCycleTime);
      setPumpTime(storedPumpTime);
      setPumpSpeed(storedPumpSpeed);
      setLedStatus(storedCycleStatus ? 'cycle_on' : 'cycle_off');
    }
    
    if (decodedValue === 'Solenoid A ON') {
      setSolAStatus('pressure');
    }
    if (decodedValue === 'Solenoid B ON') {
      setSolBStatus('pressure');
    }
    if (decodedValue === 'Solenoid C ON') {
      setSolCStatus('pressure');
    }
    if (decodedValue === 'Solenoid A OFF') {
      setSolAStatus('vacuum');
    }
    if (decodedValue === 'Solenoid B OFF') {
      setSolBStatus('vacuum');
    }
    if (decodedValue === 'Solenoid C OFF') {
      setSolCStatus('vacuum');
    }
    if (decodedValue === 'Cycle A On') {
      setPumpStatus('Pump_ON');
      setSolAStatus('vacuum');
      setSolBStatus('pressure');
      setSolCStatus('pressure');
      setLedStatus('cycle_on');
    }
    if (decodedValue === 'Cycle A OFF') {
      setPumpStatus('Pump_OFF');
      setSolAStatus('hold_vacuum');
      setSolBStatus('hold_pressure');
      setSolCStatus('hold_pressure');
      setLedStatus('cycle_on');
    }
    if (decodedValue === 'Cycle B On') {
      setPumpStatus('Pump_ON');
      setSolAStatus('pressure');
      setSolBStatus('vacuum');
      setSolCStatus('pressure');
      setLedStatus('cycle_on');
    }
    if (decodedValue === 'Cycle B OFF') {
      setPumpStatus('Pump_OFF');
      setSolAStatus('hold_pressure');
      setSolBStatus('hold_vacuum');
      setSolCStatus('hold_pressure');
      setLedStatus('cycle_on');
    }
    if (decodedValue === 'Cycle C On') {
      setPumpStatus('Pump_ON');
      setSolAStatus('pressure');
      setSolBStatus('pressure');
      setSolCStatus('vacuum');
      setLedStatus('cycle_on');
    }
    if (decodedValue === 'Cycle C OFF') {
      setPumpStatus('Pump_OFF');
      setSolAStatus('hold_pressure');
      setSolBStatus('hold_pressure');
      setSolCStatus('hold_vacuum');
      setLedStatus('cycle_on');
    }
    if (decodedValue === 'Cycle OFF') {
      setLedStatus('cycle_off');
      setSolAStatus('pressure');
      setSolBStatus('pressure');
      setSolCStatus('pressure');
      setPumpStatus('Pump_OFF');
      setIsStoppingCycle(false);
    }
    if (decodedValue === 'setupFinished' || decodedValue === 'deenergies all') {
      setSolAStatus('pressure');
      setSolBStatus('pressure');
      setSolCStatus('pressure');
    }
    if (decodedValue === 'Pump ON') {
      setPumpStatus('Pump_ON');
    }
    if (decodedValue === 'Pump OFF') {
      setPumpStatus('Pump_OFF');
    }
  };
  const DisconnectFromDevice = async () => {
    if (!connectedDevice) {
      console.log('No device currently connected');
      return;
    }
    try {
      if (disconnectSubscription) {
        disconnectSubscription.remove();
        setDisconnectSubscription(null);
      }

      await bleManager.cancelDeviceConnection(connectedDevice.id);
      setIsConnected(false);
      setConnectedDevice(null);
      setIsConnecting(false);
      setDevices([]);
      console.log('Disconnected from device', connectedDevice.name);

      Alert.alert('Device Disconnected', 'Successfully disconnected from the cushion.');
    } catch (error) {
      console.log('Error disconnecting from device', error);
      Alert.alert('Error', 'Failed to disconnect from the device');
    }
  };

  const deviceDisconnected = () => {
    setIsConnected(false);
    setConnectedDevice(null);
    setDevices([]);
    Alert.alert('Device Disconnected', 'Successfully disconnected from the cushion.');
  }

  const togglecycle = async (status: string, halfcycleValue: number, pumpTime: number, pumpSpeed: number) => {
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

      if (pumpSpeed < 0 || pumpSpeed > 255) {
        console.log('Invalid pump speed value');
        Alert.alert('Invalid pump speed', 'Pump speed must be between 0 and 255');
        return;
      }

      if (halfcycleValue / 1000 >= 600 || pumpTime / 1000 >= 31) {
        console.log('Invalid time values');
        Alert.alert('Invalid time values');
        return;
      }
      const fullcycleValue = halfcycleValue * 3;
      const timeMessage = `set_params;${fullcycleValue};${pumpTime};${pumpSpeed}`;
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
          )
        })
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
        )
      })
  }

  const toggleSolA = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');
      return;
    }

    try {
      console.log('Sending solenoid A command:', status);
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
          )
        })
      // State will be updated by handleNotification when server responds
    } catch (error) {
      console.log('Error sending solenoid A command:', error);
      Alert.alert('Error', 'Failed to send command to device');
    }
  };

  const toggleSolB = async (status: string) => {
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
        )
      })
  };

  const toggleSolC = async (status: string) => {
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
        )
      })
  };

  const handlePumpSpeedChange = (value: number) => {
    const boundedValue = Math.min(Math.max(value, 0), 255);
    setPumpSpeed(boundedValue);
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
            style={[styles.mainButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60 }]}
          >
            <View style={{ flexDirection: 'column', marginRight: 10 }}>
              <Text style={{ color: 'white', textAlign: 'center' }}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            {!isConnected && (
              <Image
                source={require('./imgs/qrcodeIcon.png')}
                style={{ width: 20, height: 20, tintColor: 'white' }}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              togglecycle(ledStatus === 'cycle_on' ? 'cycle_off' : 'cycle_on', halfcycleValue * 1000, pumpTime * 1000, pumpSpeed);
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
              onChangeText={(text) => handlePumpSpeedChange(parseInt(text) || 0)}
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
    width: 160,
    height: 60,
    backgroundColor: '#008080',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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



