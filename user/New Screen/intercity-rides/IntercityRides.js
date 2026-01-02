"use client";

import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert, Platform } from "react-native";
import { useState, useEffect } from "react";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import { ChevronLeft, Calendar, MapPin, Check, Users, Snowflake, Car, AlertTriangle, XCircle, RefreshCcw } from "lucide-react-native";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TextInput } from "react-native";
import { find_me } from "../../utils/helpers";

const { width } = Dimensions.get('window');

export default function IntercityRides() {
    const navigation = useNavigation();
    const route = useRoute();
    const {
        origin,
        destination,
        isRental,
        rentalHours,
        estimatedKm,
        selectedRide,
        routeInfo,
        dropoff,
        pickup,
        price,
        isLater
    } = route.params || {};

    console.log("price", price)
    console.log(" isRental", isRental)

    console.log("dropoff", route.params)
    // === Validate required params ===
    useEffect(() => {
        if (!origin || !destination || !selectedRide || !routeInfo || !dropoff || !pickup) {
            Alert.alert("Error", "Missing ride information. Please go back and select a ride again.");
            navigation.goBack();
        }
    }, []);

    // === State ===
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [rideTiming, setRideTiming] = useState({ leaveNow: false, scheduleRide: true });
    const [goingDateTime, setGoingDateTime] = useState(new Date());
    const [tempDate, setTempDate] = useState(new Date());
    const [userData, setUserData] = useState(null);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    // === Initialize default pickup time (+32 mins) ===
    useEffect(() => {
        const now = new Date();
        const goingTime = new Date(now);
        goingTime.setMinutes(now.getMinutes() + 32);
        setGoingDateTime(goingTime);
    }, []);

    // === Fetch user data ===
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await find_me();
                setUserData(data.user);
            } catch (error) {
                console.error('Error fetching user:', error);
            }
        };
        fetchUser();
    }, []);

    // === Handle ride timing ===
    const handleTimingChange = (type) => {
        setRideTiming({ leaveNow: type === "leaveNow", scheduleRide: type === "scheduleRide" });
    };

    // === Format date/time (IST) ===
    const formatIndianDateTime = (date) => {
        return date.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    };

    // === DateTime Picker Handlers ===
    const handleDateTimeChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            if (event.type === "dismissed") {
                setShowDatePicker(false);
                setShowTimePicker(false);
                return;
            }
            if (showDatePicker && selectedDate) {
                setShowDatePicker(false);
                setTempDate(new Date(selectedDate));
                setTimeout(() => setShowTimePicker(true), 100);
            } else if (showTimePicker && selectedDate) {
                setShowTimePicker(false);
                setGoingDateTime(new Date(selectedDate));
            }
        } else {
            if (event.type === "set" && selectedDate) {
                setTempDate(new Date(selectedDate));
            }
        }
    };

    const openPicker = () => {
        setTempDate(new Date(goingDateTime));
        if (Platform.OS === 'android') {
            setShowDatePicker(true);
        } else {
            setPickerVisible(true);
        }
    };

    const [pickerVisible, setPickerVisible] = useState(false);
    const confirmPicker = () => {
        setGoingDateTime(new Date(tempDate));
        setPickerVisible(false);
    };
    const cancelPicker = () => {
        setPickerVisible(false);
        setShowDatePicker(false);
        setShowTimePicker(false);
    };

    // === Truncate long location names ===
    const truncateLocation = (text, maxWords = 6) => {
        if (!text) return "";
        const words = text.trim().split(/\s+/);
        return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "..." : text;
    };

    // === Pricing Logic ===
    const rawBase = isRental
        ? price?.original_price
        : price?.original_price || price?.total_fare || 0;

    const basePrice = rawBase - (price?.cashback_applied || 0);
    const couponDiscount = appliedCoupon?.amount ?? 0;

    let tripPrice = 0;
    let finalPrice = 0;
    let extraPerMin = 3;
    let extraPerKm = 13;

    if (isRental) {
        const hoursPrice = basePrice;

        tripPrice = hoursPrice;
        finalPrice = tripPrice;
    } else {
        tripPrice = basePrice;
        finalPrice = Math.max(0, tripPrice - couponDiscount);
    }

    // === Distance & Duration ===
    const distanceKm = isRental ? estimatedKm : (estimatedKm || 480);
    const totalMins = isRental ? rentalHours * 60 : (routeInfo?.durationMins || price?.duration_mins || 0);
    const hours = Math.floor(totalMins / 60);
    const minutes = Math.round(totalMins % 60);
    const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // === Step Navigation ===
    const handleStepNavigation = (step) => {
        if (step >= 1 && step <= 2) setCurrentStep(step);
    };

    // === Submit Booking ===
    const handleSubmit = async () => {
        try {
            let finalUserName = userData?.name || "Guest User";

            if (!userData?.name || ["Guest User", "Test User Account"].includes(userData.name)) {
                const enteredName = await new Promise((resolve) => {
                    Alert.prompt(
                        "Enter Your Name",
                        "Please enter your name to continue with booking.",
                        [
                            { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
                            { text: "OK", onPress: (name) => resolve(name) },
                        ],
                        "plain-text"
                    );
                });

                if (!enteredName?.trim()) {
                    Alert.alert("Booking Cancelled", "Name is required to proceed.");
                    return;
                }
                finalUserName = enteredName.trim();
            }

            const bookingDetails = {
                tripType: isRental ? "rental" : "one-way",
                rideCategory: rideTiming.leaveNow ? "leave-now" : "scheduled",
                pickup: { ...origin, description: pickup },
                dropoff: { ...destination, description: dropoff },
                isLater: isLater,
                vehicle: {
                    id: selectedRide?.vehicleId,
                    name: selectedRide?.vehicleName,
                    image: selectedRide?.vehicleImage,
                },
                userName: finalUserName,
                passengerId: userData?._id,
                goingDateTime: goingDateTime.toISOString(),
                returnDateTime: null,
                numberOfDays: 1,
                distance: distanceKm,
                duration: totalMins,
                isRental: isRental || false,
                rentalHours: isRental ? rentalHours : null,
                estimatedKm: isRental ? estimatedKm : null,
                pricing: {
                    basePrice,
                    tripPrice,
                    finalPrice,
                    extraPerMin: isRental ? extraPerMin : null,
                    extraPerKm: isRental ? extraPerKm : null,
                },
                coupon: appliedCoupon?.code ?? null,
            };

            const response = await axios.post(
                "https://www.appv2.olyox.com/api/v1/new/book-intercity-ride",
                bookingDetails
            );
            
            Alert.alert(
                "Success 🎉",
                `Your ${isRental ? "rental" : "intercity"} ride has been booked!\n\nCheck in the *Intercity* tab. Refresh to see update.`
            );

            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Home", params: { id: response?.data?.ride?._id } }],
                })
            );
        } catch (error) {
            console.error("Booking error:", error);
            Alert.alert("Error", error.response?.data?.message || "Booking failed. Try again.");
        }
    };

    // === Step Indicator ===
    const StepIndicator = () => (
        <View style={styles.stepIndicator}>
            {[1, 2].map(step => (
                <View key={step} style={styles.stepContainer}>
                    <TouchableOpacity
                        style={[styles.stepCircle, currentStep >= step ? styles.stepActive : styles.stepInactive]}
                        onPress={() => handleStepNavigation(step)}
                    >
                        {currentStep > step ? (
                            <Check size={16} color="#fff" />
                        ) : (
                            <Text style={[styles.stepNumber, currentStep >= step ? styles.stepNumberActive : styles.stepNumberInactive]}>
                                {step}
                            </Text>
                        )}
                    </TouchableOpacity>
                    {step < 2 && (
                        <View style={[styles.stepLine, currentStep > step ? styles.stepLineActive : styles.stepLineInactive]} />
                    )}
                </View>
            ))}
        </View>
    );

    // === Step 1: Schedule ===
    const Step1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Schedule Your {isRental ? "Rental" : "Ride"}</Text>
            <Text style={styles.optionSubtitle}>
                {isRental ? `${rentalHours} hours • ${estimatedKm} km` : "This is a one-way trip"}
            </Text>

            <TouchableOpacity style={styles.optionCard} onPress={() => handleTimingChange("scheduleRide")}>
                <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Schedule Ride</Text>
                    <Text style={styles.optionSubtitle}>Choose your preferred date and time</Text>
                </View>
                <View style={[styles.radioButton, rideTiming.scheduleRide && styles.radioSelected]}>
                    {rideTiming.scheduleRide && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>

            {rideTiming.scheduleRide && (
                <View style={styles.dateTimeSection}>
                    <Text style={styles.dateTimeTitle}>Pickup Date & Time</Text>
                    <TouchableOpacity style={styles.dateTimeButton} onPress={openPicker}>
                        <Calendar size={20} color="#000" />
                        <Text style={styles.dateTimeText}>{formatIndianDateTime(goingDateTime)}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={styles.nextButton} onPress={() => handleStepNavigation(2)}>
                <View style={styles.nextGradient}>
                    <Text style={styles.nextText}>Next</Text>
                </View>
            </TouchableOpacity>
        </View>
    );

    // === Step 2: Review & Book ===
    const Step2 = () => {
        const pickupLocation = truncateLocation(pickup, 6);
        const pickupCity = truncateLocation(pickup, 4);
        const dropoffLocation = truncateLocation(dropoff, 6);
        const dropoffCity = truncateLocation(dropoff, 4);

        return (
            <View style={styles.stepContent}>
                {/* Vehicle Card */}
                <View style={styles.vehicleCard}>
                    <View style={styles.vehicleInfo}>
                        <View style={styles.vehicleImageContainer}>
                            <Car size={40} color="#000" />
                        </View>
                        <View style={styles.vehicleDetails}>
                            <View style={styles.vehicleHeader}>
                                <Text style={styles.vehicleName}>
                                    {selectedRide?.vehicleName} {isRental ? "Rental" : isLater ? "Later" : "Intercity"}
                                </Text>
                                <Text style={styles.vehiclePrice}>₹{finalPrice.toFixed(2)}</Text>
                            </View>
                            <Text style={styles.featureText}>
                                {["sedan", "mini"].includes(selectedRide?.vehicleName?.toLowerCase()) ? "Swift Dzire / WagonR" : "Ertiga / Innova"}
                            </Text>
                            <View style={styles.vehicleFeatures}>
                                <View style={styles.featureItem}>
                                    <Users size={16} color="#000" />
                                    <Text style={styles.featureText}>
                                        {["sedan", "mini"].includes(selectedRide?.vehicleName?.toLowerCase()) ? "4" : "6"}
                                    </Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <Snowflake size={16} color="#000" />
                                    <Text style={styles.featureText}>AC</Text>
                                </View>
                                <Text style={styles.durationText}>{durationText} • {distanceKm} km</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Trip Details */}
                <View style={styles.tripDetailsCard}>
                    <Text style={styles.tripType}>
                        {isRental ? `Rental • ${rentalHours} hrs` : `One-way to ${dropoffCity}`}
                    </Text>
                    <View style={styles.tripStatus}>
                        <Text style={styles.statusLabel}>Reserved</Text>
                    </View>
                    <View style={styles.tripDates}>
                        <View style={styles.dateRow}>
                            <Calendar size={16} color="#000" />
                            <Text style={styles.dateText}>{formatIndianDateTime(goingDateTime)}</Text>
                        </View>
                    </View>

                    <View style={styles.routeContainer}>
                        <Text style={styles.routeSectionTitle}>Pick-up</Text>
                        <View style={styles.routePoint}>
                            <View style={styles.routeDot} />
                            <View style={styles.routeInfo}>
                                <Text style={styles.routeLocation}>{pickupLocation}</Text>
                                <Text style={styles.routeCity}>{pickupCity}</Text>
                            </View>
                        </View>
                        {!isRental && (
                            <>
                                <View style={styles.routeLine} />
                                <View style={styles.routePoint}>
                                    <View style={[styles.routeDot, styles.routeDotEmpty]} />
                                    <View style={styles.routeInfo}>
                                        <Text style={styles.routeLocation}>{dropoffLocation}</Text>
                                        <Text style={styles.routeCity}>{dropoffCity}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Price Breakdown */}
                <View style={styles.breakdownCard}>
                    <View style={styles.breakdownHeader}>
                        <Text style={styles.breakdownTitle}>Your charges explained</Text>
                    </View>

                    {isRental ? (
                        <>
                            <View style={styles.priceRow}>
                                <View>
                                    <Text style={styles.priceLabel}>Base fare ({rentalHours} hrs)</Text>
                                    <Text style={styles.priceSubLabel}>₹{basePrice?.toFixed(2)}/hr</Text>
                                </View>
                                <Text style={styles.priceValue}>₹{(rentalHours * basePrice).toFixed(2)}</Text>
                            </View>

                        </>
                    ) : (
                        <View style={styles.priceRow}>
                            <View>
                                <Text style={styles.priceLabel}>Base price</Text>
                                <Text style={styles.priceSubLabel}>{distanceKm} km</Text>
                            </View>
                            <Text style={styles.priceValue}>₹{basePrice.toFixed(2)}</Text>
                        </View>
                    )}

                    {appliedCoupon && (
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Coupon ({appliedCoupon.code})</Text>
                            <Text style={styles.priceValue}>-₹{appliedCoupon.amount.toFixed(2)}</Text>
                        </View>
                    )}

                    <View style={styles.separator} />
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, styles.totalLabel]}>Total price</Text>
                        <Text style={[styles.priceValue, styles.totalValue]}>₹{finalPrice.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Coupon */}
                <View style={styles.couponSection}>
                    <View style={styles.couponRow}>
                        <TextInput
                            value={couponCode}
                            onChangeText={setCouponCode}
                            placeholder="Have a coupon?"
                            placeholderTextColor="#999"
                            style={styles.couponInput}
                            autoCapitalize="characters"
                        />
                        <TouchableOpacity
                            style={[styles.applyBtn, { opacity: couponCode.trim().length ? 1 : 0.6 }]}
                            disabled={!couponCode.trim().length}
                            onPress={() => {
                                const code = couponCode.trim().toUpperCase();
                                const map = { SAVE100: 100, SAVE250: 250, ROUND10: Math.round(tripPrice * 0.1) };
                                const amount = map[code];
                                if (amount) {
                                    setAppliedCoupon({ code, amount });
                                    Alert.alert("Success", `₹${amount} saved with ${code}!`);
                                } else {
                                    setAppliedCoupon(null);
                                    Alert.alert("Invalid", "Coupon code not recognized.");
                                }
                                setCouponCode("");
                            }}
                        >
                            <Text style={styles.applyBtnText}>{appliedCoupon ? "Replace" : "Apply"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Things to Keep in Mind */}
                <View style={styles.thingsToMindCard}>
                    <Text style={styles.thingsToMindTitle}>Things to keep in mind</Text>

                    <View style={styles.mindItem}>
                        <View style={styles.mindIcon}><Text style={styles.mindIconText}>📞</Text></View>
                        <View style={styles.mindContent}>
                            <Text style={styles.mindItemTitle}>Call Support For Fast Booking</Text>
                            <Text style={styles.mindItemSubtitle}>Call at 011-41236789</Text>
                        </View>
                    </View>

                    {isRental ? (
                        <>
                            <View style={styles.mindItem}>
                                <View style={styles.mindIcon}><AlertTriangle size={16} color="#000" /></View>
                                <View style={styles.mindContent}>
                                    <Text style={styles.mindItemTitle}>Extra charges apply</Text>
                                    <Text style={styles.mindItemSubtitle}>₹{extraPerMin}/min beyond {rentalHours} hrs • ₹{extraPerKm}/km beyond {estimatedKm} km</Text>
                                </View>
                            </View>
                            <View style={styles.mindItem}>
                                <View style={styles.mindIcon}><Text style={styles.mindIconText}>P</Text></View>
                                <View style={styles.mindContent}>
                                    <Text style={styles.mindItemTitle}>Parking & tolls extra</Text>
                                    <Text style={styles.mindItemSubtitle}>Pay driver directly for parking, tolls, or state taxes</Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.mindItem}>
                                <View style={styles.mindIcon}><AlertTriangle size={16} color="#000" /></View>
                                <View style={styles.mindContent}>
                                    <Text style={styles.mindItemTitle}>Tolls and interstate charges are extra</Text>
                                    <Text style={styles.mindItemSubtitle}>Final charges may vary based on route – pay driver directly</Text>
                                </View>
                            </View>
                            <View style={styles.mindItem}>
                                <View style={styles.mindIcon}><Text style={styles.mindIconText}>P</Text></View>
                                <View style={styles.mindContent}>
                                    <Text style={styles.mindItemTitle}>Parking charges</Text>
                                    <Text style={styles.mindItemSubtitle}>Extra charges apply for paid parking</Text>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={styles.mindItem}>
                        <View style={styles.mindIcon}><XCircle size={16} color="#000" /></View>
                        <View style={styles.mindContent}>
                            <Text style={styles.mindItemTitle}>Non-refundable fare</Text>
                            <Text style={styles.mindItemSubtitle}>Full amount charged even if trip is shorter than booked time/mileage.</Text>
                        </View>
                    </View>

                    <View style={styles.mindItem}>
                        <View style={styles.mindIcon}><RefreshCcw size={16} color="#000" /></View>
                        <View style={styles.mindContent}>
                            <Text style={styles.mindItemTitle}>Cancellation Policy</Text>
                            <Text style={styles.mindItemSubtitle}>Free cancellation up to 60 mins before pickup or before driver assignment.</Text>
                        </View>
                    </View>
                </View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNav}>
                    <TouchableOpacity style={styles.backButton} onPress={() => handleStepNavigation(1)}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
                        <View style={styles.nextGradient}>
                            <Text style={styles.nextText}>Book Now</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{currentStep === 1 ? "Schedule Ride" : "Review & Book"}</Text>
            </View>

            <StepIndicator />
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {currentStep === 1 && <Step1 />}
                {currentStep === 2 && <Step2 />}
            </ScrollView>

            {/* DateTime Picker (Android) */}
            {Platform.OS === 'android' ? (
                <>
                    {showDatePicker && (
                        <DateTimePicker
                            value={tempDate}
                            mode="date"
                            display="default"
                            onChange={handleDateTimeChange}
                            minimumDate={new Date()}
                        />
                    )}
                    {showTimePicker && (
                        <DateTimePicker
                            value={tempDate}
                            mode="time"
                            display="default"
                            onChange={handleDateTimeChange}
                        />
                    )}
                </>
            ) : (
                pickerVisible && (
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerSheet}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={cancelPicker}>
                                    <Text style={styles.modalHeaderBtn}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>Pickup Date & Time</Text>
                                <TouchableOpacity onPress={confirmPicker}>
                                    <Text style={[styles.modalHeaderBtn, { color: "#000" }]}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempDate}
                                mode="datetime"
                                display="spinner"
                                onChange={handleDateTimeChange}
                                minimumDate={new Date()}
                            />
                        </View>
                    </View>
                )
            )}
        </View>
    );
}

