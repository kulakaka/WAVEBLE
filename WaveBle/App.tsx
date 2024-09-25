import React, { useEffect, useState } from 'react';
import { Button, View, Text, PermissionsAndroid, Platform, Alert, SafeAreaView } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';

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
        bleManager.stopDeviceScan();
        console.log('Device found:', device);
      }
    });
  };

  const stopScan = () => {
    bleManager.stopDeviceScan();
  }; 

  
  return (
    <SafeAreaView>
      <View>
        <Text>Wave Therapeutics BLE App</Text>
        <Button title="Scan for Devices" onPress={scanAndConnect} />
          
        <Button title="Termiate The Connection" onPress={stopScan} />
      </View>
    </SafeAreaView>
  );
};

export default App;
