// OnboardingScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
  BackHandler
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Font from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import { slidesFetch } from './onboarding-slides';
import { initializeSocket } from '../services/socketService';
import { tokenCache } from '../Auth/cache';
import { createUserRegister, verify_otp } from '../utils/helpers';
import PhoneAuthModal from './comp/PhoneAuthModal';
import OtpVerificationModal from './comp/OtpVerificationModal';
import LoadingOverlay from './comp/LoadingOverlay';
import { useGuest } from '../context/GuestLoginContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayInstallReferrer } from 'react-native-play-install-referrer';
import analytics from '@react-native-firebase/analytics'; // optional
const INSTALL_REFERRER_KEY = 'install_referrer_saved';
const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isSmallScreen = height < 700;

// Responsive dimensions
const SLIDE_HEIGHT = height * 0.65;
const IMAGE_SIZE = Math.min(width * 0.6, 300);
const BOTTOM_HEIGHT = height * 0.15;

export default function OnboardingScreen({ route }) {
  const { code } = route.params || {}
  const navigation = useNavigation();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { handleGuestLogout } = useGuest();
  const [referrer, setReferrer] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

// Add this at the top with other state declarations
const [userLocation, setUserLocation] = useState(null);
const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);

  // Auth state
  const [showPhoneModal, setShowPhoneModal] = useState(true);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCaode, setReferralCode] = useState('')
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation for entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (showPhoneModal || showOtpModal) {
        setShowPhoneModal(false);
        setShowOtpModal(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showPhoneModal, showOtpModal]);


  useEffect(() => {
    if (code) {
      skipToEnd()
      setReferralCode(code)
    } else {
      setReferralCode('')
    }
  }, [route])

 useEffect(() => {
    (async () => {
      console.log("🔄 Referrer check started");

      // ✅ Try load saved referrer
      const saved = await AsyncStorage.getItem(INSTALL_REFERRER_KEY);
      if (saved) {
        console.log("📦 Saved referrer from AsyncStorage:", saved);
        setReferrer(JSON.parse(saved));
        return;
      }

      // ✅ Only Android me hi chalega
      if (Platform.OS === "android") {
        try {
          const res = await PlayInstallReferrer.getInstallReferrer();
          // res: { installReferrer, referrerClickTimestampSeconds, installBeginTimestampSeconds }

          if (res && res.installReferrer) {
            const params = Object.fromEntries(
              new URLSearchParams(res.installReferrer)
            );

            await AsyncStorage.setItem(
              INSTALL_REFERRER_KEY,
              JSON.stringify(params)
            );

            setReferrer(params);
            console.log("🔥 Install referrer fetched:", params);

            // optional: send to firebase or your backend
            try { analytics().logEvent('install_referrer_fetched', params); } catch (e) {}
          } else {
            console.log("⚠️ No installReferrer in response", res);
            setReferrer(null);
          }
        } catch (e) {
          console.log("❌ InstallReferrer fetch failed:", e.message);
          setReferrer(null);
        }
      } else {
        console.log("ℹ️ InstallReferrer not available on this platform (iOS / no PlayStore).");
        setReferrer(null);
      }
    })();
  }, []);

  // Load fonts with better error handling
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Poppins-Regular': require('./Roboto-VariableFont_wdth,wght.ttf')

        });
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Custom fonts failed to load, using system fonts:', error);
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, []);

  // Fetch onboarding slides with retry mechanism
  useEffect(() => {
    const fetchOnboardingSlides = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await slidesFetch();

        if (data && Array.isArray(data) && data.length > 0) {
          setSlides(data);
          setRetryCount(0);
        } else {
          throw new Error('No slides data received');
        }
      } catch (error) {
        console.error('Failed to fetch slides:', error);
        const errorMessage = error?.message || 'Failed to load onboarding content';

        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          // Auto retry after 2 seconds
          setTimeout(() => {
            fetchOnboardingSlides();
          }, 2000);
        } else {
          setError(`${errorMessage}. Please check your connection and try again.`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingSlides();
  }, [retryCount]);

  // Enhanced phone number validation
  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10 && /^\d{10}$/.test(cleanPhone);
  };

