import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ToastAndroid,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

const { FloatingWidget } = NativeModules;

const colors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  primary: '#1F2937',
  secondary: '#E0E0E0',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#991B1B',
  success: '#16A34A',
  border: '#D1D5DB',
};

export default function Settings() {
  const navigation = useNavigation();
  const [locationPermission, setLocationPermission] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [overlayPermission, setOverlayPermission] = useState(false);

  const checkPermissions = async () => {
    try {
      // Location permission
      const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(locationStatus === 'granted');

      // Notification permission
      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      setNotificationPermission(notifStatus === 'granted');

      // Overlay permission
      if (FloatingWidget && FloatingWidget.hasOverlayPermission) {
        const overlayStatus = await FloatingWidget.hasOverlayPermission();
        setOverlayPermission(overlayStatus);
      } else {
        console.warn('FloatingWidget module not available');
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      ToastAndroid.show('Error checking permissions', ToastAndroid.SHORT);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      checkPermissions();
    }
  }, []);

  const requestPermission = async (type) => {
    try {
      if (type === 'location') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
        ToastAndroid.show(
          `Location permission ${status === 'granted' ? 'granted' : 'denied'}`,
          ToastAndroid.SHORT
        );
      } else if (type === 'notification') {
        const { status } = await Notifications.requestPermissionsAsync();
        setNotificationPermission(status === 'granted');
        ToastAndroid.show(
          `Notification permission ${status === 'granted' ? 'granted' : 'denied'}`,
          ToastAndroid.SHORT
        );
      } else if (type === 'overlay' && FloatingWidget && FloatingWidget.requestOverlayPermission) {
        await FloatingWidget.requestOverlayPermission();
        // Re-check overlay status after a delay to allow user interaction
        setTimeout(async () => {
          const overlayStatus = await FloatingWidget.hasOverlayPermission();
          setOverlayPermission(overlayStatus);
          ToastAndroid.show(
            `Overlay permission ${overlayStatus ? 'granted' : 'denied'}`,
            ToastAndroid.SHORT
          );
        }, 1000);
      } else {
        ToastAndroid.show('Permission not supported', ToastAndroid.SHORT);
      }
    } catch (err) {
      console.error(`Error requesting ${type} permission:`, err);
      ToastAndroid.show(`Error requesting ${type} permission`, ToastAndroid.SHORT);
    }
  };

  const PermissionRow = ({ icon, label, value, onToggle, type, description }) => (
    <View style={styles.row}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <TouchableOpacity
        style={[styles.switchContainer, value ? styles.switchOn : styles.switchOff]}
        onPress={() => onToggle(type)}
      >
        <View style={[styles.switchThumb, value ? styles.thumbOn : styles.thumbOff]} />
        </TouchableOpacity>
      </View>

  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>App Permissions</Text>
        <PermissionRow
          icon="map-marker"
          label="Location"
          value={locationPermission}
          onToggle={requestPermission}
          type="location"
          description="Allow access to your location for ride tracking and navigation."
        />
        <PermissionRow
          icon="bell"
          label="Notifications"
          value={notificationPermission}
          onToggle={requestPermission}
          type="notification"
          description="Enable notifications for ride updates and alerts."
        />
        <PermissionRow
          icon="layers"
          label="Overlay (Draw over apps)"
          value={overlayPermission}
          onToggle={requestPermission}
          type="overlay"
          description="Allow the app to display floating widgets over other apps."
        />
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: 'https://img.freepik.com/free-vector/security-concept-illustration_114360-1123.jpg',
            }}
            style={styles.bannerImage}
          />
          <Text style={styles.bannerText}>
            Manage permissions to enhance your app experience and ensure full functionality.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.surface,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  switchContainer: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: colors.success,
  },
  switchOff: {
    backgroundColor: colors.textSecondary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
  },
  thumbOn: {
    marginLeft: 20,
  },
  thumbOff: {
    marginLeft: 2,
  },
  bannerContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});