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
import CushionAnimation from './components/CushionAnimation';

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
  const [pumpStatus, setPumpStatus] = useState<'Pump_ON' | 'Pump_OFF'>('Pump_OFF');
  const [solAStatus, setSolAStatus] = useState<'pressure' | 'vaccum' | 'hold'>('hold');
  const [solBStatus, setSolBStatus] = useState<'pressure' | 'vaccum' | 'hold'>('hold');
  const [solCStatus, setSolCStatus] = useState<'pressure' | 'vaccum' | 'hold'>('hold');

  const [text, onChangeText] = React.useState("");
  const [outputText, setOutputText] = useState('Output will be displayed here...');
  const [fullcycleValue, setfullcycleValue] = useState(0);
  const [halfcycleValue, sethalfcycleValue] = useState(120);
  const [pumpSpeed, setPumpSpeed] = useState(10);
  const [pumpPressureTime, setPumpPressureTime] = useState(7);
  const [pumpVaccumTime, setPumpVaccumTime] = useState(9);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraAuthorized, setCameraAuthorized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isStoppingCycle, setIsStoppingCycle] = useState(false);
  const [disconnectSubscription, setDisconnectSubscription] = useState<any>(null);
  const [currentZone, setCurrentZone] = useState<'A' | 'B' | 'C' | null>(null);

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

  // Request necessary permissions for BLE operations
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

  // Scan for a device using a QR code and connect to it
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

  // Setup a listener for device disconnection
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
        setSolAStatus('hold');
        setSolBStatus('hold');
        setSolCStatus('hold');
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

  // Connect to a device
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

  // Handle notifications from the device firmware
  const handleNotification = (decodedValue: string) => {
    console.log('Raw notification received:', decodedValue);

    if (decodedValue.split(';').length === 4) {
      const params = decodedValue.split(';');
      console.log('Correct number of parameters found');
      const storedCycleTime = parseInt(params[0]) / 3000;
      const storedPumpTime = parseInt(params[1]) / 1000;
      const storedPumpSpeed = parseInt(params[2]);
      const storedCycleStatus = params[3] === '1';
      const actualPumpSpeed = Math.round((storedPumpSpeed - 230) / 2.5);

      console.log('Parsed values:');
      console.log('Cycle Time:', storedCycleTime);
      console.log('Pump Pressure Time:', storedPumpTime);
      console.log('Pump Vaccum Time:', storedPumpTime);
      console.log('Pump Speed:', actualPumpSpeed);
      console.log('Cycle Status:', storedCycleStatus);

      sethalfcycleValue(storedCycleTime);
      setPumpSpeed(actualPumpSpeed);
      setPumpPressureTime(storedPumpTime);
      setPumpVaccumTime(storedPumpTime);
      setLedStatus(storedCycleStatus ? 'cycle_on' : 'cycle_off');
    }

    if (decodedValue === 'A Pressure') {
      console.log('Received A Pressure');
      setSolAStatus('vaccum');
    }
    if (decodedValue === 'A Vaccum') {
      console.log('Received A Vaccum');
      setSolAStatus('hold');
    }
    if (decodedValue === 'A Hold') {
      console.log('Received A Hold');
      setSolAStatus('pressure');
    }
    if (decodedValue === 'B Pressure') {
      console.log('Received B Pressure');
      setSolBStatus('vaccum');
    }
    if (decodedValue === 'B Vaccum') {
      console.log('Received B Vaccum');
      setSolBStatus('hold');
    }
    if (decodedValue === 'B Hold') {
      console.log('Received B Hold');
      setSolBStatus('pressure');
    }
    if (decodedValue === 'C Pressure') {
      console.log('Received C Pressure');
      setSolCStatus('vaccum');
    }
    if (decodedValue === 'C Vaccum') {
      console.log('Received C Vaccum');
      setSolCStatus('hold');
    }
    if (decodedValue === 'C Hold') {
      console.log('Received C Hold');
      setSolCStatus('pressure');
    }
    if (decodedValue === 'Cycle ON') {
      setLedStatus('cycle_on');
    }

    if (decodedValue === 'Cycle OFF') {
      setLedStatus('cycle_off');
      setSolAStatus('hold');
      setSolBStatus('hold');
      setSolCStatus('hold');
      setPumpStatus('Pump_OFF');
      setIsStoppingCycle(false);
      setCurrentZone(null);
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
    if (decodedValue === 'VHP') {
      setPumpStatus('Pump_ON');
      setSolAStatus('vaccum');
      setSolBStatus('hold');
      setSolCStatus('pressure');
      setCurrentZone('A');
    }
    if (decodedValue === 'PVH') {
      setPumpStatus('Pump_ON');
      setSolAStatus('pressure');
      setSolBStatus('vaccum');
      setSolCStatus('hold');
      setCurrentZone('B');
    }
    if (decodedValue === 'HPV') {
      setPumpStatus('Pump_ON');
      setSolAStatus('hold');
      setSolBStatus('pressure');
      setSolCStatus('vaccum');
      setCurrentZone('C');
    }
    if (decodedValue === 'HOLD') {
      setSolAStatus('hold');
      setSolBStatus('hold');
      setSolCStatus('hold');
      setPumpStatus('Pump_OFF');
    }
  };

  // Disconnect from the currently connected device
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


  const togglecycle = async (status: string, halfcycleValue: number, pumpPressureTime: number, pumpVaccumTime: number) => {
    console.log('Toggle Cycle:', status);
    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');
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
      console.log('Pump Speed:', pumpSpeed);

      // Validate pump speed (1-10)
      if (pumpSpeed < 1 || pumpSpeed > 10) {
        console.log('Invalid pump speed value');
        Alert.alert(
          'Invalid pump speed',
          'Pump speed must be between 1 and 10',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validate half cycle time (45-3600 seconds)
      const halfCycleSeconds = halfcycleValue / 1000;
      if (halfCycleSeconds < 45 || halfCycleSeconds > 3600) {
        console.log('Invalid half cycle time');
        Alert.alert('Invalid half cycle time', 'Half cycle time must be between 45 and 3600 seconds');
        return;
      }


      // Calculate actual pump speed
      const actualPumpSpeed = Math.round(2.5 * pumpSpeed + 230);
      console.log('Actual Pump Speed:', actualPumpSpeed);


      const timeMessage = `set_params;${halfcycleValue};${pumpPressureTime};${pumpVaccumTime};${actualPumpSpeed}`;
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
        base64.encode("A_" + status)
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
      base64.encode("B_" + status)
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
      base64.encode("C_" + status)
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

  const handlePumpPressureChange = (value: number) => {
    const boundedValue = Math.min(Math.max(value, 0), 255);
    setPumpPressureTime(boundedValue);
  };

  const handlePumpVaccumChange = (value: number) => {
    const boundedValue = Math.min(Math.max(value, 0), 255);
    setPumpVaccumTime(boundedValue);
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
              togglecycle(ledStatus === 'cycle_on' ? 'cycle_off' : 'cycle_on', halfcycleValue * 1000, pumpPressureTime * 1000, pumpVaccumTime * 1000);
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
      <View style={styles.controlsContainer}>
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
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.inputsRow}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.numericInput}
              keyboardType='numeric'
              onChangeText={(text) => handleCycleChange(text)}
              value={halfcycleValue.toString()}
            />
            <Text style={styles.smallInputLabel}>Cycle Time</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.numericInput}
              keyboardType='numeric'
              onChangeText={(text) => handlePumpPressureChange(parseInt(text) || 0)}
              value={pumpPressureTime.toString()}
            />
            <Text style={styles.smallInputLabel}>Pressure Time</Text>
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.numericInput}
              keyboardType='numeric'
              onChangeText={(text) => handlePumpVaccumChange(parseInt(text) || 0)}
              value={pumpVaccumTime.toString()}
            />
            <Text style={styles.smallInputLabel}>Vaccum Time</Text>
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

        <View style={styles.waveContainer}>
          <CushionAnimation
            isPlaying={ledStatus === 'cycle_on'}
            currentZone={currentZone}
            pumpStatus={pumpStatus}
            pumpPressureTime={pumpPressureTime * 1000}
            pumpVacuumTime={pumpVaccumTime * 1000}
          />
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
  waveContainer: {
    height: "60%",
    width: "100%",
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
    padding: 5,
    marginTop: 0,
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    marginTop: 15,
    marginBottom: 5,
    paddingHorizontal: 16,
  },
  mainButton: {
    width: "45%",
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



