import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    Image,
    Alert,
    Modal,
    Animated,
    Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { find_me } from '../utils/helpers';
import { tokenCache } from '../Auth/cache';

const { width } = Dimensions.get('window');
const API_BASE_URL = "https://www.appv2.olyox.com";
const BOOKING_API = "https://www.appv2.olyox.com/api/v1/new/new-ride"; // Change in production

export default function PaymentScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { orderDetails } = route.params || {};

    // State
    const [coupons, setCoupons] = useState([]);
    const [loadingCoupons, setLoadingCoupons] = useState(true);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [finalAmount, setFinalAmount] = useState(orderDetails?.fares?.payableAmount || 0);
    const [couponModalVisible, setCouponModalVisible] = useState(false);
    const [addressModalVisible, setAddressModalVisible] = useState(false);
    const [searchingModalVisible, setSearchingModalVisible] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);
    const [rideId, setRideId] = useState(null);

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Polling ref
    const pollingInterval = useRef(null);

    // === Effects ===

    // Fetch coupons
    useEffect(() => {
        fetchCoupons();
    }, []);

    // Update final amount
    useEffect(() => {
        if (selectedCoupon && orderDetails?.fares) {
            const discount = Math.min(selectedCoupon.discount, orderDetails.fares.payableAmount);
            setFinalAmount(orderDetails.fares.payableAmount - discount);
        } else {
            setFinalAmount(orderDetails?.fares?.payableAmount || 0);
        }
    }, [selectedCoupon, orderDetails]);

    // Searching animation
    useEffect(() => {
        if (searchingModalVisible) {
            // Pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            ).start();

            // Rotate
            Animated.loop(
                Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
            ).start();

            // Fade in
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

            // Progress (25s)
            let progress = 0;
            const interval = setInterval(() => {
                progress += 4;
                setSearchProgress(Math.min(progress, 100));
            }, 1000);

            return () => clearInterval(interval);
        } else {
            pulseAnim.setValue(1);
            rotateAnim.setValue(0);
            fadeAnim.setValue(0);
            setSearchProgress(0);
        }
    }, [searchingModalVisible]);

    // Poll ride status
    const pollRideStatus = useCallback(async (currentRideId) => {
        try {
            const { data } = await axios.get(`${API_BASE_URL}/rider-light/${currentRideId}`, { timeout: 8000 });
            const { ride_status, rideId: updatedRideId } = data.data || {};

            if (ride_status === "driver_assigned") {
                clearInterval(pollingInterval.current);
                setSearchProgress(100);
                setTimeout(() => {
                    setSearchingModalVisible(false);
                    navigation.reset({
                        index: 0,
                        routes: [{
                            name: "RideStarted",
                            params: {
                                driver: data.data,
                                origin: orderDetails.pickup?.address,
                                destination: orderDetails.dropoff?.address,
                                selectedRide: orderDetails.vehicle_info,
                                dropoff: orderDetails.dropoff?.address,
                                pickup: orderDetails.pickup?.address,
                                rideId: updatedRideId,
                                rideOtp: data.data.rideOtp || "1234",
                            },
                        }],
                    });
                }, 800);
            }
        } catch (err) {
            console.warn("Poll failed:", err.message);
        }
    }, [navigation, orderDetails]);

    useEffect(() => {
        if (rideId && searchingModalVisible) {
            pollingInterval.current = setInterval(() => pollRideStatus(rideId), 3000);
        }
        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, [rideId, searchingModalVisible, pollRideStatus]);

    // === API Calls ===

    const fetchCoupons = async () => {
        setLoadingCoupons(true);
        try {
            const { data } = await axios.get(`${API_BASE_URL}/api/v1/parcel/parcel-coupon`);
            if (data.success) setCoupons(data.data);
        } catch (err) {
            Alert.alert("Error", "Failed to load coupons.");
        } finally {
            setLoadingCoupons(false);
        }
    };

    const handleSubmitBooking = async () => {
        Alert.alert(
            "Confirm Booking",
            "Proceed with parcel delivery?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            const token = await tokenCache.getToken("auth_token_db");
                            const user = await find_me();

                            if (!user?.user) {
                                Alert.alert("Error", "User not found.");
                                return;
                            }

                            const rideData = {
                                vehicleType: orderDetails?.vehicle_id,
                                pickupLocation: {
                                    latitude: orderDetails?.pickup?.coordinates?.lat,
                                    longitude: orderDetails?.pickup?.coordinates?.lng,
                                },
                                dropLocation: {
                                    latitude: orderDetails?.dropoff?.coordinates?.lat,
                                    longitude: orderDetails?.dropoff?.coordinates?.lng,
                                },
                                currentLocation: {
                                    latitude: orderDetails?.pickup?.coordinates?.lat,
                                    longitude: orderDetails?.pickup?.coordinates?.lng,
                                },
                                pick_desc: orderDetails?.pickup?.address,
                                drop_desc: orderDetails?.dropoff?.address,
                                baseFare: orderDetails?.fares?.baseFare || 50,
                                couponApplied: !!selectedCoupon,
                                discount: selectedCoupon ? orderDetails.fares.payableAmount - finalAmount : 0,
                                payableAmount: finalAmount,
                                fare: orderDetails?.fares,
                                customerId: orderDetails?.customerId,
                                receiverDetails: {
                                    name: orderDetails?.receiver?.name,
                                    phone: orderDetails?.receiver?.phone,
                                    apartment: orderDetails?.receiver?.apartment,
                                    savedAs: orderDetails?.receiver?.savedAs,
                                },
                                paymentMethod: 'cash',
                                platform: Platform.OS,
                                isPooling: false,
                                isParcel: true,
                                distance: orderDetails?.distance,
                                vehicleInfo: orderDetails?.vehicle_info,
                                timestamp: orderDetails?.timestamp,
                            };

                            const response = await axios.post(BOOKING_API, rideData, {
                                headers: { Authorization: `Bearer ${token}` },
                                timeout: 15000,
                            });

                            const createdRideId = response?.data?.data?.rideId;
                            if (createdRideId) {
                                setRideId(createdRideId);
                                setSearchingModalVisible(true);
                            } else {
                                throw new Error("No rideId");
                            }
                        } catch (err) {
                            console.error("Booking error:", err);
                            Alert.alert("Error", "Failed to book. Try again.");
                        }
                    },
                },
            ]
        );
    };



    const handleCancelBooking = useCallback(() => {
        Alert.alert(
            "Cancel Booking?",
            "Are you sure you want to cancel this ride?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes",
                    style: "destructive",
                    onPress: async () => {
                        try {

                            if (rideId) {
                                const token = await tokenCache.getToken("auth_token_db");
                                if (token) {
                                    await axios.post(
                                        `${API_BASE_URL}/api/v1/new/cancel-before/${rideId}`,
                                        {},
                                        {
                                            headers: { Authorization: `Bearer ${token}` },
                                            timeout: 10000,
                                        }
                                    );
                                }
                            }
                            setRideId(null);

                            setSearchProgress(0);
                            setSearchingModalVisible(false);
                        } catch (error) {

                        }
                    },
                },
            ]
        );
    }, [rideId]);




    // === Helpers ===

    const getDaysLeft = (date) => {
        const diff = new Date(date) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const activeCoupons = useMemo(() => {
        return coupons.filter(c => c.isActive && new Date(c.expirationDate) > new Date());
    }, [coupons]);

    const applyCoupon = (coupon) => {
        setSelectedCoupon(coupon);
        setCouponModalVisible(false);
        Alert.alert("Success", `${coupon.code} applied! Saved ₹${coupon.discount}`);
    };

    const removeCoupon = () => {
        setSelectedCoupon(null);
        Alert.alert("Removed", "Coupon removed.");
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // === Render Components ===

    const renderSearchingModal = () => (
        <Modal transparent visible={searchingModalVisible} animationType="fade">
            <View style={styles.searchingOverlay}>
                <Animated.View style={[styles.searchingBox, { opacity: fadeAnim }]}>
                    <LinearGradient colors={['#000', '#111']} style={styles.searchingGradient}>
                        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }, { rotate: spin }] }]}>
                            <View style={styles.innerCircle} />
                        </Animated.View>

                        <View style={styles.iconContainer}>
                            <Ionicons name="bicycle" size={60} color="#fff" />
                        </View>

                        <Text style={styles.searchTitle}>Finding Rider</Text>
                        <Text style={styles.searchSubtitle}>Connecting you with a nearby delivery partner</Text>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressFill, { width: `${searchProgress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(searchProgress)}%</Text>

                        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />

                        <TouchableOpacity
                            onPress={() => handleCancelBooking()}
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: 10,
                                paddingVertical: 12,
                                paddingHorizontal: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 3,
                                elevation: 3, // for Android shadow
                                marginVertical: 10,
                            }}
                        >
                            <Text style={{ color: '#000000', fontSize: 16, fontWeight: '600' }}>
                                Cancel Request
                            </Text>
                        </TouchableOpacity>

                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );

    const renderPickupDropDetails = () => (
        <View style={styles.locationContainer}>
            <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.locationGradient}>
                <View style={styles.locationHeader}>
                    <Image
                        source={{ uri: orderDetails?.vehicle_info?.image?.url || 'https://res.cloudinary.com/daxbcusb5/image/upload/v1745132956/parcel_vehicles/vehicles/pphtlimv6seosz86micr.jpg' }}
                        style={styles.vehicleImage}
                    />
                    <View style={styles.locationHeaderText}>
                        <Text style={styles.vehicleTitle}>{orderDetails?.vehicle_info?.title || "Compact 3W"}</Text>
                        <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
                            <View style={styles.viewAddressButton}>
                                <Text style={styles.viewAddressText}>View Details</Text>
                                <Ionicons name="chevron-forward" size={16} color="#000" />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.etaContainer}>
                        <View style={styles.etaBadge}>
                            <Text style={styles.etaValue}>3</Text>
                            <Text style={styles.etaLabel}>mins</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.loadingTimeContainer}>
                    <View style={styles.loadingTimeBadge}>
                        <Ionicons name="time-outline" size={20} color="#666" />
                        <Text style={styles.loadingTimeText}>Free 25 mins loading time included</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );

    const renderCouponButton = () => (
        <TouchableOpacity style={styles.couponButton} onPress={() => setCouponModalVisible(true)}>
            <View style={styles.couponGradient}>
                <View style={styles.couponButtonContent}>
                    <View style={styles.couponButtonLeft}>
                        <View style={styles.couponIconContainer}>
                            <Ionicons name="pricetag" size={22} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.couponButtonTitle}>
                                {selectedCoupon ? 'Coupon Applied!' : 'Apply Coupon'}
                            </Text>
                            <Text style={styles.couponButtonSubtitle}>
                                {selectedCoupon ? `${selectedCoupon.code} - Save ₹${selectedCoupon.discount}` : 'Save more on your ride'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.couponButtonRight}>
                        {selectedCoupon ? (
                            <TouchableOpacity style={styles.removeCouponButton} onPress={removeCoupon}>
                                <Ionicons name="close-circle" size={24} color="#000" />
                            </TouchableOpacity>
                        ) : (
                            <Ionicons name="chevron-forward" size={24} color="#000" />
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderCouponModal = () => (
        <Modal animationType="slide" transparent visible={couponModalVisible} onRequestClose={() => setCouponModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.modalGradient}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Available Coupons</Text>
                                <Text style={styles.modalSubtitle}>Choose the best offer</Text>
                            </View>
                            <TouchableOpacity onPress={() => setCouponModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close-circle" size={32} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {loadingCoupons ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#000" />
                                <Text style={styles.loadingText}>Loading offers...</Text>
                            </View>
                        ) : activeCoupons.length === 0 ? (
                            <View style={styles.noCouponsContainer}>
                                <Ionicons name="sad-outline" size={48} color="#999" />
                                <Text style={styles.noCouponsText}>No coupons available</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.couponsList}>
                                {activeCoupons.map(coupon => (
                                    <TouchableOpacity key={coupon._id} style={styles.couponCard} onPress={() => applyCoupon(coupon)}>
                                        <View style={[styles.couponCardGradient, selectedCoupon?._id === coupon._id && styles.selectedCouponCard]}>
                                            <View style={styles.couponCardHeader}>
                                                <View style={styles.discountBadge}>
                                                    <Text style={styles.discountAmount}>₹{coupon.discount}</Text>
                                                    <Text style={styles.discountLabel}>OFF</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.couponCode}>{coupon.code}</Text>
                                            <View style={styles.couponFooter}>
                                                <View style={styles.expiryContainer}>
                                                    <Ionicons name="time-outline" size={14} color="#666" />
                                                    <Text style={styles.expiryText}>Expires in {getDaysLeft(coupon.expirationDate)} days</Text>
                                                </View>
                                                <TouchableOpacity style={[styles.applyButton, selectedCoupon?._id === coupon._id && styles.appliedButton]} onPress={() => applyCoupon(coupon)}>
                                                    <Text style={styles.applyButtonText}>{selectedCoupon?._id === coupon._id ? 'APPLIED' : 'APPLY'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );

    const renderAddressModal = () => (
        <Modal animationType="slide" transparent visible={addressModalVisible} onRequestClose={() => setAddressModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Trip Details</Text>
                        <TouchableOpacity onPress={() => setAddressModalVisible(false)} style={styles.closeButton}>
                            <Ionicons name="close-circle" size={32} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.addressContent}>
                        <View style={styles.addressCard}>
                            <View style={styles.addressIconContainer}><Ionicons name="location" size={24} color="#000" /></View>
                            <View style={styles.addressDetails}>
                                <Text style={styles.addressLabel}>Pickup</Text>
                                <Text style={styles.addressText}>{orderDetails?.pickup?.address || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={styles.routeLine} />
                        <View style={styles.addressCard}>
                            <View style={styles.addressIconContainer}><Ionicons name="flag" size={24} color="#000" /></View>
                            <View style={styles.addressDetails}>
                                <Text style={styles.addressLabel}>Dropoff</Text>
                                <Text style={styles.addressText}>{orderDetails?.dropoff?.address || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={styles.receiverCard}>
                            <Text style={styles.receiverTitle}>Receiver</Text>
                            <View style={styles.receiverInfo}><Ionicons name="person-circle" size={24} color="#666" /><Text style={styles.receiverName}>{orderDetails?.receiver?.name}</Text></View>
                            <View style={styles.receiverInfo}><Ionicons name="call" size={24} color="#666" /><Text style={styles.receiverPhone}>{orderDetails?.receiver?.phone}</Text></View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderFareSummary = () => (
        <View style={styles.fareSummaryContainer}>
            <Text style={styles.sectionTitle}>Fare Breakdown</Text>
            <View style={styles.fareCard}>
                <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.fareGradient}>
                    <View style={styles.fareRow}>
                        <View style={styles.fareRowLeft}><Ionicons name="cash-outline" size={18} color="#666" /><Text style={styles.fareLabel}>Base Fare</Text></View>
                        <Text style={styles.fareValue}>₹{orderDetails?.fares?.payableAmount || 0}</Text>
                    </View>
                    {selectedCoupon && (
                        <View style={styles.fareRow}>
                            <View style={styles.fareRowLeft}><Ionicons name="pricetag" size={18} color="#4CAF50" /><Text style={styles.discountLabel}>Discount ({selectedCoupon.code})</Text></View>
                            <Text style={styles.discountValue}>-₹{selectedCoupon.discount}</Text>
                        </View>
                    )}
                    <View style={styles.separator} />
                    <View style={styles.totalRow}>
                        <View style={styles.fareRowLeft}><Ionicons name="wallet" size={20} color="#000" /><Text style={styles.totalLabel}>Total</Text></View>
                        <Text style={styles.totalValue}>₹{Math.round(finalAmount)}</Text>
                    </View>
                </LinearGradient>
            </View>
        </View>
    );

    const renderPaymentMethod = () => (
        <View style={styles.paymentMethodContainer}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity style={styles.paymentCard}>
                <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.paymentGradient}>
                    <View style={styles.paymentOption}>
                        <View style={styles.paymentOptionLeft}>
                            <View style={styles.paymentIconContainer}><Ionicons name="cash" size={28} color="#4CAF50" /></View>
                            <View>
                                <Text style={styles.paymentOptionText}>Cash Payment</Text>
                                <Text style={styles.paymentOptionSubtext}>Pay after delivery</Text>
                            </View>
                        </View>
                        <View style={styles.radioButtonSelected}><View style={styles.radioButtonInner} /></View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    const renderBookingNotes = () => (
        <View style={styles.notesContainer}>
            <View style={styles.notesTitleContainer}>
                <Ionicons name="information-circle" size={24} color="#000" />
                <Text style={styles.sectionTitle}>Important Information</Text>
            </View>
            <View style={styles.notesCard}>
                <View style={styles.notesGradient}>
                    {['Fare includes 25 mins free loading/unloading time', '₹2.0/min for additional time', 'Fare may vary as per market conditions', 'Fare may change if route changes'].map((note, i) => (
                        <View key={i} style={styles.noteItem}>
                            <View style={styles.noteBullet}><Ionicons name="checkmark-circle" size={18} color="#000" /></View>
                            <Text style={styles.noteText}>{note}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                {renderPickupDropDetails()}
                <View style={styles.offersContainer}>
                    <Text style={styles.sectionTitle}>Offers & Discounts</Text>
                    {renderCouponButton()}
                </View>
                {renderFareSummary()}
                {renderPaymentMethod()}
                {renderBookingNotes()}
                <View style={styles.spacer} />
            </ScrollView>

            {renderCouponModal()}
            {renderAddressModal()}
            {renderSearchingModal()}

            <View style={styles.footer}>
                <View style={styles.footerGradient}>
                    <View style={styles.footerTop}>
                        <Text style={styles.footerLabel}>Total Amount</Text>
                        <Text style={styles.footerAmount}>₹{Math.round(finalAmount)}</Text>
                    </View>
                    <TouchableOpacity onPress={handleSubmitBooking} style={styles.proceedButton}>
                        <View style={styles.gradientButton}>
                            <Text style={styles.proceedButtonText}>Confirm Booking</Text>
                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// === Styles ===
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollView: { flex: 1 },
    spacer: { height: 120 },

    // Location
    locationContainer: { margin: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    locationGradient: { padding: 20 },
    locationHeader: { flexDirection: 'row', alignItems: 'center' },
    vehicleImage: { width: 70, height: 70, borderRadius: 16, borderWidth: 2, borderColor: '#000' },
    locationHeaderText: { flex: 1, marginLeft: 16 },
    vehicleTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 6 },
    viewAddressButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    viewAddressText: { fontSize: 13, color: '#000', fontWeight: '600', marginRight: 4 },
    etaContainer: { alignItems: 'center' },
    etaBadge: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#000', alignItems: 'center' },
    etaValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
    etaLabel: { fontSize: 12, fontWeight: '600', color: '#fff' },
    loadingTimeContainer: { marginTop: 16 },
    loadingTimeBadge: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#F5F5F5' },
    loadingTimeText: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#666', flex: 1 },

    // Offers
    offersContainer: { margin: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 12 },
    couponButton: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    couponGradient: { padding: 18, backgroundColor: '#fff' },
    couponButtonContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    couponButtonLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    couponIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    couponButtonTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 2 },
    couponButtonSubtitle: { fontSize: 13, fontWeight: '500', color: '#666' },
    couponButtonRight: { marginLeft: 12 },
    removeCouponButton: { padding: 4 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', overflow: 'hidden' },
    modalGradient: { paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#000' },
    modalSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
    closeButton: { padding: 4 },

    // Coupon Modal
    loadingContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    loadingText: { marginTop: 16, fontSize: 16, color: '#666', fontWeight: '500' },
    noCouponsContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    noCouponsText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#666' },
    couponsList: { padding: 16, maxHeight: 500 },
    couponCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    couponCardGradient: { padding: 18, borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 16, backgroundColor: '#fff' },
    selectedCouponCard: { borderColor: '#000', borderWidth: 3 },
    couponCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    discountBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#000', alignItems: 'center' },
    discountAmount: { fontSize: 22, fontWeight: '800', color: '#fff' },
    discountLabel: { fontSize: 12, fontWeight: '700', color: '#fff' },
    couponCode: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 12, letterSpacing: 1 },
    couponFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expiryContainer: { flexDirection: 'row', alignItems: 'center' },
    expiryText: { fontSize: 13, fontWeight: '500', color: '#666', marginLeft: 6 },
    applyButton: { paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#000', borderRadius: 10 },
    appliedButton: { backgroundColor: '#000' },
    applyButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Address Modal
    addressContent: { padding: 20, maxHeight: 500 },
    addressCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16 },
    addressIconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    addressDetails: { flex: 1 },
    addressLabel: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 6 },
    addressText: { fontSize: 14, fontWeight: '500', color: '#666', lineHeight: 20 },
    routeLine: { width: 2, height: 24, backgroundColor: '#E0E0E0', marginLeft: 40, marginBottom: 16 },
    receiverCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginTop: 8 },
    receiverTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 16 },
    receiverInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    receiverName: { fontSize: 15, fontWeight: '600', color: '#333', marginLeft: 12 },
    receiverPhone: { fontSize: 15, fontWeight: '500', color: '#333', marginLeft: 12 },

    // Fare
    fareSummaryContainer: { margin: 16, marginTop: 0 },
    fareCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    fareGradient: { padding: 20 },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    fareRowLeft: { flexDirection: 'row', alignItems: 'center' },
    fareLabel: { fontSize: 15, fontWeight: '500', color: '#666', marginLeft: 10 },
    fareValue: { fontSize: 16, fontWeight: '700', color: '#000' },
    discountValue: { fontSize: 16, fontWeight: '700', color: '#000' },
    discountLabel: { fontSize: 15, fontWeight: '500', color: '#4CAF50', marginLeft: 10 },
    separator: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 16, borderRadius: 12, marginTop: 8 },
    totalLabel: { fontSize: 17, fontWeight: '700', color: '#000', marginLeft: 10 },
    totalValue: { fontSize: 24, fontWeight: '800', color: '#000' },

    // Payment
    paymentMethodContainer: { margin: 16, marginTop: 0 },
    paymentCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    paymentGradient: { padding: 20 },
    paymentOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    paymentOptionLeft: { flexDirection: 'row', alignItems: 'center' },
    paymentIconContainer: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    paymentOptionText: { fontSize: 17, fontWeight: '700', color: '#000' },
    paymentOptionSubtext: { fontSize: 13, fontWeight: '500', color: '#666', marginTop: 2 },
    radioButtonSelected: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
    radioButtonInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#000' },

    // Notes
    notesContainer: { margin: 16, marginTop: 0 },
    notesTitleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    notesCard: { borderRadius: 20, overflow: 'hidden' },
    notesGradient: { padding: 20 },
    noteItem: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
    noteBullet: { marginRight: 10, marginTop: 2 },
    noteText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#333', lineHeight: 20 },

    // Footer
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
    footerGradient: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
    footerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    footerLabel: { fontSize: 16, fontWeight: '600', color: '#666' },
    footerAmount: { fontSize: 28, fontWeight: '800', color: '#000' },
    proceedButton: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    gradientButton: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: '#000' },
    proceedButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', marginRight: 8 },

    // Searching Modal
    searchingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    searchingBox: { width: width * 0.85, borderRadius: 24, overflow: 'hidden', elevation: 10 },
    searchingGradient: { padding: 40, alignItems: 'center' },
    pulseCircle: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.1)' },
    innerCircle: { width: '100%', height: '100%', borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.15)' },
    iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    searchTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
    searchSubtitle: { fontSize: 15, color: '#ccc', textAlign: 'center', marginBottom: 30 },
    progressContainer: { width: '100%', height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
    progressText: { color: '#fff', fontWeight: '700', marginBottom: 10 },
});