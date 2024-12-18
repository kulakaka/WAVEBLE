import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ControllingProps {
  isConnected: boolean;
  pumpStatus: string;
  solAStatus: 'pressure' | 'vaccum' | 'hold';
  solBStatus: 'pressure' | 'vaccum' | 'hold';
  solCStatus: 'pressure' | 'vaccum' | 'hold';
  togglePump: (status: string) => void;
  toggleSolA: (status: string) => void;
  toggleSolB: (status: string) => void;
  toggleSolC: (status: string) => void;
}

const getZoneButtonColor = (status: 'pressure' | 'vaccum' | 'hold', isConnected: boolean) => {
  if (!isConnected) return '#808080';
  switch(status) {
    case 'vaccum':
      return '#4169E1'; // Royal Blue
    case 'pressure':
      return '#DC143C'; // Crimson
    case 'hold':
      return '#3CB371'; // Medium Sea Green
    default:
      return '#808080';
  }
};

const getZoneButtonText = (status: 'pressure' | 'vaccum' | 'hold', zone: string) => {
  switch(status) {
    case 'pressure':
      return `${zone}\nPressure`;
    case 'vaccum':
      return `${zone}\nVacuum`;
    case 'hold':
      return `${zone}\nHold`;
    default:
      return `Zone ${zone}`;
  }
};

const getNextState = (currentStatus: 'pressure' | 'vaccum' | 'hold') => {
  switch(currentStatus) {
    case 'vaccum':
      return 'hold';
    case 'hold':
      return 'pressure';
    case 'pressure':
      return 'vaccum';
    default:
      return 'hold';
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
        onPress={() => {
          const nextState = getNextState(solAStatus);
          toggleSolA(nextState);
        }}
        style={[
          styles.controlButton,
          {
            backgroundColor: getZoneButtonColor(solAStatus, isConnected),
            opacity: !isConnected ? 0.5 : 1
          }
        ]}
        disabled={!isConnected}
      >
        <Text style={[
          styles.buttonText,
          { color: !isConnected ? 'black' : 'white' }
        ]}>
          {getZoneButtonText(solAStatus, 'A')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
         onPress={() => {
          const nextState = getNextState(solBStatus);
          toggleSolB(nextState);
        }}
        style={[
          styles.controlButton,
          {
            backgroundColor: getZoneButtonColor(solBStatus, isConnected),
            opacity: !isConnected ? 0.5 : 1
          }
        ]}
        disabled={!isConnected}
      >
        <Text style={[
          styles.buttonText,
          { color: !isConnected ? 'black' : 'white' }
        ]}>
          {getZoneButtonText(solBStatus, 'B')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          const nextState = getNextState(solCStatus);
          toggleSolC(nextState);
        }}
        style={[
          styles.controlButton,
          {
            backgroundColor: getZoneButtonColor(solCStatus, isConnected),
            opacity: !isConnected ? 0.5 : 1
          }
        ]}
        disabled={!isConnected}
      >
        <Text style={[
          styles.buttonText,
          { color: !isConnected ? 'black' : 'white' }
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
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  controlButton: {
    width: 85,
    height: 85,
    padding: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    margin: 5,
  },
  buttonTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    marginVertical: 2,
  }
});

export default Controlling;