// === Styles remain unchanged (same as original) ===
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingTop: 50, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
    headerTitle: { fontSize: 20, fontWeight: "bold", marginLeft: 16, color: "#000" },
    stepIndicator: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 20, paddingHorizontal: 16, backgroundColor: "#fff" },
    stepContainer: { flexDirection: "row", alignItems: "center" },
    stepCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
    stepActive: { backgroundColor: "#000" },
    stepInactive: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#000" },
    stepNumber: { fontSize: 14, fontWeight: "bold" },
    stepNumberActive: { color: "#fff" },
    stepNumberInactive: { color: "#000" },
    stepLine: { width: 40, height: 2, marginHorizontal: 8 },
    stepLineActive: { backgroundColor: "#000" },
    stepLineInactive: { backgroundColor: "#e0e0e0" },
    scrollContent: { flex: 1 },
    stepContent: { paddingHorizontal: 16, paddingVertical: 20 },
    sectionTitle: { fontSize: width < 380 ? 18 : 22, fontWeight: "bold", marginBottom: 20, color: "#000" },
    optionSubtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
    optionCard: { flexDirection: "row", alignItems: "center", padding: 20, borderWidth: 2, borderColor: "#e0e0e0", borderRadius: 16, marginBottom: 16, backgroundColor: "#fff" },
    optionContent: { flex: 1 },
    optionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4, color: "#000" },
    radioButton: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#e0e0e0", justifyContent: "center", alignItems: "center" },
    radioSelected: { borderColor: "#000" },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#000" },
    dateTimeSection: { marginTop: 20, padding: 20, backgroundColor: "#fff", borderRadius: 16 },
    dateTimeTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, color: "#000" },
    dateTimeButton: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e0e0e0", marginBottom: 12, gap: 8 },
    dateTimeText: { flex: 1, fontSize: 14, fontWeight: "500", color: "#000" },
    vehicleCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e0e0e0" },
    vehicleInfo: { flexDirection: "row", alignItems: "flex-start" },
    vehicleImageContainer: { width: 60, height: 60, backgroundColor: "#fff", borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 16, borderWidth: 1, borderColor: "#e0e0e0" },
    vehicleDetails: { flex: 1 },
    vehicleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    vehicleName: { fontSize: 16, fontWeight: "bold", color: "#000" },
    vehiclePrice: { fontSize: 20, fontWeight: "bold", color: "#000" },
    featureText: { fontSize: 14, color: "#000", fontWeight: "500" },
    vehicleFeatures: { flexDirection: "row", justifyContent: "flex-start", marginTop: 10, alignItems: "center", gap: 12 },
    featureItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    durationText: { fontSize: 14, color: "#000", marginLeft: 8 },
    tripDetailsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e0e0e0" },
    tripType: { fontSize: 22, fontWeight: "bold", color: "#000", marginBottom: 12 },
    tripStatus: { marginBottom: 16 },
    statusLabel: { fontSize: 14, color: "#000", backgroundColor: "#e0e0e0", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
    tripDates: { marginBottom: 20 },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    dateText: { fontSize: 16, color: "#000", fontWeight: "600" },
    routeContainer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e0e0e0" },
    routeSectionTitle: { fontSize: 14, color: "#000", marginBottom: 12, fontWeight: "500" },
    routePoint: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
    routeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#000", marginTop: 4 },
    routeDotEmpty: { backgroundColor: "transparent", borderWidth: 2, borderColor: "#000" },
    routeLine: { width: 2, height: 40, backgroundColor: "#e0e0e0", marginLeft: 5, marginVertical: 8 },
    routeInfo: { flex: 1 },
    routeLocation: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 2 },
    routeCity: { fontSize: 14, color: "#000" },
    breakdownCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e0e0e0" },
    breakdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    breakdownTitle: { fontSize: 18, fontWeight: "bold", color: "#000" },
    priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 8 },
    priceLabel: { fontSize: 16, color: "#000" },
    priceSubLabel: { fontSize: 14, color: "#666", marginTop: 2 },
    priceValue: { fontSize: 16, fontWeight: "600", color: "#000" },
    totalLabel: { fontWeight: "bold", fontSize: 18 },
    totalValue: { fontWeight: "bold", fontSize: 18 },
    separator: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 12 },
    couponSection: { marginBottom: 20 },
    couponRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    couponInput: { flex: 1, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, backgroundColor: "#fff", fontSize: 16, color: "#000" },
    applyBtn: { backgroundColor: "#000", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
    applyBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    thingsToMindCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e0e0e0" },
    thingsToMindTitle: { fontSize: 18, fontWeight: "bold", color: "#000", marginBottom: 16 },
    mindItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, gap: 12 },
    mindIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center", flexShrink: 0 },
    mindIconText: { fontSize: 16, fontWeight: "bold", color: "#000" },
    mindContent: { flex: 1 },
    mindItemTitle: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 2 },
    mindItemSubtitle: { fontSize: 14, color: "#666", lineHeight: 20 },
    pickerContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
    pickerSheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e0e0e0" },
    modalHeaderBtn: { fontSize: 16, color: "#000", fontWeight: "600" },
    modalTitle: { fontSize: 16, color: "#000", fontWeight: "600" },
    bottomNav: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e0e0e0", gap: 12 },
    backButton: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center" },
    backButtonText: { color: "#000", fontSize: 16, fontWeight: "600" },
    nextButton: { flex: 2, borderRadius: 12, overflow: "hidden" },
    nextGradient: { flexDirection: "row", paddingVertical: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#000", gap: 8 },
    nextText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});