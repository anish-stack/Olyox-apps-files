import React, { useEffect, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import useUserStore from "../../../../Store/useUserStore";

const API_BASE_URL = "https://www.appv2.olyox.com";

export default function RideCancelledScreen({ rideDetails }) {
  const navigation = useNavigation();
  const { fetchUserDetails } = useUserStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Cancellation data from API
  const [cancelPaymentData, setCancelPaymentData] = useState({
    original_fare: 0,
    new_fare: 0,
    distance_travelled_km: 0,
    vehicle_type: "",
    rate_per_km: 0,
    amount_saved: 0,
    message: ""
  });

  // Fetch ride cancellation details from API
  const fetchRideDetails = useCallback(async () => {
    if (!rideDetails?._id) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/rider/${rideDetails?._id}`
      );
      
      const pricing = response.data.data.pricing || {};
      // console.log("pricing",response.data.data)
      const recTotalFare = Number(response.data.data.rec_total_fare) || 0;
      const recTotalDistance = Number(response.data.data.rec_total_distance) || 0;

      setCancelPaymentData({
        message: "Your ride was cancelled",
        original_fare: pricing.original_fare || 0,
        new_fare: recTotalFare,
        distance_travelled_km: recTotalDistance,
        vehicle_type: response.data.data.vehicle_type || "N/A",
        rate_per_km: pricing.rate_per_km || 0,
        amount_saved: (pricing.original_fare || 0) - recTotalFare,
      });

    } catch (err) {
      console.error("[FetchRideDetails Error]", err.message);
      Alert.alert(
        "Error",
        "Failed to fetch cancellation details. Please try again."
      );
      
      // Fallback to basic ride details if API fails
      setCancelPaymentData({
        message: "Ride cancelled - Unable to fetch details",
        original_fare: 0,
        new_fare: 0,
        distance_travelled_km: 0,
        vehicle_type: rideDetails?.vehicle_type || "N/A",
        rate_per_km: 0,
        amount_saved: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [rideDetails?._id]);

  // Fetch data on mount
  useEffect(() => {
    fetchRideDetails();
  }, [fetchRideDetails]);

  // Calculated values
  const isRecalculated = cancelPaymentData.new_fare > 0 && 
                         cancelPaymentData.original_fare > cancelPaymentData.new_fare;
  
  const collectedAmount = cancelPaymentData.new_fare || cancelPaymentData.original_fare;
  const refundAmount = cancelPaymentData.amount_saved;

  // Confirm payment collection API call
  const confirmPaymentAPI = async (rideId, amount) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/rider/${rideId}/confirm-payment`,
        {
          amount_collected: amount,
          payment_status: "collected",
          payment_method: "cash" // or card/upi based on your flow
        }
      );
      return response.data;
    } catch (error) {
      console.error("[ConfirmPayment Error]", error);
      throw error;
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentConfirmed) {
      Alert.alert(
        "Confirm Payment",
        `क्या आपने ₹${collectedAmount.toFixed(2)} customer से collect कर लिया?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Confirm",
            onPress: async () => {
              setIsProcessing(true);
              try {
                // API call to confirm payment
                await confirmPaymentAPI(
                  rideDetails._id, 
                  collectedAmount
                );
                
                setPaymentConfirmed(true);
                
                // Navigate after short delay
                setTimeout(() => {
                  handleNavigateHome();
                }, 1000);
                
              } catch (error) {
                Alert.alert(
                  "Error", 
                  "Payment confirmation failed. Please try again."
                );
              } finally {
                setIsProcessing(false);
              }
            },
          },
        ]
      );
    } else {
      handleNavigateHome();
    }
  };

  const handleNavigateHome = async () => {
    setIsProcessing(true);
    try {
      await fetchUserDetails();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Home" }],
        })
      );
    } catch (error) {
      console.error("Navigation error:", error);
      setIsProcessing(false);
    }
  };

  // Show loading state while fetching data
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading cancellation details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={60} color="#dc2626" />
          </View>
          <Text style={styles.title}>Ride Cancelled</Text>
          <Text style={styles.subtitle}>{cancelPaymentData.message}</Text>
        </View>

        {/* Fare Breakdown Section */}
        {isRecalculated && (
          <View style={styles.recalcSection}>
            <Text style={styles.sectionTitle}>📊 Fare Recalculation</Text>
            <View style={styles.recalcBox}>
              <View style={styles.recalcRow}>
                <Text style={styles.recalcLabel}>Original Fare:</Text>
                <Text style={styles.recalcValue}>
                  ₹{cancelPaymentData.original_fare.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.recalcRow}>
                <Text style={styles.recalcLabel}>Distance Travelled:</Text>
                <Text style={styles.recalcValue}>
                  {cancelPaymentData.distance_travelled_km.toFixed(2)} km
                </Text>
              </View>

             

              <View style={styles.divider} />

              <View style={styles.recalcRow}>
                <Text style={styles.recalcLabel}>New Fare:</Text>
                <Text style={[styles.recalcValue, styles.recalcFareValue]}>
                  ₹{cancelPaymentData.new_fare.toFixed(2)}
                </Text>
              </View>

            </View>
          </View>
        )}

        {/* Collection Amount (Driver को collect करना है) */}
        <View style={styles.collectionSection}>
          <Text style={styles.sectionTitle}>💰 Collection Amount</Text>
          <View style={styles.collectionBox}>
            <Text style={styles.collectionLabel}>
              Customer से collect करें:
            </Text>
            <Text style={styles.collectionAmount}>
              ₹{collectedAmount.toFixed(2)}
            </Text>
            <Text style={styles.collectionNote}>
              {isRecalculated 
                ? "Recalculated fare based on actual distance" 
                : "Original fare amount"}
            </Text>
          </View>
        </View>

        {/* Ride Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>📍 Ride Details</Text>
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vehicle Type:</Text>
              <Text style={styles.detailValue}>
                {cancelPaymentData.vehicle_type}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From:</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {rideDetails?.pickupAddress || "N/A"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To:</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {rideDetails?.dropAddress || "N/A"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomContainer}>
        {!paymentConfirmed ? (
          <>
            <Text style={styles.warningText}>
              ⚠️ Confirm payment collected from customer
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  ✓ Confirm ₹{collectedAmount.toFixed(2)} Collected
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              <Text style={styles.successText}>
                Payment Confirmed ✓
              </Text>
            </View>
            <TouchableOpacity
              style={styles.okBtn}
              onPress={handleNavigateHome}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.okBtnText}>OK, Go Home</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  recalcSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  recalcBox: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  recalcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  recalcLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  recalcValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  recalcFareValue: {
    color: "#f59e0b",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 8,
  },
  refundLabel: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
  },
  refundValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16a34a",
  },
  collectionSection: {
    marginBottom: 20,
  },
  collectionBox: {
    backgroundColor: "#dbeafe",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  collectionLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginBottom: 8,
  },
  collectionAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#007bff",
    marginBottom: 8,
  },
  collectionNote: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
  },
  detailsSection: {
    marginBottom: 30,
  },
  detailsBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    marginVertical: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  warningText: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "500",
    marginBottom: 12,
    textAlign: "center",
  },
  confirmBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
    marginLeft: 8,
  },
  okBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  okBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});