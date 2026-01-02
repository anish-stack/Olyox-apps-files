"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
    Modal,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
} from "react-native"
import MapView, { Marker, Polyline } from "react-native-maps"
import * as Location from "expo-location"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { useRoute, useNavigation } from "@react-navigation/native"
import haversine from "haversine-distance"

import { find_me } from "../../utils/helpers"
import axios from "axios"
import useSettings from "../../hooks/Settings"
import { useRideChat } from "../../hooks/userRideChatHook"
import { SafeAreaView } from 'react-native-safe-area-context';
const { width, height } = Dimensions.get("screen")

// ====== COLOR SYSTEM - BLACK & WHITE THEME ======
const COLORS = {
    black: "#000000",
    white: "#FFFFFF",
    lightGray: "#F8F8F8",
    mediumGray: "#E8E8E8",
    darkGray: "#4A4A4A",
    primary: "#000000",
    secondary: "#1A1A1A",
    accent: "#333333",
    error: "#E74C3C",
    success: "#27AE60",
    warning: "#F39C12",
}

// ====== CONFIG ======
const API_BASE = "https://www.appv2.olyox.com"
const ENDPOINTS = {
    GET_RIDE: (id) => `${API_BASE}/api/v1/new/get-ride-details/${id}`,
    CANCEL_RIDE: `${API_BASE}/api/v1/new/ride/cancel`,
    CANCEL_REASONS: `${API_BASE}/api/v1/admin/cancel-reasons?active=active&type=user`,
}

const GOOGLE_MAPS_API_KEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8"

// ====== HELPERS ======
const decodePolyline = (encoded) => {
    if (!encoded) return []
    const poly = []
    let index = 0
    let lat = 0
    let lng = 0

    while (index < encoded.length) {
        let b,
            shift = 0,
            result = 0
        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 31) << shift
            shift += 5
        } while (b >= 32)
        const dlat = result & 1 ? ~(result >> 1) : result >> 1
        lat += dlat

        shift = 0
        result = 0
        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 31) << shift
            shift += 5
        } while (b >= 32)
        const dlng = result & 1 ? ~(result >> 1) : result >> 1
        lng += dlng

        poly.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        })
    }
    return poly
}

const formatTime = (dateString) => {
    try {
        if (!dateString) return "Not available"
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return "Invalid time"
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    } catch {
        return "Not available"
    }
}

const formatDistance = (distanceInMeters) => {
    if (!distanceInMeters) return "Not available"
    const distanceKm = distanceInMeters / 1000
    return distanceKm > 1 ? `${distanceKm.toFixed(1)} km` : `${Math.round(distanceInMeters)} m`
}

const calculateETA = (distanceInMeters, avgSpeedKmh = 60) => {
    const distanceKm = distanceInMeters / 1000
    const minutes = Math.round((distanceKm / avgSpeedKmh) * 60)
    return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
}

