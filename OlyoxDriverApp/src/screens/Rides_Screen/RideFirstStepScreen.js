"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  Linking,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  NativeModules,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import haversine from "haversine-distance";
import { useRideChat } from "../../hooks/userRideChatHook";
import useCurrentRideStore from "../../../Store/currentRideStore";
import useRideStore from "../../../Store/PoolingStore";
import useUserStore from "../../../Store/useUserStore";

import LoadingScreen from "./steps/LoadingScreen";
import WaitingDriverScreen from "./steps/WaitingDriverScreen";
import DriverAssignedScreen from "./steps/DriverAssignedScreen";
import MarkReachedScreen from "./steps/MarkReachedScreen";
import RideProgressScreen from "./steps/RideProgressScreen";
import RideCompleteScreen from "./steps/RideCompleteScreen";
import RideCancelledScreen from "./steps/RideCancelledScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL_APP } from "../../../constant/api";
const { PlayerModule, RideModule } = NativeModules;

if(Platform.OS ==="android"){
  PlayerModule.stopSound()
  .then(() => console.log('Sound stopped at first screen'))
  .catch(err => console.error('stopSound error:', err));
}

const SPEED = {
  TRAFFIC: 20,   // km/h
  NORMAL: 40,    // km/h
  HIGHWAY: 60,   // km/h
}

const MAX_RETRY = 3;
const RETRY_DELAY_MS = 2000;

const rideCache = new Map();



const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = val => (val * Math.PI) / 180;
  const R = 6371e3; // meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};



const MessageItem = React.memo(({ item }) => {

  const isDriver = item.fromType === "driver";
  return (
    <View
      style={[
        styles.messageBubble,
        isDriver ? styles.driverMessage : styles.riderMessage,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          isDriver && styles.messageTextDriver
        ]}
      >
        {item?.message || ''}
      </Text>

      <Text style={styles.messageTime}>
        {new Date(item.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
});


const CancelModal = React.memo(
  ({
    visible,
    cancelReasons,
    selectedReason,
    onSelectReason,
    onCancelRide,
    onBack,
  }) => {
    if (!visible) return null;
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.cancelModal}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <Text style={styles.modalSubtitle}>Select reason</Text>
            <FlatList
              data={cancelReasons}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.reasonItem,
                    selectedReason?._id === item._id && styles.reasonItemActive,
                  ]}
                  onPress={() => onSelectReason(item)}
                >
                  <View
                    style={[
                      styles.radio,
                      selectedReason?._id === item._id && styles.radioActive,
                    ]}
                  />
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
                style={[
                  styles.cancelRideBtn,
                  !selectedReason && styles.btnDisabled,
                ]}
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

const ReportModal = React.memo(({ visible, onCallSupport, onClose }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.reportModal}>
          <Text style={styles.modalTitle}>Report Issue</Text>
          <Text style={styles.modalSubtitle}>Contact Olyox Support</Text>
          <TouchableOpacity
            style={styles.supportCallBtn}
            onPress={onCallSupport}
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.supportCallText}>Call Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const OptionsModal = React.memo(
  ({ visible, onCancel, onReport, onChat, onClose, rideDetails, currentStatus }) => {
    if (!visible) return null;

    const isParcelOrder = rideDetails?.isParcelOrder === true;
    const isInProgress = currentStatus === "in_progress";
    const shouldDisableCancel = isParcelOrder && isInProgress;

    return (
      <Modal visible={visible} animationType="fade" transparent>
        <TouchableOpacity style={styles.overlay} onPress={onClose}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity style={styles.sheetItem} onPress={onChat}>
              <Ionicons name="chatbubble-outline" size={20} color="#007bff" />
              <Text style={styles.sheetText}>Chat with Rider</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sheetItem,
                shouldDisableCancel && styles.sheetItemDisabled
              ]}
              onPress={shouldDisableCancel ? null : onCancel}
              disabled={shouldDisableCancel}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={shouldDisableCancel ? "#ccc" : "#dc2626"}
              />
              <Text style={[
                styles.sheetText,
                shouldDisableCancel && styles.sheetTextDisabled
              ]}>
                Cancel Ride
                {shouldDisableCancel && " (Disabled)"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={onReport}>
              <Ionicons name="warning-outline" size={20} color="#f59e0b" />
              <Text style={styles.sheetText}>Report Issue</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} onPress={onClose}>
              <Ionicons name="close-outline" size={20} color="#666" />
              <Text style={styles.sheetText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }
);

const ChatModal = React.memo(
  ({
    visible,
    rideDetails,
    messages,
    messagesLoading,
    messageText,
    sendingMessage,
    onClose,
    onSendMessage,
    onMessageChange,
  }) => {
    if (!visible) return null;

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.chatModal}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.chatTitle}>
              {rideDetails?.user?.name || "Rider"}
            </Text>
          </View>
          {messagesLoading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
            <FlatList
              data={[...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))}
              renderItem={({ item }) => <MessageItem key={item._id} item={item} />}
              keyExtractor={(item) => item._id || Math.random().toString()}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
            />

          )}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type message..."
                value={messageText}
                onChangeText={onMessageChange}
                multiline
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!messageText.trim() || sendingMessage) &&
                  styles.sendBtnDisabled,
                ]}
                onPress={onSendMessage}
                disabled={!messageText.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }
);

