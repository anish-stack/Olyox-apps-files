import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';


export default function RegisterWithBh() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bh_id } = route.params || {};

  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isBhVerify, setIsBhVerify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [bhVerifyLoading, setBhVerifyLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    number: '',
    category: "685a5f65249c78f608eb8dd8",
    address: {
      street_address: "",
      location: {
        type: "Point",
        coordinates: [78.2693, 25.369],
      },
    },
    aadharNumber: '',
    member_id: '',
    referral_code_which_applied: bh_id,
    is_referral_applied: true,
  });

  useEffect(() => {
    initializeComponent();
  }, [bh_id]);

  const initializeComponent = async () => {
    setLoading(true);
    await checkBhId();
    setLoading(false);
  };

  // Aadhaar regex for format XXXX XXXX XXXX
  const aadharRegex = /^[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}$/;

  // Format Aadhaar number as user types
  const formatAadhar = (text) => {
    const cleaned = text.replace(/\s/g, '');
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 12; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += cleaned[i];
    }
    return formatted;
  };

  // Clean and format phone number
  const formatPhoneNumber = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length >= 12) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('91') && cleaned.length === 11) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    cleaned = cleaned.substring(0, 10);
    return cleaned;
  };

  // Enhanced validation
  const validateField = (field, value) => {
    let error = null;
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
          error = 'Name can only contain letters and spaces';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'number':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else if (!/^\d{10}$/.test(value)) {
          error = 'Phone number must be exactly 10 digits';
        } else if (!/^[6-9]/.test(value)) {
          error = 'Phone number must start with 6, 7, 8, or 9';
        }
        break;
      case 'aadharNumber':
        if (!value.trim()) {
          error = 'Aadhaar number is required';
        } else if (!aadharRegex.test(value)) {
          error = 'Enter valid Aadhaar number (XXXX XXXX XXXX)';
        }
        break;
      case 'address':
        if (!value.trim()) {
          error = 'Address is required';
        } else if (value.trim().length < 10) {
          error = 'Please enter a complete address';
        }
        break;
      case 'dob':
        if (!value) {
          error = 'Date of birth is required';
        }
        break;
    }
    return error;
  };

  // Handle input changes with real-time validation
  const handleInputChange = (field, value) => {
    let newValue = value;
    if (field === 'aadharNumber') {
      if (/[^0-9\s]/.test(value)) {
        return;
      }
      newValue = formatAadhar(value);
    }
    if (field === 'number') {
      newValue = formatPhoneNumber(value);
    }
    if (field === "street_address") {
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          street_address: newValue,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: newValue,
      }));
    }
    if (submitError) setSubmitError('');
    const fieldError = validateField(field, newValue);
    setErrors((prev) => ({
      ...prev,
      [field]: fieldError,
    }));
  };

  const showDatePicker = () => {
    setIsDatePickerVisible(true);
  };

  const hideDatePicker = () => {
    setIsDatePickerVisible(false);
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'set') {
      const newDate = selectedDate || date;
      const today = new Date();
      const birthDate = new Date(newDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        Alert.alert('Age Restriction', 'You must be at least 18 years old to register.', [{ text: 'OK' }]);
        setErrors((prev) => ({
          ...prev,
          dob: 'Must be at least 18 years old',
        }));
        hideDatePicker();
        return;
      }
      setFormData((prev) => ({
        ...prev,
        dob: newDate,
      }));
      setErrors((prev) => ({
        ...prev,
        dob: null,
      }));
      hideDatePicker();
    } else {
      hideDatePicker();
    }
  };

  const checkBhId = async () => {
    if (!bh_id) {
      setIsBhVerify(true);
      return;
    }
    setBhVerifyLoading(true);
    try {
      const response = await fetch('https://www.api.olyox.com/api/v1/check-bh-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bh: bh_id,
        }),
      });
      const data = await response.json();
      setIsBhVerify(data.success);
    } catch (err) {
      console.error('BH verification error:', err);
      setIsBhVerify(false);
    } finally {
      setBhVerifyLoading(false);
    }
  };

  const validateForm = useCallback(() => {
    const fields = ['name', 'email', 'number', 'aadharNumber', 'dob'];
    const newErrors = {};
    fields.forEach((f) => {
      const val = f === 'address' ? formData.address.street_address : formData[f];
      const err = validateField(f, val);
      if (err) {
        newErrors[f] = err;
      }
    });
    if (!formData.address.street_address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, termsAccepted]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('https://webapi.olyox.com/api/v1/register_vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data?.success) {
        Alert.alert('Success', 'OTP sent as a Text Message Please check', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('OtpVerify', {
              type: data.type,
              email: data.email,
              expireTime: data.time,
              number: data.number,
            }),
          },
        ]);
      } else {
        throw new Error(data?.message || 'Registration failed');
      }
    } catch (e) {
      setSubmitError(e.message);
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, navigation, validateForm]);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Memoized Custom Input
  const CustomInput = useMemo(
    () =>
      ({ label, required, value, onChangeText, error, placeholder, icon, rightIcon, onRightIconPress, multiline = false, ...props }) => (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
          </Text>
          <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
            {icon && (
              <Ionicons name={icon} size={20} color={error ? '#FF4D4F' : '#666'} style={styles.inputIcon} />
            )}
            <TextInput
              style={[styles.textInput, multiline && styles.textInputMultiline, icon && styles.textInputWithIcon]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor="#A0A0A0"
              multiline={multiline}
              {...props}
            />
            {rightIcon && (
              <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
                {rightIcon}
              </TouchableOpacity>
            )}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      ),
    []
  );

  // Memoized Loading Modal
  const LoadingModal = useMemo(
    () =>
      ({ visible, message }) => (
        <Modal transparent animationType="fade" visible={visible}>
          <View style={styles.modalOverlay}>
            <View style={styles.loadingModalContent}>
              <ActivityIndicator size="large" color="#000000" />
              <Text style={styles.loadingText}>{message}</Text>
            </View>
          </View>
        </Modal>
      ),
    []
  );

  // Show initial loading
  if (loading || bhVerifyLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>{bhVerifyLoading ? 'Verifying BH ID...' : 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Vendor Registration</Text>
          <Text style={styles.headerSubtitle}>Join Our Cab Service Network</Text>
        </View>
      </View>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraHeight={100}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {submitError && (
            <View style={styles.submitErrorContainer}>
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          )}
          <CustomInput
            label="Full Name"
            required
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            error={errors.name}
            placeholder="Enter your full name"
            icon="person-outline"
            autoComplete="name"
            textContentType="name"
            autoCorrect={true}
          />
          <CustomInput
            label="Aadhaar Number"
            required
            value={formData.aadharNumber}
            onChangeText={(text) => handleInputChange('aadharNumber', text)}
            error={errors.aadharNumber}
            placeholder="XXXX XXXX XXXX"
            icon="card-outline"
            keyboardType="numeric"
            maxLength={14}
            autoComplete="off"
            textContentType="none"
            autoCorrect={false}
            importantForAutofill="no"
            selectTextOnFocus={false}
          />
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Date of Birth <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.dob && styles.dateButtonError]}
              onPress={showDatePicker}
            >
              <View style={styles.dateButtonContent}>
                <Ionicons name="calendar-outline" size={20} color={errors.dob ? '#FF4D4F' : '#666'} />
                <Text style={[styles.dateButtonText, !formData.dob && styles.placeholderText]}>
                  {formData.dob ? formatDate(formData.dob) : 'Select Date of Birth'}
                </Text>
              </View>
            </TouchableOpacity>
            {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
            {isDatePickerVisible && (
              <DateTimePicker
                value={date}
                mode="date"
                onChange={handleDateChange}
                display="default"
                maximumDate={new Date()}
              />
            )}
          </View>
          <CustomInput
            label="Email Address"
            required
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            error={errors.email}
            placeholder="Enter your email address"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
          />
          <CustomInput
            label="Phone Number"
            required
            value={formData.number}
            onChangeText={(text) => handleInputChange('number', text)}
            error={errors.number}
            placeholder="Enter 10-digit phone number"
            icon="call-outline"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            autoCorrect={false}
          />
          <CustomInput
            label="Complete Address"
            required
            value={formData.address.street_address}
            onChangeText={(text) => handleInputChange("street_address", text)}
            error={errors.address}
            placeholder="Enter your complete address"
            icon="location-outline"
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            autoComplete="street-address"
            textContentType="fullStreetAddress"
          />
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                if (errors.terms) {
                  setErrors((prev) => ({ ...prev, terms: null }));
                }
              }}
            >
              <View style={[styles.checkboxInner, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>I accept the Terms and Conditions <Text style={styles.requiredAsterisk}>*</Text></Text>
          </View>
          {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
          <TouchableOpacity
            style={[styles.submitButton, (submitting || !termsAccepted) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !termsAccepted}
          >
            <Text style={styles.buttonText}>{submitting ? 'Registering...' : 'Register Now'}</Text>
            {submitting && <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonLoader} />}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <LoadingModal visible={submitting} message="Creating your account..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header Styles
  header: {
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#B0B0B0',
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  // Form Container
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  // Submit Error
  submitErrorContainer: {
    backgroundColor: '#FFF1F1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF4D4F',
  },
  submitErrorText: {
    color: '#FF4D4F',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Custom Input Styles
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#FF4D4F',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputWrapperError: {
    borderColor: '#FF4D4F',
    backgroundColor: '#FFF1F1',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 12,
  },
  textInputWithIcon: {
    marginLeft: 0,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  rightIcon: {
    padding: 8,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
  // Date Picker Styles
  dateButton: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  dateButtonError: {
    borderColor: '#FF4D4F',
    backgroundColor: '#FFF1F1',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 8,
  },
  placeholderText: {
    color: '#A0A0A0',
  },
  // Button Styles
  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLoader: {
    marginLeft: 8,
  },
  // Terms & Conditions Styles
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxInner: {
    height: 14,
    width: 14,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
});