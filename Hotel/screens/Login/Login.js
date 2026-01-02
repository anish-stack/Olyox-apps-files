import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { API_BASE_URL_V2 } from "../../constant/Api";
import { useToken } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient"; // Install if not already: expo install expo-linear-gradient
import { useAppPermissions } from "../../context/AppPermissionContext";

const { height } = Dimensions.get("window");

export default function Login({ navigation }) {
  const { location, fcmToken, appVersion, androidId } = useAppPermissions();
  const [bh, setBh] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSend, setOtpSend] = useState(false);
  const [otpTimer, setOtpTimer] = useState(90);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const { updateToken } = useToken();

  useEffect(() => {
    if (!otpSend || otpTimer <= 0) return;
    const timer = setTimeout(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpTimer, otpSend]);

  const handleSendOtp = async () => {
    setError("");
    if (!/^BH\d{6}$/.test(bh)) {
      return setError("Invalid BH ID format (e.g., BH123456)");
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL_V2}/Login-Hotel`, {
        BH: bh,
        type: "text",
        fcmToken,
        appVersion,
        androidId,
        location: location
          ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
            }
          : null,
      });

      if (res.data.success) {
        setOtpSend(true);
        setOtpTimer(90);
      }
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 403) {
        return navigation.navigate("HotelListing", { bh: data?.BhID });
      }

      if (status === 402) {
        return navigation.navigate("BhVerification");
      }

      setError(data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpInput || otpInput.length < 4) return setError("Enter valid OTP");
    setVerifying(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE_URL_V2}/verify-otp`, {
        hotel_phone: bh,
        otp: otpInput,
        type: "login",
      });

      await updateToken(res.data.token);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{
          uri: "https://media.istockphoto.com/id/1369030854/photo/3d-render-of-luxury-hotel-lobby-and-reception.jpg?s=612x612&w=0&k=20&c=obw_JfMCUfb26jO0JkYSiXOkc8Tli9vPsGmw3fLgjIc=",
        }}
        style={styles.background}
        blurRadius={Platform.OS === "ios" ? 8 : 6}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.8)"]}
          style={StyleSheet.absoluteFill}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Logo */}
              <Image
                source={require("../../assets/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login to your hotel dashboard</Text>

              {/* Form Card */}
              <View style={styles.formCard}>
                {/* BH Input */}
                <Text style={styles.label}>BH ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., BH123456"
                  placeholderTextColor="#aaa"
                  value={bh}
                  onChangeText={(text) => setBh(text.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />

                {/* OTP Section */}
                {otpSend && (
                  <>
                    <Text style={styles.label}>Enter OTP</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit OTP"
                      placeholderTextColor="#aaa"
                      keyboardType="number-pad"
                      value={otpInput}
                      onChangeText={setOtpInput}
                      maxLength={6}
                    />

                    <TouchableOpacity
                      style={[
                        styles.resendButton,
                        otpTimer > 0 && styles.disabledResend,
                      ]}
                      onPress={handleSendOtp}
                      disabled={otpTimer > 0}
                    >
                      <Text style={styles.resendText}>
                        {otpTimer > 0
                          ? `Resend OTP in ${otpTimer}s`
                          : "Resend OTP"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Main Action Button */}
                <TouchableOpacity
                  style={styles.mainButton}
                  onPress={otpSend ? verifyOtp : handleSendOtp}
                  disabled={loading || verifying}
                >
                  {loading || verifying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.mainButtonText}>
                      {otpSend ? "Verify OTP & Login" : "Send OTP"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Error Message */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Footer Note */}
                <Text style={styles.footerNote}>
                  This portal is for registered hotel partners only.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
  },
  logo: {
    width: 180,
    height: 180,
    tintColor: "#fff",
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#ddd",
    textAlign: "center",
    marginBottom: 40,
  },
  formCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 28,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 56,
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 17,
    color: "#333",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20,
  },
  mainButton: {
    height: 56,
    backgroundColor: "#E30613", // OYO's signature red
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 8,
    shadowColor: "#E30613",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  resendButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabledResend: {
    opacity: 0.6,
  },
  resendText: {
    color: "#E30613",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#E30613",
    textAlign: "center",
    marginTop: 16,
    fontSize: 15,
    fontWeight: "500",
  },
  footerNote: {
    textAlign: "center",
    color: "#666",
    fontSize: 13,
    marginTop: 24,
    lineHeight: 20,
  },
});
