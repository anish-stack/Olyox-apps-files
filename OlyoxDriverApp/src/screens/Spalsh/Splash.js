import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import useUserStore from '../../../Store/useUserStore';
import loginStore from '../../../Store/authStore';
import axiosInstance from '../../../constant/axios';
import logo from '../../../assets/images/logo.png';
import Login from '../Login/Login';
import Auth from '../Login/Auth';

export default function Splash() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { token } = loginStore();
  const { setUser, user } = useUserStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade-in animation (only runs if token exists)
  useEffect(() => {
    if (token) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim, token]);

  // Check token and navigate
  useEffect(() => {
    let isActive = true;

    const handleNavigation = async () => {
      // If no token, redirect to auth immediately
      if (!token) {
        console.log('🛑 No token available, navigating to auth');
        if (isActive) {
          try {
            navigation.replace('auth');
          } catch (error) {
            console.error('❌ Navigation error:', error);
          }
        }
        return;
      }

      try {
        // Show splash screen for at least 2 seconds
        const minSplashTime = new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch user details
        console.log('🔄 Fetching user details with token:', token);
        const response = await axiosInstance.get('/api/v1/rider/user-details', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isActive) return;

        const userData = response?.data?.partner;
        if (!userData) throw new Error('No user data received');

        // Update store with fetched user data
        setUser(userData);
        console.log('✅ User fetched:', {
          _id: userData._id,
          isDocumentUpload: userData.isDocumentUpload,
          DocumentVerify: userData.DocumentVerify,
          category: userData.category,
        });

        // Ensure minimum splash time is respected
        await minSplashTime;

        // Navigation logic
        if (!userData._id) {
          console.log('🛑 No user ID, navigating to auth');
          navigation.replace('auth');
          return;
        }

        if (!userData.isDocumentUpload) {
          console.log('🛑 Documents not uploaded, navigating to DocumentUpload');
          navigation.replace('DocumentUpload');
          return;
        }

        if (!userData.DocumentVerify) {
          console.log('🛑 Documents not verified, navigating to Wait_Screen');
          navigation.replace('Wait_Screen');
          return;
        }

        // Navigate to dashboard based on category
        if (userData.category === 'CAB') {
          console.log('🚖 User is CAB, navigating to Home');
          navigation.replace('Home');
        } else if (userData.category === 'Parcel') {
          console.log('📦 User is Parcel, navigating to ParcelHome');
          navigation.replace('ParcelHome');
        } else {
          console.log('🔄 Default navigation to Home');
          navigation.replace('Home');
        }
      } catch (error) {
        console.error('❌ Splash init error:', error?.response?.data || error);
        if (isActive) {
          console.log('🛑 Error occurred, navigating to auth');
          navigation.replace('auth');
        }
      }
    };

    handleNavigation();

    return () => {
      isActive = false;
    };
  }, [token, navigation, setUser]);

  // Render UI only if token exists
  if (!token) {
    return  <Auth/>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: theme.text }]}>
          Welcome{user?.name ? `, ${user.name}!` : '!'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {user?.isDocumentUpload
            ? 'Verifying your documents...'
            : 'Getting things ready...'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 20,
    textAlign: 'center',
  },
});