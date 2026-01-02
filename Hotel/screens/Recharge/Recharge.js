import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useToken } from '../../context/AuthContext';
import useSettings from '../../hooks/Settings';
import { SafeAreaView } from 'react-native-safe-area-context';
import useHotelApi from '../../context/HotelDetails';
import { MaterialCommunityIcons, Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import useGetCoupons from '../../hooks/GetUnlockCopons';
import { LinearGradient } from 'expo-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import { BASE_URL } from '../../constant/Api';

const { width } = Dimensions.get('window');
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Payment Status Modal Component with animations
const PaymentStatusModal = ({ visible, status, message, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: "check-circle",
          color: "#10B981",
          title: "Payment Successful!",
          gradient: ["#10B981", "#059669"],
        //   animation: require('../../assets/animations/success.json'),
        };
      case "failed":
        return {
          icon: "close-circle",
          color: "#EF4444",
          title: "Payment Failed",
          gradient: ["#EF4444", "#DC2626"],
        //   animation: require('../../assets/animations/error.json'),
        };
      case "cancelled":
        return {
          icon: "cancel",
          color: "#F59E0B",
          title: "Payment Cancelled",
          gradient: ["#F59E0B", "#D97706"],
        //   animation: require('../../assets/animations/warning.json'),
        };
      default:
        return {
          icon: "information",
          color: "#3B82F6",
          title: "Payment Status",
          gradient: ["#3B82F6", "#2563EB"],
        //   animation: require('../../assets/animations/info.json'),
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={config.gradient}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* <LottieView
              source={config.animation}
              autoPlay
              loop={false}
              style={{ width: 100, height: 100 }}
            /> */}
            <Text style={styles.modalTitle}>{config.title}</Text>
          </LinearGradient>

          <View style={styles.modalBody}>
            <Text style={styles.modalMessage}>{message}</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: config.color }]} onPress={onClose}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Coupon Modal Component with available coupons list
