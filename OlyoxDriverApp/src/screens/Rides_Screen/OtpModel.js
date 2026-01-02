import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import useCurrentRideStore from "../../../Store/currentRideStore";

export default function OTPModal({ rideDetails }) {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const inputRefs = useRef([]);
    const { verifyOtp, otpLoading } = useCurrentRideStore();

    const handleOtpChange = (text, index) => {
        // Only allow numbers
        if (!/^\d*$/.test(text)) return;

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (text && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 4 digits are entered
        if (index === 3 && text && newOtp.every(digit => digit !== '')) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyPress = (e, index) => {
        // Move to previous input on backspace
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (otpValue = null) => {
        const otpString = otpValue || otp.join('');
        
        if (otpString.length !== 4) {
            setError('Please enter all 4 digits');
            return;
        }

        try {
            await verifyOtp(otpString, rideDetails.user._id, rideDetails._id);
            // Success - ride will progress to next screen
        } catch (err) {
            setError(err.message || 'Invalid OTP. Please try again.');
            setOtp(['', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Header Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>#️⃣</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                    Ask the passenger for their 4-digit OTP code
                </Text>

                {/* OTP Input Boxes */}
                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={ref => inputRefs.current[index] = ref}
                            style={[
                                styles.otpInput,
                                digit && styles.otpInputFilled,
                                error && styles.otpInputError
                            ]}
                            value={digit}
                            onChangeText={(text) => handleOtpChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            autoFocus={index === 0}
                        />
                    ))}
                </View>

                {/* Error Message */}
                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : null}

                {/* Verify Button */}
                <TouchableOpacity 
                    style={[
                        styles.verifyButton,
                        (otp.join('').length !== 4 || otpLoading) && styles.verifyButtonDisabled
                    ]}
                    onPress={() => handleVerify()}
                    disabled={otp.join('').length !== 4 || otpLoading}
                    activeOpacity={0.8}
                >
                    {otpLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.verifyButtonText}>Start Ride</Text>
                    )}
                </TouchableOpacity>

                {/* Info Text */}
                <Text style={styles.infoText}>
                    The passenger will provide the OTP displayed on their app
                </Text>

                {/* Passenger Info */}
                <View style={styles.passengerCard}>
                    <View style={styles.passengerAvatar}>
                        <Text style={styles.passengerInitial}>
                            {rideDetails?.user?.name?.charAt(0).toUpperCase() || 'P'}
                        </Text>
                    </View>
                    <View style={styles.passengerInfo}>
                        <Text style={styles.passengerName}>
                            {rideDetails?.user?.name || 'Passenger'}
                        </Text>
                        <Text style={styles.passengerPhone}>
                            {rideDetails?.user?.phone || 'Contact number'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f8f8f8',
        borderWidth: 3,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    otpInput: {
        width: 64,
        height: 64,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderRadius: 16,
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        color: '#000',
        backgroundColor: '#f8f8f8',
    },
    otpInputFilled: {
        borderColor: '#000',
        backgroundColor: '#fff',
    },
    otpInputError: {
        borderColor: '#ff3b30',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 13,
        marginBottom: 20,
        textAlign: 'center',
    },
    verifyButton: {
        width: '100%',
        backgroundColor: '#000',
        paddingVertical: 18,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    verifyButtonDisabled: {
        backgroundColor: '#ccc',
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    infoText: {
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    passengerCard: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    passengerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    passengerInitial: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    passengerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    passengerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    passengerPhone: {
        fontSize: 14,
        color: '#666',
    },
});