// App.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  Platform,
  AppState,
  Alert,
  BackHandler,
  NativeModules,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useKeepAwake } from "expo-keep-awake";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

// Firebase & Notifications
import messaging from "@react-native-firebase/messaging";
import { initializeApp ,getApps } from "@react-native-firebase/app";

// Screens
import Splash from "./src/screens/Spalsh/Splash";
import Home from "./src/pages/Home";
import Auth from "./src/screens/Login/Auth";
import Login from "./src/screens/Login/Login";
import Register from "./src/screens/Login/Register";
import BhVerification from "./src/pages/BH_Re/BhVerification";
import RegisterWithBh from "./src/pages/BH_Re/Bh_registeration";
import BhOtpVerification from "./src/pages/BH_Re/BhOtpVerification";
import Documents from "./src/pages/registration/Document";
import Wait_Screen from "./src/pages/registration/Wait_Screen";
import Profile from "./src/screens/Profile/Profile";
import Settings from "./src/screens/settings/Settings";
import Withdraw from "./src/screens/Earnings/Withdraw";
import RechargeViaOnline from "./src/screens/Earnings/RechargeViaOnline";
import UploadQr from "./src/screens/Earnings/UploadQr";
import RechargeHistory from "./src/screens/Recharge/RechargeHistory";
import ReferralHistory from "./src/screens/Recharge/ReferalHistory";
import RideFirstStepScreen from "./src/screens/Rides_Screen/RideFirstStepScreen";

// Stores
import useSocketStore from "./Store/SocketStore";
import useUserStore from "./Store/useUserStore";
import loginStore from "./Store/authStore";
import useRideStore from "./Store/PoolingStore";

// Services
import VersionService from "./services/VersionService";
import {
  requestUserPermission,
  getFCMToken,
  setupFCMListeners,
  createNotificationChannels,
  getChannelId,
} from "./utility/NotificationService";

import ErrorBoundaryWrapper from "./context/ErrorBoundary";
import OlyoxAppUpdate from "./context/CheckAppUpdate";
import UpdateModal from "./src/components/common/UpdateModal";
import { API_URL_APP } from "./constant/api";
import { ThemeProvider } from "./src/theme/ThemeContext";
import PreferenceScreen from "./src/screens/PreferenceScreen/PreferenceScreen";
import Reserve from "./src/screens/Reserves/reserve";
import RideCancelledScreen from "./src/screens/Rides_Screen/steps/RideCancelledScreen";

const Stack = createNativeStackNavigator();

// Android-only Native Modules
const FloatingWidget =
  Platform.OS === "android" ? NativeModules.FloatingWidget : null;
const RideModule = Platform.OS === "android" ? NativeModules.RideModule : null;

const RIDE_REQUEST_CHANNEL = "ride_request_channel";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA-mGbVdZs1VXF24aUPZaXkJgMTo7BDa4Y",
  authDomain: "olyox-6215a.firebaseapp.com",
  projectId: "olyox-6215a",
  storageBucket: "olyox-6215a.appspot.com",
  messagingSenderId: "900366491123",
  appId: "1:900366491123:ios:b4763248beab2556ecc686",
};

async function initFirebase() {
  console.log("🔥 [initFirebase] Start Firebase initialization");

  const existingApps = getApps();
  console.log("📌 [initFirebase] Existing Firebase Apps:", existingApps);

  if (existingApps.length === 0) {
    console.log("🚀 [initFirebase] No Firebase app found. Initializing now...");

    try {
      console.log("🛠 [initFirebase] Calling initializeApp() with config:", firebaseConfig);

      const app = initializeApp(firebaseConfig);

      console.log("✅ [initFirebase] Firebase initialized successfully:", app);
      console.log("🎯 [initFirebase] Returning newly created Firebase app");

      return app;

    } catch (err) {
      console.error("❌ [initFirebase] Error during Firebase initialization:", err);
      console.error("💥 [initFirebase] Stack Trace:", err?.stack);
    }

  } else {
    console.log("🔁 [initFirebase] Firebase already initialized");
    console.log("📌 [initFirebase] Returning existing app:", existingApps[0]);

    return existingApps[0];
  }

  console.log("⚠️ [initFirebase] End of function reached without return (should not happen)");
}