// ====== MAIN COMPONENT ======
export default function IntercityRide() {
    const route = useRoute()
    const navigation = useNavigation()
    const { id } = route.params || {}
    const { settings, refetch } = useSettings()

    // State
    const [user, setUser] = useState(null)
    const [currentRide, setCurrentRide] = useState(null)
    const [rideStatus, setRideStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState("track")
    const [error, setError] = useState(null)

    // Chat state
    const [chatModalVisible, setChatModalVisible] = useState(false)
    const [messageText, setMessageText] = useState("")
    const [sendingMessage, setSendingMessage] = useState(false)
    const flatListRef = useRef(null)

    const [cancelModalVisible, setCancelModalVisible] = useState(false)
    const [cancelReasons, setCancelReasons] = useState([])
    const [selectedReason, setSelectedReason] = useState(null)
    const [cancelling, setCancelling] = useState(false)
    const [loadingReasons, setLoadingReasons] = useState(false)

    // Map state
    const [userLocation, setUserLocation] = useState(null)
    const [driverLocation, setDriverLocation] = useState(null)
    const [mapRegion, setMapRegion] = useState(null)
    const [routeCoords, setRouteCoords] = useState([])
    const [currentRouteType, setCurrentRouteType] = useState(null)
    const [directionsData, setDirectionsData] = useState(null)
    const [driverToPickupDistance, setDriverToPickupDistance] = useState(null)

    const mapRef = useRef(null)
    const watchRef = useRef(null)

    // Chat hook
    const { messages, sendMessage, loading: messagesLoading } = useRideChat(currentRide?._id, chatModalVisible)

    const fetchCancelReasons = useCallback(async () => {
        try {
            setLoadingReasons(true)
            const response = await axios.get(ENDPOINTS.CANCEL_REASONS)
            if (response.data?.data) {
                setCancelReasons(response.data.data)
                setSelectedReason(null)
            }
        } catch (err) {
            console.error("Error fetching cancel reasons:", err)
            Alert.alert("Error", "Failed to fetch cancel reasons")
        } finally {
            setLoadingReasons(false)
        }
    }, [])

    const handleCancelRide = useCallback(async () => {
        if (!selectedReason || !currentRide?._id) {
            Alert.alert("Error", "Please select a reason to cancel")
            return
        }

        setCancelling(true)
        try {
            const response = await axios.post(ENDPOINTS.CANCEL_RIDE, {

                intercity: true,
                ride: currentRide._id,
                cancelBy: 'user',
                reason_id: selectedReason._id,
                reason: selectedReason.name,
            })

            if (response?.data?.success) {
                Alert.alert("Success", "Your ride has been cancelled successfully", [
                    {
                        text: "OK",
                        onPress: () => {
                            setCancelModalVisible(false)
                            setSelectedReason(null)
                            fetchRideData()
                        },
                    },
                ])
            } else {
                Alert.alert("Error", response?.data?.message || "Failed to cancel ride")
            }
        } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Unable to cancel ride")
        } finally {
            setCancelling(false)
        }
    }, [selectedReason, currentRide?._id])

    // Get route points based on status
    const getRoutePoints = useCallback(() => {
        const status = rideStatus || currentRide?.ride_status
        const pickupCoords = currentRide?.pickup_location?.coordinates
        const dropCoords = currentRide?.drop_location?.coordinates
        const driverCoords = currentRide?.driver?.location?.coordinates

        if (status === "driver_assigned" && driverCoords && pickupCoords) {
            const driverCoord = { latitude: driverCoords[1], longitude: driverCoords[0] }
            const pickupCoord = { latitude: pickupCoords[1], longitude: pickupCoords[0] }

            const distance = haversine(driverCoord, pickupCoord)
            setDriverToPickupDistance(distance)

            return { origin: driverCoord, destination: pickupCoord, type: "pickup" }
        } else if (status !== "cancelled" && status !== "searching" && pickupCoords && dropCoords) {
            const pickupCoord = { latitude: pickupCoords[1], longitude: pickupCoords[0] }
            const dropCoord = { latitude: dropCoords[1], longitude: dropCoords[0] }
            return { origin: pickupCoord, destination: dropCoord, type: "destination" }
        }
        return null
    }, [rideStatus, currentRide])

    // Fetch ride details
    const findRideDetails = async (rideId) => {
        try {
            if (!rideId) throw new Error("No ride ID provided")
            const response = await axios.get(ENDPOINTS.GET_RIDE(rideId?._id))
            return response?.data?.data || null
        } catch (error) {
            console.error("Error fetching ride details:", error?.message)
            throw error
        }
    }

    // Process ride data
    const processRideData = useCallback(
        async (rideData) => {
            if (!rideData) return

            const driverCoords = rideData.driver?.location?.coordinates
            if (driverCoords && Array.isArray(driverCoords)) {
                setDriverLocation({
                    latitude: driverCoords[1],
                    longitude: driverCoords[0],
                })
            }

            setCurrentRide(rideData)
            setRideStatus(rideData.ride_status || "searching")

            const routePoints = getRoutePoints()
            if (routePoints) {
                setCurrentRouteType(routePoints.type)
                await getDetailedDirections(routePoints.origin, routePoints.destination, routePoints.type)
            }
        },
        [getRoutePoints],
    )

    // Fetch and fit route to coordinates
    const getDetailedDirections = useCallback(
        async (origin, destination, type) => {
            try {
                const apiKey = settings?.googleApiKey || GOOGLE_MAPS_API_KEY
                const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}&units=metric`

                const res = await fetch(url)
                const json = await res.json()

                let coords = [origin, destination]
                let directions = {
                    distance: formatDistance(haversine(origin, destination)),
                    duration: calculateETA(haversine(origin, destination)),
                    steps: [],
                }

                if (json?.routes?.length) {
                    const route = json.routes[0]
                    const encoded = route?.overview_polyline?.points
                    coords = encoded ? decodePolyline(encoded) : [origin, destination]
                    directions = {
                        distance: route.legs?.[0]?.distance?.text || directions.distance,
                        duration: route.legs?.[0]?.duration?.text || directions.duration,
                        steps: route.legs?.[0]?.steps?.slice(0, 5) || [],
                    }
                }

                setRouteCoords(coords)
                setDirectionsData(directions)

                if (mapRef.current && coords.length > 1) {
                    mapRef.current.fitToCoordinates(coords, {
                        edgePadding: { top: 100, right: 50, bottom: 280, left: 50 },
                        animated: true,
                    })
                }

                return { coords, directions }
            } catch (e) {
                console.warn("Directions API error:", e)
                setRouteCoords([origin, destination])

                if (mapRef.current) {
                    mapRef.current.fitToCoordinates([origin, destination], {
                        edgePadding: { top: 100, right: 50, bottom: 280, left: 50 },
                        animated: true,
                    })
                }
            }
        },
        [settings?.googleApiKey],
    )

    // Fetch ride data
    const fetchRideData = useCallback(
        async (showLoader = true) => {
            try {
                if (showLoader) {
                    setLoading(true)
                    setError(null)
                }

                const data = await find_me()
                if (!data?.user) throw new Error("Unable to fetch user data")

                setUser(data.user)

                const rideId = id || data?.user?.IntercityRide || data?.user?.on_intercity_ride_id
                if (!rideId) {
                    setCurrentRide(null)
                    setRideStatus(null)
                    setLoading(false)
                    return null
                }

                const rideData = await findRideDetails(rideId)
                if (!rideData) throw new Error("Unable to fetch ride details")

                processRideData(rideData)
                return rideId
            } catch (error) {
                console.error("Error in fetchRideData:", error?.message)
                setError(error?.message || "Unable to load ride information")
                setCurrentRide(null)
                setRideStatus(null)
                return null
            } finally {
                if (showLoader) setLoading(false)
            }
        },
        [id],
    )

    // Location tracking
    useEffect(() => {
        ; (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync()
                if (status !== "granted") return

                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                })
                setUserLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                })

                watchRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        distanceInterval: 50,
                        timeInterval: 10000,
                    },
                    (update) => {
                        setUserLocation({
                            latitude: update.coords.latitude,
                            longitude: update.coords.longitude,
                        })
                    },
                )
            } catch (e) {
                console.warn("Location error:", e)
            }
        })()

        return () => {
            try {
                if (watchRef.current) watchRef.current.remove()
            } catch { }
        }
    }, [])

    // Initialize and refetch on ride status change
    useEffect(() => {
        refetch()
        fetchRideData()
    }, [fetchRideData])

    // Auto-refresh
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !refreshing && currentRide?._id) {
                fetchRideData(false)
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [loading, refreshing, currentRide?._id, fetchRideData])

    // Auto navigate to rating
    useEffect(() => {
        if (rideStatus === "completed") {
            navigation.navigate("RatingReservations", { id: currentRide?._id })
        }
    }, [rideStatus, currentRide?._id])

    // Update route when ride status or locations change
    useEffect(() => {
        if (currentRide && mapRef.current) {
            const routePoints = getRoutePoints()
            if (routePoints && (routePoints.type !== currentRouteType || routeCoords.length === 0)) {
                getDetailedDirections(routePoints.origin, routePoints.destination, routePoints.type)
            }
        }
    }, [currentRide, rideStatus, getRoutePoints, currentRouteType])

    // Chat effects
    useEffect(() => {
        if (messages.length > 0 && chatModalVisible) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true })
            }, 100)
        }
    }, [messages, chatModalVisible])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await fetchRideData(false)
        setRefreshing(false)
    }, [fetchRideData])

    // Chat functions
    const handleSendMessage = async () => {
        const trimmedMessage = messageText.trim()
        if (!trimmedMessage || !currentRide?._id || sendingMessage) return

        setSendingMessage(true)
        try {
            await sendMessage(currentRide._id, "user", trimmedMessage)
            setMessageText("")
        } catch (error) {
            Alert.alert("Error", "Failed to send message. Please try again.")
        } finally {
            setSendingMessage(false)
        }
    }

    const toggleChatModal = () => {
        setChatModalVisible(!chatModalVisible)
    }

    const openCancelModal = () => {
        fetchCancelReasons()
        setCancelModalVisible(true)
    }

    // Actions
    const callDriver = () => {
        const number = currentRide?.driver?.phone
        if (!number) {
            Alert.alert("Unavailable", "Driver contact information is not available")
            return
        }
        Linking.openURL(`tel:${number}`)
    }

    const showEmergencyAlert = useCallback(() => {
        Alert.alert(
            "Emergency Help",
            "Choose an emergency service:",
            [
                {
                    text: "Call Police",
                    onPress: () => {
                        Linking.openURL("tel:100")
                    },
                },
                {
                    text: "Call Ambulance",
                    onPress: () => {
                        Linking.openURL("tel:112")
                    },
                },
                {
                    text: "Call Support",
                    onPress: () => {
                        Linking.openURL(`tel:${settings?.support_number || "01141236789"}`)
                    },
                },
                {
                    text: "Cancel",
                    style: "cancel",
                },
            ],
            { cancelable: true },
        )
    }, [settings])

    useEffect(() => {
        if (error || !currentRide) {
            const timer = setTimeout(() => {
                navigation.replace("Home"); // or navigation.navigate("Home")
            }, 2000);

            return () => clearTimeout(timer); // cleanup
        }
    }, [error, currentRide]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.black} />
                    <Text style={styles.loadingText}>Loading your ride...</Text>
                </View>
            </SafeAreaView>
        )
    }



    if (error || !currentRide) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="car-off" size={64} color={COLORS.darkGray} />
                    <Text style={styles.errorTitle}>No Active Ride</Text>
                    <Text style={styles.errorText}>{error || "You don't have any active intercity rides."}</Text>
                    <TouchableOpacity style={styles.refreshButton} onPress={() => fetchRideData()}>
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const pickupCoords = currentRide.pickup_location?.coordinates
    const dropCoords = currentRide.drop_location?.coordinates
    const pickupCoord = pickupCoords ? { latitude: pickupCoords[1], longitude: pickupCoords[0] } : null
    const dropCoord = dropCoords ? { latitude: dropCoords[1], longitude: dropCoords[0] } : null
    const driverCoord = driverLocation

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Track Your Ride</Text>
                <TouchableOpacity onPress={() => fetchRideData()} style={styles.headerIcon}>
                    <Ionicons name="refresh" size={24} color={COLORS.black} />
                </TouchableOpacity>
            </View>

            {/* Map Section */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    showsUserLocation
                    showsCompass
                    showsTraffic
                    initialRegion={{
                        latitude: 28.619,
                        longitude: 77.0311,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                    }}
                >
                    {userLocation && (
                        <Marker coordinate={userLocation} title="Your Location">
                            <View style={styles.userMarker}>
                                <MaterialCommunityIcons name="account" color={COLORS.white} size={18} />
                            </View>
                        </Marker>
                    )}

                    {driverLocation && (
                        <Marker coordinate={driverLocation} title="Driver">
                            <View style={styles.driverMarker}>
                                <MaterialCommunityIcons name="car" color={COLORS.white} size={20} />
                            </View>
                        </Marker>
                    )}

                    {pickupCoord && (
                        <Marker coordinate={pickupCoord} title="Pickup Location">
                            <View style={styles.pickupMarker}>
                                <MaterialCommunityIcons name="map-marker" color={COLORS.white} size={20} />
                            </View>
                        </Marker>
                    )}

                    {dropCoord && (
                        <Marker coordinate={dropCoord} title="Destination">
                            <View style={styles.dropMarker}>
                                <MaterialCommunityIcons name="flag-checkered" color={COLORS.white} size={18} />
                            </View>
                        </Marker>
                    )}

                    {routeCoords.length > 1 && (
                        <Polyline
                            coordinates={routeCoords}
                            strokeColor={COLORS.primary}
                            strokeWidth={5}
                            lineDashPattern={currentRouteType === "pickup" ? [10, 5] : undefined}
                        />
                    )}
                </MapView>

                {/* Route Info Banner */}
                {currentRouteType && (
                    <View style={styles.routeInfoBanner}>
                        <View style={styles.routeInfoHeader}>
                            <MaterialCommunityIcons
                                name={currentRouteType === "pickup" ? "navigation" : "map-marker-path"}
                                size={20}
                                color={COLORS.black}
                            />
                            <Text style={styles.routeInfoTitle}>
                                {currentRouteType === "pickup" ? "Driver to Pickup" : "Route to Destination"}
                            </Text>
                        </View>
                        <Text style={styles.routeInfoDistance}>
                            {directionsData?.distance || formatDistance(driverToPickupDistance)}
                        </Text>
                        {rideStatus === "driver_assigned" && driverToPickupDistance && (
                            <Text style={styles.routeInfoETA}>ETA: {calculateETA(driverToPickupDistance)}</Text>
                        )}
                    </View>
                )}

                {/* Chat Button */}
                <TouchableOpacity style={styles.chatButton} onPress={toggleChatModal}>
                    <Ionicons name="chatbubble" size={24} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {["track", "details", "support"].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === "track" ? "Track" : tab === "details" ? "Details" : tab === "chat" ? "Chat" : "Support"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {activeTab === "track" && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Trip Information</Text>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <MaterialCommunityIcons name="information" size={16} color={COLORS.darkGray} />
                                <Text style={styles.infoLabel}>Status</Text>
                            </View>
                            <Text style={[styles.infoValue, { color: rideStatus === "completed" ? COLORS.success : COLORS.primary }]}>
                                {rideStatus?.replace(/_/g, " ").toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <MaterialCommunityIcons name="map-marker-distance" size={16} color={COLORS.darkGray} />
                                <Text style={styles.infoLabel}>Total Distance</Text>
                            </View>
                            <Text style={styles.infoValue}>{formatDistance(currentRide.route_info?.distance * 1000)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <MaterialCommunityIcons name="currency-inr" size={16} color={COLORS.darkGray} />
                                <Text style={styles.infoLabel}>Fare</Text>
                            </View>
                            <Text style={styles.infoValue}>₹{currentRide.pricing?.total_fare?.toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <MaterialCommunityIcons name="car" size={16} color={COLORS.darkGray} />
                                <Text style={styles.infoLabel}>Vehicle Type</Text>
                            </View>
                            <Text style={styles.infoValue}>{currentRide.vehicle_type?.toUpperCase()}</Text>
                        </View>
                        {currentRide.ride_otp && (
                            <View style={styles.otpContainer}>
                                <MaterialCommunityIcons name="lock" size={18} color={COLORS.black} />
                                <Text style={styles.otpLabel}>Ride OTP: {currentRide.ride_otp}</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === "details" && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Driver Details</Text>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <MaterialCommunityIcons name="account" size={16} color={COLORS.darkGray} />
                                <Text style={styles.infoLabel}>Name</Text>
                            </View>
                            <Text style={styles.infoValue}>{currentRide.driver?.name || "N/A"}</Text>
                        </View>
                        {/* <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <MaterialCommunityIcons name="phone" size={16} color={COLORS.darkGray} />
                <Text style={styles.infoLabel}>Phone</Text>
              </View>
              <Text style={styles.infoValue}>{currentRide.driver?.phone || "N/A"}</Text>
            </View> */}
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <MaterialCommunityIcons name="car-side" size={16} color={COLORS.darkGray} />
                                <Text style={styles.infoLabel}>Vehicle</Text>
                            </View>
                            <Text style={styles.infoValue}>{currentRide.driver?.rideVehicleInfo?.vehicleName || "N/A"}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <MaterialCommunityIcons name="license" size={16} color={COLORS.darkGray} />
                                <Text style={styles.infoLabel}>License Plate</Text>
                            </View>
                            <Text style={styles.infoValue}>{currentRide.driver?.rideVehicleInfo?.VehicleNumber || "N/A"}</Text>
                        </View>
                    </View>
                )}

                {activeTab === "support" && (
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.actionButton} onPress={callDriver}>
                            <Ionicons name="call" size={20} color={COLORS.white} />
                            <Text style={styles.actionButtonText}>Call Driver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={showEmergencyAlert}>
                            <MaterialCommunityIcons name="phone-alert" size={20} color={COLORS.white} />
                            <Text style={styles.actionButtonText}>Emergency Help</Text>
                        </TouchableOpacity>
                        {rideStatus !== "completed" && rideStatus !== "cancelled" && (
                            <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={openCancelModal}>
                                <Ionicons name="close-circle" size={20} color={COLORS.white} />
                                <Text style={styles.actionButtonText}>Cancel Ride</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Chat Modal */}
            {renderChatModal()}

            {renderCancelModal()}
        </SafeAreaView>
    )

    function renderChatModal() {
        return (
            <Modal visible={chatModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <View style={styles.chatModalOverlay}>
                        <View style={styles.chatModal}>
                            <View style={styles.chatHeader}>
                                <Text style={styles.chatTitle}>Chat with Driver</Text>
                                <TouchableOpacity onPress={toggleChatModal}>
                                    <Ionicons name="close" size={24} color={COLORS.black} />
                                </TouchableOpacity>
                            </View>

                            {messagesLoading && messages.length === 0 ? (
                                <View style={styles.chatLoading}>
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                    <Text style={styles.chatLoadingText}>Loading messages...</Text>
                                </View>
                            ) : messages.length === 0 ? (
                                <View style={styles.emptyChat}>
                                    <Ionicons name="chatbubbles-outline" size={64} color={COLORS.mediumGray} />
                                    <Text style={styles.emptyChatText}>No messages yet</Text>
                                    <Text style={styles.emptyChatSubtext}>Start conversation with driver</Text>
                                </View>
                            ) : (
                                <FlatList
                                    ref={flatListRef}
                                    data={messages}
                                    keyExtractor={(item, index) => item._id || index.toString()}
                                    contentContainerStyle={styles.messagesList}
                                    renderItem={({ item }) => {
                                        const isUser = item.fromType === "user"
                                        return (
                                            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.driverBubble]}>
                                                <Text style={[styles.messageText, isUser ? styles.userText : styles.driverText]}>
                                                    {item.message}
                                                </Text>
                                                <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
                                            </View>
                                        )
                                    }}
                                />
                            )}

                            <View style={styles.chatInputContainer}>
                                <TextInput
                                    style={styles.messageInput}
                                    placeholder="Type a message..."
                                    placeholderTextColor={COLORS.darkGray}
                                    value={messageText}
                                    onChangeText={setMessageText}
                                    multiline
                                    editable={!sendingMessage}
                                />
                                <TouchableOpacity
                                    style={[styles.sendButton, (!messageText.trim() || sendingMessage) && styles.sendButtonDisabled]}
                                    onPress={handleSendMessage}
                                    disabled={!messageText.trim() || sendingMessage}
                                >
                                    {sendingMessage ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <Ionicons name="send" size={20} color={COLORS.white} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        )
    }

    function renderCancelModal() {
        return (
            <Modal visible={cancelModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <View style={styles.cancelModalOverlay}>
                        <View style={styles.cancelModal}>
                            {/* Header */}
                            <View style={styles.cancelHeader}>
                                <Text style={styles.cancelTitle}>Cancel Ride</Text>
                                <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.black} />
                                </TouchableOpacity>
                            </View>

                            {/* Subtitle */}
                            <Text style={styles.cancelSubtitle}>Please select a reason for cancellation</Text>

                            {/* Reasons List */}
                            {loadingReasons ? (
                                <View style={styles.reasonsLoadingContainer}>
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                    <Text style={styles.reasonsLoadingText}>Loading reasons...</Text>
                                </View>
                            ) : cancelReasons.length === 0 ? (
                                <View style={styles.noReasonsContainer}>
                                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.mediumGray} />
                                    <Text style={styles.noReasonsText}>No cancellation reasons available</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={cancelReasons}
                                    keyExtractor={(item) => item._id}
                                    scrollEnabled={true}
                                    contentContainerStyle={styles.reasonsList}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.reasonItem, selectedReason?._id === item._id && styles.reasonItemSelected]}
                                            onPress={() => setSelectedReason(item)}
                                            activeOpacity={0.7}
                                        >
                                            {/* Radio Button */}
                                            <View style={styles.radioButtonContainer}>
                                                <View style={styles.radioButton}>
                                                    {selectedReason?._id === item._id && <View style={styles.radioButtonInner} />}
                                                </View>
                                            </View>

                                            {/* Content */}
                                            <View style={styles.reasonContent}>
                                                <Text style={styles.reasonName}>{item.name}</Text>
                                                {item.description && <Text style={styles.reasonDescription}>{item.description}</Text>}
                                            </View>

                                            {/* Icon */}
                                            <MaterialCommunityIcons
                                                name={selectedReason?._id === item._id ? "check-circle" : "circle-outline"}
                                                size={24}
                                                color={selectedReason?._id === item._id ? COLORS.primary : COLORS.mediumGray}
                                            />
                                        </TouchableOpacity>
                                    )}
                                />
                            )}

                            {/* Action Buttons */}
                            <View style={styles.cancelActionContainer}>
                                <TouchableOpacity style={styles.cancelButtonSecondary} onPress={() => setCancelModalVisible(false)}>
                                    <Text style={styles.cancelButtonSecondaryText}>Keep Ride</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.cancelButtonPrimary, (!selectedReason || cancelling) && styles.cancelButtonDisabled]}
                                    onPress={handleCancelRide}
                                    disabled={!selectedReason || cancelling}
                                >
                                    {cancelling ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <Text style={styles.cancelButtonPrimaryText}>Confirm Cancel</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        )
    }
}

// ====== STYLES ======
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.mediumGray,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.black,
    },
    headerIcon: {
        padding: 8,
    },
    mapContainer: {
        height: height * 0.45,
        position: "relative",
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    chatButton: {
        position: "absolute",
        bottom: 16,
        right: 16,
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 25,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        elevation: 5,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    routeInfoBanner: {
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        backgroundColor: COLORS.white,
        padding: 14,
        borderRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: COLORS.mediumGray,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    routeInfoHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    routeInfoTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.primary,
    },
    routeInfoDistance: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.black,
        marginBottom: 4,
    },
    routeInfoETA: {
        fontSize: 12,
        color: COLORS.darkGray,
        marginTop: 4,
    },
    tabs: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        margin: 16,
        borderRadius: 12,
        elevation: 2,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.mediumGray,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        backgroundColor: COLORS.white,
    },
    tabButtonActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.darkGray,
        fontWeight: "600",
        fontSize: 14,
    },
    tabTextActive: {
        color: COLORS.white,
        fontWeight: "700",
    },
    content: {
        flex: 1,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.mediumGray,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.black,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.mediumGray,
    },
    infoLabelContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    infoLabel: {
        color: COLORS.darkGray,
        fontSize: 14,
        fontWeight: "500",
    },
    infoValue: {
        fontWeight: "600",
        fontSize: 14,
        color: COLORS.black,
    },
    otpContainer: {
        backgroundColor: COLORS.lightGray,
        padding: 14,
        borderRadius: 10,
        marginTop: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    otpLabel: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: 14,
    },
    actionButton: {
        flexDirection: "row",
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    actionButtonText: {
        color: COLORS.white,
        fontWeight: "600",
        flex: 1,
        fontSize: 16,
    },
    dangerButton: {
        backgroundColor: COLORS.error,
    },
    userMarker: {
        backgroundColor: COLORS.primary,
        padding: 8,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    driverMarker: {
        backgroundColor: COLORS.success,
        padding: 8,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    pickupMarker: {
        backgroundColor: COLORS.primary,
        padding: 8,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    dropMarker: {
        backgroundColor: COLORS.error,
        padding: 8,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: COLORS.white,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.darkGray,
        fontSize: 16,
        fontWeight: "500",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: COLORS.white,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginTop: 12,
        color: COLORS.black,
    },
    errorText: {
        color: COLORS.darkGray,
        textAlign: "center",
        marginTop: 8,
        fontSize: 14,
    },
    refreshButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
        elevation: 2,
    },
    refreshButtonText: {
        color: COLORS.white,
        fontWeight: "600",
        fontSize: 16,
    },
    // Chat Styles
    chatModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    chatModal: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.7,
        elevation: 5,
    },
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.mediumGray,
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.black,
    },
    chatLoading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    chatLoadingText: {
        marginTop: 12,
        color: COLORS.darkGray,
        fontWeight: "500",
    },
    emptyChat: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyChatText: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 12,
        color: COLORS.black,
    },
    emptyChatSubtext: {
        color: COLORS.darkGray,
        textAlign: "center",
        marginTop: 4,
        fontSize: 13,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 100,
    },
    messageBubble: {
        maxWidth: "80%",
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: "flex-end",
        backgroundColor: COLORS.primary,
    },
    driverBubble: {
        alignSelf: "flex-start",
        backgroundColor: COLORS.mediumGray,
    },
    messageText: {
        color: COLORS.white,
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: COLORS.white,
    },
    driverText: {
        color: COLORS.black,
    },
    messageTime: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 4,
        alignSelf: "flex-end",
        color: COLORS.white,
    },
    chatInputContainer: {
        flexDirection: "row",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.mediumGray,
        alignItems: "flex-end",
        backgroundColor: COLORS.white,
        gap: 8,
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.mediumGray,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
        fontSize: 14,
        backgroundColor: COLORS.lightGray,
        color: COLORS.black,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 44,
        elevation: 2,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.mediumGray,
    },
    cancelModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    cancelModal: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.85,
        elevation: 5,
        paddingBottom: 20,
    },
    cancelHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.mediumGray,
    },
    cancelTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.black,
    },
    cancelSubtitle: {
        fontSize: 14,
        color: COLORS.darkGray,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        fontWeight: "500",
    },
    reasonsList: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    reasonItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 10,
        borderRadius: 12,
        backgroundColor: COLORS.lightGray,
        borderWidth: 2,
        borderColor: COLORS.mediumGray,
        gap: 12,
    },
    reasonItemSelected: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    radioButtonContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    radioButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.darkGray,
        justifyContent: "center",
        alignItems: "center",
    },
    radioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },
    reasonContent: {
        flex: 1,
    },
    reasonName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.black,
        marginBottom: 4,
    },
    reasonDescription: {
        fontSize: 13,
        color: COLORS.darkGray,
        fontWeight: "400",
    },
    reasonsLoadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    reasonsLoadingText: {
        marginTop: 12,
        color: COLORS.darkGray,
        fontWeight: "500",
    },
    noReasonsContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    noReasonsText: {
        marginTop: 12,
        color: COLORS.darkGray,
        fontSize: 14,
        fontWeight: "500",
    },
    cancelActionContainer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.mediumGray,
    },
    cancelButtonSecondary: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.mediumGray,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButtonSecondaryText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.black,
    },
    cancelButtonPrimary: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: COLORS.error,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
    },
    cancelButtonPrimaryText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    cancelButtonDisabled: {
        backgroundColor: COLORS.mediumGray,
        opacity: 0.6,
    },
})
