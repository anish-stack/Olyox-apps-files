import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import useUserStore from '../../../../Store/useUserStore';
import useSettings from '../../../hooks/settings.hook';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_APIKEY = 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8'; // Replace with your API key

// Vibrant Dark Map Style
const customMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#1a1a2e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8e8e93" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#1a1a2e" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#4a4a5e" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#bdbdbd" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#0f3d3e" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6b9b6e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#2c2c3e" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#373745" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3c3c52" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1f1f2e" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#f3d19c" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#2c2c3e" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#0d47a1" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17263c" }]
  }
];

export default function RideMap({
  driverLocationDb = [],
  pickupLocation = [],
  dropLocation = [],
  polygon = [],
  status,
  distance,
  duration,
}) {
  const { user, fetchCurrentDetails } = useUserStore();
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const mapRef = useRef(null);
  const { settings, fetch } = useSettings()
  const driverLocation =
    driverLocationDb?.coordinates?.length === 2
      ? {
        latitude: driverLocationDb.coordinates[1],
        longitude: driverLocationDb.coordinates[0],
      }
      : null;

  const pickupCoord = pickupLocation.length === 2
    ? { latitude: pickupLocation[1], longitude: pickupLocation[0] }
    : null;

  const dropCoord = dropLocation.length === 2
    ? { latitude: dropLocation[1], longitude: dropLocation[0] }
    : null;

  const getRoutePoints = () => {
    if (status === 'driver_assigned' && driverLocation && pickupCoord) {
      return { origin: driverLocation, destination: pickupCoord, type: 'pickup' };
    } else if (status !== 'cancelled' && status !== 'searching' && pickupCoord && dropCoord) {
      return { origin: pickupCoord, destination: dropCoord, type: 'destination' };
    }
    return null;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetchCurrentDetails();
        fetch()
        // console.log("✅ User details fetchCurrentDetails fetched successfully:", res);
      } catch (error) {
        console.error("❌ Error fetching user details:", error.message || error);
      }
    };

    loadUser();
  }, []);

  const routePoints = getRoutePoints();

  const handleDirectionsReady = (result) => {
    setRouteDistance((result.distance).toFixed(1));
    setRouteDuration(Math.ceil(result.duration));
    setIsCalculating(false);

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(result.coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 280, left: 50 },
        animated: true,
      });
    }
  };

  const handleDirectionsError = (error) => {
    console.error('❌ Directions API Error:', error);
    setIsCalculating(false);
  };

  useEffect(() => {
    if (routePoints) {
      setIsCalculating(true);
    }
  }, [status, pickupLocation, dropLocation, driverLocationDb]);

  const getStatusInfo = () => {
    if (status === 'driver_assigned' && routeDistance && routeDuration) {
      return {
        title: 'Driver on the way',
        subtitle: 'Arriving at pickup location',
        distance: routeDistance,
        time: routeDuration,
        icon: 'car',
        color: '#6366f1',
        gradient: ['#6366f1', '#8b5cf6'],
      };
    } else if (routeDistance && routeDuration && status !== 'cancelled' && status !== 'searching') {
      return {
        title: 'Heading to destination',
        subtitle: 'Enjoy your ride',
        distance: routeDistance,
        time: routeDuration,
        icon: 'location',
        color: '#10b981',
        gradient: ['#10b981', '#06b6d4'],
      };
    }
    return null;
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={customMapStyle}
        showsUserLocation
        // followsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        initialRegion={{
          latitude: driverLocation?.latitude || pickupCoord?.latitude || 28.6139,
          longitude: driverLocation?.longitude || pickupCoord?.longitude || 77.209,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Pickup Marker */}
        {pickupCoord && (
          <Marker coordinate={pickupCoord} title="Pickup" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerWrapper}>
              <View style={[styles.markerPulse]} />
              <View style={[styles.markerPulse2]} />
              {/* <View style={[styles.markerCircle, { 
                backgroundColor: '#10b981',
                shadowColor: '#10b981',
              }]}> */}
              <Ionicons name="location-sharp" size={24} color="#fff" />
              {/* </View> */}
            </View>
          </Marker>
        )}

        {/* Drop Marker */}
        {dropCoord && (
          <Marker coordinate={dropCoord} title="Destination" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerWrapper}>
              <View style={[styles.markerPulse]} />
              <View style={[styles.markerPulse2]} />

              <Ionicons name="flag" size={22} color="#fff" />

            </View>
          </Marker>
        )}

        {/* Driver Marker */}
        {driverLocation && status === 'driver_assigned' && (
          <Marker coordinate={driverLocation} title="Driver" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.driverMarkerWrapper}>
              <View style={styles.driverPulse} />
              <View style={styles.driverMarker}>
                <View style={styles.driverMarkerInner}>
                  <Ionicons name="car-sport" size={24} color="#fff" />
                </View>
              </View>
            </View>
          </Marker>
        )}

        {/* MapViewDirections */}
        {routePoints && (
          <MapViewDirections
            origin={routePoints.origin}
            destination={routePoints.destination}
            apikey={settings ? settings.googleApiKey : GOOGLE_MAPS_APIKEY}
            strokeWidth={6}
            strokeColor={routePoints.type === 'pickup' ? '#6366f1' : '#10b981'}
            optimizeWaypoints={true}
            onReady={handleDirectionsReady}
            onError={handleDirectionsError}
            mode="DRIVING"
            precision="high"
          />
        )}
      </MapView>

      {/* Gradient Overlay for status bar area */}
      <View style={styles.topGradient} />

      {/* ETA Card */}
      {/* {statusInfo && (
        <View style={styles.etaCard}>
          <View style={styles.cardGlow} />
          <View style={styles.etaContent}>
            <View style={styles.etaHeader}>
              <View style={[styles.iconCircle, { 
                backgroundColor: statusInfo.color,
                shadowColor: statusInfo.color,
              }]}>
                <Ionicons name={statusInfo.icon} size={28} color="#fff" />
              </View>
              <View style={styles.etaTextContainer}>
                <Text style={styles.etaTitle}>{statusInfo.title}</Text>
                <Text style={styles.etaSubtitle}>{statusInfo.subtitle}</Text>
              </View>
            </View>

            <View style={styles.etaDetails}>
              <View style={styles.etaItem}>
                <View style={styles.etaIconBg}>
                  <MaterialIcons name="route" size={22} color={statusInfo.color} />
                </View>
                <View>
                  <Text style={styles.etaLabel}>Distance</Text>
                  <Text style={styles.etaValue}>{statusInfo.distance} km</Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.etaItem}>
                <View style={styles.etaIconBg}>
                  <MaterialIcons name="schedule" size={22} color={statusInfo.color} />
                </View>
                <View>
                  <Text style={styles.etaLabel}>Time</Text>
                  <Text style={styles.etaValue}>{statusInfo.time} min</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )} */}

      {/* Loading State */}
      {isCalculating && !statusInfo && (
        <View style={styles.etaCard}>
          <View style={styles.loadingContainer}>
            <View style={styles.spinner}>
              <MaterialIcons name="directions-car" size={28} color="#6366f1" />
            </View>
            <Text style={styles.loadingText}>Finding best route...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({

  map: {
    width,
    height: height / 2 + StatusBar.currentHeight,
    marginTop: -StatusBar.currentHeight,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StatusBar.currentHeight + 60,
    // background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  markerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // alignItems: 'center',
    // justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 3,
  },
  markerPulse: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    zIndex: 1,
  },
  markerPulse2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    zIndex: 0,
  },
  driverMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  driverMarker: {
    width: 30,
    height: 30,
    // borderRadius: 30,
    // backgroundColor: '#fff',
    // alignItems: 'center',
    // justifyContent: 'center',
    // shadowColor: '#6366f1',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.6,
    // shadowRadius: 10,
    // elevation: 12,
    // zIndex: 3,
  },
  driverMarkerInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    // backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    // backgroundColor: 'rgba(99, 102, 241, 0.3)',
    zIndex: 1,
  },
  etaCard: {
    // position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#6366f1',
  },
  etaContent: {
    padding: 20,
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  etaTextContainer: {
    flex: 1,
  },
  etaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  etaSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  etaDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  etaIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  etaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  etaValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
});