// Layout.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  BackHandler,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useToken } from '../../context/AuthContext';
import useHotelApi from '../../context/HotelDetails';
import { StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const SIDEBAR_WIDTH = width * 0.8;

export default function Layout({
  children,
  title = 'Hotel Dashboard',
  profileImages,
  activeTab = 'home',
  logoUrl, // Optional: pass your app/hotel logo
}) {
  const { logout } = useToken();
  const { findDetails } = useHotelApi();
  const navigation = useNavigation();

  const [sidebarVisible, setSidebarVisible] = useState(isWeb);
  const slideAnim = useState(new Animated.Value(-SIDEBAR_WIDTH))[0];
  const [hotelData, setHotelData] = useState(null);

  const fetchHotelData = async () => {
    try {
      const response = await findDetails();
      if (response.success) {
        setHotelData(response.data.data);
      }
    } catch (err) {
      console.log('Error fetching hotel data:', err);
    }
  };

  useEffect(() => {
    fetchHotelData();
  }, []);

  const hotelName = hotelData?.hotel_name || 'My Hotel';
  const hotelAddress = hotelData?.hotel_address || 'Location not available';
  const profileImage = profileImages || hotelData?.profile_image || 'https://via.placeholder.com/100';
  const appLogo = logoUrl || 'https://img.freepik.com/free-vector/hotel-building-logo-template-gradient-style_23-2149726640.jpg';

  const menuItems = [
    { id: 'home', label: 'Home', icon: 'dashboard' },
    { id: 'rooms', label: 'All Rooms', icon: 'hotel' },
    { id: 'bookings', label: 'Bookings', icon: 'book-online' },
    { id: 'guests', label: 'Guests', icon: 'people' },
    { id: 'recharge', label: 'Recharge', icon: 'attach-money' },
    { id: 'ReferralHistory', label: 'Referral History', icon: 'card-giftcard' },
    { id: 'recharge_history', label: 'Recharge History', icon: 'payment' },
    { id: 'withdraw', label: 'Withdraw History', icon: 'account-balance-wallet' },
  ];

  const bottomBarItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'rooms', label: 'Rooms', icon: 'hotel' },
    { id: 'bookings', label: 'Bookings', icon: 'book-online' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  const toggleSidebar = () => {
    if (sidebarVisible) {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSidebarVisible(false));
    } else {
      setSidebarVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Onboard' }],
    });
  };

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (sidebarVisible && !isWeb) {
          toggleSidebar();
          return true;
        }
        return false;
      });
      return () => backHandler.remove();
    }
  }, [sidebarVisible]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn}>
            <MaterialIcons name="menu" size={28} color="#1a1a1a" />
          </TouchableOpacity>

          <Image source={{ uri: appLogo }} style={styles.logo} resizeMode="contain" />

          <View style={styles.hotelInfo}>
            <Text style={styles.hotelName} numberOfLines={1}>{hotelName}</Text>
            <Text style={styles.hotelAddress} numberOfLines={1}>{hotelAddress}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image source={{ uri: profileImage }} style={styles.profileImg} />
        </TouchableOpacity>
      </View>

      {/* Main Layout Container */}
      <View style={styles.body}>
        {/* Sidebar (Absolute positioned - doesn't affect main content width) */}
        {sidebarVisible && (
          <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
       
            <ScrollView showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    activeTab === item.id && styles.menuItemActive,
                  ]}
                  onPress={() => {
                    navigation.navigate(item.label);
                    if (!isWeb) toggleSidebar();
                  }}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={24}
                    color={activeTab === item.id ? '#E30613' : '#666'}
                  />
                  <Text style={[
                    styles.menuText,
                    activeTab === item.id && styles.menuTextActive
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
                <MaterialIcons name="logout" size={24} color="#E30613" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <Text style={styles.version}>Version 1.0.0</Text>
            </View>
          </Animated.View>
        )}

        {/* Dark Overlay when sidebar open (mobile only) */}
        {!isWeb && sidebarVisible && (
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleSidebar} />
        )}

        {/* Main Content Area (Full width always) */}
        <View style={styles.mainContent}>
          <ScrollView
            contentContainerStyle={styles.childrenScroll}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Bottom Navigation Bar (Mobile Only) */}
          {!isWeb && (
            <View style={styles.bottomBar}>
              {bottomBarItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.bottomItem}
                  onPress={() => navigation.navigate(item.label)}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={26}
                    color={activeTab === item.id ? '#E30613' : '#888'}
                  />
                  <Text style={[
                    styles.bottomLabel,
                    activeTab === item.id && styles.bottomLabelActive
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Perfect, Clean Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    height: 70,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuBtn: {
    padding: 8,
    marginRight: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 14,
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  hotelAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  profileImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E30613',
  },
  body: {
    flex: 1,
    position: 'relative',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#fff',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    zIndex: 1000,
  },
  sidebarHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sidebarProfile: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#E30613',
    marginBottom: 12,
  },
  sidebarHotelName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sidebarHotelAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuItemActive: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#E30613',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  },
  menuTextActive: {
    color: '#E30613',
    fontWeight: '600',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  logoutText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#E30613',
  },
  sidebarFooter: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  version: {
    fontSize: 12,
    color: '#aaa',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  childrenScroll: {
    flexGrow: 1,
    paddingBottom: 80, // Space for bottom bar
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingBottom: 10,
    paddingTop: 8,
    elevation: 12,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#888',
  },
  bottomLabelActive: {
    color: '#E30613',
    fontWeight: '600',
  },
});