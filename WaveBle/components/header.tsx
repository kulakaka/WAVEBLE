import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

const Header = () => {
  return (
    <View>
      <View style={styles.logoContainer}>
        <Image
          source={require('../imgs/widelogo2.png')}
          style={styles.logo}
        />
      </View>
      <Text style={styles.title}>Wheelchair Cushion Controller</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  logo: {
    width: '80%',
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default Header;
