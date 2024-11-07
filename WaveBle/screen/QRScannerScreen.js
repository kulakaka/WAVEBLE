import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, Text, StyleSheet } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';

const QRScannerScreen = () => {

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'This app requires access to your camera to scan QR codes.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Camera permission granted');
          } else {
            console.log('Camera permission denied');
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };

    // Call the function to request permission
    requestCameraPermission();
  }, []); // Empty array so it only runs once when component mounts

  const onSuccess = e => {
    // Handle the scanned QR code data
    const url = e.data;
    // Linking.openURL(url).catch(err => console.error('An error occurred', err));
    console.log(url);   

};

  return (
    <QRCodeScanner
      onRead={onSuccess}
      topContent={<Text style={styles.centerText}>Please scan the QR code.</Text>}
      bottomContent={<Text style={styles.bottomText}>Point your camera at a QR code to scan.</Text>}
    />
  );
};

const styles = StyleSheet.create({
  centerText: {
    flex: 1,
    fontSize: 18,
    alignItems: 'center',
    padding: 32,
    color: '#777',
  },
  bottomText: {
    fontSize: 16,
    color: '#777',
  },
});

export default QRScannerScreen;
