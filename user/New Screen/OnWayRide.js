import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Platform,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Dimensions,
    TextInput,
    KeyboardAvoidingView,
    Linking,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, CommonActions } from "@react-navigation/native";
import axios from "axios";
import NewUserAndDriverMap from "./NewMap";
import { useLocation } from "../context/LocationContext";
import { useRide } from "../context/RideContext";
import useSettings from "../hooks/Settings";
import { VCOLORS } from "../constants/colors";
import * as SecureStore from 'expo-secure-store';
import CashbackModal from "./CashbackModal";
import { initializeSocket } from "../services/socketService";
import { useRideChat } from "../hooks/userRideChatHook";
import { find_me } from '../utils/helpers';

const { width, height } = Dimensions.get("window");
const API_BASE_URL = "https://www.appv2.olyox.com";
const RIDE_NAVIGATION_KEY = 'hasNavigatedToRideStarted';

const STATUS_CONFIG = {
    driver_assigned: { label: "Driver Assigned", color: "#FF6B35", icon: "car-outline" },
    driver_arrived: { label: "Driver Arrived", color: "#4CAF50", icon: "checkmark-circle-outline" },
    in_progress: { label: "In Progress", color: "#2196F3", icon: "navigate-outline" },
    completed: { label: "Completed", color: "#8BC34A", icon: "flag-outline" },
};

// Payment Modal
const PaymentModal = ({ visible, onClose, amount, paymentMethod }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.paymentModalOverlay}>
            <View style={styles.paymentModalContent}>
                <View style={styles.paymentModalHeader}>
                    <Ionicons name="card-outline" size={28} color="#4CAF50" />
                    <Text style={styles.paymentModalTitle}>Payment Required</Text>
                </View>

                <View style={styles.paymentDetailsContainer}>
                    <Text style={styles.paymentLabel}>Amount to Pay:</Text>
                   <Text style={styles.paymentAmount}>
  ₹{Number(amount ?? 0).toFixed(2)}
</Text>

                    <Text style={styles.paymentMethodText}>Method: {paymentMethod}</Text>
                </View>

                <View style={styles.paymentInstructions}>
                    <Text style={styles.instructionText}>Please pay the driver</Text>
                    <Text style={styles.instructionSubText}>
                        Hand over ₹{Number(amount ?? 0).toFixed(2)} in cash to complete your ride.
                    </Text>
                </View>

                <TouchableOpacity style={styles.paymentOkButton} onPress={onClose}>
                    <Text style={styles.paymentOkText}>Got it!</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

