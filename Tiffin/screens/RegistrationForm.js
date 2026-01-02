import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Dimensions, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Card, Title, Text, ActivityIndicator, Snackbar, HelperText } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import DropDownPicker from 'react-native-dropdown-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
const API_BASE_URL = 'https://www.webapi.olyox.com/api/v1';
const MAIN_API_BASE_URL = 'https://appapi.olyox.com/api/v1/tiffin';

const { width } = Dimensions.get('window');

export default function RegistrationForm() {
    const router = useNavigation();
    const route = useRoute()
    const { BH } = route.params || {}
    const [step, setStep] = useState(1);
    const [bhId, setBhId] = useState(BH ? BH : 'BH');
    const [userData, setUserData] = useState(null);
    const [location, setLocation] = useState(null);
    const [lerrorMsg, setLerrorMsg] = useState(null);
    // Form fields
    const [formData, setFormData] = useState({
        restaurant_name: '',
        restaurant_owner_name: '',
        restaurant_phone: '',
        restaurant_contact: '',
        restaurant_category: 'Veg',
        restaurant_fssai: '',
        opening_hours: '',
        address: {
            street: '',
            city: '',
            state: '',
            zip: ''
        }
    });

    // Dropdown state
    const [open, setOpen] = useState(false);
    const [categories] = useState([
        { label: 'Veg', value: 'Veg' },
        { label: 'Non-Veg', value: 'Non-Veg' },
        { label: 'Veg & Non-Veg', value: 'Veg-Non-Veg' }
    ]);

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Validation states
    const [errors, setErrors] = useState({});

    const validateBhId = () => {
        if (!bhId || bhId.length !== 8) {
            setErrors(prev => ({ ...prev, bhId: 'Please enter a valid 8-digit BH ID' }));
            return false;
        }
        setErrors(prev => ({ ...prev, bhId: null }));
        return true;
    };

    const validateForm = () => {
        let newErrors = {};
        let isValid = true;

        if (!formData.restaurant_name.trim()) {
            newErrors.restaurant_name = 'Restaurant name is required';
            isValid = false;
        }

        if (!formData.restaurant_phone.trim()) {
            newErrors.restaurant_phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.restaurant_phone)) {
            newErrors.restaurant_phone = 'Enter a valid 10-digit phone number';
            isValid = false;
        }

        if (!formData.restaurant_fssai.trim()) {
            newErrors.restaurant_fssai = 'FSSAI number is required';
            isValid = false;
        }

        if (!formData.opening_hours.trim()) {
            newErrors.opening_hours = 'Opening hours are required';
            isValid = false;
        }

        if (!formData.address.street.trim()) {
            newErrors['address.street'] = 'Street address is required';
            isValid = false;
        }
        if (!formData.address.state.trim()) {
            newErrors['address.state'] = 'State is required';
            isValid = false;
        }
        if (!formData.address.city.trim()) {
            newErrors['address.city'] = 'City Code is required';
            isValid = false;
        }
        if (!formData.address.zip.trim()) {
            newErrors['address.zip'] = 'Zip Code is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };


    useEffect(() => {
        async function getCurrentLocation() {

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLerrorMsg('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            console.log(location.coords)
            setLocation(location.coords);
        }

        getCurrentLocation();
    }, []);



    const fetchUserDetails = async () => {
        console.log('Fetching user details', validateBhId())
        if (!validateBhId()) return;


        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/app-get-details?Bh=${bhId}`);
            console.log(response.data.data.number)
            if (response.data.success) {
                setUserData(response.data.data);
                setFormData(prev => ({
                    ...prev,
                    restaurant_owner_name: response.data.data.name || '',
                    restaurant_phone: response.data.data.number || ''
                }));
                setStep(2);
            } else {
                setError('User not found');
            }
        } catch (error) {
            setError('Failed to fetch user details');
        } finally {
            setLoading(false);
        }
    };

    const registerRestaurant = async () => {
        console.log('Fetching user details', validateForm())

        if (!validateForm()) return;

        if (!location) {
            console.log("location", location)
            Alert.alert(
                'Allow Location',
                'To continue, please enable location access in your app settings.',
                [
                    {
                        text: 'Open Settings',
                        onPress: () => {
                            Linking.openSettings();
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ],
                { cancelable: true }
            );
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${MAIN_API_BASE_URL}/register_restaurant`, {
                restaurant_BHID: bhId,
                geo_location: {
                    type: 'Point',
                    coordinates: [location?.longitude, location?.latitude]
                },
                ...formData
            });
            console.log(response.data)

            setStep(3);
            setLoading(false);
            setSuccess('Registration successful. Please enter OTP.');

        } catch (error) {
            setLoading(false);
            console.log(error.response.data)
            setError('Failed to register restaurant');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) {
            setError('Please enter OTP');
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post(`${MAIN_API_BASE_URL}/verify_otp`, {
                restaurant_BHID: bhId,
                otp
            });

            if (data.success) {
                await AsyncStorage.setItem('userToken', data.token);
                setSuccess('OTP verified successfully');
                router.navigate('Home');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        setLoading(true);
        try {
            await axios.post(`${MAIN_API_BASE_URL}/resend-otp`, {
                restaurant_BHID: bhId,
                type: "verify"
            });
            setSuccess('OTP resent successfully');
        } catch (error) {
            Alert.alert('Otp Send Failed', error.response.data.message)
            setError('Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    const renderUserInfo = () => {
        if (!userData) return null;
        return (
            <Card style={styles.infoCard}>
                <Card.Content>
                    <Title style={styles.infoTitle}>User Information</Title>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        <Text style={styles.infoValue}>{userData.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{userData.email}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Category:</Text>
                        <Text style={styles.infoValue}>{userData.category?.title}</Text>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <TextInput
                label="BH ID"
                value={bhId}
                onChangeText={setBhId}
                mode="outlined"
                keyboardType="number-pad"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
            />
            <HelperText type="error" visible={!!errors.bhId}>
                {errors.bhId}
            </HelperText>
            <Button
                mode="contained"
                onPress={fetchUserDetails}
                style={styles.button}
                loading={loading}
            >
                Next
            </Button>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            {renderUserInfo()}
            <TextInput
                label="Restaurant Owner Name"
                value={formData.restaurant_owner_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, restaurant_owner_name: text }))}
                mode="outlined"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
            />
            <HelperText type="error" visible={!!errors.restaurant_owner_name}>
                {errors.restaurant_owner_name}
            </HelperText>
            <TextInput
                label="Restaurant Name"
                value={formData.restaurant_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, restaurant_name: text }))}
                mode="outlined"
                placeholder={`${formData.restaurant_owner_name} Ka Dhabha`}
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
            />
            <HelperText type="error" visible={!!errors.restaurant_name}>
                {errors.restaurant_name}
            </HelperText>

            <TextInput
                label="Owner Phone Number"
                value={formData.restaurant_phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, restaurant_phone: text }))}
                mode="outlined"
                keyboardType="phone-pad"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                error={!!errors.restaurant_phone}
            />
            <HelperText type="error" visible={!!errors.restaurant_phone}>
                {errors.restaurant_phone}
            </HelperText>

            <TextInput
                label="Restuarnt Phone Number"
                value={formData.restaurant_contact}
                onChangeText={(text) => setFormData(prev => ({ ...prev, restaurant_contact: text }))}
                mode="outlined"

                keyboardType="phone-pad"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                error={!!errors.restaurant_contact}
            />
            <HelperText type="error" visible={!!errors.restaurant_contact}>
                {errors.restaurant_contact}
            </HelperText>
            <View style={styles.dropdownContainer}>
                <DropDownPicker
                    open={open}
                    value={formData.restaurant_category}
                    items={categories}
                    setOpen={setOpen}
                    setValue={(callback) =>
                        setFormData((prev) => ({
                            ...prev,
                            restaurant_category: typeof callback === 'function' ? callback(prev.restaurant_category) : callback
                        }))
                    } style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownList}
                />
            </View>

            <TextInput
                label="FSSAI Number"
                value={formData.restaurant_fssai}
                onChangeText={(text) => setFormData(prev => ({ ...prev, restaurant_fssai: text }))}
                mode="outlined"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                error={!!errors.restaurant_fssai}
            />
            <HelperText type="error" visible={!!errors.restaurant_fssai}>
                {errors.restaurant_fssai}
            </HelperText>

            <TextInput
                label="Opening Hours"
                value={formData.opening_hours}
                onChangeText={(text) => setFormData(prev => ({ ...prev, opening_hours: text }))}
                mode="outlined"
                placeholder="e.g., 9:00 AM - 10:00 PM"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                error={!!errors.opening_hours}
            />
            <HelperText type="error" visible={!!errors.opening_hours}>
                {errors.opening_hours}
            </HelperText>

            <TextInput
                label="Street Address"
                value={formData.address.street}
                onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, street: text }
                }))}
                mode="outlined"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                error={!!errors['address.street']}
            />
            <HelperText type="error" visible={!!errors['address.street']}>
                {errors['address.street']}
            </HelperText>

            <TextInput
                label="City"
                value={formData.address.city}
                onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, city: text }
                }))}
                mode="outlined"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                error={!!errors['address.city']}
            />
            <HelperText type="error" visible={!!errors['address.city']}>
                {errors['address.city']}
            </HelperText>


            <TextInput
                label="State"
                value={formData.address.state}
                onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, state: text }
                }))}
                mode="outlined"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                error={!!errors['address.state']}
            />
            <HelperText type="error" visible={!!errors['address.state']}>
                {errors['address.state']}
            </HelperText>

            <TextInput
                label="zip"
                value={formData.address.zip}
                onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, zip: text }
                }))}
                mode="outlined"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                keyboardType='numeric'
                error={!!errors['address.zip']}
            />
            <HelperText type="error" visible={!!errors['address.zip']}>
                {errors['address.zip']}
            </HelperText>


            <Button
                mode="contained"
                onPress={registerRestaurant}
                style={styles.button}
                loading={loading}
            >
                Register Restaurant
            </Button>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <TextInput
                label="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                mode="outlined"
                keyboardType="number-pad"
                placeholderTextColor="#000" // gray placeholder
                style={{
                    backgroundColor: '#fff',
                    marginBottom: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    paddingHorizontal: 10,
                    color: '#6e6e6e', // gray input text
                }}
                theme={{ colors: { text: '#6e6e6e', primary: '#6e6e6e' } }} // gray underline & text
                error={!!errors.bhId}
                maxLength={6}
            />

            <Button
                mode="contained"
                onPress={verifyOtp}
                style={styles.button}
                loading={loading}
            >
                Verify OTP
            </Button>

            <Button
                mode="outlined"
                onPress={resendOtp}
                style={[styles.button, styles.resendButton]}
                disabled={loading}
            >
                Resend OTP
            </Button>
        </View>
    );

    return (
        <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80' }}
            style={styles.backgroundImage}
        >
            <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
                >
                    <ScrollView
                        contentContainerStyle={styles.container}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                        <Card style={styles.formCard}>
                            <Card.Content>
                                <Title style={styles.title}>Restaurant Registration</Title>
                                <Title g style={styles.desc}>
                                    Please complete registration from the exact restaurant location.
                                </Title>                            {step === 1 && renderStep1()}
                                {step === 2 && renderStep2()}
                                {step === 3 && renderStep3()}
                            </Card.Content>
                        </Card>
                    </ScrollView>
                </KeyboardAvoidingView>

                <Snackbar
                    visible={!!error || !!success}
                    onDismiss={() => {
                        setError('');
                        setSuccess('');
                    }}
                    duration={3000}
                    style={[
                        styles.snackbar,
                        error ? styles.errorSnackbar : styles.successSnackbar
                    ]}
                >
                    {error || success}
                </Snackbar>
            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
    },
    gradient: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        padding: 8,
        justifyContent: 'center',
    },
    formCard: {
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        marginVertical: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',

        textAlign: 'center',
        color: '#ea123a',
    },
    desc: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 20,
        lineHeight: 12,

        textAlign: 'center',
        color: '#ea123a',
    },
    stepContainer: {
        marginBottom: 20,
    },
    input: {
        color: '#000',
        marginBottom: 8,
        backgroundColor: 'white',
    },
    button: {
        marginTop: 16,
        paddingVertical: 8,
        backgroundColor: '#ea123a',
    },
    resendButton: {
        color: '#fff',
        marginTop: 8,
        borderColor: '#ea123a',
    },
    infoCard: {
        marginBottom: 20,
        backgroundColor: '#f5f5f5',
    },
    infoTitle: {
        fontSize: 20,
        color: '#ea123a',
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    infoLabel: {
        fontWeight: 'bold',
        width: 80,
        color: '#000',

    },
    infoValue: {
        color: '#000',
        flex: 1,
    },
    dropdownContainer: {
        marginBottom: 16,
        zIndex: 1000,
    },
    dropdown: {
        backgroundColor: 'white',
        borderColor: '#757575',
        borderRadius: 4,
    },
    dropdownList: {
        backgroundColor: 'white',
        borderColor: '#757575',
    },
    snackbar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    errorSnackbar: {
        backgroundColor: '#d32f2f',
    },
    successSnackbar: {
        backgroundColor: '#388e3c',
    },
});