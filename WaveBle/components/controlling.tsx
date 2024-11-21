import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ControllingProps {
  isConnected: boolean;
  pumpStatus: string;
  solAStatus: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure';
  solBStatus: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure';
  solCStatus: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure';
  togglePump: (status: string) => void;
  toggleSolA: (status: string) => void;
  toggleSolB: (status: string) => void;
  toggleSolC: (status: string) => void;
}

const getZoneButtonColor = (status: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure', isConnected: boolean) => {
  if (!isConnected) return '#808080';
  switch(status) {
    case 'vacuum':
    case 'hold_vacuum':
      return '#008080'; // Blue for vacuum states
    default:
      return '#808080'; // Grey for other states
  }
};

const getZoneButtonText = (status: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure', zone: string) => {
  switch(status) {
    case 'pressure':
      return `Zone ${zone} Pressure`;
    case 'vacuum':
      return `Zone ${zone} Vacuum`;
    case 'hold_vacuum':
      return `Zone ${zone} Hold Vacuum`;
    case 'hold_pressure':
      return `Zone ${zone} Hold Pressure`;
    default:
      return `Zone ${zone}`;
  }
};

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
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => togglePump(pumpStatus === 'Pump_ON' ? 'Pump_OFF' : 'Pump_ON')}
        style={[
          styles.controlButton,
          { 
            backgroundColor: !isConnected ? '#808080' : (pumpStatus === 'Pump_ON' ? '#008080' : '#808080'),
            opacity: !isConnected ? 0.5 : 1
          }
        ]}
        disabled={!isConnected}
      > 
        <View style={styles.buttonTextContainer}>
          <Text style={[
            styles.buttonText,
            { color: !isConnected ? 'black' : (pumpStatus === 'Pump_ON' ? 'white' : 'black') }
          ]}>
            Pump
          </Text>
          <Text style={[
            styles.buttonText,
            { color: !isConnected ? 'black' : (pumpStatus === 'Pump_ON' ? 'white' : 'black') }
          ]}>
            {pumpStatus === 'Pump_ON' ? 'On' : 'Off'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => toggleSolA(solAStatus === 'pressure' ? 'sola_off' : 'sola_on')}
        style={[
          styles.controlButton,
          {
            backgroundColor: getZoneButtonColor(solAStatus, isConnected),
            opacity: !isConnected ? 0.5 : 1
          }
        ]}
        disabled={!isConnected || solAStatus === 'hold_vacuum' || solAStatus === 'hold_pressure'}
      >
        <Text style={[
          styles.buttonText,
          { color: !isConnected ? 'black' : (solAStatus === 'vacuum' || solAStatus === 'hold_vacuum' ? 'white' : 'black') }
        ]}>
          {getZoneButtonText(solAStatus, 'A')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => toggleSolB(solBStatus === 'pressure' ? 'solb_off' : 'solb_on')}
        style={[
          styles.controlButton,
          {
            backgroundColor: getZoneButtonColor(solBStatus, isConnected),
            opacity: !isConnected ? 0.5 : 1
          }
        ]}
        disabled={!isConnected || solBStatus === 'hold_vacuum' || solBStatus === 'hold_pressure'}
      >
        <Text style={[
          styles.buttonText,
          { color: !isConnected ? 'black' : (solBStatus === 'vacuum' || solBStatus === 'hold_vacuum' ? 'white' : 'black') }
        ]}>
          {getZoneButtonText(solBStatus, 'B')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => toggleSolC(solCStatus === 'pressure' ? 'solc_off' : 'solc_on')}
        style={[
          styles.controlButton,
          {
            backgroundColor: getZoneButtonColor(solCStatus, isConnected),
            opacity: !isConnected ? 0.5 : 1
          }
        ]}
        disabled={!isConnected || solCStatus === 'hold_vacuum' || solCStatus === 'hold_pressure'}
      >
        <Text style={[
          styles.buttonText,
          { color: !isConnected ? 'black' : (solCStatus === 'vacuum' || solCStatus === 'hold_vacuum' ? 'white' : 'black') }
        ]}>
          {getZoneButtonText(solCStatus, 'C')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  controlButton: {
    width: 80,
    height: 80,
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
  }
});

export default Controlling;
