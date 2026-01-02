import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  NativeModules,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import loginStore from '../../../Store/authStore';
import { getFCMToken } from '../../../utility/NotificationService';
const { FloatingWidget } = NativeModules;
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationServices from '../../../services/LocationServices';
import * as Application from "expo-application"

export default function Login() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const { login, otp_sent, resetOtpState, otp_type, authenticated, loading, error, verifyOtp } = loginStore();
  const [phone, setPhone] = useState('');
  const [fcmToken, setFcmToken] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  // OTP States
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef([]);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getFCMToken();
        FloatingWidget?.stopWidget();
        await LocationServices.start?.();
        setFcmToken(token);
        const version = Application.nativeApplicationVersion || '1.0.2';
        setAppVersion(version);
      } catch (err) {
        console.error('Error getting FCM token or app version:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (authenticated) navigation.replace('Home');
  }, [authenticated]);

  useEffect(() => {
    if (otp_sent) {
      setShowOtpSection(true);
      startResendTimer();
      // Scroll to OTP section and focus first input
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        otpRefs.current[0]?.focus();
      }, 300);
    }
  }, [otp_sent]);

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

  // Reset OTP state when phone number changes
  useEffect(() => {
    if (showOtpSection) {
      resetOtpState();
      setShowOtpSection(false);
      setOtp(['', '', '', '', '', '']);
      setResendTimer(60);
      setCanResend(false);
    }
  }, [phone]);

  // Resend Timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0 && showOtpSection) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer, showOtpSection]);

  const startResendTimer = () => {
    setResendTimer(60);
    setCanResend(false);
  };

  const handleLogin = () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    Keyboard.dismiss();
 resetOtpState()

    login(fcmToken, phone, 'text', appVersion, navigation);
  };

  useEffect(() => {
    let isMounted = true;
    const isValidPhone = phone && /^\d{10}$/.test(phone);

    if (
      isMounted &&
      error === "You are registered with us on website but on vendor complete profile first!!" &&
      isValidPhone
    ) {
      navigation.navigate('register', { phone: phone });
    }

    return () => {
      isMounted = false;
    };
  }, [error, navigation, phone]);
  const handleOtpChange = (value, index) => {
    // Remove any non-digit characters
    value = value.replace(/\D/g, "");

    // If user pasted the full OTP (e.g. "123456")
    if (value.length === 6) {
      const otpArray = value.split("").slice(0, 6);
      setOtp(otpArray);

      // Auto verify if complete OTP
      handleVerifyOtp(value);
      otpRefs.current[5]?.blur();
      return;
    }

    // If single-digit input
    const newOtp = [...otp];
    newOtp[index] = value[value.length - 1] || "";
    setOtp(newOtp);

    // Move focus to next box automatically
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // If last digit entered, trigger verification
    const fullOtp = newOtp.join("");
    if (fullOtp.length === 6) {
      handleVerifyOtp(fullOtp);
    }
  };


  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (otpCode) => {
    const fullOtp = otpCode || otp.join('');
    if (fullOtp.length !== 6) {
      Alert.alert('Error', 'Please enter complete 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    try {
      await verifyOtp(otp_type, phone, fullOtp, navigation);
      setShowOtpSection(false);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    otpRefs.current[0]?.focus();
    login(fcmToken, phone, 'text', appVersion, navigation);
    startResendTimer();
  };

  const handleBackPress = () => {
    if (showOtpSection) {
      setShowOtpSection(false);
      setOtp(['', '', '', '', '', '']);
      resetOtpState();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'auth' }],
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.text + '10' }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.secondary || theme.text + '10' }]}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          {!showOtpSection && (
            <View style={styles.logoSection}>
              <View style={[styles.logoContainer, { backgroundColor: theme.primary + '20' }]}>
                <Icon name="lock-closed" size={50} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: theme.text + '99' }]}>
                Sign in to continue
              </Text>
            </View>

          )}

          {/* Phone Input Section */}
          {!showOtpSection && (
            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      borderColor: isPhoneFocused ? theme.primary : theme.text + '30',
                      backgroundColor: theme.secondary || theme.background,
                    },
                  ]}
                >
                  <Icon
                    name="call-outline"
                    size={22}
                    color={isPhoneFocused ? theme.primary : theme.text + '66'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter 10-digit phone number"
                    placeholderTextColor={theme.gray || '#888'}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                    maxLength={10}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  { backgroundColor: theme.primary },
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Send OTP</Text>
                    <Icon name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OTP Section */}
          {showOtpSection && (
            <View style={styles.otpContainer}>
              <View style={styles.otpHeader}>
                <View style={[styles.otpIconSmall, { backgroundColor: theme.primary + '20' }]}>
                  <Icon name="mail-outline" size={32} color={theme.primary} />
                </View>
                <Text style={[styles.otpTitle, { color: theme.text }]}>Enter Verification Code</Text>
                <Text style={[styles.otpSubtitle, { color: theme.text + '99' }]}>
                  Code sent to <Text style={{ color: theme.primary, fontWeight: '600' }}>{phone}</Text>
                </Text>
              </View>

              <View style={styles.otpInputContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      {
                        borderColor: digit ? theme.primary : theme.text + '30',
                        backgroundColor: theme.secondary || theme.background,
                        color: theme.text,
                      },
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    onPaste={(event) => {
                      const pasted = event.nativeEvent.text || "";
                      handleOtpChange(pasted, index);
                    }}
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  { backgroundColor: theme.primary },
                  otpLoading && styles.loginButtonDisabled,
                ]}
                onPress={() => handleVerifyOtp()}
                disabled={otpLoading}
                activeOpacity={0.8}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                    <Text style={[styles.resendText, { color: theme.primary }]}>
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.timerText, { color: theme.text + '66' }]}>
                    Resend code in {resendTimer}s
                  </Text>
                )}
              </View>
            </View>
          )}

          {!showOtpSection && (
            <View style={styles.footer}>
              <Icon name="shield-checkmark-outline" size={18} color={theme.text + '66'} />
              <Text style={[styles.footerText, { color: theme.text + '66' }]}>
                Your data is secure with us
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  otpMethodWrapper: {
    marginBottom: 28,
  },
  otpToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  otpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  otpButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
  },
  // OTP Section Styles
  otpContainer: {
    width: '100%',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  otpIconSmall: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  verifyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  resendContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
  },
});