const requestLocationPermission = async () => {
  try {
    // 🔹 Step 1: Check current permission status
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    setLocationPermissionStatus(existingStatus);

    // ✅ Already granted
    if (existingStatus === "granted") {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 10000,
      });
      if (location?.coords) {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }
    }

    // 🔹 Step 2: Handle if previously denied
    if (existingStatus === "denied") {
      if (Platform.OS === "ios") {
        // 📱 iOS: open settings directly
        Alert.alert(
          "Location Permission Required",
          "Please enable location permission in Settings to continue.",
          [
            {
              text: "Open Settings",
              onPress: async () => {
                await Linking.openURL("app-settings:");
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        // 🤖 Android: show alert and option to re-request
        Alert.alert(
          "Location Permission Required",
          "Please enable location permission in settings to continue. This helps us provide better service.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: async () => {
                await Linking.openSettings();
              },
            },
          ]
        );
      }
      return null;
    }

    // 🔹 Step 3: Request new permission
    const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationPermissionStatus(newStatus);

    if (newStatus === "granted") {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 10000,
        timeout: 10000,
      });

      if (location?.coords) {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }
    } else {
      Alert.alert(
        "Location Access Denied",
        "Location permission is required to provide you with the best service. You can enable it later from settings.",
        [{ text: "OK" }]
      );
      return null;
    }
  } catch (error) {
    console.error("Location permission error:", error);

    // 🔹 Handle specific known errors
    if (error.code === "E_LOCATION_SERVICES_DISABLED") {
      Alert.alert(
        "Location Services Disabled",
        "Please enable location services in your device settings.",
        [
          {
            text: "OK",
            onPress: () => {
              if (Platform.OS === "android") {
                Linking.openSettings();
              } else {
                Linking.openURL("app-settings:");
              }
            },
          },
        ]
      );
    } else if (error.code === "E_LOCATION_TIMEOUT") {
      Alert.alert("Location Timeout", "Unable to fetch location. Please try again.", [
        { text: "OK" },
      ]);
    } else {
      Alert.alert("Error", "Something went wrong while fetching location.", [
        { text: "OK" },
      ]);
    }

    return null;
  }
};
const handlePhoneSubmit = async () => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  if (!validatePhoneNumber(cleanPhone)) {
    Alert.alert(
      "Invalid Phone Number",
      "Please enter a valid 10-digit phone number.",
      [{ text: "OK", style: "default" }]
    );
    return;
  }

  try {
    setIsSubmitting(true);

    // Request location permission and get coordinates
    const locationData = await requestLocationPermission();

    // Prepare form data with location
    const formData = {
      number: cleanPhone,
      referral: referralCaode,
      platform: Platform.OS,
      campaign: referrer,
      ...(locationData && {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      }),
    };

    console.log('Submitting registration with data:', {
      ...formData,
      number: `${cleanPhone.slice(0, 2)}****${cleanPhone.slice(-2)}`, // Log masked number
    });

    const response = await createUserRegister(formData);

    if (response?.status === 201 || response?.status === 200) {
      setShowPhoneModal(false);
      setShowOtpModal(true);
    } else {
      const message = response?.data?.message || response?.message || 'Registration failed';
      Alert.alert('Registration Failed', message, [{ text: 'OK' }]);
    }
  } catch (error) {
    console.error('Phone submission error:', error);
    const errorMessage = error?.response?.data?.message ||
      error?.message ||
      'Unable to send OTP. Please check your connection and try again.';
    Alert.alert('Connection Error', errorMessage, [{ text: 'OK' }]);
  } finally {
    setIsSubmitting(false);
  }
};

