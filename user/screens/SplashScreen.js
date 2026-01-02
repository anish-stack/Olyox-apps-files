import { View, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import { tokenCache } from '../Auth/cache';
import { useNavigation } from '@react-navigation/native';

export default function SplashScreen() {
  const [isLogin, setIsLogin] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const db_token = await tokenCache.getToken('auth_token_db');
        setIsLogin(db_token !== null);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setIsLogin(false);
      }
    };

    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (isLogin !== null) {
      const timer = setTimeout(() => {
        if (isLogin) {
          navigation.replace('Home'); // replace with your home screen
        } else {
          navigation.replace('Onboarding'); // replace with your onboarding screen
        }
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    }
  }, [isLogin, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF0000" /> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
