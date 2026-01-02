import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import loginImage from '../../../assets/images/login_.png';

const Auth = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={loginImage} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} /> {/* optional dark overlay */}
        <View style={styles.content}>
     
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.background }]}
            onPress={() => navigation.navigate('login')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.secondary}]}
            onPress={() => navigation.navigate('bh_verify')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>New Register</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default Auth;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // optional overlay for better button visibility
  },
  content: {
    position:'absolute',
    bottom:120,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
