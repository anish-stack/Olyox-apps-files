import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const BhOtpVerification = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { type, email, number } = route.params;

    const [formData, setFormData] = useState({
        otp: ['', '', '', '', '', ''],
        type: "email",
        email: email,
    });
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(120);
    const [error, setError] = useState('');
    const otpRefs = useRef([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (timer > 0) setTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const handleOtpChange = (value, index) => {
        if (value.length > 1) {
            value = value[value.length - 1];
        }
        if (!/^\d?$/.test(value)) {
            return;
        }

        const newOtp = [...formData.otp];
        newOtp[index] = value;
        setFormData({ ...formData, otp: newOtp });
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all digits are filled
        if (index === 5 && value) {
            const fullOtp = newOtp.join('');
            if (fullOtp.length === 6) {
                handleSubmit(fullOtp);
            }
        }
    };

    const handleOtpKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !formData.otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (otpCode) => {
        const fullOtp = otpCode || formData.otp.join('');
        if (fullOtp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            Alert.alert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(
                "https://www.api.olyox.com/api/v1/verify_email",
                { ...formData, otp: fullOtp }
            );
            Alert.alert(
                "Success",
                response.data.message || "OTP verified successfully!",
                [
                    {
                        text: "OK",
                        onPress: () =>
                            navigation.reset({
                                index: 0,
                                routes: [{ name: "register", params: { bh: response.data.BHID } }],
                            }),
                    },
                ]
            );
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to verify OTP.";
            setError(errorMessage);
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (timer > 0) {
            Alert.alert("Please wait", `Resend OTP in ${timer} seconds.`);
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(
                "https://webapi.olyox.com/api/v1/resend_Otp",
                { email, type: 'email' }
            );
            Alert.alert("Success", response.data.message || "OTP sent successfully!");
            setTimer(120);
            setFormData({ ...formData, otp: ['', '', '', '', '', ''] });
            setError('');
            otpRefs.current[0]?.focus();
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to resend OTP.";
            setError(errorMessage);
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>Enter OTP</Text>
                    <Text style={styles.subtitle}>
                        We've sent a 6-digit OTP to WhatsApp and SMS at{' '}
                        <Text style={styles.bold}>{number}</Text>
                    </Text>
                </View>

                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.otpContainer}>
                    {formData.otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => (otpRefs.current[index] = ref)}
                            style={[
                                styles.otpInput,
                                digit ? styles.otpInputFilled : null,
                                error && styles.otpInputError,
                            ]}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={(e) => handleOtpKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            autoFocus={index === 0}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={() => handleSubmit()}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Verify OTP</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={timer > 0 || loading}
                >
                    <Text style={[styles.resendText, timer > 0 && styles.resendTextDisabled]}>
                        {timer > 0 ? `Resend OTP in ${timer}s` : "Didn't receive the OTP? Resend"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 12,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '400',
        color: '#666666',
        textAlign: 'center',
    },
    bold: {
        fontWeight: '600',
        color: '#000000',
    },
    errorContainer: {
        backgroundColor: '#FFF1F1',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FF4D4F',
    },
    errorText: {
        color: '#FF4D4F',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 8,
    },
    otpInput: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#D0D0D0',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: '#333333',
        backgroundColor: '#F8F8F8',
    },
    otpInputFilled: {
        borderColor: '#000000',
    },
    otpInputError: {
        borderColor: '#FF4D4F',
        backgroundColor: '#FFF1F1',
    },
    button: {
        backgroundColor: '#000000',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    resendText: {
        textAlign: 'center',
        color: '#000000',
        fontSize: 14,
        fontWeight: '500',
    },
    resendTextDisabled: {
        color: '#A0A0A0',
    },
});

export default BhOtpVerification;