import React, { useState, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface CushionAnimationProps {
  solAStatus: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure';
  solBStatus: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure';
  solCStatus: 'pressure' | 'vacuum' | 'hold_vacuum' | 'hold_pressure';
}

const CushionAnimation: React.FC<CushionAnimationProps> = ({
  solAStatus,
  solBStatus,
  solCStatus,
}) => {
  const [zoneAScale] = useState(new Animated.Value(1));
  const [zoneBScale] = useState(new Animated.Value(1));
  const [zoneCScale] = useState(new Animated.Value(1));

  useEffect(() => {
    // Animate Zone A
    Animated.spring(zoneAScale, {
      toValue: solAStatus === 'vacuum' || solAStatus === 'hold_vacuum' ? 1.2 : 1,
      useNativeDriver: true,
    }).start();

    // Animate Zone B
    Animated.spring(zoneBScale, {
      toValue: solBStatus === 'vacuum' || solBStatus === 'hold_vacuum' ? 1.2 : 1,
      useNativeDriver: true,
    }).start();

    // Animate Zone C
    Animated.spring(zoneCScale, {
      toValue: solCStatus === 'vacuum' || solCStatus === 'hold_vacuum' ? 1.2 : 1,
      useNativeDriver: true,
    }).start();
  }, [solAStatus, solBStatus, solCStatus]);

  return (
    <View style={styles.container}>
      <View style={styles.cushionContainer}>
        <Animated.View
          style={[
            styles.zone,
            styles.zoneA,
            { transform: [{ scale: zoneAScale }] },
            solAStatus === 'vacuum' || solAStatus === 'hold_vacuum' ? styles.activeZone : null,
          ]}
        />
        <Animated.View
          style={[
            styles.zone,
            styles.zoneB,
            { transform: [{ scale: zoneBScale }] },
            solBStatus === 'vacuum' || solBStatus === 'hold_vacuum' ? styles.activeZone : null,
          ]}
        />
        <Animated.View
          style={[
            styles.zone,
            styles.zoneC,
            { transform: [{ scale: zoneCScale }] },
            solCStatus === 'vacuum' || solCStatus === 'hold_vacuum' ? styles.activeZone : null,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  cushionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    height: 100,
  },
  zone: {
    width: '30%',
    height: '100%',
    backgroundColor: '#808080',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
  },
  activeZone: {
    backgroundColor: '#008080',
  },
  zoneA: {
    marginRight: 5,
  },
  zoneB: {
    marginHorizontal: 5,
  },
  zoneC: {
    marginLeft: 5,
  },
});

export default CushionAnimation; 