export default function OnWayRide() {
    const route = useRoute();
    const { rideId } = route.params || {};
    const { location } = useLocation();
    const { clearCurrentRide } = useRide();
    const navigation = useNavigation();
    const mapRef = useRef(null);
    const flatListRef = useRef(null);
    const { settings } = useSettings();
    const [currentId, setCurrentId] = useState(null)

    useEffect(() => {
        const fetchLoadRideId = async () => {
            try {
                const user = await find_me()
                if (user?.user?.currentRide) {
                    setCurrentId(user?.user?.currentRide)
                    console.log("user?.user?.currentRide", user?.user?.currentRide)
                } else {
                    setCurrentId(rideId)
                }
            } catch (error) {
                console.log("Eroor", error)
            }
        }
        fetchLoadRideId()
    }, [])

    // console.log("OnWayRide currentId:", currentId);

    // === State ===
    const [activeRideData, setActiveRideData] = useState(null);
    const [lightData, setLightData] = useState({}); // For real-time updates
    const [loading, setLoading] = useState(true);
    const [lightLoading, setLightLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showCancelModal, setCancelModal] = useState(false);
    const [cancelReasons, setCancelReasons] = useState([]);
    const [selectedReason, setSelectedReason] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [chatModalVisible, setChatModalVisible] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [openCashbackModal, setOpenCashbackModal] = useState(false);
    const [cashbackAmount, setCashbackAmount] = useState(0);
    const [userInteracted, setUserInteracted] = useState(false);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(true);

    const { messages, sendMessage, loading: messagesLoading } = useRideChat(activeRideData?._id, chatModalVisible);

    // === Memoized ===
    const currentStatus = useMemo(() => {
        const status = lightData.ride_status || activeRideData?.ride_status;
        return status ? STATUS_CONFIG[status] : null;
    }, [lightData.ride_status, activeRideData?.ride_status]);

    const driverInfo = useMemo(() => ({
        ...activeRideData?.driver,
        location: lightData.driver_location
            ? { coordinates: lightData.driver_location }
            : activeRideData?.driver?.location,
    }), [activeRideData?.driver, lightData.driver_location]);

    // === Auto-focus logic ===
    const getAutoFocusType = useCallback(() => {
        if (!activeRideData || userInteracted) return null;
        const status = lightData.ride_status || activeRideData.ride_status;
        return status === 'driver_assigned' || status === 'driver_arrived'
            ? 'driver_to_pickup'
            : status === 'in_progress' ? 'pickup_to_drop' : null;
    }, [activeRideData, lightData.ride_status, userInteracted]);

    // === Light API Call (Every 2s) ===
    const handleLightApiCall = useCallback(async () => {
        if (!currentId || !activeRideData) return;

        setLightLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE_URL}/rider-light/${currentId}`, { timeout: 8000 });
            const { ride_status, driver_location, payment_status, rideId } = data.data || {};
            console.log("Light API data:", data.data);
            setLightData(prev => ({
                rideId: rideId || prev.rideId,
                ride_status: ride_status || prev.ride_status,
                driver_location: driver_location || prev.driver_location,
                payment_status: payment_status || prev.payment_status,
            }));
        } catch (err) {
            console.warn("Light API failed:", err.message);
        } finally {
            setLightLoading(false);
        }
    }, [currentId, activeRideData]);

    // === Full Ride Details (Heavy) with Retry ===
    const fetchRideDetails = useCallback(async (retryCount = 0) => {
        if (!currentId) return;

        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/rider/${currentId}`, { timeout: 10000 });
            if (response.data?.data) {
                setActiveRideData(response.data.data);
                setLightData(prev => ({
                    ride_status: response.data.data.ride_status,
                    driver_location: response.data.data.driver?.location?.coordinates,
                    payment_status: response.data.data.payment_status
                }));
            }
        } catch (err) {
            console.error("Fetch error:", err.message);
            if (retryCount < 3) {
                console.log(`Retrying... Attempt ${retryCount + 1}`);
                setTimeout(() => fetchRideDetails(retryCount + 1), 2000);
            } else {
                Alert.alert(
                    "Connection Error",
                    "Failed to load ride details after multiple attempts. Please check your internet connection.",
                    [
                        { text: "Retry", onPress: () => fetchRideDetails(0) },
                        { text: "Cancel", style: "cancel" }
                    ]
                );
            }
        } finally {
            setLoading(false);
        }
    }, [currentId]);

    // === Cancel Ride ===
    const handleCancel = useCallback(async () => {
        if (!selectedReason || !currentId) return;

        setCancelling(true);
        try {
            await axios.post(`${API_BASE_URL}/api/v1/new/ride/cancel`, {
                ride: currentId,
                cancelBy: 'user',
                reason_id: selectedReason._id,
                reason: selectedReason.name,
            });

            await SecureStore.deleteItemAsync(RIDE_NAVIGATION_KEY);
            Alert.alert("Cancelled", "Ride cancelled successfully", [{
                text: "OK",
                onPress: () => {
                    clearCurrentRide();
                    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
                },
            }]);
        } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to cancel");
        } finally {
            setCancelling(false);
            setCancelModal(false);
        }
    }, [selectedReason, currentId, navigation, clearCurrentRide]);



    // === Chat Send ===
    const handleSendMessage = async () => {
        const text = messageText.trim();
        if (!text || !activeRideData?._id || sendingMessage) return;

        setSendingMessage(true);
        try {
            await sendMessage(activeRideData._id, "user", text);
            setMessageText("");
        } catch (err) {
            Alert.alert("Error", "Failed to send message");
        } finally {
            setSendingMessage(false);
        }
    };

    // === Socket Init ===
    useEffect(() => {
        if (!activeRideData?._id) return;
        initializeSocket({
            userType: "user",
            userId: activeRideData.user?._id,
            name: activeRideData.user?.name || "User"
        });
    }, [activeRideData?._id]);

    // === Scroll to bottom on new message ===
    useEffect(() => {
        if (messages.length > 0 && chatModalVisible) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages, chatModalVisible]);

    // === Polling: Light every 2s ===
    useEffect(() => {
        const interval = setInterval(handleLightApiCall, 2000);
        return () => clearInterval(interval);
    }, [handleLightApiCall]);

    // === Initial Load + Status Change Effects ===
    useEffect(() => {
        fetchRideDetails();
    }, [fetchRideDetails]);

    // === Status & Payment Logic ===
    useEffect(() => {
        if (!activeRideData) return;

        const status = lightData.ride_status || activeRideData.ride_status;
        const payment = lightData.payment_status || activeRideData.payment_status;

        // Cancelled
        if (status === 'cancelled') {
            Alert.alert("Ride Cancelled", "Your ride has been cancelled.", [{
                text: "OK",
                onPress: () => {
                    clearCurrentRide();
                    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
                },
            }]);
            return;
        }

        // Payment Pending
        if (status === 'completed' && payment !== 'completed') {
            setShowPaymentModal(true);
            return;
        }

        // Completed + Paid
        if (status === 'completed' && payment === 'completed') {
            // Re-fetch to get latest pricing with extra charges
            fetchRideDetails();

            const hasCashback = activeRideData.isCashbackGet;
            const amount = activeRideData.cashback;

            if (hasCashback && amount > 0) {
                setCashbackAmount(amount);
                setOpenCashbackModal(true);
            } else {
                const validRideId = currentId || lightData?.rideId;

                if (validRideId) {
                    console.log("Navigating to RateRiderOrRide with ID:", validRideId);

                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [
                                {
                                    name: "RateRiderOrRide",
                                    params: { rideId: validRideId }
                                },
                            ],
                        })
                    );

                    // Optional: clear ride after navigation
                    // clearCurrentRide();

                } else {
                    console.warn("⚠️ No valid ride ID found. Cannot navigate.");
                    Alert.alert("Error", "No valid ride information found.");
                }
            }

        }
    }, [lightData.ride_status, lightData.payment_status, activeRideData, navigation, clearCurrentRide]);

    // === Map Interaction Reset ===
    useEffect(() => {
        setUserInteracted(false);
        setShouldAutoFocus(true);
    }, [activeRideData?.ride_status]);

    // === Render Functions ===
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.navigate("Home")}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                {currentStatus && (
                    <View style={styles.statusContainer}>
                        <Ionicons name={currentStatus.icon} size={18} color={currentStatus.color} />
                        <Text style={[styles.statusText, { color: currentStatus.color }]}>
                            {currentStatus.label}
                        </Text>
                        {lightLoading && <ActivityIndicator size={14} color="#666" style={{ marginLeft: 6 }} />}
                    </View>
                )}
            </View>

            <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
                <Ionicons name="ellipsis-vertical" size={24} color="#000" />
            </TouchableOpacity>

            {showMenu && (
                <View style={styles.menuDropdown}>
                    {/* Cancel */}
                    {!['in_progress', 'completed', 'cancelled'].includes(currentStatus?.label?.toLowerCase()) && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMenu(false);
                                axios.get(`${API_BASE_URL}/api/v1/admin/cancel-reasons?active=active&type=user`)
                                    .then(res => setCancelReasons(res.data.data))
                                    .catch(() => Alert.alert("Error", "Failed to load reasons"));
                                setCancelModal(true);
                            }}
                        >
                            <Ionicons name="close-circle-outline" size={20} color="#000" />
                            <Text style={styles.menuText}>Cancel Ride</Text>
                        </TouchableOpacity>
                    )}

                    {/* Emergency */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => {
                        setShowMenu(false);
                        Linking.openURL("tel:100");
                    }}>
                        <Ionicons name="call-outline" size={20} color="#DC2626" />
                        <Text style={[styles.menuText, { color: "#DC2626" }]}>Call Police</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => {
                        setShowMenu(false);
                        Linking.openURL(`tel:${settings?.support_number || '01141236789'}`);
                    }}>
                        <Ionicons name="headset-outline" size={20} color="#000" />
                        <Text style={styles.menuText}>Support</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => {
                        setShowMenu(false);
                        const link = `https://olyox.in/app/share-ride/${activeRideData?._id}`;
                        const msg = `Track my ride: ${link}`;
                        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
                            Linking.openURL(`sms:?body=${encodeURIComponent(msg)}`).catch(() =>
                                Alert.alert("Error", "Cannot share ride")
                            )
                        );
                    }}>
                        <Ionicons name="share-social-outline" size={20} color="#000" />
                        <Text style={styles.menuText}>Share Ride</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderChatModal = () => (
        <Modal visible={chatModalVisible} animationType="slide" transparent>
            <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={styles.chatModalContainer}>
                    <View style={styles.chatModalHeader}>
                        <Text style={styles.chatModalTitle}>Chat with Driver</Text>
                        <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>

                    {messagesLoading && messages.length === 0 ? (
                        <View style={styles.chatLoadingContainer}>
                            <ActivityIndicator size="large" color="#3b82f6" />
                        </View>
                    ) : messages.length === 0 ? (
                        <View style={styles.emptyChatContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyChatText}>No messages yet</Text>
                            <Text style={styles.emptyChatSubtext}>Say hi to your driver!</Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(_, i) => i.toString()}
                            contentContainerStyle={styles.chatMessagesList}
                            renderItem={({ item }) => {
                                const isUser = item.fromType === "user";
                                return (
                                    <View style={[styles.chatMessageBubble, isUser ? styles.chatMessageUser : styles.chatMessageDriver]}>
                                        <Text style={[styles.chatMessageText, isUser ? { color: '#fff' } : { color: '#1e293b' }]}>
                                            {item.message}
                                        </Text>
                                        <Text style={[styles.chatMessageTime, isUser ? { color: '#bfdbfe' } : { color: '#94a3b8' }]}>
                                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                );
                            }}
                        />
                    )}

                    <View style={styles.chatInputContainer}>
                        <TextInput
                            style={styles.chatInput}
                            placeholder="Type a message..."
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            editable={!sendingMessage}
                        />
                        <TouchableOpacity
                            style={[styles.chatSendButton, (!messageText.trim() || sendingMessage) && styles.chatSendButtonDisabled]}
                            onPress={handleSendMessage}
                            disabled={!messageText.trim() || sendingMessage}
                        >
                            {sendingMessage ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    const renderRideDetails = () => {
        const pricing = activeRideData?.pricing || {};
        const hasExtraCharges = (pricing.extra_km || 0) > 0 || (pricing.extra_hours || 0) > 0;
        const isRental = activeRideData?.is_rental;
        const isLater = activeRideData?.isLater;
        const showExtraInfo = (isRental || isLater) && hasExtraCharges;

        return (
            <View style={styles.rideDetails}>
                <View style={styles.driverCard}>
                    <View style={styles.driverAvatar}>
                        <Ionicons name="person" size={24} color="#fff" />
                    </View>
                    <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{driverInfo?.name || "Driver"}</Text>
                        <Text style={styles.vehicleInfo}>
                            {driverInfo?.rideVehicleInfo?.vehicleName} • {driverInfo?.rideVehicleInfo?.VehicleNumber}
                        </Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${settings?.support_number_driver || '01141236767'}`)}>
                            <Ionicons name="call" size={20} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chatButtonWithBadge} onPress={() => setChatModalVisible(true)}>
                            <View style={styles.chatButton}>
                                <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                            </View>
                            {messages.length > 0 && (
                                <View style={styles.chatBadge}>
                                    <Text style={styles.chatBadgeText}>{messages.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {(isRental || isLater) && (
                    <View style={styles.rentalInfoCard}>
                        <View style={styles.rentalInfoRow}>
                            <View style={styles.rentalInfoItem}>
                                <Ionicons name="time-outline" size={18} color="#3b82f6" />
                                <Text style={styles.rentalInfoLabel}>Hours</Text>
                                <Text style={styles.rentalInfoValue}>{activeRideData?.rentalHours || 0}h</Text>
                            </View>
                            <View style={styles.rentalDivider} />
                            <View style={styles.rentalInfoItem}>
                                <Ionicons name="speedometer-outline" size={18} color="#3b82f6" />
                                <Text style={styles.rentalInfoLabel}>KM Limit</Text>
                                <Text style={styles.rentalInfoValue}>{activeRideData?.rental_km_limit || 0} km</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.routeContainer}>
                    <View style={styles.routeItem}>
                        <View style={[styles.routeDot, { backgroundColor: "#4CAF50" }]} />
                        <Text style={styles.routeAddress}>{activeRideData?.pickup_address?.formatted_address}</Text>
                    </View>
                    {activeRideData?.ride_otp && (
                        <View style={styles.otpContainer}>
                            <Text style={styles.otpValue}>OTP: {activeRideData.ride_otp}</Text>
                        </View>
                    )}
                    <View style={styles.routeLine} />
                    <View style={styles.routeItem}>
                        <View style={[styles.routeDot, { backgroundColor: "#FF6B35" }]} />
                        <Text style={styles.routeAddress}>{activeRideData?.drop_address?.formatted_address}</Text>
                    </View>
                </View>

                {showExtraInfo && (
                    <View style={styles.extraChargesCard}>
                        <View style={styles.extraChargesHeader}>
                            <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                            <Text style={styles.extraChargesTitle}>Additional Charges Applied</Text>
                        </View>

                        {(pricing.extra_km || 0) > 0 && (
                            <View style={styles.extraChargeRow}>
                                <View style={styles.extraChargeInfo}>
                                    <Text style={styles.extraChargeLabel}>Extra Distance</Text>
                                    <Text style={styles.extraChargeDetail}>{pricing.extra_km?.toFixed(1)} km exceeded</Text>
                                </View>
                                <Text style={styles.extraChargeAmount}>+₹{pricing.extra_km_fare || 0}</Text>
                            </View>
                        )}

                        {(pricing.extra_hours || 0) > 0 && (
                            <View style={styles.extraChargeRow}>
                                <View style={styles.extraChargeInfo}>
                                    <Text style={styles.extraChargeLabel}>Extra Time</Text>
                                    <Text style={styles.extraChargeDetail}>{pricing.extra_hours?.toFixed(1)} hours exceeded</Text>
                                </View>
                                <Text style={styles.extraChargeAmount}>+₹{pricing.extra_time_fare || 0}</Text>
                            </View>
                        )}

                        {(pricing.total_extra_charges || 0) > 0 && (
                            <View style={styles.totalExtraRow}>
                                <Text style={styles.totalExtraLabel}>Total Extra Charges</Text>
                                <Text style={styles.totalExtraAmount}>+₹{pricing.total_extra_charges}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.fareContainer}>
               <View style={styles.fareLeft}>
  {/* Strike-through original fare if applicable */}
  {(pricing.original_total_fare || 0) > 0 &&
    pricing.original_total_fare !== pricing.total_fare && (
      <Text style={styles.originalFare}>₹{pricing.original_total_fare}</Text>
    )}

  {pricing?.toll_charge ? (
    <>
      {/* Fare excluding toll */}
      <Text style={styles.fareTitle}>
        ₹{Number(pricing.total_fare - pricing.toll_charge).toFixed(2)}
      </Text>
      {/* Toll amount */}
      <Text style={styles.tollText}>+ Toll ₹{pricing.toll_charge}</Text>
      {/* Total fare including toll */}
      <Text style={styles.totalText}>
        Total: ₹{Number(pricing.total_fare).toFixed(2)}
      </Text>
    </>
  ) : (
    <Text style={styles.fareTitle}>
      ₹{Number(pricing?.total_fare ?? 0).toFixed(2)}
    </Text>
  )}
</View>

                    <Text style={styles.paymentMethod}>{activeRideData?.payment_method}</Text>
                </View>

                <Text style={styles.disclaimer}>
                    Extra charges ( parking, etc.) are not included. Pay driver directly if applicable.
                </Text>
            </View>
        );
    };

    if (loading && !activeRideData) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.loadingText}>Loading your ride...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <View style={styles.mapContainer}>
                <NewUserAndDriverMap
                    ref={mapRef}
                    pickupLocation={activeRideData?.pickup_location?.coordinates}
                    DriverLocation={driverInfo?.location?.coordinates}
                    driver={driverInfo}
                    polyline={activeRideData?.route_info?.polyline}
                    DropLocation={activeRideData?.drop_location?.coordinates}
                    rideStatus={lightData.ride_status || activeRideData?.ride_status}
                    onUserInteraction={() => {
                        setUserInteracted(true);
                        setShouldAutoFocus(false);
                    }}
                    rideData={activeRideData?.route_info}
                    autoFocusType={getAutoFocusType()}
                    shouldAutoFocus={shouldAutoFocus}
                    platform={Platform.OS}
                />
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {renderRideDetails()}
                <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity style={styles.helpButton} onPress={() => {
                Alert.alert("Emergency", "Choose help:", [
                    { text: "Police", onPress: () => Linking.openURL("tel:100") },
                    { text: "Ambulance", onPress: () => Linking.openURL("tel:112") },
                    { text: "Support", onPress: () => Linking.openURL(`tel:${settings?.support_number || '01141236789'}`) },
                    { text: "Cancel", style: "cancel" },
                ]);
            }}>
                <Ionicons name="shield-checkmark" size={22} color="#fff" />
                <Text style={styles.helpButtonText}>Emergency Help</Text>
            </TouchableOpacity>

            {lightData?.payment_status === 'pending' && (
                <PaymentModal
                    visible={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        fetchRideDetails();
                    }}
                    amount={activeRideData?.pricing?.total_fare}
                    paymentMethod={activeRideData?.payment_method}
                />
            )}

            <CashbackModal
                visible={openCashbackModal}
                onClose={() => {
                    const validRideId = currentId || lightData?.rideId || activeRideData?._id;
                    console.log("Navigating to RateRiderOrRide with ID:", validRideId);
                    setOpenCashbackModal(false);
                    clearCurrentRide();
                    navigation.dispatch(CommonActions.reset({
                        index: 0,
                        routes: [{ name: "RateRiderOrRide", params: { rideId: validRideId } }],
                    }));
                }}
                amount={cashbackAmount}
            />

            {renderChatModal()}

            {showCancelModal && (
                <Modal visible transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Cancel Ride</Text>
                            <FlatList
                                data={cancelReasons}
                                keyExtractor={item => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.reasonItem, selectedReason?._id === item._id && styles.selectedReason]}
                                        onPress={() => setSelectedReason(item)}
                                    >
                                        <View style={styles.radioButton}>
                                            {selectedReason?._id === item._id && <View style={styles.radioSelected} />}
                                        </View>
                                        <Text style={styles.reasonName}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelModalButton} onPress={() => setCancelModal(false)}>
                                    <Text>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmButton, !selectedReason && styles.disabledButton]}
                                    onPress={handleCancel}
                                    disabled={!selectedReason || cancelling}
                                >
                                    {cancelling ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Root
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingBottom: Platform.select({ ios: 80, android: 70 }),
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: "500",
        color: "#666",
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingTop: Platform.OS === "android" ? 20 : 0,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eaeaea",
        zIndex: 100,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 16,
        backgroundColor: "#f9f9f9",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#eaeaea",
    },
    statusText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: 0.2,
    },

    // Menu Dropdown
    menuDropdown: {
        position: "absolute",
        top: 58,
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 16,
        minWidth: 180,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 12,
        borderWidth: 1,
        borderColor: "#eaeaea",
        overflow: "hidden",
        zIndex: 2000,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    menuText: {
        marginLeft: 12,
        fontSize: 15,
        fontWeight: "500",
        color: "#333",
    },

    // Map
    mapContainer: {
        height: height * 0.48,
        backgroundColor: "#f5f5f5",
        overflow: "hidden",
    },

    // Scroll Container
    scrollContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },

    // Ride Details Section
    rideDetails: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 90,
        backgroundColor: "#fff",
    },

    // Driver Card
    driverCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eaeaea",
    },
    driverAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
    },
    driverInfo: {
        flex: 1,
        marginLeft: 14,
    },
    driverName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        letterSpacing: -0.2,
    },
    vehicleInfo: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
        fontWeight: "500",
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    chatButtonWithBadge: {
        position: "relative",
    },
    chatButton: {
        backgroundColor: "#000",
        padding: 11,
        borderRadius: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
    },
    chatBadge: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "#ef4444",
        borderRadius: 12,
        minWidth: 22,
        height: 22,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
        borderWidth: 2.5,
        borderColor: "#fff",
    },
    chatBadgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },

    // Rental Info Card
    rentalInfoCard: {
        backgroundColor: "#f0f9ff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
    rentalInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },
    rentalInfoItem: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },
    rentalInfoLabel: {
        fontSize: 12,
        color: "#64748b",
        fontWeight: "600",
        marginTop: 4,
    },
    rentalInfoValue: {
        fontSize: 18,
        color: "#1e293b",
        fontWeight: "700",
    },
    rentalDivider: {
        width: 1,
        height: 40,
        backgroundColor: "#cbd5e1",
    },

    // Route
    routeContainer: {
        paddingVertical: 16,
    },
    routeItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    routeDot: {
        width: 13,
        height: 13,
        borderRadius: 6.5,
        marginTop: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    routeLine: {
        width: 2,
        height: 32,
        backgroundColor: "#ddd",
        marginLeft: 6,
        alignSelf: "center",
    },
    routeAddress: {
        flex: 1,
        marginLeft: 16,
        fontSize: 15,
        color: "#333",
        lineHeight: 22,
        fontWeight: "500",
    },
    otpContainer: {
        alignSelf: "flex-start",
        marginLeft: 28,
        marginTop: 8,
        marginBottom: 12,
        backgroundColor: "#e8f5e8",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#4caf50",
    },
    otpValue: {
        fontSize: 17,
        fontWeight: "800",
        color: "#2e7d32",
        letterSpacing: 1.5,
    },

    // Extra Charges Card
    extraChargesCard: {
        backgroundColor: "#fffbeb",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#fde68a",
    },
    extraChargesHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#fde68a",
    },
    extraChargesTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#92400e",
        marginLeft: 8,
    },
    extraChargeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#fef3c7",
    },
    extraChargeInfo: {
        flex: 1,
    },
    extraChargeLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#78350f",
        marginBottom: 2,
    },
    extraChargeDetail: {
        fontSize: 13,
        color: "#a16207",
        fontWeight: "500",
    },
    extraChargeAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#dc2626",
    },
    totalExtraRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 2,
        borderTopColor: "#fbbf24",
    },
    totalExtraLabel: {
        fontSize: 16,
        fontWeight: "700",
        color: "#92400e",
    },
    totalExtraAmount: {
        fontSize: 18,
        fontWeight: "800",
        color: "#dc2626",
    },

    // Fare
    fareContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#eaeaea",
        marginTop: 8,
    },
    fareLeft: {
        flexDirection: "column",
        alignItems: "flex-start",
    },
    originalFare: {
        fontSize: 16,
        fontWeight: "600",
        color: "#999",
        textDecorationLine: "line-through",
        marginBottom: 2,
    },
    fareTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#000",
        letterSpacing: -0.5,
    },
    paymentMethod: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },

    // Disclaimer
    disclaimer: {
        marginTop: 12,
        fontSize: 13,
        color: "#888",
        fontStyle: "italic",
        lineHeight: 18,
        textAlign: "center",
        fontWeight: "600",
    },

    // Emergency Help Button
    helpButton: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        paddingVertical: 16,
        borderRadius: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 12,
    },
    helpButtonText: {
        marginLeft: 10,
        fontSize: 17,
        fontWeight: "700",
        color: "#fff",
        letterSpacing: 0.3,
    },

    // Modals: Cancel
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.75,
        paddingBottom: 30,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1a1a1a",
        textAlign: "center",
        marginTop: 20,
        marginBottom: 16,
    },
    reasonItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    selectedReason: {
        backgroundColor: "#f0f7ff",
        borderLeftWidth: 4,
        borderLeftColor: "#000",
    },
    radioButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2.5,
        borderColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    radioSelected: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#000",
    },
    reasonName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        flex: 1,
    },
    modalActions: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: "#eaeaea",
    },
    cancelModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#ccc",
        alignItems: "center",
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#000",
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: "#ccc",
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },

    // Payment Modal
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    paymentModalContent: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 28,
        width: "100%",
        maxWidth: 360,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    paymentModalHeader: {
        alignItems: "center",
        marginBottom: 20,
    },
    paymentModalTitle: {
        fontSize: 23,
        fontWeight: "800",
        color: "#1a1a1a",
        marginTop: 10,
        letterSpacing: -0.3,
    },
    paymentDetailsContainer: {
        alignItems: "center",
        width: "100%",
        backgroundColor: "#f8f9fa",
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#eaeaea",
    },
    paymentLabel: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
        marginBottom: 6,
    },
    paymentAmount: {
        fontSize: 36,
        fontWeight: "900",
        color: "#2e7d32",
        letterSpacing: -1,
    },
    paymentMethodText: {
        fontSize: 16,
        color: "#333",
        fontWeight: "700",
        marginTop: 6,
    },
    paymentInstructions: {
        alignItems: "center",
        marginBottom: 28,
    },
    instructionText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        textAlign: "center",
        marginBottom: 8,
    },
    instructionSubText: {
        fontSize: 14.5,
        color: "#555",
        textAlign: "center",
        lineHeight: 20,
    },
    paymentOkButton: {
        backgroundColor: "#2e7d32",
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 28,
        width: "100%",
        alignItems: "center",
        shadowColor: "#2e7d32",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    paymentOkText: {
        fontSize: 17,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: 0.3,
    },

    // Chat Modal
    chatModalContainer: {
        backgroundColor: "#fff",
        height: "78%",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 15,
    },
    chatModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#eaeaea",
        backgroundColor: "#fff",
    },
    chatModalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1a1a1a",
    },

    // Chat States
    chatLoadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9fafb",
    },
    emptyChatContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        paddingHorizontal: 40,
    },
    emptyChatText: {
        fontSize: 19,
        fontWeight: "700",
        color: "#334155",
        marginBottom: 6,
    },
    emptyChatSubtext: {
        fontSize: 14.5,
        color: "#64748b",
        textAlign: "center",
        lineHeight: 20,
    },

    // Messages
    chatMessagesList: {
        padding: 16,
        backgroundColor: "#f9fafb",
        flexGrow: 1,
    },
    chatMessageBubble: {
        maxWidth: "78%",
        marginBottom: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    chatMessageUser: {
        alignSelf: "flex-end",
        backgroundColor: "#3b82f6",
        borderBottomRightRadius: 6,
    },
    chatMessageDriver: {
        alignSelf: "flex-start",
        backgroundColor: "#fff",
        borderBottomLeftRadius: 6,
        borderWidth: 1,
        borderColor: "#eaeaea",
    },
    chatMessageText: {
        fontSize: 15.5,
        lineHeight: 21,
        marginBottom: 4,
    },
    chatMessageTime: {
        fontSize: 11.5,
        fontWeight: "500",
        alignSelf: "flex-end",
    },

    // Chat Input
    chatInputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#eaeaea",
    },
    chatInput: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        marginRight: 12,
        maxHeight: 100,
        fontSize: 15.5,
        color: "#1a1a1a",
        lineHeight: 20,
    },
    chatSendButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#3b82f6",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    chatSendButtonDisabled: {
        backgroundColor: "#cbd5e1",
        shadowOpacity: 0,
        elevation: 0,
    },
    fareLeft: {
  alignItems: 'flex-start',
},

originalFare: {
  fontSize: 14,
  color: '#999',
  textDecorationLine: 'line-through',
},

fareTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#000',
},

tollText: {
  fontSize: 14,
  color: '#555',
  marginTop: 2,
},

totalText: {
  fontSize: 16,
  color: '#00aaa9',
  fontWeight: '600',
  marginTop: 4,
},

});