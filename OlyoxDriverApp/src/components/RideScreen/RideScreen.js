"use client"

import React, { useEffect, useMemo, useCallback, useState, useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Dimensions,
    ActivityIndicator,
    Alert,
    Platform,
    AppState,
    NativeModules
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import useUserStore from "../../../Store/useUserStore"
import useRideStore from "../../../Store/PoolingStore"
import useCurrentRideStore from "../../../Store/currentRideStore"
import { API_URL_APP } from "../../../constant/api"
import axios from "axios"
import loginStore from "../../../Store/authStore"
import notifee from "@notifee/react-native"
const { PlayerModule } = NativeModules;

const { width, height } = Dimensions.get("window")

/* --------------------------------------------------------------
   Haversine – distance between driver and pickup (km)
   -------------------------------------------------------------- */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return (R * c).toFixed(2)
}

/* --------------------------------------------------------------
   Clear all notifications (iOS + Android)
   -------------------------------------------------------------- */
const clearAllNotifications = async (shouldLog = false) => {
    try {
        if (shouldLog) console.log("Clearing notifications…")
        if (Platform.OS === "android") {
            // await FloatingWidget?.clearAlNotif()
        } else {
            await notifee.cancelAllNotifications()
        }
        if (shouldLog) console.log("Notifications cleared")
    } catch (e) {
        console.error("Clear notifications error:", e)
    }
}