export default function RideScreen() {
  const route = useRoute();
  const { _id } = route.params || {};
  const {
    fetchRideDetails,
    fetchOnlyLocationAndStatus,
    handleCancel,
    fetchCancelReasons,
  } = useCurrentRideStore();
  const { stopPooling } = useRideStore();
  const { user, fetchUserDetails } = useUserStore();
  const navigation = useNavigation();
  const { messages, sendMessage, loading: messagesLoading } = useRideChat(_id);

  const [rideDetails, setRideDetails] = useState(null);
  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [currentStatus, setCurrentStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [cancelReasons, setCancelReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Use refs to track previous values and prevent unnecessary updates
  const previousStatusRef = useRef(null);
  const previousDriverLocationRef = useRef(null);
  const previousPaymentStatusRef = useRef(null);
  const navigationTimerRef = useRef(null);

  // Load ride from cache or API
  useEffect(() => {
    if (!_id) {
      setLoading(false);
      setError("No ride ID provided");
      return;
    }

    const CACHE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
    fetchUserDetails()
    stopPooling()
    RideModule.startPoolingService(false, user?._id, API_URL_APP)
      .then(res => console.log("From Backgorund stop", res))
      .catch(err => console.error(err));


    const loadRide = async (attempt = 1) => {
      try {
        setLoading(true);
        setError(null);

        // ---- 1. No ride id → go home immediately ----
        if (!_id) {
          setLoading(false);
          navigation.reset({ index: 0, routes: [{ name: "Home" }] });
          return;
        }

        const CACHE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
        const now = Date.now();

        // ---- 2. In-memory cache (fast path) ----
        const cachedEntry = rideCache.get(_id);
        if (cachedEntry && now - cachedEntry.timestamp < CACHE_EXPIRY_MS) {
          const cachedRide = cachedEntry.data;
          setRideDetails(cachedRide);
          if (cachedRide.ride_status) {
            setCurrentStatus(cachedRide.ride_status);
            previousStatusRef.current = cachedRide.ride_status;
          }
          if (cachedRide.payment_status) {
            setPaymentStatus(cachedRide.payment_status);
            previousPaymentStatusRef.current = cachedRide.payment_status;
          }
          setLoading(false);
          return;
        }

        // ---- 3. AsyncStorage fallback ----
        const stored = await AsyncStorage.getItem(`ride_${_id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (now - (parsed.timestamp || 0) < CACHE_EXPIRY_MS) {
            rideCache.set(_id, parsed);
            setRideDetails(parsed.data);
            if (parsed.data?.ride_status) {
              setCurrentStatus(parsed.data.ride_status);
              previousStatusRef.current = parsed.data.ride_status;
            }
            if (parsed.data?.payment_status) {
              setPaymentStatus(parsed.data.payment_status);
              previousPaymentStatusRef.current = parsed.data.payment_status;
            }
            setLoading(false);
            return;
          }
        }

        // ---- 4. Fresh API call ----
        const data = await fetchRideDetails(_id);

        // ---- 5. Ride NOT FOUND → retry logic ----
        if (!data?._id) {
          if (attempt < MAX_RETRY) {
            console.warn(`Ride not found (attempt ${attempt}/${MAX_RETRY}), retrying…`);
            setTimeout(() => loadRide(attempt + 1), RETRY_DELAY_MS);
            return;
          }

          // ---- All retries failed → go Home ----
          console.error("Ride not found after retries");
          setLoading(false);
          navigation.reset({ index: 0, routes: [{ name: "Home" }] });
          return;
        }

        // ---- 6. SUCCESS → cache & update UI ----
        const cacheData = { data, timestamp: now };
        rideCache.set(_id, cacheData);
        await AsyncStorage.setItem(`ride_${_id}`, JSON.stringify(cacheData));

        setRideDetails(data);
        if (data.ride_status) {
          setCurrentStatus(data.ride_status);
          previousStatusRef.current = data.ride_status;
        }
        if (data.payment_status) {
          setPaymentStatus(data.payment_status);
          previousPaymentStatusRef.current = data.payment_status;
        }

      } catch (err) {
        console.error("Load ride error:", err);

        // ---- Any other error → retry (network, server, etc.) ----
        if (attempt < MAX_RETRY) {
          console.warn(`Load ride failed (attempt ${attempt}/${MAX_RETRY}), retrying…`);
          setTimeout(() => loadRide(attempt + 1), RETRY_DELAY_MS);
          return;
        }

        setError(err.message || "Failed to load ride");
      } finally {
        setLoading(false);
      }
    };

    loadRide();

    // ✅ Auto-refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      loadRide();
    }, CACHE_EXPIRY_MS);

    return () => {
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
      clearInterval(refreshInterval);
    };
  }, [_id, fetchRideDetails]);


  // Fetch cancel reasons
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




  // Poll for ride status and location updates - OPTIMIZED
  useEffect(() => {
    if (!_id || !fetchOnlyLocationAndStatus) return;

    // Skip polling if ride is completed, cancelled, or payment is completed
    if (
      ["completed", "cancelled"].includes(currentStatus) ||
      paymentStatus === "completed"
    ) {
      RideModule.startPoolingService(true, user?._id, API_URL_APP)
        .then(res => console.log("From Start Pool", res))
        .catch(err => console.error(err));

      return;
    }

    const interval = setInterval(async () => {
      try {

        const data = await fetchOnlyLocationAndStatus(_id);
        if (!data) {
          console.warn("No data returned from fetchOnlyLocationAndStatus");
          return;
        }

        // Only update driver location if it has changed significantly
        if (data.driver_location?.coordinates) {
          const newLocation = data.driver_location.coordinates;
          const prevLocation = previousDriverLocationRef.current;

          // Check if location changed (simple coordinate comparison)
          const locationChanged =
            !prevLocation ||
            prevLocation[0] !== newLocation[0] ||
            prevLocation[1] !== newLocation[1];

          if (locationChanged) {
            setCurrentDriverLocation(data.driver_location);
            previousDriverLocationRef.current = newLocation;
          }
        }

        // CRITICAL: Only update status if it actually changed
        if (
          data.ride_status &&
          data.ride_status !== previousStatusRef.current
        ) {
          console.log(
            "Status changed:",
            previousStatusRef.current,
            "->",
            data.ride_status
          );
          previousStatusRef.current = data.ride_status;
          setCurrentStatus(data.ride_status);

          // Handle terminal states
          if (["completed", "cancelled"].includes(data.ride_status)) {
            clearInterval(interval);

            // Clear any existing navigation timer
            if (navigationTimerRef.current) {
              clearTimeout(navigationTimerRef.current);
            }

            // Navigate after delay
            navigationTimerRef.current = setTimeout(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Home" }],
              });
            }, 2000);
          }
        }

        // CRITICAL: Only update payment status if it actually changed
        if (
          data.payment_status &&
          data.payment_status !== previousPaymentStatusRef.current
        ) {
          console.log(
            "Payment status changed:",
            previousPaymentStatusRef.current,
            "->",
            data.payment_status
          );
          previousPaymentStatusRef.current = data.payment_status;
          setPaymentStatus(data.payment_status);

          // If payment is completed, stop polling
          if (data.payment_status === "completed") {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Live status fetch failed:", err);
      }
    }, 3000); // Increased to 3 seconds to reduce polling frequency



    return () => {
      clearInterval(interval);
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, [
    _id,
    fetchOnlyLocationAndStatus,
    navigation,
    currentStatus,
    paymentStatus,
  ]);

  // Handle modal interactions
  const handleOpenOptions = useCallback(() => setOptionsModalVisible(true), []);
  const handleCloseOptions = useCallback(
    () => setOptionsModalVisible(false),
    []
  );
  const handleOpenCancel = useCallback(() => {
    setOptionsModalVisible(false);
    setCancelModalVisible(true);
  }, []);
  const handleOpenReport = useCallback(() => {
    setOptionsModalVisible(false);
    setReportModalVisible(true);
  }, []);
  const handleOpenChat = useCallback(() => {
    setOptionsModalVisible(false);
    setChatModalVisible(true);
  }, []);
  const handleCloseCancel = useCallback(() => {
    setCancelModalVisible(false);
    setSelectedReason(null);
  }, []);
  const handleCloseReport = useCallback(() => setReportModalVisible(false), []);
  const handleCloseChat = useCallback(() => setChatModalVisible(false), []);

  const handleSelectReason = useCallback(
    (reason) => setSelectedReason(reason),
    []
  );

  const handleCancelRide = useCallback(async () => {
    if (!selectedReason) return;
    try {
      await handleCancel(rideDetails, selectedReason._id);
      setCancelModalVisible(false);
      setSelectedReason(null);
      // Status will be updated by the polling interval
    } catch (err) {
      console.error("Cancel ride failed:", err);
      setError(err.message || "Failed to cancel ride");
    }
  }, [_id, handleCancel, selectedReason]);

  const handleCallSupport = useCallback(() => {
    const supportNumber = "+1234567890";
    Linking.openURL(`tel:${supportNumber}`).catch((err) => {
      console.error("Failed to make call:", err);
      setError("Failed to contact support");
    });
    setReportModalVisible(false);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      await sendMessage(_id, "driver", messageText.trim());
      setMessageText("");
    } catch (error) {
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  }, [messageText, sendingMessage, _id, sendMessage]);

  const formatDistance = (km) => {
    if (km == null || isNaN(km)) return "-";
    if (km < 1) return "less than 1 km";

    // Truncate to 2 decimal places (no rounding)
    const truncated = Math.floor(km * 100) / 100;
    return `${truncated.toFixed(2)} km`;
  };

  const stableState = useMemo(() => {
    if (!rideDetails) return null;

    const pickup = rideDetails?.pickup_location?.coordinates;
    const driver = currentDriverLocation?.coordinates;
    let distanceToPickup = null;
    let distanceToPickupFormatted = "-";
    let etaMinutes = null;

    if (pickup && driver) {
      const pickupLatLon = [pickup[1], pickup[0]];
      const driverLatLon = [driver[1], driver[0]];

      // Get numeric distance in km
      const distanceKm = haversineDistance(driver[1], driver[0], pickup[1], pickup[0]) / 1000;
      distanceToPickup = distanceKm;
      distanceToPickupFormatted = formatDistance(distanceKm);
      console.log("distanceToPickupFormatted", distanceToPickupFormatted)


      // Choose correct speed
      let speedKph = SPEED.NORMAL;
      if (rideDetails?.isIntercityRides || rideDetails?.isIntercity) {
        speedKph = SPEED.HIGHWAY;
      } else if (rideDetails?.is_rental) {
        speedKph = SPEED.NORMAL;
      }
      console.log("speed", speedKph)

      // ETA calculation
      if (distanceKm > 0 && speedKph > 0) {
        const hours = distanceKm / speedKph;
        etaMinutes = Math.round(hours * 60);
      }
    }

    return {
      _id: rideDetails._id,
      pickupAddress: rideDetails?.pickup_address?.formatted_address || "",
      dropAddress: rideDetails?.drop_address?.formatted_address || "",
      totalFare:
        rideDetails?.pricing?.total_fare || rideDetails?.fare?.total || 0,
      discount: rideDetails?.pricing?.discount || 0,
      user: rideDetails?.user,
      toll: rideDetails?.pricing?.toll_charge || 0,
      driver_arrived_at: rideDetails?.driver_arrived_at,
      isIntercityRides: rideDetails?.isIntercityRides || false,
      IntercityPickupTime: rideDetails?.IntercityPickupTime || null,
      rideType: rideDetails?.rideType || "local",
      isIntercity: rideDetails?.isIntercity || false,
      isRental: rideDetails?.is_rental || false,
      isLater: rideDetails?.isLater || false,
      rental_km_limit: rideDetails?.rental_km_limit || 0,
      rentalHours: rideDetails?.rentalHours || 0,
      paymentStatus,
      isParcelOrder: rideDetails?.isParcelOrder || false,
      details: rideDetails?.details,
      routeInfo: rideDetails?.route_info,
      pickupLocation: pickup,
      dropLocation: rideDetails?.drop_location?.coordinates,
      distanceToPickup, // numeric (for internal logic)
      distanceToPickupFormatted, // string (for display)
      etaMinutes,
    };
  }, [
    rideDetails?._id,
    rideDetails?.pickup_address?.formatted_address,
    rideDetails?.drop_address?.formatted_address,
    rideDetails?.pricing?.total_fare,
    rideDetails?.pricing?.discount,
    rideDetails?.fare?.total,
    currentDriverLocation?.coordinates?.[0],
    currentDriverLocation?.coordinates?.[1],
    rideDetails?.isIntercityRides,
    rideDetails?.isIntercity,
    rideDetails?.is_rental,
    paymentStatus,
  ]);



  // Render loading or error state
  if (loading) return <LoadingScreen />;
  if (error) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ color: "red" }}>{error}</Text>
      </SafeAreaView>
    );
  }

  // Render screens based on ride status
  return (
    <SafeAreaView style={styles.container}>
      {["pending", "searching"].includes(currentStatus) && (
        <WaitingDriverScreen rideDetails={stableState} />
      )}
      {currentStatus === "driver_assigned" && (
        <DriverAssignedScreen
          openChat={handleOpenChat}
          rideDetails={stableState}
        />
      )}
      {currentStatus === "driver_arrived" && (
        <MarkReachedScreen rideDetails={stableState} status={currentStatus} />
      )}
      {currentStatus === "in_progress" && (
        <RideProgressScreen
          rideDetails={stableState}
          currentStatus={currentStatus}
        />
      )}
      {currentStatus === "completed" && (
        <RideCompleteScreen
          paymentStatus={paymentStatus}
          rideDetails={stableState}
        />
      )}
      {currentStatus === "cancelled" && (
        <RideCancelledScreen rideDetails={stableState} />
      )}
      {["pending", "searching", "driver_assigned", "driver_arrived", "in_progress"].includes(
        currentStatus
      ) && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.optionsButton, styles.chatButton]}
              onPress={handleOpenChat}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={handleOpenOptions}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      <OptionsModal
        visible={optionsModalVisible}
        onCancel={handleOpenCancel}
        onReport={handleOpenReport}
        onChat={handleOpenChat}
        onClose={handleCloseOptions}
        rideDetails={rideDetails}
        currentStatus={currentStatus}
      />
      <CancelModal
        visible={cancelModalVisible}
        cancelReasons={cancelReasons}
        selectedReason={selectedReason}
        onSelectReason={handleSelectReason}
        onCancelRide={handleCancelRide}
        onBack={handleCloseCancel}
      />
      <ReportModal
        visible={reportModalVisible}
        onCallSupport={handleCallSupport}
        onClose={handleCloseReport}
      />
      <ChatModal
        visible={chatModalVisible}
        rideDetails={stableState}
        messages={messages}
        messagesLoading={messagesLoading}
        messageText={messageText}
        sendingMessage={sendingMessage}
        onClose={handleCloseChat}
        onSendMessage={handleSendMessage}
        onMessageChange={setMessageText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  reportModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetText: {
    fontSize: 16,
    color: "#000",
    marginLeft: 12,
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  reasonsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  reasonItemActive: {
    backgroundColor: "#f0f0f0",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
    marginRight: 12,
  },
  radioActive: {
    backgroundColor: "#000",
  },
  reasonText: {
    fontSize: 14,
    color: "#000",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginRight: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  cancelRideBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#dc2626",
  },
  btnDisabled: {
    backgroundColor: "#ccc",
  },
  cancelRideText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  supportCallBtn: {
    flexDirection: "row",
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  supportCallText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    width: "100%",
  },
  closeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  buttonContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    gap: 10,
  },
  optionsButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  chatButton: {
    backgroundColor: "#e6f0ff",
  },
  chatModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backBtn: {
    paddingRight: 16,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  driverMessage: {
    backgroundColor: "#f0f0f0",
    alignSelf: "flex-end",
  },
  riderMessage: {
    backgroundColor: "#f0f0f0",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 14,
    color: "#000",
  },
  messageTextDriver: {
    fontSize: 14,
    color: "#000"
  },
  messageTime: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  chatInputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "center",
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    padding: 12,
    maxHeight: 100,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: "#007bff",
    borderRadius: 20,
    padding: 12,
    marginLeft: 8,
  },
  sheetItemDisabled: {
    opacity: 0.5,
  },
  sheetTextDisabled: {
    color: "#999",
  },
  sendBtnDisabled: {
    backgroundColor: "#ccc",
  },
});
