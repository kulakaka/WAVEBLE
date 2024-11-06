import React, { useEffect, useState, } from 'react';
import {
  Button, View,
  Text,
  PermissionsAndroid,
  Platform, Alert,
  SafeAreaView, ScrollView,
  TouchableOpacity, TextInput,
  StyleSheet,Image
} from 'react-native';
import { BleManager, Characteristic, Device, State } from 'react-native-ble-plx';
// import utf8 from 'utf8';
import base64 from 'react-native-base64';
import QRCodeScanner from 'react-native-qrcode-scanner';
import Slider from '@react-native-community/slider';
import { RNCamera } from 'react-native-camera';
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
  const [cycleStatus, setCycleStatus] = useState('cycle_off');
  const [pumpStatus, setPumpStatus] = useState('Pump_OFF');
  const [solAStatus, setSolAStatus] = useState('sola_on');
  const [solBStatus, setSolBStatus] = useState('solb_on');
  const [solCStatus, setSolCStatus] = useState('solc_on');

  const [text, onChangeText] = React.useState("");
  const [outputText, setOutputText] = useState('Output will be displayed here...');
  const [fullcycleValue, setfullycycleValue] = useState(0);
  const [halfccycleValue, sethalfcycleValue] = useState(0);
  const [pumpTime, setPumpTime] = useState(0);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraAuthorized, setCameraAuthorized] = useState(false);
  const [sliderValue, setSliderValue] = useState(255);
  const [isConnecting, setIsConnecting] = useState(false);
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


  const scanAndConnect = () => {
    try {
      bleManager.startDeviceScan(null, null, (error, device) => {
        console.log(device?.name);
        if (error) {
          console.log('error', error);
          return;
        }
        if (device && device.name) {
          setDevices((prevState) => {
            if (!prevState.find((prevDevice) => prevDevice.id === device.id)) {
              return [...prevState, device];
            }
            return prevState;
          });

          if (device.name === 'ESP32') {
            console.log('Device found', device.name);
            setConnectedDevice(device);
            bleManager.stopDeviceScan();
            connect(device);

          }
        }
      });
    } catch (error) {
      console.log('Error scanning for devices', error);
    }
  };

  const scanQrAndConnect = (qr:string) => { 
    try {
      bleManager.startDeviceScan(null, null, (error, device) => {
        console.log(device?.id);
        if (error) {
          console.log('error', error);
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
            connect(device);

          }
        }
      });
    } catch (error) {
      console.log('Error scanning for devices', error);
    }
  };



  const connect = async (device: Device) => {
    console.log('Connecting to device', device.id);
    // bleManager.connectToDevice(device.id)
    await bleManager.connectToDevice(device.id)
      .then((device) => {
        console.log('Connected to device', device.id);
        setIsConnected(true);
        setConnectedDevice(device);
        setIsModealVisible(true);
        return device.discoverAllServicesAndCharacteristics();
      })
        .then(() => {
        bleManager.monitorCharacteristicForDevice(
          device.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID_TX,
          (error, characteristic) => {
            if (error) {
              console.log('Error monitoring characteristic', error);
              Alert.alert('Error monitoring characteristic');
              return;
            }
            const value = characteristic?.value;
            const decodedValue = value ? base64.decode(value) : '';
            handleNotification(decodedValue);
          }
        )
      }
      )
      .catch((error) => {
        console.log('Connection error', error);
      });
    return true;

  };
// Function to start monitoring characteristic
const startMonitoringCharacteristic = () => {
  if (connectedDevice) {
    bleManager.monitorCharacteristicForDevice(
      connectedDevice.id, 
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      (error, characteristic) => {
        if (error) {
          console.log('Error monitoring characteristic', error);
          Alert.alert("error monitoring characteristic");
          return;
        }
        const value = characteristic?.value;
        const decodedValue = value ? base64.decode(value) : '';
        console.log('Notification received:', decodedValue);
        
        // Update UI based on the received notification
        handleNotification(decodedValue);
      }
    );
  }
};

