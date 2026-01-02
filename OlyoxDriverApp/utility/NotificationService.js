import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { NativeModules, Platform, NativeEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL_APP } from "../constant/api";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";

// ========================
// 1. SEND LOCATION TO SERVER ON NOTIFICATION
// ========================
const sendCurrentLocationToServer = async (authToken) => {
  console.log("🛰️ [sendCurrentLocationToServer] INIT");

  if (!authToken) {
    console.warn("⚠️ Missing auth token — cannot send location.");
    return;
  }

  console.log("🔑 AuthToken (trimmed):", `${authToken.slice(0, 10)}...`);
  console.log("📍 Requesting location permission...");

  try {
    // 1️⃣ Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("❌ Location permission not granted.");
      return;
    }
    console.log("✅ Location permission granted.");

    // 2️⃣ Get current location
    console.log("📡 Getting current position...");
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const { latitude, longitude } = location.coords;
    console.log("✅ Got location:", { latitude, longitude });

    // 3️⃣ Validate coordinates
    if (!latitude || !longitude) {
      console.error("❌ Invalid coordinates:", location.coords);
      return;
    }

    const payload = {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    };

    console.log("📦 Prepared payload:", payload);

    // 4️⃣ Send to backend
    const endpoint = `${API_URL_APP}/webhook/cab-receive-location`;
    console.log("🚀 Sending location to server:", endpoint);

    try {
      const res = await axios.post(endpoint, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000, // 10 sec timeout
      });

      console.log("✅ Server response (status):", res.status);
      console.log("🧾 Server data:", res.data);
    } catch (err) {
      console.error("❌ Failed to send location to server");
      console.error("   ↳ Message:", err.message);
      if (err.response) {
        console.error("   ↳ Server responded with error:", {
          status: err.response.status,
          data: err.response.data,
        });
      } else if (err.request) {
        console.error("   ↳ No response received:", err.request);
      } else {
        console.error("   ↳ Axios config error:", err.config);
      }
    }

    console.log("📤 [sendCurrentLocationToServer] Completed successfully.");
  } catch (error) {
    console.error("💥 Unexpected error in sendCurrentLocationToServer:");
    console.error(error);
  }

};



// Haversine distance helper (ensure this is defined somewhere in your file)

// ========================
// 3. FCM & NOTIFICATION SETUP (UPDATED)
// ========================
const FCM_TOKEN_KEY = "fcm_token";

/**
 * Request user permission for notifications
 */
export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log("Notification permission enabled");
    await getFCMToken();
  } else {
    console.log("Notification permission denied");
  }
};

/**
 * Get or generate FCM token
 */
