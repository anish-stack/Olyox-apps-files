// HotelListingForm.js
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useToken } from '../../context/AuthContext';

import { API_BASE_URL_V2 } from '../../constant/Api';
import FormField from '../../components/common/FormField';
import SwitchField from '../../components/common/SwitchField';
import ImageUploadField from '../../components/common/ImageUploadField';
import FormButton from '../../components/common/FormButton';
import DropdownField from '../../components/common/DropdownField';
import TagInputField from '../../components/common/TagInputField';

const roomTypeOptions = [
  'Studio',
  '1RK',
  '1BHK',
  '2BHK',
  '3BHK',
  '4BHK',
  'Penthouse',
  'Villa',
  'Cottage',
  'Duplex',
  'Suite',
  'Junior Suite',
  'Executive Suite',
  'Deluxe Room',
  'Super Deluxe Room',
  'Standard Room',
  'Economy Room',
  'Luxury Room',
  'Family Room',
  'Single Room',
  'Double Room',
  'Twin Room',
  'Triple Room',
  'Dormitory',
  'Serviced Apartment',
  'Guest House',
  'Homestay',
  'Farmhouse',
  'Resort Room',
  'Tent / Glamping',
  'Tree House',
];

const HotelListingForm = () => {
  const { token } = useToken();
  const navigation = useNavigation();

  const [form, setForm] = useState({
    room_type: '',
    has_tag: '',
    rating_number: '0',
    number_of_rating_done: '0',
    allowed_person: '',
    cut_price: '',
    book_price: '',
    discount_percentage: '',
    is_tax_applied: false,
    tax_fair: '',
    isPackage: false,
    package_add_ons: '',
    cancellation_policy: '',
  });

  const [tags, setTags] = useState([]);
  const [images, setImages] = useState({
    main_image: null,
    second_image: null,
    third_image: null,
    fourth_image: null,
    fifth_image: null,
  });

  const [amenities, setAmenities] = useState({
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
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleAmenity = (key) => {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
    if (error) setError(null);
  };

  const handleRoomTypeSelect = (roomType) => {
    handleChange('room_type', roomType);
  };

  const handleTagsChange = (newTags) => {
    setTags(newTags);
    handleChange('has_tag', newTags.join(','));
  };

  const handleSwitch = (key) => {
    setForm({ ...form, [key]: !form[key] });
  };

  const pickImage = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
 
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setImages({ ...images, [field]: result.assets[0].uri });
    }
  };

  const validateForm = () => {
    if (!form.room_type) return setError('Room Type is required');
    if (!form.book_price) return setError('Book Price is required');
    if (!images.main_image) return setError('Main Image is required');
    if (form.is_tax_applied && !form.tax_fair) return setError('Tax amount is required');
    if (form.isPackage && !form.package_add_ons) return setError('Package add-ons are required');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        formData.append(key, form[key] === false ? 'false' : form[key]);
      });

      formData.append('amenities', JSON.stringify(amenities));

      Object.keys(images).forEach((key) => {
        if (images[key]) {
          const uri = images[key];
          const filename = uri.split('/').pop();
          const type = `image/${filename.split('.').pop() || 'jpeg'}`;

          formData.append(key, {
            uri,
            name: filename,
            type,
          });
        }
      });

      await axios.post(`${API_BASE_URL_V2}/add-hotel-listing`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert('Success', 'Hotel listing added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Room Listing</Text>
        <View style={{ width: 48 }} /> {/* Spacer for centering title */}
      </View>

      {/* Scrollable Form Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Alert */}
          {error && (
            <View style={styles.errorAlert}>
              <MaterialIcons name="error-outline" size={20} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <DropdownField
              label="Room Type"
              value={form.room_type}
              options={roomTypeOptions}
              onSelect={handleRoomTypeSelect}
              required
            />

            <TagInputField
              label="Tags (e.g. Couple Friendly, Luxury)"
              tags={tags}
              onTagsChange={handleTagsChange}
              placeholder="Type and press Enter"
            />

            <FormField
              label="Max Allowed Persons"
              value={form.allowed_person}
              onChangeText={(v) => handleChange('allowed_person', v)}
              keyboardType="numeric"
              placeholder="e.g. 4"
            />
          </View>

          {/* Amenities Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {Object.keys(amenities).map((key) => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.amenityItem}
                    onPress={() => toggleAmenity(key)}
                  >
                    <Ionicons
                      name={amenities[key] ? 'checkmark-circle' : 'radio-button-off'}
                      size={22}
                      color={amenities[key] ? '#E30613' : '#999'}
                    />
                    <Text style={[styles.amenityLabel, amenities[key] && styles.amenityLabelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>

            <FormField
              label="Booking Price (₹)"
              value={form.book_price}
              onChangeText={(v) => handleChange('book_price', v)}
              keyboardType="numeric"
              required
            />

            <FormField
              label="Original Price (Strikethrough)"
              value={form.cut_price}
              onChangeText={(v) => handleChange('cut_price', v)}
              keyboardType="numeric"
              placeholder="e.g. 3000"
            />

            <FormField
              label="Discount %"
              value={form.discount_percentage}
              onChangeText={(v) => handleChange('discount_percentage', v)}
              keyboardType="numeric"
              placeholder="e.g. 20"
            />

            <SwitchField
              label="Apply Tax/GST"
              value={form.is_tax_applied}
              onValueChange={() => handleSwitch('is_tax_applied')}
            />

            {form.is_tax_applied && (
              <FormField
                label="Tax Amount (₹)"
                value={form.tax_fair}
                onChangeText={(v) => handleChange('tax_fair', v)}
                keyboardType="numeric"
              />
            )}
          </View>

          {/* Package & Policy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package & Policy</Text>

            <SwitchField
              label="This is a Package Deal"
              value={form.isPackage}
              onValueChange={() => handleSwitch('isPackage')}
            />

            {form.isPackage && (
              <FormField
                label="Package Inclusions"
                value={form.package_add_ons}
                onChangeText={(v) => handleChange('package_add_ons', v)}
                multiline
                placeholder="e.g. Breakfast + Dinner + Spa Access"
              />
            )}

            <FormField
              label="Cancellation Policy"
              value={form.cancellation_policy}
              onChangeText={(v) => handleChange('cancellation_policy', v)}
              multiline
              placeholder="e.g. Free cancellation until 48 hours before check-in"
            />
          </View>

          {/* Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Room Photos</Text>
            <Text style={styles.sectionSubtitle}>High-quality images attract more bookings</Text>

            <View style={styles.imageGrid}>
              <ImageUploadField
                label="Main Photo *"
                imageUri={images.main_image}
                onPress={() => pickImage('main_image')}
              />
              {['second_image', 'third_image', 'fourth_image', 'fifth_image'].map((key) => (
                <ImageUploadField
                  key={key}
                  label={key === 'second_image' ? 'Photo 2' : key === 'third_image' ? 'Photo 3' : key === 'fourth_image' ? 'Photo 4' : 'Photo 5'}
                  imageUri={images[key]}
                  onPress={() => pickImage(key)}
                />
              ))}
            </View>
          </View>

          {/* Extra bottom padding for fixed button */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Submit Button at Bottom */}
      <View style={styles.fixedButtonContainer}>
        <FormButton
          title={isLoading ? "Submitting..." : "Submit Listing"}
          onPress={handleSubmit}
          isLoading={isLoading}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

export default HotelListingForm;

// Beautiful, Modern Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    height: 64,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    marginRight: -48, // Offset for centering with back button
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  errorAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  amenityLabel: {
    marginLeft: 10,
    fontSize: 15,
    color: '#444',
  },
  amenityLabelActive: {
    color: '#E30613',
    fontWeight: '600',
  },
  imageGrid: {
    marginTop: 8,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34, // Extra for iPhone home bar
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
  },
};

export { styles };