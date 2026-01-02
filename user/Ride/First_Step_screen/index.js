import { useState, useEffect, useRef, useCallback } from "react"
import { View, StatusBar, Text, Keyboard, TextInput, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Location from "expo-location"
import { useNavigation, useRoute } from "@react-navigation/native"
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { Platform, StyleSheet } from "react-native"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useGuest } from "../../context/GuestLoginContext"
import { useLocation } from "../../context/LocationContext"
import { useTrack } from "../../hooks/useTrack"
import usePastRides from "../../hooks/PastRides"
import haversine from "haversine-distance"
import useSettings from "../../hooks/Settings"

const GOOGLE_MAPS_API_KEY = "AIzaSyBfRHuTByG6CiXtLbyzK_aKNpJfDiB4jUo"
const INDIA_REGION = {
  center: { latitude: 20.5937, longitude: 78.9629 },
  minLat: 8.4, maxLat: 35.5,
  minLng: 68.7, maxLng: 97.25
}

// Cache keys
const CACHE_KEYS = {
  LOCATION: '@location_cache',
  GEOCODE: '@geocode_cache_',
  AUTOCOMPLETE: '@autocomplete_cache_'
}

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  LOCATION: 5 * 60 * 1000, // 5 minutes
  GEOCODE: 24 * 60 * 60 * 1000, // 24 hours
  AUTOCOMPLETE: 60 * 60 * 1000 // 1 hour
}

