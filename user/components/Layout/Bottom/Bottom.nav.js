import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Platform,
    Dimensions,
    Animated,
    ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../../../constants/colors';
import { useGuest } from '../../../context/GuestLoginContext';
import { find_me } from '../../../utils/helpers';
import { tokenCache } from '../../../Auth/cache';
import axios from 'axios';
import { useRideSearching } from '../../../context/ride_searching';
import { useRide } from '../../../context/RideContext';

const { width } = Dimensions.get('window');

const BottomNav = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { isGuest } = useGuest();
    const { saveRide, updateRideStatus, currentRide: saveRideData, clearCurrentRide } = useRide();
    const [user,setUser] = useState(null)
    const { rideStatus: saveStatus, saveRideSearching,
        updateRideStatusSearching,
        clearCurrentRideSearching, } = useRideSearching();
    const [currentRide, setCurrentRide] = useState(null);
    const [rideStatus, setRideStatus] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [previousScreen, setPreviousScreen] = useState(null);
    const [hasNavigatedToRideStarted, setHasNavigatedToRideStarted] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const loadingAnim = useRef(new Animated.Value(0)).current;
    const lastPollingTime = useRef(0);
    const isMountedRef = useRef(true);
    const pollingIntervalRef = useRef(null);

    // SecureStore keys
    const RIDE_NAVIGATION_KEY = 'hasNavigatedToRideStarted';
    const CURRENT_RIDE_KEY = 'currentRideId';

    // Save navigation state to SecureStore
    const saveNavigationState = async (rideId, hasNavigated) => {
        try {
            await SecureStore.setItemAsync(RIDE_NAVIGATION_KEY, JSON.stringify({
                rideId: rideId,
                hasNavigated: hasNavigated,
                timestamp: Date.now()
            }));
            console.log('Navigation state saved:', { rideId, hasNavigated });
        } catch (error) {
            console.error('Error saving navigation state:', error);
        }
    };

    // Get navigation state from SecureStore
    const getNavigationState = async (currentRideId) => {
        try {
            const storedState = await SecureStore.getItemAsync(RIDE_NAVIGATION_KEY);
            if (storedState) {
                const parsedState = JSON.parse(storedState);
                // Check if the stored ride ID matches current ride ID
                const isForCurrentRide = parsedState.rideId === currentRideId;
                console.log('Retrieved navigation state:', parsedState, 'isForCurrentRide:', isForCurrentRide);
                return isForCurrentRide ? parsedState.hasNavigated : false;
            }
            return false;
        } catch (error) {
            console.error('Error getting navigation state:', error);
            return false;
        }
    };

    // Clear navigation state (when ride is completed/cancelled)
    const clearNavigationState = async () => {
        try {
            await SecureStore.deleteItemAsync(RIDE_NAVIGATION_KEY);
            setHasNavigatedToRideStarted(false);
            console.log('Navigation state cleared');
        } catch (error) {
            console.error('Error clearing navigation state:', error);
        }
    };


    // Initialize ride data
    const fetchRideData = useCallback(async () => {
        try {
            const data = await find_me();
            // console.log(data?.user)
            setUser(data?.user)
            const ride = data?.user?.currentRide || null;
            // console.log("data?.user?",data?.user?.currentRide)
            saveRideSearching({ _id: ride });
            // console.log('Fetched ride data next:', ride);
            setCurrentRide(ride);

            // Check if we've already navigated to RideStarted for this ride
            if (ride) {
                const hasNavigated = await getNavigationState(ride);
                setHasNavigatedToRideStarted(hasNavigated);
            }

            return ride;
        } catch (error) {
            console.error('Error fetching ride data:', error);
            return null;
        }
    }, []);

    // Polling for ride status
    const pollRideStatus = useCallback(async (rideId) => {
        if (!rideId || !isMountedRef.current) return;
        console.log("Polling ride status for ride ID:", rideId);
        const now = Date.now();
        if (now - lastPollingTime.current < 4000) return;
        lastPollingTime.current = now;

        try {
            const token = await tokenCache.getToken("auth_token_db");
            console.log("Using token:", token ? "****" + token.slice(-4) : "No Token");
            if (!token) throw new Error("No auth token found");
            const response = await axios.get(
                `https://www.appv2.olyox.com/api/v1/new/status/${rideId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 8000,
                }
            );

            const { status: newStatus, rideDetails } = response.data;
            // console.log("Current Ride rideDetails:", rideDetails);
            // console.log("Polled ride status:", newStatus);

            if (newStatus === "cancelled" || newStatus === "completed") {
                console.log("Clearing ride data due to status:", newStatus);
                setCurrentRide(null);
                setRideStatus(null);
                saveRide(null);
                clearCurrentRide();
                clearCurrentRideSearching();
                await clearNavigationState(); // Clear navigation state when ride ends
            }

            if (newStatus !== rideStatus) {
                setRideStatus(newStatus);

                switch (newStatus) {
                    case "driver_assigned":
                        updateRideStatus("confirmed");
                        updateRideStatusSearching("driver_assigned");

                        // Save that we're navigating to RideStarted
                        await saveNavigationState(rideId, true);
                        setHasNavigatedToRideStarted(true);

                        navigation.navigate({
                            name: 'RideStarted',
                            params: {
                                driver: rideDetails?._id,
                                ride: rideDetails,
                                rideDetails: rideDetails
                            },
                        });
                        break;
                    case "cancelled":
                        updateRideStatusSearching("cancel");
                        await clearNavigationState();
                        break;
                    case "completed":
                        setCurrentRide(null);
                        setRideStatus(null);
                        await clearNavigationState();
                        break;
                    case "in_progress":
                        updateRideStatus("in_progress");
                        updateRideStatusSearching("in_progress");
                        setHasNavigatedToRideStarted(true);
                        await saveNavigationState(rideId, true);


                        break;
                    case "searching":
                        updateRideStatusSearching("searching");
                        break;
                    case "pending":
                        break;
                }
            } else {
                console.log("Ride status unchanged:", newStatus);
                setRideStatus(newStatus);
            }
        } catch (err) {
            console.error("Error polling ride status Bottom:", err.response.data);
        }
    }, [rideStatus, navigation, previousScreen]);


    useEffect(() => {
        let isActive = true;

        const init = async () => {

            const rideId = await fetchRideData();

            // Only start polling if we haven't navigated to RideStarted yet
            const shouldPoll =
                (currentRide || rideId) &&
                ["searching", "pending", null].includes(rideStatus) &&
                !hasNavigatedToRideStarted;

            if (shouldPoll) {

                pollingIntervalRef.current = setInterval(async () => {
                    if (isActive && currentRide) {
                        await pollRideStatus(currentRide);
                    }
                }, 5000);
            }

            // Only show loading animation if we haven't navigated to RideStarted yet
            if (currentRide && ["searching", "pending"].includes(rideStatus) && !hasNavigatedToRideStarted) {

                Animated.loop(
                    Animated.sequence([
                        Animated.timing(loadingAnim, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: false,
                        }),
                        Animated.timing(loadingAnim, {
                            toValue: 0,
                            duration: 1500,
                            useNativeDriver: false,
                        }),
                    ])
                ).start();
            }
        };

        init();

        return () => {
            console.log("🧹 Cleaning up effect...");
            isActive = false;

            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log("❌ Cleared polling interval");
            }
        };
    }, [currentRide, rideStatus, hasNavigatedToRideStarted, fetchRideData, pollRideStatus]);

    // Store previous screen
    useEffect(() => {
        if (currentRide && ['searching', 'pending'].includes(rideStatus) && route.name !== 'RideStarted' && !hasNavigatedToRideStarted) {
            setPreviousScreen(route.name);
        }
    }, [currentRide, rideStatus, route.name, hasNavigatedToRideStarted]);

    // Navigation tabs
    const getTabs = () => {
        // fetchRideData()
        // console.log("users tabs",user)
        const baseTabs = [
            { name: 'Home', icon: '🏠', route: 'Home' },
            { name: 'Intercity Rides', icon: '🏠', route: user?.IntercityRide?._id ? 'IntercityRide':'Start_Booking_Ride' },
            {
                name: isGuest ? 'Login' : 'Profile',
                icon: '👤',
                route: isGuest ? 'Onboarding' : 'Profile'
            }
        ];

        // Show ride tab if there's a current ride and either:
        // 1. The ride status is not searching/pending/null, OR
        // 2. We have already navigated to RideStarted before
        if (currentRide && (!['searching', 'pending', null].includes(rideStatus) || hasNavigatedToRideStarted)) {
            return [
                baseTabs[0],
                { name: 'Ride', icon: '🚗', route: 'RideStarted', isRide: true },
                baseTabs[1]
            ];
        }
        return baseTabs;
    };

    const tabs = getTabs();
    const tabWidth = width / tabs.length;

    const handleTabPress = (index, tab) => {
                    fetchRideData()

        console.log("ser?.IntercityRide",user?.IntercityRide)
        if (tab.isRide && currentRide) {
            navigation.navigate('RideStarted', {
                driver: currentRide,
                ride: currentRide
            });
        } else {
            fetchRideData()
            navigation.navigate(tab.route);
        }

        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: index * tabWidth,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(() => {
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }).start();
        });

        setSelectedTab(index);
    };

    const handleSearchingBarPress = useCallback(async () => {
        try {
            const rideId = await fetchRideData();
            const finalRideId = currentRide || saveRideData || rideId;

            console.log("Navigating back to previous screen:", finalRideId);
            navigation.navigate('back_searching', { rideId: finalRideId });

            // Reset after navigating
            setCurrentRide(null);
            setRideStatus(null);
        } catch (error) {
            console.error("Failed to fetch ride data:", error);
        }
    }, [navigation, currentRide, saveRideData]);

    const renderTab = (tab, index) => {
        const isActive = route.name.toLowerCase() === tab.route.toLowerCase();
        const isRideTab = tab.isRide;

        return (
            <TouchableOpacity
                key={index}
                style={[styles.tab, isRideTab && styles.rideTab]}
                onPress={() => handleTabPress(index, tab)}
                activeOpacity={0.8}
            >
                <Animated.View
                    style={[
                        styles.tabContent,
                        isActive && styles.activeTab,
                        isRideTab && styles.rideTabContent,
                        { transform: [{ scale: isActive ? scaleAnim : 1 }] }
                    ]}
                >
                    <Text style={[
                        styles.tabIcon,
                        isRideTab && styles.rideIcon
                    ]}>
                        {tab.icon}
                    </Text>
                    <Text style={[
                        styles.tabLabel,
                        isActive && styles.activeLabel,
                        isRideTab && styles.rideLabel
                    ]}>
                        {tab.name}
                    </Text>
                    {isActive && (
                        <View style={[
                            styles.activeIndicator,
                            isRideTab && styles.rideIndicator
                        ]} />
                    )}
                </Animated.View>
            </TouchableOpacity>
        );
    };


    const renderDriverSearchingBar = () => {
        // Only show searching bar if:
        // 1. There's a current ride
        // 2. Status is searching/pending/null
        // 3. We haven't navigated to RideStarted yet
        if (!currentRide ||
            !['searching', 'pending', null].includes(rideStatus ?? null) ||
            hasNavigatedToRideStarted) {
            return null;
        }

        return (
            <TouchableOpacity
                style={styles.searchingBar}
                onPress={handleSearchingBarPress}
                activeOpacity={0.8}
            >
                <View style={styles.searchingContent}>
                    <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                        style={styles.searchingSpinner}
                    />
                    <View style={styles.searchingTextContainer}>
                        <Text style={styles.searchingTitle}>Finding your driver</Text>
                        <Animated.View style={styles.dotsContainer}>
                            <Text style={styles.searchingSubtitle}>
                                Please wait, we're connecting you with a nearby driver
                            </Text>
                        </Animated.View>
                    </View>
                    <Text style={styles.tapHint}>Tap to go back</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <>
            {renderDriverSearchingBar()}
            <View style={[
                styles.container,
                currentRide && rideStatus !== 'driver_assigned' && !hasNavigatedToRideStarted && styles.containerWithSearching
            ]}>
                <Animated.View
                    style={[
                        styles.slider,
                        {
                            width: tabWidth * 0.6,
                            transform: [{ translateX: slideAnim }],
                            marginLeft: tabWidth * 0.2,
                        }
                    ]}
                />
                <View style={styles.tabsContainer}>
                    {tabs.map((tab, index) => renderTab(tab, index))}
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 10,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 15,
    },
    containerWithSearching: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    slider: {
        position: 'absolute',
        top: 8,
        height: 3,
        backgroundColor: COLORS.error,
        borderRadius: 2,
        zIndex: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    rideTab: {
        flex: 1.1,
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        minHeight: 50,
        position: 'relative',
    },
    activeTab: {
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
    },
    rideTabContent: {
        backgroundColor: 'rgba(255, 125, 0, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 125, 0, 0.3)',
    },
    tabIcon: {
        fontSize: 18,
        marginBottom: 4,
    },
    rideIcon: {
        fontSize: 20,
    },
    tabLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
        textAlign: 'center',
    },
    activeLabel: {
        color: COLORS.error,
        fontWeight: '600',
    },
    rideLabel: {
        color: '#FF7D00',
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 2,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.error,
    },
    rideIndicator: {
        backgroundColor: '#FF7D00',
    },
    searchingBar: {
        backgroundColor: '#2C2C2C',
        paddingVertical: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    searchingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    searchingSpinner: {
        marginRight: 12,
    },
    searchingTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    searchingTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    searchingSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: '400',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tapHint: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        fontWeight: '500',
    },
});

export default BottomNav;