const CouponModal = ({ visible, onClose, couponCode, setCouponCode, validateCoupon, error, loading, availableCoupons }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.couponModalContent}>
          <View style={styles.couponModalHeader}>
            <Text style={styles.couponModalTitle}>Apply Coupon</Text>
            <TouchableOpacity onPress={onClose}>
              <AntDesign name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.couponInputContainer}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter coupon code"
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.applyCouponButton} onPress={validateCoupon} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.applyCouponButtonText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.couponErrorText}>{error}</Text> : null}

          {availableCoupons && availableCoupons.length > 0 && (
            <View style={styles.availableCouponsContainer}>
              <Text style={styles.availableCouponsTitle}>Available Coupons</Text>
              <ScrollView style={styles.couponsList} showsVerticalScrollIndicator={false}>
                {availableCoupons.map((coupon) => (
                  <TouchableOpacity
                    key={coupon.code}
                    style={styles.couponItem}
                    onPress={() => setCouponCode(coupon.code)}
                  >
                    <View style={styles.couponItemLeft}>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{coupon.discount}%</Text>
                      </View>
                      <View>
                        <Text style={styles.couponItemCode}>{coupon.code}</Text>
                        <Text style={styles.couponItemDesc}>{coupon.description || 'Discount on your purchase'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.couponApplyBtn}
                      onPress={() => {
                        setCouponCode(coupon.code);
                        validateCoupon();
                      }}
                    >
                      <Text style={styles.couponApplyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Membership Plan Card Component with enhanced UI
const MembershipCard = ({ plan, selected, onSelect, showEarnings = false }) => {
  const validityText =
    plan.validityDays === 1 ? `${plan.validityDays} ${plan.whatIsThis}` : `${plan.validityDays} ${plan.whatIsThis}s`;

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: selected ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [selected]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#F0FDF4'],
  });

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#10B981'],
  });

  return (
    <Animated.View
      style={[
        styles.planCard,
        {
          backgroundColor,
          borderColor,
          borderWidth: 2,
          transform: [{ scale: selected ? 1.02 : 1 }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onSelect(plan._id)}
        activeOpacity={0.7}
        style={styles.planCardTouchable}
      >
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <View style={[styles.checkCircle, selected && styles.selectedCheckCircle]}>
            {selected && <AntDesign name="check" size={16} color="#FFFFFF" />}
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.planPrice}>₹{plan.price}</Text>
          <Text style={styles.gstText}>+18% GST</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.planDetailsContainer}>
          <View style={styles.planDetailItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#6B7280" />
            <Text style={styles.planDetailText}>Valid for {validityText}</Text>
          </View>

          {showEarnings && plan.HowManyMoneyEarnThisPlan && (
            <View style={styles.planDetailItem}>
              <FontAwesome5 name="coins" size={16} color="#10B981" />
              <Text style={styles.planDetailText}>Earn up to ₹{plan.HowManyMoneyEarnThisPlan}</Text>
            </View>
          )}

          {plan.includes && plan.includes.length > 0 && (
            <View style={styles.planDetailItem}>
              <AntDesign name="checkcircleo" size={16} color="#10B981" />
              <Text style={styles.planDetailText}>Includes: {plan.includes.join(", ")}</Text>
            </View>
          )}
        </View>

        {showEarnings && plan.HowManyMoneyEarnThisPlan && (
          <View style={styles.earningNoteContainer}>
            <Text style={styles.earningNoteText}>
              *After earning ₹{plan.HowManyMoneyEarnThisPlan}, this recharge will expire
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function Recharge() {
  const navigation = useNavigation();
  const { settings } = useSettings();
  const { findDetails ,data } = useHotelApi();
  const { token } = useToken();

  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [timer, setTimer] = useState(30 * 60); // 30 minutes in seconds
  
  // Payment modal state
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    status: "",
    message: "",
  });
  
  // Coupon states
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const { coupons, loading: couponsLoading, refresh: refreshCoupons } = useGetCoupons();

  // Show payment status modal
  const showPaymentModal = (status, message) => {
    setModalConfig({
      visible: true,
      status,
      message,
    });
  };

  // Close payment status modal
  const closePaymentModal = () => {
    setModalConfig({
      ...modalConfig,
      visible: false,
    });
  };

  // Get selected plan
  const selectedPlan = memberships.find((plan) => plan._id === selectedMemberId);

  // Fetch User Data with Retry Mechanism
  const fetchHotelData = useCallback(async (attempt = 1) => {
    setLoading(true);
    try {
      const response = await findDetails();
      if (response.success) {
        setUserData(response.data.data);
        setLoading(false);
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => {
          console.log(`Retrying fetchHotelData... Attempt ${attempt + 1}`);
          fetchHotelData(attempt + 1);
        }, RETRY_DELAY);
      } else {
        Alert.alert('Error', 'Failed to fetch user data. Please try again later.');
        setLoading(false);
      }
    }
  }, []);

  // Format time for countdown timer
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fetch Membership Plans
  const fetchMembershipPlan = async () => {
    try {
      const { data } = await axios.get('https://www.api.olyox.com/api/v1/membership-plans');
      setMemberships(data.data.filter((item) => item.category === 'Hotel'));
    } catch (err) {
      Alert.alert('Error', 'Error fetching membership plans');
    }
  };

  useEffect(() => {
    fetchHotelData();
    fetchMembershipPlan();
    refreshCoupons();
  }, []);

  // Timer for QR code expiration
  useEffect(() => {
    let interval;
    if (showQR && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setShowQR(false);
      Alert.alert('Time Expired', 'The payment session has expired. Please try again.');
    }
    return () => clearInterval(interval);
  }, [showQR, timer]);

  // Validate coupon
  const validateCoupon = useCallback(() => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);
    setCouponError("");

    try {
      // Find the coupon in available coupons
      const foundCoupon = coupons?.find(
        (coupon) => coupon.code.toLowerCase() === couponCode.trim().toLowerCase() && coupon.isActive,
      );

      if (foundCoupon) {
        setAppliedCoupon(foundCoupon);
        setShowCouponModal(false);
        Alert.alert(
          "Coupon Applied",
          `Coupon "${foundCoupon.code}" for ${foundCoupon.discount}% discount has been applied!`,
        );
      } else {
        setCouponError("Invalid coupon code or coupon has expired");
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setCouponError("An error occurred while validating the coupon");
    } finally {
      setValidatingCoupon(false);
    }
  }, [couponCode, coupons]);

  // Remove applied coupon
  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode("");
  }, []);

  // Calculate discounted price with GST
  const calculateDiscountedPrice = useCallback(() => {
    if (!selectedPlan) return { basePrice: 0, gstAmount: 0, totalPrice: 0 };

    try {
      let basePrice = selectedPlan.price;

      if (appliedCoupon) {
        const discountAmount = (selectedPlan.price * appliedCoupon.discount) / 100;
        basePrice = selectedPlan.price - discountAmount;
      }

      const gstAmount = basePrice * 0.18; // 18% GST
      const totalPrice = basePrice + gstAmount;

      return {
        basePrice: Number.parseFloat(basePrice.toFixed(2)),
        gstAmount: Number.parseFloat(gstAmount.toFixed(2)),
        totalPrice: Number.parseFloat(totalPrice.toFixed(2))
      };
    } catch (error) {
      console.error("Error calculating price:", error);
      return { basePrice: 0, gstAmount: 0, totalPrice: 0 };
    }
  }, [selectedPlan, appliedCoupon]);

  const { basePrice, gstAmount, totalPrice } = calculateDiscountedPrice();

  // Initiate Razorpay payment
  const initiatePayment = async () => {
    if (!selectedMemberId) {
      showPaymentModal("failed", "Please select a membership plan.");
      return;
    }
    setLoading(true);
    const baseUrl = `https://www.appv2.olyox.com/api/v1/rider/recharge-wallet/${selectedMemberId}/${data?.bh}`;
    const urlWithParams = appliedCoupon ? `${baseUrl}?coupon=${appliedCoupon.code}&type=cab` : baseUrl;

    try {
      const response = await axios.get(urlWithParams);

      const options = {
        description: "Recharge Wallet",
        image: "https://www.olyox.com/assets/logo-CWkwXYQ_.png",
        currency: response.data.order.currency,
        key: "rzp_live_zD1yAIqb2utRwp", // Replace with your Razorpay key
        amount: response.data.order.amount,
        name: "Olyox",
        order_id: response.data.order.id,
        prefill: {
          email: userData?.email,
          contact: userData?.phone,
          name: userData?.name,
        },
        theme: { color: "#EF4444" },
      };

      // Razorpay opens and resolves on success
      const paymentResponse = await RazorpayCheckout.open(options);
      console.log("Payment Success Response:", paymentResponse);

      // After payment, call your backend verification API
      const verifyResponse = await axios.post(
        `${BASE_URL}/api/v1/rider/recharge-verify/${data?.bh}`,
        {
          razorpay_order_id: paymentResponse?.razorpay_order_id,
          razorpay_payment_id: paymentResponse?.razorpay_payment_id,
          razorpay_signature: paymentResponse?.razorpay_signature,
        },
      );

      const rechargeStatus = verifyResponse?.data?.rechargeData;

      if (verifyResponse?.data?.message?.includes("successful") && rechargeStatus?.payment_approved) {
        showPaymentModal("success", "Your payment was successful! Your membership has been activated.");
        setTimeout(() => {
          navigation.navigate("Home");
        }, 2000);
      } else {
        showPaymentModal("failed", "Payment processed but verification failed. Please contact support.");
      }
    } catch (error) {
      console.log("Payment Error:", error.response?.data || error);

      if (error?.description === "Payment Cancelled" || error?.code === "PAYMENT_CANCELLED") {
        showPaymentModal("cancelled", "You cancelled the payment. Please try again when you're ready.");
      } else {
        showPaymentModal("failed", "Payment failed. Please try again or contact support.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle QR payment verification
  const handleRecharge = async () => {
    if (!transactionId) {
      Alert.alert('Error', 'Please enter transaction ID');
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await axios.post(
        `https://www.appv2.olyox.com/api/v1/rider/verify-qr-payment/${userData?.BH}`,
        {
          transactionId,
          planId: selectedMemberId,
          couponCode: appliedCoupon?.code || '',
        }
      );

      if (response.data.success) {
        showPaymentModal("success", "Your payment was verified successfully! Your membership has been activated.");
        setTimeout(() => {
          navigation.navigate("Home");
        }, 2000);
      } else {
        showPaymentModal("failed", response.data.message || "Payment verification failed. Please try again.");
      }
    } catch (error) {
      showPaymentModal("failed", "Payment verification failed. Please check your transaction ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (memberId) => {
    setSelectedMemberId(memberId);
  };

  // Toggle between plans and QR payment
  const toggleQRPayment = () => {
    if (!selectedMemberId) {
      Alert.alert('Error', 'Please select a plan first');
      return;
    }
    setShowQR(!showQR);
    if (!showQR) {
      setTimer(30 * 60); // Reset timer to 30 minutes
    }
  };

  if (loading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading your membership options...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Payment Status Modal */}
      <PaymentStatusModal
        visible={modalConfig.visible}
        status={modalConfig.status}
        message={modalConfig.message}
        onClose={closePaymentModal}
      />

      {/* Coupon Modal */}
      <CouponModal
        visible={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        validateCoupon={validateCoupon}
        error={couponError}
        loading={validatingCoupon}
        availableCoupons={coupons}
      />

      {!showQR ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <Text style={styles.headerSubtitle}>Select a membership plan that suits your needs</Text>
          </View>

          {/* Membership Plans */}
          <View style={styles.planContainer}>
            {memberships.map((plan) => (
              <MembershipCard
                key={plan._id}
                plan={plan}
                selected={selectedMemberId === plan._id}
                onSelect={handlePlanSelect}
                showEarnings={true}
              />
            ))}
          </View>

          {/* Price Summary */}
          {selectedPlan && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Price Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Price</Text>
                <Text style={styles.summaryValue}>₹{selectedPlan.price.toFixed(2)}</Text>
              </View>

              {appliedCoupon && (
                <View style={styles.summaryRow}>
                  <View style={styles.couponRow}>
                    <Text style={styles.summaryLabel}>Coupon Discount</Text>
                    <TouchableOpacity onPress={removeCoupon}>
                      <Text style={styles.removeCouponText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.discountValue}>
                    -₹{(selectedPlan.price - basePrice).toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST (18%)</Text>
                <Text style={styles.summaryValue}>₹{gstAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{totalPrice.toFixed(2)}</Text>
              </View>

              {!appliedCoupon && (
                <TouchableOpacity
                  style={styles.applyCouponRow}
                  onPress={() => setShowCouponModal(true)}
                >
                  <MaterialCommunityIcons name="ticket-percent-outline" size={20} color="#10B981" />
                  <Text style={styles.applyCouponText}>Apply Coupon</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Payment Buttons */}
          {selectedPlan && (
            <View style={styles.paymentButtonsContainer}>
              <TouchableOpacity
                style={styles.razorpayButton}
                onPress={initiatePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Image
                      source={{ uri: 'https://razorpay.com/favicon.png' }}
                      style={styles.razorpayIcon}
                    />
                    <Text style={styles.razorpayButtonText}>Pay with Razorpay</Text>
                  </>
                )}
              </TouchableOpacity>

            
            </View>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      ) : (
        <View style={styles.qrContainer}>
          <View style={styles.qrHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowQR(false)}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.qrTitle}>QR Code Payment</Text>
          </View>

          <View style={styles.timerContainer}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#10B981" />
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>

          <View style={styles.qrCard}>
            <Text style={styles.qrInstructions}>
              Scan this QR code to pay ₹{totalPrice.toFixed(2)}
            </Text>
            <Image
              source={{ uri: settings?.paymentQr || 'https://offercdn.paytm.com/blog/2022/02/scan/scan-banner.png' }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            <Text style={styles.qrNote}>
              After payment, enter the transaction ID below to verify your payment
            </Text>
          </View>

          <View style={styles.verificationContainer}>
            <Text style={styles.verificationTitle}>Payment Verification</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter transaction ID"
              value={transactionId}
              onChangeText={setTransactionId}
              placeholderTextColor="#666"
            />
            <TouchableOpacity
              style={[styles.verifyButton, !transactionId && styles.disabledButton]}
              onPress={handleRecharge}
              disabled={!transactionId || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  planContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  planCardTouchable: {
    padding: 20,
  },
  selectedPlan: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheckCircle: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceContainer: {
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
  },
  gstText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  planDescription: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
    marginBottom: 16,
  },
  planDetailsContainer: {
    gap: 12,
  },
  planDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planDetailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  earningNoteContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  earningNoteText: {
    fontSize: 12,
    color: '#10B981',
    fontStyle: 'italic',
  },
  summaryContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  removeCouponText: {
    fontSize: 14,
    color: '#EF4444',
    textDecorationLine: 'underline',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  applyCouponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyCouponText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  paymentButtonsContainer: {
    margin: 16,
    gap: 12,
  },
  razorpayButton: {
    backgroundColor: '#072654',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  razorpayIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  razorpayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 40,
  },
  qrContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginLeft: 8,
  },
  qrCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrInstructions: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrImage: {
    width: width - 120,
    height: width - 120,
    borderRadius: 12,
  },
  qrNote: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  verificationContainer: {
    padding: 20,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  verifyButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#D1FAE5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  modalBody: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  couponModalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  couponModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  couponModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  couponInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  applyCouponButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  applyCouponButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  couponErrorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '500',
  },
  availableCouponsContainer: {
    marginTop: 16,
  },
  availableCouponsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  couponsList: {
    maxHeight: 200,
  },
  couponItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  couponItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  discountBadge: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    padding: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  couponItemCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  couponItemDesc: {
    fontSize: 12,
    color: '#6B7280',
    maxWidth: 150,
  },
  couponApplyBtn: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  couponApplyBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});