import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const useAutoLogout = () => {
  const navigation = useNavigation();

  const autoLogout = useCallback(async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('auth_token'),
        SecureStore.deleteItemAsync('cached_location'),
        SecureStore.deleteItemAsync('cached_coords'),
        SecureStore.deleteItemAsync('auth_token_db'),
      ]);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    } catch (error) {
      console.error('Auto logout error:', error);
      Alert.alert('Logout Failed', 'An unexpected error occurred. Please try again.');
    }
  }, [navigation]);

  return autoLogout;
};
