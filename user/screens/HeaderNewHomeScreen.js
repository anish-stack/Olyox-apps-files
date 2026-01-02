import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    Platform,
    Animated
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import usePastRides from '../hooks/PastRides';
import { useLocation } from '../context/LocationContext';

// Skeleton Loader Component
const SkeletonLoader = ({ isDark, }) => {
    const pulseAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const styles = createStyles(isDark);

    return (
        <Animated.View style={[styles.locationCard, { opacity }]}>
            <View style={[styles.locationIconContainer, styles.skeleton]} />
            <View style={styles.locationTextContainer}>
                <View style={[styles.skeletonText, { width: '40%', height: 10 }]} />
                <View style={[styles.skeletonText, { width: '80%', height: 14, marginTop: 6 }]} />
                <View style={[styles.skeletonText, { width: '60%', height: 12, marginTop: 4 }]} />
            </View>
            <View style={[styles.skeletonText, { width: 14, height: 14 }]} />
        </Animated.View>
    );
};

const HeaderNewUser = ({ isShowThis = true, showBack = false, title = '' }) => {
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const { location } = useLocation()
    const { rides, loading, error, fetchData } = usePastRides();
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [rideData, setRideData] = useState({
        pickup: { latitude: 0, longitude: 0, description: "" },
        dropoff: { latitude: 0, longitude: 0, description: "" }
    });

    useEffect(() => {
        fetchData()
    }, [])

    const isDark = colorScheme === 'dark';
    const styles = createStyles(isDark);

    // Hide skeleton after 500ms or when data loads
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkeleton(false);
        }, 500);

        if (!loading && rides.length > 0) {
            setShowSkeleton(false);
            clearTimeout(timer);
        }

        return () => clearTimeout(timer);
    }, [loading, rides]);

    const getLocationText = (address) => {
        if (!address?.formatted_address) return 'Unknown Location';
        return address.formatted_address.split(',').slice(0, 3).join(',').trim();
    };

    const getFullAddress = (address) => {
        return address?.formatted_address || 'No drop address available';
    };

    const handleNavigate = (item) => {
        const newRideData = {
            pickup: {
                latitude: location?.coords?.latitude,
                longitude: location?.coords?.longitude,
                description: item.pickup_address?.formatted_address
            },
            dropoff: {
                latitude: item.drop_location.coordinates[1],
                longitude: item.drop_location.coordinates[0],
                description: item.drop_address?.formatted_address
            },
        };

        setRideData(newRideData);

        const navigationData = {
            pickup: newRideData.pickup,
            dropoff: newRideData.dropoff,
        };

        navigation.navigate('second_step_of_booking', { data: navigationData });
    };

    const mostRecentRide = rides.length > 0 ? [...rides].reverse()[0] : null;

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>

                {showBack ? (
                    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.ButtonNav}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.brandContainer}>
                        <Text style={styles.brandName}>Olyox</Text>
                        <Text style={styles.tagline}>Book Cabs, Taxi & Parcel</Text>
                    </View>
                )}


                <TouchableOpacity
                    style={styles.notificationButton}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('notifications')}
                >
                    <FontAwesome
                        name="bell"
                        size={20}
                        color={isDark ? '#FFFFFF' : '#000000'}
                    />
                    <View style={styles.badge} />
                </TouchableOpacity>
            </View>

            {/* Search Section */}
            {isShowThis && (
                <View style={styles.searchSection}>

                    <View style={styles.bothButtonAndLater}>
                        {/* Search / "Where to?" Button */}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('Start_Booking_Ride', { isLater: false })}
                            style={styles.searchContainer}
                        >
                            <View style={styles.searchInputWrapper}>
                                <Ionicons name="search-outline" size={22} color="#666" />
                                <Text style={styles.searchPlaceholder}>Where to?</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Later Button */}
                        <TouchableOpacity
                            style={styles.laterButton}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('Start_Booking_Ride', { isLater: true })}
                        >
                            <Ionicons name="time-outline" size={18} color="#000" />
                            <Text style={styles.laterText}>Later</Text>
                        </TouchableOpacity>
                    </View>


                    {/* Show skeleton loader while loading or for first 500ms */}
                    {(loading || showSkeleton) && <SkeletonLoader isDark={isDark} />}

                    {/* Recent Location Card - Show when data is ready and skeleton is hidden */}
                    {!loading && !showSkeleton && mostRecentRide?.drop_address && (
                        <TouchableOpacity
                            style={styles.locationCard}
                            activeOpacity={0.8}
                            onPress={() => handleNavigate(mostRecentRide)}
                        >
                            <View style={styles.locationIconContainer}>
                                <FontAwesome name="map-marker" size={20} color="#4CAF50" />
                            </View>

                            <View style={styles.locationTextContainer}>
                                <Text style={styles.locationLabel}>Recent Destination</Text>
                                <Text style={styles.locationTitle} numberOfLines={1}>
                                    {getLocationText(mostRecentRide.drop_address)}
                                </Text>
                                <Text style={styles.locationSubtitle} numberOfLines={1}>
                                    {getFullAddress(mostRecentRide.drop_address)}
                                </Text>
                            </View>

                            <FontAwesome
                                name="chevron-right"
                                size={14}
                                color={isDark ? '#666666' : '#AAAAAA'}
                                style={styles.locationArrow}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            )}

        </View>
    );
};

const createStyles = (isDark) => StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    brandContainer: {
        gap: 2,
    },
    brandName: {
        fontSize: 26,
        fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
        color: isDark ? '#FFFFFF' : '#000000',
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 12,
        color: isDark ? '#AAAAAA' : '#666666',
        fontWeight: '400',
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        borderWidth: 2,
        borderColor: isDark ? '#121212' : '#FFFFFF',
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 16,
    },


    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#1E1E1E' : '#FAFAFA',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: isDark ? '#2C2C2C' : '#EEEEEE',
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    locationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? '#1A2E1A' : '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationTextContainer: {
        flex: 1,
        gap: 2,
    },
    locationLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: isDark ? '#888888' : '#999999',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    locationTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: isDark ? '#FFFFFF' : '#000000',
        marginTop: 2,
    },
    locationSubtitle: {
        fontSize: 13,
        color: isDark ? '#AAAAAA' : '#666666',
        marginTop: 2,
    },
    locationArrow: {
        padding: 4,
    },
    // Skeleton styles
    skeleton: {
        backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0',
    },
    skeletonText: {
        backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0',
        borderRadius: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        flex:1,
        alignItems: 'center',
        backgroundColor: '#F8F8F8',
        borderRadius: 16,
        paddingLeft: 20,
        paddingRight: 8,
        height: 60,
        gap: 12,
        // borderWidth: 2,
        // borderColor: '#000000',
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchPlaceholder: {
        fontSize: 17,
        fontWeight: '600',
        color: '#666666',
    },
    laterButton: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        position:'absolute',
        right:10,
       
        top:10,
        borderWidth: 0.2,
        borderColor: '#000000',
        alignItems: 'center',
        gap: 6,
    },
    laterText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000000',
    },
    bothButtonAndLater: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // marginHorizontal: 16,
        // marginVertical: 8,
    },

});

export default HeaderNewUser