/* --------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------- */
const RideScreen = ({ isShow = false, ridesData = [], id, stopSound }) => {
    const navigation = useNavigation()

    /* ---------------------- REFS ---------------------- */

    const soundPlayedForRidesRef = useRef(new Set())
    const permanentlyRejectedRidesRef = useRef(new Set())
    const processingRideIdsRef = useRef(new Set())
    const rejectedRideIdsRef = useRef(new Set())
    const statusIntervalsRef = useRef(new Map())

    /* ---------------------- STATE ---------------------- */
    const [loadingRideId, setLoadingRideId] = useState(null)
    const [isRejecting, setIsRejecting] = useState(false)
    const [rideStatuses, setRideStatuses] = useState(new Map())
    const [appState, setAppState] = useState(AppState.currentState)

    /* ---------------------- STORES ---------------------- */
    const { user, fetchUserDetails } = useUserStore()
    const { token } = loginStore()
    const { isPooling, startPooling, stopPooling, clearRides } = useRideStore()
    const { fetchOnlyLocationAndStatus } = useCurrentRideStore()

    /* ---------------------- ACTIVE RIDES ---------------------- */
    const activeRides = useMemo(() => {
        return ridesData.filter(ride => {
            const status = rideStatuses.get(ride._id)
            const rejected =
                rejectedRideIdsRef.current.has(ride._id) ||
                permanentlyRejectedRidesRef.current.has(ride._id)
            const cancelled =
                status?.status === "cancelled" || status?.status === "driver_assigned"
            return !rejected && !cancelled
        })
    }, [ridesData, rideStatuses])

    /* ---------------------- DISTANCE CALC ---------------------- */
    const getDistanceFromDriver = useCallback(
        (ride) => {
            if (!user?.location?.coordinates || !ride) {
                console.log("⚠️ Missing user location or ride data:", {
                    hasUserLocation: !!user?.location?.coordinates,
                    hasRide: !!ride,
                });
                return null;
            }

            const driverLat = user.location.coordinates[1];
            const driverLon = user.location.coordinates[0];

            console.log("🚗 Driver Coordinates:", { driverLat, driverLon });

            // 1. Prefer live pickup from status
            const status = rideStatuses.get(ride._id);

            let pickupLat;
            let pickupLon;

            if (status?.pickup?.coordinates) {
                pickupLat = status.pickup.coordinates[1];
                pickupLon = status.pickup.coordinates[0];
                console.log("📍 Using live pickup coordinates from status:", {
                    rideId: ride._id,
                    pickupLat,
                    pickupLon,
                });
            } else if (ride.pickup_address?.coordinates) {
                pickupLat = ride.pickup_address.coordinates.lat;
                pickupLon = ride.pickup_address.coordinates.lng;
                console.log("📦 Using pickup coordinates from ride data:", {
                    rideId: ride._id,
                    pickupLat,
                    pickupLon,
                });
            } else {
                console.log("❌ No pickup coordinates found for ride:", ride._id);
            }

            if (pickupLat != null && pickupLon != null) {
                const distance = calculateHaversineDistance(
                    driverLat,
                    driverLon,
                    pickupLat,
                    pickupLon
                );
                console.log("📏 Calculated Haversine distance (KM):", distance);
                return distance;
            }

            // Fallback to backend distance
            const backendDistance = ride.distance_from_pickup_km ?? null;
            console.log("↩️ Using backend distance_from_pickup_km:", backendDistance);

            return backendDistance;
        },
        [user?.location, rideStatuses]
    );
    console.log("ride?.isParcelOrder")


    /* ---------------------- BADGES ---------------------- */
    const getRideTypeBadge = ride => {
        const badges = []
            console.log("ride?.isParcelOrder",ride)

        if (ride?.isRental && ride?.isLater) {
            badges.push({
                label: "LATER RENTAL",
                color: "#8B5CF6",
                icon: "Repeat Clock"
            })
        } else if (ride?.isParcelOrder) {
            badges.push({ label: "Parcel Order", color: "#de0d30", icon: "Repeat" })

        }
        else if (ride?.isRental) {
            badges.push({ label: "RENTAL", color: "#10B981", icon: "Repeat" })
        } else if (ride?.isLater) {
            badges.push({ label: "LATER", color: "#F59E0B", icon: "Clock" })
        } else if (ride?.isIntercity) {
            badges.push({ label: "INTERCITY", color: "#3B82F6", icon: "City" })
        } else {
            badges.push({ label: "NORMAL", color: "#6B7280", icon: "Car" })
        }
        return badges
    }

    const getStatusColor = status => {
        switch (status) {
            case "searching":
                return "#F59E0B"
            case "accepted":
                return "#10B981"
            case "driver_assigned":
                return "#3B82F6"
            case "cancelled":
                return "#EF4444"
            default:
                return "#6B7280"
        }
    }

    /* ---------------------- POLL STATUS ---------------------- */
    useEffect(() => {
        if (!isShow || activeRides.length === 0) {
            statusIntervalsRef.current.forEach(clearInterval)
            statusIntervalsRef.current.clear()
            return
        }

        activeRides.forEach(ride => {
            if (statusIntervalsRef.current.has(ride._id)) return

            const interval = setInterval(async () => {
                const data = await fetchOnlyLocationAndStatus(ride._id)
                console.log("data from  data", data)
                if (!data) return

                setRideStatuses(prev => {
                    const next = new Map(prev)
                    next.set(ride._id, {
                        status: data.ride_status,
                        pickup: data.pickup,
                        drop: data.drop_address
                    })
                    return next
                })

                // auto-remove cancelled / assigned rides
                if (["driver_assigned", "cancelled"].includes(data.ride_status)) {
                    clearInterval(interval)
                    statusIntervalsRef.current.delete(ride._id)
                    rejectedRideIdsRef.current.add(ride._id)
                }
            }, 1000)

            statusIntervalsRef.current.set(ride._id, interval)
        })

        return () => {
            statusIntervalsRef.current.forEach(clearInterval)
            statusIntervalsRef.current.clear()
        }
    }, [isShow, activeRides, fetchOnlyLocationAndStatus])

    /* ---------------------- APP STATE ---------------------- */
    useEffect(() => {
        const sub = AppState.addEventListener("change", setAppState)
        return () => sub.remove()
    }, [])

    /* ---------------------- ACCEPT ---------------------- */
    const handleAccept = useCallback(

        async rideId => {
            PlayerModule.stopSound()
                .then(() => console.log('Sound stopped'))
                .catch(err => console.error('stopSound error:', err));
            stopSound()

            if (
                loadingRideId ||
                processingRideIdsRef.current.has(rideId) ||
                permanentlyRejectedRidesRef.current.has(rideId)
            )
                return

            processingRideIdsRef.current.add(rideId)
            setLoadingRideId(rideId)

            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

                let userId = user?._id || id
                if (!userId) {
                    const u = await fetchUserDetails()
                    userId = u?._id
                }
                if (!userId) throw new Error("User ID missing")

                const res = await fetch(
                    `${API_URL_APP}/api/v1/new/ride-action-reject-accepet`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "accept",
                            rideId,
                            riderId: userId,
                            driverId: userId
                        })
                    }
                )
                const json = await res.json()

                if (res.ok && json.success) {
                    await stopPooling()
                    await clearAllNotifications()
                    soundPlayedForRidesRef.current.clear()
                    rejectedRideIdsRef.current.clear()
                    permanentlyRejectedRidesRef.current.clear()
                    processingRideIdsRef.current.clear()
                    clearRides?.()

                    statusIntervalsRef.current.forEach(clearInterval)
                    statusIntervalsRef.current.clear()

                    navigation.navigate("current_ride", { _id: rideId })
                } else {
                    throw new Error(json.message ?? "Accept failed")
                }
            } catch (e) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                Alert.alert("Accept failed", e.message ?? "Try again")
            } finally {
                processingRideIdsRef.current.delete(rideId)
                setLoadingRideId(null)
            }
        },
        [
            user?._id,
            id,
            navigation,
            stopPooling,
            clearRides,
            fetchUserDetails,
            loadingRideId
        ]
    )

    /* ---------------------- REJECT ---------------------- */
    const handleReject = useCallback(
        async rideId => {
            await clearAllNotifications()
            PlayerModule.stopSound()
                .then(() => console.log('Sound stopped'))
                .catch(err => console.error('stopSound error:', err));
            // already cancelled → just hide it, no API call
            stopSound()
            const status = rideStatuses.get(rideId)
            if (["cancelled", "driver_assigned"].includes(status?.status ?? "")) {
                rejectedRideIdsRef.current.add(rideId)
                permanentlyRejectedRidesRef.current.add(rideId)
                if (statusIntervalsRef.current.has(rideId)) {
                    clearInterval(statusIntervalsRef.current.get(rideId))
                    statusIntervalsRef.current.delete(rideId)
                }
                return
            }

            processingRideIdsRef.current.add(rideId)
            rejectedRideIdsRef.current.add(rideId)
            setIsRejecting(true)
            setLoadingRideId(rideId)

            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

                await axios.post(
                    `${API_URL_APP}/api/v1/new/ride-action-reject-accepet`,
                    {
                        action: "reject",
                        rideId,
                        riderId: user?._id || id
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        }
                    }
                )

                permanentlyRejectedRidesRef.current.add(rideId)
            } catch (err) {
                // If the ride was cancelled on the server side, treat it as rejected
                if (err.response?.data?.message?.toLowerCase().includes("cancelled")) {
                    permanentlyRejectedRidesRef.current.add(rideId)
                } else {
                    rejectedRideIdsRef.current.delete(rideId)
                }
            } finally {
                if (statusIntervalsRef.current.has(rideId)) {
                    clearInterval(statusIntervalsRef.current.get(rideId))
                    statusIntervalsRef.current.delete(rideId)
                }

                setTimeout(() => {
                    setIsRejecting(false)
                    setLoadingRideId(null)
                    processingRideIdsRef.current.delete(rideId)

                    // restart pooling if driver is free
                    if (user?._id && !user?.on_ride_id && !isPooling) {
                        soundPlayedForRidesRef.current.clear()
                        startPooling(user._id)
                    }
                }, 500)
            }
        },
        [
            token,
            startPooling,
            isPooling,
            user?._id,
            user?.on_ride_id,
            id,
            rideStatuses
        ]
    )

    /* ---------------------- RENDER CARD ---------------------- */
    const renderRideCard = ({ item: ride }) => {
        const status = rideStatuses.get(ride._id)
        const badges = getRideTypeBadge(ride)
        const distanceFromDriver = getDistanceFromDriver(ride)
        const isLoading = loadingRideId === ride._id

        return (
            <View style={styles.rideCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={styles.vehicleIcon}>
                            <Ionicons
                                name={ride?.vehicle_type === "bike" ? "bicycle" : "car-sport"}
                                size={20}
                                color="#fff"
                            />
                        </View>
                        <View>
                            <Text style={styles.vehicleType}>
                                {ride?.vehicle_type?.toUpperCase() ?? "RIDE"}
                            </Text>
                            <Text style={styles.rideId}>ID: {ride._id.slice(-6)}</Text>
                        </View>
                    </View>

                    {status?.status && (
                        <View
                            style={[
                                styles.statusBadgeSmall,
                                { backgroundColor: getStatusColor(status.status) }
                            ]}
                        >
                            <View style={styles.statusDot} />
                            <Text style={styles.statusTextSmall}>
                                {status.status.replace("_", " ").toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Badges */}
                <View style={styles.badgesRow}>
                    {badges.map((b, i) => (
                        <View
                            key={i}
                            style={[styles.badgeSmall, { backgroundColor: b.color }]}
                        >
                            <Text style={styles.badgeTextSmall}>
                                {b.icon} {b.label}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Locations */}
                <View style={styles.locationsContainer}>
                    <View style={styles.locationRow}>
                        <View style={styles.locationDot} />
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationLabel}>PICKUP</Text>
                            <Text style={styles.locationAddress} numberOfLines={2}>
                                {status?.pickup?.formatted_address ||
                                    ride?.pickup_address ||
                                    "Loading…"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.routeLine} />

                    <View style={styles.locationRow}>
                        <View style={[styles.locationDot, styles.dropDot]} />
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationLabel}>DROP-OFF</Text>
                            <Text style={styles.locationAddress} numberOfLines={2}>
                                {status?.drop?.formatted_address ||
                                    ride?.drop_address ||
                                    "Loading…"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                    {distanceFromDriver ? (
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons
                                name="map-marker-distance"
                                size={16}
                                color="#4B5563"
                            />
                            <Text style={styles.detailLabel}>Pickup Distance</Text>
                            <Text style={styles.detailValue}>
                                {(() => {
                                    const value = String(distanceFromDriver).trim(); // safely convert to string
                                    if (!value) return "N/A";

                                    // Check if value already contains 'km' or 'm'
                                    if (value.includes("km") || value.includes("m")) {
                                        return value;
                                    }

                                    // Try to parse number for proper formatting
                                    const numeric = parseFloat(value);
                                    if (isNaN(numeric)) return value;

                                    // Append 'km' automatically
                                    return `${numeric.toFixed(2)} km`;
                                })()}
                            </Text>
                        </View>
                    ) : null}


                    {ride?.distance && (
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons
                                name="map-marker-path"
                                size={16}
                                color="#4B5563"
                            />
                            <Text style={styles.detailLabel}>Trip distance</Text>
                            <Text style={styles.detailValue}>
                                {ride?.distance ? ride.distance.toFixed(2) : "0.00"} km
                            </Text>

                        </View>
                    )}

                    {ride?.isRental && (
                        <>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={16}
                                    color="#4B5563"
                                />
                                <Text style={styles.detailLabel}>Duration</Text>
                                <Text style={styles.detailValue}>
                                    {ride.rentalHours || 0} hrs
                                </Text>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name="speedometer"
                                    size={16}
                                    color="#4B5563"
                                />
                                <Text style={styles.detailLabel}>KM Limit</Text>
                                <Text style={styles.detailValue}>
                                    <Text style={styles.detailValue}>
                                        {ride?.rental_km_limit ? parseFloat(ride.rental_km_limit).toFixed(2) : "0.00"} km
                                    </Text>

                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Fare */}
                <View style={styles.fareContainer}>
                    <Text style={styles.fareLabel}>FARE</Text>
                    <Text style={styles.fareAmount}>
                        ₹{Number(ride?.total_fare ?? 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>
                </View>


                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleReject(ride._id)}
                        disabled={isLoading}
                    >
                        {isLoading && isRejecting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="close-circle" size={20} color="#fff" />
                                <Text style={styles.actionBtnText}>Reject</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAccept(ride._id)}
                        disabled={isLoading}
                    >
                        {isLoading && !isRejecting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.actionBtnText}>Accept</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    /* ---------------------- EARLY RETURN ---------------------- */
    if (!isShow || activeRides.length === 0) return null

    /* ---------------------- MAIN RENDER ---------------------- */
    return (
        <View style={styles.overlay}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>New Ride Requests</Text>
                        <View style={styles.counterBadge}>
                            <Text style={styles.counterText}>{activeRides.length}</Text>
                        </View>
                    </View>

                    <FlatList
                        data={activeRides}
                        renderItem={renderRideCard}
                        keyExtractor={i => i._id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                    />
                </View>
            </SafeAreaView>
        </View>
    )
}

export default RideScreen

/* --------------------------------------------------------------
   STYLES – WHITE BACKGROUND
   -------------------------------------------------------------- */
const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.98)",
        zIndex: 1000
    },
    safeArea: { flex: 1 },
    container: { flex: 1, backgroundColor: "#fff" },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB"
    },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: "#111" },
    counterBadge: {
        backgroundColor: "#10B981",
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center"
    },
    counterText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

    listContent: { padding: 16 },

    rideCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4
    },

    /* Header */
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    vehicleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#1F2937",
        justifyContent: "center",
        alignItems: "center"
    },
    vehicleType: { fontSize: 14, fontWeight: "600", color: "#111" },
    rideId: { fontSize: 11, color: "#6B7280", marginTop: 2 },

    statusBadgeSmall: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#fff"
    },
    statusTextSmall: { color: "#fff", fontSize: 10, fontWeight: "600" },

    /* Badges */
    badgesRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12
    },
    badgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeTextSmall: { color: "#fff", fontSize: 10, fontWeight: "600" },

    /* Locations */
    locationsContainer: { marginBottom: 12 },
    locationRow: { flexDirection: "row", gap: 10 },
    locationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#10B981",
        marginTop: 3
    },
    dropDot: { backgroundColor: "#EF4444" },
    locationInfo: { flex: 1 },
    locationLabel: {
        fontSize: 10,
        color: "#6B7280",
        fontWeight: "600",
        marginBottom: 2
    },
    locationAddress: { fontSize: 13, color: "#111", lineHeight: 18 },

    routeLine: {
        width: 2,
        height: 16,
        backgroundColor: "#D1D5DB",
        marginLeft: 4,
        marginVertical: 4
    },

    /* Details */
    detailsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        minWidth: "48%"
    },
    detailLabel: { fontSize: 11, color: "#6B7280", flex: 1 },
    detailValue: { fontSize: 11, fontWeight: "600", color: "#111" },

    /* Fare */
    fareContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12
    },
    fareLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
    fareAmount: { fontSize: 20, fontWeight: "bold", color: "#10B981" },

    /* Actions */
    actionsRow: { flexDirection: "row", gap: 8 },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10
    },
    rejectBtn: { backgroundColor: "#DC2626" },
    acceptBtn: { backgroundColor: "#10B981" },
    actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" }
})
