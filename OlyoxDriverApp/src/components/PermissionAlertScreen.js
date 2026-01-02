import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export default function PermissionAlertScreen() {
  const [permissions, setPermissions] = useState({
    location: 'checking',
    notifications: 'checking',
  });

  const checkPermissions = async () => {
    // 1️⃣ Location
    const locStatus = await Location.getForegroundPermissionsAsync();
    setPermissions(prev => ({
      ...prev,
      location: locStatus.status === 'granted' ? 'granted' : 'denied',
    }));

    // 2️⃣ Notifications
    const notifStatus = await Notifications.getPermissionsAsync();
    setPermissions(prev => ({
      ...prev,
      notifications: notifStatus.granted ? 'granted' : 'denied',
    }));
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case 'granted':
        return '✅ Granted';
      case 'denied':
        return '❌ Denied';
      default:
        return '⏳ Checking...';
    }
  };

  const anyDenied = Object.values(permissions).some(status => status === 'denied');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Permissions</Text>

      <View style={styles.row}>
        <Text>📍 Location:</Text>
        <Text>{renderStatus(permissions.location)}</Text>
      </View>

      <View style={styles.row}>
        <Text>🔔 Notifications:</Text>
        <Text>{renderStatus(permissions.notifications)}</Text>
      </View>

      {anyDenied && (
        <View style={{ marginTop: 30 }}>
          <Text style={{ marginBottom: 10, textAlign: 'center', color: 'red' }}>
            Some permissions are denied. Please enable them in Settings.
          </Text>
          <Button title="Open Settings" onPress={openSettings} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, fontSize: 18 },
});
