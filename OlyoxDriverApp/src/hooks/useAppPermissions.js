import { useState, useEffect, useCallback } from 'react';
import { PermissionsAndroid, Platform, ToastAndroid, NativeModules } from 'react-native';

const { FloatingWidget } = NativeModules;

export default function useAppPermissions() {
  const [permissions, setPermissions] = useState({
    location: false,
    notification: false,
    overlay: false,
  });

  const checkPermissions = useCallback(async () => {
    try {
      // Location permission
      const locationStatus = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      // Notification permission (Android 13+)
      let notifStatus = false;
      if (Platform.Version >= 33) {
        notifStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }

      // Overlay permission
      let overlayStatus = false;
      if (FloatingWidget && FloatingWidget.hasOverlayPermission) {
        overlayStatus = await FloatingWidget.hasOverlayPermission();
      }

      setPermissions({
        location: locationStatus,
        notification: notifStatus,
        overlay: overlayStatus,
      });
    } catch (err) {
      console.log('Error checking permissions:', err);
    }
  }, []);

  const requestPermission = useCallback(async (type) => {
    try {
      if (type === 'location') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        setPermissions((prev) => ({ ...prev, location: granted === PermissionsAndroid.RESULTS.GRANTED }));
        ToastAndroid.show(
          `Location permission ${granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'}`,
          ToastAndroid.SHORT
        );
      } else if (type === 'notification' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        setPermissions((prev) => ({ ...prev, notification: granted === PermissionsAndroid.RESULTS.GRANTED }));
        ToastAndroid.show(
          `Notification permission ${granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'}`,
          ToastAndroid.SHORT
        );
      } else if (type === 'overlay' && FloatingWidget && FloatingWidget.requestOverlayPermission) {
        FloatingWidget.requestOverlayPermission();
        // Re-check after a short delay
        setTimeout(async () => {
          const overlayStatus = await FloatingWidget.hasOverlayPermission();
          setPermissions((prev) => ({ ...prev, overlay: overlayStatus }));
        }, 1000);
      } else {
        ToastAndroid.show('Permission not supported on this Android version', ToastAndroid.SHORT);
      }
    } catch (err) {
      console.log('Error requesting permission:', err);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') checkPermissions();
  }, [checkPermissions]);

  return { permissions, requestPermission, checkPermissions };
}
