import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Application from "expo-application";
import messaging from "@react-native-firebase/messaging";

const AppPermissionContext = createContext(null);
export const useAppPermissions = () => useContext(AppPermissionContext);

/* ===============================
   🔔 ANDROID NOTIFICATION CHANNELS
================================ */
const setupNotificationChannels = async () => {
  if (Platform.OS !== "android") return;

  const channels = [
    {
      id: "new-booking",
      name: "New Booking",
      importance: Notifications.AndroidImportance.MAX,
      sound: "new_booking",
      vibrationPattern: [0, 300, 300, 300],
      lightColor: "#2ecc71",
      description: "New hotel booking notifications",
    },
    {
      id: "booking-update",
      name: "Booking Update",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "booking_update",
      description: "Updates or modifications to bookings",
    },
    {
      id: "booking-cancel",
      name: "Booking Cancel",
      importance: Notifications.AndroidImportance.MAX,
      sound: "booking_cancel",
      vibrationPattern: [0, 500, 500],
      lightColor: "#e74c3c",
      description: "Booking cancellation alerts",
    },
    {
      id: "app-update",
      name: "App Update",
      importance: Notifications.AndroidImportance.LOW,
      sound: "booking_update",
      description: "App updates and feature announcements",
    },
    {
      id: "information",
      name: "Information",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "booking_update",
      description: "Hotel information, reminders, notices",
    },
    {
      id: "other",
      name: "Other",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "booking_update",
      description: "Miscellaneous notifications",
    },
  ];

  for (const channel of channels) {
    await Notifications.setNotificationChannelAsync(channel.id, channel);
  }

  console.log("✅ Notification channels created");
};

export const AppPermissionProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [appVersion, setAppVersion] = useState(null);
  const [androidId, setAndroidId] = useState(null);
  const [permissionLoading, setPermissionLoading] = useState(true);

  /* ===============================
     🔔 NOTIFICATION PERMISSION
  =============================== */
  const requestNotificationPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) return;

      const token = await messaging().getToken();
      console.log("🔥 FCM TOKEN:", token);
      setFcmToken(token);
    } catch (err) {
      console.log("Notification permission error:", err);
    }
  };

  /* ===============================
     📍 LOCATION PERMISSION
  =============================== */
  const requestLocationPermission = async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log("📍 LOCATION:", currentLocation);

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      });
    } catch (err) {
      console.log("Location permission error:", err);
    }
  };

  /* ===============================
     📦 APP INFO
  =============================== */
  const loadAppInfo = async () => {
    try {
      const version = Application.nativeApplicationVersion;
      setAppVersion(version);
      console.log("📦 APP VERSION:", version);

      if (Platform.OS === "android") {
        const id = await Application.getAndroidId();
        setAndroidId(id);
        console.log("🤖 ANDROID ID:", id);
      }
    } catch (err) {
      console.log("App info error:", err);
    }
  };

  /* ===============================
     🚀 INIT ON APP START
  =============================== */
  useEffect(() => {
    const init = async () => {
      try {
        await setupNotificationChannels();   // 👈 VERY IMPORTANT
        await Promise.all([
          requestNotificationPermission(),
          requestLocationPermission(),
          loadAppInfo(),
        ]);
      } finally {
        setPermissionLoading(false);
      }
    };

    init();
  }, []);

  return (
    <AppPermissionContext.Provider
      value={{
        location,
        fcmToken,
        appVersion,
        androidId,
        permissionLoading,
      }}
    >
      {children}
    </AppPermissionContext.Provider>
  );
};