// Function to handle BLE notification and update UI accordingly
const handleNotification = (decodedValue: string) => {
  console.log('Notification received:', decodedValue);
  if (decodedValue === 'Solenoid A ON') {
    setSolAStatus('sola_on');

  }
  if (decodedValue === 'Solenoid B ON') {
    setSolBStatus('solb_on');
  }
  if (decodedValue === 'Solenoid C ON') {

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
    setPumpStatus('Pump_ON');
  }
  if (decodedValue === 'Pump OFF') {
    setPumpStatus('Pump_OFF');
  }
  if (decodedValue === 'Cycle ON') {
    setCycleStatus('cycle_on');
    setSolAStatus('sola_on');
    setSolBStatus('solb_off');
    setSolCStatus('solc_off');
    setPumpStatus('Pump_ON');
  }
  if (decodedValue === 'Cycle A On') {
    // setCycleStatus('cycle_on');
    setSolAStatus('sola_on');
    setSolBStatus('solb_off');
    setSolCStatus('solc_off');
    setPumpStatus('Pump_ON');
  }
  if (decodedValue === 'Cycle B On') {
    // setCycleStatus('cycle_on');
    setSolAStatus('sola_off');
    setSolBStatus('solb_on');
    setSolCStatus('solc_off');
    setPumpStatus('Pump_ON');
  }
  if (decodedValue === 'Cycle C On') {
    // setCycleStatus('cycle_on');
    setSolAStatus('sola_off');
    setSolBStatus('solb_off');
    setSolCStatus('solc_on');
    setPumpStatus('Pump_ON');
  }

  if (decodedValue === 'Cycle OFF') {
    setCycleStatus('cycle_off');
    setSolAStatus('sola_on');
    setSolBStatus('solb_on');
    setSolCStatus('solc_on');
    setPumpStatus('Pump_OFF');
  }
  if (decodedValue === 'setupFinished') {
    setSolAStatus('sola_on');
    setSolBStatus('solb_on');
    setSolCStatus('solc_on');
    console.log('setupFinished');
  }
  if (decodedValue === 'deenergies all') {
    setSolAStatus('sola_on');
    setSolBStatus('solb_on');
    setSolCStatus('solc_on');
  }

  if (decodedValue !== 'Solenoid A ON' && decodedValue !== 'Solenoid B ON' && decodedValue !== 'Solenoid C ON' && decodedValue !== 'Pump ON' && decodedValue !== 'Pump OFF' && decodedValue !== 'Cycle ON' && decodedValue !== 'Cycle OFF' && decodedValue !== 'All Solenoids OFF') {
    console.log('Unknown status:', decodedValue);
  }
};
  const DisconnectFromDevice = async () => {
    if (!connectedDevice) {
      console.log('No device currently connected');
      return;
    }
    if (connectedDevice.id !== connectedDevice.id) {
      console.log('The device you are trying to disconnect is not the connected device');
      return;
    }
    try {
      await bleManager.cancelDeviceConnection(connectedDevice.id);
      setIsConnected(false);
      setConnectedDevice(null);
 
      console.log('Disconnected from device', connectedDevice.name);
      setIsConnecting(false);
    } catch (error) {
      console.log('Error disconnecting from device', error);
    }
  };

  const toggleCycle = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      Alert.alert('No device connected');
      setOutputText(prevText => `${prevText}\n${'No device connected'}`)
      return;
    }
    if (status === 'cycle_on') {
      //hardcode reset values
      // setPumpStatus('Pump_ON');
      // setSolBStatus('solb_off');
      // setSolCStatus('solc_off');
      setfullycycleValue(360);
      setPumpTime(30);
    }
    else {
      setfullycycleValue(0);  
      setPumpTime(0);
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
              Alert.alert('Error monitoring characteristic');
              return;
            }
            const value = characteristic?.value;
            const decodedValue = value ? base64.decode(value) : '';
            handleNotification(decodedValue);
          }
        )
      }
      )
    setCycleStatus(status);
  };

  
