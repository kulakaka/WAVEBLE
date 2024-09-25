import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import { useState } from "react";

type PermissionCallback = (result:boolean) => void;

const bleManager = new BleManager();

const SERVICE_UUID ="4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID_RX = "db000752-8165-4eca-bcbd-8cad0f11127c"
const CHARACTERISTIC_UUID_TX = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

interface BluetoothLowEnergyApi {
    OnTheDevice():void;
    OffTheDevice():void;
    // allDevices: Device[];
}

export default function useBLE(): BluetoothLowEnergyApi{
    
    const OnTheDevice = async () => {
        const deviceIdentifier = "your-device-identifier"; // Replace with actual device identifier
        const isConnected = await bleManager.isDeviceConnected(deviceIdentifier);
        if (isConnected) {
            console.log('Device is connected');
            try {
                await bleManager.writeCharacteristicWithResponseForDevice(
                    deviceIdentifier, SERVICE_UUID, CHARACTERISTIC_UUID_TX, btoa("1")
                );
                console.log('Write successful');
            } catch (error) {
                console.log('Write failed', error);
            }
        }
    };

    const OffTheDevice = async () => {
        // Implement turn off functionality
        const deviceIdentifier = "your-device-identifier"; // Replace with actual device identifier
        const isConnected = await bleManager.isDeviceConnected(deviceIdentifier);
        if (isConnected) {
            console.log('Device is connected');
            try {
                await bleManager.writeCharacteristicWithResponseForDevice(
                    deviceIdentifier, SERVICE_UUID, CHARACTERISTIC_UUID_TX, btoa("2")
                );
                console.log('Write successful');
            } catch (error) {
                console.log('Write failed', error);
            }
        }
        
    };

    return {
        OnTheDevice,
        OffTheDevice,
    };
}