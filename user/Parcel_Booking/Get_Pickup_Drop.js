import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Keyboard,
    Alert,
    Modal,
    Animated,
    Dimensions,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, X, ChevronLeft, Home, Store, Heart, Locate } from 'lucide-react-native';
import { LocationService } from './services/LocationService';
import { useLocation } from '../context/LocationContext';
import { find_me } from '../utils/helpers';
import { calculateDistance } from './services/distance';
import styles from './styles';

const { height } = Dimensions.get('window');

// Safe string conversion utility
const safeString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

// Safe number conversion utility
const safeNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
};

export default function Get_Pickup_Drop({ navigation }) {
    const { location: contextLocation } = useLocation();

    const [pickupLocation, setPickupLocation] = useState({
        address: '',
        coordinates: { lat: 0, lng: 0 }
    });
    const [dropoffLocation, setDropoffLocation] = useState({
        address: '',
        coordinates: { lat: 0, lng: 0 }
    });
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);
    const [activeInput, setActiveInput] = useState(null);
    const [distance, setDistance] = useState('');
    const [userData, setUserData] = useState(null);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [apartment, setApartment] = useState('');
    const [useMyNumber, setUseMyNumber] = useState(false);
    const [savedAs, setSavedAs] = useState(null);

    const modalAnim = useRef(new Animated.Value(height)).current;
    const pickupInputRef = useRef(null);
    const dropoffInputRef = useRef(null);
    const debounceTimer = useRef(null);

    // Load current location on mount
    useEffect(() => {
        loadCurrentLocation();
        fetchUserData();
    }, []);

    // Auto-focus dropoff when pickup is set
    useEffect(() => {
        if (pickupLocation.address && pickupLocation.coordinates.lat !== 0 && pickupLocation.coordinates.lng !== 0) {
            setTimeout(() => {
                dropoffInputRef.current?.focus();
            }, 300);
        }
    }, [pickupLocation.address, pickupLocation.coordinates.lat]);

    // Modal animation
    useEffect(() => {
        if (showModal) {
            Animated.spring(modalAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(modalAnim, {
                toValue: height,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [showModal]);

    // Calculate distance when both locations are set
    useEffect(() => {
        if (pickupLocation.coordinates.lat !== 0 && 
            pickupLocation.coordinates.lng !== 0 && 
            dropoffLocation.coordinates.lat !== 0 && 
            dropoffLocation.coordinates.lng !== 0) {
            calculateRouteDistance();
        }
    }, [pickupLocation.coordinates.lat, pickupLocation.coordinates.lng, dropoffLocation.coordinates.lat, dropoffLocation.coordinates.lng]);

    // Auto open modal when dropoff is selected
    useEffect(() => {
        if (
            dropoffLocation.address &&
            dropoffLocation.coordinates.lat !== 0 &&
            dropoffLocation.coordinates.lng !== 0 &&
            pickupLocation.address &&
            pickupLocation.coordinates.lat !== 0 &&
            pickupLocation.coordinates.lng !== 0
        ) {
            setTimeout(() => {
                setShowModal(true);
            }, 600);
        }
    }, [dropoffLocation.coordinates.lat, dropoffLocation.coordinates.lng]);

    const loadCurrentLocation = async () => {
        if (!contextLocation?.coords) {
            console.log('No context location available');
            return;
        }

        try {
            setLoadingCurrentLocation(true);
            const { latitude, longitude } = contextLocation.coords;
            
            const address = await LocationService.reverseGeocode(latitude, longitude);

            if (address && typeof address === 'string') {
                setPickupLocation({
                    address: address,
                    coordinates: { lat: latitude, lng: longitude }
                });
            }
        } catch (error) {
            console.error('Failed to load current location:', error);
        } finally {
            setLoadingCurrentLocation(false);
        }
    };

    const getCurrentLocation = async () => {
        if (!contextLocation?.coords) {
            Alert.alert('Error', 'Current location not available. Please enable location services.');
            return;
        }

        try {
            setLoadingCurrentLocation(true);
            const { latitude, longitude } = contextLocation.coords;
            
            const address = await LocationService.reverseGeocode(latitude, longitude);

            if (address && typeof address === 'string') {
                setPickupLocation({
                    address: address,
                    coordinates: { lat: latitude, lng: longitude }
                });
            } else {
                Alert.alert('Error', 'Could not fetch address for current location');
            }
        } catch (error) {
            console.error('Error getting current location:', error);
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setLoadingCurrentLocation(false);
        }
    };

    const fetchUserData = async () => {
        try {
            const user = await find_me();
            if (user && user.user) {
                setUserData(user.user);
            }
        } catch (error) {
            console.log("Error fetching user data:", error);
        }
    };

    const calculateRouteDistance = async () => {
        try {
            const dist = await calculateDistance(
                pickupLocation.coordinates,
                dropoffLocation.coordinates,
                []
            );
            
            if (dist && !isNaN(dist)) {
                setDistance(parseFloat(dist).toFixed(2));
            }
        } catch (error) {
            console.error("Failed to calculate distance:", error);
        }
    };

    const searchLocations = useCallback(async (text, inputType) => {
        const trimmedText = safeString(text).trim();
        
        if (!trimmedText || trimmedText.length < 2) {
            setSuggestions([]);
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        setLoading(true);
        setActiveInput(inputType);

        debounceTimer.current = setTimeout(async () => {
            try {
                const results = await LocationService.searchLocations(trimmedText);
                
                if (Array.isArray(results)) {
                    // Filter and validate results
                    const validResults = results.filter(item => 
                        item && 
                        typeof item === 'object' && 
                        (item.description || item.main_text)
                    );
                    setSuggestions(validResults);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    }, []);

    const handleLocationSelect = async (location) => {
        const currentInput = activeInput;
        setSuggestions([]);
        setLoading(true);

        try {
            const locationString = safeString(location);
            if (!locationString) {
                throw new Error('Invalid location selected');
            }

            const coordinates = await LocationService.getCoordinates(locationString);

            if (coordinates && 
                typeof coordinates.latitude === 'number' && 
                typeof coordinates.longitude === 'number') {
                
                const locationData = {
                    address: locationString,
                    coordinates: {
                        lat: coordinates.latitude,
                        lng: coordinates.longitude
                    }
                };

                if (currentInput === 'pickup') {
                    setPickupLocation(locationData);
                    setTimeout(() => dropoffInputRef.current?.focus(), 100);
                } else if (currentInput === 'dropoff') {
                    setDropoffLocation(locationData);
                    Keyboard.dismiss();
                }
            } else {
                Alert.alert('Error', 'Could not get coordinates for this location');
            }
        } catch (error) {
            console.error("Failed to get coordinates:", error);
            Alert.alert('Error', 'Failed to get coordinates. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUseMyNumber = () => {
        const newValue = !useMyNumber;
        setUseMyNumber(newValue);

        if (newValue) {
            const userNumber = userData?.number || '';
            if (userNumber) {
                setReceiverPhone(safeString(userNumber));
            } else {
                setUseMyNumber(false);
                Alert.alert('Error', 'Could not find your phone number.');
            }
        } else {
            setReceiverPhone('');
        }
    };

    const handleSubmit = () => {
        const name = safeString(receiverName).trim();
        const phone = safeString(receiverPhone).trim();

        if (!name) {
            Alert.alert('Error', 'Please enter receiver\'s name');
            return;
        }

        if (!phone) {
            Alert.alert('Error', 'Please enter receiver\'s phone number');
            return;
        }

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number');
            return;
        }

        const orderDetails = {
            pickup: pickupLocation,
            dropoff: dropoffLocation,
            receiver: {
                name: name,
                phone: phone,
                apartment: safeString(apartment) || 'Not specified',
                savedAs: savedAs || null
            },
            distance: distance || '0',
            timestamp: Date.now()
        };

        navigation.navigate('Choose_Vehicle', { orderDetails });
        setShowModal(false);
    };

    const clearPickupLocation = () => {
        setPickupLocation({ address: '', coordinates: { lat: 0, lng: 0 } });
        setSuggestions([]);
    };

    const clearDropoffLocation = () => {
        setDropoffLocation({ address: '', coordinates: { lat: 0, lng: 0 } });
        setSuggestions([]);
    };

    const isReadyToContinue = !!(
        pickupLocation.address &&
        dropoffLocation.address &&
        pickupLocation.coordinates.lat !== 0 &&
        dropoffLocation.coordinates.lat !== 0
    );

    const isDetailsComplete = !!(
        safeString(receiverName).trim() && 
        safeString(receiverPhone).trim()
    );

    const renderSuggestionItem = ({ item, index }) => {
        // Guard: skip invalid items
        if (!item || typeof item !== 'object') {
            return null;
        }

        const mainText = safeString(
            item.structured_formatting?.main_text || 
            item.main_text || 
            item.description || 
            'Unknown Location'
        );
        
        const secondaryText = safeString(
            item.structured_formatting?.secondary_text || 
            item.secondary_text || 
            ''
        );

        const description = safeString(item.description || mainText);

        return (
            <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleLocationSelect(description)}
            >
                <MapPin size={18} color="#666" />
                <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {mainText}
                    </Text>
                    {secondaryText ? (
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                            {secondaryText}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Set Location</Text>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                {/* Location Inputs Card */}
                <View style={styles.locationCard}>
                    {/* Pickup Input */}
                    <View style={styles.inputRow}>
                        <View style={styles.iconContainer}>
                            <MapPin size={20} color="#000" />
                        </View>
                        <TextInput
                            ref={pickupInputRef}
                            style={styles.locationInput}
                            placeholder="Pickup location"
                            placeholderTextColor="#999"
                            value={safeString(pickupLocation.address)}
                            onChangeText={(text) => {
                                const newText = safeString(text);
                                setPickupLocation({ 
                                    ...pickupLocation, 
                                    address: newText
                                });
                                searchLocations(newText, 'pickup');
                            }}
                            onFocus={() => setActiveInput('pickup')}
                            editable={!loadingCurrentLocation}
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {pickupLocation.address ? (
                            <TouchableOpacity onPress={clearPickupLocation}>
                                <X size={20} color="#666" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={getCurrentLocation} disabled={loadingCurrentLocation}>
                                {loadingCurrentLocation ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <Locate size={20} color="#000" />
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Dropoff Input */}
                    <View style={styles.inputRow}>
                        <View style={styles.iconContainer}>
                            <MapPin size={20} color="#000" />
                        </View>
                        <TextInput
                            ref={dropoffInputRef}
                            style={styles.locationInput}
                            placeholder="Where to?"
                            value={safeString(dropoffLocation.address)}
                            onChangeText={(text) => {
                                setDropoffLocation({ 
                                    ...dropoffLocation, 
                                    address: safeString(text) 
                                });
                                searchLocations(text, 'dropoff');
                            }}
                            onFocus={() => setActiveInput('dropoff')}
                        />
                        {dropoffLocation.address ? (
                            <TouchableOpacity onPress={clearDropoffLocation}>
                                <X size={20} color="#666" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* Distance Display */}
                {distance ? (
                    <View style={styles.distanceCard}>
                        <Text style={styles.distanceText}>
                            {`Distance: ${safeString(distance)} km`}
                        </Text>
                    </View>
                ) : null}

                {/* Loading Indicator */}
                {loading && <ActivityIndicator style={styles.loader} color="#000" />}

                {/* Suggestions List */}
                {suggestions.length > 0 && (
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item, index) => `suggestion-${index}-${item?.place_id || item?.description || ''}`}
                        style={styles.suggestionsList}
                        keyboardShouldPersistTaps="always"
                        renderItem={renderSuggestionItem}
                    />
                )}
            </View>

            {/* Continue Button */}
            {isReadyToContinue && !showModal && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.continueButton} onPress={() => setShowModal(true)}>
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Receiver Details Modal */}
            <Modal visible={showModal} transparent={true} animationType="none" onRequestClose={() => setShowModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: modalAnim }] }]}>
                            <TouchableOpacity activeOpacity={1}>
                                <View style={styles.modalHandle} />

                                <ScrollView
                                    contentContainerStyle={styles.modalContent}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                >
                                    {/* Location Summary */}
                                    <View style={styles.locationSummary}>
                                        <MapPin size={22} color="#000" />
                                        <View style={styles.locationInfo}>
                                            <Text style={styles.locationLabel}>Drop-off Location</Text>
                                            <Text style={styles.locationValue} numberOfLines={2}>
                                                {safeString(dropoffLocation.address)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Apartment/House Input */}
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Apartment / House / Shop (optional)"
                                        value={safeString(apartment)}
                                        onChangeText={(text) => setApartment(safeString(text))}
                                        placeholderTextColor="#999"
                                    />

                                    {/* Receiver's Name */}
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Receiver's Name *"
                                        value={safeString(receiverName)}
                                        onChangeText={(text) => setReceiverName(safeString(text))}
                                        placeholderTextColor="#999"
                                    />

                                    {/* Receiver's Phone */}
                                    <TextInput
                                        style={[styles.modalInput, useMyNumber && styles.disabledInput]}
                                        placeholder="Receiver's Mobile Number *"
                                        value={safeString(receiverPhone)}
                                        onChangeText={(text) => setReceiverPhone(safeString(text))}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        editable={!useMyNumber}
                                        placeholderTextColor="#999"
                                    />

                                    {/* Use My Number Checkbox */}
                                    <TouchableOpacity style={styles.checkboxRow} onPress={handleUseMyNumber}>
                                        <View style={[styles.checkbox, useMyNumber && styles.checkboxChecked]}>
                                            {useMyNumber ? (
                                                <Text style={styles.checkmark}>✓</Text>
                                            ) : null}
                                        </View>
                                        <Text style={styles.checkboxLabel}>Use my mobile number</Text>
                                    </TouchableOpacity>

                                    {/* Save As Options */}
                                    <Text style={styles.sectionLabel}>Save as (optional)</Text>
                                    <View style={styles.saveAsRow}>
                                        <TouchableOpacity
                                            style={[styles.saveAsButton, savedAs === 'home' && styles.saveAsButtonActive]}
                                            onPress={() => setSavedAs(savedAs === 'home' ? null : 'home')}
                                        >
                                            <Home size={20} color={savedAs === 'home' ? '#fff' : '#666'} />
                                            <Text style={[styles.saveAsText, savedAs === 'home' && styles.saveAsTextActive]}>
                                                Home
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.saveAsButton, savedAs === 'shop' && styles.saveAsButtonActive]}
                                            onPress={() => setSavedAs(savedAs === 'shop' ? null : 'shop')}
                                        >
                                            <Store size={20} color={savedAs === 'shop' ? '#fff' : '#666'} />
                                            <Text style={[styles.saveAsText, savedAs === 'shop' && styles.saveAsTextActive]}>
                                                Shop
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.saveAsButton, savedAs === 'other' && styles.saveAsButtonActive]}
                                            onPress={() => setSavedAs(savedAs === 'other' ? null : 'other')}
                                        >
                                            <Heart size={20} color={savedAs === 'other' ? '#fff' : '#666'} />
                                            <Text style={[styles.saveAsText, savedAs === 'other' && styles.saveAsTextActive]}>
                                                Other
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Confirm Button */}
                                    <TouchableOpacity
                                        style={[styles.confirmButton, isDetailsComplete && styles.confirmButtonActive]}
                                        onPress={handleSubmit}
                                        disabled={!isDetailsComplete}
                                    >
                                        <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </TouchableOpacity>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}