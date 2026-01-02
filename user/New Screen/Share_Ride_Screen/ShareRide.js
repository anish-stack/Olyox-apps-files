"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  Linking,
  ScrollView,
  StatusBar,
  Platform,
  SafeAreaView,
} from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { Ionicons } from "@expo/vector-icons"
import axios from "axios"
import useSettings from "../../hooks/Settings"

const { width, height } = Dimensions.get("window")

// Constants
const GOOGLE_MAPS_APIKEY = "AIzaSyBfRHuTByG6CiXtLbyzK_aKNpJfDiB4jUo"
const LATITUDE_DELTA = 0.015
const LONGITUDE_DELTA = 0.015
const REACH_THRESHOLD = 100
const NEARBY_THRESHOLD = 200
const DRIVER_LOCATION_UPDATE_INTERVAL = 5000 // 5 seconds



// Utility functions
const formatDistance = (distanceInMeters) => {
  if (!distanceInMeters || distanceInMeters <= 0) return "0m"
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`
  } else {
    const km = distanceInMeters / 1000
    return `${km.toFixed(1)}km`
  }
}



export default function ShareRideScreen({ route }) {
  const { rideId } = route.params || {}
  const mapRef = useRef(null)

  // State management
  const [bookingData, setBookingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sosModalVisible, setSosModalVisible] = useState(false)
  const [driverLocation, setDriverLocation] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const { settings, refetch } = useSettings()

  // Fetch booking details
  const fetchBookingDetails = async () => {
    try {
      await refetch()
      const response = await axios.get(`https://www.appv2.olyox.com/api/v1/new/booking-details/${rideId}`)
      if (response.data.success) {
        const booking = response.data.Bookings
        setBookingData(booking)

        // Set initial locations
        if (booking.pickup_location) {
          setUserLocation({
            latitude: booking.pickup_location.coordinates[1],
            longitude: booking.pickup_location.coordinates[0],
          })
        }

        // Set driver location (using pickup as default, in real app this would be driver's current location)
        if (booking.pickup_location) {
          setDriverLocation({
            latitude: booking.pickup_location.coordinates[1] + 0.001, // Slight offset for demo
            longitude: booking.pickup_location.coordinates[0] + 0.001,
          })
        }
      }
      setLoading(false)
    } catch (err) {
      console.error("Error fetching booking details:", err)
      setError("Failed to load booking details")
      setLoading(false)
    }
  }

  // Update locations every 5 seconds
  useEffect(() => {
    if (rideId) {
      fetchBookingDetails()

      const interval = setInterval(() => {
        fetchBookingDetails()
      }, DRIVER_LOCATION_UPDATE_INTERVAL)

      return () => clearInterval(interval)
    }
  }, [rideId])

  // Fit map to show both locations
  const fitMapToCoordinates = () => {
    if (mapRef.current && userLocation && driverLocation) {
      const coordinates = [userLocation, driverLocation]
      if (bookingData?.drop_location) {
        coordinates.push({
          latitude: bookingData.drop_location.coordinates[1],
          longitude: bookingData.drop_location.coordinates[0],
        })
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      })
    }
  }

  useEffect(() => {
    if (userLocation && driverLocation) {
      setTimeout(fitMapToCoordinates, 1000)
    }
  }, [userLocation, driverLocation])

  // SOS Functions
  const handleSOSCall = (type) => {
    let phoneNumber = ""
    switch (type) {
      case "police":
        phoneNumber = "100"
        break
      case "ambulance":
        phoneNumber = "108"
        break
      case "olyox":
        phoneNumber = "+911234567890" // Replace with actual Olyox support number
        break
    }

    Linking.openURL(`tel:${phoneNumber}`)
    setSosModalVisible(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !bookingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color="#FF6B35" />
          <Text style={styles.errorText}>{error || "No ride data available"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookingDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const pickupCoords = {
    latitude: bookingData.pickup_location.coordinates[1],
    longitude: bookingData.pickup_location.coordinates[0],
  }

  const dropCoords = {
    latitude: bookingData.drop_location.coordinates[1],
    longitude: bookingData.drop_location.coordinates[0],
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={{
            ...pickupCoords,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Pickup Marker */}
          <Marker coordinate={pickupCoords} title="Pickup Location">
            <View style={styles.pickupMarker}>
              <Ionicons name="person" size={20} color="#4CAF50" />
            </View>
          </Marker>

          {/* Drop Marker */}
          <Marker coordinate={dropCoords} title="Drop Location">
            <View style={styles.dropMarker}>
              <Ionicons name="location" size={24} color="#FF6B35" />
            </View>
          </Marker>

          {/* Driver Marker */}
          {driverLocation && (
            <Marker coordinate={driverLocation} title="Driver Location">
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={20} color="#2196F3" />
              </View>
            </Marker>
          )}

          {/* Route Directions */}
          <MapViewDirections
            origin={pickupCoords}
            destination={dropCoords}
            apikey={settings ? settings?.googleApiKey : GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor="#2196F3"
            optimizeWaypoints={true}
          />
        </MapView>

        {/* SOS Button */}
        <TouchableOpacity style={styles.sosButton} onPress={() => setSosModalVisible(true)}>
          <Ionicons name="warning" size={24} color="#fff" />
          <Text style={styles.sosButtonText}>SOS</Text>
        </TouchableOpacity>

        {/* Fit to Route Button */}
        <TouchableOpacity style={styles.fitButton} onPress={fitMapToCoordinates}>
          <Ionicons name="resize" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Ride Details Panel */}
      <View style={styles.detailsPanel}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Ride Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{bookingData.ride_status.replace("_", " ").toUpperCase()}</Text>
            </View>
            <Text style={styles.rideOtp}>OTP: {bookingData.ride_otp}</Text>
          </View>

          {/* Driver Info */}
          {bookingData.driver && (
            <View style={styles.driverInfo}>
              <View style={styles.driverHeader}>
                <Ionicons name="person-circle" size={40} color="#2196F3" />
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{bookingData.driver.name}</Text>
                  <Text style={styles.driverPhone}>{bookingData.driver.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${bookingData.driver.phone}`)}
                >
                  <Ionicons name="call" size={20} color="#4CAF50" />
                </TouchableOpacity>
              </View>

              {/* Vehicle Info */}
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleText}>
                  {bookingData.driver.rideVehicleInfo.vehicleName} • {bookingData.driver.rideVehicleInfo.VehicleNumber}
                </Text>
                <Text style={styles.vehicleType}>{bookingData.vehicle_type.toUpperCase()}</Text>
              </View>
            </View>
          )}

          {/* Route Info */}
          <View style={styles.routeInfo}>
            <View style={styles.routeItem}>
              <Ionicons name="location-outline" size={16} color="#4CAF50" />
              <Text style={styles.routeText} numberOfLines={2}>
                {bookingData.pickup_address.formatted_address}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <Ionicons name="location" size={16} color="#FF6B35" />
              <Text style={styles.routeText} numberOfLines={2}>
                {bookingData.drop_address.formatted_address}
              </Text>
            </View>
          </View>

          {/* Trip Details */}
          <View style={styles.tripDetails}>
            <View style={styles.tripItem}>
              <Text style={styles.tripLabel}>Distance</Text>
              <Text style={styles.tripValue}>{formatDistance(bookingData.route_info.distance * 1000)}</Text>
            </View>
            <View style={styles.tripItem}>
              <Text style={styles.tripLabel}>Duration</Text>
              <Text style={styles.tripValue}>{bookingData.route_info.duration} min</Text>
            </View>
            <View style={styles.tripItem}>
              <Text style={styles.tripLabel}>ETA</Text>
              <Text style={styles.tripValue}>{bookingData.eta} min</Text>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.pricingContainer}>
            <Text style={styles.pricingTitle}>Fare Details</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Base Fare</Text>
              <Text style={styles.pricingValue}>₹{bookingData.pricing.base_fare}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Distance Fare</Text>
              <Text style={styles.pricingValue}>₹{bookingData.pricing.distance_fare.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Time Fare</Text>
              <Text style={styles.pricingValue}>₹{bookingData.pricing.time_fare.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Platform Fee</Text>
              <Text style={styles.pricingValue}>₹{bookingData.pricing.platform_fee.toFixed(2)}</Text>
            </View>
            <View style={[styles.pricingRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Fare</Text>
              <Text style={styles.totalValue}>₹{bookingData.pricing.total_fare.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* SOS Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sosModalVisible}
        onRequestClose={() => setSosModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Emergency SOS</Text>
            <Text style={styles.modalSubtitle}>Choose emergency service</Text>

            <TouchableOpacity
              style={[styles.sosOption, { backgroundColor: "#FF4444" }]}
              onPress={() => handleSOSCall("police")}
            >
              <Ionicons name="shield" size={24} color="#fff" />
              <Text style={styles.sosOptionText}>Call Police (100)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sosOption, { backgroundColor: "#FF6B35" }]}
              onPress={() => handleSOSCall("ambulance")}
            >
              <Ionicons name="medical" size={24} color="#fff" />
              <Text style={styles.sosOptionText}>Call Ambulance (108)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sosOption, { backgroundColor: "#2196F3" }]}
              onPress={() => handleSOSCall("olyox")}
            >
              <Ionicons name="headset" size={24} color="#fff" />
              <Text style={styles.sosOptionText}>Call Olyox Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setSosModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 0.6,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  pickupMarker: {
    backgroundColor: "rgba(76, 175, 80, 0.5)",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  dropMarker: {
    backgroundColor: "rgba(255, 107, 53, 0.5)",

    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  driverMarker: {
    backgroundColor: "rgba(33, 150, 243, 0.5)",

    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  sosButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#FF4444",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sosButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 5,
  },
  fitButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  detailsPanel: {
    flex: 0.4,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  statusBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  rideOtp: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  driverInfo: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  driverDetails: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  driverPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  callButton: {
    // backgroundColor: "#4CAF50",
    padding: 8,
    borderRadius: 20,
  },
  vehicleInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleText: {
    fontSize: 14,
    color: "#666",
  },
  vehicleType: {
    fontSize: 12,
    color: "#2196F3",
    fontWeight: "600",
  },
  routeInfo: {
    marginBottom: 15,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 5,
  },
  routeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#ddd",
    marginLeft: 7,
    marginVertical: 2,
  },
  tripDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  tripItem: {
    alignItems: "center",
  },
  tripLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  tripValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  pricingContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  pricingLabel: {
    fontSize: 14,
    color: "#666",
  },
  pricingValue: {
    fontSize: 14,
    color: "#333",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2196F3",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: width * 0.85,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  sosOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
    width: "100%",
  },
  sosOptionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    width: "100%",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
})
