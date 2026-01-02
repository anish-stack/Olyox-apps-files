import { useNavigation, CommonActions } from '@react-navigation/native';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Share,
  Modal,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import useUserStore from '../../../Store/useUserStore';
import BottomTab from '../../components/common/BottomTab';
import HeaderWithBAck from '../../components/common/HeaderWithBack';
import loginStore from '../../../Store/authStore';
const { FloatingWidget } = NativeModules

const Profile = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, checkBhDetails, clearUser, toggleFnc } = useUserStore();
  const { logout } = loginStore()
  const [bhUserDetails, setBhUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false); // State for modal visibility

  // Go back to Home
  const goHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };


  // Share App Function
  const shareOurApp = async () => {
    try {
      const result = await Share.share({
        message: `Join our platform! Use my referral code: ${user?.BH || 'N/A'}`,
        title: 'Refer & Earn',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLogout = async () => {
    try {
      FloatingWidget?.stopWidget();
      if (user?.isAvailable) {
        console.log("🚀 Going off duty before logout");
        await toggleFnc(true)
      }
      console.log('🚪 Logging out...');
      await logout();
      // clearUser();


      FloatingWidget?.stopWidget();

      console.log('✅ User logged out successfully');

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'login' }],
        })
      );
    } catch (error) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
      console.error('❌ Logout failed:', error);
    }
  };


  // Fetch BH Details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await checkBhDetails(user?.BH);
        setBhUserDetails(data?.complete);
      } catch (error) {
        console.error('❌ Failed to fetch BH details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Stats Data
  const stats = [
    { label: 'Wallet', value: `₹${user?.wallet.toFixed(1) || 0}`, tooltip: 'Wallet' },
    { label: 'Total Rides', value: user?.TotalRides || 0, tooltip: 'Total Rides' },
    { label: 'Rating', value: user?.rating || '4.5', tooltip: 'Rating' },
  ];

  // Links Data
  const links = [
    {
      icon: 'file-document',
      title: 'View Documents',
      onPress: () => navigation.navigate('ViewDocuments'),
    },
    {
      icon: 'qrcode',
      title: 'Payment QR',
      onPress: () => navigation.navigate('upload-qr'),
    },
    {
      icon: 'cash-plus',
      title: 'Withdraw',
      onPress: () => navigation.navigate('WithdrawScreen'),
    },
    {
      icon: 'multiplication',
      title: 'Preferences',
      onPress: () => navigation.navigate('PreferenceScreen'),
    },
    {
      icon: 'account-settings',
      title: 'Settings',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'car',
      title: 'Active Vehicle Details',
      onPress: () => setModalVisible(true), // Open modal instead of navigating
    },
    {
      icon: 'car-clock',
      title: 'Pending Vehicle',
      onPress: () => navigation.navigate('PendingVehicle'),
    },
    {
      icon: 'plus',
      title: 'Add New Vehicle',
      onPress: () => navigation.navigate('VehicleRegistrationForm'),
    },
    {
      icon: 'gift',
      title: 'Refer & Earn',
      onPress: shareOurApp,
    },
    {
      icon: 'account-group',
      title: 'Referral History',
      onPress: () => navigation.navigate('referral-history'),
    },
    {
      icon: 'history',
      title: 'Recharge History',
      onPress: () => navigation.navigate('recharge-history'),
    },
    {
      icon: 'ticket-percent',
      title: 'Unlock Deals',
      onPress: () => navigation.navigate('UnlockCoupons'),
    },
    {
      icon: 'logout',
      title: 'Logout',
      onPress: () => handleLogout(), // Open modal instead of navigating
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
    },
    profileCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    imageContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      overflow: 'hidden',
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      fontSize: 32,
      color: theme.primary,
      fontWeight: '700',
    },
    detailsContainer: {
      flex: 1,
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    phone: {
      fontSize: 14,
      color: theme.text,
      opacity: 0.6,
      marginBottom: 4,
    },
    category: {
      fontSize: 14,
      textTransform: 'capitalize',
      color: theme.primary,
      fontWeight: '600',
    },
    joinedDate: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.5,
      marginTop: 2,
    },
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.secondary,
      borderRadius: 12,
      padding: 12,
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.primary,
    },
    linksTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },
    linksContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    linkItemLast: {
      borderBottomWidth: 0,
    },
    linkIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    linkText: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      fontWeight: '500',
    },
    chevronIcon: {
      opacity: 0.3,
    },
    loadingText: {
      color: theme.text,
      marginTop: 10,
      fontSize: 14,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      width: '85%',
      maxWidth: 400,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.secondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      width: 120,
    },
    modalValue: {
      fontSize: 16,
      color: theme.primary,
      flex: 1,
    },
    modalImage: {
      width: 120,
      height: 120,
      resizeMode: 'contain',
      alignSelf: 'center',
      marginTop: 16,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderWithBAck title="Profile" onBackPress={goHome} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithBAck title="Profile" onBackPress={goHome} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.imageContainer}>
              {user?.documents?.profile ? (
                <Image source={{ uri: user.documents?.profile }} style={styles.profileImage} />
              ) : (
                <Text style={styles.imagePlaceholder}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              )}
            </View>

            <View style={styles.detailsContainer}>
              <Text style={styles.name}>{user?.name || 'User Name'}</Text>
              <Text style={styles.phone}>{user?.phone || '+91 XXXXXXXXXX'}</Text>
              <Text style={styles.category}>Category:- {user?.category || 'Category'}</Text>
              <Text style={styles.category}>Refferal Id :- {user?.BH || 'Category'}</Text>

              <Text style={styles.joinedDate}>
                Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Stats Container */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.linksContainer}>
          {links.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.linkItem, index === links.length - 1 && styles.linkItemLast]}
              onPress={link.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.linkIconContainer}>
                <Icon name={link.icon} size={22} color={theme.primary} />
              </View>
              <Text style={styles.linkText}>{link.title}</Text>
              <Icon name="chevron-right" size={24} color={theme.text} style={styles.chevronIcon} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal for Active Vehicle Details */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Active Vehicle Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close modal"
              >
                <Icon name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Vehicle Name:</Text>
              <Text style={styles.modalValue}>
                {user?.rideVehicleInfo?.vehicleName || 'N/A'}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Vehicle Type:</Text>
              <Text style={styles.modalValue}>
                {user?.rideVehicleInfo?.vehicleType || 'N/A'}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Vehicle Number:</Text>
              <Text style={styles.modalValue}>
                {user?.rideVehicleInfo?.VehicleNumber || 'N/A'}
              </Text>
            </View>


          </View>
        </View>
      </Modal>

      <BottomTab active="Profile" showDetails={false} />
    </SafeAreaView>
  );
};

export default Profile;