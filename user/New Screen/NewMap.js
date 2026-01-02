"use client";

import React, {
  useMemo,
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  Polyline,
} from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { Ionicons } from "@expo/vector-icons";
import haversine from "haversine-distance";
import useSettings from "../hooks/Settings";
import polyline from "@mapbox/polyline"; // <-- Add this dependency

const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = 0.02;
const EDGE_PADDING = { top: 100, right: 80, bottom: 180, left: 80 };

// Speed estimates (only for driver → pickup)
const SPEED = {
  TRAFFIC: 25,
  NORMAL: 40,
  HIGHWAY: 60,
};

// Format distance
const formatDistance = (meters) => {
  if (!meters) return "—";
  return meters < 1000
    ? `${Math.round(meters)}m`
    : `${(meters / 1000).toFixed(1)}km`;
};

// Format ETA
const formatETA = (minutes) => {
  if (!minutes) return "Calculating...";
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m > 0 ? `${m}m` : ""}`;
};

// Safe coordinate parser
const getCoords = (loc, type = "array") => {
  try {
    if (!loc) return null;

    if (type === "array" && Array.isArray(loc) && loc.length >= 2) {
      const lat = parseFloat(loc[1]);
      const lng = parseFloat(loc[0]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { latitude: lat, longitude: lng };
      }
    } else if (loc?.latitude && loc?.longitude) {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch {}
  return null;
};

// Custom Markers
const DriverMarker = ({ size = 44 }) => (
  <View style={[styles.marker, styles.driverMarker, { width: size, height: size }]}>
    <Ionicons name="car" size={size * 0.55} color="#fff" />
  </View>
);

const PickupMarker = ({ size = 44 }) => (
  <View style={[styles.marker, styles.pickupMarker, { width: size, height: size }]}>
    <Ionicons name="person" size={size * 0.55} color="#fff" />
  </View>
);

const DropMarker = ({ size = 44 }) => (
  <View style={[styles.marker, styles.dropMarker, { width: size, height: size }]}>
    <Ionicons name="location" size={size * 0.6} color="#fff" />
  </View>
);

// Main Component
const NewUserAndDriverMap = forwardRef(
  (
    {
      pickupLocation,
      DropLocation,
      DriverLocation,
      rideData,
      rideStatus,
      onUserInteraction,
      autoFocusType,
      shouldAutoFocus,
      platform,
    },
    ref
  ) => {
    const mapRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const [driverCoords, setDriverCoords] = useState(null);
    const [directionsError, setDirectionsError] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);

    const { settings } = useSettings();
    const GOOGLE_MAPS_APIKEY = settings?.googleApiKey || "AIzaSyBfRHuTByG6CiXtLbyzK_aKNpJfDiB4jUo";
    const isAndroid = platform === "android";
    const mapProvider = isAndroid ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

    // Parse coordinates
    const pickupCoords = getCoords(pickupLocation, "array");
    const dropCoords = getCoords(DropLocation, "array");
    const initialDriverCoords = getCoords(DriverLocation?.coordinates);
    const currentDriverCoords = driverCoords || initialDriverCoords;
    // Decode polyline from rideData
    const decodedPolyline = useMemo(() => {
      if (rideData?.polyline) {
        try {
          return polyline.decode(rideData.polyline).map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          }));
        } catch (e) {
          console.warn("Failed to decode polyline", e);
          return [];
        }
      }
      return [];
    }, [rideData?.polyline]);

    // Focus logic
    const focusOnMap = useCallback(() => {
      if (!mapRef.current || !mapReady) return;

      const coords = [];

      if (autoFocusType === "driver_to_pickup" && currentDriverCoords && pickupCoords) {
        coords.push(currentDriverCoords, pickupCoords);
      } else if (autoFocusType === "pickup_to_drop" && pickupCoords && dropCoords) {
        coords.push(pickupCoords, dropCoords);
      } else if (pickupCoords) {
        coords.push(pickupCoords);
      }

      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: EDGE_PADDING,
          animated: true,
        });
      }
    }, [mapReady, autoFocusType, currentDriverCoords, pickupCoords, dropCoords]);

    // Auto-focus on status change
    useEffect(() => {
      if (shouldAutoFocus && mapReady && !userInteracted) {
        const timer = setTimeout(focusOnMap, 800);
        return () => clearTimeout(timer);
      }
    }, [shouldAutoFocus, mapReady, userInteracted, focusOnMap]);

    // Reset interaction on status change
    useEffect(() => {
      setUserInteracted(false);
    }, [rideStatus]);

    // Update driver location from parent
    useEffect(() => {
      if (DriverLocation) {
        const coords = getCoords(DriverLocation);
        if (coords) setDriverCoords(coords);
      }
    }, [DriverLocation]);

    // Imperative API
    useImperativeHandle(ref, () => ({
      focusRoute: () => {
        setUserInteracted(false);
        focusOnMap();
      },
      animateToRegion: (region, duration = 1000) => {
        mapRef.current?.animateToRegion(region, duration);
      },
    }));

    // Distance & ETA from rideData (only for in_progress)
    const tripDistanceMeters = rideData?.distance ? rideData.distance * 1000 : null;
    const tripDurationMinutes = rideData?.duration ? Math.round(rideData.duration) : null;

    // Driver to Pickup (live)
    const driverToPickupDist = useMemo(() => {
      if (!currentDriverCoords || !pickupCoords) return null;
      return haversine(currentDriverCoords, pickupCoords);
    }, [currentDriverCoords, pickupCoords]);

    const driverETA = driverToPickupDist
      ? Math.ceil(driverToPickupDist / 1000 / SPEED.TRAFFIC * 60)
      : null;

    const showDriverETA = ["driver_assigned", "driver_arrived"].includes(rideStatus) && driverETA;
    const showTripETA = rideStatus === "in_progress" && tripDurationMinutes;

    const handleUserInteraction = () => {
      setUserInteracted(true);
      onUserInteraction?.();
    };

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={mapProvider}
          style={styles.map}
          initialRegion={{
            latitude: pickupCoords?.latitude || 28.6139,
            longitude: pickupCoords?.longitude || 77.2090,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          onMapReady={() => setMapReady(true)}
          onPanDrag={handleUserInteraction}
          onRegionChangeComplete={handleUserInteraction}
          showsUserLocation={false}
          showsMyLocationButton={false}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Pickup Marker */}
          {pickupCoords && rideStatus !== "in_progress" && (
            <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <PickupMarker />
            </Marker>
          )}

          {/* Driver Marker */}
          {currentDriverCoords && (
            <Marker
              coordinate={currentDriverCoords}
              title="Driver"
              description={driverToPickupDist ? `${formatDistance(driverToPickupDist)} away` : ""}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <DriverMarker />
            </Marker>
          )}

          {/* Drop Marker */}
          {dropCoords && (
            <Marker coordinate={dropCoords} anchor={{ x: 0.5, y: 1 }}>
              <DropMarker />
            </Marker>
          )}

          {/* Driver to Pickup Route (Live) */}
          {currentDriverCoords &&
            pickupCoords &&
            ["driver_assigned", "driver_arrived"].includes(rideStatus) && (
              <MapViewDirections
                origin={currentDriverCoords}
                destination={pickupCoords}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={5}
                strokeColor="#000"
                mode="DRIVING"
                onError={() => setDirectionsError(true)}
                onReady={() => setDirectionsError(false)}
              />
            )}

          {/* Pickup to Drop Route (Pre-calculated Polyline) */}
          {rideStatus === "in_progress" && decodedPolyline.length > 0 && (
            <Polyline
              coordinates={decodedPolyline}
              strokeWidth={5}
              strokeColor="#000"
            />
          )}
        </MapView>

        {/* Control Buttons */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              setUserInteracted(false);
              focusOnMap();
            }}
          >
            <Ionicons name="locate-outline" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* ETA Card */}
        {(showDriverETA || showTripETA) && (
          <View style={styles.etaCard}>
            <View style={styles.etaIcon}>
              <Ionicons
                name={showDriverETA ? "car-sport" : "navigate"}
                size={26}
                color="#000"
              />
            </View>
            <View style={styles.etaContent}>
              <View style={styles.etaRow}>
                <Text style={styles.etaValue}>
                  {showDriverETA
                    ? formatETA(driverETA)
                    : formatETA(tripDurationMinutes)}
                </Text>
                <Text style={styles.etaSeparator}>•</Text>
                <Text style={styles.etaDistance}>
                  {showDriverETA
                    ? formatDistance(driverToPickupDist)
                    : formatDistance(tripDistanceMeters)}
                </Text>
              </View>
              <Text style={styles.etaLabel}>
                {showDriverETA
                  ? "Driver arriving at pickup"
                  : "Estimated time to destination"}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
);

NewUserAndDriverMap.displayName = "NewUserAndDriverMap";

export default NewUserAndDriverMap;

// Styles (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Markers
  marker: {
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  driverMarker: { backgroundColor: "#000" },
  pickupMarker: { backgroundColor: "#2E8B57" },
  dropMarker: { backgroundColor: "#DC2626" },

  // Controls
  controls: {
    position: "absolute",
    right: 16,
    bottom: 140,
    gap: 12,
  },
  controlBtn: {
    backgroundColor: "#fff",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  // ETA Card
  etaCard: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  etaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  etaContent: { flex: 1 },
  etaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  etaValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#000",
    letterSpacing: -0.5,
  },
  etaSeparator: { fontSize: 20, fontWeight: "600", color: "#999" },
  etaDistance: { fontSize: 18, fontWeight: "700", color: "#444" },
  etaLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#666",
    marginTop: 2,
  },
});