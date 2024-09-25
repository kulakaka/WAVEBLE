import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import { useState } from "react";

type PermissionCallback = (result:boolean) => void;

const bleManager = new BleManager();

const SERVICE_UUID ="4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID_RX = "db000752-8165-4eca-bcbd-8cad0f11127c"
const CHARACTERISTIC_UUID_TX = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

interface BluetoothLowEnergyApi {
    reqestPermission(callback:PermissionCallback):void;
    scanforDevices():void;
    allDevices: Device[];
    stopScan():void;
}

export default function useBLE(): BluetoothLowEnergyApi{
    const [allDevices, setAllDevices] = useState<Device[]>([]);

    const reqestPermission = async (callback:PermissionCallback) => {
        if(Platform.OS === 'android'){
            const grantedStatus = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'Location Permission',
                message: 'This app requires access to your location',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
                buttonNeutral: 'Ask Me Later',
            },
           );
           callback(grantedStatus === PermissionsAndroid.RESULTS.GRANTED);
        }
        else{
            callback(true);
        }
    };

    const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
        devices.findIndex((device) => nextDevice.id === device.id) > -1;

    const scanforDevices = () => {
        bleManager.startDeviceScan(null, null, (error, device) => {
            console.log(device);
            if(error){
                console.log('Error scanning for devices: ', error);
            }
            if(device && device.name?.includes("ESP32")){
                setAllDevices((prevState) => {
                    if(!isDuplicteDevice(prevState, device)){
                        return [...prevState, device];
                    }
                    return prevState;
                });
            }

        }
    );
};

const stopScan = () => {
    bleManager.stopDeviceScan();
    console.log('Scanning stopped');
};

    return {
        reqestPermission,
        scanforDevices,
        allDevices,
        stopScan,
    };
}