import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL_V2 } from '../../constant/Api';
import { colors } from '../../constant/Colors';
import { useToken } from '../../context/AuthContext';

export default function OtpVerify() {
  const route = useRoute();
  const navigation = useNavigation();
  const { hotelPhone } = route.params || {};
  const { updateToken } = useToken();
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let countdown;
    if (timer > 0) {
      countdown = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(countdown);
  }, [timer]);

  const verifyOtp = async () => {
    if (!otp) return setError("Please enter OTP");

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL_V2}/verify-otp`, {
        hotel_phone: hotelPhone,
        otp
      });
      const { token } = response.data
      await updateToken(token)
      // alert(response.data.message);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (timer > 0) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL_V2}/resend-otp`, {
        hotel_phone: hotelPhone,
      });

      alert(response.data.message);
      setTimer(120); // Reset Timer
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {hotelPhone}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={verifyOtp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={resendOtp} disabled={timer > 0}>
        <Text style={styles.resendText}>
          {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryRed,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: colors.primaryBlack,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
  button: {
    backgroundColor: colors.darkRed,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 15,
  },
  resendText: {
    fontSize: 16,
    color: colors.mediumGreen,
    fontWeight: 'bold',
  },
});

