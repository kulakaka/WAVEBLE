import React from 'react';
import { Modal, View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import { Device } from 'react-native-ble-plx';

interface DeviceModelProps {
  visible: boolean;
  closeModel: () => void;
  connectToPeripheral: (device: Device) => void;
  devices: Device[];
}

const DeviceModel: React.FC<DeviceModelProps> = ({ visible, closeModel, connectToPeripheral, devices }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={closeModel}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 20, marginBottom: 20 }}>Available Devices</Text>
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => connectToPeripheral(item)}>
              <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
                <Text>Device Name: {item.name}</Text>
                <Text>Device ID: {item.id}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
        <Button title="Close" onPress={closeModel} />
      </View>
    </Modal>
  );
};

export default DeviceModel;