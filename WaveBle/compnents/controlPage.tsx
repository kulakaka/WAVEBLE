import React, { useState } from 'react';
import { View, Text, TextInput, Button, SafeAreaView } from 'react-native';

const ControlPage = () => {
  const [soleCOnTime, setSoleCOnTime] = useState('');

  const handleSubmit = () => {
    // Handle form submission
    console.log('Form submitted with soleCOnTime:', soleCOnTime);
  };

  return (
    <SafeAreaView>
      <View>
        <Text>Control Page</Text>
        <TextInput
          value={soleCOnTime}
          onChangeText={setSoleCOnTime}
          placeholder="Enter soleCOnTime"
        />
        <Button title="Submit" onPress={handleSubmit} />
      </View>
    </SafeAreaView>
  );
};

export default ControlPage;