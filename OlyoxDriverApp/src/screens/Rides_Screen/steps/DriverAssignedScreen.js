import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Linking, Platform, Dimensions,
    ScrollView
} from "react-native";
import Maps from "../Components/Map";
import useCurrentRideStore from "../../../../Store/currentRideStore";
import useRideStore from "../../../../Store/PoolingStore";
import { Ionicons } from "@expo/vector-icons";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import useSettings from "../../../hooks/settings.hook";
import { getRideLabel } from "../../../../utility/RideLabel";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive sizing helper
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function DriverAssignedScreen({ openChat, rideDetails }) {
    const [loading, setLoading] = useState(false);
    const [index, setIndex] = useState(0);
    const intervalRef = useRef(null);
    const { fetchOnlyLocationAndStatus, markReached } = useCurrentRideStore();
    const { stopPooling } = useRideStore();
    const { settings, fetch } = useSettings()
    // Memoize routes to prevent recreation
    const routes = useMemo(() => [
        { key: 'trip', title: 'Trip Info' },
        { key: 'passenger', title: 'Passenger' },
        { key: 'locations', title: 'Locations' },
    ], []);

    useEffect(() => {
        stopPooling();
        intervalRef.current = setInterval(async () => {
            try {

                await fetchOnlyLocationAndStatus(rideDetails._id);
            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [rideDetails._id, fetchOnlyLocationAndStatus, stopPooling]);

    const openGoogleMaps = useCallback((type) => {
        const pickup = rideDetails?.pickupLocation;
        const drop = rideDetails?.dropLocation;

        let target;
        let label;

        if (type === 'pickup') {
            target = pickup;
            label = 'Pickup Location';
        } else {
            target = drop;
            label = 'Drop Location';
        }

        if (!target || target.length < 2) {
            alert(`${label} not available`);
            return;
        }

        const lat = target[1];
        const lng = target[0];
        const encodedLabel = encodeURIComponent(label);

        const scheme = Platform.select({
            ios: 'maps:0,0?q=',
            android: 'geo:0,0?q='
        });

        const latLng = `${lat},${lng}`;
        const url = Platform.select({
            ios: `${scheme}${encodedLabel}@${latLng}`,
            android: `${scheme}${latLng}(${encodedLabel})`
        });

        Linking.openURL(url).catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        });
    }, [rideDetails?.pickupLocation, rideDetails?.dropLocation]);
    const formatPickupTime = useCallback(() => {
        if (!rideDetails) return "N/A";

        // Determine the pickup time
        const pickupTime = rideDetails.isLater
            ? rideDetails.IntercityPickupTime || "Scheduled"
            : rideDetails.user?.name || "Passenger";

        // If IntercityPickupTime is missing and PICKUP_time fallback is not useful, return N/A
        if (!rideDetails.IntercityPickupTime && !pickupTime) return "N/A";

        // Format the time if it's a valid date string
        const date = new Date(rideDetails.IntercityPickupTime || pickupTime);
        if (isNaN(date.getTime())) return pickupTime; // fallback to text like 'Passenger' or 'Scheduled'

        return date.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "short",
            timeStyle: "short",
        });
    }, [rideDetails]);


    const getTimeToPickup = useCallback(() => {
        if (!rideDetails) return null;

        // Determine the pickup time
        const pickupTimeValue = rideDetails.isLater || rideDetails.isIntercity
            ? rideDetails.IntercityPickupTime
            : PICKUP_time;

        if (!pickupTimeValue) return null;

        const pickupTime = new Date(pickupTimeValue);
        const now = new Date();
        const diffMs = pickupTime - now;

        if (diffMs < 0) return "Pickup time passed";

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }, [rideDetails?.isLater, rideDetails?.isIntercity, rideDetails?.IntercityPickupTime, PICKUP_time]);

    const makePhoneCall = useCallback(() => {
        const phoneNumber = settings?.support_number_driver || '01141236767';
        if (phoneNumber) {
            Linking.openURL(`tel:${phoneNumber}`);
        } else {
            alert('Phone number not available');
        }
    }, [rideDetails?.user?.number]);

    const handleMarkReached = useCallback(async () => {
        try {
            setLoading(true);
            await markReached(rideDetails.user._id, rideDetails._id);
            setLoading(false);
        } catch (err) {
            console.error("Mark reached error:", err);
            setLoading(false);
            alert(err.message || 'Failed to mark arrival');
        }
    }, [markReached, rideDetails?.user?._id, rideDetails?._id]);

    // Memoize formatted values

    const etaMinutes = useMemo(() =>
        rideDetails?.etaMinutes != null ? Math.round(rideDetails.etaMinutes) : '--',
        [rideDetails?.etaMinutes]
    );

    const distanceToPickup = useMemo(() => {
        const rawDistance = rideDetails?.distanceToPickupFormatted;

        if (!rawDistance && rawDistance !== 0) return { value: "-", unit: "" };

        // ✅ If already contains "km" or "m", just return as-is
        if (typeof rawDistance === "string" && /km|m/i.test(rawDistance)) {
            return { value: rawDistance, unit: "" };
        }

        const distanceKm = Number(rawDistance);
        if (isNaN(distanceKm)) return { value: "-", unit: "" };

        // ✅ If distance ≥ 0.95 km, show truncated km
        if (distanceKm >= 0.95) {
            const truncated = Math.floor(distanceKm * 100) / 100;
            return { value: `${truncated.toFixed(2)} km`, unit: "" };
        }

        // ✅ Otherwise, show meters
        return { value: `${Math.round(distanceKm * 1000)} m`, unit: "" };
    }, [rideDetails?.distanceToPickupFormatted]);


    const totalFare = useMemo(() =>
        rideDetails?.totalFare || '--',
        [rideDetails?.totalFare]
    );
    const toll = useMemo(() =>
        rideDetails?.toll || '--',
        [rideDetails?.toll]
    );
    const walletFare = useMemo(() => rideDetails?.discount || '', [rideDetails?.discount])

    const tripDistance = useMemo(() =>
        rideDetails?.routeInfo?.distance ? `${rideDetails.routeInfo.distance.toFixed(1)} km` : '--',
        [rideDetails?.routeInfo?.distance]
    );

    const tripDuration = useMemo(() =>
        rideDetails?.routeInfo?.duration ? `${Math.round(rideDetails.routeInfo.duration)} min` : '--',
        [rideDetails?.routeInfo?.duration]
    );

    const rideType = useMemo(() => getRideLabel(rideDetails), [rideDetails]) || useMemo(() =>
        rideDetails?.rideType || 'Regular',
        [rideDetails?.rideType]
    );


    const PICKUP_time = useMemo(() => {
        if (!rideDetails) return 'Passenger';

        if (rideDetails.isLater) {
            // If it's a later ride, show IntercityPickupTime if available
            return rideDetails.IntercityPickupTime || 'Scheduled';
        }

        return rideDetails.user?.name || 'Passenger';
    }, [rideDetails?.isLater, rideDetails?.IntercityPickupTime, rideDetails?.user?.name]);

    // console.log("⏱️ Pickup Time:", PICKUP_time);

    const passengerName = useMemo(() =>
        rideDetails?.user?.name || 'Passenger',
        [rideDetails?.user?.name]
    );

    const passengerPhone = useMemo(() =>
        rideDetails?.user?.number || 'N/A',
        [rideDetails?.user?.number]
    );

    const passengerInitial = useMemo(() =>
        rideDetails?.user?.name?.charAt(0).toUpperCase() || 'P',
        [rideDetails?.user?.name]
    );

    const pickupAddress = useMemo(() =>
        rideDetails?.pickupAddress || 'Loading address...',
        [rideDetails?.pickupAddress]
    );

    const dropAddress = useMemo(() =>
        rideDetails?.dropAddress || 'Loading address...',
        [rideDetails?.dropAddress]
    );

    const rideId = useMemo(() =>
        rideDetails?._id?.slice(-6).toUpperCase() || '------',
        [rideDetails?._id]
    );

    // Memoize tab components to prevent re-renders
    const TripTab = useCallback(() => (
        <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
        >
            {/* Intercity Alert */}
            {rideDetails?.isIntercityRides || rideDetails?.isLater && (
                <View style={styles.intercityAlert}>
                    <View style={styles.intercityIconContainer}>
                        <Ionicons name="airplane" size={moderateScale(28)} color="#FF6B35" />
                    </View>
                    <View style={styles.intercityTextContainer}>
                        <Text style={styles.intercityTitle}>🌆 {getRideLabel(rideDetails)} </Text>
                        <View style={styles.intercityInfoRow}>
                            <Ionicons name="time-outline" size={moderateScale(16)} color="#666" />
                            <Text style={styles.intercityText}>
                                Pickup: {formatPickupTime()}
                            </Text>
                        </View>
                        <View style={styles.intercityInfoRow}>
                            <Ionicons name="timer-outline" size={moderateScale(16)} color="#666" />
                            <Text style={styles.intercityText}>
                                In: {getTimeToPickup() || "N/A"}
                            </Text>
                        </View>
                        <View style={styles.intercityNote}>
                            <Ionicons name="information-circle-outline" size={moderateScale(16)} color="#FF6B35" />
                            <Text style={styles.intercityNoteText}>
                                टोल और पार्किंग शुल्क किराए में शामिल नहीं हैं। कृपया इन्हें सीधे ग्राहक से प्राप्त करें।
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* ETA Card */}
            <View style={styles.etaCard}>
                <Text style={styles.sectionTitle}>📍 Estimated Time to Pickup</Text>
                <View style={styles.etaContent}>
                    <View style={styles.etaItem}>
                        <View style={styles.etaIconCircle}>
                            <Ionicons name="time" size={moderateScale(24)} color="#4CAF50" />
                        </View>
                        <Text style={styles.etaValue}>{etaMinutes}</Text>
                        <Text style={styles.etaUnit}>minutes</Text>
                    </View>
                    <View style={styles.etaDivider} />
                    <View style={styles.etaItem}>
                        <View style={styles.etaIconCircle}>
                            <Ionicons name="navigate" size={moderateScale(24)} color="#2196F3" />
                        </View>
                        <Text style={styles.etaValue}>{distanceToPickup.value}</Text>
                        <Text style={styles.etaUnit}>{distanceToPickup.unit}</Text>
                    </View>
                </View>
            </View>

            {/* Trip Details Grid */}
            <View style={styles.tripGrid}>
                <View style={styles.tripCard}>
                    <View style={styles.tripCardHeader}>
                        <View style={styles.tripIconContainer}>
                            <Text style={styles.tripIcon}>💰</Text>
                        </View>
                        <Text style={styles.tripCardTitle}>Total Fare</Text>
                    </View>

                    {Number(toll) > 0 ? (
                        <>
                            {/* Fare excluding toll */}
                            <Text style={styles.tripCardValue}>
                                ₹{Number(totalFare - toll).toFixed(1)}
                            </Text>

                            {/* Toll breakdown */}
                            <Text style={styles.tollText}>+ Toll ₹{Number(toll).toFixed(1)}</Text>

                            {/* Final total */}
                            <Text style={styles.totalText}>
                                = ₹{Number(totalFare).toFixed(1)}
                                {Number(walletFare) > 0 && (
                                    <Text style={styles.walletText}>
                                        {"  + ₹" + Number(walletFare).toFixed(1) + " on wallet"}
                                    </Text>
                                )}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.tripCardValue}>
                            ₹{Number(totalFare ?? 0).toFixed(1)}
                            {Number(walletFare) > 0 && (
                                <Text style={styles.walletText}>
                                    {"  + ₹" + Number(walletFare).toFixed(1) + " on wallet"}
                                </Text>
                            )}
                        </Text>
                    )}
                </View>


                <View style={styles.tripCard}>
                    <View style={styles.tripCardHeader}>
                        <View style={styles.tripIconContainer}>
                            <Text style={styles.tripIcon}>📏</Text>
                        </View>
                        <Text style={styles.tripCardTitle}>Distance</Text>
                    </View>
                    <Text style={styles.tripCardValue}>
                        {rideDetails?.rental_km_limit ?? tripDistance
                            ? `Your Total Distance Traveling: ${rideDetails?.rental_km_limit ?? tripDistance} km`
                            : tripDistance}



                    </Text>

                </View>

                <View style={styles.tripCard}>
                    <View style={styles.tripCardHeader}>
                        <View style={styles.tripIconContainer}>
                            <Text style={styles.tripIcon}>⏱️</Text>
                        </View>
                        <Text style={styles.tripCardTitle}>Duration</Text>
                    </View>
                    <Text style={styles.tripCardValue}>
                        {rideDetails?.rentalHours
                            ? `${rideDetails.rentalHours} hr${rideDetails.rentalHours > 1 ? 's' : ''}`
                            : tripDuration
                                ? tripDuration
                                : '0 min'}
                    </Text>

                </View>

                <View style={styles.tripCard}>
                    <View style={styles.tripCardHeader}>
                        <View style={styles.tripIconContainer}>
                            <Text style={styles.tripIcon}>🚗</Text>
                        </View>
                        <Text style={styles.tripCardTitle}>Ride Type</Text>
                    </View>
                    <Text style={styles.tripCardValueSmall}>{rideType}</Text>
                </View>
            </View>
        </ScrollView>
    ), [rideDetails?.isIntercityRides, formatPickupTime, getTimeToPickup, etaMinutes, distanceToPickup, totalFare, tripDistance, tripDuration, rideType]);

    const PassengerTab = useCallback(() => {
        const receiver = rideDetails?.details?.reciver_details;
        const pickupPhoto = rideDetails?.details?.pickup_photo;
        const deliveryPhoto = rideDetails?.details?.delivery_photo;

        return (
            <ScrollView
                style={styles.tabContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
            >
                {rideDetails?.isParcelOrder ? (
                    <>
                        {/* ──────────────── Sender (Booked By) Section ──────────────── */}
                        <View style={styles.passengerCard}>
                            <Text style={styles.sectionTitle}>Sender (Booked By)</Text>

                            <View style={styles.passengerHeader}>
                                <View style={styles.passengerAvatar}>
                                    <Text style={styles.passengerInitial}>{passengerInitial}</Text>
                                </View>
                                <View style={styles.passengerInfo}>
                                    <Text style={styles.passengerName}>{passengerName}</Text>
                                    {passengerPhone ? (
                                        <Text style={styles.passengerPhone}>{passengerPhone}</Text>
                                    ) : null}
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={makePhoneCall}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="call" size={moderateScale(20)} color="#fff" />
                                <Text style={styles.callButtonText}>Call Sender</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={openChat}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="megaphone-sharp" size={moderateScale(20)} color="#fff" />
                                <Text style={styles.callButtonText}>Chat with Sender</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ──────────────── Receiver Section ──────────────── */}
                        <View style={styles.passengerCard}>
                            <Text style={styles.sectionTitle}>Receiver Details</Text>

                            <View style={styles.passengerHeader}>
                                <View style={styles.passengerAvatar}>
                                    <Text style={styles.passengerInitial}>
                                        {receiver?.name?.charAt(0)?.toUpperCase() || "?"}
                                    </Text>
                                </View>

                                <View style={styles.passengerInfo}>
                                    <Text style={styles.passengerName}>{receiver?.name || "N/A"}</Text>
                                    <Text style={styles.passengerPhone}>{receiver?.contact_number || "N/A"}</Text>
                                    {receiver?.appartment ? (
                                        <Text style={styles.passengerAddress}>
                                            Receiver Address: {receiver.appartment}
                                        </Text>
                                    ) : null}

                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={() => makePhoneCall(receiver?.contact_number)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="call" size={moderateScale(20)} color="#fff" />
                                <Text style={styles.callButtonText}>Call Receiver</Text>
                            </TouchableOpacity>

                            {/* ──────────────── Photos Section ──────────────── */}

                        </View>
                    </>
                ) : (
                    // ──────────────── Normal Passenger Section ────────────────
                    <View style={styles.passengerCard}>
                        <View style={styles.passengerHeader}>
                            <View style={styles.passengerAvatar}>
                                <Text style={styles.passengerInitial}>{passengerInitial}</Text>
                            </View>
                            <View style={styles.passengerInfo}>
                                <Text style={styles.passengerName}>{passengerName}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.callButton}
                            onPress={makePhoneCall}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="call" size={moderateScale(20)} color="#fff" />
                            <Text style={styles.callButtonText}>Call Passenger</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.callButton}
                            onPress={openChat}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="megaphone-sharp" size={moderateScale(20)} color="#fff" />
                            <Text style={styles.callButtonText}>Chat Passenger</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        );
    }, [
        rideDetails,
        passengerInitial,
        passengerName,
        passengerPhone,
        makePhoneCall,
        openChat,
    ]);


    const LocationsTab = useCallback(() => (
        <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
        >
            {/* Pickup Card */}
            <TouchableOpacity onPress={() => openGoogleMaps('pickup')} activeOpacity={0.8}>
                <View style={styles.locationCard}>
                    <View style={styles.locationHeader}>
                        <View style={styles.locationIconContainer}>
                            <Ionicons name="location" size={moderateScale(20)} color="#4CAF50" />
                        </View>
                        <Text style={styles.locationTitle}>Pickup Location</Text>
                        <TouchableOpacity
                            style={styles.openMapBadge}
                            onPress={() => openGoogleMaps('pickup')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="map" size={moderateScale(14)} color="#fff" />
                            <Text style={styles.openMapText}>Open in Maps</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.locationAddress}>{pickupAddress}</Text>
                </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.locationDividerContainer}>
                <View style={styles.locationDividerLine} />
                <Ionicons name="arrow-down" size={moderateScale(20)} color="#999" />
                <View style={styles.locationDividerLine} />
            </View>

            {/* Drop Card */}
            <TouchableOpacity onPress={() => openGoogleMaps('drop')} activeOpacity={0.8}>
                <View style={styles.locationCard}>
                    <View style={styles.locationHeader}>
                        <View style={styles.locationIconContainer}>
                            <Ionicons name="flag" size={moderateScale(20)} color="#F44336" />
                        </View>
                        <Text style={styles.locationTitle}>Drop Location</Text>
                        <TouchableOpacity
                            style={styles.openMapBadge}
                            onPress={() => openGoogleMaps('drop')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="map" size={moderateScale(14)} color="#fff" />
                            <Text style={styles.openMapText}>Open in Maps</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.locationAddress}>{dropAddress}</Text>
                </View>
            </TouchableOpacity>
        </ScrollView>
    ), [pickupAddress, dropAddress, openGoogleMaps]);

    // Memoize renderScene
    const renderScene = useMemo(() => SceneMap({
        trip: TripTab,
        passenger: PassengerTab,
        locations: LocationsTab,
    }), [TripTab, PassengerTab, LocationsTab]);

    // Memoize tab bar renderer
    const renderTabBar = useCallback((props) => (
        <TabBar
            {...props}
            indicatorStyle={styles.tabIndicator}
            style={styles.tabBar}
            labelStyle={styles.tabLabel}
            activeColor="#000"
            inactiveColor="#999"
            pressColor="rgba(0, 0, 0, 0.1)"
        />
    ), []);

    // Memoize index change handler
    const handleIndexChange = useCallback((newIndex) => {
        setIndex(newIndex);
    }, []);

    // Memoize initial layout
    const initialLayout = useMemo(() => ({
        width: SCREEN_WIDTH
    }), []);

    return (
        <View style={styles.container}>
            {/* Map Section */}
            <View style={styles.mapContainer}>
                <Maps
                    driverLocationDb={rideDetails?.driver?.location?.coordinates}
                    pickupLocation={rideDetails?.pickupLocation}
                    dropLocation={rideDetails?.dropLocation}
                    polygon={rideDetails?.routeInfo?.polyline}
                    status={rideDetails?.ride_status}
                    distance={rideDetails?.routeInfo?.distance}
                    duration={rideDetails?.routeInfo?.duration}
                />
                {/* Status Badge */}
                <View style={styles.statusOverlay}>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Heading to Pickup</Text>
                    </View>
                </View>
            </View>

            {/* Bottom Sheet Content */}
            <View style={styles.bottomSheet}>


                {/* Tabbed Interface */}
                <TabView
                    navigationState={{ index, routes }}
                    renderScene={renderScene}
                    onIndexChange={handleIndexChange}
                    initialLayout={initialLayout}
                    style={styles.tabView}
                    renderTabBar={renderTabBar}
                    lazy={true}
                    swipeEnabled={true}
                />

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.navigateButton}
                        onPress={() => openGoogleMaps('pickup')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="navigate" size={moderateScale(20)} color="#000" />
                        <Text style={styles.navigateText}>Navigate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.reachedButton}
                        onPress={handleMarkReached}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#fff" />
                        <Text style={styles.reachedText}>
                            {loading ? 'Marking...' : "I've Arrived"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    mapContainer: {
        height: SCREEN_HEIGHT * 0.35,
        position: 'relative',
    },
    statusOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(40),
        left: moderateScale(16),
        right: moderateScale(16),
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(12),
        borderRadius: moderateScale(25),
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    statusDot: {
        width: moderateScale(10),
        height: moderateScale(10),
        borderRadius: moderateScale(5),
        backgroundColor: '#4CAF50',
        marginRight: moderateScale(10),
    },
    statusText: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: moderateScale(24),
        borderTopRightRadius: moderateScale(24),
        marginTop: moderateScale(-20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    rideIdContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    rideIdLabel: {
        fontSize: moderateScale(12),
        color: '#999',
        marginRight: moderateScale(6),
    },
    rideIdValue: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        color: '#333',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    tabView: {
        flex: 1,
    },
    tabBar: {
        backgroundColor: '#fff',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    tabIndicator: {
        backgroundColor: '#000',
        height: moderateScale(3),
        borderRadius: moderateScale(1.5),
    },
    tabLabel: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        textTransform: 'none',
        letterSpacing: 0.2,
    },
    tabContent: {
        flex: 1,
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(16),
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: '#333',
        marginBottom: moderateScale(12),
    },
    intercityAlert: {
        flexDirection: 'row',
        backgroundColor: '#FFF8F0',
        borderRadius: moderateScale(16),
        padding: moderateScale(16),
        marginBottom: moderateScale(20),
        borderWidth: 1,
        borderColor: '#FFE0B2',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    intercityIconContainer: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        backgroundColor: '#FFE0B2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(12),
    },
    openMapBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#222",
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: moderateScale(12),
        marginLeft: "auto",
    },
    openMapText: {
        color: "#fff",
        fontSize: moderateScale(12),
        marginLeft: 4,
        fontWeight: "600",
    },

    intercityTextContainer: {
        flex: 1,
    },
    intercityTitle: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: '#FF6B35',
        marginBottom: moderateScale(10),
    },
    intercityInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(6),
    },
    intercityText: {
        fontSize: moderateScale(13),
        color: '#333',
        marginLeft: moderateScale(8),
        fontWeight: '500',
    },
    intercityNote: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        marginTop: moderateScale(10),
        alignItems: 'flex-start',
    },
    intercityNoteText: {
        flex: 1,
        fontSize: moderateScale(11),
        color: '#666',
        marginLeft: moderateScale(8),
        lineHeight: moderateScale(16),
    },
    etaCard: {
        backgroundColor: '#fff',
        borderRadius: moderateScale(16),
        padding: moderateScale(16),
        marginBottom: moderateScale(20),
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    etaContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    etaItem: {
        flex: 1,
        alignItems: 'center',
    },
    etaIconCircle: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateScale(8),
    },
    etaValue: {
        fontSize: moderateScale(24),
        fontWeight: '700',
        color: '#000',
        marginBottom: moderateScale(2),
    },
    etaUnit: {
        fontSize: moderateScale(12),
        color: '#999',
        fontWeight: '500',
    },
    etaDivider: {
        width: 1,
        height: moderateScale(60),
        backgroundColor: '#E0E0E0',
        marginHorizontal: moderateScale(16),
    },
    tripGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(6),
        marginBottom: moderateScale(20),
    },
    tripCard: {
        width: (SCREEN_WIDTH - moderateScale(44)) / 2,
        backgroundColor: '#fff',
        borderRadius: moderateScale(12),
        padding: moderateScale(14),
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tripCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(10),
    },
    tripIconContainer: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(8),
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(8),
    },
    tripIcon: {
        fontSize: moderateScale(14),
    },
    tripCardTitle: {
        fontSize: moderateScale(11),
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tripCardValue: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: '#000',
    },
    tripCardValueSmall: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: '#000',
    },
    passengerCard: {
        backgroundColor: '#fff',
        borderRadius: moderateScale(16),
        padding: moderateScale(20),
        marginBottom: moderateScale(20),
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    passengerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(16),
    },
    passengerAvatar: {
        width: moderateScale(64),
        height: moderateScale(64),
        borderRadius: moderateScale(32),
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(16),
    },
    passengerInitial: {
        fontSize: moderateScale(28),
        fontWeight: '700',
        color: '#fff',
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: '#000',
        marginBottom: moderateScale(6),
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    passengerPhone: {
        fontSize: moderateScale(14),
        color: '#666',
        marginLeft: moderateScale(6),
        fontWeight: '500',
    },
    callButton: {
        flexDirection: 'row',
        backgroundColor: '#000',
        marginBottom: moderateScale(12),
        paddingVertical: moderateScale(14),
        borderRadius: moderateScale(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    callButtonText: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: '#fff',
        marginLeft: moderateScale(8),
    },
    locationCard: {
        backgroundColor: '#fff',
        borderRadius: moderateScale(16),
        padding: moderateScale(16),
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(12),
    },
    locationIconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(12),
    },
    locationTitle: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        color: '#000',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    locationAddress: {
        fontSize: moderateScale(14),
        color: '#333',
        lineHeight: moderateScale(20),
        fontWeight: '500',
    },
    locationDividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: moderateScale(16),
    },
    locationDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: moderateScale(12),
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(16),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    navigateButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        paddingVertical: moderateScale(16),
        borderRadius: moderateScale(12),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    navigateText: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: '#000',
        marginLeft: moderateScale(8),
    },
    reachedButton: {
        flex: 1.5,
        flexDirection: 'row',
        backgroundColor: '#000',
        paddingVertical: moderateScale(16),
        borderRadius: moderateScale(12),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },

    photoSection: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    photoCard: {
        marginTop: 10,
        backgroundColor: "#f9f9f9",
        borderRadius: 10,
        padding: 10,
    },
    photoLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 5,
    },
    photoDate: {
        fontSize: 12,
        color: "#555",
    },
    photoImage: {
        width: "100%",
        height: 18,
        borderRadius: 10,
        marginTop: 5,
    },
    savedAsText: {
        marginTop: 4,
        color: "#777",
        fontSize: 12,
    },
    tollText: {
        fontSize: 14,
        color: '#555',
        marginTop: 2,
    },
    totalText: {
        fontSize: 20,
        color: '#000',
        fontWeight: '600',
        marginTop: 4,
    },
    walletText: {
        fontSize: 20,
        color: '#000',
    },
    reachedText: {
        fontSize: moderateScale(15),
        fontWeight: '700',
        color: '#fff',
        marginLeft: moderateScale(8),
    },
});