// Permission Alert Screen Component
const PermissionAlertScreen = ({ missingPermissions, onRetry, onExit }) => {
  const openSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={styles.permissionContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>Permissions Required</Text>
        <Text style={styles.permissionText}>
          This app requires the following permissions to function properly:
        </Text>

        <View style={styles.permissionList}>
          {missingPermissions.includes("location") && (
            <View style={styles.permissionItem}>
              <Text style={styles.permissionBullet}>•</Text>
              <Text style={styles.permissionItemText}>
                <Text style={styles.bold}>Location:</Text> To show your current
                position and find nearby rides
              </Text>
            </View>
          )}
          {missingPermissions.includes("notification") && (
            <View style={styles.permissionItem}>
              <Text style={styles.permissionBullet}>•</Text>
              <Text style={styles.permissionItemText}>
                <Text style={styles.bold}>Notifications:</Text> To receive ride
                requests and updates
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={openSettings}>
          <Text style={styles.secondaryButtonText}>Open Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Exit App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  useKeepAwake();
  const navigationRef = useNavigationContainerRef();

  const [isReady, setIsReady] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [missingPermissions, setMissingPermissions] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const { token } = loginStore();
  const { initializeSocket, disconnectSocket, reconnectSocket } =
    useSocketStore();
  const { user, fetchUserDetails } = useUserStore();
  const { startPooling } = useRideStore();

  const isInitializing = useRef(false);

  // Check all permissions
  const checkAllPermissions = async () => {
    const missing = [];

    // Check Location Permission
    const { status: locationStatus } =
      await Location.getForegroundPermissionsAsync();
    if (locationStatus !== "granted") {
      missing.push("location");
    }

    // Check Notification Permission
    const { status: notificationStatus } =
      await Notifications.getPermissionsAsync();
    if (notificationStatus !== "granted") {
      missing.push("notification");
    }

    return missing;
  };

  // Request all permissions
  const requestAllPermissions = async () => {
    const missing = [];

    // Request Location Permission
    const { status: locationStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (locationStatus !== "granted") {
      missing.push("location");
    }

    // Request Notification Permission
    const { status: notificationStatus } =
      await Notifications.requestPermissionsAsync();
    if (notificationStatus !== "granted") {
      missing.push("notification");
    }

    return missing;
  };

  // Initialize app after permissions granted
  const initializeApp = async () => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    try {
      // 1. Check permissions first
      let missing = await checkAllPermissions();

      if (missing.length > 0) {
        // Try to request permissions
        missing = await requestAllPermissions();

        if (missing.length > 0) {
          // Show permission alert screen
          setMissingPermissions(missing);
          setShowPermissionAlert(true);
          isInitializing.current = false;
          return;
        }
      }

      // 2. All permissions granted - initialize app
      await createNotificationChannels();
      await requestUserPermission();
      await getFCMToken(token);
      await setupFCMListeners();

      // 3. Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // 4. Start pooling & socket (if logged in)
      if (token) {
        startPooling();
        const userData = user || (await fetchUserDetails());

        if (userData?._id) {
          const userType = userData.category === "cab" ? "driver" : "parcel";
          await initializeSocket(
            userData._id,
            userType,
            userData.name || "User"
          );

          // Android: Start native pooling service
          if (Platform.OS === "android" && RideModule) {
            try {
              RideModule.startPoolingService?.(
                userData.isAvailable || false,
                userData._id,
                API_URL_APP
              );
            } catch (error) {
              console.error("Error starting pooling service:", error);
            }
          }
        }
      }

      // 5. Version check
      const versionService = VersionService.getInstance();
      versionService.startPeriodicCheck((info) => {
        if (info) {
          setUpdateInfo(info);
          setShowUpdateModal(true);
        }
      });

      setIsReady(true);
      setShowPermissionAlert(false);
    } catch (err) {
      console.error("Initialization failed:", err);
      Alert.alert("Initialization Failed", "Please restart the app.");
    } finally {
      isInitializing.current = false;
    }
  };
useEffect(() => {
    if(Platform.OS ==="ios"){
      initFirebase()
    }
  }, [])
  // Background Message Handler (Android only)
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const unsubscribe = messaging().setBackgroundMessageHandler(
      async (remoteMessage) => {
        if (!FloatingWidget) return;

        const channelId = getChannelId(remoteMessage);

        // Stop widget on cancel/payment/etc.
        if (
          [
            "ride_cancel_channel",
            "another_driver_accept",
            "payment_complete_channel",
          ].includes(channelId)
        ) {
          try {
            await FloatingWidget.stopWidget?.();
            await FloatingWidget.clearWidgetData?.();
            await FloatingWidget.stopSound?.();
          } catch (error) {
            console.error("Error stopping widget:", error);
          }
          return;
        }

        // Show floating widget for ride request
        if (channelId === RIDE_REQUEST_CHANNEL && remoteMessage.data?.rideId) {
          const d = remoteMessage.data;
          try {
            await FloatingWidget.startWidgetWithData?.({
              vehicleType: d.vehicleType || "",
              pickup: d.pickup || "",
              drop: d.drop || "",
              price: d.price ? `₹${d.price}` : "",
              rideId: d.rideId,
              distance_from_pickup: `${d.distance_from_pickup_km || ""} KM`,
              dropDistance: `${d.distance || ""} KM`,
              acceptUrl: `https://www.appv2.olyox.com/api/v1/new/ride-action-reject-accepet-via/${d.rideId}/${token}/accept`,
              rejectUrl: `https://www.appv2.olyox.com/api/v1/new/ride-action-reject-accepet-via/${d.rideId}/${token}/reject`,
              playSound: true,
            });
          } catch (error) {
            console.error("Error starting widget:", error);
          }
        }
      }
    );

    return unsubscribe;
  }, [token]);

  // Handle AppState (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (
          token &&
          Platform.OS === "android" &&
          FloatingWidget?.resumeWidget
        ) {
          try {
            FloatingWidget.resumeWidget();
          } catch (error) {
            console.error("Error resuming widget:", error);
          }
        }
        reconnectSocket?.();
      } else {
        if (Platform.OS === "android" && FloatingWidget?.pauseWidget) {
          try {
            FloatingWidget.pauseWidget();
          } catch (error) {
            console.error("Error pausing widget:", error);
          }
        }
        disconnectSocket?.();
      }
    });

    return () => subscription.remove();
  }, [token]);

  // Start initialization on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Block back button globally
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );
    return () => backHandler.remove();
  }, []);

  // Handle permission retry
  const handlePermissionRetry = () => {
    setShowPermissionAlert(false);
    initializeApp();
  };

  // Handle app exit
  const handleExit = () => {
    BackHandler.exitApp();
  };

  // Show permission alert screen
  if (showPermissionAlert) {
    return (
      <PermissionAlertScreen
        missingPermissions={missingPermissions}
        onRetry={handlePermissionRetry}
        onExit={handleExit}
      />
    );
  }

  // Show forced update modal
  if (updateInfo?.isForced && showUpdateModal) {
    return (
      <UpdateModal
        visible={true}
        onUpdate={() => VersionService.getInstance().handleUpdate(true)}
        isForced={true}
        updateInfo={updateInfo}
      />
    );
  }

  // Show splash until initialization complete
  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.splashText}>Initializing app...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundaryWrapper>
        <ThemeProvider>
          <OlyoxAppUpdate>
            <SafeAreaProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar barStyle="dark-content" />
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="splash" component={Splash} />
                  <Stack.Screen name="auth" component={Auth} />
                  <Stack.Screen name="login" component={Login} />
                  <Stack.Screen name="register" component={Register} />
                  <Stack.Screen name="bh_verify" component={BhVerification} />
                  <Stack.Screen name="step_2" component={RegisterWithBh} />
                  <Stack.Screen
                    name="OtpVerify"
                    component={BhOtpVerification}
                  />
                  <Stack.Screen name="DocumentUpload" component={Documents} />
                  <Stack.Screen name="PreferenceScreen" component={PreferenceScreen}/>
                  <Stack.Screen name="Wait_Screen" component={Wait_Screen} />
                  <Stack.Screen name="Home" component={Home} />
                  <Stack.Screen
                    name="current_ride"
                    component={RideFirstStepScreen}
                  />
                  <Stack.Screen name="reserve" component={RideCancelledScreen}/>
                  {/* <Stack.Screen name="reserve" component={Reserve}/> */}
                  <Stack.Screen name="ProfileScreen" component={Profile} />
                  <Stack.Screen name="Settings" component={Settings} />
                  <Stack.Screen name="WithdrawScreen" component={Withdraw} />
                  <Stack.Screen
                    name="RechargeScreen"
                    component={RechargeViaOnline}
                  />
                  <Stack.Screen name="upload-qr" component={UploadQr} />
                  <Stack.Screen
                    name="recharge-history"
                    component={RechargeHistory}
                  />
                  <Stack.Screen
                    name="referral-history"
                    component={ReferralHistory}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </OlyoxAppUpdate>
        </ThemeProvider>
      </ErrorBoundaryWrapper>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  splashText: {
    color: "white",
    marginTop: 20,
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionList: {
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  permissionBullet: {
    color: "#e74c3c",
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  permissionItemText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "bold",
    color: "#e74c3c",
  },
  primaryButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  secondaryButtonText: {
    color: "#e74c3c",
    fontSize: 16,
    fontWeight: "bold",
  },
  exitButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    alignItems: "center",
  },
  exitButtonText: {
    color: "#888",
    fontSize: 14,
  },
});
