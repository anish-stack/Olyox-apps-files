"use client"

import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { theme } from "../theme/theme"
import Icon from "react-native-vector-icons/FontAwesome5"

export default function CouponBar({
  isCashbackApply,
  onToggleCashback,
  cashback = 0,
  cashbackCanApply = false,
  cashbackApplied = 0
}) {
  if (cashback <= 0) return null

  return (
    <View style={styles.container}>
      {/* Cashback Card */}
      <TouchableOpacity
        onPress={() => onToggleCashback(!isCashbackApply)}
        style={[
          styles.cashbackCard,
          isCashbackApply && styles.cashbackCardActive,
          !cashbackCanApply && styles.cashbackCardDisabled
        ]}
        activeOpacity={0.7}
        disabled={!cashbackCanApply}
      >
        <View style={styles.cardContent}>
          {/* Icon Section */}
          <View style={[
            styles.iconContainer,
            isCashbackApply && styles.iconContainerActive
          ]}>
            <Icon
              name="star"
              size={18}
              color={isCashbackApply ? "#FFD700" : "#999"}
              solid={isCashbackApply}
            />
          </View>

          {/* Text Section */}
          <View style={styles.textContainer}>
            <Text style={[
              styles.title,
              isCashbackApply && styles.titleActive
            ]}>
              Cashback Available
            </Text>
            <Text style={[
              styles.amount,
              isCashbackApply && styles.amountActive
            ]}>
              ₹{Math.floor(cashback)} in your wallet
            </Text>
            {!cashbackCanApply && (
              <Text style={styles.minAmountText}>
                Minimum order ₹100 required
              </Text>
            )}
          </View>

          {/* Checkbox */}
          <View style={[
            styles.checkbox,
            isCashbackApply && styles.checkboxActive
          ]}>
            {isCashbackApply && (
              <Icon name="check" size={12} color="#fff" />
            )}
          </View>
        </View>

        {/* Applied Amount Banner */}
        {isCashbackApply && cashbackApplied > 0 && (
          <View style={styles.appliedBanner}>
            <Icon name="check-circle" size={12} color="#4CAF50" solid />
            <Text style={styles.appliedText}>
              ₹{cashbackApplied} cashback applied! 🎉
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  cashbackCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  cashbackCardActive: {
    borderColor: "#FFD700",
    backgroundColor: "#FFFEF5",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cashbackCardDisabled: {
    opacity: 0.5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerActive: {
    backgroundColor: "#FFF9E6",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 2,
  },
  titleActive: {
    color: "#000",
  },
  amount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  amountActive: {
    color: "#D4AF37",
  },
  minAmountText: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 2,
    fontWeight: "500",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appliedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#C8E6C9",
  },
  appliedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E7D32",
  },
})