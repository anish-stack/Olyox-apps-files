import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL_V2, API_BASE_URL_V3 } from '../../constant/Api';
import styles from './styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constant/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function HotelRegistration() {
  const [hotelData, setHotelData] = useState({
    hotel_name: '',
    hotel_zone: '',
    hotel_address: '',
    hotel_owner: '',
    hotel_phone: '',
    amenities: {
      AC: false,
      freeWifi: false,
      kitchen: false,
      TV: false,
      powerBackup: false,
      geyser: false,
      parkingFacility: false,
      elevator: false,
      cctvCameras: false,
      diningArea: false,
      privateEntrance: false,
      reception: false,
      caretaker: false,
      security: false,
      checkIn24_7: false,
      dailyHousekeeping: false,
      fireExtinguisher: false,
      firstAidKit: false,
      buzzerDoorBell: false,
      attachedBathroom: false,
    },
    hotel_main_show_image: '',
    area: '',
    hotel_geo_location: {
      type: 'Point',
      coordinates: [0, 0], // default coordinates
    },
    property_pdf: '',
    bh: '',
    BhJsonData: null
  });

  const [loading, setLoading] = useState(false);
  const navigation = useNavigation()
  const route = useRoute()
  const { bh } = route.params || {}
  const [error, setError] = useState(null);
  const [bhDetails, setBhDetails] = useState(null);
  const [isBhValid, setIsBhValid] = useState(false);
  const [useExistingAddress, setUseExistingAddress] = useState(true);
  const [showAmenities, setShowAmenities] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success'); // 'success' or 'error'
  const snackbarOpacity = useRef(new Animated.Value(0)).current;

  // Snackbar function
  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);

    Animated.sequence([
      Animated.timing(snackbarOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(snackbarOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSnackbarVisible(false));
  };

  useEffect(() => {
    if (bh) {
      setHotelData(prev => ({ ...prev, bh: bh }));
    }
  }, [bh]);

  // Toggle amenities section
  const toggleAmenitiesSection = () => setShowAmenities(!showAmenities);

  // Toggle individual amenity
  const toggleAmenity = (key) => {
    setHotelData(prev => ({
      ...prev,
      amenities: { ...prev.amenities, [key]: !prev.amenities[key] }
    }));
  };

  // Handle input change
  const handleInputChange = (field, value) => setHotelData(prev => ({ ...prev, [field]: value }));

  // Validate BH ID
  const checkBhId = async () => {
    Keyboard.dismiss();
    if (!hotelData.bh.trim()) {
      showSnackbar('Please enter a valid BH ID.', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_BASE_URL_V3}check-bh-id`, { bh: hotelData.bh });

      if (!data.success) {
        setIsBhValid(false);
        const msg = data.message || 'Invalid BH ID.';
        setError(msg);
        showSnackbar(msg, 'error');
        return;
      }

      setBhDetails(data.complete);
      setIsBhValid(true);

      // If use existing address is enabled
      if (useExistingAddress && data.complete?.address) {
        const coords = data.complete.address.location?.coordinates;
        setHotelData(prev => ({
          ...prev,
          hotel_address: data.complete.address.street_address || '',
          area: data.complete.address.area || '',
          hotel_geo_location: {
            type: 'Point',
            coordinates: coords && coords.length === 2 ? coords : [0, 0],
          },
          BhJsonData: data.complete
        }));
      }

      showSnackbar('BH ID validated successfully!', 'success');
    } catch (err) {
      setIsBhValid(false);
      const errorMessage = err.response?.data?.message || 'An error occurred while validating BH ID.';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Register Hotel
  const handleRegister = async () => {
    Keyboard.dismiss();

    if (!isBhValid) {
      showSnackbar('Please validate BH ID before proceeding.', 'error');
      return;
    }

    if (!hotelData.hotel_name.trim() || !hotelData.hotel_address.trim() || !hotelData.hotel_owner.trim() || !hotelData.hotel_phone.trim()) {
      showSnackbar('All fields are required.', 'error');
      return;
    }

    // Ensure coordinates are valid
    const coords = hotelData.hotel_geo_location.coordinates;
    if (!coords || coords.length !== 2) {
      showSnackbar('Invalid geo-location. Please provide valid latitude and longitude.', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL_V2}/register-hotel`, hotelData);
      console.log(response.data);

      navigation.reset({
        index: 1,
        routes: [
          { name: 'OtpVerifyRegister', params: { hotelPhone: hotelData.hotel_phone } },
        ],
      });

      showSnackbar('Hotel Registered Successfully!', 'success');
    } catch (error) {
      console.error('Failed to register hotel:', error.response?.data);
      showSnackbar('Failed to register the hotel. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Hotel Registration</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* BH ID Validation */}
          {!isBhValid && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>BH ID Verification</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>BH ID</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="id-card" size={20} color="#3498db" />
                  </View>
                  <TextInput
                    placeholder="Enter BH ID"
                    value={hotelData.bh}
                    onChangeText={text => handleInputChange('bh', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                  />
                </View>
              </View>

              <TouchableOpacity onPress={checkBhId} style={styles.button} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify BH ID</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* BH Details */}
          {isBhValid && bhDetails && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>BH Details</Text>
              <Text style={styles.bhDetailsText}><Text style={{ fontWeight: 'bold' }}>Name: </Text>{bhDetails.name}</Text>
              <Text style={styles.bhDetailsText}><Text style={{ fontWeight: 'bold' }}>Email: </Text>{bhDetails.email}</Text>
              <Text style={styles.bhDetailsText}><Text style={{ fontWeight: 'bold' }}>Category: </Text>{bhDetails?.category?.title || 'N/A'}</Text>
              <Text style={styles.bhDetailsText}><Text style={{ fontWeight: 'bold' }}>Referral Code: </Text>{bhDetails.myReferral}</Text>

              {bhDetails.address && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.bhDetailsText}><Text style={{ fontWeight: 'bold' }}>Address: </Text>{bhDetails.address.street_address}</Text>
                  <Text style={styles.bhDetailsText}><Text style={{ fontWeight: 'bold' }}>Area: </Text>{bhDetails.address.area}</Text>
                  <Text style={styles.bhDetailsText}><Text style={{ fontWeight: 'bold' }}>Pincode: </Text>{bhDetails.address.pincode}</Text>
                </>
              )}
            </View>
          )}

          {/* Hotel Registration Form */}
          {isBhValid && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Hotel Information</Text>

              {['hotel_name', 'hotel_address', 'hotel_owner', 'hotel_phone', 'hotel_zone', 'property_pdf'].map((field) => (
                <View key={field} style={styles.inputContainer}>
                  <Text style={styles.label}>{field.replace(/hotel_/g, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.iconContainer}>
                      <FontAwesome name={field === 'hotel_owner' ? "user" : field === 'hotel_phone' ? "phone" : "building"} size={20} color="#3498db" />
                    </View>
                    <TextInput
                      placeholder={`Enter ${field.replace(/hotel_/g, '')}`}
                      value={hotelData[field]}
                      onChangeText={text => handleInputChange(field, text)}
                      style={[styles.input, { flex: 1, marginLeft: 10 }]}
                      keyboardType={field === 'hotel_phone' ? 'phone-pad' : 'default'}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Amenities */}
          {isBhValid && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.amenitiesHeader} onPress={toggleAmenitiesSection}>
                <Text style={styles.cardTitle}>Amenities</Text>
                <MaterialIcons name={showAmenities ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="#3498db" />
              </TouchableOpacity>
              {showAmenities && (
                <View style={styles.amenitiesContainer}>
                  {Object.keys(hotelData.amenities).map((amenity) => (
                    <View key={amenity} style={styles.amenityItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons
                          name={hotelData.amenities[amenity] ? "check-circle" : "radio-button-unchecked"}
                          size={14}
                          color={hotelData.amenities[amenity] ? "#2ecc71" : "#bdc3c7"}
                        />
                        <Text style={styles.amenityText}>
                          {amenity.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Text>
                      </View>
                      <Switch
                        value={hotelData.amenities[amenity]}
                        onValueChange={() => toggleAmenity(amenity)}
                        trackColor={{ false: colors.primaryViolet, true: colors.primaryRed }}
                        thumbColor={hotelData.amenities[amenity] ? colors.primaryRed : '#f4f3f4'}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Register Button */}
          {isBhValid && (
            <TouchableOpacity onPress={handleRegister} style={styles.registerButton} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Register Hotel</Text>}
            </TouchableOpacity>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Snackbar */}
        {snackbarVisible && (
          <Animated.View style={[styles.snackbar, snackbarType === 'success' ? styles.snackbarSuccess : styles.snackbarError, { opacity: snackbarOpacity }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name={snackbarType === 'success' ? "check-circle" : "error"} size={24} color="white" />
              <Text style={styles.snackbarText}>{snackbarMessage}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              Animated.timing(snackbarOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setSnackbarVisible(false));
            }}>
              <MaterialIcons name="close" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
