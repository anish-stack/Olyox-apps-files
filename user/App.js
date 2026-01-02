import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import "./context/firebaseConfig";

import * as Location from "expo-location";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as TrackingTransparency from 'expo-tracking-transparency';

let Settings;
if (Platform.OS === 'ios') {
  Settings = require("react-native-fbsdk-next").Settings;
}

import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Platform,
  BackHandler,
  Alert,
  Modal,
} from "react-native";
import { SocketProvider } from "./context/SocketContext";
import * as Sentry from "@sentry/react-native";
import { StatusBar } from "expo-status-bar";
import * as IntentLauncher from "expo-intent-launcher";
import { AppRegistry } from "react-native";
import { name as appName } from "./app.json";
import LottieView from "lottie-react-native";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { AndroidNotificationVisibility } from "expo-notifications";

// Import screens
import HomeScreen from "./screens/HomeScreen";
import Show_Cabs from "./Ride/Show_near_by_cab/Show_Cabs";
import { DriverMatching } from "./Ride/Show_near_by_cab/Driver_matching";
import OnboardingScreen from "./onboarding/Onboarding";
import { LocationProvider } from "./context/LocationContext";
import { FoodProvider } from "./context/Food_Context/Food_context";
import MainTransport from "./Transport/Main.Transport";
import Parcel_Transport from "./Transport/Parcel_Transport/Parcel_Transport";
import BookParcel from "./Transport/Parcel_Transport/Book-Parcel";
import Parcel_Orders from "./Transport/Parcel_Transport/Parcel_orders/Parcel_Orders";
import OrderDetails from "./Transport/Parcel_Transport/Parcel_orders/OrderDetails";
import UserProfile from "./screens/Profile";
import { tokenCache } from "./Auth/cache";
import BookingConfirmation from "./Ride/Show_near_by_cab/confirm_booking";
import Policy from "./policy/Policy";
import Help_On from "./onboarding/Help/Help_On";
import LocationErrorScreen from "./LocationError";
import SplashScreen from "./screens/SplashScreen";
import { GuestProvider } from "./context/GuestLoginContext";
import Get_Pickup_Drop from "./Parcel_Booking/Get_Pickup_Drop";
import { BookingParcelProvider } from "./context/ParcelBookingContext/ParcelBookingContext";
import Choose_Vehicle from "./Parcel_Booking/Choose_Vehicle";
import PaymentScreen from "./Parcel_Booking/PaymentScreen";
import FindRider from "./Parcel_Booking/FindRider/FindRider";
import { RideProvider } from "./context/RideContext";
import RideLocationSelector from "./Ride/First_Step_screen";
import useNotificationPermission from "./hooks/notification";
import { find_me, findSettings } from "./utils/helpers";
import axios from "axios";
import OlyoxAppUpdate from "./context/CheckAppUpdate";
import OnWayRide from "./New Screen/OnWayRide";
import RateRiderOrRide from "./New Screen/RateRiderOrRide";
import ManualCheck from "./context/ManualCheck";
import { RideSearchingProvider } from "./context/ride_searching";
import ComingSoon from "./screens/ComingSoon";
import BackRideSearching from "./screens/BackRideSearching";
import IntercityRides from "./New Screen/intercity-rides/IntercityRides";
import IntercityRide from "./New Screen/intercity-rides/IntercityRide";
import RatingReservations from "./New Screen/intercity-rides/RatingReservation";
import useSettings from "./hooks/Settings";
import ShareRideScreen from "./New Screen/Share_Ride_Screen/ShareRide";
import { useTrack } from "./hooks/useTrack";
import Offer from "./screens/OffersScreen";
import ActivityScreen from "./screens/Activity";
import AppSetting from "./screens/AppSettings";
import NotificationsScreens from "./screens/NotificationsScreen";
import LocationPermissionModal from "./LocationModel";
import ErrorBoundary from "./ErrorBoundary";
import { navigationRef } from "./RootNavigation";
import AllHotelRooms from "./Hotel/AllHotelRooms";
import HotelDetails from "./Hotel/HotelDetails";
import HotelBooking from "./Hotel/HotelBooking";
import ConfirmBooking from "./Hotel/ConfirmBooking";
import MyBookings from "./Hotel/MyBookings";
import BookingDetails from "./Hotel/BookingDetails";

const Stack = createNativeStackNavigator();

// Initialize Sentry
Sentry.init({
  dsn: "https://f7347ca019397d16c7b1b5de089b1a82@o4508834287583232.ingest.us.sentry.io/4509547460755456",
  enableInExpoDevelopment: true,
  debug: true,
  attachScreenshot: true,
  enableNative: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  enableInExpoDevelopment: __DEV__,
  debug: __DEV__,
  environment: __DEV__ ? "development" : "production",
  enableAutoSessionTracking: true,
});