const handleCycleChange = (text: any) => {
  setfullycycleValue(text);
  const halfCycle = text / 3;
  sethalfcycleValue(halfCycle);

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
    
  // setPumpStatus(status);
  .then(() => {
    bleManager.monitorCharacteristicForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      (error, characteristic) => {
        if (error) {
          console.log('Error monitoring characteristic', error);
          Alert.alert('Error monitoring characteristic');
          return;
        }
        const value = characteristic?.value;
        const decodedValue = value ? base64.decode(value) : '';
        handleNotification(decodedValue);
      }
    )
  }
)
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
    
    // setSolAStatus(status);
    .then(() => {
      bleManager.monitorCharacteristicForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            console.log('Error monitoring characteristic', error);
            Alert.alert('Error monitoring characteristic');
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      )
    }
  )
  };

  const toggleSolB = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      // Alert.alert('No device connected');

      return;
    }
    console.log('SolB Status:', status);
    bleManager.writeCharacteristicWithResponseForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      base64.encode(status)
    )
     
    // setSolBStatus(status);
    .then(() => {
      bleManager.monitorCharacteristicForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            console.log('Error monitoring characteristic', error);
            // Alert.alert('Error monitoring characteristic');
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      )
    }
  )

  };

  const toggleSolC = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      // Alert.alert('No device connected');

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
            // Alert.alert('Error monitoring characteristic');
            return;
          }
          const value = characteristic?.value;
          const decodedValue = value ? base64.decode(value) : '';
          handleNotification(decodedValue);
        }
      )
    }
  )
  };

  const updateCycleTime = (fullcycleValue:number,pumpTime:number)=>{
     if (!connectedDevice) {
      console.log('No devics connected');
      Alert.alert('No device connected');

      return;
     }

     if (fullcycleValue >= 1800000 || pumpTime >= 30000) {
      console.log('Invalid time values');
      Alert.alert('FCT must be less than 30 minutes and PCT must be less than 30 seconds');
      return;
    }
    // setSolAStatus('sola_on');
    // setPumpStatus('Pump_ON');
    // setSolBStatus('solb_off');
    // setSolCStatus('solc_off');
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
        )

        // Alert.alert('Cycle time updated successfully');
      } )
  
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    console.log('Slider Value:', value);

    if (!connectedDevice) {
      console.log('No device connected');
      return;
    }
    bleManager.writeCharacteristicWithResponseForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      base64.encode(`pump_pwm;${value}`)
    )
 
  };



  return (

    <SafeAreaView style={styles.safeArea}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 10 }}>
        <Image
          source={require('./imgs/widelogo2.png')}
          style={{ width: '80%', height: 100, resizeMode: 'contain' }}
        />
      </View>
      <Text style={{ fontSize: 20, textAlign: 'center', fontWeight: 'bold' }}>Wheelchair Cushion Controller</Text>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 10, marginTop: 20 }}>

            <TouchableOpacity
            onPress={() => togglePump(pumpStatus === 'Pump_ON' ? 'Pump_OFF' : 'Pump_ON')}
            style={{ 
              width: 80,
              backgroundColor: !isConnected ? '#808080' : (pumpStatus === 'Pump_ON' ? '#008080' : 'gray'),
              padding: 10, 
              borderRadius: 10,
              opacity: !isConnected ? 0.5 : 1
            }}
            disabled={!isConnected}
            > 
            <Text style={{ color: 'white', textAlign: 'center' }}>
            {pumpStatus === 'Pump_ON' ? 'Pump ON' : 'Pump OFF'}
            </Text>
            </TouchableOpacity>
        
          <TouchableOpacity
            onPress={() => toggleSolA(solAStatus === 'sola_on' ? 'sola_off' : 'sola_on')}
            style={{ 
              width: 80,
              backgroundColor: !isConnected ? '#808080' : (solAStatus === 'sola_off' ? '#008080' : 'gray'),
              padding: 10, 
              borderRadius: 10,
              opacity: !isConnected ? 0.5 : 1
            }}
            disabled={!isConnected}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
            {solAStatus === 'sola_off' ? 'Zone A Ambient' : 'Zone A Vacuum'}
            </Text>
          </TouchableOpacity>
          {/* <Button title="Sol B" onPress={() => toggleSolB(solBStatus === 'solb_on' ? 'solb_off' : 'solb_on')} /> */}
          <TouchableOpacity
            onPress={() => toggleSolB(solBStatus === 'solb_on' ? 'solb_off' : 'solb_on')}
            style={{ 
              width: 80,
              backgroundColor: !isConnected ? '#808080' : (solBStatus === 'solb_off' ? '#008080' : 'gray'),
              padding: 10, 
              borderRadius: 10,
              opacity: !isConnected ? 0.5 : 1
            }}
            disabled={!isConnected}
          >
             <Text style={{ color: 'white', textAlign: 'center' }}>
            {solBStatus === 'solb_off' ? 'Zone B Ambient' : 'Zone B Vacuum'}
            </Text>
          </TouchableOpacity>
          {/* <Button title="Sol C" onPress={() => toggleSolC(solCStatus === 'solc_on' ? 'solc_off' : 'solc_on')} /> */}
          <TouchableOpacity
            onPress={() => toggleSolC(solCStatus === 'solc_on' ? 'solc_off' : 'solc_on')}
            style={{ 
              width: 80,
              backgroundColor: !isConnected ? '#808080' : (solCStatus === 'solc_off' ? '#008080' : 'gray'),
              padding: 10, 
              borderRadius: 10,
              opacity: !isConnected ? 0.5 : 1
            }}
            disabled={!isConnected}
          >
           <Text style={{ color: 'white', textAlign: 'center' }}>
            {solCStatus === 'solc_off' ? 'Zone C Ambient' : 'Zone C Vacuum'}
            </Text>
          </TouchableOpacity>

        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
            <TouchableOpacity style={{ width: 120 }}>
            {!isConnected ? (
              <TouchableOpacity
              onPress={() => {
                setIsConnecting(true);
                scanAndConnect();
              }}
              disabled={isConnecting}
              style={{
                backgroundColor: isConnecting ? 'gray' : 'blue',
                padding: 10,
                borderRadius: 10,
                alignItems: 'center',
              }}
              >
              <Text style={{ color: 'white' }}>
                {isConnecting ? "Connecting..." : "Connect BLE"}
              </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
              onPress={() => {
                DisconnectFromDevice();
              }}
              style={{
                backgroundColor: 'blue',
                padding: 10,
                borderRadius: 10,
                alignItems: 'center',
              }}
              >
              <Text style={{ color: 'white' }}>Disconnect</Text>
              </TouchableOpacity>
            )}
            </TouchableOpacity>

            <TouchableOpacity
            onPress={() => toggleCycle(cycleStatus === 'cycle_on' ? 'cycle_off' : 'cycle_on')}
            style={{ 
              width: 140,
              backgroundColor: !isConnected ? '#808080' : (cycleStatus === 'cycle_on' ? '#008080' : 'gray'),
              padding: 10, 
              borderRadius: 10,
              opacity: !isConnected ? 0.5 : 1
            }}
            disabled={!isConnected}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
            {cycleStatus === 'cycle_off' ? 'Cycle OFF' : 'Cycle ON'}
            </Text>
          </TouchableOpacity>

            {/* <Button title="qr code" onPress={() => setIsScannerVisible(true)} /> */}
            <TouchableOpacity
            onPress={() => setIsScannerVisible(true)}
            style={{ width:80,backgroundColor: 'blue', padding: 10, borderRadius: 10, }}
            >
            <Text style={{ color: 'white', textAlign: 'center' }}>QR Code</Text>
            </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>FULL CYCLE TIME in second:</Text>
          <TextInput
            style={styles.textInput}
            keyboardType='numeric'
            onChangeText={(text) => { handleCycleChange(text) }}
            placeholder=''
            value={fullcycleValue.toString()}
          />
        </View>
        
        <Text style={styles.partialCycleText}>PARTIAL CYCLE TIME in second: {halfccycleValue}</Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>PUMP ON TIME in second:</Text>
          <TextInput
            style={styles.textInput}
            keyboardType='numeric'
            onChangeText={(text) => { handlePumpChange(text) }}
            placeholder=''
            value={pumpTime.toString()}
          />
        </View>
      </View>
      {!isScannerVisible && (
        <Button title="Update new paramters" onPress={() => {updateCycleTime(fullcycleValue*1000,pumpTime*1000)}} />
      )}
    
        <Text style={{ margin:0 ,fontWeight:'bold' }}>PWM CONTROL PUMP:  {sliderValue}</Text>
      <Slider
        style={{width: "100%", height: 60}}
        minimumValue={0}
        maximumValue={255}
        step={1}
        value={255}
        minimumTrackTintColor="#000000"
        maximumTrackTintColor="#000000"
        onValueChange={(value) => handleSliderChange(value)}
      />

      {/* <View>
        <ScrollView style={{ margin: 10, maxHeight: 500, borderWidth: 0, padding: 10 }}>
          <Text>{outputText}</Text>
        </ScrollView>
      </View> */}
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
    height:"100%",
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
});
export default App;



