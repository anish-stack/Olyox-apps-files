import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import Maps from "../Components/Map";
import useCurrentRideStore from "../../../../Store/currentRideStore";
import { getRideLabel } from "../../../../utility/RideLabel";

export default function RideProgressScreen({
  currentStatus,
  rideDetails,
  staticData,
}) {
  const { fetchOnlyLocationAndStatus, fetchRideDetails, markDrop } = useCurrentRideStore();
  const [driverLocation, setDriverLocation] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [latestRideData, setLatestRideData] = useState(null);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  // ────────────────────── FETCH LATEST RIDE DATA ──────────────────────
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        const data = await fetchRideDetails(rideDetails?._id);
        if (data) {
          setLatestRideData(data);
        }
      } catch (err) {
        console.error("Failed to fetch ride details:", err);
      }
    };

    fetchLatestData();
  }, [rideDetails?._id]);

  // ────────────────────── POLLING DRIVER LOCATION ──────────────────────
  useEffect(() => {
    const startPolling = () => {
      intervalRef.current = setInterval(async () => {
        try {
          const data = await fetchOnlyLocationAndStatus(rideDetails._id);
          if (data?.driver_location) {
            setDriverLocation(data.driver_location);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, currentStatus === "in_progress" ? 10000 : 2000);
    };

    startPolling();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rideDetails._id, currentStatus, fetchOnlyLocationAndStatus]);

  // ────────────────────── RENTAL TIMER (UPDATE EVERY SECOND) ──────────────────────
  const isRental = rideDetails?.isRental === true;
  const rentalHours = rideDetails?.rentalHours || 0;
  const driverArrivedAt = latestRideData?.driver_arrived_at;

  useEffect(() => {
    if (!isRental || !driverArrivedAt) return;

    timerRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRental, driverArrivedAt]);

  // ────────────────────── CALCULATE ELAPSED TIME (MEMOIZED) ──────────────────────
  const elapsedTime = useMemo(() => {
    if (!isRental || !driverArrivedAt) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }

    const arrivedTime = new Date(driverArrivedAt).getTime();
    const diffMs = currentTime - arrivedTime;

    if (diffMs < 0) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds };
  }, [isRental, driverArrivedAt, currentTime]);

  // ────────────────────── RENTAL TIME STATUS (MEMOIZED) ──────────────────────
  const rentalTimeStatus = useMemo(() => {
    if (!isRental || !rentalHours) return null;

    const totalElapsedSeconds = elapsedTime.hours * 3600 + elapsedTime.minutes * 60 + elapsedTime.seconds;
    const totalElapsedMinutes = Math.floor(totalElapsedSeconds / 60);
    const rentalLimitMinutes = rentalHours * 60;
    const extraMinutes = totalElapsedMinutes - rentalLimitMinutes;

    return {
      totalElapsedMinutes,
      rentalLimitMinutes,
      isOverLimit: extraMinutes > 0,
      extraMinutes: Math.max(0, extraMinutes),
      percentage: Math.min((totalElapsedMinutes / rentalLimitMinutes) * 100, 100),
    };
  }, [isRental, rentalHours, elapsedTime]);

  // ────────────────────── PARCEL ORDER CHECK ──────────────────────
  const isParcelOrder = rideDetails?.isParcelOrder === true;
  const receiverDetails = latestRideData?.details?.reciver_details;
  const hasPickupPhoto = !!latestRideData?.details?.pickup_photo?.url;
  const hasDeliveryPhoto = !!latestRideData?.details?.delivery_photo?.url;

  // ────────────────────── CALL RECEIVER ──────────────────────
  const callReceiver = useCallback(() => {
    if (!receiverDetails?.contact_number) {
      Alert.alert("Error", "Receiver phone number not available");
      return;
    }
    const phone = receiverDetails.contact_number;
    const url = `tel:${phone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open dialer");
    });
  }, [receiverDetails?.contact_number]);

  // ────────────────────── RIDE TYPE & LABELS ──────────────────────
  const rideType = useMemo(() => getRideLabel(rideDetails), [rideDetails]);

  const isLater = rideDetails?.isLater === true;
  const isIntercity = rideDetails?.isIntercity === true || rideDetails?.isIntercityRides === true;

  // ────────────────────── FORMATTED PICKUP TIME ──────────────────────
  const formatPickupTime = useCallback(() => {
    if (!rideDetails) return "N/A";

    let timeSource = null;

    if (isLater || isIntercity) {
      timeSource = rideDetails.IntercityPickupTime;
    }

    if (!timeSource) return "Immediate";

    const date = new Date(timeSource);
    if (isNaN(date.getTime())) return "Scheduled";

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "short",
      timeStyle: "short",
    });
  }, [rideDetails, isLater, isIntercity]);

  // ────────────────────── TIME TO PICKUP ──────────────────────
  const getTimeToPickup = useCallback(() => {
    if (!rideDetails || !(isLater || isIntercity)) return null;

    const pickupTimeStr = rideDetails.IntercityPickupTime;
    if (!pickupTimeStr) return null;

    const pickupTime = new Date(pickupTimeStr);
    const now = new Date();
    const diffMs = pickupTime - now;

    if (diffMs <= 0) return "Pickup time passed";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, [rideDetails, isLater, isIntercity]);

  const timeToPickup = getTimeToPickup();

  // ────────────────────── OPEN GOOGLE MAPS ──────────────────────
  const openGoogleMaps = useCallback(() => {
    const drop = rideDetails?.dropLocation;
    if (!drop || drop.length < 2) {
      Alert.alert("Error", "Drop location not available");
      return;
    }

    const [lng, lat] = drop;
    const label = "Drop Location";

    const scheme = Platform.select({
      ios: "maps:0,0?q=",
      android: "geo:0,0?q=",
    });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
    );
  }, [rideDetails?.dropLocation]);

  // ────────────────────── MARK RIDE AS COMPLETED ──────────────────────
  const handleMarkDrop = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      const success = await markDrop(rideDetails?.user?._id, rideDetails?._id);
      if (success) {
        Alert.alert("Success", isParcelOrder ? "Parcel delivered!" : "Ride completed!", [
          { text: "OK" },
        ]);
      }
    } catch (err) {
      console.error("Mark drop failed:", err);
      Alert.alert("Error", err.message || "Unable to complete");
    } finally {
      setIsCompleting(false);
    }
  }, [isCompleting, markDrop, rideDetails, isParcelOrder]);

  // ────────────────────── RENDER ──────────────────────
  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <Maps
          driverLocationDb={driverLocation?.coordinates}
          pickupLocation={rideDetails?.pickupLocation}
          dropLocation={rideDetails?.dropLocation}
          polygon={rideDetails?.routeInfo?.polyline}
          status={rideDetails?.ride_status}
          distance={rideDetails?.routeInfo?.distance}
          duration={rideDetails?.routeInfo?.duration}
        />
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Status Header */}
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <View style={styles.statusDotContainer}>
                <View style={styles.statusDot} />
              </View>
              <View>
                <Text style={styles.statusText}>
                  {isParcelOrder ? "Parcel Delivery in Progress" : "Ride in Progress"}
                </Text>
                {/* <Text style={styles.statusSubtext}>Driver is on the way</Text> */}
              </View>
            </View>
            
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{rideType.toUpperCase()}</Text>
              </View>
              {isParcelOrder && (
                <View style={[styles.badge, styles.parcelBadge]}>
                  <Text style={styles.badgeText}>PARCEL</Text>
                </View>
              )}
              {isRental && (
                <View style={[styles.badge, styles.rentalBadge]}>
                  <Text style={styles.badgeText}>RENTAL</Text>
                </View>
              )}
              {isLater && (
                <View style={[styles.badge, styles.laterBadge]}>
                  <Text style={styles.badgeText}>LATER</Text>
                </View>
              )}
              {isIntercity && (
                <View style={[styles.badge, styles.intercityBadge]}>
                  <Text style={styles.badgeText}>INTERCITY</Text>
                </View>
              )}
            </View>
          </View>

          {/* Receiver Details (Parcel Only) */}
          {isParcelOrder && receiverDetails && (
            <View style={styles.receiverCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Receiver Details</Text>
              </View>

              <View style={styles.receiverContent}>
                <View style={styles.receiverInfo}>
                  <Text style={styles.receiverName}>{receiverDetails.name}</Text>
                  <Text style={styles.receiverPhone}>{receiverDetails.contact_number}</Text>
                  {receiverDetails.appartment && (
                    <Text style={styles.receiverDetail}>Apartment: {receiverDetails.appartment}</Text>
                  )}
                 
                </View>

                <TouchableOpacity style={styles.callButton} onPress={callReceiver}>
                  <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Parcel Photos */}
          {(hasPickupPhoto || hasDeliveryPhoto) && isParcelOrder && (
            <View style={styles.photoSection}>
              <Text style={styles.sectionTitle}>Parcel Photos</Text>
              <View style={styles.photoRow}>
                {hasPickupPhoto && (
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: latestRideData.details.pickup_photo.url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    <Text style={styles.photoLabel}>Pickup</Text>
                  </View>
                )}
                {hasDeliveryPhoto && (
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: latestRideData.details.delivery_photo.url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    <Text style={styles.photoLabel}>Delivery</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Rental Timer Card */}
          {isRental && driverArrivedAt && (
            <View style={[
              styles.rentalTimerCard,
              rentalTimeStatus?.isOverLimit && styles.rentalTimerCardOverLimit
            ]}>
              <View style={styles.rentalTimerHeader}>
                <View>
                  <Text style={styles.timerLabel}>Rental Duration</Text>
                  <Text style={[
                    styles.timerValue,
                    rentalTimeStatus?.isOverLimit && styles.timerValueOver
                  ]}>
                    {String(elapsedTime.hours).padStart(2, '0')}:{String(elapsedTime.minutes).padStart(2, '0')}:{String(elapsedTime.seconds).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.timerLimit}>/ {rentalHours}h</Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill,
                      rentalTimeStatus?.isOverLimit && styles.progressBarFillOver,
                      { width: `${Math.min(rentalTimeStatus?.percentage || 0, 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={[
                  styles.progressPercentage,
                  rentalTimeStatus?.isOverLimit && styles.progressPercentageOver
                ]}>
                  {Math.round(rentalTimeStatus?.percentage || 0)}%
                </Text>
              </View>

              {rentalTimeStatus?.isOverLimit && (
                <View style={styles.extraTimeWarning}>
                  <Text style={styles.extraTimeText}>
                    ⚠ Exceeded by {Math.floor(rentalTimeStatus.extraMinutes / 60)}h {rentalTimeStatus.extraMinutes % 60}m
                  </Text>
                </View>
              )}

              {!rentalTimeStatus?.isOverLimit && (
                <View style={styles.timeRemainingContainer}>
                  <Text style={styles.timeRemainingText}>
                    {Math.floor((rentalTimeStatus?.rentalLimitMinutes - rentalTimeStatus?.totalElapsedMinutes) / 60)}h{' '}
                    {(rentalTimeStatus?.rentalLimitMinutes - rentalTimeStatus?.totalElapsedMinutes) % 60}m remaining
                  </Text>
                </View>
              )}

              <View style={styles.rentalDetailsRow}>
                <Text style={styles.rentalDetailText}>
                  {rideDetails.rentalHours}h Package • {rideDetails.rental_km_limit} km limit
                </Text>
              </View>
            </View>
          )}

          {/* Trip Info */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>Duration</Text>
              <Text style={styles.cardValue}>
                {rideDetails?.routeInfo?.duration || "--"}
              </Text>
              <Text style={styles.cardUnit}>minutes</Text>
            </View>
            
            <View style={styles.infoCardDivider} />
            
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>Distance</Text>
              <Text style={styles.cardValue}>
                {(rideDetails?.routeInfo?.distance || 0).toFixed(1)}
              </Text>
              <Text style={styles.cardUnit}>kilometers</Text>
            </View>
          </View>

          {/* Later Ride Info */}
          {isLater && (
            <View style={styles.laterInfo}>
              <Text style={styles.laterLabel}>Scheduled Pickup</Text>
              <Text style={styles.laterTime}>{formatPickupTime()}</Text>
              {timeToPickup && (
                <Text style={styles.timeToPickup}>Starts in {timeToPickup}</Text>
              )}
            </View>
          )}

          {/* Route */}
          <View style={styles.routeCard}>
            <Text style={styles.sectionTitle}>Trip Route</Text>
            
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <View style={styles.dotContainer}>
                  <View style={styles.pickupDot} />
                  <View style={styles.routeLine} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                  <Text style={styles.routeAddress}>
                    {rideDetails?.pickupAddress || "Loading..."}
                  </Text>
                </View>
              </View>

              <View style={styles.routePoint}>
                <View style={styles.dotContainer}>
                  <View style={styles.dropDot} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>DROP-OFF LOCATION</Text>
                  <Text style={styles.routeAddress}>
                    {rideDetails?.dropAddress || "Loading..."}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.primaryButton, isCompleting && styles.disabledBtn]}
              onPress={handleMarkDrop}
              disabled={isCompleting}
            >
              <Text style={styles.primaryButtonText}>
                {isCompleting ? "Completing..." : isParcelOrder ? "Mark as Delivered" : "Mark as Dropped"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={openGoogleMaps}
            >
              <Text style={styles.secondaryButtonText}>Navigate to Drop</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ────────────────────── STYLES ──────────────────────
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  mapContainer: { 
    flex: 1 
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    maxHeight: '70%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  handleContainer: { 
    alignItems: "center", 
    paddingTop: 8,
    paddingBottom: 16,
  },
  handle: { 
    width: 40, 
    height: 4, 
    backgroundColor: "#E5E5E5", 
    borderRadius: 2 
  },

  // Status Header
  statusHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    marginBottom: 20 
  },
  statusLeft: { 
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
  },
  statusDotContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: "#000" 
  },
  statusText: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#000",
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 13,
    color: "#666",
    fontWeight: "400",
  },

  badges: { 
    flexDirection: "row", 
    flexWrap: "wrap",
    gap: 6,
    marginLeft: 8,
  },
  badge: { 
    backgroundColor: "#000", 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12 
  },
  badgeText: { 
    color: "#FFFFFF", 
    fontSize: 10, 
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  parcelBadge: { backgroundColor: "#666" },
  rentalBadge: { backgroundColor: "#333" },
  laterBadge: { backgroundColor: "#444" },
  intercityBadge: { backgroundColor: "#555" },

  // Receiver Card
  receiverCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  receiverContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiverInfo: {
    flex: 1,
  },
  receiverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  receiverPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  receiverDetail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  savedAsTag: {
    backgroundColor: "#000",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  savedAsText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  callButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 12,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Parcel Photos
  photoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  photoRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoContainer: {
    flex: 1,
  },
  photo: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    marginBottom: 6,
  },
  photoLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },

  // Rental Timer Card
  rentalTimerCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  rentalTimerCardOverLimit: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FFE5E5",
  },
  rentalTimerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 1,
  },
  timerValueOver: {
    color: "#DC2626",
  },
  timerLimit: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E5E5",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#000",
    borderRadius: 3,
  },
  progressBarFillOver: {
    backgroundColor: "#DC2626",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    minWidth: 40,
    textAlign: "right",
  },
  progressPercentageOver: {
    color: "#DC2626",
  },
  extraTimeWarning: {
    backgroundColor: "#DC2626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  extraTimeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  timeRemainingContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  timeRemainingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  rentalDetailsRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  rentalDetailText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },

  // Info Cards
  infoCards: { 
    flexDirection: "row", 
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  infoCard: {
    flex: 1,
    alignItems: "center",
  },
  infoCardDivider: {
    width: 1,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 16,
  },
  cardLabel: { 
    fontSize: 12, 
    color: "#666", 
    marginBottom: 6,
    fontWeight: "500",
  },
  cardValue: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#000",
    marginBottom: 2,
  },
  cardUnit: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },

  // Later Info
  laterInfo: { 
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  laterLabel: { 
    fontSize: 12, 
    color: "#666",
    marginBottom: 4,
  },
  laterTime: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#000",
    marginBottom: 4,
  },
  timeToPickup: { 
    fontSize: 13, 
    color: "#059669",
    fontWeight: "500",
  },

  // Route
  routeCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  routeContainer: {},
  routePoint: { 
    flexDirection: "row", 
    alignItems: "flex-start" 
  },
  dotContainer: { 
    width: 24, 
    alignItems: "center", 
    paddingTop: 4 
  },
  pickupDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: "#000" 
  },
  dropDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: "#666" 
  },
  routeLine: { 
    width: 2, 
    height: 40, 
    backgroundColor: "#E5E5E5", 
    marginVertical: 8 
  },
  routeInfo: { 
    flex: 1, 
    marginLeft: 12 
  },
  routeLabel: { 
    fontSize: 11, 
    color: "#999", 
    fontWeight: "700", 
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  routeAddress: { 
    fontSize: 14, 
    color: "#000", 
    fontWeight: "500", 
    lineHeight: 20 
  },

  // Action Buttons
  actionButtons: { 
    gap: 10, 
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: { 
    opacity: 0.5 
  },
  primaryButtonText: { 
    color: "#FFFFFF", 
    fontSize: 16, 
    fontWeight: "700" 
  },
  secondaryButton: {
    backgroundColor: "#FAFAFA",
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  secondaryButtonText: { 
    color: "#000", 
    fontSize: 16, 
    fontWeight: "700" 
  },
});