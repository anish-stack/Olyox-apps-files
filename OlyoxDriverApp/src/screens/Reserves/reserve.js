import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Alert, Modal, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import * as Haptics from 'expo-haptics';
import useUserStore from '../../../Store/useUserStore';
import axiosInstance from '../../../constant/axios';
import useCurrentRideStore from '../../../Store/currentRideStore';
import HeaderWithBack from '../../components/common/HeaderWithBack';
import BottomTab from '../../components/common/BottomTab';
import axios from 'axios';
import { API_URL_APP } from '../../../constant/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const CancelModal = React.memo(
  ({ visible, cancelReasons, selectedReason, onSelectReason, onCancelRide, onBack }) => {
    if (!visible) return null;
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.cancelModal}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <Text style={styles.modalSubtitle}>Select a reason for cancellation</Text>
            <FlatList
              data={cancelReasons}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.reasonItem, selectedReason?._id === item._id && styles.reasonItemActive]}
                  onPress={() => onSelectReason(item)}
                >
                  <View style={[styles.radio, selectedReason?._id === item._id && styles.radioActive]} />
                  <Text style={styles.reasonText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item._id}
              style={styles.reasonsList}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
                <Text style={styles.cancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelRideBtn, !selectedReason && styles.btnDisabled]}
                onPress={onCancelRide}
                disabled={!selectedReason}
              >
                <Text style={styles.cancelRideText}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

export default function Reserve({ navigation, id }) {
  const [rides, setRides] = useState([]);
  const [loadingRideId, setLoadingRideId] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [index, setIndex] = useState(0);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const { user, fetchUserDetails } = useUserStore();
  const { rideDetails, fetchRideDetails, fetchCancelReasons, handleCancel } = useCurrentRideStore();
  const [cancelReasons, setCancelReasons] = useState([]);

  // Pull-to-refresh states
  const [refreshingNew, setRefreshingNew] = useState(false);
  const [refreshingMy, setRefreshingMy] = useState(false);

  const routes = useMemo(() => [
    { key: 'my_reserved', title: 'My Reserved Rides' },
    { key: 'new_rides', title: 'New Rides' },
  ], []);

  // Fetch cancellation reasons
  useEffect(() => {
    const loadCancelReasons = async () => {
      try {
        const reasons = await fetchCancelReasons();
        setCancelReasons(reasons || []);
      } catch (err) {
        console.error("Failed to fetch cancel reasons:", err);
      }
    };
    loadCancelReasons();
  }, [fetchCancelReasons]);

  // Fetch new rides (with pull-to-refresh)
  const fetchNewRides = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshingNew(true);
    else setLoadingRideId(null);

    if (!user?._id) {
      await fetchUserDetails();
    }

    try {
      const response = await axios.get(
        `https://www.appv2.olyox.com/api/v1/new/get-available-ride-for-driver?riderId=${user?._id}`
      );

      const availableRides = (response.data.rides || [])
        .filter(ride => ride.ride_status !== 'cancelled'); // Filter out cancelled

      setRides(availableRides);
    } catch (error) {
      console.log("Error fetching rides:", error?.response?.data?.message || error);
      setRides([]);
    } finally {
      setLoadingRideId(null);
      if (isPullToRefresh) setRefreshingNew(false);
    }
  }, [user?._id, fetchUserDetails]);

  // Initial load + pull-to-refresh
  useEffect(() => {
    fetchNewRides();
  }, [fetchNewRides]);

  // Pull-to-refresh handler for New Rides tab
  const onRefreshNew = useCallback(() => {
    fetchNewRides(true);
  }, [fetchNewRides]);

  // Fetch my current reserved ride (with pull-to-refresh)
  const fetchMyReservedRide = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshingMy(true);

    if (user?.on_intercity_ride_id) {
      try {
        const data = await fetchRideDetails(user.on_intercity_ride_id);
        // Filter out if cancelled
        if (data?.ride_status === 'cancelled') {
          // Optionally clear from store or just don't show
          // Here we just skip rendering
        }
      } catch (error) {
        console.log("Error fetching my reserved ride:", error);
      } finally {
        if (isPullToRefresh) setRefreshingMy(false);
      }
    } else {
      if (isPullToRefresh) setRefreshingMy(false);
    }
  }, [user?.on_intercity_ride_id, fetchRideDetails]);

  // Initial load for My Reserved
  useEffect(() => {
    fetchMyReservedRide();
  }, [fetchMyReservedRide]);

  const onRefreshMy = useCallback(() => {
    fetchMyReservedRide(true);
  }, [fetchMyReservedRide]);

  // Accept ride
  const handleAccept = useCallback(async (rideId) => {
    if (loadingRideId || isRejecting) return;

    setLoadingRideId(rideId);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const userId = user?._id || id;
      if (!userId) throw new Error("User ID not found.");

      const response = await axiosInstance.post(`/api/v1/new/ride-action-reject-accepet`, {
        action: "accept",
        rideId,
        riderId: userId,
        driverId: userId,
      });

      if (response.data.success) {
        setRides(prev => prev.filter(r => r._id !== rideId));
        navigation.navigate("current_ride", { _id: rideId });
      } else {
        throw new Error(response.data.message || "Failed to accept ride");
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Accept Failed", error.message || "Failed to accept ride.");
    } finally {
      setLoadingRideId(null);
    }
  }, [user?._id, id, navigation, isRejecting, loadingRideId]);

  const normalizeStatus = (status) => {
    const statusMap = {
      pending: "Pending",
      searching: "Searching",
      driver_assigned: "Driver Assigned",
      driver_arrived: "Driver Arrived",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusMap[status] || "Unknown";
  };


  // Reject ride
  const handleReject = useCallback(async (rideId) => {
    if (loadingRideId || isRejecting) return;

    setIsRejecting(true);
    setLoadingRideId(rideId);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const userId = user?._id || id;
      if (!userId) throw new Error("User ID not found.");

      await axiosInstance.post(`/api/v1/new/ride-action-reject-accepet`, {
        action: "reject",
        rideId,
        riderId: userId,
      });

      setRides(prev => prev.filter(r => r._id !== rideId));
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Reject Failed", error.message || "Failed to reject ride.");
    } finally {
      setIsRejecting(false);
      setLoadingRideId(null);
    }
  }, [user?._id, id, isRejecting, loadingRideId]);

  // Handle cancel ride
