import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormInput from './FormInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import AddressForm from './AddressForm';
import styles from './RegisterStyle';
import axios from 'axios';
import { API_BASE_URL_V1 } from '../../constant/Api';

export default function RegisterViaBh() {
    const route = useRoute();
    const navigation = useNavigation();
    const { bh_id } = route.params || {};

    // Date state
    const [date, setDate] = useState(new Date());
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

    // Loading and message states
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [errors, setErrors] = useState({});
    
    // Field validation states for real-time validation
    const [fieldsTouched, setFieldsTouched] = useState({});

    // Form data state with proper initialization
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        reEmail: '',
        number: '',
        password: '',
        aadharNumber: '',
        category: '676ef95b5c75082fcbc59c4b',
        address: {
            area: '',
            street_address: '',
            landmark: '',
            pincode: '',
            location: {
                type: 'Point',
                coordinates: [78.2693, 25.369],
            },
        },
        dob: null, // Initialize as null for proper validation
        referral_code_which_applied: bh_id || '',
        is_referral_applied: Boolean(bh_id),
    });

    // Validation regexes
    const validationRules = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\d{10}$/,
        pincode: /^\d{6}$/,
        aadhar: /^[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}$/
    };

    useEffect(() => {
        // Set bh_id when route params change
        if (bh_id) {
            setFormData(prev => ({
                ...prev,
                referral_code_which_applied: bh_id,
                is_referral_applied: true
            }));
        }
    }, [bh_id]);

    // Format Aadhaar number as user types
    const formatAadhar = (text) => {
        // Remove all spaces first
        const cleaned = text.replace(/\s/g, '');
        
        // Add spaces after every 4 characters
        let formatted = '';
        for (let i = 0; i < cleaned.length && i < 12; i++) {
            if (i > 0 && i % 4 === 0) {
                formatted += ' ';
            }
            formatted += cleaned[i];
        }
        
        return formatted;
    };

    // Field validation function
    const validateField = useCallback((field, value) => {
        switch (field) {
            case 'name':
                if (!value.trim()) return 'Name is required';
                if (value.length < 2) return 'Name must be at least 2 characters';
                return '';
            
            case 'email':
                if (!value) return 'Email is required';
                if (!validationRules.email.test(value)) return 'Please enter a valid email';
                return '';
            
            case 'reEmail':
                if (!value) return 'Please confirm your email';
                if (value !== formData.email) return 'Emails do not match';
                return '';
            
            case 'number':
                if (!value) return 'Phone number is required';
                if (!validationRules.phone.test(value)) return 'Please enter a valid 10-digit phone number';
                return '';
            
            case 'password':
                if (!value) return 'Password is required';
                if (value.length < 6) return 'Password must be at least 6 characters';
                return '';
            
            case 'aadharNumber':
                if (value && !validationRules.aadhar.test(value)) return 'Please enter a valid Aadhaar number';
                return '';
            
            case 'dob':
                if (!value) return 'Date of birth is required';
                return '';
            
            case 'address.area':
                if (!value) return 'Area is required';
                return '';
            
            case 'address.street_address':
                if (!value) return 'Street address is required';
                return '';
            
            case 'address.pincode':
                if (!value) return 'Pincode is required';
                if (!validationRules.pincode.test(value)) return 'Please enter a valid 6-digit pincode';
                return '';
            
            default:
                return '';
        }
    }, [formData.email]);

    // Form input change handler with real-time validation
    const handleInputChange = (field, value) => {
        // Mark field as touched
        setFieldsTouched(prev => ({ ...prev, [field]: true }));
        
        // Update form data
        setFormData(prev => ({ ...prev, [field]: value }));

        // Special formatting for Aadhaar
        if (field === 'aadharNumber') {
            const formattedAadhar = formatAadhar(value);
            setFormData(prev => ({ ...prev, [field]: formattedAadhar }));
        }

        // Perform real-time validation
        const fieldError = validateField(field, field === 'aadharNumber' ? formatAadhar(value) : value);
        
        // Update errors state
        setErrors(prev => ({ 
            ...prev, 
            [field]: fieldError 
        }));

        // Clear general error message
        if (errorMessage) {
            setErrorMessage('');
        }
    };

    // Address form change handler with real-time validation
    const handleAddressChange = (field, value) => {
        // Mark field as touched
        setFieldsTouched(prev => ({ ...prev, [`address.${field}`]: true }));
        
        // Update form data
        setFormData(prev => ({
            ...prev,
            address: { ...prev.address, [field]: value },
        }));

        // Perform real-time validation
        const fieldError = validateField(`address.${field}`, value);
        
        // Update errors state
        setErrors(prev => ({ 
            ...prev, 
            [`address.${field}`]: fieldError 
        }));

        // Clear general error message
        if (errorMessage) {
            setErrorMessage('');
        }
    };

    // Date picker handlers
    const showDatePicker = () => {
        setIsDatePickerVisible(true);
        // Mark dob as touched when user tries to select a date
        setFieldsTouched(prev => ({ ...prev, dob: true }));
    };

    const hideDatePicker = () => {
        setIsDatePickerVisible(false);
    };

    const handleDateChange = (event, selectedDate) => {
        if (event.type === "set" && selectedDate) {
            const newDate = selectedDate || date;

            // Calculate age
            const today = new Date();
            const birthDate = new Date(newDate);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDifference = today.getMonth() - birthDate.getMonth();

            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 18) {
                Alert.alert("Age Restriction", "You must be at least 18 years old.");
                setErrors(prev => ({ ...prev, dob: 'You must be at least 18 years old' }));
                hideDatePicker();
                return;
            }

            // Clear error if exists
            if (errors.dob) {
                setErrors(prev => ({ ...prev, dob: '' }));
            }

            // Store the Date object directly
            setFormData(prev => ({
                ...prev,
                dob: newDate,
            }));
        }

        hideDatePicker();
    };

    // Validate entire form
    const validateForm = useCallback(() => {
        const newErrors = {};

        // Validate all fields
        Object.keys(formData).forEach(field => {
            if (field !== 'address' && field !== 'is_referral_applied' && 
                field !== 'referral_code_which_applied' && field !== 'category') {
                const error = validateField(field, formData[field]);
                if (error) newErrors[field] = error;
            }
        });

        // Validate address fields
        ['area', 'street_address', 'pincode'].forEach(field => {
            const error = validateField(`address.${field}`, formData.address[field]);
            if (error) newErrors[`address.${field}`] = error;
        });

        setErrors(prev => ({ ...prev, ...newErrors }));
        return Object.keys(newErrors).length === 0;
    }, [formData, validateField]);

    // Format date for display
    const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Format date for API
    const formatDateForAPI = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Form submission handler
    const handleSubmit = async () => {
        // Clear previous messages
        setErrorMessage('');
        setSuccessMessage('');

        // Mark all fields as touched for validation
        const allFields = [
            'name', 'email', 'reEmail', 'number', 'password', 'dob',
            'address.area', 'address.street_address', 'address.pincode'
        ];
        
        const touchedState = allFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        
        setFieldsTouched(prev => ({ ...prev, ...touchedState }));

        // Validate form
        if (!validateForm()) {
            setErrorMessage('Please fix the errors in the form');
            return;
        }

        setIsLoading(true);

        try {
            // Prepare data for API
            const apiFormData = {
                ...formData,
                dob: formatDateForAPI(formData.dob),
            };

            // API call
            const response = await axios.post(
                `${API_BASE_URL_V1}/register_vendor`,
                apiFormData
            );

            if (response.data?.success) {
                setSuccessMessage('Registration successful! Proceeding to verification...');

                // Short delay to show success message
                setTimeout(() => {
                    navigation.navigate('OtpVerify', {
                        type: response.data.type,
                        email: response.data.email,
                        expireTime: response.data.time,
                        number: response.data.number,
                    });
                }, 1500);
            }
        } catch (error) {
            // Handle error response
            const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
            setErrorMessage(errorMsg);

            if (error.response?.status === 422) {
                // Handle validation errors from server
                const serverErrors = error.response.data.errors;
                if (serverErrors) {
                    const formattedErrors = Object.entries(serverErrors).reduce((acc, [key, value]) => {
                        acc[key] = Array.isArray(value) ? value[0] : value;
                        return acc;
                    }, {});

                    setErrors(prev => ({
                        ...prev,
                        ...formattedErrors
                    }));
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Display error for a field only if it has been touched
    const getFieldError = (field) => {
        return fieldsTouched[field] ? errors[field] : '';
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidView}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollViewContent}
                >
                    <View style={styles.cards}>
                        <Text style={styles.title}>Register Via BH</Text>
                        {bh_id && <Text style={styles.subtitle}>BH ID: {bh_id}</Text>}

                        {/* Error Message */}
                        {errorMessage ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        {/* Success Message */}
                        {successMessage ? (
                            <View style={styles.successBox}>
                                <Text style={styles.successText}>{successMessage}</Text>
                            </View>
                        ) : null}

                        <View style={styles.formContainer}>
                            {/* Personal Information */}
                            <FormInput
                                label="Name"
                                value={formData.name}
                                onChangeText={(text) => handleInputChange('name', text)}
                                onBlur={() => setFieldsTouched(prev => ({ ...prev, name: true }))}
                                placeholder="Enter your name"
                                error={getFieldError('name')}
                                style={[styles.input, getFieldError('name') && styles.inputError]}
                            />

                            <FormInput
                                label="Email"
                                value={formData.email}
                                onChangeText={(text) => handleInputChange('email', text.trim())}
                                onBlur={() => setFieldsTouched(prev => ({ ...prev, email: true }))}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                error={getFieldError('email')}
                                style={[styles.input, getFieldError('email') && styles.inputError]}
                                autoCapitalize="none"
                            />

                            <FormInput
                                label="Re-enter Email"
                                value={formData.reEmail}
                                onChangeText={(text) => handleInputChange('reEmail', text.trim())}
                                onBlur={() => setFieldsTouched(prev => ({ ...prev, reEmail: true }))}
                                placeholder="Re-enter your email"
                                keyboardType="email-address"
                                error={getFieldError('reEmail')}
                                style={[styles.input, getFieldError('reEmail') && styles.inputError]}
                                autoCapitalize="none"
                            />

                            <FormInput
                                label="Phone Number"
                                value={formData.number}
                                onChangeText={(text) => {
                                    // Allow only digits
                                    if (/^\d*$/.test(text)) {
                                        handleInputChange('number', text);
                                    }
                                }}
                                onBlur={() => setFieldsTouched(prev => ({ ...prev, number: true }))}
                                placeholder="Enter your 10-digit phone number"
                                keyboardType="phone-pad"
                                error={getFieldError('number')}
                                style={[styles.input, getFieldError('number') && styles.inputError]}
                                maxLength={10}
                            />

                            <FormInput
                                label="Password"
                                value={formData.password}
                                onChangeText={(text) => handleInputChange('password', text)}
                                onBlur={() => setFieldsTouched(prev => ({ ...prev, password: true }))}
                                placeholder="Enter your password (min 6 characters)"
                                secureTextEntry
                                error={getFieldError('password')}
                                style={[styles.input, getFieldError('password') && styles.inputError]}
                            />

                            <FormInput
                                label="Aadhaar Number "
                                value={formData.aadharNumber}
                                onChangeText={(text) => {
                                    // Allow only digits and spaces
                                    if (/^[\d\s]*$/.test(text)) {
                                        handleInputChange('aadharNumber', text);
                                    }
                                }}
                                onBlur={() => setFieldsTouched(prev => ({ ...prev, aadharNumber: true }))}
                                placeholder="XXXX XXXX XXXX"
                                keyboardType="number-pad"
                                error={getFieldError('aadharNumber')}
                                style={[styles.input, getFieldError('aadharNumber') && styles.inputError]}
                                maxLength={14} // 12 digits + 2 spaces
                            />

                            {/* Date of Birth Picker */}
                            <View style={styles.datePickerContainer}>
                                <Text style={styles.label}>Date of Birth</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.dateButton,
                                        getFieldError('dob') && styles.inputError
                                    ]}
                                    onPress={showDatePicker}
                                >
                                    <Text 
                                        style={[
                                            styles.dateButtonText,
                                            !formData.dob && styles.placeholderText
                                        ]}
                                    >
                                        {formData.dob ? formatDate(formData.dob) : "Select Date of Birth (18+ only)"}
                                    </Text>
                                </TouchableOpacity>
                                {getFieldError('dob') && <Text style={styles.errorText}>{getFieldError('dob')}</Text>}

                                {isDatePickerVisible && (
                                    <DateTimePicker
                                        value={formData.dob || new Date()}
                                        mode="date"
                                        onChange={handleDateChange}
                                        display="default"
                                        maximumDate={new Date()}
                                    />
                                )}
                            </View>

                            {/* Address Form */}
                            <AddressForm
                                address={formData.address}
                                onAddressChange={handleAddressChange}
                                errors={{
                                    'area': getFieldError('address.area'),
                                    'street_address': getFieldError('address.street_address'),
                                    'pincode': getFieldError('address.pincode')
                                }}
                                onBlur={(field) => setFieldsTouched(prev => ({ 
                                    ...prev, 
                                    [`address.${field}`]: true 
                                }))}
                            />

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    isLoading && styles.buttonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.buttonText}>Register</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}