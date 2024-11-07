import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

const Header = () => {
  return (
    <View style={styles.header}> 
      <View style={styles.logoContainer}>
        <Image
          source={require('../imgs/widelogo2.png')}
          style={styles.logo}
        />
      </View>
      <Text style={styles.title}>Surf Cushion Controller</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  header: {
    backgroundColor: '#F6F0E6',
  },
  logo: {
    width: '80%',
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 30,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default Header;