export const getFCMToken = async (token) => {
  try {
    let authToken =
      token ||
      (await AsyncStorage.getItem("auth_token")) ||
      (await SecureStore.getItemAsync("auth_token"));

    if (!authToken) {
      console.log("No auth token, cannot update FCM token on server.");
      return null;
    }

    let fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

    if (fcmToken) {
      console.log("Using stored FCM Token:", fcmToken);
    } else {
      fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log("New FCM Token generated:", fcmToken);
        await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
      } else {
        console.log("Failed to get FCM token");
        return null;
      }
    }

    const deviceId = Application.getAndroidId();
    const res = await axios.post(
      `${API_URL_APP}/api/v1/rider/update-fcm`,
      {
        fcmToken,
        platform: Platform.OS,
        deviceId,
        timestamp: new Date().toISOString(),
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log("FCM token updated on server:", res.data);
    return fcmToken;
  } catch (error) {
    console.log("Error getting/saving FCM token:", error.message);
    return null;
  }
};

/**
 * Determine notification channel ID
 */
export const getChannelId = (remoteMessage) => {
  const title = remoteMessage.notification?.title || "";
  const body = remoteMessage.notification?.body || "";
  const dataChannelId =
    remoteMessage.data?.channelId || remoteMessage.data?.channel_id || "";

  if (dataChannelId) return dataChannelId;

  const content = `${title} ${body}`.toLowerCase();
  if (content.includes("cancel")) return "ride_cancel_channel";
  if (content.includes("decline")) return "decline";
  if (content.includes("accept")) return "ride_accept";
  if (content.includes("earning") || content.includes("payment"))
    return "payment_complete_channel";
  if (content.includes("promotion")) return "app_notification_channel";
  if (content.includes("new ride") || content.includes("ride available"))
    return "ride_request_channel";

  return "ride_updates";
};

/**
 * Check if should clear all notifications
 */
export const shouldClearAllNotifications = (remoteMessage, channelId) => {
  const title = remoteMessage.notification?.title || "";
  const body = remoteMessage.notification?.body || "";
  const content = `${title} ${body}`.toLowerCase();
  const channelLower = channelId.toLowerCase();

  return (
    channelLower.includes("cancel") ||
    channelLower.includes("decline") ||
    content.includes("cancel") ||
    content.includes("decline") ||
    content.includes("miss")
  );
};

/**
 * Create Android notification channels
 */
export const createNotificationChannels = async () => {
  if (Platform.OS !== "android") return;

  const channels = [
    { id: "ride_request_channel", name: "Ride Coming", importance: AndroidImportance.MAX, sound: "sound" },
    { id: "intercity_ride_channel", name: "Intercity Ride", importance: AndroidImportance.MAX, sound: "sound" },
    { id: "chat_channel", name: "Chat & Messages", importance: AndroidImportance.HIGH, sound: "message" },
    { id: "ride_accept", name: "Ride Accepted", importance: AndroidImportance.HIGH, sound: "app_notification_sound" },
    { id: "decline", name: "Ride Declined", importance: AndroidImportance.HIGH, sound: "ride_cancel_sound" },
    { id: "ride_cancel_channel", name: "Ride Cancelled", importance: AndroidImportance.HIGH, sound: "ride_cancel_sound" },
    { id: "another_driver_accept", name: "Another Driver Accepted", importance: AndroidImportance.HIGH, sound: "ride_cancel_sound" },
    { id: "ride_updates", name: "Ride Updates", importance: AndroidImportance.HIGH, sound: "app_notification_sound" },
    { id: "payment_complete_channel", name: "Earnings", importance: AndroidImportance.HIGH, sound: "coin_sound" },
    { id: "app_notification_channel", name: "Promotions", importance: AndroidImportance.HIGH, sound: "app_notification_sound" },
  ];

  try {
    for (const channel of channels) {
      await notifee.createChannel({
        id: channel.id,
        name: channel.name,
        description: channel.description || "",
        importance: channel.importance,
        sound: channel.sound,
        vibration: true,
      });
    }
    console.log("Notification channels created");
  } catch (error) {
    console.log("Error creating channels:", error);
  }
};

/**
 * Setup FCM listeners + SEND LOCATION ON ANY NOTIFICATION
 */
export const setupFCMListeners = () => {
  const displayedMessages = new Set();
  const lastChannelNotification = {};

  // Helper to get auth token
  const getAuthToken = async () => {
    try {

      // 2️⃣ Check SecureStore (preferred)
      const secureToken = await SecureStore.getItemAsync("auth_token");
      if (secureToken) return secureToken;

      // 3️⃣ (Optional fallback) Check AsyncStorage in case something broke
      const asyncData = await AsyncStorage.getItem("login-storage");
      if (asyncData) {
        const parsed = JSON.parse(asyncData);

        if (parsed?.state?.token) return parsed.state.token;
      }

      console.log("⚠️ No auth token found.");
      return null;
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
      return null;
    }
  };

  // ========================
  // 1. FOREGROUND MESSAGE
  // ========================
  messaging().onMessage(async (remoteMessage) => {
    console.log("📩 Foreground FCM Message Received:", remoteMessage);

    try {
      const messageId = remoteMessage.messageId || `${remoteMessage.message_id}_${Date.now()}`;
      if (displayedMessages.has(messageId)) {
        console.log("🟡 Duplicate message ignored:", messageId);
        return;
      }
      displayedMessages.add(messageId);
      console.log("🆕 New FCM Message ID:", messageId);

      const channelId = getChannelId(remoteMessage);
      const title = remoteMessage.notification?.title || "(no title)";
      const body = remoteMessage.notification?.body || "(no body)";

      console.log("🔔 Displaying notification:", { channelId, title, body });

      // Cancel previous same-channel notification
      if (lastChannelNotification[channelId]) {
        console.log("🗑️ Cancelling old notification for channel:", channelId);
        await notifee.cancelNotification(lastChannelNotification[channelId]);
      }

      const notificationId = await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: "ic_launcher",
          pressAction: { id: "default" },
        },
      });

      console.log("✅ Displayed notification ID:", notificationId);
      lastChannelNotification[channelId] = notificationId;

      // Send location update
      console.log("🌍 Fetching auth token before sending location...");
      const authToken = await getAuthToken();
      console.log("🔑 Auth token retrieved:", authToken ? "✅ Present" : "❌ Missing");

      if (authToken) {
        console.log("🚀 Calling sendCurrentLocationToServer...");
        await sendCurrentLocationToServer(authToken);
        console.log("✅ Location sent successfully from notification handler.");
      } else {
        console.warn("⚠️ Skipped location send: no auth token available.");
      }

    } catch (err) {
      console.error("💥 Error handling FCM message:", err);
    }
  });


  // ========================
