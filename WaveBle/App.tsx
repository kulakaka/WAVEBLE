import React, { useEffect, useState } from 'react';
import { Button, View, 
  Text, 
  PermissionsAndroid, 
  Platform, Alert, 
  SafeAreaView,ScrollView,
  TouchableOpacity,
  StyleSheet
   } from 'react-native';
import { BleManager, Characteristic, Device, State } from 'react-native-ble-plx';
// import utf8 from 'utf8';
import  base64  from 'react-native-base64';


const SERVICE_UUID ="4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID_TX = "db000752-8165-4eca-bcbd-8cad0f11127c"

const bleManager = new BleManager();

const App = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  //What device is connected?
  const [connectedDevice,setConnectedDevice] = useState<Device | null>(null);
  //Is a device connected?
  const [isConnected, setIsConnected] = useState(false);
  const [isModealVisible, setIsModealVisible] = useState(false);
  const [ledStatus, setLedStatus] = useState('OFF');


  useEffect(() => {
   
      const subscription =  bleManager.onStateChange(async state => {
        
        if (state === 'PoweredOn') {
          console.log('BLE powered on');
          await requestPermissions();
        }
      }, true);
        
      return () => 
        subscription.remove();
    },[bleManager]
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
    try{
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
        console.log('Device found',device);
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
      console.log('Connected to device', device.name);
      setIsConnected(true);
      setConnectedDevice(device);
      setIsModealVisible(true);
      return device.discoverAllServicesAndCharacteristics();
    })
    return true;

  };

  const DisconnectFromDevice = async () => {
    if (!connectedDevice){
      console.log('No device currently connected');
      return;
    }
    if (connectedDevice.id !== connectedDevice.id){
      console.log('The device you are trying to disconnect is not the connected device');
      return;
    }
    try{
      await bleManager.cancelDeviceConnection(connectedDevice.id);
      // await connectedDevice.cancelConnection();
      setIsConnected(false);
      setConnectedDevice(null);
      console.log('Disconnected from device', connectedDevice.name);
    }catch(error){
      console.log('Error disconnecting from device', error);
    }
  };

  const toggleLed = async (status: string) => {
    if (!connectedDevice) {
      console.log('No device connected');
      return;
    }
    
    if (status === 'OFF') 
      {
        bleManager.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID_TX,
          base64.encode('1')
        )
        .then(Characteristic => {
          console.log('LED Turned ON');
        }
        )
      }
    if (status === 'ON') 
      {
        bleManager.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          SERVICE_UUID,
          CHARACTERISTIC_UUID_TX,
          base64.encode('2')
        )
        .then(Characteristic => {
          console.log('LED Turned OFF');
        }
        )
      }



    setLedStatus(status);
  };

  return (
    
    <SafeAreaView>
        <Text>Wave Therapeutics BLE App</Text>
         {/* Connect Button */}
      <View>
        <TouchableOpacity style={{width: 120}}>
          {!isConnected ? (
            <Button
              title="Connect"
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
        <Button title="Toggle LED" onPress={() => toggleLed(ledStatus === 'ON' ? 'OFF' : 'ON')} />
      </View>
    </SafeAreaView>
  );
};

export default App;


