import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import useUserStore from "../../../../Store/useUserStore";
import useCurrentRideStore from "../../../../Store/currentRideStore";

const QRModal = React.memo(({ visible, user, totalFare, onClose }) => {
  const formatCurrency = (amount) => `₹${Number(amount || 0).toFixed(2)}`;
  const hasQRCode = !!user?.YourQrCodeToMakeOnline;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.qrModal} onStartShouldSetResponder={() => true}>
          {/* FIXED: was `drop.modalTitle` */}
          <Text style={styles.modalTitle}>Your UPI QR Code</Text>
          <Text style={styles.modalSubtitle}>Show this to rider for payment</Text>

          {hasQRCode ? (
            <>
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: user.YourQrCodeToMakeOnline }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  onError={() => console.log("QR image failed to load")}
                />
              </View>
              <Text style={styles.qrAmount}>{formatCurrency(totalFare)}</Text>
              <Text style={styles.qrInstruction}>Ask rider to scan and pay</Text>
            </>
          ) : (
            <View style={styles.noQrContainer}>
              <Text style={styles.noQrIcon}>Phone</Text>
              <Text style={styles.noQrText}>QR Code Not Available</Text>
              <Text style={styles.noQrSubtext}>Contact support to generate QR</Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

export default function RideCompleteScreen({
  paymentStatus: initialPaymentStatus,
  rideDetails: initialRideDetails,
}) {
  const navigation = useNavigation();
  const { user } = useUserStore();
  const {paymentCollect} = useCurrentRideStore()
  const [showQr, setShowQr] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [paymentCollected, setPaymentCollected] = useState(
    initialPaymentStatus === "pending" ? false : true
  );

  const rideData = useMemo(() => {
    if (!initialRideDetails) return null;

    const totalFare = Number(initialRideDetails.totalFare || 0);
    const discount = Number(initialRideDetails.discount || 0);
    const collectedAmount = totalFare - discount;

    return {
      totalFareAmount: totalFare.toFixed(2),
      discountAmount: discount.toFixed(2),
      collectedAmount: collectedAmount.toFixed(2),
      hasDiscount: discount > 0,
      riderInfo: initialRideDetails.user || {},
      rideId: initialRideDetails._id,
    };
  }, [initialRideDetails]);

  const handleCollectPayment = useCallback(async () => {
    if (!rideData?.rideId) {
      Alert.alert("Error", "Missing ride information.");
      return;
    }
    if (loading || paymentCollected) return;

    setLoading(true);
    try {
      // Replace with your actual paymentCollect call
      await paymentCollect(user?._id,rideData?.rideId,initialRideDetails.totalFare,paymentMode)
      await new Promise((r) => setTimeout(r, 800));
      setPaymentCollected(true);
      setTimeout(goToHome, 1500);
    } catch (err) {
      console.error("Payment error:", err);
      Alert.alert("Payment Failed", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [rideData, paymentMode, loading, paymentCollected]);

  const handleShowQR = useCallback(() => {
    setPaymentMode("upi");
    setShowQr(true);
  }, []);

  const handleCloseQR = useCallback(() => setShowQr(false), []);
  const handleSelectCash = useCallback(() => setPaymentMode("cash"), []);
  const handleSelectUPI = useCallback(() => setPaymentMode("upi"), []);

  const goToHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    );
  }, [navigation]);

  if (!rideData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  if (!rideData.rideId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>Warning</Text>
        <Text style={styles.errorTitle}>Ride Not Found</Text>
        <Text style={styles.errorText}>We couldn't load your ride details.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={goToHome}>
          <Text style={styles.primaryButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
 
      <Text style={styles.title}>Trip Completed!</Text>
      <Text style={styles.subtitle}>
        {paymentCollected ? "Payment received" : "Collect payment from rider"}
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Fare Summary</Text>
          <View style={[styles.completeBadge, paymentCollected && styles.paidBadge]}>
            <Text style={styles.completeBadgeText}>
              {paymentCollected ? "PAID" : "PENDING"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryBody}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Rider Pays (Total Fare)</Text>
            <Text style={styles.fareValue}>₹{rideData.totalFareAmount}</Text>
          </View>

          {rideData.hasDiscount && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Add to wallet</Text>
              <Text style={styles.discountValue}>₹{rideData.discountAmount}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>You Collect</Text>
            <Text style={styles.totalValue}>₹{rideData.collectedAmount}</Text>
          </View>
        </View>
      </View>

      {!paymentCollected && (
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Select Payment Method</Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMode === "cash" && styles.paymentOptionSelected,
            ]}
            onPress={handleSelectCash}
            disabled={loading}
          >
            <View style={styles.paymentLeft}>
              <Text style={styles.paymentIcon}>Cash</Text>
              <Text style={styles.paymentLabel}>Cash</Text>
            </View>
            <View style={[styles.radio, paymentMode === "cash" && styles.radioSelected]}>
              {paymentMode === "cash" && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMode === "upi" && styles.paymentOptionSelected,
            ]}
            onPress={handleSelectUPI}
            disabled={loading}
          >
            <View style={styles.paymentLeft}>
              <Text style={styles.paymentIcon}>Mobile</Text>
              <Text style={styles.paymentLabel}>UPI / QR Code</Text>
            </View>
            <View style={[styles.radio, paymentMode === "upi" && styles.radioSelected]}>
              {paymentMode === "upi" && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {paymentMode === "upi" && (
            <TouchableOpacity style={styles.qrButton} onPress={handleShowQR} disabled={loading}>
              <Text style={styles.qrButtonIcon}>QR</Text>
              <Text style={styles.qrButtonText}>Show My QR Code</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.collectButton, loading && styles.collectButtonDisabled]}
            onPress={handleCollectPayment}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.collectButtonText}>
                Collect ₹{rideData.collectedAmount}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {paymentCollected && (
        <View style={styles.earningsCard}>
          <Text style={styles.earningsIcon}>Money</Text>
          <Text style={styles.earningsLabel}>You Earned</Text>
          <Text style={styles.earningsValue}>₹{rideData.collectedAmount}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={goToHome} disabled={loading}>
        <Text style={styles.primaryButtonText}>Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        {paymentCollected
          ? "Great job! Ready for the next ride?"
          : "You can collect payment later from earnings"}
      </Text>

      <QRModal
        visible={showQr}
        user={user}
        totalFare={rideData.collectedAmount}
        onClose={handleCloseQR}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  errorIcon: { fontSize: 64, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#000", marginBottom: 8 },
  errorText: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 },
  successContainer: { alignItems: "center", marginBottom: 32 },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: { fontSize: 50, color: "#fff", fontWeight: "bold" },
  title: { fontSize: 32, fontWeight: "700", color: "#000", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 32 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#000",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#000" },
  completeBadge: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paidBadge: { backgroundColor: "#4CAF50" },
  completeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  summaryBody: { backgroundColor: "#f8f8f8", borderRadius: 16, padding: 16 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  fareLabel: { fontSize: 15, color: "#666" },
  fareValue: { fontSize: 15, fontWeight: "600", color: "#000" },
  discountValue: { fontSize: 15, fontWeight: "600", color: "#4CAF50" },
  divider: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 18, fontWeight: "700", color: "#000" },
  totalValue: { fontSize: 26, fontWeight: "700", color: "#000" },
  paymentSection: { marginBottom: 20 },
  paymentTitle: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 12 },
  paymentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
  },
  paymentOptionSelected: { borderColor: "#000", backgroundColor: "#fff" },
  paymentLeft: { flexDirection: "row", alignItems: "center" },
  paymentIcon: { fontSize: 24, marginRight: 12 },
  paymentLabel: { fontSize: 16, fontWeight: "600", color: "#000" },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: { borderColor: "#000" },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#000" },
  qrButton: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  qrButtonIcon: { fontSize: 20, marginRight: 8 },
  qrButtonText: { fontSize: 15, fontWeight: "700", color: "#000" },
  collectButton: {
    backgroundColor: "#000",
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 56,
  },
  collectButtonDisabled: { opacity: 0.6 },
  collectButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  earningsCard: {
    backgroundColor: "#000",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  earningsIcon: { fontSize: 40, marginBottom: 8 },
  earningsLabel: { fontSize: 14, color: "#fff", marginBottom: 8, opacity: 0.8 },
  earningsValue: { fontSize: 36, fontWeight: "700", color: "#fff" },
  primaryButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footerText: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 18 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  qrModal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#000", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: "#666", marginBottom: 24, textAlign: "center" },
  qrContainer: {
    width: 250,
    height: 250,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  qrImage: { width: "100%", height: "100%" },
  qrAmount: { fontSize: 32, fontWeight: "700", color: "#000", marginBottom: 8 },
  qrInstruction: { fontSize: 14, color: "#666", marginBottom: 20, textAlign: "center" },
  noQrContainer: { paddingVertical: 40, alignItems: "center" },
  noQrIcon: { fontSize: 64, marginBottom: 16 },
  noQrText: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 8 },
  noQrSubtext: { fontSize: 13, color: "#666", textAlign: "center" },
  closeBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});