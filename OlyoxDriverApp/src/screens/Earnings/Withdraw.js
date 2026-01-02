"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native"
import { useRoute } from "@react-navigation/native"
import axios from "axios"
import { FontAwesome, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import useUserStore from "../../../Store/useUserStore"
import { API_URL_WEB } from "../../../constant/api"
import BottomTab from "../../components/common/BottomTab"
import HeaderWithBack from "../../components/common/HeaderWithBack"
import { SafeAreaView } from "react-native-safe-area-context"

export default function Withdraw() {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [withdrawals, setWithdrawals] = useState([])
  const [errors, setErrors] = useState({})
  const [checkBhData, setBhData] = useState(null)
  const [tdsData, setTdsData] = useState(null)
  const [fetchingTds, setFetchingTds] = useState(false)
  const { user, checkBhDetails, fetchUserDetails } = useUserStore()
  const [serverErrors, setServerErrors] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const route = useRoute()
  const { _id, wallet } = route.params || {}

  const [formData, setFormData] = useState({
    amount: "",
    method: "UPI",
    isBank: false,
    isUpi: true,
    BankDetails: {
      accountNo: "",
      ifsc_code: "",
      bankName: "",
    },
    upi_details: {
      upi_id: "",
    },
  })

  useEffect(() => {
    fetchAndSetBh()
    fetchWithdrawals()
    fetchTdsData()
  }, [])

  const fetchAndSetBh = async () => {
    setLoading(true)
    setServerErrors(null)
    try {
      let BH;
      if (!user?.BH) {
        const userDetails = await fetchUserDetails()
        BH = userDetails?.BH
        if (!BH) {
          throw new Error("Business handle not found")
        }
      } else {
        BH = user.BH
      }

      const response = await checkBhDetails(BH)
      console.log("BH details response:", response?.details)
      if (response?.details) {
        setBhData(response.details) // Expecting { wallet, ...otherDetails }
      } else {
        throw new Error(response?.message || "Failed to fetch business details")
      }
    } catch (error) {
      console.error("Error fetching BH details:", error?.response?.data?.message || error.message)
      const errorMessage = error?.response?.data?.message || "Unable to fetch business details. Please try again."
      setServerErrors(errorMessage)
      Alert.alert("Error", errorMessage, [
        { text: "Retry", onPress: () => fetchAndSetBh() },
        { text: "Cancel", style: "cancel" },
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchTdsData = async () => {
    setFetchingTds(true)
    try {
      const response = await axios.get(
        "https://www.webapi.olyox.com/api/v1/get_single_commission_tds/685a5dbeeaea7dc383054f4b"
      )
      console.log("response.dataresponse.data", response.data?.data)
      if (response.data) {
        setTdsData(response.data.data)
      } else {
        setServerErrors("Failed to fetch TDS data")
      }
    } catch (error) {
      console.error("Error fetching TDS data:", error)
      setServerErrors(error.response?.data?.message || "Error fetching TDS data")
    } finally {
      setFetchingTds(false)
    }
  }
// console.log("user?._id",user?._id)
  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL_WEB}/withdrawal?_id=${user?._id}`)
      if (response.data.success) {
        setWithdrawals(response.data.withdrawal || [])
        if (response.data.withdrawal && response.data.withdrawal.length > 0) {
          const lastWithdrawal = response.data.withdrawal[0]
          const isBank = lastWithdrawal.method === "Bank Transfer"
          setFormData((prev) => ({
            ...prev,
            method: lastWithdrawal.method,
            isBank: isBank,
            isUpi: !isBank,
            BankDetails: isBank
              ? {
                accountNo: lastWithdrawal.BankDetails?.accountNo || "",
                ifsc_code: lastWithdrawal.BankDetails?.ifsc_code || "",
                bankName: lastWithdrawal.BankDetails?.bankName || "",
              }
              : prev.BankDetails,
            upi_details: !isBank
              ? {
                upi_id: lastWithdrawal.upi_details?.upi_id || "",
              }
              : prev.upi_details,
          }))
        }
      } else {
        throw new Error(response.data.message || "Failed to fetch withdrawals")
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error)
      setServerErrors(error.response?.data?.message || "Failed to load withdrawal history")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount"
    } else if (Number.parseFloat(formData.amount) > (checkBhData?.wallet || wallet || 0)) {
      newErrors.amount = "Amount exceeds available balance"
    }

    if (formData.isBank) {
      if (!formData.BankDetails.accountNo || !/^\d{9,18}$/.test(formData.BankDetails.accountNo)) {
        newErrors.accountNo = "Please enter a valid account number (9-18 digits)"
      }
      if (!formData.BankDetails.ifsc_code || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.BankDetails.ifsc_code)) {
        newErrors.ifsc_code = "Please enter a valid IFSC code"
      }
      if (!formData.BankDetails.bankName) {
        newErrors.bankName = "Please enter bank name"
      }
    }

    if (formData.isUpi) {
      if (!formData.upi_details.upi_id || !/^[\w.-]+@[\w.-]+$/.test(formData.upi_details.upi_id)) {
        newErrors.upi_id = "Please enter a valid UPI ID"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (name, value) => {
    setErrors((prev) => ({ ...prev, [name]: "" }))
    setServerErrors(null)

    if (["accountNo", "ifsc_code", "bankName"].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        BankDetails: {
          ...prev.BankDetails,
          [name]: value,
        },
      }))
    } else if (name === "upi_id") {
      setFormData((prev) => ({
        ...prev,
        upi_details: {
          ...prev.upi_details,
          upi_id: value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleMethodChange = (method) => {
    setFormData((prev) => ({
      ...prev,
      method: method === "Bank" ? "Bank Transfer" : "UPI",
      isBank: method === "Bank",
      isUpi: method === "UPI",
    }))
    setErrors({})
    setServerErrors(null)
  }

  const calculateDeductions = () => {
    if (!formData.amount || isNaN(Number.parseFloat(formData.amount)) || !tdsData) {
      return { commission: 0, tds: 0, finalAmount: 0 }
    }

    const amount = Number.parseFloat(formData.amount)
    const commissionPercentage = tdsData.withdrawCommision || 0
    const tdsPercentage = tdsData.isActive ? tdsData.tdsPercentage || 0 : 0

    const commission = (amount * commissionPercentage) / 100
    const tds = (amount * tdsPercentage) / 100
    const finalAmount = amount - commission - tds

    return {
      commission,
      tds,
      finalAmount,
    }
  }

  const { commission, tds, finalAmount } = calculateDeductions()

  const handleSubmit = async () => {
    if (!validateForm()) return

    if (!checkBhData) {
      Alert.alert("Error", "Business details not loaded. Please try again.")
      return
    }

    setSubmitting(true)
    try {
      const response = await axios.post(`${API_URL_WEB}/create-withdrawal?_id=${_id}`, formData)
      if (response.data.success) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        setSubmitting(false)
        Alert.alert("Success", "Your withdrawal request has been submitted successfully!", [
          { text: "OK", onPress: () => setShowModal(false) },
        ])
        fetchUserDetails()
        fetchWithdrawals()
        setFormData({
          amount: "",
          method: "UPI",
          isBank: false,
          isUpi: true,
          BankDetails: { accountNo: "", ifsc_code: "", bankName: "" },
          upi_details: { upi_id: "" },
        })
      } else {
        throw new Error(response.data.message || "Withdrawal request failed")
      }
    } catch (error) {
      console.error("Error creating withdrawal:", error)
      setServerErrors(error.response?.data?.message || "An error occurred while processing your request")
      Alert.alert("Error", error.response?.data?.message || "Failed to submit withdrawal request")
    } finally {
      setSubmitting(false)
    }
  }

  const renderWithdrawalHistory = () => {
    if (withdrawals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="history" size={60} color="#666666" />
          <Text style={styles.emptyStateText}>No withdrawal history found</Text>
        </View>
      )
    }

    return withdrawals.map((item, index) => (
      <View key={index} style={styles.historyItem}>
        <View style={styles.historyItemHeader}>
          <View style={styles.historyItemLeft}>
            <MaterialIcons
              name={item.method === "UPI" ? "payment" : "account-balance"}
              size={24}
              color="#000000"
            />
            <View style={styles.historyItemDetails}>
              <Text style={styles.historyItemMethod}>{item.method}</Text>
              <Text style={styles.historyItemDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === "Completed"
                ? styles.successBadge
                : item.status === "Pending"
                  ? styles.pendingBadge
                  : styles.rejectedBadge,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.historyItemBody}>
          <Text style={styles.amountText}>₹{Number.parseFloat(item.amount).toFixed(2)}</Text>
          {item.method === "UPI" && <Text style={styles.detailText}>UPI: {item.upi_details?.upi_id}</Text>}
          {item.method === "Bank Transfer" && (
            <>
              <Text style={styles.detailText}>Bank: {item.BankDetails?.bankName}</Text>
              <Text style={styles.detailText}>
                A/C: {item.BankDetails?.accountNo?.replace(/(\d{4})(\d+)(\d{4})/, "$1****$3")}
              </Text>
            </>
          )}
        </View>
      </View>
    ))
  }

  return (
    <SafeAreaView style={{ flex: 1}}>
    <HeaderWithBack background={false}/>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Withdraw Funds</Text>
            <FontAwesome name="money" size={24} color="#000000" />
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>₹{checkBhData?.wallet || wallet || 0}</Text>
            <TouchableOpacity style={styles.withdrawButton} onPress={() => setShowModal(true)}>
              <Text style={styles.withdrawButtonText}>Withdraw Now</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Withdrawal History</Text>
              <TouchableOpacity onPress={fetchWithdrawals}>
                <Ionicons name="refresh" size={20} color="#000000" />
              </TouchableOpacity>
            </View>

            {loading || fetchingTds ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : serverErrors ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{serverErrors}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchWithdrawals}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.historyList}>{renderWithdrawalHistory()}</View>
            )}
          </View>
        </ScrollView>

        {showModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Request Withdrawal</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#000000" />
                </TouchableOpacity>
              </View>

              {serverErrors && (
                <View style={styles.serverError}>
                  <MaterialIcons name="error" size={20} color="#FFFFFF" />
                  <Text style={styles.serverErrorText}>{serverErrors}</Text>
                </View>
              )}

              <ScrollView style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Amount</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputPrefix}>₹</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter amount"
                      keyboardType="numeric"
                      value={formData.amount}
                      onChangeText={(value) => handleInputChange("amount", value)}
                    />
                  </View>
                  {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
                </View>

                {formData.amount &&
                  !isNaN(Number.parseFloat(formData.amount)) &&
                  Number.parseFloat(formData.amount) > 0 && (
                    <View style={styles.calculationCard}>
                      <Text style={styles.calculationTitle}>Withdrawal Breakdown</Text>

                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>Requested Amount</Text>
                        <Text style={styles.calculationValue}>₹{Number.parseFloat(formData.amount).toFixed(2)}</Text>
                      </View>

                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>Platform Fee ({tdsData?.withdrawCommision || 0}%)</Text>
                        <Text style={styles.calculationValueNegative}>- ₹{commission.toFixed(2)}</Text>
                      </View>

                      {tdsData?.isActive && (
                        <View style={styles.calculationRow}>
                          <Text style={styles.calculationLabel}>TDS ({tdsData?.tdsPercentage || 0}%)</Text>
                          <Text style={styles.calculationValueNegative}>- ₹{tds.toFixed(2)}</Text>
                        </View>
                      )}

                      <View style={styles.divider} />

                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationTotal}>You Will Receive</Text>
                        <Text style={styles.calculationTotalValue}>₹{finalAmount.toFixed(2)}</Text>
                      </View>

                      <View style={styles.infoContainer}>
                        <MaterialIcons name="info-outline" size={16} color="#000000" />
                        <Text style={styles.infoText}>
                          {tdsData?.isActive
                            ? "TDS (Tax Deducted at Source) will be deducted as per government regulations."
                            : "Platform fee will be deducted from your withdrawal amount."}
                        </Text>
                      </View>
                    </View>
                  )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Payment Method</Text>
                  <View style={styles.methodSelector}>
                    <TouchableOpacity
                      style={[styles.methodOption, formData.isUpi && styles.methodOptionActive]}
                      onPress={() => handleMethodChange("UPI")}
                    >
                      <MaterialIcons name="payment" size={24} color={formData.isUpi ? "#FFFFFF" : "#000000"} />
                      <Text style={[styles.methodText, formData.isUpi && styles.methodTextActive]}>UPI</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.methodOption, formData.isBank && styles.methodOptionActive]}
                      onPress={() => handleMethodChange("Bank")}
                    >
                      <MaterialIcons
                        name="account-balance"
                        size={24}
                        color={formData.isBank ? "#FFFFFF" : "#000000"}
                      />
                      <Text style={[styles.methodText, formData.isBank && styles.methodTextActive]}>Bank Transfer</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {formData.isUpi && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>UPI ID</Text>
                    <View style={styles.inputContainer}>
                      <MaterialIcons name="smartphone" size={20} color="#666666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="example@upi"
                        value={formData.upi_details.upi_id}
                        onChangeText={(value) => handleInputChange("upi_id", value)}
                      />
                    </View>
                    {errors.upi_id && <Text style={styles.errorText}>{errors.upi_id}</Text>}
                  </View>
                )}

                {formData.isBank && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Bank Name</Text>
                      <View style={styles.inputContainer}>
                        <MaterialIcons name="business" size={20} color="#666666" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter bank name"
                          value={formData.BankDetails.bankName}
                          onChangeText={(value) => handleInputChange("bankName", value)}
                        />
                      </View>
                      {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Account Number</Text>
                      <View style={styles.inputContainer}>
                        <MaterialIcons name="account-box" size={20} color="#666666" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter account number"
                          keyboardType="numeric"
                          value={formData.BankDetails.accountNo}
                          onChangeText={(value) => handleInputChange("accountNo", value)}
                        />
                      </View>
                      {errors.accountNo && <Text style={styles.errorText}>{errors.accountNo}</Text>}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>IFSC Code</Text>
                      <View style={styles.inputContainer}>
                        <MaterialIcons name="code" size={20} color="#666666" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter IFSC code"
                          autoCapitalize="characters"
                          value={formData.BankDetails.ifsc_code}
                          onChangeText={(value) => handleInputChange("ifsc_code", value)}
                        />
                      </View>
                      {errors.ifsc_code && <Text style={styles.errorText}>{errors.ifsc_code}</Text>}
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Submit Request</Text>
                      <MaterialIcons name="send" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
      <BottomTab showDetails={false} />
    </SafeAreaView>


  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 80,
    paddingHorizontal: 16,
    backgroundColor: "#E0E0E0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  balanceLabel: {
    fontSize: 16,
    color: "#666666",
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginVertical: 8,
  },
  withdrawButton: {
    backgroundColor: "#000000",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  withdrawButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginRight: 8,
  },
  content: {
    flex: 1,
    marginTop: -40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 10,
    color: "#666666",
    fontSize: 13,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorText: {
    color: "#000000",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#000000",
    borderRadius: 6,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  historyList: {
    marginBottom: 32,
  },
  historyItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyItemDetails: {
    marginLeft: 12,
  },
  historyItemMethod: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  historyItemDate: {
    fontSize: 12,
    color: "#666666",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  successBadge: {
    backgroundColor: "#E0E0E0",
  },
  pendingBadge: {
    backgroundColor: "#F5F5F5",
  },
  rejectedBadge: {
    backgroundColor: "#CCCCCC",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  historyItemBody: {
    marginTop: 8,
  },
  amountText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyStateText: {
    marginTop: 10,
    color: "#666666",
    fontSize: 13,
    textAlign: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    width: "90%",
    maxHeight: "80%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  formContainer: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  inputPrefix: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#000000",
    fontWeight: "600",
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#000000",
  },
  errorText: {
    color: "#000000",
    fontSize: 12,
    marginTop: 4,
  },
  methodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  methodOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 6,
    marginRight: 8,
  },
  methodOptionActive: {
    backgroundColor: "#000000",
  },
  methodText: {
    marginLeft: 8,
    color: "#000000",
    fontWeight: "600",
  },
  methodTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#000000",
    borderRadius: 6,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 8,
  },
  serverError: {
    backgroundColor: "#000000",
    borderRadius: 6,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  serverErrorText: {
    color: "#FFFFFF",
    marginLeft: 8,
    flex: 1,
  },
  calculationCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  calculationLabel: {
    fontSize: 12,
    color: "#666666",
  },
  calculationValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  calculationValueNegative: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  divider: {
    height: 1,
    backgroundColor: "#CCCCCC",
    marginVertical: 8,
  },
  calculationTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  calculationTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E0E0E0",
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
})