import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  ToastAndroid,
  Platform,
  Animated,
  Alert,
  Image,
  Modal,
} from "react-native";
import Map from "./components/map";
import CouponBar from "./components/coupon-bar";
import { api } from "./components/api";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTrack } from "../../hooks/useTrack";
import axios from "axios";
import { tokenCache } from "../../Auth/cache";
import Icon from "react-native-vector-icons/FontAwesome5";
import useSettings from "../../hooks/Settings";
import { find_me } from "../../utils/helpers";
import { SafeAreaView } from "react-native-safe-area-context";

const PRICE_URL = "/new-price-calculations";
const RECALCULATE_URL = "/recalculate-rental";
const BOOKING_TIMEOUT = 120000;
const MIN_CASHBACK_AMOUNT = 100;
const GOOGLE_MAPS_API_KEY = "AIzaSyBfRHuTByG6CiXtLbyzK_aKNpJfDiB4jUo";
const API_BASE_URL = "https://www.appv2.olyox.com/api/v1/new";

const showToast = (msg) => {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
};

const floor = (n) => Math.floor(n || 0);
const round = (n) => Math.max(1, Number((n || 0).toFixed(1)));
const formatPrice = (n) => `₹${floor(n)}`;

export default function ShowMap({ isLater = false }) {
  const navigation = useNavigation();
  const { track } = useTrack();
  const route = useRoute();
  const { data, pickup, dropoff, currentLocation } = route.params;
  const { settings } = useSettings();

  const ridePercentageOff = settings?.ride_percentage_off || 0;

  const origin = useMemo(
    () => ({
      latitude:
        data?.pickup?.latitude || pickup?.latitude || 28.612547792942877,
      longitude:
        data?.pickup?.longitude || pickup?.longitude || 77.02602675016412,
    }),
    [data, pickup]
  );

  const destination = useMemo(
    () => ({
      latitude:
        data?.dropoff?.latitude ||
        dropoff?.dropout?.latitude ||
        28.599530690677856,
      longitude:
        data?.dropoff?.longitude || dropoff?.longitude || 77.01621923742817,
    }),
    [data, dropoff]
  );

  const [distanceKm, setDistanceKm] = useState(0);
  const [durationMins, setDurationMins] = useState(0);
  const [polyline, setPolyline] = useState(null);
  const isIntercityOrLater = isLater || distanceKm > 69;

  const [loading, setLoading] = useState(true);
  const [vehiclePrices, setVehiclePrices] = useState([]);
  const [rentalPrices, setRentalPrices] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showShimmer, setShowShimmer] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isCashbackApply, setIsCashbackApply] = useState(false);
  const [cashback, setCashback] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedHours, setSelectedHours] = useState(0);
  const [priceCache, setPriceCache] = useState({});
  const [ridePoolingEnabled, setRidePoolingEnabled] = useState(false);
  const [createdRideId, setCreatedRideId] = useState(null);
  const [rideOtp, setRideOtp] = useState(null);
  const [currentRideStatus, setCurrentRideStatus] = useState("searching");
  const [lightData, setLightData] = useState({
    ride_status: null,
    driver_location: null,
    payment_status: null,
  });

  const [searchAnimation] = useState(new Animated.Value(0));
  const [bookingTimeoutId, setBookingTimeoutId] = useState(null);
  const [poolingTimeoutId, setPoolingTimeoutId] = useState(null);
  const [pollingIntervalId, setPollingIntervalId] = useState(null);

  const fetchGoogleRoute = useCallback(async () => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;
      const res = await axios.get(url);
      if (res.data.status === "OK" && res.data.routes.length > 0) {
        const leg = res.data.routes[0].legs[0];
        setDistanceKm(leg.distance.value / 1000);
        setDurationMins(leg.duration.value / 60);
        setPolyline(res.data.routes[0].overview_polyline.points);
      }
    } catch (err) {
      showToast("Using estimated route");
    }
  }, [origin, destination]);

  useEffect(() => {
    fetchGoogleRoute();
  }, [fetchGoogleRoute]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await find_me();
        setCashback(res.user?.cashback || 0);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const timeOptions = useMemo(() => {
    const opts = [];
    for (let i = 1; i <= 5; i++) opts.push(i);
    return opts;
  }, []);

  useEffect(() => {
    if (showTimePicker && selectedRental && timeOptions.length > 0) {
      setSelectedHours(1);
      setSelectedRide({
        ...selectedRental,
        totalPrice: selectedRental.totalPrice,
      });
    }
  }, [showTimePicker, selectedRental, timeOptions]);

  useEffect(() => {
    if (!showTimePicker || !selectedRental || timeOptions.length === 0) return;

    const fetchAll = async () => {
      const cache = {};
      timeOptions.forEach(
        (h) => (cache[h] = { totalPrice: 0, totalKm: 0, loading: true })
      );
      setPriceCache(cache);

      for (const hrs of timeOptions) {
        try {
          const rentalType = selectedRental.vehicleName
            .toLowerCase()
            .includes("mini")
            ? "mini"
            : selectedRental.vehicleName.toLowerCase().includes("sedan")
            ? "sedan"
            : "suv";

          const originalHours =
            Math.ceil(
              (selectedRental.pricing?.timeCost || 0) /
                (selectedRental.pricing?.pricePerMin || 1) /
                60
            ) || 1;

          const res = await api.post(RECALCULATE_URL, {
            rentalType,
            originalHours: originalHours,
            additionalHours: hrs,
            originalDistanceKm: selectedRental.distanceInKm,
            currentFare: selectedRental.totalPrice || 0,
          });

          console.log("res cla", res.data);

          if (res.data.success) {
            const additional = res.data?.additional;
            const totalPrice = floor(additional.totalFare || 0);
            const totalKm = round(
              additional.estimatedDistanceKm || selectedRental.distanceInKm || 0
            );

            setPriceCache((prev) => ({
              ...prev,
              [hrs]: { totalPrice, totalKm, loading: false },
            }));
          } else {
            const basePrice = selectedRental.totalPrice || 0;
            const pricePerHour = basePrice / (originalHours || 1);
            const estimatedPrice = floor(pricePerHour * hrs);
            const estimatedKm = round(
              selectedRental.distanceInKm + (hrs - originalHours) * 15
            );
            console.log(estimatedKm);

            setPriceCache((prev) => ({
              ...prev,
              [hrs]: {
                totalPrice: estimatedPrice,
                totalKm: estimatedKm,
                loading: false,
              },
            }));
          }
        } catch (e) {
          console.log("Price fetch error for hour", hrs, e);
          const basePrice = selectedRental.totalPrice || 0;
          const originalHours =
            Math.ceil(
              (selectedRental.pricing?.timeCost || 0) /
                (selectedRental.pricing?.pricePerMin || 1) /
                60
            ) || 1;
          const pricePerHour = basePrice / originalHours;
          const estimatedPrice = floor(pricePerHour * hrs);
          const estimatedKm = round(
            selectedRental.distanceInKm + (hrs - originalHours) * 15
          );

          setPriceCache((prev) => ({
            ...prev,
            [hrs]: {
              totalPrice: estimatedPrice,
              totalKm: estimatedKm,
              loading: false,
            },
          }));
        }
      }
    };

    fetchAll();
  }, [showTimePicker, selectedRental, timeOptions]);

  const farePayload = useMemo(() => {
    if (!selectedRide || !distanceKm) return null;

    const isRental = !!selectedRide.isRental;
    const basePrice =
      isRental && selectedHours > 0
        ? priceCache[selectedHours] &&
          !priceCache[selectedHours].loading &&
          priceCache[selectedHours].totalPrice > 0
          ? priceCache[selectedHours].totalPrice
          : selectedRide.totalPrice
        : selectedRide.totalPrice ?? selectedRide.totalPrice;

    let platformDiscount = 0;
    let afterPlatform = basePrice;
    let canCashback = false;
    let cashbackApplied = 0;
    let afterCoupon = basePrice;
    let finalFare = basePrice;

    if (isRental) {
      // For rentals: Apply cashback directly on base price (no platform discount)
      canCashback = basePrice >= MIN_CASHBACK_AMOUNT && cashback > 0;
      cashbackApplied =
        isCashbackApply && canCashback
          ? Math.min(cashback, floor(basePrice * 0.3))
          : 0;

      afterCoupon = Math.max(1, basePrice - couponDiscount);
      finalFare = Math.max(1, afterCoupon - cashbackApplied);
    } else {
      // For regular rides: Apply platform discount first, then cashback
      platformDiscount = floor((basePrice * ridePercentageOff) / 100);
      afterPlatform = basePrice - platformDiscount;
      afterCoupon = Math.max(1, afterPlatform - couponDiscount);

      canCashback = afterCoupon >= MIN_CASHBACK_AMOUNT && cashback > 0;
      cashbackApplied =
        isCashbackApply && canCashback
          ? Math.min(cashback, floor(afterCoupon * 0.3))
          : 0;

      finalFare = Math.max(1, afterCoupon - cashbackApplied);
    }

    return {
      original_price: basePrice,
      platform_discount: platformDiscount,
      coupon_discount: couponDiscount,
      cashback_applied: cashbackApplied,
      total_fare: finalFare,
      total_savings: basePrice - finalFare,
      distance_km: round(distanceKm),
      duration_mins: Math.round(durationMins),
      is_rental: isRental,
      rental_hours: isRental ? selectedHours : 0,
      estimated_km: isRental
        ? priceCache[selectedHours]?.totalKm ?? round(distanceKm)
        : round(distanceKm),
      cashback_available: cashback,
      cashback_can_apply: canCashback,
    };
  }, [
    selectedRide,
    distanceKm,
    durationMins,
    ridePercentageOff,
    couponDiscount,
    isCashbackApply,
    cashback,
    priceCache,
    selectedHours,
  ]);

  const calculatePrice = useCallback(async () => {
    if (!distanceKm) return;
    try {
      const res = await api.post(PRICE_URL, {
        origin,
        isLater,
        destination,
        waitingTimeInMinutes: 0,
        distance: distanceKm,
        duration: durationMins,
      });

      if (res?.data?.success) {
        const normal = (res.data.vehiclePrices || []).filter(
          (v) =>
            !["Bike", "BIKE", "2 Wheeler"].includes(
              v.vehicleType ?? v.vehicleName
            )
        );
        const rentals = res.data.rentalVehiclePrices || [];
        const withOrig = normal.map((v) => ({
          ...v,
          originalPrice: v.totalPrice,
        }));
        setVehiclePrices(withOrig);
        setRentalPrices(rentals);

        if (withOrig.length && !selectedRide) setSelectedRide(withOrig[0]);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setShowShimmer(false);
      setLoading(false);
    }
  }, [origin, destination, distanceKm, durationMins, isLater, selectedRide]);

  useEffect(() => {
    if (distanceKm) calculatePrice();
  }, [calculatePrice]);

  const handleSelectRide = useCallback((ride) => {
    setSelectedRide(ride);
    setSelectedRental(null);
    setShowTimePicker(false);
    setPriceCache({});
    setAppliedCoupon("");
    setCouponDiscount(0);
    showToast(`${ride.vehicleName} selected`);
  }, []);

  const handleSelectRental = useCallback((rental) => {
    // console.log("rentalPrices",rental)
    setSelectedRental(rental);
    setSelectedRide(rental);
    setShowTimePicker(true);
    setSelectedHours(0);
    setPriceCache({});
  }, []);

  const stopBookingProcess = useCallback(
    (reason) => {
      setIsBookingInProgress(false);
      setIsSearching(false);

      if (bookingTimeoutId) {
        clearTimeout(bookingTimeoutId);
        setBookingTimeoutId(null);
      }
      if (poolingTimeoutId) {
        clearTimeout(poolingTimeoutId);
        setPoolingTimeoutId(null);
      }
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }

      track("ACTION", "booking", `Booking stopped: ${reason}`);
    },
    [bookingTimeoutId, poolingTimeoutId, pollingIntervalId, track]
  );

  const handleHourSelect = useCallback(
    (hours) => {
      setSelectedHours(hours);
      if (priceCache[hours]) {
        setSelectedRide({
          ...selectedRental,
          totalPrice: priceCache[hours].totalPrice,
        });
      }
    },
    [priceCache, selectedRental]
  );

  const handleApplyCoupon = useCallback(
    (code) => {
      if (!code) {
        setAppliedCoupon("");
        setCouponDiscount(0);
        return;
      }
      const upper = code.toUpperCase();
      let disc = 0;
      if (upper === "SAVE10")
        disc = floor((farePayload?.total_fare || 0) * 0.1);
      else if (upper === "FIRST50")
        disc = Math.min(50, floor((farePayload?.total_fare || 0) * 0.15));
      else {
        showToast("Invalid coupon");
        disc = 0;
      }

      setAppliedCoupon(upper);
      setCouponDiscount(disc);
      if (disc) showToast(`Saved ${formatPrice(disc)}`);
    },
    [farePayload]
  );

  const pollRideStatusLight = useCallback(async () => {
    if (!createdRideId || !isBookingInProgress) return;

    try {
      const { data } = await axios.get(
        `https://www.appv2.olyox.com/rider-light/${createdRideId}`,
        {
          timeout: 8000,
        }
      );

      const { ride_status, driver_location, payment_status, rideId } =
        data.data || {};

      console.log("Light API data:", data.data);

      setLightData((prev) => ({
        ride_status: ride_status || prev.ride_status,
        driver_location: driver_location || prev.driver_location,
        payment_status: payment_status || prev.payment_status,
      }));

      setCurrentRideStatus(ride_status);
      setBookingMessage(`Status: ${ride_status}`);

      if (ride_status === "driver_assigned") {
        showToast("Driver Assigned!");
        stopBookingProcess("DRIVER_ASSIGNED");

        navigation.reset({
          index: 0,
          routes: [
            {
              name: "RideStarted",
              params: {
                driver: data.data,
                origin,
                destination,
                selectedRide,
                dropoff: dropoff?.description || data?.dropoff?.description,
                pickup: pickup?.description || data?.pickup?.description,
                rideId: rideId,
                rideOtp: rideOtp,
              },
            },
          ],
        });
      } else if (ride_status === "cancelled") {
        showToast("Ride Cancelled");
        stopBookingProcess("CANCELLED_BY_SYSTEM");
      } else if (ride_status === "completed") {
        showToast("Ride Completed!");
        stopBookingProcess("COMPLETED");
      }
    } catch (err) {
      console.log("Polling error:", err.message);
    }
  }, [
    createdRideId,
    isBookingInProgress,
    navigation,
    origin,
    destination,
    selectedRide,
    dropoff,
    pickup,
    rideOtp,
    stopBookingProcess,
  ]);

  useEffect(() => {
    if (isBookingInProgress && createdRideId) {
      const interval = setInterval(() => {
        pollRideStatusLight();
      }, 4000);
      setPollingIntervalId(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isBookingInProgress, createdRideId]);

  const handleBookNow = useCallback(async () => {
    if (!selectedRide) return showToast("Select a ride");
    if (selectedRide.isRental && !priceCache[selectedHours])
      return showToast("Choose rental duration");

    setShowTimePicker(false);
    setIsSearching(true);
    setIsBookingInProgress(true);
    setBookingMessage("Requesting ride...");
    const rideData = {
      vehicleType: selectedRide.vehicleName || selectedRide.vehicleType,
      pickupLocation: origin,
      dropLocation: destination,
      currentLocation: currentLocation || origin,
      pick_desc: pickup?.description || data?.pickup?.description,
      drop_desc: dropoff?.description || data?.dropoff?.description,
      isCashbackApply,
      cashback: farePayload.cashback_applied,
      withoutcashback: farePayload.original_price,
      fare: farePayload,
      completeFare: selectedRide?.pricing,
      paymentMethod,
      platform: Platform.OS,
      isPooling: false,
      isIntercity: isIntercityOrLater,
      isRental: !!selectedRide.isRental,
      rentalHours: farePayload.rental_hours || 0,
      estimatedKm: farePayload.estimated_km || 0,
      isLater: isLater,
    };

    if (isIntercityOrLater === true) {
      stopBookingProcess("INTERCITY_REDIRECT");
      navigation.navigate("confirm_screen_done", {
        origin,
        destination,
        selectedRide,
        routeInfo: farePayload,
        dropoff: rideData.drop_desc,
        pickup: rideData.pick_desc,
        price: farePayload,
        isLater,
        isRental: !!selectedRide.isRental,
        rentalHours: farePayload.rental_hours || 0,
        estimatedKm: farePayload.estimated_km || 0,
      });
      track(
        "ACTION",
        "booking",
        "Navigated to confirm_screen_done for intercity",
        { isLater }
      );
      return;
    }

    try {
      const token = await tokenCache.getToken("auth_token_db");
      const response = await axios.post(
        `https://www.appv2.olyox.com/api/v1/new/new-ride`,
        rideData,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }
      );

      if (response.data?.success && response.data.data?.rideId) {
        const rideDetails = response.data.data;
        setCreatedRideId(response.data.data?.rideId);
        if (rideDetails.ride_otp) setRideOtp(rideDetails.ride_otp);
        setBookingMessage("Searching for drivers...");
        setCurrentRideStatus(rideDetails.ride_status || "searching");

        track("API_SUCCESS", "booking", "Ride created", {
          rideId: rideDetails.rideId,
        });

        const poolTimeout = setTimeout(() => {
          if (isBookingInProgress) {
            setRidePoolingEnabled(true);
            setBookingMessage("Expanding search with ride pooling...");
            track("ACTION", "booking", "Ride pooling enabled");
          }
        }, 4000);
        setPoolingTimeoutId(poolTimeout);

        const bookTimeout = setTimeout(() => {
          if (isBookingInProgress && currentRideStatus !== "driver_assigned") {
            showToast("No Drivers Found");
            track("WARNING", "booking", "Booking timeout");
            stopBookingProcess("TIMEOUT");
          }
        }, BOOKING_TIMEOUT);
        setBookingTimeoutId(bookTimeout);
      } else {
        throw new Error(response.data?.message || "Invalid server response.");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to create ride.";
      console.log(errorMessage);
      showToast(errorMessage);
      track("API_ERROR", "booking", "Create ride failed", {
        error: errorMessage,
      });
      stopBookingProcess("CREATE_RIDE_API_ERROR");
    }
  }, [
    selectedRide,
    origin,
    destination,
    currentLocation,
    pickup,
    dropoff,
    data,
    farePayload,
    paymentMethod,
    isCashbackApply,
    isBookingInProgress,
    currentRideStatus,
    stopBookingProcess,
    track,
    isIntercityOrLater,
    isLater,
    navigation,
    priceCache,
    selectedHours,
  ]);

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
              stopBookingProcess("USER_CANCELLED");
              if (createdRideId) {
                const token = await tokenCache.getToken("auth_token_db");
                if (token) {
                  await axios.post(
                    `${API_BASE_URL}/cancel-before/${createdRideId}`,
                    {},
                    {
                      headers: { Authorization: `Bearer ${token}` },
                      timeout: 10000,
                    }
                  );
                }
              }
              setCreatedRideId(null);
              setRideOtp(null);
              setIsSearching(false);
              setRidePoolingEnabled(false);
              showToast("Ride cancelled successfully.");
              track("ACTION", "booking", "User cancelled ride");
            } catch (error) {
              showToast("Error cancelling ride.");
              track("ERROR", "booking", "Cancel failed", {
                error: error.message,
              });
            }
          },
        },
      ]
    );
  }, [createdRideId, stopBookingProcess, track]);

  useEffect(() => {
    if (isSearching) {
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
        ])
      ).start();
    } else {
      searchAnimation.setValue(0);
    }
  }, [isSearching, searchAnimation]);

  const pulseScale = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const pulseOpacity = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={18} color="#000" />
        </TouchableOpacity>
        {/* <Text style={styles.headerTitle}>Book Your Ride</Text> */}
      </View>

      <View style={styles.mapContainer}>
        <Map
          origin={origin}
          destination={destination}
          encodedPolyline={polyline}
          animateDriver={isSearching}
        />
        {isSearching && (
          <View style={styles.mapOverlay}>
            <Animated.View
              style={[
                styles.searchPulse,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            <View style={styles.searchDot} />
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {ridePercentageOff > 0 && (
            <View style={styles.offerBanner}>
              <View style={styles.offerBadge}>
                <Icon name="gift" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.offerTitle}>Special Offer!</Text>
                <Text style={styles.offerSubtitle}>
                  Get {ridePercentageOff}% off
                </Text>
              </View>
            </View>
          )}

          {cashback > 0 && (
            <CouponBar
              appliedCoupon={appliedCoupon}
              onApplyCoupon={handleApplyCoupon}
              isCashbackApply={isCashbackApply}
              onToggleCashback={setIsCashbackApply}
              cashback={cashback}
              cashbackCanApply={farePayload?.cashback_can_apply ?? false}
              cashbackApplied={farePayload?.cashback_applied ?? 0}
            />
          )}

          <View style={styles.section}>
            {showShimmer ? (
              <>
                <View style={styles.skeleton} />
                <View style={styles.skeleton} />
              </>
            ) : (
              <>
                {vehiclePrices.map((ride, i) => {
                  const isSel =
                    selectedRide?.vehicleId === ride.vehicleId &&
                    !ride.isRental;
                  const total = ride?.totalPrice;

                  const price =
                    total + Math.floor((total * ridePercentageOff) / 100);

                  const disc = Math.floor((price * ridePercentageOff) / 100);
                  const afterDiscount = price - disc;

                  const canApplyCashback =
                    afterDiscount >= MIN_CASHBACK_AMOUNT && cashback > 0;

                  const cashbackAmount =
                    isSel && isCashbackApply && canApplyCashback
                      ? Math.min(cashback, Math.floor(afterDiscount * 0.3))
                      : 0;

                  const finalPrice = total - cashbackAmount;

                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleSelectRide(ride)}
                      style={[styles.rideCard, isSel && styles.rideCardActive]}
                    >
                      <View style={styles.rideIconContainer}>
                        <Image
                          source={{ uri: ride.vehicleImage }}
                          style={styles.rideIconImage}
                          resizeMode="contain"
                        />
                      </View>

                      <View style={styles.rideInfo}>
                        <Text style={styles.rideName}>{ride.vehicleName}</Text>
                        <Text style={styles.rideDetails}>
                          {Math.round(distanceKm)} km •{" "}
                          {Math.round(durationMins)} min
                        </Text>

                        {cashbackAmount > 0 && (
                          <View style={styles.cashbackBadge}>
                            <Icon name="star" size={10} color="#FFD700" />
                            <Text style={styles.cashbackText}>
                              Wow! ₹{cashbackAmount} cashback used
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.priceContainer}>
                        {(disc > 0 || cashbackAmount > 0) && (
                          <Text style={styles.originalPrice}>
                            {formatPrice(price)}
                          </Text>
                        )}
                        <Text style={styles.discountedPrice}>
                          {formatPrice(finalPrice)}
                        </Text>
                        {(disc > 0 || cashbackAmount > 0) && (
                          <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                              Save {formatPrice(disc + cashbackAmount)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {rentalPrices.length > 0 && (
                  <>
                    <Text style={styles.rentalHeader}>Rental Packages</Text>
                    {rentalPrices.map((rental, i) => {
                      const isSel =
                        selectedRental?.vehicleName === rental.vehicleName;
                      const displayPrice =
                        (isSel && priceCache[selectedHours]?.totalPrice) ||
                        rental.totalPrice;

                      const canApplyCashback =
                        displayPrice >= MIN_CASHBACK_AMOUNT && cashback > 0;
                      const cashbackAmount =
                        isSel && isCashbackApply && canApplyCashback
                          ? Math.min(cashback, floor(displayPrice * 0.3))
                          : 0;
                      const finalRentalPrice = displayPrice - cashbackAmount;

                      return (
                        <TouchableOpacity
                          key={`r-${i}`}
                          onPress={() => handleSelectRental(rental)}
                          style={[
                            styles.rideCard,
                            isSel && styles.rideCardActive,
                          ]}
                        >
                          <View style={styles.rideIconContainer}>
                            <Image
                              source={{ uri: rental.vehicleImage }}
                              style={styles.rideIconImage}
                              resizeMode="contain"
                            />
                          </View>
                          <View style={styles.rideInfo}>
                            <Text style={styles.rideName}>
                              {rental.vehicleType}
                            </Text>
                            <Text style={styles.rideDetails}>
                              {isSel ? `${selectedHours || 1}h` : `1h`} •{" "}
                              {round(rental.distanceInKm)} km
                            </Text>
                            {cashbackAmount > 0 && (
                              <View style={styles.cashbackBadge}>
                                <Icon name="star" size={10} color="#FFD700" />
                                <Text style={styles.cashbackText}>
                                  Wow! ₹{cashbackAmount} cashback used
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.priceContainer}>
                            {cashbackAmount > 0 && (
                              <Text style={styles.originalPrice}>
                                {formatPrice(displayPrice)}
                              </Text>
                            )}
                            <Text style={styles.discountedPrice}>
                              {formatPrice(finalRentalPrice)}
                            </Text>
                            {cashbackAmount > 0 && (
                              <View style={styles.savingsBadge}>
                                <Text style={styles.savingsText}>
                                  Save {formatPrice(cashbackAmount)}
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            onPress={() =>
              Alert.alert("Payment", "Choose method", [
                { text: "Cash", onPress: () => setPaymentMethod("Cash") },
                { text: "UPI", onPress: () => setPaymentMethod("UPI") },
                { text: "Online", onPress: () => setPaymentMethod("Online") },
                { text: "Cancel", style: "cancel" },
              ])
            }
            style={styles.paymentCard}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.paymentIcon}>
                <Icon name="wallet" size={20} color="#000" />
              </View>
              <View>
                <Text style={styles.paymentLabel}>Payment Method</Text>
                <Text style={styles.paymentValue}>{paymentMethod}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </ScrollView>

        {!selectedRide?.isRental && (
          <TouchableOpacity
            disabled={!selectedRide || isSearching}
            onPress={handleBookNow}
            style={[
              styles.bookButton,
              (!selectedRide || isSearching) && styles.bookButtonDisabled,
            ]}
          >
            {isSearching ? (
              <View style={styles.bookButtonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.bookButtonText}>Searching...</Text>
              </View>
            ) : (
              <View style={styles.bookButtonContent}>
                <Text style={styles.bookButtonText}>
                  {isIntercityOrLater
                    ? `Book ${isLater ? "Later" : "Intercity"} Ride`
                    : "Confirm Booking"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Select Rental Duration</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Icon name="times" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.infoBox}>
              <Text style={modalStyles.infoText}>
                After the desired and selected time or km, extra time will be
                charged at <Text style={modalStyles.bold}>₹3/min</Text> and
                extra distance at <Text style={modalStyles.bold}>₹13/km</Text>.
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={modalStyles.scrollContainer}
            >
              {timeOptions.map((hours) => {
                const isSel = selectedHours === hours;
                const data = priceCache[hours] || { loading: true };

                // Calculate cashback for this rental option
                const basePrice = data.totalPrice || 0;
                const canApplyCashback =
                  basePrice >= MIN_CASHBACK_AMOUNT && cashback > 0;
                const cashbackAmount =
                  isCashbackApply && canApplyCashback
                    ? Math.min(cashback, floor(basePrice * 0.3))
                    : 0;
                const finalPrice = basePrice - cashbackAmount;

                return (
                  <TouchableOpacity
                    key={hours}
                    onPress={() => handleHourSelect(hours)}
                    style={[
                      modalStyles.hourCard,
                      isSel && modalStyles.hourCardActive,
                    ]}
                  >
                    <View style={modalStyles.hourSection}>
                      <Text
                        style={[
                          modalStyles.hourText,
                          isSel && modalStyles.hourTextActive,
                        ]}
                      >
                        {hours} Hour{hours > 1 ? "s" : ""}
                      </Text>
                      {cashbackAmount > 0 && isSel && (
                        <View style={modalStyles.cashbackTag}>
                          <Icon name="star" size={8} color="#FFD700" />
                          <Text style={modalStyles.cashbackTagText}>
                            -₹{cashbackAmount}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={modalStyles.kmSection}>
                      <Text
                        style={[
                          modalStyles.kmLabel,
                          isSel && modalStyles.kmLabelActive,
                        ]}
                      >
                        KM
                      </Text>
                      <Text
                        style={[
                          modalStyles.kmText,
                          isSel && modalStyles.kmTextActive,
                        ]}
                      >
                        {data.loading ? "..." : `${Math.round(data.totalKm)}`}
                      </Text>
                    </View>

                    <View style={modalStyles.priceSection}>
                      {data.loading ? (
                        <ActivityIndicator
                          size="small"
                          color={isSel ? "#fff" : "#666"}
                        />
                      ) : (
                        <>
                          {cashbackAmount > 0 && (
                            <Text
                              style={[
                                modalStyles.originalPriceModal,
                                isSel && modalStyles.originalPriceModalActive,
                              ]}
                            >
                              {formatPrice(basePrice)}
                            </Text>
                          )}
                          <Text
                            style={[
                              modalStyles.priceText,
                              isSel && modalStyles.priceTextActive,
                            ]}
                          >
                            {formatPrice(finalPrice)}
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[
                modalStyles.confirmBtn,
                (!selectedHours ||
                  (priceCache[selectedHours] &&
                    priceCache[selectedHours].loading)) &&
                  modalStyles.confirmBtnDisabled,
              ]}
              onPress={handleBookNow}
              disabled={
                !selectedHours ||
                (priceCache[selectedHours] && priceCache[selectedHours].loading)
              }
            >
              <Text style={modalStyles.confirmBtnText}>Confirm Booking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.cancelBtn}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isSearching && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator color="#000" size="large" />
            <Text style={styles.overlayTitle}>Finding Driver</Text>
            <Text style={styles.overlayMessage}>{bookingMessage}</Text>
            {ridePoolingEnabled && (
              <View style={styles.poolingBadge}>
                <Icon name="users" size={14} color="#4CAF50" />
                <Text style={styles.poolingText}>Pool Ride Active</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleCancelBooking}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { position: "absolute", top: 12, left: 16, zIndex: 100 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapContainer: { height: 260, backgroundColor: "#e5e7eb" },
  mapOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -30,
    marginLeft: -30,
  },
  searchPulse: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#000",
  },
  searchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000",
    borderWidth: 3,
    borderColor: "#fff",
  },
  panel: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
  },
  content: { padding: 20, gap: 20, paddingBottom: 24 },
  offerBanner: {
    flexDirection: "row",
    backgroundColor: "#000",
    borderRadius: 16,
    padding: 6,
    gap: 12,
  },
  offerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  offerTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  offerSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  section: { gap: 12 },
  skeleton: {
    height: 88,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginBottom: 12,
  },
  rideCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  rideCardActive: { borderColor: "#000", borderWidth: 2, elevation: 4 },
  rideIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  rideIconImage: { width: 48, height: 48 },
  rideInfo: { flex: 1 },
  rideName: { fontWeight: "800", fontSize: 16, color: "#000" },
  rideDetails: { fontSize: 13, color: "#6b7280" },
  priceContainer: { alignItems: "flex-end" },
  originalPrice: {
    fontSize: 13,
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },
  discountedPrice: { fontWeight: "900", fontSize: 20, color: "#000" },
  savingsBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  savingsText: { fontSize: 11, fontWeight: "700", color: "#000" },
  cashbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D4AF37",
  },
  rentalHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginTop: 8,
  },
  paymentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  paymentLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentLabel: { fontSize: 13, color: "#6b7280" },
  paymentValue: { fontSize: 15, fontWeight: "700", color: "#000" },
  bookButton: {
    backgroundColor: "#000",
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bookButtonDisabled: { opacity: 0.4 },
  bookButtonContent: { flexDirection: "row", gap: 12, alignItems: "center" },
  bookButtonText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  bookButtonPrice: { color: "#fff", fontWeight: "900", fontSize: 18 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  overlayCard: {
    backgroundColor: "#fff",
    padding: 32,
    borderRadius: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
    marginBottom: 8,
  },
  overlayMessage: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 28,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: { fontWeight: "700", color: "#000" },
  poolingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  poolingText: { fontSize: 14, fontWeight: "600", color: "#4CAF50" },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "90%",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#111" },
  infoBox: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
    lineHeight: 20,
  },
  bold: { fontWeight: "700", color: "#000" },
  scrollContainer: { paddingVertical: 8, gap: 12 },
  hourCard: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    justifyContent: "space-between",
    minHeight: 70,
  },
  hourCardActive: { backgroundColor: "#000", borderColor: "#000" },
  hourSection: { flex: 1, justifyContent: "center" },
  hourText: { fontSize: 16, fontWeight: "700", color: "#111" },
  hourTextActive: { color: "#fff" },
  cashbackTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    gap: 3,
  },
  cashbackTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D4AF37",
  },
  kmSection: { flex: 1, alignItems: "center", justifyContent: "center" },
  kmLabel: { fontSize: 11, fontWeight: "600", color: "#999", marginBottom: 4 },
  kmLabelActive: { color: "#ccc" },
  kmText: { fontSize: 15, fontWeight: "700", color: "#333" },
  kmTextActive: { color: "#fff" },
  priceSection: { flex: 1, alignItems: "flex-end", justifyContent: "center" },
  priceText: { fontSize: 16, fontWeight: "900", color: "#000" },
  priceTextActive: { color: "#fff" },
  originalPriceModal: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  originalPriceModalActive: {
    color: "#ccc",
  },
  confirmBtn: {
    backgroundColor: "#000",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    gap: 8,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  confirmBtnPrice: { color: "#fff", fontSize: 18, fontWeight: "900" },
  cancelBtn: { alignItems: "center", paddingVertical: 12, marginTop: 8 },
  cancelBtnText: { color: "#666", fontSize: 15, fontWeight: "600" },
});