// Constants
const MAX_LOADING_TIME = 10000; // Increased for permission requests
const MIN_UPDATE_INTERVAL = 10000;
const MAX_RETRY_ATTEMPTS = 3;
const API_URL = "https://www.appv2.olyox.com/api/v1";
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Permission states
const PERMISSION_STATE = {
  PENDING: 'PENDING',
  GRANTED: 'GRANTED',
  DENIED: 'DENIED',
  CHECKING: 'CHECKING',
};

// Define location error types
const ERROR_TYPES = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  LOCATION_UNAVAILABLE: "LOCATION_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
};

// Notification Channels Configuration
const NOTIFICATION_CHANNELS = [
  {
    id: "promotion_channel",
    name: "Promotions & Offers",
    description: "Notifications for special offers, discounts and promotions",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "sound.mp3",
    vibrationPattern: [0, 300, 100, 300],
    lightColor: "#FF6B35",
    category: "PROMOTION",
  },
  {
    id: "order_cancellation_channel",
    name: "Order Cancellations",
    description: "Notifications when orders are cancelled",
    importance: Notifications.AndroidImportance.MAX,
    sound: "sound.mp3",
    vibrationPattern: [0, 1000, 300, 1000],
    lightColor: "#FF0000",
    category: "ORDER_CANCELLATION",
  },
  {
    id: "order_acceptance_channel",
    name: "Order Acceptance",
    description: "Notifications when orders are accepted by restaurants/drivers",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "sound.mp3",
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#00FF00",
    category: "ORDER_ACCEPTANCE",
  },
  {
    id: "order_status_channel",
    name: "Order Updates",
    description: "General order status and progress notifications",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "sound.mp3",
    vibrationPattern: [0, 200, 100, 200],
    lightColor: "#0099FF",
    category: "ORDER_STATUS",
  },
  {
    id: "pickup_drop_channel",
    name: "Pickup & Drop Updates",
    description: "Notifications for pickup and drop location updates",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "sound.mp3",
    vibrationPattern: [0, 600, 200, 600],
    lightColor: "#9900FF",
    category: "PICKUP_DROP",
  },
  {
    id: "payment_channel",
    name: "Payment Notifications",
    description: "Payment confirmations, refunds and billing notifications",
    importance: Notifications.AndroidImportance.MAX,
    sound: "sound.mp3",
    vibrationPattern: [0, 800, 400, 800],
    lightColor: "#FFD700",
    category: "PAYMENT",
  },
  {
    id: "app_update_channel",
    name: "App Updates",
    description: "Notifications about app updates and new features",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "sound.mp3",
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#00FFFF",
    category: "APP_UPDATE",
  },
  {
    id: "ride_request_channel",
    name: "Ride Requests",
    description: "Notifications for incoming ride requests",
    importance: Notifications.AndroidImportance.MAX,
    sound: "sound.mp3",
    vibrationPattern: [0, 500, 200, 500],
    lightColor: "#00FF00",
    category: "RIDE_REQUEST",
  },
  {
    id: "chat_channel",
    name: "Chat & Messages",
    description: "Notifications for chats and messages",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "message.mp3",
    vibrationPattern: [0, 300, 100, 300],
    lightColor: "#FF6B35",
    category: "PROMOTION",
  },
];

// Helper function to determine if locations are significantly different
const isSignificantLocationChange = (prevLocation, newLocation) => {
  if (!prevLocation || !newLocation) return true;

  const prevCoords = prevLocation.coords || prevLocation;
  const newCoords = newLocation.coords || newLocation;

  const latDiff = Math.abs(prevCoords.latitude - newCoords.latitude);
  const lngDiff = Math.abs(prevCoords.longitude - newCoords.longitude);

  return latDiff > 0.0001 || lngDiff > 0.0001;
};