const handleCancelRide = useCallback(async () => {
  console.log("🚫 handleCancelRide triggered");

  if (!selectedReason) {
    console.warn("⚠️ No cancellation reason selected.");
    Alert.alert("Error", "Please select a cancellation reason.");
    return;
  }

  try {
    console.log("📦 Cancelling ride:", {
      rideId: rideDetails?._id,
      reason: selectedReason,
    });

    const data  = await axios.post(`http://192.168.1.2:3200/api/v1/new/ride/cancel`, {
        intercity: rideDetails?.isIntercityRides,
        ride: rideDetails?._id,
        cancelBy: "driver",
        reason_id: selectedReason._id,
        reason: selectedReason.name,
      });

    console.log("✅ Ride cancelled successfully. Updating data...",data.response );

    // Close modal
    setCancelModalVisible(false);

    // Refetch related data
    await Promise.all([
      fetchMyReservedRide(),
      fetchNewRides(),
      fetchRideDetails(),
    ]);

    console.log("🔄 Data refreshed successfully after cancellation.");

    setSelectedReason(null);
    Alert.alert("Success", "Ride cancelled successfully.");
  } catch (error) {
    console.error("❌ Ride cancellation failed:", error);
    Alert.alert("Cancel Failed", error.message || "Failed to cancel ride.");
  }
}, [selectedReason, handleCancel, rideDetails?._id]);

  // Handle view details
  const handleViewDetails = useCallback((rideId) => {
    navigation.navigate("current_ride", { _id: rideId });
  }, [navigation]);

  // Render individual ride card
  const renderRideCard = (ride) => {
    // Double-check cancelled rides don't appear
    if (ride.ride_status === 'cancelled') return null;

    return (
      <View key={ride._id} style={styles.card}>
        <Text style={styles.heading}>Pickup:</Text>
        <Text style={styles.text}>{ride.pickup_address.formatted_address}</Text>
        <Text style={styles.heading}>Drop:</Text>
        <Text style={styles.text}>{ride.drop_address.formatted_address}</Text>
        <Text style={styles.heading}>Distance:</Text>
        <Text style={styles.text}>{ride.route_info?.distance?.toFixed(2)} km</Text>
        <Text style={styles.heading}>Duration:</Text>
        <Text style={styles.text}>{Math.ceil(ride.route_info?.duration / 60)} mins</Text>
        <Text style={styles.heading}>Fare:</Text>
        <Text style={styles.text}>{ride.pricing?.total_fare} {ride.pricing?.currency}</Text>
        <Text style={styles.heading}>Ride Status:</Text>
        <Text style={styles.text}>{normalizeStatus(ride.ride_status)}</Text>
        <Text style={styles.heading}>Scheduled At:</Text>
        <Text style={styles.text}>{new Date(ride.scheduled_at).toLocaleString()}</Text>
        {ride.ride_status === "assigned" && ride.driver_id && (
          <>
            <Text style={styles.heading}>Pickup Time:</Text>
            <Text style={styles.text}>{new Date(ride.scheduled_at).toLocaleTimeString()}</Text>
          </>
        )}

        <View style={styles.buttonContainer}>
          {ride.ride_status === "searching" ? (
            <>
              <TouchableOpacity
                onPress={() => handleAccept(ride._id)}
                style={[styles.button, { backgroundColor: '#000000' }]}
                disabled={loadingRideId === ride._id}
              >
                <Text style={styles.buttonText}>
                  {loadingRideId === ride._id ? 'Loading...' : 'Accept'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReject(ride._id)}
                style={[styles.button, { backgroundColor: '#333333' }]}
                disabled={loadingRideId === ride._id}
              >
                <Text style={styles.buttonText}>
                  {loadingRideId === ride._id ? 'Loading...' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </>
          ) : ride.ride_status !== "searching" && ride.driver ? (
            <>
              <TouchableOpacity
                onPress={() => handleViewDetails(ride._id)}
                style={[styles.button, { backgroundColor: '#000000' }]}
              >
                <Text style={styles.buttonText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCancelModalVisible(true);
                  setSelectedReason(null);
                }}
                style={[styles.button, { backgroundColor: '#333333' }]}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  // Tab Scenes with Pull-to-Refresh
  const MyReservedTab = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshingMy} onRefresh={onRefreshMy} />
      }
      style={{ flex: 1, padding: 10, backgroundColor: '#FFFFFF' }}
    >
      {rideDetails && rideDetails.ride_status !== 'cancelled' ? (
        renderRideCard(rideDetails)
      ) : (
        <Text style={styles.text}>No reserved rides</Text>
      )}
    </ScrollView>
  );

  const NewRidesTab = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshingNew} onRefresh={onRefreshNew} />
      }
      style={{ flex: 1, padding: 10, backgroundColor: '#FFFFFF' }}
    >
      {rides.length > 0 ? (
        rides.map(renderRideCard)
      ) : (
        <Text style={styles.text}>No new rides available</Text>
      )}
    </ScrollView>
  );

  const renderScene = SceneMap({
    my_reserved: MyReservedTab,
    new_rides: NewRidesTab,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <HeaderWithBack background={false} />

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: SCREEN_WIDTH }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: '#000000' }}
            style={{ backgroundColor: '#000', elevation: 2 }}
            labelStyle={{ color: '#FFFFFF', fontWeight: '600' }}
          />
        )}
        lazy={true}
        swipeEnabled={true}
      />

      <CancelModal
        visible={cancelModalVisible}
        cancelReasons={cancelReasons}
        selectedReason={selectedReason}
        onSelectReason={setSelectedReason}
        onCancelRide={handleCancelRide}
        onBack={() => {
          setCancelModalVisible(false);
          setSelectedReason(null);
        }}
      />

      <BottomTab active='Reserve' showDetails={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: moderateScale(20),
    borderRadius: 12,
    marginBottom: moderateScale(15),
    borderWidth: 1,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  heading: {
    fontWeight: '700',
    color: '#000000',
    fontSize: moderateScale(16),
    marginTop: moderateScale(8),
    marginBottom: moderateScale(4),
  },
  text: {
    color: '#000000',
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: moderateScale(15),
    justifyContent: 'space-between',
    gap: moderateScale(10),
  },
  button: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  tabInfo: {
    padding: moderateScale(15),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  tabInfoText: {
    color: '#000000',
    fontSize: moderateScale(18),
    fontWeight: '700',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: moderateScale(20),
    width: SCREEN_WIDTH * 0.85,
    maxHeight: SCREEN_HEIGHT * 0.7,
    borderWidth: 1,
    borderColor: '#000000',
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: moderateScale(10),
  },
  modalSubtitle: {
    fontSize: moderateScale(16),
    color: '#000000',
    textAlign: 'center',
    marginBottom: moderateScale(15),
  },
  reasonsList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
    marginBottom: moderateScale(15),
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  reasonItemActive: {
    backgroundColor: '#F0F0F0',
  },
  radio: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: moderateScale(10),
  },
  radioActive: {
    backgroundColor: '#000000',
  },
  reasonText: {
    fontSize: moderateScale(14),
    color: '#000000',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: moderateScale(10),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: 8,
    backgroundColor: '#333333',
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  cancelRideBtn: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  cancelRideText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  btnDisabled: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: moderateScale(20),
    borderRadius: 12,
    marginBottom: moderateScale(15),
    borderWidth: 1,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  heading: {
    fontWeight: '700',
    color: '#000000',
    fontSize: moderateScale(16),
    marginTop: moderateScale(8),
    marginBottom: moderateScale(4),
  },
  text: {
    color: '#000000',
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: moderateScale(15),
    justifyContent: 'space-between',
    gap: moderateScale(10),
  },
  button: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: moderateScale(20),
    width: SCREEN_WIDTH * 0.85,
    maxHeight: SCREEN_HEIGHT * 0.7,
    borderWidth: 1,
    borderColor: '#000000',
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: moderateScale(10),
  },
  modalSubtitle: {
    fontSize: moderateScale(16),
    color: '#000000',
    textAlign: 'center',
    marginBottom: moderateScale(15),
  },
  reasonsList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
    marginBottom: moderateScale(15),
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  reasonItemActive: {
    backgroundColor: '#F0F0F0',
  },
  radio: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: moderateScale(10),
  },
  radioActive: {
    backgroundColor: '#000000',
  },
  reasonText: {
    fontSize: moderateScale(14),
    color: '#000000',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: moderateScale(10),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: 8,
    backgroundColor: '#333333',
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  cancelRideBtn: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  cancelRideText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  btnDisabled: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
});