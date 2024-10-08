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
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Input } from '@mui/material';
import QRCodeScannerScreen from './compnents/QRScannerScreen';

const Stack = createNativeStackNavigator();
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
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {

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

    if (status === 'OFF') {
      bleManager.writeCharacteristicWithResponseForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        base64.encode('2')
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
    }
    if (status === 'ON') {
      bleManager.writeCharacteristicWithResponseForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        base64.encode('1')
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
    }
    setLedStatus(status);
  };

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
  }


  return (

    <SafeAreaView>
      <Text style={{ fontSize: 20, textAlign: 'center', fontWeight: 'bold' }}>Wave Therapeutics BLE TEST App</Text>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 10, marginTop: 20 }}>

          <Button title="Pump" onPress={() => togglePump(pumpStatus === 'Pump_ON' ? 'Pump_OFF' : 'Pump_ON')} />
          <Button title="Sol A" onPress={() => toggleSolA(solAStatus === 'SolA_ON' ? 'SolA_OFF' : 'SolA_ON')} />
          <Button title="Sol B" onPress={() => toggleSolB(solAStatus === 'SolB_ON' ? 'SolB_OFF' : 'SolB_ON')} />
          <Button title="Sol c" onPress={() => toggleSolC(solAStatus === 'SolC_ON' ? 'SolC_OFF' : 'SolC_ON')} />

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
          <Button title="Cycle On And Off" onPress={() => toggleLed(ledStatus === 'ON' ? 'OFF' : 'ON')} />

          <Button title="qr code" onPress={() => { }} />
        </View>
      </View>
      <View>
        <TextInput
          style={styles.input}
          onChangeText={onChangeText}
          value={text}
          placeholder='Full Cycle Time'
        />
        <Text style={{ margin: 12, }}>PARTIAL CYCLE TIME:</Text>
        <TextInput
          style={styles.input}
          onChangeText={onChangeText}
          value={text}
          placeholder='Full Cycle Time'
        />

      </View>
      <Button title="ON AND OFF" onPress={() => { }} />
      <View>
        <ScrollView style={{ margin: 10, maxHeight: 500, borderWidth: 0, padding: 10 }}>
          <Text>{outputText}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>


  );
};
const styles = StyleSheet.create({
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
export default App;


