import { useState, useEffect, useCallback } from "react"
import {
    View,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Alert,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    Modal,
    StatusBar,
    TextInput,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import axios from "axios"
import RazorpayCheckout from "react-native-razorpay"
import { LinearGradient } from "expo-linear-gradient"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
// import LottieView from "lottie-react-native"
import useFetchProfile from '../hooks/useFetchProfile'
import useGetCoupons from "../hooks/GetUnlockCopons"

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.95
const API_URL_WEB = "https://www.webapi.olyox.com"

export function Recharge() {
    const navigation = useNavigation()
    const { restaurant, refetch } = useFetchProfile()

    const { coupons, loading: couponsLoading, refresh: refreshCoupons } = useGetCoupons()

    // State
    const [refreshing, setRefreshing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [memberships, setMemberships] = useState([])
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [paymentStatus, setPaymentStatus] = useState("idle")
    const [statusMessage, setStatusMessage] = useState("")
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showCouponModal, setShowCouponModal] = useState(false)
    const [couponCode, setCouponCode] = useState("")
    const [appliedCoupon, setAppliedCoupon] = useState(null)
    const [validatingCoupon, setValidatingCoupon] = useState(false)
    const [couponError, setCouponError] = useState("")

    const getBadgeColor = (level) => {
        switch (level) {
            case 1: return { bg: '#E8F5E9', text: '#4CAF50' }
            case 2: return { bg: '#E3F2FD', text: '#2196F3' }
            case 3: return { bg: '#FFF3E0', text: '#FF9800' }
            default: return { bg: '#E8F5E9', text: '#4CAF50' }
        }
    }

    // Fetch membership plans
    const fetchMembershipPlans = useCallback(async () => {
        try {
            setLoading(true)
            const { data } = await axios.get(`${API_URL_WEB}/api/v1/membership-plans`)

            if (!data || !data.data) {
                throw new Error("Invalid response format")
            }

            const filter = data.data.filter((item) => item.category === 'tiffin')
            // Add some features to each plan for better UI
            const enhancedPlans = filter.map((plan) => ({
                ...plan,
                features: [
                    `Valid for ${plan.validityDays} ${plan.whatIsThis || 'days'} from the date of activation.`,
                    `Earn up to ₹${plan.HowManyMoneyEarnThisPlan} through food order bookings.`,
                    "Enjoy unlimited booking requests — no daily limits!",
                    "Get priority access to our dedicated customer support team.",
                    "⚠️ Note: Once you reach your maximum earning limit, the plan will automatically expire."
                ],
            }));


            setMemberships(enhancedPlans)
        } catch (error) {
            console.error("Error fetching plans:", error)
            Alert.alert(
                "Connection Error",
                "Unable to fetch membership plans. Please check your internet connection and try again."
            )
        } finally {
            setLoading(false)
        }
    }, [])

    // Refresh user data after successful payment
    const refreshUserData = useCallback(async () => {
        try {
            await refetch()
        } catch (error) {
            console.error("Error refreshing user data:", error)
        }
    }, [refetch])

    // Initial load
    useEffect(() => {
        fetchMembershipPlans()
        refreshCoupons()
    }, [fetchMembershipPlans, refreshCoupons])

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await Promise.all([fetchMembershipPlans(), refreshCoupons()])
        } catch (error) {
            console.error("Error during refresh:", error)
            Alert.alert("Refresh Failed", "Unable to refresh data. Please try again.")
        } finally {
            setRefreshing(false)
        }
    }, [fetchMembershipPlans, refreshCoupons])

    // Handle plan selection
    const handlePlanSelect = useCallback((plan) => {
        if (!plan) return

        setSelectedPlan(plan)
        // Reset coupon when plan changes
        setCouponCode("")
        setAppliedCoupon(null)
        setCouponError("")
    }, [])

    // Display payment status modal
    const displayPaymentModal = useCallback(
        (status, message) => {
            setPaymentStatus(status)
            setStatusMessage(message || "")
            setShowPaymentModal(true)

            // Auto-hide success/cancel modals after 2.5 seconds
            if (status === "success" || status === "cancelled") {
                setTimeout(() => {
                    setShowPaymentModal(false)

                    // Navigate back on success after modal closes
                    if (status === "success") {
                        setTimeout(() => {
                            navigation.goBack()
                        }, 500)
                    }
                }, 2500)
            }
        },
        [navigation],
    )

    // Validate coupon
    const validateCoupon = useCallback(() => {
        if (!couponCode.trim()) {
            setCouponError("Please enter a coupon code")
            return
        }

        setValidatingCoupon(true)
        setCouponError("")

        try {
            // Find the coupon in available coupons
            const foundCoupon = coupons?.find(
                (coupon) => coupon.code.toLowerCase() === couponCode.trim().toLowerCase() && coupon.isActive
            )

            if (foundCoupon) {
                setAppliedCoupon(foundCoupon)
                setShowCouponModal(false)
                Alert.alert(
                    "Coupon Applied",
                    `Coupon "${foundCoupon.code}" for ${foundCoupon.discount}% discount has been applied!`
                )
            } else {
                setCouponError("Invalid coupon code or coupon has expired")
            }
        } catch (error) {
            console.error("Error validating coupon:", error)
            setCouponError("An error occurred while validating the coupon")
        } finally {
            setValidatingCoupon(false)
        }
    }, [couponCode, coupons])

    // Remove applied coupon
    const removeCoupon = useCallback(() => {
        setAppliedCoupon(null)
        setCouponCode("")
    }, [])

    // Calculate discounted price
    const calculateDiscountedPrice = useCallback(() => {
        if (!selectedPlan) return 0

        try {
            if (appliedCoupon) {
                const discountAmount = (selectedPlan.price * appliedCoupon.discount) / 100
                const discountedPrice = selectedPlan.price - discountAmount
                return parseFloat(discountedPrice.toFixed(1)) // returns number like 9.9
            }

            return parseFloat(selectedPlan.price.toFixed(1))
        } catch (error) {
            console.error("Error calculating price:", error)
            return selectedPlan.price || 0
        }
    }, [selectedPlan, appliedCoupon])

    // Initiate Razorpay payment
    const initiatePayment = useCallback(async () => {
        if (!selectedPlan) {
            Alert.alert("Error", "Please select a membership plan")
            return
        }

        if (!restaurant?.restaurant_BHID) {
            Alert.alert("Error", "Restaurant information is missing. Please try again later.")
            return
        }

        setLoading(true)
        setPaymentStatus("loading")
        setShowPaymentModal(true)

        try {
            // Construct URL with or without coupon
            const baseUrl = `https://appapi.olyox.com/api/v1/rider/recharge-wallet/${selectedPlan._id}/${restaurant?.restaurant_BHID}`
            const urlWithParams = appliedCoupon ? `${baseUrl}?coupon=${appliedCoupon.code}&type=tiffin` : baseUrl

            const response = await axios.get(urlWithParams)

            if (!response.data || !response.data.order) {
                throw new Error("Invalid response from server")
            }

            const options = {
                description: `${selectedPlan.title} Membership`,
                image: "https://www.olyox.com/assets/logo-CWkwXYQ_.png",
                currency: response.data.order.currency,
                key: "rzp_live_zD1yAIqb2utRwp",
                // key: "rzp_test_7atYe4nCssW6Po",
                amount: response.data.order.amount,
                name: "Olyox",
                order_id: response.data.order.id,
                prefill: {
                    name: restaurant?.restaurant_name || "",
                    contact: restaurant?.restaurant_contact || "",
                },
                theme: { color: "#DA2E2A" },
            }

            const paymentResponse = await RazorpayCheckout.open(options)

            if (!paymentResponse || !paymentResponse.razorpay_payment_id) {
                throw new Error("Payment failed or was cancelled")
            }

            const verifyResponse = await axios.post(`https://appapi.olyox.com/api/v1/rider/recharge-verify/${restaurant?.restaurant_BHID}`, {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
            })

            const rechargeStatus = verifyResponse?.data?.rechargeData

            if (verifyResponse?.data?.message?.includes("successful") && rechargeStatus?.payment_approved) {
                await refreshUserData()
                displayPaymentModal("success", "Your payment was successful! Your membership has been activated.")
            } else {
                displayPaymentModal("failed", "Payment processed but verification failed. Please contact support.")
            }
        } catch (error) {
            console.error("Payment error:", error)

            // Handle different error scenarios
            if (error?.description === "Payment Cancelled" || error?.code === "PAYMENT_CANCELLED") {
                displayPaymentModal("cancelled", "You cancelled the payment. Please try again when you're ready.")
            } else if (error.response) {
                // Server responded with an error
                displayPaymentModal("failed", error.response.data?.message || "Payment failed. Please try again later.")
            } else if (error.request) {
                // Request made but no response received
                displayPaymentModal("failed", "Network error. Please check your internet connection and try again.")
            } else {
                // Other errors
                displayPaymentModal("failed", "Payment failed. Please check your payment method and try again.")
            }
        } finally {
            setLoading(false)
        }
    }, [selectedPlan, restaurant, displayPaymentModal, refreshUserData, appliedCoupon])

    // Handle coupon button press
    const handleCouponButtonPress = useCallback(() => {
        // Don't show coupon modal for free or Rs 1 plans
        if (selectedPlan && (selectedPlan.price <= 1)) {
            return
        }

        setShowCouponModal(true)
    }, [selectedPlan])

    // Render membership plan card
    const renderPlanCard = useCallback(
        (plan, index) => {
            if (!plan || !plan._id) return null

            const isSelected = selectedPlan?._id === plan._id

            return (
                <View key={plan._id} style={[styles.planCard, isSelected && styles.selectedPlanCard]}>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handlePlanSelect(plan)} style={styles.planCardTouchable}>
                        {/* Plan header */}
                        <LinearGradient
                            colors={isSelected ? ["#4F46E5", "#7C3AED"] : ["#64748B", "#475569"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.planHeader}
                        >
                            <Text style={styles.planTitle}>{plan.title || "Membership Plan"}</Text>
                            <View style={styles.priceBadge}>
                                <Text style={styles.priceText}>₹{plan.price || 0}</Text>
                            </View>
                        </LinearGradient>

                        {/* Plan features */}
                        <View style={styles.planContent}>
                            <Text style={styles.validityText}>
                                {plan.validityDays || 0} {plan.whatIsThis || "days"} done membership
                            </Text>
                            <Text style={[styles.validityText, { fontSize: 12 }]}>
                                {plan?.description || ""}
                            </Text>


                            {plan.features?.map((feature, idx) => (
                                <View key={idx} style={styles.featureRow}>
                                    <Icon name="check-circle" size={18} color="#4F46E5" />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Selection indicator */}
                        {isSelected && (
                            <View style={styles.selectedIndicator}>
                                <Icon name="check-circle" size={24} color="#4F46E5" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            )
        },
        [selectedPlan, handlePlanSelect],
    )

    // Payment status modal
    const renderPaymentStatusModal = () => (
        <Modal
            visible={showPaymentModal}
            transparent
            animationType="fade"
            onRequestClose={() => {
                if (paymentStatus !== "loading") {
                    setShowPaymentModal(false)
                }
            }}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {paymentStatus === "loading" && (
                        <>
                            {/* <LottieView
                                source={require("./payment-loading.json")}
                                autoPlay
                                loop
                                style={styles.lottieAnimation}
                            /> */}
                            <Text style={styles.modalTitle}>Processing Payment</Text>
                            <Text style={styles.modalMessage}>Please wait while we process your payment...</Text>
                        </>
                    )}

                    {paymentStatus === "success" && (
                        <>
                            {/* <LottieView
                                source={require("./payment-success.json")}
                                autoPlay
                                loop={false}
                                style={styles.lottieAnimation}
                            /> */}
                            <Text style={styles.modalTitle}>Payment Successful!</Text>
                            <Text style={styles.modalMessage}>{statusMessage}</Text>
                        </>
                    )}

                    {paymentStatus === "failed" && (
                        <>
                            {/* <LottieView
                                source={require("./payment-failed.json")}
                                autoPlay
                                loop={false}
                                style={styles.lottieAnimation}
                            /> */}
                            <Text style={styles.modalTitle}>Payment Failed</Text>
                            <Text style={styles.modalMessage}>{statusMessage}</Text>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setShowPaymentModal(false)}>
                                <Text style={styles.modalButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {paymentStatus === "cancelled" && (
                        <>
                            <Icon name="close-circle-outline" size={70} color="#64748B" />
                            <Text style={styles.modalTitle}>Payment Cancelled</Text>
                            <Text style={styles.modalMessage}>{statusMessage}</Text>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    )

    // Coupon modal
    const renderCouponModal = () => (
        <Modal
            visible={showCouponModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCouponModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Apply Coupon</Text>
                    <Text style={styles.modalMessage}>Enter a valid coupon code to get discount</Text>

                    <View style={styles.couponInputContainer}>
                        <TextInput
                            style={styles.couponInput}
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChangeText={setCouponCode}
                            autoCapitalize="characters"
                            editable={!validatingCoupon}
                        />
                        {validatingCoupon && (
                            <ActivityIndicator size="small" color="#4F46E5" style={styles.inputLoader} />
                        )}
                    </View>

                    {couponError ? <Text style={styles.errorText}>{couponError}</Text> : null}

                    <View style={styles.couponButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.couponButton, styles.cancelCouponButton]}
                            onPress={() => setShowCouponModal(false)}
                        >
                            <Text style={styles.cancelCouponButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.couponButton, styles.applyCouponButton, validatingCoupon && styles.disabledButton]}
                            onPress={validateCoupon}
                            disabled={validatingCoupon}
                        >
                            <Text style={styles.applyCouponButtonText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#0F172A" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Membership Plans </Text>
                    <Text style={styles.headerSubtitle}>Choose a plan that suits your needs</Text>
                </View>
            </View>

            {/* Content */}
            {loading && !refreshing && memberships.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading membership plans...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
                >
                    {memberships.length === 0 && !loading ? (
                        <View style={styles.emptyStateContainer}>
                            <Icon name="package-variant" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyStateTitle}>No Plans Available</Text>
                            <Text style={styles.emptyStateMessage}>
                                We couldn't find any membership plans. Pull down to refresh or try again later.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.plansContainer}>{memberships.map(renderPlanCard)}</View>
                    )}

                    {/* Spacer for bottom button */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Coupon and Payment button */}
            {selectedPlan && (
                <View style={styles.paymentButtonContainer}>
                    {/* Coupon section (don't show for free/Rs 1 plans) */}
                    {selectedPlan.price > 1 && (
                        <View style={styles.couponSection}>
                            {appliedCoupon ? (
                                <View style={styles.appliedCouponContainer}>
                                    <View style={styles.appliedCouponInfo}>
                                        <Icon name="tag" size={18} color="#4F46E5" />
                                        <Text style={styles.appliedCouponText}>
                                            <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                                            {" applied for "}{appliedCoupon.discount}% off
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponButton}>
                                        <Icon name="close" size={18} color="#64748B" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.couponButton} onPress={handleCouponButtonPress}>
                                    <Icon name="tag-outline" size={18} color="#4F46E5" />
                                    <Text style={styles.couponButtonText}>Apply Coupon</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Payment button */}
                    <TouchableOpacity
                        style={[styles.paymentButton, loading && styles.paymentButtonDisabled]}
                        onPress={initiatePayment}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={["#4F46E5", "#7C3AED"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.paymentButtonGradient}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Icon name="credit-card-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.paymentButtonText}>
                                        Pay ₹{calculateDiscountedPrice()} + ₹{(calculateDiscountedPrice() * 0.18).toFixed(2)} (18% GST) = ₹{(calculateDiscountedPrice() * 1.18).toFixed(2)} with Razorpay
                                        {appliedCoupon && (
                                            <Text style={styles.discountText}>
                                                {' '} (Original: ₹{selectedPlan.price}, Discount: {appliedCoupon.discount}%)
                                            </Text>
                                        )}
                                    </Text>



                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {/* Payment status modal */}
            {renderPaymentStatusModal()}

            {/* Coupon modal */}
            {renderCouponModal()}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#64748B",
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    plansContainer: {
        alignItems: "center",
    },
    planCard: {
        width: CARD_WIDTH,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    selectedPlanCard: {
        borderWidth: 2,
        borderColor: "#4F46E5",
    },
    planCardTouchable: {
        width: "100%",
    },
    planHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    priceBadge: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    priceText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    planContent: {
        padding: 16,
    },
    validityText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 12,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    featureText: {
        fontSize: 14,
        color: "#475569",
        marginLeft: 8,
    },
    selectedIndicator: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 2,
    },
    paymentButtonContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    couponSection: {
        marginBottom: 12,
    },
    couponButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    couponButtonText: {
        fontSize: 14,
        color: "#4F46E5",
        fontWeight: "600",
        marginLeft: 6,
    },
    appliedCouponContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    appliedCouponInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    appliedCouponText: {
        fontSize: 14,
        color: "#334155",
        marginLeft: 6,
    },
    appliedCouponCode: {
        fontWeight: "700",
        color: "#4F46E5",
    },
    removeCouponButton: {
        padding: 4,
    },
    paymentButton: {
        borderRadius: 12,
        overflow: "hidden",
    },
    paymentButtonDisabled: {
        opacity: 0.7,
    },
    paymentButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
    },
    paymentButtonText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 8,
    },
    discountText: {
        fontSize: 12,
        opacity: 0.9,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: "#64748B",
        marginTop: 12,
    },
    emptyStateContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginTop: 20,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#334155",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateMessage: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        width: "90%",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
    },
    lottieAnimation: {
        width: 120,
        height: 120,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    modalMessage: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 20,
    },
    modalButton: {
        backgroundColor: "#4F46E5",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    couponInputContainer: {
        width: "100%",
        marginTop: 16,
        marginBottom: 8,
        position: "relative",
    },
    couponInput: {
        width: "100%",
        height: 48,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: "#F8FAFC",
    },
    inputLoader: {
        position: "absolute",
        right: 16,
        top: 14,
    },
    errorText: {
        color: "#EF4444",
        fontSize: 12,
        marginBottom: 8,
        alignSelf: "flex-start",
    },
    couponButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginTop: 16,
    },
    couponButton: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 6,
    },
    cancelCouponButton: {
        backgroundColor: "#F1F5F9",
    },
    cancelCouponButtonText: {
        color: "#64748B",
        fontSize: 16,
        fontWeight: "600",
    },
    applyCouponButton: {
        backgroundColor: "#4F46E5",
    },
    applyCouponButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    disabledButton: {
        opacity: 0.6,
    },
})