const RideLocationSelector = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { isChardham, isLater } = route.params || { isChardham: false }
  const { track } = useTrack()
  const { isGuest } = useGuest()
  const { location: contextLocation } = useLocation()
  const { settings, refetch } = useSettings()
  const [state, setState] = useState({
    pickup: "",
    dropoff: "",
    pickupSuggestions: [],
    dropoffSuggestions: [],
    loading: false,
    activeInput: null,
    showMap: false,
    mapType: null,
    isFetchingLocation: false,
    locationPermissionGranted: false,
    pickupFocused: false,
    dropoffFocused: false
  })
  // console.log("isLater",isLater)

  const [rideData, setRideData] = useState({
    pickup: { latitude: 0, longitude: 0, description: "" },
    dropoff: { latitude: 0, longitude: 0, description: "" }
  })

  const [region, setRegion] = useState({
    latitude: INDIA_REGION.center.latitude,
    longitude: INDIA_REGION.center.longitude,
    latitudeDelta: 20,
    longitudeDelta: 20
  })

  const { rides, loading } = usePastRides()
  const [pastRides, setPastRides] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)

  const autocompleteTimerRef = useRef(null)
  const pickupInputRef = useRef(null)
  const dropoffInputRef = useRef(null)
  const sessionTokenRef = useRef(null)
  const isPickupProgrammaticUpdate = useRef(false)
  const isDropoffProgrammaticUpdate = useRef(false)

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null

    const point1 = { latitude: lat1, longitude: lon1 }
    const point2 = { latitude: lat2, longitude: lon2 }

    const distanceInMeters = haversine(point1, point2)
    const distanceInKm = (distanceInMeters / 1000).toFixed(1)

    return distanceInKm
  }

  // Cache utilities
  const getCachedData = async (key) => {
    try {
      const cached = await AsyncStorage.getItem(key)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const expiryTime = key.includes('location') ? CACHE_EXPIRY.LOCATION :
          key.includes('geocode') ? CACHE_EXPIRY.GEOCODE :
            CACHE_EXPIRY.AUTOCOMPLETE

        if (Date.now() - timestamp < expiryTime) {
          return data
        }
      }
    } catch (error) {
      console.error('Cache read error:', error)
    }
    return null
  }
  useEffect(() => {
    refetch()
  }, [])

  const setCachedData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  // Generate session token for autocomplete
  const generateSessionToken = () => {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    )
  }

  // Request location permission and get current location with caching
  const requestLocationPermission = useCallback(async () => {
    try {
      // Check cache first
      const cachedLocation = await getCachedData(CACHE_KEYS.LOCATION)
      if (cachedLocation) {
        setCurrentLocation(cachedLocation)
        setState(prev => ({
          ...prev,
          locationPermissionGranted: true,
          isFetchingLocation: false
        }))
        await reverseGeocode(cachedLocation.coords.latitude, cachedLocation.coords.longitude, 'pickup')
        return
      }

      setState(prev => ({ ...prev, isFetchingLocation: true }))

      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 10000
        })

        if (location) {
          setCurrentLocation(location)
          await setCachedData(CACHE_KEYS.LOCATION, location)

          setState(prev => ({
            ...prev,
            locationPermissionGranted: true,
            isFetchingLocation: false
          }))

          await reverseGeocode(location.coords.latitude, location.coords.longitude, 'pickup')
        }
      } else {
        setState(prev => ({
          ...prev,
          locationPermissionGranted: false,
          isFetchingLocation: false
        }))
      }
    } catch (error) {
      console.error("Location permission error:", error)
      setState(prev => ({ ...prev, isFetchingLocation: false }))
    }
  }, [])

  // Reverse geocode with caching
  const reverseGeocode = async (latitude, longitude, inputType) => {
    try {
      const cacheKey = `${CACHE_KEYS.GEOCODE}${latitude.toFixed(4)}_${longitude.toFixed(4)}`
      const cached = await getCachedData(cacheKey)

      let address
      if (cached) {
        address = cached
      } else {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${settings ? settings?.googleApiKey : GOOGLE_MAPS_API_KEY}`
        )
        const data = await response.json()

        if (data.results && data.results[0]) {
          address = data.results[0].formatted_address
          await setCachedData(cacheKey, address)
        }
      }

      if (address) {
        if (inputType === 'pickup') {
          isPickupProgrammaticUpdate.current = true
          setState(prev => ({ ...prev, pickup: address }))
          setRideData(prev => ({
            ...prev,
            pickup: { latitude, longitude, description: address }
          }))
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          })
          setTimeout(() => {
            isPickupProgrammaticUpdate.current = false
          }, 100)
        } else {
          isDropoffProgrammaticUpdate.current = true
          setState(prev => ({ ...prev, dropoff: address }))
          setRideData(prev => ({
            ...prev,
            dropoff: { latitude, longitude, description: address }
          }))
          setTimeout(() => {
            isDropoffProgrammaticUpdate.current = false
          }, 100)
        }
      }
    } catch (error) {
      console.error("Reverse geocode error:", error)
    }
  }


  // Google Places Autocomplete with caching
  const fetchAutocompleteSuggestions = async (input, inputType) => {
    if (!input || input.length < 2) {
      if (inputType === 'pickup') {
        setState(prev => ({ ...prev, pickupSuggestions: [] }))
      } else {
        setState(prev => ({ ...prev, dropoffSuggestions: [] }))
      }
      return
    }

    // Check cache
    const cacheKey = `${CACHE_KEYS.AUTOCOMPLETE}${input.toLowerCase()}`
    const cached = await getCachedData(cacheKey)

    if (cached) {
      if (inputType === 'pickup') {
        setState(prev => ({ ...prev, pickupSuggestions: cached }))
      } else {
        setState(prev => ({ ...prev, dropoffSuggestions: cached }))
      }
      return
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken()
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${settings ? settings?.googleApiKey : GOOGLE_MAPS_API_KEY}&sessiontoken=${sessionTokenRef.current}&components=country:in`
      )
      const data = await response.json()

      if (data.predictions) {
        await setCachedData(cacheKey, data.predictions)

        if (inputType === 'pickup') {
          setState(prev => ({ ...prev, pickupSuggestions: data.predictions }))
        } else {
          setState(prev => ({ ...prev, dropoffSuggestions: data.predictions }))
        }
      }
    } catch (error) {
      console.error("Autocomplete error:", error)
    }
  }

  // Get place details
  const getPlaceDetails = async (placeId) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${settings ? settings?.googleApiKey : GOOGLE_MAPS_API_KEY}&sessiontoken=${sessionTokenRef.current}`
      )
      const data = await response.json()

      sessionTokenRef.current = null

      if (data.result) {
        return {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          description: data.result.formatted_address
        }
      }
      return null
    } catch (error) {
      console.error("Place details error:", error)
      return null
    }
  }



  // Handle text input change
  const handleInputChange = (text, inputType) => {
    if (inputType === 'pickup') {
      setState(prev => ({ ...prev, pickup: text, activeInput: 'pickup' }))
    } else {
      setState(prev => ({ ...prev, dropoff: text, activeInput: 'dropoff' }))
    }

    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current)
    }

    autocompleteTimerRef.current = setTimeout(() => {
      fetchAutocompleteSuggestions(text, inputType)
    }, 300)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion, inputType) => {
    Keyboard.dismiss()
    setState(prev => ({ ...prev, loading: true }))

    const placeDetails = await getPlaceDetails(suggestion.place_id)

    if (placeDetails) {
      if (inputType === 'pickup') {
        isPickupProgrammaticUpdate.current = true
        setState(prev => ({
          ...prev,
          pickup: placeDetails.description,
          pickupSuggestions: [],
          activeInput: null,
          loading: false
        }))
        setRideData(prev => ({
          ...prev,
          pickup: placeDetails
        }))
        setRegion({
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        })
        setTimeout(() => {
          isPickupProgrammaticUpdate.current = false
          dropoffInputRef.current?.focus()
        }, 100)
      } else {
        isDropoffProgrammaticUpdate.current = true
        setState(prev => ({
          ...prev,
          dropoff: placeDetails.description,
          dropoffSuggestions: [],
          activeInput: null,
          loading: false
        }))
        setRideData(prev => ({
          ...prev,
          dropoff: placeDetails
        }))
        setTimeout(() => {
          isDropoffProgrammaticUpdate.current = false
        }, 100)
      }
    } else {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // Handle map region change
  const handleMapRegionChange = async (newRegion) => {
    const constrainedRegion = {
      ...newRegion,
      latitude: Math.min(Math.max(newRegion.latitude, INDIA_REGION.minLat), INDIA_REGION.maxLat),
      longitude: Math.min(Math.max(newRegion.longitude, INDIA_REGION.minLng), INDIA_REGION.maxLng)
    }
    setRegion(constrainedRegion)
  }

  // Confirm map selection
  const handleConfirmMapLocation = async () => {
    await reverseGeocode(region.latitude, region.longitude, state.mapType)
    setState(prev => ({ ...prev, showMap: false }))

    if (state.mapType === 'pickup') {
      setTimeout(() => dropoffInputRef.current?.focus(), 100)
    }
  }

  // Handle use current location
  const handleUseCurrentLocation = async () => {
    if (currentLocation) {
      await reverseGeocode(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        'pickup'
      )
      setTimeout(() => dropoffInputRef.current?.focus(), 100)
    } else {
      await requestLocationPermission()
    }
  }


  // Handle submit
  const handleSubmit = useCallback(() => {
    if (isGuest) {
      alert("To book a ride, please create an account.")
      navigation.navigate("Onboarding")
      return
    }

    if (!rideData.pickup.latitude || !rideData.dropoff.latitude) {
      alert("Please select both pickup and drop-off locations")
      return
    }

    const navigationData = {
      ...rideData,       // pickup, dropoff, timestamp, etc
      isLater,           // true/false
      isChardham         // true/false
    };

    track("ACTION", "RideBooking", "User Enter a Pickup and drop location and click find riders", navigationData);
    navigation.navigate("second_step_of_booking", { data: navigationData, isLater: isLater });

  }, [isGuest, rideData, navigation, isChardham, isLater, track])

  useEffect(() => {
    if (
      rideData.pickup.latitude &&
      rideData.dropoff.latitude &&
      rideData.pickup.description &&
      rideData.dropoff.description
    ) {
      setTimeout(() => {
        handleSubmit()
      }, 200)
    }
  }, [
    rideData.pickup.latitude,
    rideData.pickup.longitude,
    rideData.pickup.description,
    rideData.dropoff.latitude,
    rideData.dropoff.longitude,
    rideData.dropoff.description,
    rideData.timestamp
  ])

  // Initialize
  useEffect(() => {
    requestLocationPermission()
    setPastRides(rides)
  }, [rides])

  // Map view
  if (state.showMap) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.mapHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setState(prev => ({ ...prev, showMap: false }))}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.mapHeaderTitle}>
            Select {state.mapType === "pickup" ? "Pickup" : "Drop-off"} Location
          </Text>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={styles.map}
            region={region}
            onRegionChangeComplete={handleMapRegionChange}
            showsUserLocation
            showsMyLocationButton
            showsCompass
          />

          <View style={styles.centerMarker}>
            <Icon name="map-marker" size={50} color={state.mapType === "pickup" ? "#000" : "#000"} />
          </View>
        </View>

        <View style={styles.mapFooter}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmMapLocation}
          >
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Main view
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Your Ride</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputsContainer}>
          <View style={styles.inputsWrapper}>
            <View style={styles.dotIndicators}>
              <View style={styles.greenDot} />
              <View style={styles.dottedLine} />
              <View style={styles.redDot} />
            </View>

            <View style={styles.inputs}>
              {/* Pickup Input */}
              <View style={[styles.inputContainer, state.activeInput === 'pickup' && styles.inputContainerActive]}>
                <TextInput
                  ref={pickupInputRef}
                  style={styles.input}
                  placeholder="Pickup location"
                  placeholderTextColor="#999"
                  value={state.pickup}
                  multiline={false}
                  numberOfLines={1}
                  blurOnSubmit={true}
                  returnKeyType="done"
                  textAlignVertical="center"
                  selection={isPickupProgrammaticUpdate.current ? { start: 0, end: 0 } : undefined}
                  onChangeText={(text) => handleInputChange(text, 'pickup')}
                  onFocus={() => {
                    setState(prev => ({ ...prev, activeInput: 'pickup', pickupFocused: true }))
                  }}
                  onBlur={() => {
                    setState(prev => ({ ...prev, pickupFocused: false }))
                  }}
                />
                <View style={styles.inputActions}>
                  {state.pickup ? (
                    <TouchableOpacity onPress={() => {
                      setState(prev => ({ ...prev, pickup: '', pickupSuggestions: [] }))
                      setRideData(prev => ({ ...prev, pickup: { latitude: 0, longitude: 0, description: "" } }))
                    }}>
                      <Icon name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => setState(prev => ({ ...prev, showMap: true, mapType: 'pickup' }))}
                    style={styles.mapIconButton}
                  >
                    <Icon name="map-marker-outline" size={20} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dropoff Input */}
              <View style={[styles.inputContainer, state.activeInput === 'dropoff' && styles.inputContainerActive]}>
                <TextInput
                  ref={dropoffInputRef}
                  style={styles.input}
                  placeholder="Drop-off location"
                  placeholderTextColor="#999"
                  multiline={false}
                  numberOfLines={1}
                  blurOnSubmit={true}
                  returnKeyType="done"
                  textAlignVertical="center"
                  value={state.dropoff}
                  selection={isDropoffProgrammaticUpdate.current ? { start: 0, end: 0 } : undefined}
                  onChangeText={(text) => handleInputChange(text, 'dropoff')}
                  onFocus={() => {
                    setState(prev => ({ ...prev, activeInput: 'dropoff', dropoffFocused: true }))
                  }}
                  onBlur={() => {
                    setState(prev => ({ ...prev, dropoffFocused: false }))
                  }}
                />
                <View style={styles.inputActions}>
                  {state.dropoff ? (
                    <TouchableOpacity onPress={() => {
                      setState(prev => ({ ...prev, dropoff: '', dropoffSuggestions: [] }))
                      setRideData(prev => ({ ...prev, dropoff: { latitude: 0, longitude: 0, description: "" } }))
                    }}>
                      <Icon name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => setState(prev => ({ ...prev, showMap: true, mapType: 'dropoff' }))}
                    style={styles.mapIconButton}
                  >
                    <Icon name="map-marker-outline" size={20} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Current Location Button */}
          {state.activeInput === 'pickup' && !state.pickup && (
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
            >
              <Icon name="crosshairs-gps" size={20} color="#000" />
              <Text style={styles.currentLocationText}>Use current location</Text>
              {state.isFetchingLocation && <ActivityIndicator size="small" color="#000" />}
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions List for Pickup */}
        {state.activeInput === 'pickup' && state.pickupSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={state.pickupSuggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(item, 'pickup')}
                >
                  <Icon name="map-marker-outline" size={20} color="#666" />
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionMainText}>{item.structured_formatting.main_text}</Text>
                    <Text style={styles.suggestionSecondaryText}>{item.structured_formatting.secondary_text}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Suggestions List for Dropoff with Distance */}
        {state.activeInput === 'dropoff' && state.dropoffSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={state.dropoffSuggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => {
                // Calculate distance if pickup location is set
                let distance = null
                if (rideData.pickup.latitude && rideData.pickup.longitude) {
                  // We'll need to get coordinates for the suggestion
                  // For now, we'll fetch it when rendering
                  // Note: In production, you might want to batch these requests
                }

                return (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(item, 'dropoff')}
                  >
                    <Icon name="map-marker-outline" size={20} color="#666" />
                    <View style={styles.suggestionTextContainer}>
                      <View style={styles.suggestionTextRow}>
                        <View style={styles.suggestionTextLeft}>
                          <Text style={styles.suggestionMainText}>{item.structured_formatting.main_text}</Text>
                          <Text style={styles.suggestionSecondaryText}>{item.structured_formatting.secondary_text}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        )}

        {/* Past Rides Section */}
        {!state.activeInput && (
          <View style={styles.pastRidesContainer}>
            <Text style={styles.sectionTitle}>Recent Rides</Text>

            {loading ? (
              <ActivityIndicator size="small" color="#0d6efd" />
            ) : pastRides.length === 0 ? (
              <Text style={styles.noRidesText}>No past rides available.</Text>
            ) : (
              <View style={{ height: 500 }}>
                <FlatList
                  data={pastRides.slice(0, 5)}
                  keyExtractor={(item, index) => `past-${index}`}
                  renderItem={({ item }) => {
                    // Calculate distance from current pickup location
                    let distance = null
                    if (rideData.pickup.latitude && rideData.pickup.longitude &&
                      item.drop_location?.coordinates) {
                      distance = calculateDistance(
                        rideData.pickup.latitude,
                        rideData.pickup.longitude,
                        item.drop_location.coordinates[1],
                        item.drop_location.coordinates[0]
                      )
                    }

                    return (
                      <TouchableOpacity
                        style={styles.pastRideItem}
                        onPress={() => {
                          isDropoffProgrammaticUpdate.current = true

                          setState(prev => ({
                            ...prev,
                            dropoff: item.drop_address?.formatted_address
                          }))

                          setRideData(prev => ({
                            ...prev,
                            dropoff: {
                              latitude: item.drop_location.coordinates[1],
                              longitude: item.drop_location.coordinates[0],
                              description: item.drop_address?.formatted_address
                            },
                            timestamp: Date.now()
                          }))

                          setTimeout(() => {
                            isDropoffProgrammaticUpdate.current = false
                          }, 100)
                        }}
                      >
                        <Icon name="history" size={20} color="#666" />
                        <View style={styles.pastRideTextContainer}>
                          <Text style={styles.pastRideMainText}>
                            {item.drop_address?.formatted_address}
                          </Text>
                          {distance && (
                            <View style={styles.distanceBadge}>
                              <Text style={styles.distanceText}>{distance} km</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {state.loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000'
  },
  content: {
    flex: 1
  },
  inputsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  inputsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  dotIndicators: {
    alignItems: 'center',
    paddingTop: 20,
    marginRight: 12
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000'
  },

  dottedLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E5E5E5',
    marginVertical: 4
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000'
  },
  inputs: {
    flex: 1
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  inputContainerActive: {
    borderColor: '#000',
    backgroundColor: '#FFFFFF'
  },
  input: {
    flex: 1,
    fontSize: 16,
    textAlignVertical: 'center',
    color: '#000',
    paddingVertical: 12
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  mapIconButton: {
    padding: 4
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 8,
    gap: 12
  },
  currentLocationText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500'
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    maxHeight: 400
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12
  },
  suggestionTextContainer: {
    flex: 1
  },
  suggestionMainText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2
  },
  suggestionSecondaryText: {
    fontSize: 13,
    color: '#666'
  },
  pastRidesContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12
  },
  noRidesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20
  },
  pastRideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12
  },
  pastRideTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pastRideMainText: {
    fontSize: 14,
    color: '#000',
    flex: 1
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  mapHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  mapContainer: {
    flex: 1,
    position: 'relative'
  },
  map: {
    flex: 1
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -50,
    alignItems: 'center'
  },
  mapFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  confirmButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  }
})

export default RideLocationSelector