// BACKGROUND MESSAGE HANDLER (Add this!)
// ========================
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📩 Background FCM Message Received:', remoteMessage);

  try {
    const messageId = remoteMessage.messageId || `${remoteMessage.message_id}_${Date.now()}`;
    console.log('🆕 Background Message ID:', messageId);

    const channelId = getChannelId(remoteMessage);
    const title = remoteMessage.notification?.title || '(no title)';
    const body = remoteMessage.notification?.body || '(no body)';

    console.log('🔔 Displaying background notification:', { channelId, title, body });

    // Display notification
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });

    // Get auth token
    console.log('🌍 Fetching auth token in background...');
    let authToken = await SecureStore.getItemAsync('auth_token');
    
    if (!authToken) {
      const asyncData = await AsyncStorage.getItem('login-storage');
      if (asyncData) {
        const parsed = JSON.parse(asyncData);
        authToken = parsed?.state?.token;
      }
    }

    console.log('🔑 Auth token retrieved:', authToken ? '✅ Present' : '❌ Missing');

    // Send location
    if (authToken) {
      console.log('🚀 Calling sendCurrentLocationToServer from background...');
      await sendCurrentLocationToServer(authToken);
      console.log('✅ Location sent successfully from background handler.');
    } else {
      console.warn('⚠️ Skipped location send: no auth token available.');
    }

  } catch (err) {
    console.error('💥 Error handling background FCM message:', err);
  }
});
  // ========================
  // 2. BACKGROUND TAP
  // ========================
  messaging().onNotificationOpenedApp(async (remoteMessage) => {
    console.log("App opened from background notification", remoteMessage);

    const authToken = await getAuthToken();
    if (authToken) {
      sendCurrentLocationToServer(authToken);
    }
  });

  // ========================
  // 3. QUIT STATE OPEN
  // ========================
  messaging().getInitialNotification().then(async (remoteMessage) => {
    if (remoteMessage) {
      console.log("App opened from quit state", remoteMessage);

      const authToken = await getAuthToken();
      if (authToken) {
        sendCurrentLocationToServer(authToken);
      }
    }
  });

  // ========================
  // 4. TOKEN REFRESH
  // ========================
  messaging().onTokenRefresh(async (newToken) => {
    console.log("FCM Token refreshed:", newToken);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
  });
};