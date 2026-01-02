import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useNotificationPermission from '../hooks/notification';
import axios from 'axios';
import { tokenCache } from '../Auth/cache';
import * as Application from 'expo-application';
import * as Location from 'expo-location';
import { find_me } from '../utils/helpers';

const API_URL = "https://www.appv2.olyox.com/api/v1";

const AppSetting = ({ navigation }) => {
  const { isGranted, requestPermission, fcmToken } = useNotificationPermission();
  
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [whatsappNotification, setWhatsappNotification] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      
      // Get user data from find_me
      const user = await find_me();
      if (!user || !user.user) {
        console.log("User not found");
        setLoading(false);
        return;
      }
      console.log(user.user)

      // Set notification and WhatsApp settings from user data
      setNotificationPermission(user.user.notificationPermission || false);
      setWhatsappNotification(user.user.whatsapp_notification || false);

      // Check actual location permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

    } catch (error) {
      console.error("Error loading user settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async (value) => {
    if (value && !isGranted) {
      await requestPermission();
    }
    setNotificationPermission(value);
    updateAppSettings(value, locationPermission, whatsappNotification);
  };

  const handleLocationToggle = async (value) => {
    if (value) {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      updateAppSettings(notificationPermission, granted, whatsappNotification);
    } else {
      setLocationPermission(false);
      updateAppSettings(notificationPermission, false, whatsappNotification);
    }
  };

  const handleWhatsappToggle = (value) => {
    setWhatsappNotification(value);
    updateAppSettings(notificationPermission, locationPermission, value);
  };

  const updateAppSettings = async (notification, location, whatsapp) => {
    try {
      const gmail_token = await tokenCache.getToken('auth_token');
      const db_token = await tokenCache.getToken('auth_token_db');
      const token = db_token || gmail_token;

      await axios.post(`${API_URL}/user/update-settings-user`, {
        fcmToken,
        notificationPermission: notification,
        locationPermission: location,
        whatsapp_notification: whatsapp,
        AppVersion: Application.nativeApplicationVersion
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log("✅ Settings updated successfully");
    } catch (error) {
      console.error("❌ Settings update error:", error?.response?.data || error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Notification Permission */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive push notifications
                </Text>
              </View>
            </View>
            <Switch
              value={notificationPermission}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#D1D5DB', true: '#000' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          {/* Location Permission */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="location-outline" size={24} color="#000" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Location</Text>
                <Text style={styles.settingDescription}>
                  Allow location access
                </Text>
              </View>
            </View>
            <Switch
              value={locationPermission}
              disabled={locationPermission}
              onValueChange={handleLocationToggle}
              trackColor={{ false: '#D1D5DB', true: '#000' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          {/* WhatsApp Notification */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="logo-whatsapp" size={24} color="#000" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>WhatsApp Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get updates via WhatsApp
                </Text>
              </View>
            </View>
            <Switch
              value={whatsappNotification}
              onValueChange={handleWhatsappToggle}
              trackColor={{ false: '#D1D5DB', true: '#000' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000'
  },
  placeholder: {
    width: 40
  },
  content: {
    flex: 1,
    paddingTop: 8
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingText: {
    marginLeft: 16,
    flex: 1
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280'
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 60
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default AppSetting;