// Optional: Add this useEffect to pre-request location on component mount
useEffect(() => {
  const preRequestLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 10000,
        });
        
        if (location?.coords) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      }
    } catch (error) {
      console.log('Pre-location fetch failed:', error);
    }
  };

  // Pre-fetch location after a delay to not block initial render
  const timer = setTimeout(preRequestLocation, 2000);
  return () => clearTimeout(timer);
}, []);

  // Handle OTP verification with better error handling
  const handleOtpVerify = async () => {
    const cleanOtp = otp.replace(/\D/g, '');

    if (cleanOtp.length !== 6) {
      Alert.alert(
        "Invalid OTP",
        "Please enter the complete 6-digit OTP sent to your phone.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = { number: phoneNumber.replace(/\D/g, ''), otp: cleanOtp };
      const response = await verify_otp(formData);

      if (response?.status === 200 && response?.token) {
        try {
          await tokenCache.saveToken('auth_token_db', response.token);

          if (response.User?._id) {
            await initializeSocket({
              userType: "user",
              userId: response.User._id
            });
          }

          handleGuestLogout();

          Alert.alert(
            'Welcome!',
            'Your account has been verified successfully.',
            [{
              text: 'Continue',
              onPress: () => {
                setShowOtpModal(false);
                setOtp('');
                setPhoneNumber('');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }]
                });
              }
            }]
          );
        } catch (storageError) {
          console.error("Token storage error:", storageError);
          Alert.alert(
            'Authentication Error',
            'Login successful but failed to save session. Please try logging in again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Verification Failed',
          response?.message || 'Invalid OTP. Please check and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        'Verification failed. Please check your connection and try again.';
      Alert.alert('Verification Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced slide change handler
  const handleSlideChange = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentIndex && slideIndex >= 0 && slideIndex < slides.length) {
      setCurrentIndex(slideIndex);
    }
  };

  // Improved navigation with haptic feedback
  const goToNextSlide = () => {
    if (currentIndex < slides.length - 1) {
      try {
        flatListRef.current?.scrollToIndex({
          index: currentIndex + 1,
          animated: true
        });
      } catch (error) {
        console.warn('Scroll to index failed:', error);
        // Fallback to scrollToOffset
        flatListRef.current?.scrollToOffset({
          offset: (currentIndex + 1) * width,
          animated: true
        });
      }
    } else {
      setShowPhoneModal(true);
    }
  };

  // Skip to authentication
  const skipToEnd = () => {
    setShowPhoneModal(true);
  };

  // Render individual slide with better styling
  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slideContainer}>
        <Animated.View style={[styles.slideContent, { opacity }]}>
          {/* Image Container */}
          <Animated.View style={[styles.imageContainer, { transform: [{ scale }] }]}>
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item?.imageUrl?.image }}
                style={styles.slideImage}
                resizeMode="contain"
                onError={(e) => console.warn('Image load error:', e.nativeEvent.error)}
              />
              {/* Decorative circles */}
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
            </View>
          </Animated.View>

          {/* Text Container */}
          <View style={styles.textContainer}>
            <Text style={styles.slideTitle} numberOfLines={2}>
              {item?.title || 'Welcome'}
            </Text>
            <Text style={styles.slideDescription} numberOfLines={4}>
              {item?.description || 'Get started with our amazing service'}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  // Enhanced pagination dots with modern design
  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.paginationDot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: index === currentIndex ? '#FF6B7A' : '#FFCDD2',
                }
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Loading state with modern design
  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <LinearGradient
          colors={['#fff', '#fff']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>
              {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Getting things ready...'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContent}>
          <Ionicons name="cloud-offline-outline" size={80} color="#FF4757" />
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setRetryCount(0);
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B7A', '#FF8A95']}
              style={styles.retryGradient}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.retryIcon} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Animated.View
        style={[
          styles.mainContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Header with Skip button */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          {currentIndex < slides.length - 1 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={skipToEnd}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides Container */}
        <View style={styles.slidesWrapper}>
          <Animated.FlatList
            ref={flatListRef}
            data={slides}
            renderItem={renderSlide}
            keyExtractor={(item, index) => item?._id || index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              {
                useNativeDriver: false,
                listener: handleSlideChange
              }
            )}
            scrollEventThrottle={16}
            bounces={false}
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="center"
            onScrollToIndexFailed={(error) => {
              console.warn('Scroll to index failed:', error);
              // Fallback scroll
              setTimeout(() => {
                flatListRef.current?.scrollToOffset({
                  offset: error.index * width,
                  animated: true
                });
              }, 100);
            }}
          />
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Pagination Dots */}
          {renderPaginationDots()}

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            {currentIndex === slides.length - 1 ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowPhoneModal(true)}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={['#000', '#000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.actionButtonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={goToNextSlide}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF6B7A', '#FF8A95']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.actionButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Modals */}
      <PhoneAuthModal
        visible={showPhoneModal}
        phoneNumber={phoneNumber}
        referralCaode={referralCaode}
        onChangeReferral={setReferralCode}
        onChangePhone={setPhoneNumber}
        onSubmit={handlePhoneSubmit}
        onClose={() => setShowPhoneModal(false)}
        isSubmitting={isSubmitting}
      />

      <OtpVerificationModal
        visible={showOtpModal}
        otp={otp}
        onChangeOtp={setOtp}
        onVerify={handleOtpVerify}
        onClose={() => {
          setShowOtpModal(false);
          setShowPhoneModal(true);
        }}
        onSubmit={handlePhoneSubmit}
        phoneNumber={phoneNumber}
        isSubmitting={isSubmitting}
      />

      <LoadingOverlay visible={isSubmitting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  retryButton: {
    width: '100%',
    maxWidth: 280,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  retryGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: isIOS ? 10 : 20,
    paddingBottom: 10,
    height: 60,
  },
  headerLeft: {
    flex: 1,
  },
  skipButton: {
    marginTop: 2,
    paddingHorizontal: 26,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
  },
  skipButtonText: {
    color: '#FF6B7A',
    fontSize: 10,
    fontWeight: '600',
  },
  slidesWrapper: {
    flex: 1,
    minHeight: SLIDE_HEIGHT,
  },
  slideContainer: {
    width,
    flex: 1,
    paddingHorizontal: 20,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  imageWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    zIndex: 2,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B7A',
    opacity: 0.1,
    zIndex: 1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF8A95',
    opacity: 0.08,
    zIndex: 1,
  },
  textContainer: {
    paddingHorizontal: 10,
    paddingBottom: 40,
    minHeight: 120,
  },
  slideTitle: {
    fontSize: isSmallScreen ? 26 : 30,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: isSmallScreen ? 32 : 36,
  },
  slideDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: isIOS ? 20 : 30,
    backgroundColor: '#FFFFFF',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    height: 20,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
  },
  actionButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#FF6B7A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});