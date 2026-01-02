
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native"
import { useState, useEffect, useCallback } from "react"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import axios from "axios"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useFetchProfile from "../hooks/useFetchProfile"

export default function RechargeHistoryTiffin() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rechargeData, setRechargeData] = useState([])
  const { refetch, restaurant } = useFetchProfile()
  const [error, setError] = useState(null)

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData()
      return () => {} // Cleanup function
    }, []),
  )

  // Initial data load
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      await refetch()
      await fetchRechargeHistory()
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load recharge history. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchRechargeHistory = async () => {
    if (!restaurant?.restaurant_BHID) {
      setError("User profile not found. Please try again later.")
      return
    }

    try {
      const response = await axios.get(`https://www.webapi.olyox.com/api/v1/get-recharge?_id=${restaurant.restaurant_BHID}`)

      if (response.data && response.data.data) {
        setRechargeData(response.data.data)
      } else {
        setRechargeData([])
      }
    } catch (error) {
      console.error("Error fetching recharge history:", error)
      throw new Error("Failed to fetch recharge history")
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid date"

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₹0"

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF385C" />
          <Text style={styles.loadingText}>Loading your recharge history...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#FF385C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Recharge History</Text>
          <Text style={styles.headerSubtitle}>Your past transactions</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF385C"]} tintColor="#FF385C" />
        }
      >
        {rechargeData.length > 0 ? (
          rechargeData.map((recharge) => (
            <TransactionCard
              key={recharge._id}
              recharge={recharge}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// Transaction Card Component
function TransactionCard({ recharge, formatDate, formatCurrency }) {
  const getStatusColor = (isApproved) => (isApproved ? "#4CAF50" : "#FF9800")
  const getStatusIcon = (isApproved) => (isApproved ? "check-circle" : "clock-outline")

  return (
    <View style={styles.transactionCard}>
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(recharge.payment_approved) + "20" }]}>
        <MaterialCommunityIcons
          name={getStatusIcon(recharge.payment_approved)}
          size={14}
          color={getStatusColor(recharge.payment_approved)}
        />
        <Text style={[styles.statusText, { color: getStatusColor(recharge.payment_approved) }]}>
          {recharge.payment_approved ? "Approved" : "Pending"}
        </Text>
      </View>

      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{recharge.member_id?.title || "Subscription Plan"}</Text>
          <Text style={styles.validity}>
            {recharge.member_id?.validityDays || "N/A"} {recharge.member_id?.whatIsThis || "days"}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{formatCurrency(recharge.amount)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Details Section */}
      <View style={styles.detailsContainer}>
        <DetailRow icon="calendar-range" text={`Valid till: ${formatDate(recharge.end_date)}`} />

        <DetailRow icon="receipt" text={`Transaction ID: ${recharge.trn_no || "N/A"}`} />

        <DetailRow icon="calendar-clock" text={`Purchased: ${formatDate(recharge.createdAt)}`} />
      </View>
    </View>
  )
}

// Detail Row Component
function DetailRow({ icon, text, color = "#666" }) {
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.detailText, { color }]}>{text}</Text>
    </View>
  )
}

// Empty State Component
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="history" size={64} color="#ddd" />
      <Text style={styles.emptyTitle}>No Recharge History</Text>
      <Text style={styles.emptyText}>
        You haven't made any recharges yet. Your transaction history will appear here.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FF385C",
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planInfo: {
    flex: 1,
    marginRight: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  validity: {
    fontSize: 14,
    color: "#666",
  },
  amountContainer: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF385C",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 16,
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
})

