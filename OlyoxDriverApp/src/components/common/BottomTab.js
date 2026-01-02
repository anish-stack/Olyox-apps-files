import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, NativeModules } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import useUserStore from '../../../Store/useUserStore';
import useCurrentRideStore from '../../../Store/currentRideStore';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { getRideLabel } from '../../../utility/RideLabel';
const { FloatingWidget } = NativeModules

export default function BottomTab({ active = "Recharge", showDetails = false }) {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(active);
  const { fetchCurrentDetails, user } = useUserStore();
  const { fetchRideDetails, rideDetails } = useCurrentRideStore();
  const [details, setDetails] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  // Configure notification handler
  // useEffect(() => {
  //   Notifications.setNotificationHandler({
  //     handleNotification: async () => ({
  //       shouldShowAlert: true,
  //       shouldPlaySound: true,
  //       shouldSetBadge: false,
  //     }),
  //   });
  // }, []);


  // Fetch user and ride details
  useEffect(() => {
    const loadDetails = async () => {
      try {
        if (user?._id) {
          setActiveTab(active);
          const data = await fetchCurrentDetails(user._id);
          // console.log("User Details Fetched cure:", data);
 if(Platform.OS ==="android"){
                      FloatingWidget.startWidget();

          }          if (user?.on_intercity_ride_id) {
            fetchRideDetails(user?.on_intercity_ride_id);
            setDetails(data);
          } else {
            fetchRideDetails(user?.on_ride_id);
            setDetails(data);
          }


          // Schedule ride notification
          if (user?.on_intercity_ride_id && rideDetails?.IntercityPickupTime) {
            scheduleRideNotification(new Date(rideDetails.IntercityPickupTime));
          }
        }
      } catch (error) {
        console.error("Error fetching user ride details:", error);
        Alert.alert("Error", "Failed to fetch user details. Please try again.");
      }
    };
    loadDetails();
  }, [user?._id, active, rideDetails?.IntercityPickupTime]);

  const scheduleRideNotification = async (pickupTime) => {
    const now = new Date();
    const notifyTime = new Date(pickupTime);
    notifyTime.setMinutes(notifyTime.getMinutes() - 60); // 1 hour before
    if (notifyTime > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Upcoming Intercity Ride 🚗",
          body: `Your ride is scheduled at ${pickupTime.toLocaleTimeString()}. Please be ready.`,
          sound: true,
        },
        trigger: notifyTime,
      });
    }
  };


  useEffect(() => {
    let interval;

    if (user?.on_intercity_ride_id && rideDetails?.IntercityPickupTime) {
      const updateTimeLeft = () => {
        const now = new Date();
        const pickupTime = new Date(rideDetails.IntercityPickupTime);
        const diff = pickupTime - now;

        if (diff <= 0) {
          setTimeLeft('Ride is starting now!');
          clearInterval(interval);
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s left`);
      };

      updateTimeLeft();
      interval = setInterval(updateTimeLeft, 1000);
    }

    return () => clearInterval(interval);
  }, [rideDetails?.IntercityPickupTime, user?.on_intercity_ride_id]);

  const handleRideNavigation = () => {
    if (user?.on_ride_id || user?.on_intercity_ride_id) {
      navigation.navigate('current_ride', {
        _id: user.on_ride_id || user?.on_intercity_ride_id
      });
    }
  };

  const Tabs = [
    { id: 1, title: 'Withdraw', route: 'WithdrawScreen', icon: 'cash-outline' },
    { id: 5, title: 'Reserve', route: 'reserve', icon: 'car' },
    { id: 2, title: 'Preference', route: 'PreferenceScreen', icon: 'settings-outline' },
    { id: 3, title: 'Recharge', route: 'RechargeScreen', icon: 'card-outline' },
    { id: 4, title: 'Profile', route: 'ProfileScreen', icon: 'person-outline' },
  ];

  const showRideButton = !!user?.on_ride_id || user?.on_intercity_ride_id;
const rideLabel = useMemo(() => getRideLabel(rideDetails), [rideDetails]);

  return (
    <View style={styles.container}>
      {/* Stats Section */}
      {showDetails && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Earnings</Text>
            <Text style={styles.statValue}>₹{details?.totalEarnings?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Ratings</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.statValue}>{details?.averageRating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.starIcon}>⭐</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rides</Text>
            <Text style={styles.statValue}>{details?.totalRides || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Points</Text>
            <Text style={styles.statValue}>{details?.points || 0}</Text>
          </View>
        </View>
      )}

      {/* Intercity Ride Section */}
      {showRideButton && showDetails && (
        <TouchableOpacity
          style={styles.rideSection}
          onPress={handleRideNavigation}
          activeOpacity={0.95}
        >
          <View style={styles.activeStatusBar} />
          <View style={styles.rideContent}>
            <View style={styles.statusIndicator} />
            <View style={styles.rideInfoContainer}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusText}>
                  {rideLabel}
                </Text>
                <Icon name="car-sport-outline" size={20} color="#fff" style={styles.statusIcon} />
              </View>
              <Text style={styles.rideTitle}>
                {user?.on_intercity_ride_id
                  ? `Pickup at ${new Date(rideDetails?.IntercityPickupTime).toLocaleString('en-IN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                  : 'Ride in Progress'}
              </Text>


              <Text style={styles.rideSubtitle}>
                {user?.on_intercity_ride_id ? timeLeft : 'Tap to view ride details'}
              </Text>

            </View>
            <View style={styles.arrowContainer}>
              <Icon name="chevron-forward" size={24} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Bottom Tabs */}
      <View style={[styles.tabsContainer, showRideButton && styles.tabsContainerWithRide]}>
        {Tabs.filter((tab) => {
          // Check if user has a bike
          const showOnlyBikePlan =
            user?.rideVehicleInfo?.vehicleName?.toLowerCase() === "2 wheeler" ||
            user?.rideVehicleInfo?.vehicleType?.toLowerCase() === "bike";

          // Hide "Reserve" tab if user is on a bike
          if (tab.title === "Reserve" && showOnlyBikePlan) {
            console.log("🚫 Hiding Reserve tab for bike user");
            return false;
          }

          return true;
        }).map((tab) => {
          const isActive = activeTab === tab.title;

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                console.log(`🟢 Tab pressed: ${tab.title}`);
                setActiveTab(tab.title);
                if (tab.route) navigation.navigate(tab.route);
              }}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Icon name={tab.icon} size={24} color={isActive ? "#000" : "#666"} />
                {/* {isActive && <View style={styles.activeIndicator} />} */}
              </View>
              <Text style={styles.tabText}>{tab.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', shadowColor: '#000', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fafafa' },
  statCard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 14, fontWeight: '800', color: '#2c3e50', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#7f8c8d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starIcon: { fontSize: 16, marginTop: 2 },
  statDivider: { width: 1, height: 45, backgroundColor: '#e0e0e0' },

  rideSection: { backgroundColor: '#000', marginHorizontal: 12, marginVertical: 12, marginBottom: 4, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, position: 'relative', overflow: 'hidden' },
  activeStatusBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#fff' },
  rideContent: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', marginRight: 12, borderWidth: 2, borderColor: '#fff' },
  rideInfoContainer: { flex: 1 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginRight: 8 },
  statusIcon: { transform: [{ scale: 0.8 }] },
  rideTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  rideSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  arrowContainer: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, marginLeft: 8 },

  tabsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  tabsContainerWithRide: { paddingTop: 4, marginTop: -8 },
  tabButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12, minWidth: 70, position: 'relative' },
  iconWrapper: { marginBottom: 4, position: 'relative', width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  activeIconWrapper: { backgroundColor: 'rgba(255, 107, 53, 0.1)', borderRadius: 24, transform: [{ scale: 1.05 }] },
  activeIndicator: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#000', borderWidth: 2, borderColor: '#fff' },
  tabText: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 2 },
  activeTabText: { color: '#000', fontWeight: '800' },
});
