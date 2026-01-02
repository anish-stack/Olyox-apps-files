import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Dimensions, ScrollView, StyleSheet, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
const { width } = Dimensions.get('screen')
export function ProfileUpdate() {
    const [vendorId, setVendorId] = useState(null)
    const [vendorData, setVendorData] = useState(null)
    const [formData, setFormData] = useState({
        restaurant_name: '',
        restaurant_phone: '',
        restaurant_contact: '',
        openingHours: '',
        restaurant_category: '',
        restaurant_fssai: '',
        priceForTwoPerson: '',
        minDeliveryTime: '',
        minPrice: ''
    });


    const [images, setImages] = useState({
        restaurant_fssai_image: null,
        restaurant_adhar_front_image: null,
        restaurant_adhar_back_image: null,
        restaurant_pan_image: null
    });


    const fetchUserDetails = async () => {
        try {
            // Retrieve the token from AsyncStorage
            const storedToken = await AsyncStorage.getItem('userToken');
            if (!storedToken) {
                navigation.replace('Login');
                return;
            }

            // Make the API request
            const { data } = await axios.get(
                'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
                {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`
                    }
                }
            );
            const vendor = data?.data

            setVendorId(vendor?._id)
            setVendorData(vendor)
            setFormData({
                restaurant_name: vendor.restaurant_name,
                restaurant_phone: vendor.restaurant_phone,
                restaurant_contact: vendor.restaurant_contact,
                openingHours: vendor.openingHours,
                restaurant_category: vendor.restaurant_category,
                restaurant_fssai: vendor.restaurant_fssai,
                priceForTwoPerson: vendor.priceForTwoPerson,
                minDeliveryTime: vendor.minDeliveryTime,
                minPrice: vendor.minPrice,
            });
            setImages({
                restaurant_fssai_image: vendor.restaurant_fssai_image
                    ? { uri: vendor.restaurant_fssai_image.url }
                    : null,
                restaurant_adhar_front_image: vendor.restaurant_adhar_front_image
                    ? { uri: vendor.restaurant_adhar_front_image.url }
                    : null,
                restaurant_adhar_back_image: vendor.restaurant_adhar_back_image
                    ? { uri: vendor.restaurant_adhar_back_image.url }
                    : null,
                restaurant_pan_image: vendor.restaurant_pan_image
                    ? { uri: vendor.restaurant_pan_image.url }
                    : null
            });


        } catch (error) {
            console.log('Error:', error);
            alert('An error occurred while fetching user details. Please try again.');
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const renderCategoryDropdown = () => (
        <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
                <Icon name="food" size={20} color="#6366f1" />
                <Text style={styles.label}>Category</Text>
            </View>
            <View style={styles.inputWrapper}>
                <Picker
                    selectedValue={formData.restaurant_category}
                    onValueChange={(itemValue) => setFormData(prev => ({ ...prev, restaurant_category: itemValue }))}
                    style={styles.picker}
                >
                    <Picker.Item label="Veg" value="Veg" />
                    <Picker.Item label="Non-Veg" value="Non-Veg" />
                    <Picker.Item label="Veg-Non-Veg" value="Veg-Non-Veg" />
                </Picker>
            </View>
        </View>
    );

    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [searchTimeout, setSearchTimeout] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchAddressSuggestions = async (query) => {
        // console.log("query",query)
        try {
            const response = await axios.get(`https://www.api.blueaceindia.com/api/v1/autocomplete?input=${encodeURIComponent(query)}`);
            // const data = await response.json();
            // console.log("response", response.data)
            setAddressSuggestions(response.data || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            Alert.alert('Error', 'Failed to fetch address suggestions');
        }
    };

    const fetchGeocode = async (selectedAddress) => {
        try {
            const response = await fetch(
                `https://www.api.blueaceindia.com/api/v1/geocode?address=${encodeURIComponent(selectedAddress)}`
            );
            const data = await response.json();
            const { latitude, longitude } = data;

            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    street_address: selectedAddress,
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    }
                }
            }));


            console.log("formdata", formData)
            setAddressSuggestions([]);
        } catch (error) {
            console.error('Error fetching geocode:', error);
            Alert.alert('Error', 'Failed to fetch location coordinates');
        }
    };

    const handleAddressChange = (text) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                street_address: text
            }
        }));

        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        setSearchTimeout(
            setTimeout(() => {
                if (text.length > 2) {
                    fetchAddressSuggestions(text);
                } else {
                    setAddressSuggestions([]);
                }
            }, 200)
        );
    };

    const handleImageUpload = async (type) => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                alert('Permission to access camera roll is required!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,

                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImages(prev => ({ ...prev, [type]: result.assets[0] }));
            }
        } catch (error) {
            console.error('Error selecting image:', error);
            alert('An error occurred while selecting the image');
        }
    };


    const handleSubmit = async () => {
        try {
            setLoading(true);
            const formDataToSend = new FormData();

            // Append text fields properly
            Object.keys(formData).forEach(key => {
                if (typeof formData[key] === 'object' && key !== "address") {
                    formDataToSend.append(key, JSON.stringify(formData[key]));
                } else {
                    formDataToSend.append(key, formData[key]);
                }
            });

            // Append image files properly
            Object.keys(images).forEach(key => {
                if (images[key]) {
                    formDataToSend.append(key, {
                        uri: images[key].uri,
                        name: `${key}.jpg`, // Ensure it has a filename
                        type: 'image/jpeg',  // Ensure the correct MIME type
                    });
                }
            });

            console.log("Final formDataToSend", formDataToSend);


            const response = await axios.put(
                `https://appapi.olyox.com/api/v1/tiffin/update_restaurant_details/${vendorId}`,
                formDataToSend,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            console.log("Response from API:", response.data);
            Alert.alert('Success', 'Profile updated successfully');

        } catch (error) {
            console.error("Error updating profile:", error.response?.data || error.message);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };


    const renderInput = (label, icon, value, key, options, keyboardType = 'default', editable = true) => (
        <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
                <Icon name={icon} size={20} color="#6366f1" />
                <Text style={styles.label}>{label}</Text>
            </View>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={(text) => {
                        console.log(key)
                        if (key == 'restaurant_address.street') {
                            handleAddressChange(text);
                            setFormData((prev) => (
                                {
                                    ...prev,
                                    street_address: text
                                }
                            ))
                        } else if (key.includes('.')) {
                            const [parent, child] = key.split('.');
                            setFormData(prev => ({
                                ...prev,
                                [parent]: { ...prev[parent], [child]: text }
                            }));
                        } else {
                            setFormData(prev => ({ ...prev, [key]: text }));
                        }
                    }}
                    placeholder={`Enter your ${label.toLowerCase()}`}
                    placeholderTextColor="#9ca3af"
                    keyboardType={keyboardType}
                    editable={editable}
                />
            </View>
            {key === 'restaurant_address.street' && addressSuggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, { maxHeight: 200 }]}>
                    {addressSuggestions.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.suggestionItem}
                            onPress={() => {
                                fetchGeocode(item.description)
                                handleAddressChange(item.description); // ✅ Call function if necessary
                                setFormData(prev => ({
                                    ...prev,
                                    street_address: item.description // ✅ Update the form data
                                }));
                            }}
                        >
                            <Icon name="map-marker" size={16} color="#6366f1" />
                            <Text style={styles.suggestionText}>{item.description}</Text>
                        </TouchableOpacity>

                    ))}

                </View>
            )}
        </View>
    );

    const renderImageUpload = (label, type) => (
        <View style={styles.imageUploadContainer}>
            <Text style={styles.imageLabel}>{label}</Text>
            {/* <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => handleImageUpload(type)}
            >
                <Icon name="camera-plus" size={24} color="#6366f1" />
                <Text style={styles.imageUploadText}>
                    {images[type] ? 'Change Image' : 'Upload Image'}
                </Text>
            </TouchableOpacity> */}
            {images[type] && (
                <View style={styles.imagePreviewContainer}>
                    <Image
                        source={{ uri: images[type].uri }}
                        style={styles.imagePreview}
                    />
                    <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setImages(prev => ({ ...prev, [type]: null }))}
                    >
                        <Icon name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {!vendorData?.isDocumentUpload && (
                    <View style={styles.badgeContainer}>
                        <LinearGradient
                            colors={['#4f46e5', '#6366f1']}
                            style={styles.badge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.iconContainer}>
                                <Icon name="file-upload" size={40} color="#fff" />
                                <View style={styles.pulseRing} />
                            </View>
                            <Text style={styles.badgeTitle}>Document Upload Required</Text>
                            <Text style={styles.badgeSubtitle}>Please upload your documents to start working</Text>
                        </LinearGradient>
                    </View>
                )}

                {vendorData?.isDocumentUpload && !vendorData?.documentVerify && (
                    <View style={styles.badgeContainer}>
                        <LinearGradient
                            colors={['#eab308', '#fbbf24']}
                            style={styles.badge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.iconContainer}>
                                <Icon name="clock" size={40} color="#fff" />
                                <View style={[styles.spinner]} />
                            </View>
                            <Text style={styles.badgeTitle}>Verification in Progress</Text>
                            <Text style={styles.badgeSubtitle}>Your documents are being reviewed</Text>
                        </LinearGradient>
                    </View>
                )}

                {vendorData?.isDocumentUpload && vendorData?.documentVerify && (
                    <View style={styles.badgeContainer}>
                        <LinearGradient
                            colors={['#16a34a', '#22c55e']}
                            style={styles.badge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.iconContainer}>
                                <Icon name="check-circle" size={40} color="#fff" />
                                <View style={styles.successRing} />
                            </View>
                            <Text style={styles.badgeTitle}>Documents Verified</Text>
                            <Text style={styles.badgeSubtitle}>You're ready to start working</Text>
                        </LinearGradient>
                    </View>
                )}

                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Icon name="account-circle" size={80} color="#6366f1" />
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <Icon name="camera" size={20} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.title}>Update Profile</Text>
                    <Text style={styles.subtitle}>Keep your profile information up to date</Text>
                </View>

                <View style={styles.formContainer}>
                    {renderInput('Restaurant Name', 'account', formData.restaurant_name, 'restaurant_name', '', '', false)}
                    {renderInput('Phone', 'phone', formData.restaurant_phone, 'restaurant_phone', '', '', false)}
                    {/* {renderInput('Contact Person', 'account', formData.restaurant_contact, 'restaurant_contact',true)} */}
                    {renderInput('Opening Hours', 'clock-outline', formData.openingHours, 'openingHours')}
                    {/* {renderInput('Category', 'food', formData.restaurant_category, 'restaurant_category',false)} */}
                    {renderCategoryDropdown()}
                    {renderInput('FSSAI Number', 'certificate', formData.restaurant_fssai, 'restaurant_fssai', '', '', false)}
                    {renderInput('Price For Two Person', 'certificate', formData.priceForTwoPerson, 'priceForTwoPerson')}
                    {renderInput('Min Delivery Time', 'certificate', formData.minDeliveryTime, 'minDeliveryTime')}
                    {renderInput('Min Price', 'certificate', formData.minPrice, 'minPrice')}


                    <View style={styles.documentsSection}>
                        <Text style={styles.sectionTitle}>Documents</Text>
                        {renderImageUpload('FSSAI License', 'restaurant_fssai_image')}
                        {renderImageUpload('Aadhar Card Front', 'restaurant_adhar_front_image')}
                        {renderImageUpload('Aadhar Card Back', 'restaurant_adhar_back_image')}
                        {renderImageUpload('PAN Card', 'restaurant_pan_image')}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Icon name="content-save" size={24} color="#fff" style={styles.submitIcon} />
                                <Text style={styles.submitText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#ffffff',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    editAvatarButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#6366f1',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    formContainer: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        margin: 16,
    },
    inputContainer: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
        marginLeft: 8,
    },
    inputWrapper: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    input: {
        fontSize: 16,
        padding: 16,
        color: '#1f2937',
    },
    suggestionsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginTop: 4,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    suggestionText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4b5563',
    },
    documentsSection: {
        marginTop: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    imageUploadContainer: {
        marginBottom: 16,
    },
    imageLabel: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 8,
    },
    imageUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#6366f1',
    },
    imageUploadText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
    },
    imagePreviewContainer: {
        marginTop: 8,
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitIcon: {
        marginRight: 8,
    },
    submitText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    badgeContainer: {
        padding: 16,
        width: '100%',
    },
    badge: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    badgeTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    badgeSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        textAlign: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        animation: 'pulse 2s infinite',
    },
    spinner: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderTopColor: 'transparent',
        animation: 'spin 1s linear infinite',
    },
    successRing: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        opacity: 0.8,
    },
});