import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const FCM_TOKEN_STORAGE_KEY = '@app:fcmToken';
const STORAGE_KEY = '@notifications_storage';
const NOTIFICATION_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

// Configure expo notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const showExpoNotification = async (title, body, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      vibrate: true,
      sticky: true,
      sound: 'default',
    },
    trigger: null, // Show immediately
  });
};

const useNotificationPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState('not-determined');
  const [isGranted, setIsGranted] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [lastNotification, setLastNotification] = useState(null);
  const [lastFcmMessage, setLastFcmMessage] = useState(null);

  const notificationListener = useRef();
  const responseListener = useRef();

  // Save FCM token
  const storeFcmToken = async (token) => {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.error('❌ Error storing FCM token:', error);
    }
  };

  const getStoredFcmToken = async () => {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('❌ Error retrieving FCM token:', error);
      return null;
    }
  };

  // Save notification to storage with expiry check
  const storeNotification = async (notification) => {
    try {
      const now = Date.now();
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const newNotif = { ...notification, timestamp: now };
      const updated = [newNotif, ...parsed];

      // Filter expired notifications
      const validNotifications = updated.filter(
        (n) => now - n.timestamp < NOTIFICATION_EXPIRY_TIME
      );

      setNotifications(validNotifications);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validNotifications));
    } catch (error) {
      console.error('❌ Error storing notification:', error);
    }
  };

  const requestPermission = useCallback(async () => {
    try {
      const status = await Platform.select({
        ios: async () => {
          const authStatus = await messaging().requestPermission();
          return (
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL
              ? 'granted'
              : 'denied'
          );
        },
        android: async () => {
          if (Platform.Version >= 33) {
            const granted = await PermissionsAndroid.request(
              'android.permission.POST_NOTIFICATIONS'
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
          }
          return 'granted';
        },
        default: async () => 'not-determined',
      })();

      const { status: expoStatus } = await Notifications.getPermissionsAsync();
      const finalStatus =
        status === 'granted' && expoStatus === 'granted' ? 'granted' : 'denied';

      setPermissionStatus(finalStatus);
      setIsGranted(finalStatus === 'granted');

      if (finalStatus === 'granted') {
        const token = await messaging().getToken();
        setFcmToken(token);
        await storeFcmToken(token);
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedToken = await getStoredFcmToken();
      if (storedToken) setFcmToken(storedToken);

      const storedNotifications = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        const now = Date.now();
        const validNotifications = parsed.filter(
          (n) => now - n.timestamp < NOTIFICATION_EXPIRY_TIME
        );
        setNotifications(validNotifications);
      }
    };
    init();
  }, []);

  useEffect(() => {
    requestPermission();

    // Token refresh listener
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
      setFcmToken(token);
      await storeFcmToken(token);
    });

    // Foreground listener
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('📩 FCM Message:', remoteMessage);
      setLastFcmMessage(remoteMessage);
      await showExpoNotification(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || '',
        remoteMessage.data
      );
      await storeNotification(remoteMessage.notification || {});
    });

    // When app opened from background
    const unsubscribeOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
      setLastFcmMessage(remoteMessage);
    });

    // App launched from quit state
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) setLastFcmMessage(remoteMessage);
    });

    // Background handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📩 Background Message:', remoteMessage);
      await storeNotification(remoteMessage.notification || {});
      return remoteMessage;
    });

    // App state listener
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && isGranted) {
        const token = await messaging().getToken();
        if (token !== fcmToken) {
          setFcmToken(token);
          await storeFcmToken(token);
        }
      }
    });

    // Expo notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log('📱 Expo Notification received:', notification);
        setLastNotification(notification);
        await storeNotification(notification.request.content || {});
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('👆 User tapped notification:', response);
        setLastNotification(response.notification);
        await storeNotification(response.notification.request.content || {});
      }
    );

    return () => {
      unsubscribeForeground();
      unsubscribeOpenedApp();
      unsubscribeTokenRefresh();
      subscription.remove();
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [requestPermission, isGranted, fcmToken]);

  const showNotification = async (title, body, data = {}) => {
    return showExpoNotification(title, body, data);
  };

  return {
    permissionStatus,
    isGranted,
    requestPermission,
    fcmToken,
    getToken: async () => fcmToken || (await getStoredFcmToken()),
    showNotification,
    lastNotification,
    lastFcmMessage,
    notifications, // <-- expose stored notifications
  };
};

export default useNotificationPermission;