// Update Modal Component
const UpdateModal = React.memo(({ visible, onUpdate, isForced = true }) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={() => {
      if (!isForced) {
        // Only allow closing if it's not a forced update
      }
    }}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {isForced ? "🚨 Update Required" : "📱 Update Available"}
          </Text>
        </View>

        <View style={styles.modalBody}>
          <Text style={styles.modalDescription}>
            {isForced
              ? "A critical update is required to continue using the app. Please update now to access all features."
              : "A new version of Olyox is available with exciting new features and improvements!"}
          </Text>

          <View style={styles.featureList}>
            <Text style={styles.featureTitle}>✨ What's New:</Text>
            <Text style={styles.featureItem}>• Enhanced performance</Text>
            <Text style={styles.featureItem}>• Bug fixes and improvements</Text>
            <Text style={styles.featureItem}>• Better user experience</Text>
          </View>
        </View>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.updateButton} onPress={onUpdate}>
            <Text style={styles.updateButtonText}>
              {isForced ? "Update Now" : "Update App"}
            </Text>
          </TouchableOpacity>

          {!isForced && (
            <TouchableOpacity style={styles.laterButton} onPress={() => { }}>
              <Text style={styles.laterButtonText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  </Modal>
));

// Permission Loading Screen Component
const PermissionLoadingScreen = React.memo(({ message }) => (
  <View style={styles.loaderContainer}>
    <StatusBar style="auto" />
    <LottieView
      source={require("./location.json")}
      autoPlay
      loop
      style={styles.lottieAnimation}
    />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
));

// Memoized loading screen component
const LoadingScreen = React.memo(() => (
  <View style={styles.loaderContainer}>
    <StatusBar style="auto" />
    <LottieView
      source={require("./location.json")}
      autoPlay
      loop
      style={styles.lottieAnimation}
    />
    <Text style={styles.loadingText}>Getting ready...</Text>
  </View>
));

const App = () => {
  // State
  const [isLogin, setIsLogin] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [locationFetchRetries, setLocationFetchRetries] = useState(0);
  const [fcmTokenSent, setFcmTokenSent] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [trackingPermissionStatus, setTrackingPermissionStatus] = useState(null);

  // NEW: Permission state tracking
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionState, setPermissionState] = useState({
    location: PERMISSION_STATE.PENDING,
    notification: PERMISSION_STATE.PENDING,
    tracking: PERMISSION_STATE.PENDING,
  });
  const [permissionMessage, setPermissionMessage] = useState('Initializing...');

  const { track } = useTrack();
  const { settings, refetch } = useSettings();

  // Refs
  const locationRef = useRef(null);
  const watchSubscriptionRef = useRef(null);
  const lastLocationUpdateTimeRef = useRef(0);
  const userDataRef = useRef(null);
  const fcmTokenSentRef = useRef(false);
  const versionCheckIntervalRef = useRef(null);
  const lastVersionCheckRef = useRef(0);
  const trackingPermissionRequestedRef = useRef(false);
  const facebookSDKInitializedRef = useRef(false);
  const permissionsCheckedRef = useRef(false);

  // Hooks
  const { isGranted, requestPermission, deviceId, fcmToken } =
    useNotificationPermission();

  // Create notification channels
  const createNotificationChannels = useCallback(async () => {
    if (Platform.OS === "android") {
      try {
        console.log("🔔 Creating notification channels...");

        for (const channel of NOTIFICATION_CHANNELS) {
          await Notifications.setNotificationChannelAsync(channel.id, {
            name: channel.name,
            description: channel.description,
            importance: channel.importance,
            sound: channel.sound,
            vibrationPattern: channel.vibrationPattern,
            lightColor: channel.lightColor,
            lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
            bypassDnd:
              channel.category === "RIDE_REQUEST" ||
              channel.category === "ORDER_CANCELLATION",
          });
        }

        console.log("✅ Notification channels created successfully");
      } catch (error) {
        console.error("❌ Error creating notification channels:", error);
        Sentry.captureException(error);
      }
    }
  }, []);

  // Memoized open settings function
  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
        );
      }
    } catch (error) {
      console.error("Error opening settings:", error);
      Sentry.captureException(error);
    }
  }, []);

  // Enhanced version comparison function
  const compareVersions = useCallback((current, latest) => {
    if (!current || !latest) return { needsUpdate: false, isForced: false };

    const currentParts = current.trim().split(".").map(Number);
    const latestParts = latest.trim().split(".").map(Number);

    const maxLength = Math.max(currentParts.length, latestParts.length);
    while (currentParts.length < maxLength) currentParts.push(0);
    while (latestParts.length < maxLength) latestParts.push(0);

    let needsUpdate = false;
    let isForced = false;

    for (let i = 0; i < maxLength; i++) {
      if (latestParts[i] > currentParts[i]) {
        needsUpdate = true;
        if (i === 0) {
          isForced = true;
        }
        break;
      } else if (latestParts[i] < currentParts[i]) {
        break;
      }
    }

    return { needsUpdate, isForced };
  }, []);

  // Enhanced version check
  const checkVersion = useCallback(
    async (forceCheck = false) => {
      const now = Date.now();

      if (
        !forceCheck &&
        now - lastVersionCheckRef.current < VERSION_CHECK_INTERVAL
      ) {
        console.log("⏳ Skipping version check - too soon since last check");
        return;
      }

      console.log("🔍 Checking app version...");

      try {
        const latestSettings = await findSettings();

        const currentVersion = Application.nativeApplicationVersion;
        console.log("📱 Current version:", currentVersion);

        const latestVersion =
          Platform.OS === "android"
            ? latestSettings?.appVersionOnAndroid
            : latestSettings?.appVersionOnIos;

        console.log("🆕 Latest version:", latestVersion);

        if (!latestVersion) {
          console.log("⚠️ No version info available from server");
          return;
        }

        const { needsUpdate, isForced } = compareVersions(
          currentVersion,
          latestVersion
        );

        lastVersionCheckRef.current = now;

        if (needsUpdate) {
          console.log(
            `📊 Update needed - Current: ${currentVersion}, Latest: ${latestVersion}, Forced: ${isForced}`
          );

          setUpdateInfo({
            currentVersion,
            latestVersion,
            isForced,
            releaseNotes: latestSettings?.releaseNotes || [],
          });

          setIsForceUpdate(isForced);
          setShowUpdateModal(true);

          if (isForced) {
            const backHandler = BackHandler.addEventListener(
              "hardwareBackPress",
              () => true
            );
            return () => backHandler.remove();
          }
        } else {
          console.log("✅ App is up to date");
          setShowUpdateModal(false);
        }
      } catch (error) {
        console.error("❌ Error checking app version:", error);
        Sentry.captureException(error, {
          tags: { feature: "version_check" },
          extra: { timestamp: new Date().toISOString() },
        });
      }
    },
    [compareVersions]
  );

  // Handle app update
  const handleUpdate = useCallback(async () => {
    try {
      const storeUrl =
        Platform.OS === "android"
          ? "https://play.google.com/store/apps/details?id=com.happy_coding.olyox&hl=en_IN"
          : "https://apps.apple.com/in/app/olyox-book-cab-hotel-food/id6744582670";

      console.log("🔗 Opening store URL:", storeUrl);

      const canOpen = await Linking.canOpenURL(storeUrl);
      if (canOpen) {
        await Linking.openURL(storeUrl);

        if (isForceUpdate) {
          setTimeout(() => {
            BackHandler.exitApp();
          }, 1000);
        }
      } else {
        console.error("❌ Cannot open store URL:", storeUrl);
        Alert.alert(
          "Error",
          "Unable to open app store. Please update the app manually.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("❌ Error opening store:", error);
      Sentry.captureException(error);
      Alert.alert(
        "Error",
        "Unable to open app store. Please update the app manually.",
        [{ text: "OK" }]
      );
    }
  }, [isForceUpdate]);

  const linking = {
    prefixes: ["https://olyox.in"],
    config: {
      screens: {
        share_ride: "app/share-ride/:rideId",
        Onboarding: "app/register-with-my-code/:code",
      },
    },
  };

  // Memoized throttled location update function
  const updateLocationState = useCallback((newLocation) => {
    const now = Date.now();
    locationRef.current = newLocation;

    if (
      now - lastLocationUpdateTimeRef.current >= MIN_UPDATE_INTERVAL ||
      isSignificantLocationChange(locationRef.current, newLocation)
    ) {
      console.log("📍 Updating location state:", newLocation);
      lastLocationUpdateTimeRef.current = now;
    }
  }, []);

  // Memoized location service manager
  const getLocationInBackground = useCallback(async () => {
    try {
      setPermissionMessage('Requesting location access...');

      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }

      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      console.log("🔍 Location services enabled:", isLocationEnabled);

      if (!isLocationEnabled) {
        setLocationError(ERROR_TYPES.LOCATION_UNAVAILABLE);
        setPermissionState(prev => ({ ...prev, location: PERMISSION_STATE.DENIED }));
        return false;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("🔐 Location permission status:", status);

      if (status !== "granted") {
        setLocationError(ERROR_TYPES.PERMISSION_DENIED);
        setPermissionState(prev => ({ ...prev, location: PERMISSION_STATE.DENIED }));
        return false;
      }

      setPermissionState(prev => ({ ...prev, location: PERMISSION_STATE.GRANTED }));
      setPermissionMessage('Location access granted...');

      try {
        const quickLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          maximumAge: 60000,
        });

        console.log("📍 Got quick initial location:", quickLocation);
        updateLocationState(quickLocation);

        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        })
          .then((accurateLocation) => {
            console.log("📍 Got accurate location:", accurateLocation);
            updateLocationState(accurateLocation);
          })
          .catch((error) => {
            console.log("Could not get accurate location:", error);
          });
      } catch (error) {
        console.error("❌ Error getting location from App.js:", error);

        try {
          const lastKnownLocation = await Location.getLastKnownPositionAsync();
          if (lastKnownLocation) {
            console.log("📍 Using last known location:", lastKnownLocation);
            updateLocationState(lastKnownLocation);
            setLocationError(null);
          } else {
            throw new Error("No last known location");
          }
        } catch (fallbackError) {
          if (error.message && error.message.includes("timeout")) {
            setLocationError(ERROR_TYPES.TIMEOUT);
          } else {
            setLocationError(ERROR_TYPES.UNKNOWN);
          }
          setLocationFetchRetries((prev) => prev + 1);
          return false;
        }
      }

      watchSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 10,
        },
        (newLocation) => {
          updateLocationState(newLocation);
        }
      );

      return true;
    } catch (error) {
      console.error("❗ Error in location service:", error);
      Sentry?.captureException?.(error);
      setLocationError(ERROR_TYPES.UNKNOWN);
      setPermissionState(prev => ({ ...prev, location: PERMISSION_STATE.DENIED }));
      return false;
    }
  }, [updateLocationState]);

  // Request Tracking Permission (iOS ATT)
  const requestTrackingPermission = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      console.log('⏭️ Skipping ATT - Android device');
      setPermissionState(prev => ({ ...prev, tracking: PERMISSION_STATE.GRANTED }));
      return 'granted';
    }

    if (trackingPermissionRequestedRef.current) {
      console.log('⏭️ ATT already requested, current status:', trackingPermissionStatus);
      return trackingPermissionStatus;
    }

    try {
      setPermissionMessage('Requesting tracking permission...');
      console.log('🔐 Requesting App Tracking Transparency permission...');

      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      console.log('📊 Current ATT status:', currentStatus);

      if (currentStatus === 'undetermined') {
        const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
        console.log('✅ ATT permission result:', status);
        setTrackingPermissionStatus(status);
        setPermissionState(prev => ({
          ...prev,
          tracking: status === 'granted' ? PERMISSION_STATE.GRANTED : PERMISSION_STATE.DENIED
        }));
        trackingPermissionRequestedRef.current = true;

        track(
          "PERMISSION",
          "app_tracking_transparency",
          `User ${status === 'granted' ? 'allowed' : 'denied'} tracking`,
          { status, platform: 'ios' }
        );

        return status;
      } else {
        console.log('ℹ️ ATT permission already determined:', currentStatus);
        setTrackingPermissionStatus(currentStatus);
        setPermissionState(prev => ({
          ...prev,
          tracking: currentStatus === 'granted' ? PERMISSION_STATE.GRANTED : PERMISSION_STATE.DENIED
        }));
        trackingPermissionRequestedRef.current = true;
        return currentStatus;
      }
    } catch (error) {
      console.error('❌ Error requesting tracking permission:', error);
      Sentry.captureException(error, {
        tags: { feature: 'app_tracking_transparency' },
        extra: { platform: 'ios' }
      });
      setTrackingPermissionStatus('denied');
      setPermissionState(prev => ({ ...prev, tracking: PERMISSION_STATE.DENIED }));
      trackingPermissionRequestedRef.current = true;
      return 'denied';
    }
  }, [trackingPermissionStatus, track]);

  // Initialize Facebook SDK
  const initializeFacebookSDK = useCallback(async (attStatus) => {
    if (Platform.OS !== 'ios') {
      console.log('⏭️ Skipping Facebook SDK - Android device');
      return;
    }

    if (facebookSDKInitializedRef.current) {
      console.log('⏭️ Facebook SDK already initialized');
      return;
    }

    try {
      console.log('🔵 Initializing Facebook SDK with ATT status:', attStatus);

      Settings.initializeSDK();
      console.log('✅ Facebook SDK initialized');

      if (attStatus === 'granted') {
        await Settings.setAdvertiserTrackingEnabled(true);
        console.log('✅ Facebook tracking ENABLED (user granted ATT permission)');
      } else {
        await Settings.setAdvertiserTrackingEnabled(false);
        console.log('⚠️ Facebook tracking DISABLED (user denied ATT permission or restricted)');
      }

      const isTrackingEnabled = await Settings.getAdvertiserTrackingEnabled();
      console.log('📊 Facebook tracking status confirmed:', isTrackingEnabled);

      facebookSDKInitializedRef.current = true;

      track(
        "SDK_INIT",
        "facebook_sdk",
        "Facebook SDK initialized",
        {
          trackingEnabled: isTrackingEnabled,
          attStatus,
          platform: 'ios'
        }
      );

    } catch (error) {
      console.error('❌ Facebook SDK initialization failed:', error);
      Sentry.captureException(error, {
        tags: { feature: 'facebook_sdk' },
        extra: { attStatus, platform: 'ios' }
      });
    }
  }, [track]);

  // Request Notification Permission
  const requestNotificationPermission = useCallback(async () => {
    try {
      setPermissionMessage('Requesting notification access...');
      console.log('🔔 Requesting notification permission...');

      if (!isGranted) {
        await requestPermission();
        setPermissionState(prev => ({
          ...prev,
          notification: isGranted ? PERMISSION_STATE.GRANTED : PERMISSION_STATE.DENIED
        }));
        return isGranted;
      }

      setPermissionState(prev => ({ ...prev, notification: PERMISSION_STATE.GRANTED }));
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      setPermissionState(prev => ({ ...prev, notification: PERMISSION_STATE.DENIED }));
      return false;
    }
  }, [isGranted, requestPermission]);

  // NEW: Comprehensive permission request flow
  const requestAllPermissions = useCallback(async () => {
    if (permissionsCheckedRef.current) {
      console.log('⏭️ Permissions already checked');
      return true;
    }

    console.log('🚀 Starting comprehensive permission flow...');
    setPermissionMessage('Requesting permissions...');

    try {
      // STEP 1: Request ATT (iOS only) - MUST be first
      console.log('📍 Step 1: Requesting ATT permission...');
      const attStatus = await requestTrackingPermission();
      console.log('✅ Step 1 complete. ATT Status:', attStatus);

      // STEP 2: Initialize Facebook SDK AFTER ATT (iOS only)
      console.log('📍 Step 2: Initializing Facebook SDK...');
      await initializeFacebookSDK(attStatus);
      console.log('✅ Step 2 complete.');

      // STEP 3: Request Location Permission
      console.log('📍 Step 3: Requesting location permission...');
      const locationGranted = await getLocationInBackground();
      console.log('✅ Step 3 complete. Location granted:', locationGranted);

      if (!locationGranted) {
        console.log('❌ Location permission denied');
        setPermissionsGranted(false);
        return false;
      }

      // STEP 4: Request Notification Permission
      console.log('📍 Step 4: Requesting notification permission...');
      await requestNotificationPermission();
      console.log('✅ Step 4 complete.');

      // STEP 5: Create notification channels (Android)
      console.log('📍 Step 5: Creating notification channels...');
      await createNotificationChannels();
      console.log('✅ Step 5 complete.');

      // All permissions granted
      permissionsCheckedRef.current = true;
      setPermissionsGranted(true);
      setPermissionMessage('All permissions granted!');

      console.log('🎉 All permissions successfully granted!');
      return true;

    } catch (error) {
      console.error('❌ Error in permission flow:', error);
      Sentry.captureException(error, {
        tags: { feature: 'permission_flow' },
        extra: { timestamp: new Date().toISOString() }
      });
      setPermissionsGranted(false);
      return false;
    }
  }, [
    requestTrackingPermission,
    initializeFacebookSDK,
    getLocationInBackground,
    requestNotificationPermission,
    createNotificationChannels
  ]);

  // ============================================
  // MAIN APP INITIALIZATION SEQUENCE
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization sequence...');

        // CRITICAL: Request ALL permissions FIRST before anything else
        const allPermissionsGranted = await requestAllPermissions();

        if (!allPermissionsGranted || !isMounted) {
          console.log('⚠️ Not all permissions granted or component unmounted');
          if (isMounted) {
            setInitialLoading(false);
          }
          return;
        }

        // Only proceed after permissions are granted
        console.log('📍 Checking login status...');
        const db_token = await tokenCache.getToken("auth_token_db");

        if (isMounted) {
          setIsLogin(db_token !== null);

          if (db_token !== null) {
            const userData = await find_me();
            if (isMounted) {
              userDataRef.current = userData;
            }
          }
        }
        console.log('✅ Login check complete. Logged in:', db_token !== null);

        // Check app version
        console.log('📍 Checking app version...');
        await checkVersion(true);
        console.log('✅ Version check complete.');

        // Track app start
        track(
          "ACTION",
          "app_start",
          "User opened the app",
          {
            deviceInfo: Platform.OS,
            timestamp: new Date().toISOString(),
            permissionsGranted: allPermissionsGranted,
            trackingEnabled: trackingPermissionStatus === 'granted'
          }
        );

        console.log('🎉 App initialization complete!');

        if (isMounted) {
          setInitialLoading(false);
        }

      } catch (error) {
        console.error('❌ App initialization error:', error);
        Sentry.captureException(error, {
          tags: { feature: 'app_initialization' },
          extra: { timestamp: new Date().toISOString() }
        });

        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    initializeApp();

    // Safety timeout
    const timer = setTimeout(() => {
      if (isMounted && !permissionsGranted) {
        console.log('⏰ Max loading time reached');
        setInitialLoading(false);
      }
    }, MAX_LOADING_TIME);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
        console.log("🧹 Cleaned up location watcher.");
      }
    };
  }, [requestAllPermissions, checkVersion, track, trackingPermissionStatus, permissionsGranted]);

  // ============================================
  // END MAIN INITIALIZATION
  // ============================================

  // Periodic version check
  useEffect(() => {
    checkVersion(true);

    versionCheckIntervalRef.current = setInterval(() => {
      checkVersion(false);
    }, VERSION_CHECK_INTERVAL);

    return () => {
      if (versionCheckIntervalRef.current) {
        clearInterval(versionCheckIntervalRef.current);
      }
    };
  }, [checkVersion]);

  // FCM Token handling
  useEffect(() => {
    if (
      fcmTokenSentRef.current ||
      !fcmToken ||
      !userDataRef.current?.user?._id ||
      !permissionsGranted
    ) {
      return;
    }

    const sendFcmTokenToServer = async () => {
      try {
        console.log("📤 Sending FCM token to server:", {
          fcmToken,
          userId: userDataRef.current.user._id,
        });

        await axios.post(`${API_URL}/rider/fcm/add`, {
          fcm: fcmToken,
          platform: Platform.OS,
          id: userDataRef.current.user._id,
        });

        console.log("✅ FCM token sent successfully");
        fcmTokenSentRef.current = true;
        setFcmTokenSent(true);
      } catch (error) {
        console.error(
          "❌ FCM registration error:",
          error?.response?.data || error.message
        );
        Sentry.captureException(error);
      }
    };

    sendFcmTokenToServer();
  }, [fcmToken, userDataRef.current?.user?._id, permissionsGranted]);

  // Handle location retry logic
  useEffect(() => {
    if (
      (locationError === ERROR_TYPES.TIMEOUT ||
        locationError === ERROR_TYPES.UNKNOWN) &&
      locationFetchRetries <= MAX_RETRY_ATTEMPTS &&
      permissionsGranted
    ) {
      const retryDelay = locationFetchRetries * 5000;
      const retryTimer = setTimeout(() => {
        getLocationInBackground();
      }, retryDelay);

      return () => clearTimeout(retryTimer);
    }
  }, [locationError, locationFetchRetries, getLocationInBackground, permissionsGranted]);

  // Routes definition
  const routes = useMemo(
    () => (
      <>
        <Stack.Screen
          name="Home"
          options={{ headerShown: false }}
          component={HomeScreen}
        />
        {/* All other screens remain the same */}
        <Stack.Screen
          name="Start_Booking_Ride"
          options={{ headerShown: false }}
          component={RideLocationSelector}
        />
        <Stack.Screen
          name="second_step_of_booking"
          options={{ headerShown: false }}
          component={Show_Cabs}
        />
        <Stack.Screen
          name="back_searching"
          options={{ headerShown: false }}
          component={BackRideSearching}
        />
        <Stack.Screen
          name="confirm_screen_done"
          options={{ headerShown: false }}
          component={IntercityRides}
        />
        <Stack.Screen
          name="IntercityRide"
          options={{
            headerShown: false,
            headerTitle: "Intercity Ride",
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "#DC2626" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackTitleVisible: false,
          }}
          component={IntercityRide}
        />
        <Stack.Screen
          name="Offers"
          options={{ headerShown: false }}
          component={Offer}
        />
        <Stack.Screen
          name="share_ride"
          options={{ headerShown: false }}
          component={ShareRideScreen}
        />
        <Stack.Screen
          name="confirm_screen"
          options={{ headerShown: false }}
          component={BookingConfirmation}
        />
        <Stack.Screen
          name="driver_match"
          options={{ headerShown: false }}
          component={DriverMatching}
        />
        <Stack.Screen
          name="RideStarted"
          options={{ headerShown: false }}
          component={OnWayRide}
        />
        <Stack.Screen
          name="RateRiderOrRide"
          options={{ headerShown: false }}
          component={RateRiderOrRide}
        />
        <Stack.Screen
          name="AppSettings"
          options={{ headerShown: false }}
          component={AppSetting}
        />
        <Stack.Screen
          name="Profile"
          component={UserProfile}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Transport"
          options={{ headerShown: false }}
          component={MainTransport}
        />
        <Stack.Screen
          name="delivery_parcel"
          options={{ headerShown: false }}
          component={Parcel_Transport}
        />
        <Stack.Screen
          name="Book-Parcel"
          options={{ headerShown: false }}
          component={BookParcel}
        />
        <Stack.Screen
          name="Parcel"
          options={{ headerShown: true }}
          component={Parcel_Orders}
        />
        <Stack.Screen
          name="OrderDetails"
          options={{ headerShown: false }}
          component={OrderDetails}
        />
        <Stack.Screen
          name="Onboarding"
          options={{ headerShown: false }}
          component={OnboardingScreen}
        />
        <Stack.Screen
          name="Activity"
          options={{ headerShown: false }}
          component={ActivityScreen}
        />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: false }}
          component={NotificationsScreens}
        />
        <Stack.Screen
          name="RatingReservations"
          options={{
            headerShown: true,
            headerTitle: "Rate Your Driver",
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "#b32d2d" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackTitleVisible: false,
          }}
          component={RatingReservations}
        />
        <Stack.Screen
          name="comming-soon"
          options={{
            headerShown: true,
            title: "Coming Soon",
            headerTitleAlign: "center",
            headerTitleStyle: { fontWeight: "bold" },
          }}
          component={ComingSoon}
        />
        <Stack.Screen
          name="Parcel_Booking"
          options={{ headerShown: false }}
          component={Get_Pickup_Drop}
        />
        <Stack.Screen
          name="Choose_Vehicle"
          options={{ headerShown: false }}
          component={Choose_Vehicle}
        />
        <Stack.Screen
          name="PaymentScreen"
          options={{ headerShown: true, title: "Review Booking" }}
          component={PaymentScreen}
        />
        <Stack.Screen
          name="Booking_Complete_Find_Rider"
          options={{ headerShown: true, title: "Parcel Info" }}
          component={FindRider}
        />
        <Stack.Screen
          name="spalsh"
          options={{ headerShown: false }}
          component={SplashScreen}
        />

        {/* Hotels */}
        <Stack.Screen
          name="Hotel"
          options={{ headerShown: false }}
          component={AllHotelRooms}
        />

           <Stack.Screen
          name="hotel_details"
          options={{ headerShown: false }}
          component={HotelDetails}
        />

           <Stack.Screen
          name="HotelBooking"
          options={{ headerShown: false }}
          component={HotelBooking}
        />


           <Stack.Screen
          name="BookingConfirmation"
          options={{ headerShown: false }}
          component={ConfirmBooking}
        />

           <Stack.Screen
          name="MyBookings"
          options={{ headerShown: false }}
          component={MyBookings}
        />

             <Stack.Screen
          name="BookingDetails"
          options={{ headerShown: false }}
          component={BookingDetails}
        />
{/* ConfirmBooking  */}


        <Stack.Screen
          name="open"
          options={{ headerShown: false }}
          component={ManualCheck}
        />
        <Stack.Screen
          name="policy"
          options={{ headerShown: true, title: "Olyox App Policies" }}
          component={Policy}
        />
        <Stack.Screen
          name="policyauth"
          options={{ headerShown: true, title: "Olyox App Policies" }}
          component={Policy}
        />
        <Stack.Screen
          name="Help_me"
          options={{ headerShown: false, title: "Olyox Center" }}
          component={Help_On}
        />
        <Stack.Screen
          name="LocationError"
          options={{ headerShown: false }}
          children={(props) => (
            <LocationErrorScreen
              {...props}
              getLocationInBackground={getLocationInBackground}
              locationError={locationError}
              openSettings={openSettings}
            />
          )}
        />
      </>
    ),
    [locationError, openSettings, getLocationInBackground]
  );

  // Show permission loading screen while requesting permissions
  if (initialLoading || !permissionsGranted) {
    return <PermissionLoadingScreen message={permissionMessage} />;
  }

  // Show update modal and block app for forced updates
  if (isForceUpdate && showUpdateModal) {
    return (
      <View style={{ flex: 1 }}>
        <UpdateModal
          visible={showUpdateModal}
          onUpdate={handleUpdate}
          isForced={isForceUpdate}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SocketProvider>
        <LocationProvider initialLocation={locationRef.current}>
          <GuestProvider>
            <RideProvider>
              <BookingParcelProvider>
                <SafeAreaProvider>
                  <StatusBar style="auto" />
                  <ErrorBoundary>
                    <NavigationContainer ref={navigationRef} linking={linking}>
                      <RideSearchingProvider>
                        <Stack.Navigator initialRouteName={"spalsh"}>
                          {routes}
                        </Stack.Navigator>
                      </RideSearchingProvider>

                      {/* Show location error banner if needed */}
                      {locationError && (
                        <LocationPermissionModal
                          show={!!locationError}
                          onPress={openSettings}
                        />
                      )}

                      {/* Update Modal for non-forced updates */}
                      <UpdateModal
                        visible={showUpdateModal && !isForceUpdate}
                        onUpdate={handleUpdate}
                        isForced={false}
                      />
                    </NavigationContainer>
                  </ErrorBoundary>
                </SafeAreaProvider>
              </BookingParcelProvider>
            </RideProvider>
          </GuestProvider>
        </LocationProvider>
      </SocketProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  modalBody: {
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  featureList: {
    marginTop: 8,
  },
  featureTitle: {
    fontWeight: "600",
    fontSize: 16,
    color: "#000",
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  updateButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  laterButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  laterButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});

const MemoizedApp = React.memo(App);
const WrappedApp = Sentry.wrap(MemoizedApp);

const RootApp = () => (
  <FoodProvider>
    <OlyoxAppUpdate>
      <WrappedApp />
    </OlyoxAppUpdate>
  </FoodProvider>
);

AppRegistry.registerComponent(appName, () => RootApp);

export default RootApp;