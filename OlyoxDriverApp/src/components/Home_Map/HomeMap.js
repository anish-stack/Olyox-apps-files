import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, NativeEventEmitter, NativeModules, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import haversine from 'haversine-distance';
import HomeMapHeader from './HomeMapHeader';
import useUserStore from '../../../Store/useUserStore';
import { API_URL_APP } from '../../../constant/api';
import loginStore from '../../../Store/authStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { LocationModule, LocationUpdateModule } = NativeModules;

export default function HomeMap() {
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const isMountedRef = useRef(true);
  const lastUpdateRef = useRef(null);
  const { user, fetchUserDetails } = useUserStore();
  const { token } = loginStore.getState();

  // Initialize with fallback coordinates (Delhi)
  const initialLat = user?.location?.coordinates?.[1] || 28.6139;
  const initialLng = user?.location?.coordinates?.[0] || 77.2090;
  const [location, setLocation] = useState({ latitude: initialLat, longitude: initialLng });
  const [region, setRegion] = useState({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heading, setHeading] = useState(0);

  // Check distance and update backend if needed
  const checkAndUpdateLocation = (currentLat, currentLng) => {
    try {
      if (!user?.location?.coordinates?.[1] || !user?.location?.coordinates?.[0] || !user?.location[1] ||  !user?.location[0] ) {
        // console.log('📍 No DB location, updating backend');
        LocationUpdateModule?.startLocationUpdates(`${API_URL_APP}/webhook/cab-receive-location`, token);
        lastUpdateRef.current = { latitude: currentLat, longitude: currentLng };
        return;
      }

      const dbLocation = { latitude: user.location.coordinates[1] || user?.location[0], longitude: user.location.coordinates[0] || user?.location[1] };
      const currentLocation = { latitude: currentLat, longitude: currentLng };
      const distance = haversine(dbLocation, currentLocation);

      if (distance > 200) {
        // console.log(`📍 Distance: ${distance}m - Updating backend`);
        LocationUpdateModule?.startLocationUpdates(API_URL_APP, token);
        lastUpdateRef.current = currentLocation;
      }
    } catch (error) {
      console.error('❌ Error in checkAndUpdateLocation:', error);
    }
  };

  // Recenter map to current location
  const recenterMap = () => {
    try {
      if (!mapRef.current || !isMapReady) {
        console.warn('⚠️ Map is not ready or mapRef is null');
        return;
      }
      if (!location?.latitude || !location?.longitude) {
        console.warn('⚠️ Invalid location:', location);
        return;
      }

      // console.log('🎯 Attempting to recenter map to:', { latitude: location.latitude, longitude: location.longitude });
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      
      mapRef.current.animateToRegion(newRegion, 500);
    } catch (error) {
      console.error('❌ Error in recenterMap:', error);
      setError('Failed to center map');
    }
  };

  // Handle screen focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🗺️ HomeMap screen focused');
      fetchUserDetails()
        .then(() => {
          console.log('✅ User details fetched:', user?.location?.coordinates);
          if (user?.location?.coordinates?.length >= 2 || user.location?.length >= 2) {
            const newLat = user.location.coordinates[1] || user?.location[0];
            const newLng = user.location.coordinates[0] || user?.location[1];
            if (newLat && newLng && !isNaN(newLat) && !isNaN(newLng)) {
              setLocation({ latitude: newLat, longitude: newLng });
              setRegion({ latitude: newLat, longitude: newLng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
              if (isMapReady) recenterMap();
            }
          }
        })
        .catch((err) => {
          console.error('❌ Failed to fetch user details:', err);
          setError('Failed to fetch user details. Using last known location.');
          if (isMapReady) recenterMap();
        });
    }, [isMapReady])
  );

  // Location tracking
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!LocationModule) {
      console.error('❌ LocationModule is not available');
      setError('Location services unavailable');
      setIsLoading(false);
      return;
    }

    const locationEmitter = new NativeEventEmitter(LocationModule);

    const locationSubscription = locationEmitter.addListener('locationUpdated', (loc) => {
      if (!isMountedRef.current) return;

      if (loc?.latitude && loc?.longitude) {
        setLocation({ latitude: loc.latitude, longitude: loc.longitude });
        setRegion({
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        if (loc.heading !== undefined) setHeading(loc.heading);
        if (isMapReady) recenterMap();
        checkAndUpdateLocation(loc.latitude, loc.longitude);
        setIsLoading(false);
      } else {
        console.warn('⚠️ Invalid location data:', loc);
      }
    });

    const errorSubscription = locationEmitter.addListener('locationError', (error) => {
      console.error('❌ Location error:', error.error);
      setError(`Location error: ${error.error}`);
      setIsLoading(false);
    });

    // Get initial location with timeout
    const locationTimeout = setTimeout(() => {
      if (isMountedRef.current && isLoading) {
        console.warn('⚠️ Location request timed out');
        setIsLoading(false);
        setError('Location request timed out');
      }
    }, 10000);

    LocationModule.getCurrentLocation(
      (lat, lng) => {
        clearTimeout(locationTimeout);
        if (isMountedRef.current) {
          // console.log('📍 Initial location:', { lat, lng });
          setLocation({ latitude: lat, longitude: lng });
          setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
          checkAndUpdateLocation(lat, lng);
          if (isMapReady) recenterMap();
          setIsLoading(false);
        }
      },
      (err) => {
        clearTimeout(locationTimeout);
        console.error('❌ Failed to get current location:', err);
        setError(err);
        setIsLoading(false);
        if (user?.location?.coordinates?.length >= 2 || user.location?.length >= 2) {
  const newLat = user.location.coordinates[1] || user?.location[0];
            const newLng = user.location.coordinates[0] || user?.location[1];
          setLocation({ latitude: newLat, longitude: newLng });
          setRegion({ latitude: newLat, longitude: newLng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
          if (isMapReady) recenterMap();
        }
      }
    );

    LocationModule.startWatchingLocation();

    return () => {
      clearTimeout(locationTimeout);
      isMountedRef.current = false;
      locationSubscription?.remove();
      errorSubscription?.remove();
      LocationModule?.stopWatchingLocation();
    };
  }, [isMapReady, user?.location?.coordinates]);

  // Update location from backend user data
  useEffect(() => {
    if (user?.location?.coordinates?.length >= 2 || user.location?.length >= 2) {
  const newLat = user.location.coordinates[1] || user?.location[0];
            const newLng = user.location.coordinates[0] || user?.location[1];
      console.log('👤 Backend location:', { lat: newLat, lng: newLng });

      if (newLat && newLng && !isNaN(newLat) && !isNaN(newLng)) {
        setLocation({ latitude: newLat, longitude: newLng });
        setRegion({
          latitude: newLat,
          longitude: newLng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        if (isMapReady) recenterMap();
      } else {
        console.warn('⚠️ Invalid backend coordinates:', user.location.coordinates);
      }
    }
  }, [user?.location?.coordinates, isMapReady]);

  const handleZoom = (delta) => {
    try {
      if (!isMountedRef.current || !isMapReady || !mapRef.current) return;

      const newLatDelta = Math.max(0.001, Math.min(0.1, region.latitudeDelta - delta * 0.002));
      const newLngDelta = Math.max(0.001, Math.min(0.1, region.longitudeDelta - delta * 0.002));

      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: newLatDelta,
        longitudeDelta: newLngDelta,
      };
      setRegion(newRegion);
      
      mapRef.current.animateToRegion(newRegion, 300);
    } catch (error) {
      console.error('❌ Error in handleZoom:', error);
    }
  };

  const handleCenter = () => {
    recenterMap();
  };

  const handleMapReady = () => {
    try {
      console.log('✅ Map is ready');
      setIsMapReady(true);
      setIsLoading(false);
      fetchUserDetails()
        .then(() => {
          console.log('✅ User details fetched on map ready:', user?.location?.coordinates);
          if (user?.location?.coordinates?.length >= 2 || user.location?.length >= 2) {
             const newLat = user.location.coordinates[1] || user?.location[0];
            const newLng = user.location.coordinates[0] || user?.location[1];
            if (newLat && newLng && !isNaN(newLat) && !isNaN(newLng)) {
              setLocation({ latitude: newLat, longitude: newLng });
              setRegion({ latitude: newLat, longitude: newLng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            }
          }
          setTimeout(() => recenterMap(), 500); // Delay recenter
        })
        .catch((err) => {
          console.error('❌ Failed to fetch user details on map ready:', err);
          setError('Failed to fetch user details. Using initial location.');
          setTimeout(() => recenterMap(), 500);
        });
    } catch (error) {
      console.error('❌ Error in handleMapReady:', error);
      setIsLoading(false);
    }
  };

  const handleMapError = (error) => {
    console.error('❌ Map error:', error);
    setError('Map failed to load');
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
      <HomeMapHeader onZoom={handleZoom} onCenter={handleCenter} />
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        region={region}
        onMapReady={handleMapReady}
        onError={handleMapError}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={true}
        pitchEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {location && location.latitude && location.longitude && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={heading}
          />
           
        
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  map: { width: '100%', height: '100%' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  errorBanner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  errorText: { color: '#ffffff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  accuracyCircle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  carMarker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});