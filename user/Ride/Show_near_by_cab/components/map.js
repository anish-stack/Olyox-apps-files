"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Platform, Dimensions, StyleSheet, View, ActivityIndicator, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import MapViewDirections from 'react-native-maps-directions';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome5';
const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02; // Much tighter zoom for focused view
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_APIKEY = "AIzaSyBfRHuTByG6CiXtLbyzK_aKNpJfDiB4jUo";

// Light, clean map style optimized for both iOS and Android
const customMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "simplified" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "poi.park", elementType: "labels.text", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fefefe" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "road.highway", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road.local", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e9f6" }] },
    { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] }
];

const getVehicleIcon = (vehicleName) => {
    const icons = {
        bike: 'motorcycle',
        auto: 'car-side',   // you can replace with a tuk-tuk icon if available
        car: 'car',
        suv: 'truck-monster',
    };
    return icons[vehicleName?.toLowerCase()] || 'car';
};

export default function MapWithDirections({
    origin = { latitude: 28.7041, longitude: 77.1025 },
    destination = { latitude: 28.5355, longitude: 77.3910 },
    showDirections = true,
    animateToRoute = true,
    strokeColor = "#000",
    strokeWidth = 5,
    vehicle = null,
    showNearbyRiders = false,
    onRouteReady = null,
    onRidersFound = null,
    track = null,
}) {
    const mapRef = useRef(null);
    const [isLoading, setIsLoading] = useState(showDirections);
    const [mapReady, setMapReady] = useState(false);
    const [ridersNearYou, setRidersNearYou] = useState([]);
    const [isLoadingRiders, setIsLoadingRiders] = useState(false);
    const [locationError, setLocationError] = useState(null);

    const getInitialRegion = () => ({
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
    });
    const pathCoordinates = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
    ];
    const focusOnPath = () => {
        if (mapRef.current && pathCoordinates.length > 0) {
            mapRef.current.fitToCoordinates(pathCoordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
            mapRef.current.animateCamera({
  center: {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
  },
  zoom: 10,
}, { duration: 1000 });

        }
    };

    const fetchNearByRiders = useCallback(async () => {
        if (!origin || !vehicle || isLoadingRiders) return;

        setIsLoadingRiders(true);
        setLocationError(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const vehiclesArray = Array.isArray(vehicle) ? vehicle : [vehicle];

            const responses = await Promise.all(
                vehiclesArray.map(v =>
                    axios.post(
                        "https://www.appv2.olyox.com/api/v1/new/find-rider-near-user",
                        {
                            lat: origin.latitude,
                            lng: origin.longitude,
                            vehicleType: v.vehicleName || v.vehicleType,
                        },
                        {
                            timeout: 8000,
                            signal: controller.signal,
                        }
                    )
                )
            );


            clearTimeout(timeoutId);

            const allRiders = responses.flatMap((res, index) => {
                if (res.data?.success && Array.isArray(res.data?.data)) {
                    return res.data.data.map(r => ({
                        ...r,
                        vehicleName: vehiclesArray[index].vehicleName || vehiclesArray[index].vehicleType
                    }));
                }
                return [];
            });

            if (allRiders.length > 0) {
                setRidersNearYou(allRiders);
                if (onRidersFound) onRidersFound(allRiders);
                if (track) {
                    track("ACTION", "confirm_screen", "Riders found near user", {
                        ridersCount: allRiders.length,
                        vehicles: vehiclesArray.map(v => v.vehicleName)
                    });
                }
            } else {
                setRidersNearYou([]);
            }
        } catch (error) {
            console.error("Error fetching nearby riders:", error);
            setRidersNearYou([]);

            if (error.name === "AbortError" || error.code === "ECONNABORTED") {
                // setLocationError("Connection timeout");
            } else if (error.response?.status >= 500) {
                // setLocationError("Server error");
            } else {
                // setLocationError("Unable to find riders");
            }

            if (track) {
                track("API_ERROR", "confirm_screen", "Error fetching nearby riders", {
                    error: error.message,
                });
            }
        } finally {
            setIsLoadingRiders(false);
        }
    }, [origin, vehicle, track, onRidersFound, isLoadingRiders]);

    useEffect(() => {

        fetchNearByRiders();

    }, [vehicle]);

    useEffect(() => {
        if (mapRef.current && mapReady && origin) {
            setTimeout(() => {
                try {
                    const coordinates = [origin];

                    if (destination && showDirections) {
                        coordinates.push(destination);
                    }

                    if (ridersNearYou.length > 0 && showNearbyRiders) {
                        ridersNearYou.forEach(rider => {
                            const coords = rider?.location?.coordinates;
                            if (coords && coords.length >= 2) {
                                coordinates.push({
                                    latitude: coords[1],
                                    longitude: coords[0],
                                });
                            }
                        });
                    }

                    if (animateToRoute && coordinates.length > 1) {
                        mapRef.current.fitToCoordinates(coordinates, {
                            edgePadding: {
                                top: Platform.OS === 'ios' ? 180 : 160,
                                right: 80,
                                bottom: Platform.OS === 'ios' ? 180 : 160,
                                left: 80,
                            },
                            animated: true,
                        });
                    } else {
                        // Focus on pickup location only
                        mapRef.current.animateToRegion({
                            latitude: origin.latitude,
                            longitude: origin.longitude,
                            latitudeDelta: LATITUDE_DELTA,
                            longitudeDelta: LONGITUDE_DELTA,
                        }, 1000);
                    }
                } catch (error) {
                    console.warn("Error animating map:", error);
                }
            }, 500);
        }
    }, [mapReady, origin, destination, animateToRoute, ridersNearYou, showDirections, showNearbyRiders]);

    const handleDirectionsReady = (result) => {
        setIsLoading(false);
        if (onRouteReady) {
            onRouteReady({
                distance: result.distance,
                duration: result.duration,
                coordinates: result.coordinates,
            });
        }
    };

    const handleDirectionsError = (error) => {
        console.error("Directions error:", error);
        setIsLoading(false);
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={getInitialRegion()}

                customMapStyle={customMapStyle}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={false}

                showsBuildings={true}
                showsTraffic={false}
                showsIndoors={true}
                loadingEnabled={true}
                onMapReady={focusOnPath}
                pitchEnabled={true}
                rotateEnabled={true}
                scrollEnabled={true}
                zoomEnabled={true}
            >
                {/* Pickup Location Marker */}
                {origin && (
                    <Marker
                        coordinate={origin}
                        anchor={{ x: 0.5, y: 0.5 }}
                        centerOffset={{ x: 0, y: 0 }}
                    >
                        <View style={styles.pickupMarkerContainer}>
                            <View style={styles.pickupMarkerPulse} />
                            <View style={styles.pickupMarker}>
                                <View style={styles.pickupMarkerInner}>
                                    <Text style={styles.pickupMarkerDot} />
                                </View>
                            </View>
                            <View style={styles.pickupLabelContainer}>
                                <Text style={styles.pickupLabel}>Pickup</Text>
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Destination Marker */}
                {destination && showDirections && (
                    <Marker
                        coordinate={destination}
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <View style={styles.destinationMarkerContainer}>
                            <View style={styles.destinationMarker}>
                                <View style={styles.destinationMarkerInner} />
                            </View>
                            <View style={styles.destinationPin} />
                            <View style={styles.destinationLabelContainer}>
                                <Text style={styles.destinationLabel}>Drop-off</Text>
                            </View>
                        </View>
                    </Marker>
                )}

                {ridersNearYou.length > 0 && ridersNearYou.map((rider, index) => {
                    const coords = rider?.location?.coordinates;
                 
                    if (!coords || coords.length < 2) return null;

                    // Small offset to avoid overlap
                    const offset = 0.0001 * index; // adjust multiplier for bigger/smaller separation
                    const latitude = coords[1] + offset;  // shift north
                    const longitude = coords[0] + offset; // shift east

   

                    return (
                        <Marker
                            key={index}
                            coordinate={{ latitude, longitude }}
                        >
                            <View style={styles.riderMarker}>
                                <Text style={styles.riderIcon}>
                                    <Icon
                                        name={getVehicleIcon(rider.rideVehicleInfo?.vehicleType || rider.vehicleName)}
                                        size={24}
                                        color="#000"   // <-- tint color black
                                    />                                </Text>
                            </View>
                        </Marker>
                    );
                })}

                {/* Route Directions */}
                {showDirections && origin && destination && (
                    <MapViewDirections
                        origin={origin}
                        destination={destination}
                        apikey={GOOGLE_MAPS_APIKEY}
                        strokeWidth={strokeWidth}
                        strokeColor={strokeColor}
                        optimizeWaypoints={true}
                        onReady={handleDirectionsReady}
                        onError={handleDirectionsError}
                        mode="DRIVING"
                        precision="high"
                        timePrecision="now"
                        language="en"
                        resetOnChange={false}
                    />
                )}
            </MapView>

            {/* Loading Indicator */}
            {(isLoading || isLoadingRiders) && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="small" color={strokeColor} />
                        <Text style={styles.loadingText}>
                            {isLoadingRiders ? 'Finding riders...' : 'Loading route...'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Riders Count Badge */}
            {showNearbyRiders && ridersNearYou.length > 0 && !isLoadingRiders && (
                <View style={styles.ridersBadge}>
                    <View style={styles.ridersBadgeIcon}>
                        <Text style={styles.ridersBadgeIconText}>🚗</Text>
                    </View>
                    <Text style={styles.ridersBadgeText}>
                        {ridersNearYou.length} nearby
                    </Text>
                </View>
            )}

            {/* Error Message */}
            {locationError && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{locationError}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    map: {
        width: width,
        height: height,
        flex: 1,
    },

    // Pickup Marker Styles
    pickupMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickupMarkerPulse: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(74, 144, 226, 0.2)',
        borderWidth: 2,
        borderColor: 'rgba(74, 144, 226, 0.3)',
    },
    pickupMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    pickupMarkerInner: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickupMarkerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ffffff',
    },
    pickupLabelContainer: {
        marginTop: 8,
        backgroundColor: '#000',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    pickupLabel: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },

    // Destination Marker Styles
    destinationMarkerContainer: {
        alignItems: 'center',
    },
    destinationMarker: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#000',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    destinationMarkerInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#000',
    },
    destinationPin: {
        width: 2,
        height: 12,
        backgroundColor: '#000',
        marginTop: -1,
    },
    destinationLabelContainer: {
        marginTop: 4,
        backgroundColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    destinationLabel: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
    },

    // Rider Marker Styles
    riderMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    riderMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        // backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        // borderWidth: 2,

    },
    riderIcon: {
        fontSize: 20,
        tintColor: "#000"
    },

    // Loading Overlay
    loadingOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        alignSelf: 'center',
    },
    loadingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    loadingText: {
        color: '#1f2937',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 10,
    },

    // Riders Badge
    ridersBadge: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 120 : 100,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    ridersBadgeIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    ridersBadgeIconText: {
        fontSize: 14,
    },
    ridersBadgeText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },

    // Error Banner
    errorBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    errorIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    errorText: {
        flex: 1,
        color: '#991B1B',
        fontSize: 13,
        fontWeight: '500',
    },
});