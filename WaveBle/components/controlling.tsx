import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

interface ControllingProps {
  isConnected: boolean;
  pumpStatus: string;
  solAStatus: string;
  solBStatus: string;
  solCStatus: string;
  togglePump: (status: string) => void;
  toggleSolA: (status: string) => void;
  toggleSolB: (status: string) => void;
  toggleSolC: (status: string) => void;
}

const Controlling: React.FC<ControllingProps> = ({
  isConnected,
  pumpStatus,
  solAStatus,
  solBStatus,
  solCStatus,
  togglePump,
  toggleSolA,
  toggleSolB,
  toggleSolC,
}) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 10, marginTop: 20 }}>
      <TouchableOpacity
        onPress={() => togglePump(pumpStatus === 'Pump_ON' ? 'Pump_OFF' : 'Pump_ON')}
        style={{ 
          width: 80,
          backgroundColor: !isConnected ? '#808080' : (pumpStatus === 'Pump_ON' ? '#008080' : '#808080'),
          padding: 10, 
          borderRadius: 10,
          opacity: !isConnected ? 0.5 : 1
        }}
        disabled={!isConnected}
      > 
        <Text style={{ 
          color: !isConnected ? 'white' : (pumpStatus === 'Pump_ON' ? 'white' : 'black'),
          textAlign: 'center' 
        }}>
          {pumpStatus === 'Pump_ON' ? 'Pump ON' : 'Pump OFF'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => toggleSolA(solAStatus === 'sola_on' ? 'sola_off' : 'sola_on')}
        style={{ 
          width: 80,
          backgroundColor: !isConnected ? '#808080' : (solAStatus === 'sola_off' ? '#008080' : '#808080'),
          padding: 10, 
          borderRadius: 10,
          opacity: !isConnected ? 0.5 : 1
        }}
        disabled={!isConnected}
      >
        <Text style={{ 
          color: !isConnected ? 'white' : (solAStatus === 'sola_off' ? 'white' : 'black'),
          textAlign: 'center' 
        }}>
          {solAStatus === 'sola_off' ? 'Zone A Ambient' : 'Zone A Vacuum'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => toggleSolB(solBStatus === 'solb_on' ? 'solb_off' : 'solb_on')}
        style={{ 
          width: 80,
          backgroundColor: !isConnected ? '#808080' : (solBStatus === 'solb_off' ? '#008080' : '#808080'),
          padding: 10, 
          borderRadius: 10,
          opacity: !isConnected ? 0.5 : 1
        }}
        disabled={!isConnected}
      >
        <Text style={{ 
          color: !isConnected ? 'white' : (solBStatus === 'solb_off' ? 'white' : 'black'),
          textAlign: 'center' 
        }}>
          {solBStatus === 'solb_off' ? 'Zone B Ambient' : 'Zone B Vacuum'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => toggleSolC(solCStatus === 'solc_on' ? 'solc_off' : 'solc_on')}
        style={{ 
          width: 80,
          backgroundColor: !isConnected ? '#808080' : (solCStatus === 'solc_off' ? '#008080' : '#808080'),
          padding: 10, 
          borderRadius: 10,
          opacity: !isConnected ? 0.5 : 1
        }}
        disabled={!isConnected}
      >
        <Text style={{ 
          color: !isConnected ? 'white' : (solCStatus === 'solc_off' ? 'white' : 'black'),
          textAlign: 'center' 
        }}>
          {solCStatus === 'solc_off' ? 'Zone C Ambient' : 'Zone C Vacuum'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Controlling;
