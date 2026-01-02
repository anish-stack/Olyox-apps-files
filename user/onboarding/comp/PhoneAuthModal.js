import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useGuest } from "../../context/GuestLoginContext";

const { width, height } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";

const PhoneAuthModal = ({
  visible,
  phoneNumber,
  onChangePhone,
  onChangeReferral,
  referralCaode,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const navigation = useNavigation();
  const { handleGuestLogin } = useGuest();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      if (isIOS) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Animate modal in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const loggedAsAGuest = () => {
    handleGuestLogin();
    handleClose();
    navigation.navigate("Home");
  };

  const handlePhoneChange = (text) => {
    // Remove any non-numeric characters
    const numericText = text.replace(/\D/g, "");
    onChangePhone(numericText);
  };

  const handleReferralCode = (text) => {
    onChangeReferral(text);
  };

  const handleSubmit = () => {
    if (phoneNumber && phoneNumber.length === 10 && !isSubmitting) {
      Keyboard.dismiss();
      onSubmit();
    }
  };

  const navigateToPolicy = () => {
    handleClose();
    navigation.navigate("policyauth");
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="rgba(0, 0, 0, 0.5)"
      />

      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={isIOS ? "padding" : "height"}
          keyboardVerticalOffset={isIOS ? 0 : 20} // Adjust if needed
          style={styles.keyboardAvoidingContainer}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerIndicator} />
              <View style={styles.headerContent}>
                <Text style={styles.modalTitle}>Verify Phone Number</Text>
                <View style={styles.headerSpacer} />
              </View>
            </View>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              {/* Description */}
              <View style={styles.descriptionContainer}>
                <Ionicons
                  name="shield-checkmark"
                  size={40}
                  color="#000"
                  style={styles.securityIcon}
                />
                <Text style={styles.modalDescription}>
                  We'll send you a verification code via SMS to confirm your
                  number
                </Text>
              </View>

              {/* Phone Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCode}>
                    <Ionicons name="flag" size={16} color="#666" />
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    maxLength={10}
                    editable={!isSubmitting}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCode}>
                    <Ionicons name="person-add-sharp" size={16} color="#666" />
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter Referral Code "
                    placeholderTextColor="#999"
                    keyboardType="default"
                    value={referralCaode}
                    onChangeText={handleReferralCode}
                    maxLength={10}
                    editable={!isSubmitting}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </View>

              {/* Terms and Privacy */}
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={navigateToPolicy}
                activeOpacity={0.7}
              >
                <Text style={styles.termsText}>
                  By continuing, you agree to our{" "}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!phoneNumber || phoneNumber.length < 10 || isSubmitting) &&
                    styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={
                  !phoneNumber || phoneNumber.length < 10 || isSubmitting
                }
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    !phoneNumber || phoneNumber.length < 10 || isSubmitting
                      ? ["#000", "#000"]
                      : ["#0f0606", "#0f0606"]
                  }
                  style={styles.submitGradient}
                >
                  {isSubmitting ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.loadingText}>Sending OTP...</Text>
                    </View>
                  ) : (
                    <View style={styles.submitContent}>
                      <Text style={styles.submitButtonText}>
                        Send Verification Code
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Guest Mode - iOS Only */}
              {isIOS && (
                <TouchableOpacity
                  onPress={loggedAsAGuest}
                  style={styles.guestButton}
                  activeOpacity={0.7}
                >
                  <View style={styles.guestContainer}>
                    <Ionicons name="person-outline" size={12} color="#000" />
                    <Text style={styles.guestText}>Continue as Guest</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  backdrop: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    ...Platform.select({
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
    }),
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: "center",
  },
  headerIndicator: {
    width: 36,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 32,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: isIOS ? 40 : 24,
  },
  descriptionContainer: {
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  securityIcon: {
    marginBottom: 12,
  },
  keyboardAvoidingContainer: {
    width: "100%",
  },
  modalDescription: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginLeft: 4,
  },
  phoneInputContainer: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  countryCode: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#E8E8E8",
    minWidth: 80,
  },
  countryCodeText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    marginLeft: 6,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FFFFFF",
  },
  termsContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  termsLink: {
    color: "#000",
    fontWeight: "600",
  },
  submitButton: {
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: isIOS ? 20 : 16,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  disabledButton: {
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowOpacity: 0,
      },
    }),
  },
  submitGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  guestButton: {
    // backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 5,
    alignItems: "center",
    borderColor: "#000",
  },
  guestContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  guestText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
    marginLeft: 8,
  },
  guestSubtext: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
});
export default PhoneAuthModal;
