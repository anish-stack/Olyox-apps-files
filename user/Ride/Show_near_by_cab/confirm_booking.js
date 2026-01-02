import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  ToastAndroid,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";
import * as Location from "expo-location";
import axios from "axios";
import {
  Camera,
  Car,
  Clock,
  MapPin,
  Users,
  CreditCard,
  CircleAlert as AlertCircle,
  ArrowLeft,
  CircleCheck as CheckCircle,
  X,
} from "lucide-react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { tokenCache } from "../../Auth/cache";
import { useLocation } from "../../context/LocationContext";
import { useRide } from "../../context/RideContext";
import useNotificationPermission from "../../hooks/notification";
import MapViewDirections from "react-native-maps-directions";
import useSettings from "../../hooks/Settings";
import { useRideSearching } from "../../context/ride_searching";
import {
  DELHI_NCR_BOUNDS,
  VCOLORS,
  GOOGLE_MAPS_APIKEY,
  POLLING_INTERVAL,
  RIDER_CHECK_INTERVAL,
  BOOKING_TIMEOUT,
  decodePolyline,
} from "../../constants/colors";
import { find_me } from "../../utils/helpers";
import { useTrack } from "../../hooks/useTrack";

const { width, height } = Dimensions.get("window");
const isAndroid = Platform.OS === "android";

const showNotification = (title, message, type = "info") => {
  if (title?.toLowerCase() === "ride not found") {
    return;
  }

  const displayMessage = `${title ? title + "\n" : ""}${message}`;

  if (Platform.OS === "android") {
    ToastAndroid.show(
      displayMessage,
      type === "error" || message.length > 60
        ? ToastAndroid.LONG
        : ToastAndroid.SHORT
    );
  } else {
    Alert.alert(
      title ||
      (type === "success"
        ? "Success!"
        : type === "error"
          ? "Error!"
          : "Notification"),
      message
    );
  }
};

const isLocationInDelhiNCR = (latitude, longitude) => {
  return (
    latitude >= DELHI_NCR_BOUNDS.south &&
    latitude <= DELHI_NCR_BOUNDS.north &&
    longitude >= DELHI_NCR_BOUNDS.west &&
    longitude <= DELHI_NCR_BOUNDS.east
  );
};

