import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../constant/axios';
import { Alert } from 'react-native';

// Custom storage that uses SecureStore for sensitive data and AsyncStorage for non-sensitive data
const createHybridStorage = () => {
  return {
    getItem: async (name) => {
      try {
        // Try to get token from SecureStore
        const token = await SecureStore.getItemAsync('auth_token');

        // Get other data from AsyncStorage
        const asyncData = await AsyncStorage.getItem(name);
        const parsedAsyncData = asyncData ? JSON.parse(asyncData) : {};

        // Merge token with other data
        return JSON.stringify({
          ...parsedAsyncData,
          token: token || parsedAsyncData.token,
        });
      } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        const data = JSON.parse(value);

        // Store token in SecureStore
        if (data.token) {
          await SecureStore.setItemAsync('auth_token', data.token);
        }

        // Store non-sensitive data in AsyncStorage
        const { token, ...nonSensitiveData } = data;
        await AsyncStorage.setItem(name, JSON.stringify(nonSensitiveData));
      } catch (error) {
        console.error('Error writing to storage:', error);
      }
    },
    removeItem: async (name) => {
      try {
        // Remove token from SecureStore
        await SecureStore.deleteItemAsync('auth_token');

        // Remove other data from AsyncStorage
        await AsyncStorage.removeItem(name);
      } catch (error) {
        console.error('Error removing from storage:', error);
      }
    },
  };
};

const loginStore = create(
  persist(
    (set, get) => ({
      time: null,
      token: null,
      authenticated: false,
      loading: false,
      error: null,
      otp_type: null,
      otp_sent: false,
      role: null,
      accountStatus: null,
      documentVerify: null,
      isDocumentUpload: null,

      // Login
      login: async (fcmToken, number, otpType, AppVersion, navigation) => {
        set({ loading: true, error: null });
        try {
          const response = await axiosInstance.post('/api/v1/rider/rider-login', {
            fcmToken,
            number,
            otpType,
            AppVersion,
          });

          console.log('Login response:', response.data);

          const data = response.data;

          if (data.success) {
            // Handle conditional redirect based on backend response
            if (data.redirect) {
              switch (data.redirect) {
                case 'document-upload':

                  set({
                    token: data?.token,
                    authenticated: false,
                    loading: false,
                    otp_sent: false,
                    documentVerify: false,
                    isDocumentUpload: false,
                  });
                  // Alert.alert('Action Required', data.message || 'Please complete document upload');
                  navigation.navigate('DocumentUpload');
                  break;

                case 'wait-screen':
                  set({
                    token: data?.token,
                    authenticated: true,
                    loading: false,
                    otp_sent: false,
                    documentVerify: false,
                    isDocumentUpload: true,
                  });
                  // Alert.alert('Pending', data.message || 'Profile is under review. Please wait.');
                  navigation.navigate('WaitScreen');
                  break;



                default:
                  console.warn('Unknown redirect:', data.redirect);
              }

              set({ loading: false });
              return; // stop further execution
            }

            // OTP flow if no special redirect
            set({
              otp_type: otpType,
              loading: false,
              otp_sent: true,
            });

            Alert.alert('OTP Sent', data.message || 'OTP has been sent to your phone.');
          } else {
            set({ error: data.message, loading: false });
            Alert.alert('Error', data.message || 'Login failed');
          }
        } catch (err) {
          console.error('Login error:', err);
          set({ error: err.message || 'Login failed', loading: false });
          Alert.alert('Error', err.message || 'Login failed');
        }
      },


      // Verify OTP
      verifyOtp: async (type, number, otp, navigation) => {
        set({ loading: true, error: null });

        try {
          const response = await axiosInstance.post('/api/v1/rider/rider-verify', {
            otp,
            number,
            otpType: type,
          });

          console.log('OTP response:', response.data);

          if (response.data.success) {
            const {
              token,
              redirect,
              accountStatus,
              DocumentVerify,
              isDocumentUpload,
            } = response.data;

            set({
              token,
              authenticated: true,
              loading: false,
              otp_sent: false,
              role: redirect?.type,
              accountStatus,
              documentVerify: DocumentVerify,
              isDocumentUpload,
            });
            console.log('✅ OTP verified successfully. User authenticated.', token);

            if (!isDocumentUpload) {
              navigation.replace('DocumentUpload'); // consistent naming
            } else if (!DocumentVerify) {
              navigation.replace('Wait_Screen');
            } else {
              if (redirect?.type === 'CAB') navigation.replace('Home');
              else if (redirect?.type === 'Parcel') navigation.replace('ParcelHome');
              else navigation.replace('Home');
            }

          } else {
            set({
              error: response.data.message || 'OTP verification failed',
              loading: false,
            });
          }
        } catch (err) {
          console.error('❌ OTP verification error:', err);
          set({
            error: err.message || 'OTP verification failed',
            loading: false,
          });
        }
      },

      // Logout
      logout: async () => {
        set({ loading: true });
        try {
          // Clear from both SecureStore and AsyncStorage
          await SecureStore.deleteItemAsync('auth_token');
          await AsyncStorage.removeItem('login-storage');

          set({
            token: null,
            authenticated: false,
            loading: false,
            error: null,
            otp_sent: false,
            role: null,
            accountStatus: null,
            documentVerify: null,
            isDocumentUpload: null,
            otp_type: null,
            time: null,
          });
        } catch (err) {
          console.error('Logout error:', err);
          set({ error: err.message || 'Logout failed', loading: false });
        }
      },

      // Get token (helper method)
      getToken: async () => {
        try {
          const token = await SecureStore.getItemAsync('auth_token');
          return token || get().token;
        } catch (error) {
          console.error('Error getting token:', error);
          return get().token;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset OTP state
      resetOtpState: () => set({ otp_sent: false, otp_type: null }),
    }),
    {
      name: 'login-storage',
      storage: createJSONStorage(() => createHybridStorage()),
      partialize: (state) => ({
        // Only persist these keys
        token: state.token,
        authenticated: state.authenticated,
        role: state.role,
        accountStatus: state.accountStatus,
        documentVerify: state.documentVerify,
        isDocumentUpload: state.isDocumentUpload,
      }),
      resetOtpState: () => {
        console.log('🔄 Resetting OTP state...');
        set({
          otp_sent: false,
          otp_type: null,
          error: null,
          loading: false,
        });
      },
      onRehydrateStorage: () => (state) => {
        // This runs after the store has been rehydrated from storage
        console.log('Store rehydrated:', state ? 'success' : 'failed');
      },
    }
  )
);

export default loginStore;