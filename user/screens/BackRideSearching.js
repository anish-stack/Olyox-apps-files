"use client"

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, ScrollView } from "react-native"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRoute, useNavigation, CommonActions } from "@react-navigation/native"
import axios from "axios"
import { useRideSearching } from "../context/ride_searching"
import { tokenCache } from "../Auth/cache"
import { useRide } from "../context/RideContext"

export default function BackRideSearching() {
  const route = useRoute()
  const navigation = useNavigation()
  const { rideId } = route.params || {}
  const { saveRide, updateRideStatus } = useRide()
  const { saveRideSearching, updateRideStatusSearching, clearCurrentRideSearching } = useRideSearching()

  // Core state
  const [rideData, setRideData] = useState(null)
  const [currentRideStatus, setCurrentRideStatus] = useState("searching")
  const [bookingStatusMessage, setBookingStatusMessage] = useState("Searching for drivers...")
  const [isBookingInProgress, setIsBookingInProgress] = useState(true)
  const [rideCompleted, setRideCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Animation
  const searchAnimation = useRef(new Animated.Value(0)).current
  const componentMountedRef = useRef(true)
  const lastStatusRef = useRef("")
  const pollingIntervalRef = useRef(null)


  // Memoized API configuration
  const apiConfig = useMemo(() => ({
    baseURL: "https://www.appv2.olyox.com/api/v1/new",
    timeout: 8000,
  }), [])

  // Optimized search animation
  const startSearchAnimation = useCallback(() => {
    if (!componentMountedRef.current || !isBookingInProgress) return

    Animated.loop(
      Animated.sequence([
        Animated.timing(searchAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnimation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [searchAnimation, isBookingInProgress])

  // Memoized animated style
  const animatedSearchStyle = useMemo(
    () => [
      styles.searchCircle,
      {
        opacity: searchAnimation,
        transform: [
          {
            scale: searchAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.2],
            }),
          },
        ],
      },
    ],
    [searchAnimation],
  )

  // Optimized ride data parser
  const parseRideData = useCallback((data) => {
    if (!data) return null

    return {
      ...data,
      origin: {
        latitude: data.pickup_location?.coordinates?.[1],
        longitude: data.pickup_location?.coordinates?.[0],
        address: data.pickup_address?.formatted_address || data.pickup_address,
      },
      destination: {
        latitude: data.drop_location?.coordinates?.[1],
        longitude: data.drop_location?.coordinates?.[0],
        address: data.drop_address?.formatted_address || data.drop_address,
      },
      selectedRide: {
        vehicleName: data.vehicle_type,
        vehicleType: data.vehicle_type,
        estimatedFare: data.pricing?.total_fare || data.fare,
      },
    }
  }, [])

  // Fast API call for booking details
  const fetchBookingDetails = useCallback(async () => {
    if (!rideId || !componentMountedRef.current) return null

    try {
      const token = await tokenCache.getToken("auth_token_db")
      if (!token) throw new Error("No authentication token")

      const response = await axios.get(
        `${apiConfig.baseURL}/booking-details/${rideId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: apiConfig.timeout,
        }
      )

      if (response.data?.success && response.data?.Bookings) {
        return response.data.Bookings
      }
      throw new Error(response.data?.message || "Failed to fetch booking details")
    } catch (error) {
      console.error("Fetch booking details error:", error)
      if (error.response?.status === 404) {
        throw new Error("Ride not found")
      }
      if (error.response?.status === 401) {
        throw new Error("Authentication failed")
      }
      throw new Error(error.message || "Network error")
    }
  }, [rideId, apiConfig])

  // Optimized status handler
  const handleStatusChange = useCallback((newStatus, data) => {
    if (newStatus === lastStatusRef.current) return

    lastStatusRef.current = newStatus
    setCurrentRideStatus(newStatus)

    const messages = {
      searching: `Searching for drivers... (${data?.total_notifications_sent || 0} drivers notified)`,
      driver_assigned: "Driver assigned! Your ride is on the way.",
      driver_arrived: "Your driver has arrived!",
      ride_started: "Your ride has started.",
      ride_completed: "Ride completed successfully.",
      cancelled: "Ride has been cancelled.",
    }

    const message = data?.status_message || messages[newStatus] || `Status: ${newStatus}`
    setBookingStatusMessage(message)

    // Handle critical status changes
    switch (newStatus) {
      case "driver_assigned":
        setIsBookingInProgress(false)
        saveRide({ ...data, ride_otp: data.ride_otp })
        clearCurrentRideSearching()
        updateRideStatus("confirmed")
        
        Alert.alert("Driver Assigned!", message, [
          {
            text: "OK",
            onPress: () => {
              const parsedData = parseRideData(data)
              navigation.replace("RideStarted", {
                driver: data.driver?._id || data._id,
                origin: parsedData?.origin,
                destination: parsedData?.destination,
              })
            },
          },
        ])
        break

      case "cancelled":
        setIsBookingInProgress(false)
        setRideCompleted(true)
        clearCurrentRideSearching()
        
        Alert.alert("Ride Cancelled", message, [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Home" }],
                })
              )
            },
          },
        ])
        break

      case "ride_completed":
        setIsBookingInProgress(false)
        setRideCompleted(true)
        clearCurrentRideSearching()
        Alert.alert("Ride Completed!", message)
        break
    }
  }, [saveRide, clearCurrentRideSearching, updateRideStatus, navigation, parseRideData])

  // Main data fetching function
  const loadRideData = useCallback(async () => {
    if (!componentMountedRef.current) return

    try {
      setError(null)
      const data = await fetchBookingDetails()
      
      if (!componentMountedRef.current) return

      if (data) {
        const parsedData = parseRideData(data)
        setRideData(parsedData)
        handleStatusChange(data.ride_status || data.status, data)
        setIsLoading(false)
      }
    } catch (err) {
      if (!componentMountedRef.current) return
      
      console.error("Load ride data error:", err)
      setError(err.message)
      setIsLoading(false)
      
      if (err.message === "Authentication failed") {
        Alert.alert("Authentication Error", "Please log in again.", [
          {
            text: "OK",
            onPress: () => navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Login" }],
              })
            ),
          },
        ])
      }
    }
  }, [fetchBookingDetails, parseRideData, handleStatusChange, navigation])

  // Optimized polling with smart intervals
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return

    let pollCount = 0
    const poll = async () => {
      if (!componentMountedRef.current || rideCompleted) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        return
      }

      await loadRideData()
      pollCount++

      // Increase interval after 30 seconds for efficiency
      if (pollCount === 10) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = setInterval(poll, 6000)
        }
      }
    }

    // Start with 3-second intervals
    pollingIntervalRef.current = setInterval(poll, 3000)
  }, [loadRideData, rideCompleted])

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  // Cancel ride function
  const handleCancelBooking = useCallback(async () => {
    Alert.alert(
      "Cancel Ride?",
      "Are you sure you want to cancel this ride?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              setIsBookingInProgress(false)
              stopPolling()

              const token = await tokenCache.getToken("auth_token_db")
              if (token && rideId) {
                await axios.post(
                  `${apiConfig.baseURL}/cancel-before/${rideId}`,
                  {},
                  {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: apiConfig.timeout,
                  }
                )
              }

              updateRideStatusSearching("cancel")
              clearCurrentRideSearching()

              Alert.alert("Success", "Ride cancelled successfully.", [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: "Home" }],
                      })
                    )
                  },
                },
              ])
            } catch (error) {
              Alert.alert("Error", "Failed to cancel ride. Please try again.")
            }
          },
        },
      ]
    )
  }, [rideId, apiConfig, stopPolling, updateRideStatusSearching, clearCurrentRideSearching, navigation])

  // Effects
  useEffect(() => {
    startSearchAnimation()
    return () => {
      searchAnimation.stopAnimation()
    }
  }, [startSearchAnimation])

  useEffect(() => {
    loadRideData()
    
    if (isBookingInProgress) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [loadRideData, isBookingInProgress, startPolling, stopPolling])

  useEffect(() => {
    return () => {
      componentMountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    )
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorTitle}>Unable to load ride</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRideData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.homeButton} 
          onPress={() => navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Home" }],
            })
          )}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!rideData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No ride data available</Text>
      </View>
    )
  }

  // Get estimated wait time based on status and data
  const getEstimatedWaitTime = () => {
    if (currentRideStatus === "driver_assigned") return "Driver assigned"
    if (rideData.estimated_arrival_time) return rideData.estimated_arrival_time
    if (rideData.total_notifications_sent > 10) return "1-3 minutes"
    if (rideData.total_notifications_sent > 5) return "2-5 minutes"
    return "3-8 minutes"
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Home" }],
              })
            )} 
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finding your ride</Text>
        </View>

        {/* Search Animation */}
        <View style={styles.searchContainer}>
          <Animated.View style={animatedSearchStyle} />
          <View style={styles.carIcon}>
            <Text style={styles.carEmoji}>🚗</Text>
          </View>
        </View>

        {/* Status Message */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>{bookingStatusMessage}</Text>
          <Text style={styles.statusSubtitle}>
            Estimated wait time: {getEstimatedWaitTime()}
          </Text>
          {rideData.total_notifications_sent > 0 && (
            <Text style={styles.notificationsSent}>
              {rideData.total_notifications_sent} drivers notified
            </Text>
          )}
          {rideData.nearby_drivers_count > 0 && (
            <Text style={styles.driversFound}>
              {rideData.nearby_drivers_count} drivers nearby
            </Text>
          )}
        </View>

        {/* Ride Details */}
        <View style={styles.rideDetails}>
          <View style={styles.locationContainer}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {rideData.origin?.address || "Loading..."}
                </Text>
              </View>
            </View>

            <View style={styles.locationLine} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {rideData.destination?.address || "Loading..."}
                </Text>
              </View>
            </View>
          </View>

          {/* Ride Info */}
          <View style={styles.rideInfo}>
            <View style={styles.rideInfoRow}>
              <Text style={styles.rideInfoLabel}>Vehicle Type:</Text>
              <Text style={styles.rideInfoValue}>
                {rideData.vehicle_type?.toUpperCase() || "MINI"}
              </Text>
            </View>
            <View style={styles.rideInfoRow}>
              <Text style={styles.rideInfoLabel}>Estimated Fare:</Text>
              <Text style={styles.rideInfoValue}>
                ₹{(rideData.selectedRide?.estimatedFare || rideData.pricing?.total_fare || 0).toFixed(2)}
              </Text>
            </View>
            {rideData.route_info?.distance && (
              <View style={styles.rideInfoRow}>
                <Text style={styles.rideInfoLabel}>Distance:</Text>
                <Text style={styles.rideInfoValue}>{rideData.route_info.distance} km</Text>
              </View>
            )}
            {rideData.route_info?.duration && (
              <View style={styles.rideInfoRow}>
                <Text style={styles.rideInfoLabel}>Duration:</Text>
                <Text style={styles.rideInfoValue}>{rideData.route_info.duration} min</Text>
              </View>
            )}
            {rideData.ride_otp && (
              <View style={styles.rideInfoRow}>
                <Text style={styles.rideInfoLabel}>Ride OTP:</Text>
                <Text style={[styles.rideInfoValue, styles.otpText]}>{rideData.ride_otp}</Text>
              </View>
            )}
            {rideData.search_radius && (
              <View style={styles.rideInfoRow}>
                <Text style={styles.rideInfoLabel}>Search Radius:</Text>
                <Text style={styles.rideInfoValue}>{rideData.search_radius} km</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cancel Button */}
        {isBookingInProgress && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelBooking}
          >
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: "#000000",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  searchContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    marginVertical: 20,
  },
  searchCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#007AFF",
    opacity: 0.1,
    position: "absolute",
  },
  carIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  carEmoji: {
    fontSize: 24,
  },
  statusContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 4,
  },
  driversFound: {
    fontSize: 14,
    color: "#007AFF",
    textAlign: "center",
  },
  notificationsSent: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    marginTop: 4,
  },
  rideDetails: {
    backgroundColor: "#F8F9FA",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
    marginTop: 4,
    marginRight: 15,
  },
  destinationDot: {
    backgroundColor: "#FF3B30",
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E5E5E5",
    marginLeft: 5,
    marginVertical: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  locationAddress: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 20,
  },
  rideInfo: {
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 15,
  },
  rideInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rideInfoLabel: {
    fontSize: 14,
    color: "#666666",
  },
  rideInfoValue: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  otpText: {
    color: "#007AFF",
    fontWeight: "700",
    fontSize: 16,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 10,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  homeButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  homeButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 30,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})