import React, { useEffect, useState, } from 'react';
import {
  Button, View,
  Text,
  PermissionsAndroid,
  Platform, Alert,
  SafeAreaView, ScrollView,
  TouchableOpacity, TextInput,
  StyleSheet
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
  const [ledStatus, setLedStatus] = useState('OFF');
  const [pumpStatus, setPumpStatus] = useState('OFF');
  const [solAStatus, setSolAStatus] = useState('OFF');
  const [solBStatus, setSolBStatus] = useState('OFF');
  const [solCStatus, setSolCStatus] = useState('OFF');

  const [text, onChangeText] = React.useState("");
  const [outputText, setOutputText] = useState('Output will be displayed here...');
  const [fullcycleValue, setfullycycleValue] = useState(0);
  const [halfccycleValue, sethalfcycleValue] = useState(0);
  const [pumpTime, setPumpTime] = useState(0);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraAuthorized, setCameraAuthorized] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

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
    return true;

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
    } catch (error) {
      console.log('Error disconnecting from device', error);
    }
  };

  const toggleLed = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      setOutputText(prevText => `${prevText}\n${'No device connected'}`)
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
              console.log('LED Status:', decodedValue);
              setOutputText(prevText => `${prevText}\n${decodedValue}`)

            }
          )
        })
    
    setLedStatus(status);
  };

  
const handleCycleChange = (text: any) => {
  setfullycycleValue(text);
  const halfCycle = text / 2;
  sethalfcycleValue(halfCycle);

}

const handlePumpChange = (text: any) => {
  setPumpTime(text);
}


  const togglePump = async (status: string) => {

    if (!connectedDevice) {
      console.log('No device connected');
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
            console.log('Pump Status:', decodedValue);
            setOutputText(prevText => `${prevText}\n${decodedValue}`)

          }
        )
      })
    setPumpStatus(status);
  }

  const stopAll = async () => {
    if(!connectedDevice){
      console.log('No device connected');
      return;
    }
    bleManager.writeCharacteristicWithResponseForDevice(
      connectedDevice.id,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_TX,
      base64.encode('stop')
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
            console.log('Stop Status:', decodedValue);
            setOutputText(prevText => `${prevText}\n${decodedValue}`)

          }
        )
      })  
  };

  const toggleSolA = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
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
            console.log('SolA Status:', decodedValue);
            setOutputText(prevText => `${prevText}\n${decodedValue}`)

          }
        )
      })
    setSolAStatus(status);
  };

  const toggleSolB = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
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
            console.log('SolB Status:', decodedValue);
            setOutputText(prevText => `${prevText}\n${decodedValue}`)

          }
        )
      })
    setSolBStatus(status);

  };

  const toggleSolC = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
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
            console.log('SolC Status:', decodedValue);
            setOutputText(prevText => `${prevText}\n${decodedValue}`)

          }
        )
      })
    setSolCStatus(status);
  };

  const updateCycleTime = (fullcycleValue:number,pumpTime:number)=>{
     if (!connectedDevice) {
      console.log('No device connected');
      return;
     }
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
              console.log('Cycle Time Status:', decodedValue);
              setOutputText(prevText => `${prevText}\n${decodedValue}`)

            }
          )
        })
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
            console.log('Pump PWM Status:', decodedValue);
            setOutputText(prevText => `${prevText}\n${decodedValue}`)

          }
        )
      })
  };

  
  return (

    <SafeAreaView>
      <Text style={{ fontSize: 20, textAlign: 'center', fontWeight: 'bold' }}>Wave Therapeutics BLE TEST App</Text>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 10, marginTop: 20 }}>

          <Button title="Pump" onPress={() => togglePump(pumpStatus === 'Pump_ON' ? 'Pump_OFF' : 'Pump_ON')} />
          <Button title="Sol A" onPress={() => toggleSolA(solAStatus === 'SolA_ON' ? 'SolA_OFF' : 'SolA_ON')} />
          <Button title="Sol B" onPress={() => toggleSolB(solBStatus === 'solb_on' ? 'solb_off' : 'solb_on')} />
          <Button title="Sol C" onPress={() => toggleSolC(solCStatus === 'solc_on' ? 'solc_off' : 'solc_on')} />

        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
          <TouchableOpacity style={{ width: 120 }}>
            {!isConnected ? (
              <Button
                title="Connect ble"
                onPress={() => {
                  scanAndConnect();
                }}
                disabled={false}
              />
            ) : (
              <Button
                title="Disonnect"
                onPress={() => {
                  DisconnectFromDevice();
                }}
                disabled={false}
              />
            )}
          </TouchableOpacity>
          <Button title="STOP" onPress={() => stopAll()} />
          <Button title="Cycle On And Off" onPress={() => toggleLed(ledStatus === 'cycle_on' ? 'cycle_off' : 'cycle_on')} />

          <Button title="qr code" onPress={() => setIsScannerVisible(true)} />
        </View>
      </View>
      
      <View>
        <TextInput
          style={styles.input}
          keyboardType='numeric'
          onChangeText={(text) => {handleCycleChange(text)}}
          // value={fullcycleValue}
          placeholder='Fully Cycle Time'
        />
        <Text style={{ margin: 12, }}>PARTIAL CYCLE TIME: {halfccycleValue}</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text)=>{handlePumpChange(text)}}
          keyboardType='numeric'
          placeholder='PUMP ON TIME (Less than PCT)'
        />

      </View>
      <Button title="Update new paramters" onPress={() => {updateCycleTime(fullcycleValue,pumpTime)}} />
        <Text style={{ margin:0 ,fontWeight:'bold' }}>PWM CONTROL PUMP:  {sliderValue}</Text>
      <Slider
        style={{width: "100%", height: 60}}
        minimumValue={0}
        maximumValue={255}
        step={1}
        value={0}
        minimumTrackTintColor="#000000"
        maximumTrackTintColor="#000000"
        onValueChange={(value) => handleSliderChange(value)}
      />

      <View>
        <ScrollView style={{ margin: 10, maxHeight: 500, borderWidth: 0, padding: 10 }}>
          <Text>{outputText}</Text>
        </ScrollView>
      </View>
      {isScannerVisible && (
        <View style={styles.scannerContainer}>
          <Button title="Close Scanner" onPress={() => setIsScannerVisible(false)} />

          <QRCodeScanner
            onRead={(e) => {
              console.log('QR Code:', e.data);
              scanQrAndConnect(e.data);
              setIsScannerVisible(false);
            }}
            cameraStyle={styles.camera}
          />
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
    position: 'relative',
    height:"100%",
    width: "100%",
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  camera: {
    width: "100%",
    height: "100%",
  },
});
export default App;


