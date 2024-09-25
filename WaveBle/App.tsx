import React, { useEffect, useState } from 'react';
import { Button, View, Text, PermissionsAndroid, Platform, Alert, SafeAreaView } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';

import OnTheDevice from './useBLE';
import OffTheDevice from './useBLE';


const App = () => {
  const [bleManager] = useState(new BleManager());
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const subscription = bleManager.onStateChange(state => {
      if (state === 'PoweredOn') {
        console.log('BLE powered on');
        scanAndConnect();
        subscription.remove();
      }
      else {
        console.log('BLE is not available');
      }
    }, true);
    (async () => {
      if (Platform.OS === 'android' && Platform.Version >= 23) {
        await requestPermissions();
      }
    })();
    return () => {
      bleManager.destroy(); // Cleanup on component unmount
    };
  }, [bleManager]);

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
    bleManager.startDeviceScan(null, null, (error, device) => {
      console.log(device);
      if (error) {
        console.log('error', error);
        return;
      }
      if (device && device.name === 'ESP32') {
        
        setDevices((prevState) => {
          if (!prevState.find((prevDevice) => prevDevice.id === device.id)) {
            return [...prevState, device];
          }
          connect(device);
          bleManager.stopDeviceScan();
          console.log('Device found:', device);
          return prevState;
        })
        
    }});
  };

  const connect = async (device: Device) => { 
    try{
      const connectedDevice = await bleManager.connectToDevice(device.id);
      console.log('Connected to device', connectedDevice.name);

      await connectedDevice.discoverAllServicesAndCharacteristics();
    }catch(error){
      console.log('Error connecting to device', error);
    }
  };


  const stopScan = () => {
    bleManager.stopDeviceScan();
    setScanning(false);
    setDevices([]);
  }; 

  const DisconnectFromDevice = async () => {
    if (devices.length === 0) {
      console.log('No devices to disconnect');
      return;
    }
    const device = devices[0]; // Assuming you want to disconnect the first device in the list
    try{
      await bleManager.cancelDeviceConnection(device.id);
      console.log('Disconnected from device');
    }catch(error){
      console.log('Error disconnecting from device', error);
    }
  };


  return (
    <SafeAreaView>
      <View>
        <Text>Wave Therapeutics BLE App</Text>
        <Button title="Scan for Devices" onPress={scanAndConnect} />
        <Button title="Stop Scan" onPress={stopScan} />
        <Button title="Disconnect" onPress={DisconnectFromDevice} />
        {/* <Button title="Turn On Device" onPress={OnTheDevice()} />
        <Button title="Turn Off Device" onPress={OffTheDevice()} /> */}
      </View>
    </SafeAreaView>
  );
};

export default App;