export default function BookingConfirmation() {
  const route = useRoute();
  const navigation = useNavigation();
  const { location: contextLocation } = useLocation();
  const { saveRide, updateRideStatus } = useRide();
  const { track } = useTrack();
  const {
    saveRideSearching,
    updateRideStatusSearching,
    clearCurrentRideSearching,
  } = useRideSearching();
  const { fcmToken } = useNotificationPermission();
  const { settings } = useSettings();
  const { origin, destination, selectedRide, dropoff, pickup } =
    route.params || {};

  // Core State
  const [currentLocation, setCurrentLocation] = useState(
    contextLocation?.coords || null
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(
    !contextLocation?.coords
  );
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [bookingStatusMessage, setBookingStatusMessage] = useState(
    "Preparing your ride..."
  );

  // Cashback State
  const [isCashbackApply, setIsCashBackApply] = useState(false);
  const [cashback, setCashback] = useState(0);

  // Ride State
  const [currentRide, setCurrentRide] = useState(null);
  const [currentRideStatus, setCurrentRideStatus] = useState("pending");
  const [rideOtp, setRideOtp] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [createdRideId, setCreatedRideId] = useState(null);
  const [rideCompleted, setRideCompleted] = useState(false);

  // Map & Location State
  const [coordinates, setCoordinates] = useState([]);
  const [ridersNearYou, setRidersNearYou] = useState([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Pooling State
  const [ridePoolingEnabled, setRidePoolingEnabled] = useState(false);
  const [poolingTimer, setPoolingTimer] = useState(null);

  // Refs
  const pollingRef = useRef(null);
  const riderCheckRef = useRef(null);
  const bookingTimeoutRef = useRef(null);
  const poolingTimeoutRef = useRef(null);
  const mapRef = useRef(null);
  const isActiveRef = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lastPollingTime = useRef(0);

  // Memoized fare calculation
  const farePayload = useMemo(() => {
    const baseFare = selectedRide?.totalPrice || 0;
    const appliedCashback = isCashbackApply ? cashback : 0;
    const finalFare = Math.max(1, baseFare - appliedCashback);

    return {
      base_fare: selectedRide?.pricing?.baseFare || 0,
      distance_fare: selectedRide?.pricing?.distanceCost || 0,
      time_fare: selectedRide?.pricing?.timeCost || 0,
      platform_fee: selectedRide?.pricing?.fuelSurcharge || 0,
      night_charge: selectedRide?.pricing?.nightSurcharge || 0,
      rain_charge: selectedRide?.conditions?.rain
        ? selectedRide?.pricing?.rainCharge || 10
        : 0,
      toll_charge: selectedRide?.pricing?.tollCost || 0,
      discount: selectedRide?.pricing?.discount || 0,
      total_fare: finalFare,
      original_fare: baseFare,
      cashback_applied: appliedCashback,
      currency: selectedRide?.pricing?.currency || "INR",
      is_pooling: ridePoolingEnabled,
    };
  }, [selectedRide, ridePoolingEnabled, isCashbackApply, cashback]);

  const isLocationValid = useMemo(() => {
    if (!origin || !destination) return false;
    return (
      isLocationInDelhiNCR(origin.latitude, origin.longitude) &&
      isLocationInDelhiNCR(destination.latitude, destination.longitude)
    );
  }, [origin, destination]);

  const vehicleIcon = useMemo(() => {
    const vehicleType =
      selectedRide?.vehicleType || selectedRide?.vehicleName || "";
    return vehicleType.toLowerCase().includes("bike") ||
      vehicleType.toLowerCase().includes("motorcycle")
      ? "motorbike"
      : "car";
  }, [selectedRide]);

  const mapRegion = useMemo(() => {
    if (!origin) return null;
    return {
      latitude: origin.latitude,
      longitude: origin.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [origin]);

  const isBookingDisabled = useMemo(() => {
    return (
      !selectedRide ||
      !currentLocation ||
      isCreatingRide ||
      !isLocationValid ||
      // ridersNearYou.length === 0 ||
      isLoadingRiders
    );
  }, [
    selectedRide,
    currentLocation,
    isCreatingRide,
    isLocationValid,
    ridersNearYou.length,
    isLoadingRiders,
  ]);

  // Cleanup function
  const cleanup = useCallback(() => {
    [pollingRef, riderCheckRef, bookingTimeoutRef, poolingTimeoutRef].forEach(
      (ref) => {
        if (ref.current) {
          if (ref === pollingRef || ref === riderCheckRef) {
            clearInterval(ref.current);
          } else {
            clearTimeout(ref.current);
          }
          ref.current = null;
        }
      }
    );
  }, []);

  const stopBookingProcess = useCallback(
    (reason) => {
      setIsBookingInProgress(false);
      setRideCompleted(true);
      cleanup();
    },
    [cleanup]
  );

  // Fetch nearby riders
  const fetchNearByRiders = useCallback(async () => {
    if (!origin || !selectedRide || !isActiveRef.current || isLoadingRiders)
      return;

    setIsLoadingRiders(true);
    setLocationError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await axios.post(
        "https://www.appv2.olyox.com/api/v1/new/find-rider-near-user",
        {
          lat: origin.latitude,
          lng: origin.longitude,
          vehicleType: selectedRide.vehicleName || selectedRide.vehicleType,
        },
        {
          timeout: 8000,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.data?.success && Array.isArray(response.data?.data) && response.data.data.length > 0) {
        // Agar riders mile hain
        setRidersNearYou(response.data.data);

        // Action bhej do ke riders mil gaye
        track("ACTION", "confirm_screen", "Aapke paas riders mil gaye hain", {
          hasCurrentLocation: !!currentLocation,
          hasOrigin: !!origin,
          hasDestination: !!destination,
          hasSelectedRide: !!selectedRide,
          hasFcmToken: !!fcmToken,
          ridersCount: response.data.data.length
        });
      } else {
        // Agar riders nahi mile
        setRidersNearYou([]);

        // Action bhej do ke riders available nahi hain
        track("ACTION", "confirm_screen", "Koi riders available nahi hain", {
          hasCurrentLocation: !!currentLocation,
          hasOrigin: !!origin,
          hasDestination: !!destination,
          hasSelectedRide: !!selectedRide,
          hasFcmToken: !!fcmToken,
          ridersCount: 0
        });
      }



    } catch (error) {
      setRidersNearYou([]);
      let errorMsg = "Network timeout. Please check your connection.";

      if (error.name === "AbortError" || error.code === "ECONNABORTED") {
        setLocationError("Network timeout. Please check your connection.");
      } else if (error.response?.status >= 500) {
        setLocationError("Server error. Please try again.");
      } else {
        setLocationError("Unable to find nearby riders.");
      }

      track("API_ERROR", "confirm_screen", "Nearby riders nahi mil rahe - error aya", {
        error: error.message,
        status: error.response?.status,
        vehicleType: selectedRide.vehicleName || selectedRide.vehicleType,
        location: { lat: origin.latitude, lng: origin.longitude }
      });
    } finally {
      setIsLoadingRiders(false);
    }
  }, [origin, selectedRide, track]);

  // Fetch directions
  const fetchDirections = useCallback(async () => {
    if (!origin || !destination || coordinates.length > 0) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await axios.post(
        "https://appapi.olyox.com/directions",
        {
          pickup: { latitude: origin.latitude, longitude: origin.longitude },
          dropoff: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
        {
          timeout: 10000,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.data?.polyline) {
        const decodedCoords = decodePolyline(response.data.polyline).map(
          ([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          })
        );
        setCoordinates(decodedCoords);
      }
    } catch (error) {
      // Silently fail - MapViewDirections will handle fallback
    }
  }, [origin, destination, coordinates.length]);

  // Fetch location
  const fetchLocation = useCallback(async () => {
    if (currentLocation) {
      setIsLoadingLocation(false);
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      if (contextLocation?.coords) {
        setCurrentLocation(contextLocation.coords);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission is required to book a ride.");
        showNotification(
          "Permission Denied",
          "Location permission required.",
          "error"
        );

        track("ERROR", "confirm_screen", "Location permission deny kar diya user ne", {
          permissionStatus: status
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      setCurrentLocation(position.coords);

    } catch (err) {
      setLocationError("Unable to get your current location.");
      showNotification("Location Error", "Unable to get location.", "error");

      track("ERROR", "confirm_screen", "Location fetch karne mein error aya", {
        error: err.message,
        errorCode: err.code
      });
    } finally {
      setIsLoadingLocation(false);
    }
  }, [contextLocation, currentLocation, track]);

  // Fetch ride data
  const fetchRideData = useCallback(async () => {
    try {
      const data = await find_me();
      setCashback(data?.user?.cashback || 0);
      setCurrentRide(data?.user?.currentRide || null);
    } catch (error) {
      // Silent fail
    }
  }, []);

  const handleBackToHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    );
  }, [navigation]);

  // Poll ride status
  const pollRideStatus = useCallback(async () => {
    if (
      !createdRideId ||
      !isBookingInProgress ||
      rideCompleted ||
      !isActiveRef.current
    )
      return;

    const now = Date.now();
    if (now - lastPollingTime.current < 4000) return;
    lastPollingTime.current = now;

    track("API_CALL", "confirm_screen", "Ride status poll karna start", {
      rideId: createdRideId,
      currentStatus: currentRideStatus
    });

    try {
      const token = await tokenCache.getToken("auth_token_db");
      if (!token) {
        showNotification(
          "Authentication Error",
          "Please log in again.",
          "error"
        );

        track("ERROR", "confirm_screen", "Auth token nahi mila polling mein", {
          rideId: createdRideId
        });

        stopBookingProcess("AUTH_ERROR_POLL");
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await axios.get(
        `https://www.appv2.olyox.com/api/v1/new/status/${createdRideId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (rideCompleted || !isActiveRef.current) return;

      const { status: newStatus, rideDetails, message } = response.data;

      setCurrentRideStatus(newStatus);
      setBookingStatusMessage(message || `Ride status: ${newStatus}`);

      track("API_SUCCESS", "confirm_screen", `Ride status update mila: ${newStatus}`, {
        rideId: createdRideId,
        newStatus,
        previousStatus: currentRideStatus,
        message: message,
        hasRideDetails: !!rideDetails
      });

      switch (newStatus) {
        case "driver_assigned":
          showNotification(
            "Driver Assigned!",
            message || "Your ride is on the way.",
            "success"
          );

          track("SUCCESS", "confirm_screen", "Driver assign ho gaya - ride confirmed!", {
            rideId: createdRideId,
            driverId: rideDetails?._id,
            message
          });

          saveRide({ ...rideDetails, ride_otp: rideOtp });
          clearCurrentRideSearching();
          updateRideStatus("confirmed");
          stopBookingProcess("DRIVER_ASSIGNED");
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "RideStarted",
                params: {
                  driver: rideDetails?._id,
                  origin,
                  destination,
                },
              },
            ],
          });
          break;

        case "cancelled":
          clearCurrentRideSearching();
          showNotification(
            "Ride Cancelled",
            message || "Ride cancelled.",
            "info"
          );

          track("INFO", "confirm_screen", "Ride cancel ho gaya system se", {
            rideId: createdRideId,
            message
          });

          stopBookingProcess("CANCELLED_BY_SYSTEM");
          break;

        case "completed":
          clearCurrentRideSearching();
          showNotification(
            "Ride Completed!",
            message || "Thank you for riding.",
            "success"
          );

          track("SUCCESS", "confirm_screen", "Ride complete ho gaya", {
            rideId: createdRideId,
            message
          });

          stopBookingProcess("COMPLETED");
          break;
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        track("WARNING", "confirm_screen", "Polling mein 401/404 error - silent fail", {
          rideId: createdRideId,
          status: err.response?.status,
          error: err.message
        });
      } else {
        track("ERROR", "confirm_screen", "Ride status polling mein unexpected error", {
          rideId: createdRideId,
          error: err.message,
          status: err.response?.status
        });
      }
    }
  }, [
    createdRideId,
    isBookingInProgress,
    rideCompleted,
    navigation,
    saveRide,
    updateRideStatus,
    origin,
    destination,
    rideOtp,
    stopBookingProcess,
    clearCurrentRideSearching,
    currentRideStatus,
    track
  ]);

  // Create ride
  const handleCreateRide = useCallback(async () => {
    if (
      !currentLocation ||
      !origin ||
      !destination ||
      !selectedRide ||
      !fcmToken
    ) {
      showNotification(
        "Missing Information",
        "Ensure location and ride details are selected.",
        "error"
      );

      track("ERROR", "confirm_screen", "Ride create karne mein missing information", {
        hasCurrentLocation: !!currentLocation,
        hasOrigin: !!origin,
        hasDestination: !!destination,
        hasSelectedRide: !!selectedRide,
        hasFcmToken: !!fcmToken
      });
      return;
    }

    if (!isLocationValid) {
      Alert.alert(
        "Service Area",
        "We currently only accept bookings within Delhi NCR (Delhi, Gurgaon, Noida, Haryana). Please select locations within our service area.",
        [{ text: "OK" }]
      );

      track("ERROR", "confirm_screen", "Location Delhi NCR mein nahi hai", {
        origin,
        destination,
        isLocationValid
      });
      return;
    }

    setIsCreatingRide(true);
    setIsBookingInProgress(true);
    setRideCompleted(false);
    setBookingStatusMessage("Requesting your ride...");
    setCurrentRideStatus("pending");

    const rideData = {
      vehicleType: selectedRide.vehicleType || selectedRide.vehicleName,
      pickupLocation: {
        latitude: origin.latitude,
        longitude: origin.longitude,
      },
      dropLocation: {
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
      currentLocation: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      pick_desc: pickup?.description,
      drop_desc: dropoff?.description,
      isCashbackApply: isCashbackApply,
      cashback: cashback,
      withoutcashback: farePayload?.original_fare,
      fare: farePayload,
      fcmToken,
      paymentMethod,
      platform: Platform.OS,
      scheduledAt: null,
      pickupAddress: pickup?.address || {},
      dropAddress: dropoff?.address || {},
      isPooling: ridePoolingEnabled,
    };

    track("ACTION", "confirm_screen", "User ne Book Now button dabaya - ride create karna start", {
      vehicleType: rideData.vehicleType,
      paymentMethod: rideData.paymentMethod,
      totalFare: farePayload?.total_fare,
      isCashbackApply: rideData.isCashbackApply,
      cashbackAmount: rideData.cashback,
      isPooling: rideData.isPooling,
      platform: rideData.platform
    });

    try {
      const token = await tokenCache.getToken("auth_token_db");
      if (!token) {
        showNotification(
          "Authentication Error",
          "Please log in again.",
          "error"
        );

        track("ERROR", "confirm_screen", "Ride create karne mein auth token nahi mila", {});
        stopBookingProcess("AUTH_ERROR_CREATE");
        return;
      }

      track("API_CALL", "confirm_screen", "New ride create karne ke liye API call kar rahe", {
        endpoint: "new-ride",
        hasToken: !!token,
        rideData: rideData
      });

      const response = await axios.post(
        "https://www.appv2.olyox.com/api/v1/new/new-ride",
        rideData,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }
      );

      if (response.data?.success && response.data.data?.rideId) {
        const rideDetails = response.data.data;
        saveRideSearching({ _id: response.data.data?.rideId });
        updateRideStatusSearching("searching");
        fetchRideData();

        track("API_SUCCESS", "confirm_screen", "Ride successfully create ho gaya!", {
          rideId: rideDetails.rideId,
          rideStatus: rideDetails.ride_status,
          hasOtp: !!rideDetails.ride_otp,
          response: response.data
        });

        setCreatedRideId(rideDetails.rideId);

        if (rideDetails.ride_otp) setRideOtp(rideDetails.ride_otp);

        setBookingStatusMessage("Searching for drivers...");
        setCurrentRideStatus(rideDetails.ride_status || "searching");

        // Start ride pooling after 4 seconds
        poolingTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current && !rideCompleted) {
            setRidePoolingEnabled(true);
            setBookingStatusMessage("Expanding search with ride pooling...");

            track("ACTION", "confirm_screen", "Ride pooling enable ho gaya - 4 second baad", {
              rideId: rideDetails.rideId
            });
          }
        }, 4000);

        bookingTimeoutRef.current = setTimeout(() => {
          if (
            isBookingInProgress &&
            currentRideStatus !== "driver_assigned" &&
            !rideCompleted
          ) {
            showNotification(
              "No Drivers Found",
              "Could not find a driver. Try again later.",
              "info"
            );

            track("WARNING", "confirm_screen", "Booking timeout ho gaya - driver nahi mila", {
              rideId: rideDetails.rideId,
              timeoutDuration: BOOKING_TIMEOUT
            });

            stopBookingProcess("TIMEOUT");
          }
        }, BOOKING_TIMEOUT);
      } else {
        throw new Error(response.data?.message || "Invalid server response.");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to create ride.";

      track("API_ERROR", "confirm_screen", "Ride create karne mein API error aya", {
        error: errorMessage,
        status: err.response?.status,
        responseData: err.response?.data,
        requestData: rideData
      });

      showNotification("Error", errorMessage, "error");
      stopBookingProcess("CREATE_RIDE_API_ERROR");
    } finally {
      setIsCreatingRide(false);
    }
  }, [
    currentLocation,
    origin,
    destination,
    selectedRide,
    fcmToken,
    pickup,
    dropoff,
    farePayload,
    paymentMethod,
    isBookingInProgress,
    currentRideStatus,
    rideCompleted,
    stopBookingProcess,
    isLocationValid,
    ridePoolingEnabled,
    ridersNearYou.length,
    saveRideSearching,
    updateRideStatusSearching,
    fetchRideData,
    isCashbackApply,
    cashback,
  ]);

  // Cancel booking
  const handleCancelBooking = useCallback(
    (isAutoCancel = false) => {
      const performCancel = async () => {
        try {
          stopBookingProcess("USER_CANCELLED");

          if (createdRideId) {
            const token = await tokenCache.getToken("auth_token_db");
            if (token) {
              await axios.post(
                `https://www.appv2.olyox.com/api/v1/new/cancel-before/${createdRideId}`,
                {},
                {
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 10000,
                }
              );
            }
          }

          // Ride cancel hone ke baad status update aur cleanup
          updateRideStatusSearching("cancel");
          fetchRideData();
          clearCurrentRideSearching();
          setCreatedRideId(null);
          setRideOtp(null);
          setRidePoolingEnabled(false);

          // Track action
          track(
            "ACTION",
            "Ride Cancelled",
            isAutoCancel
              ? "Ride automatically cancelled by system"
              : "User ne ride cancel ki",
            { rideId: createdRideId }
          );

          if (!isAutoCancel) {
            showNotification(
              "Success",
              "Ride cancelled successfully.",
              "success"
            );
          }
        } catch (error) {
          if (!isAutoCancel) {
            showNotification(
              "Cancel Failed",
              "Error cancelling ride.",
              "error"
            );
          }

          // Track error bhi
          track(
            "ACTION",
            "Ride Cancel Failed",
            isAutoCancel
              ? "Auto-cancel failed"
              : `User cancel failed: ${error.message}`,
            { rideId: createdRideId }
          );
        }
      };

      if (isAutoCancel) {
        performCancel();
      } else {
        Alert.alert(
          "Cancel Booking?",
          "Are you sure you want to cancel this ride?",
          [
            { text: "No", style: "cancel" },
            { text: "Yes", style: "destructive", onPress: performCancel },
          ]
        );
      }
    },
    [
      createdRideId,
      stopBookingProcess,
      updateRideStatusSearching,
      fetchRideData,
      clearCurrentRideSearching,
      track,
    ]
  );


  // Payment method selection
  const handleChangePayment = useCallback(() => {
    Alert.alert(
      "Select Payment Method",
      "Choose your preferred payment method:",
      [
        { text: "Cash", onPress: () => setPaymentMethod("Cash") },
        { text: "UPI", onPress: () => setPaymentMethod("UPI") },
        { text: "Online", onPress: () => setPaymentMethod("Online") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, []);

  // Fit map to markers
  const fitMapToMarkers = useCallback(() => {
    if (!mapRef.current || !origin || !destination || !mapReady) return;

    const coordinates = [
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude },
    ];

    ridersNearYou.forEach((rider) => {
      const lat = rider.location?.coordinates[1] ?? rider.lat;
      const lng = rider.location?.coordinates[0] ?? rider.lng;
      if (
        typeof lat === "number" &&
        typeof lng === "number" &&
        !isNaN(lat) &&
        !isNaN(lng)
      ) {
        coordinates.push({ latitude: lat, longitude: lng });
      }
    });

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }, 300);
  }, [origin, destination, ridersNearYou, mapReady]);

  // Effects
  useFocusEffect(
    useCallback(() => {
      isActiveRef.current = true;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      return () => {
        isActiveRef.current = false;
        if (isBookingInProgress && !rideCompleted) {
          cleanup();
        }
      };
    }, [isBookingInProgress, rideCompleted, cleanup, fadeAnim])
  );

  useEffect(() => {
    fetchLocation();
    if (!isAndroid) {
      fetchDirections();
    }
  }, [fetchLocation, fetchDirections]);

  useEffect(() => {
    fetchRideData();
    const interval = setInterval(fetchRideData, 5000);
    return () => clearInterval(interval);
  }, [fetchRideData]);

  useEffect(() => {
    if (origin && selectedRide && !isLoadingLocation) {
      fetchNearByRiders();
      riderCheckRef.current = setInterval(
        fetchNearByRiders,
        RIDER_CHECK_INTERVAL
      );

      return () => {
        if (riderCheckRef.current) {
          clearInterval(riderCheckRef.current);
          riderCheckRef.current = null;
        }
      };
    }
  }, [origin, selectedRide, isLoadingLocation, fetchNearByRiders]);

  useEffect(() => {
    if (mapReady && (ridersNearYou.length > 0 || (origin && destination))) {
      fitMapToMarkers();
    }
  }, [ridersNearYou, mapReady, fitMapToMarkers]);

  useEffect(() => {
    if (!createdRideId || !isBookingInProgress || rideCompleted) return;

    const initialTimeout = setTimeout(() => {
      pollRideStatus();
      pollingRef.current = setInterval(pollRideStatus, POLLING_INTERVAL);
    }, 3000);

    return () => {
      clearTimeout(initialTimeout);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [createdRideId, isBookingInProgress, rideCompleted, pollRideStatus]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Components
  const Header = React.memo(() => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => (currentRide ? handleBackToHome() : navigation.goBack())}
        activeOpacity={0.7}
      >
        <ArrowLeft size={24} color={VCOLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Confirm Booking</Text>
      <View style={styles.headerSpacer} />
    </View>
  ));

  const ServiceAreaWarning = React.memo(() => {
    if (isLocationValid) return null;
    return (
      <View style={styles.warningCard}>
        <AlertCircle size={24} color={VCOLORS.warning} />
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Service Area Notice</Text>
          <Text style={styles.warningText}>
            Currently available only in Delhi NCR region
          </Text>
        </View>
      </View>
    );
  });

  const RiderAvailabilityCard = React.memo(() => (
    <View style={styles.availabilityCard}>
      <View style={styles.availabilityHeader}>
        <View style={styles.availabilityInfo}>
          {vehicleIcon === "motorbike" ? (
            <Camera
              size={20}
              color={
                ridersNearYou.length > 0
                  ? VCOLORS.success
                  : VCOLORS.text.secondary
              }
            />
          ) : (
            <Car
              size={20}
              color={
                ridersNearYou.length > 0
                  ? VCOLORS.success
                  : VCOLORS.text.secondary
              }
            />
          )}
          <Text style={styles.availabilityTitle}>
            {isLoadingRiders
              ? "Checking availability..."
              : ridersNearYou.length === 0
                ? "No riders available"
                : `${ridersNearYou.length} riders nearby`}
          </Text>
        </View>
        {isLoadingRiders && (
          <ActivityIndicator size="small" color={VCOLORS.primary} />
        )}
      </View>

      {/* {ridersNearYou.length === 0 && !isLoadingRiders && (
        <View style={styles.noRidersContainer}>
          <Text style={styles.noRidersText}>
            We're sorry! No riders are available in your area right now.
          </Text>
          <Text style={styles.noRidersSubtext}>
            Please try again in a few minutes or check back later.
          </Text>
        </View>
      )} */}

      {locationError && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={VCOLORS.danger} />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}
    </View>
  ));

  const MapSection = React.memo(() => (
    <View style={styles.mapContainer}>
      {origin && destination && mapRegion ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={isAndroid ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={mapRegion}
          onMapReady={() => {
            setMapReady(true);
            setTimeout(fitMapToMarkers, 500);
          }}
          showsUserLocation={true}
          showsCompass={false}
          showsMyLocationButton={false}
          minZoomLevel={8}
          maxZoomLevel={18}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: origin.latitude,
              longitude: origin.longitude,
            }}
            title="Pickup"
            description={pickup?.description || "Pickup location"}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.pickupMarker}>
              <View style={styles.markerInner}>
                <MapPin size={14} color={VCOLORS.success} />
              </View>
            </View>
          </Marker>

          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="Drop-off"
            description={dropoff?.description || "Destination"}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.dropoffMarker}>
              <View style={styles.markerInner}>
                <MapPin size={14} color={VCOLORS.danger} />
              </View>
            </View>
          </Marker>

          {ridersNearYou.slice(0, 10).map((rider, index) => {
            const lat = rider.location?.coordinates[1] ?? rider.lat ?? 28.6139;
            const lng = rider.location?.coordinates[0] ?? rider.lng ?? 77.209;
            const offsetLat = lat + (Math.random() - 0.5) * 0.0008;
            const offsetLng = lng + (Math.random() - 0.5) * 0.0008;

            return (
              <Marker
                key={`rider-${rider.id || index}`}
                coordinate={{ latitude: offsetLat, longitude: offsetLng }}
                title={`${vehicleIcon === "motorbike" ? "Bike" : "Car"} Rider`}
                description="Available for ride"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.riderMarker}>
                  <View style={styles.markerInner}>
                    {vehicleIcon === "motorbike" ? (
                      <Camera size={12} color={VCOLORS.primary} />
                    ) : (
                      <Car size={12} color={VCOLORS.primary} />
                    )}
                  </View>
                </View>
              </Marker>
            );
          })}

          {isAndroid ? (
            <MapViewDirections
              origin={{
                latitude: origin.latitude,
                longitude: origin.longitude,
              }}
              destination={{
                latitude: destination.latitude,
                longitude: destination.longitude,
              }}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={3}
              strokeColor={VCOLORS.primary}
              mode="DRIVING"
              optimizeWaypoints={true}
              onError={(errorMessage) => {
                // Silent error handling
              }}
            />
          ) : (
            coordinates.length > 0 && (
              <Polyline
                coordinates={coordinates}
                strokeWidth={3}
                strokeColor={VCOLORS.primary}
              />
            )
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <MapPin size={48} color={VCOLORS.text.tertiary} />
          <Text style={styles.mapPlaceholderText}>Loading map...</Text>
        </View>
      )}
    </View>
  ));

  const LocationCard = React.memo(() => (
    <View style={styles.locationCard}>
      <View style={styles.locationRow}>
        <View style={styles.locationIcon}>
          <View style={[styles.locationDot, styles.pickupDot]} />
        </View>
        <View style={styles.locationDetails}>
          <Text style={styles.locationLabel}>PICKUP</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {pickup?.description || "Current Location"}
          </Text>
        </View>
      </View>

      <View style={styles.routeLine} />

      <View style={styles.locationRow}>
        <View style={styles.locationIcon}>
          <View style={[styles.locationDot, styles.dropoffDot]} />
        </View>
        <View style={styles.locationDetails}>
          <Text style={styles.locationLabel}>DESTINATION</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {dropoff?.description || "Selected Destination"}
          </Text>
        </View>
      </View>
    </View>
  ));

  const RideDetailsCard = React.memo(() => (
    <View style={styles.detailsCard}>
      <View style={styles.detailsHeader}>
        <View style={styles.vehicleInfo}>
          {vehicleIcon === "motorbike" ? (
            <Camera size={24} color={VCOLORS.primary} />
          ) : (
            <Car size={24} color={VCOLORS.primary} />
          )}
          <Text style={styles.vehicleTitle}>
            {selectedRide?.vehicleName || "Standard Vehicle"}
          </Text>
        </View>
        {selectedRide?.durationInMinutes && (
          <View style={styles.durationBadge}>
            <Clock size={14} color={VCOLORS.primary} />
            <Text style={styles.durationText}>
              {selectedRide.durationInMinutes.toFixed(0)} min
            </Text>
          </View>
        )}
      </View>

      <View style={styles.fareSection}>
        <Text style={styles.fareSectionTitle}>Fare Details</Text>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Base Fare</Text>
          <Text style={styles.fareValue}>
            ₹
            {selectedRide && settings
              ? (
                selectedRide.totalPrice *
                (1 + settings.ride_percentage_off / 100)
              ).toFixed(0)
              : "0"}
          </Text>
        </View>

        {selectedRide && settings && (
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Offer Discount</Text>
            <Text style={[styles.fareValue, styles.discountText]}>
              -₹
              {(
                (selectedRide.totalPrice * settings.ride_percentage_off) /
                100
              ).toFixed(0)}
            </Text>
          </View>
        )}

        {isCashbackApply && cashback > 0 && (
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Cashback Applied</Text>
            <Text style={[styles.fareValue, styles.discountText]}>
              -₹{cashback}
            </Text>
          </View>
        )}

        <View style={styles.totalFareRow}>
          <Text style={styles.totalFareLabel}>Total Amount</Text>
          <Text style={styles.totalFareValue}>
            ₹
            {Math.max(
              1,
              (selectedRide?.totalPrice || 0) - (isCashbackApply ? cashback : 0)
            ).toFixed(0)}
          </Text>
        </View>
      </View>

      {cashback > 0 && selectedRide?.totalPrice > 100 && (
        <View style={styles.cashbackSection}>
          <TouchableOpacity
            onPress={() => setIsCashBackApply(!isCashbackApply)}
            style={[
              styles.cashbackButton,
              isCashbackApply && styles.cashbackButtonActive,
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.cashbackContent}>
              <Text
                style={[
                  styles.cashbackText,
                  isCashbackApply && styles.cashbackTextActive,
                ]}
              >
                Apply Cashback ₹{cashback}
              </Text>
              {isCashbackApply && (
                <CheckCircle size={16} color={VCOLORS.success} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.cashbackNote}>
            Cashback applicable on rides above ₹100
          </Text>
        </View>
      )}

      {cashback > 0 && selectedRide?.totalPrice <= 100 && (
        <View style={styles.cashbackSection}>
          <Text style={styles.cashbackUnavailable}>
            Cashback not applicable for rides below ₹100
          </Text>
        </View>
      )}

      <Text style={styles.disclaimer}>
        ⚠️ Toll and MCD charges not included. Pay driver separately if
        applicable.
      </Text>
    </View>
  ));

  const BookingProgressCard = React.memo(() => (
    <View style={styles.progressCard}>
      <View style={styles.progressContent}>
        <View style={styles.loadingSpinner}>
          <ActivityIndicator size="large" color={VCOLORS.primary} />
        </View>
        <Text style={styles.progressTitle}>Finding Your Driver</Text>
        <Text style={styles.progressMessage}>{bookingStatusMessage}</Text>
      </View>

      {ridePoolingEnabled && (
        <View style={styles.poolingNotice}>
          <Users size={18} color={VCOLORS.primary} />
          <Text style={styles.poolingText}>
            Ride pooling enabled for better availability
          </Text>
        </View>
      )}

      <View style={styles.statusTracker}>
        <View style={styles.statusStep}>
          <View
            style={[
              styles.statusDot,
              (currentRideStatus === "searching" ||
                currentRideStatus === "pending") &&
              styles.statusDotActive,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              (currentRideStatus === "searching" ||
                currentRideStatus === "pending") &&
              styles.statusTextActive,
            ]}
          >
            Searching for drivers
          </Text>
        </View>

        <View style={styles.statusConnector} />

        <View style={styles.statusStep}>
          <View
            style={[
              styles.statusDot,
              currentRideStatus === "driver_assigned" && styles.statusDotActive,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              currentRideStatus === "driver_assigned" &&
              styles.statusTextActive,
            ]}
          >
            Driver assigned
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => handleCancelBooking()}
        activeOpacity={0.7}
      >
        <X size={18} color={VCOLORS.danger} />
        <Text style={styles.cancelButtonText}>Cancel Request</Text>
      </TouchableOpacity>
    </View>
  ));

  const PaymentSelector = React.memo(() => {
    const getPaymentIcon = () => {
      switch (paymentMethod) {
        case "Cash":
          return <CreditCard size={20} color={VCOLORS.primary} />;
        case "UPI":
          return <CreditCard size={20} color={VCOLORS.primary} />;
        case "Online":
          return <CreditCard size={20} color={VCOLORS.primary} />;
        default:
          return <CreditCard size={20} color={VCOLORS.primary} />;
      }
    };

    return (
      <TouchableOpacity
        style={styles.paymentSelector}
        onPress={handleChangePayment}
        activeOpacity={0.7}
      >
        {getPaymentIcon()}
        <Text style={styles.paymentText}>{paymentMethod}</Text>
        <Text style={styles.paymentChevron}>⌄</Text>
      </TouchableOpacity>
    );
  });

  if (isLoadingLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={VCOLORS.primary} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MapSection />
          <RiderAvailabilityCard />
          <ServiceAreaWarning />
          <LocationCard />
          {isBookingInProgress ? <BookingProgressCard /> : <RideDetailsCard />}
        </ScrollView>

        {!isBookingInProgress && (
          <View style={styles.footer}>
            <PaymentSelector />

            <TouchableOpacity
              style={[
                styles.bookButton,
                isBookingDisabled && styles.bookButtonDisabled,
              ]}
              onPress={handleCreateRide}
              disabled={isBookingDisabled}
              activeOpacity={0.8}
            >
              {isCreatingRide ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.bookButtonContent}>
                  <Text style={styles.bookButtonText}>
                    {ridePoolingEnabled ? "Book Pool Ride" : "Book Ride"}
                  </Text>
                  {ridersNearYou.length > 0 && (
                    <Text style={styles.bookButtonPrice}>
                      ₹
                      {Math.max(
                        1,
                        (selectedRide?.totalPrice || 0) -
                        (isCashbackApply ? cashback : 0)
                      ).toFixed(0)}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mapContainer: {
    height: height * 0.4,
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
  },
  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6c757d",
  },
  pickupMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: VCOLORS.success,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dropoffMarker: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: VCOLORS.danger,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  riderMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: VCOLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  markerInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: VCOLORS.warning,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: VCOLORS.warning,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: "#6c757d",
    lineHeight: 16,
  },
  availabilityCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  availabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availabilityInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 12,
  },
  noRidersContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  noRidersText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 4,
  },
  noRidersSubtext: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: VCOLORS.danger,
    marginLeft: 8,
  },
  locationCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickupDot: {
    backgroundColor: VCOLORS.success,
  },
  dropoffDot: {
    backgroundColor: VCOLORS.danger,
  },
  locationDetails: {
    flex: 1,
    marginLeft: 16,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6c757d",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "500",
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: "#dee2e6",
    marginLeft: 11,
    marginVertical: 12,
  },
  detailsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginLeft: 12,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e7f3ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 12,
    fontWeight: "600",
    color: VCOLORS.primary,
    marginLeft: 4,
  },
  fareSection: {
    marginBottom: 20,
  },
  fareSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fareLabel: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  fareValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  discountText: {
    color: VCOLORS.success,
  },
  totalFareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    marginTop: 8,
  },
  totalFareLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  totalFareValue: {
    fontSize: 24,
    fontWeight: "800",
    color: VCOLORS.primary,
  },
  cashbackSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  cashbackButton: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#dee2e6",
  },
  cashbackButtonActive: {
    backgroundColor: "#d4edda",
    borderColor: VCOLORS.success,
  },
  cashbackContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cashbackText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginRight: 8,
  },
  cashbackTextActive: {
    color: VCOLORS.success,
  },
  cashbackNote: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 8,
  },
  cashbackUnavailable: {
    fontSize: 12,
    color: VCOLORS.danger,
    textAlign: "center",
    fontStyle: "italic",
  },
  disclaimer: {
    fontSize: 12,
    color: "#6c757d",
    lineHeight: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
  progressCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressContent: {
    alignItems: "center",
    marginBottom: 24,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  progressMessage: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  poolingNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7f3ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  poolingText: {
    fontSize: 14,
    color: VCOLORS.primary,
    fontWeight: "600",
    marginLeft: 8,
  },
  statusTracker: {
    marginBottom: 24,
  },
  statusStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#dee2e6",
    marginRight: 12,
  },
  statusDotActive: {
    backgroundColor: VCOLORS.primary,
  },
  statusText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  statusTextActive: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  statusConnector: {
    width: 2,
    height: 20,
    backgroundColor: "#dee2e6",
    marginLeft: 5,
    marginVertical: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff5f5",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: VCOLORS.danger,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: VCOLORS.danger,
    marginLeft: 8,
  },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  paymentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  paymentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 12,
    flex: 1,
  },
  paymentChevron: {
    fontSize: 18,
    color: "#6c757d",
  },
  bookButton: {
    backgroundColor: VCOLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: VCOLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookButtonDisabled: {
    backgroundColor: "#adb5bd",
    shadowOpacity: 0,
    elevation: 0,
  },
  bookButtonContent: {
    alignItems: "center",
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  bookButtonPrice: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.9,
    fontWeight: "600",
  },
});
