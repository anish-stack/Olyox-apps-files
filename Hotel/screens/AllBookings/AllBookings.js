
import { useCallback, useEffect, useState } from "react"
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    RefreshControl,
    Modal,
    Switch,
} from "react-native"
import { AntDesign, MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons"
import Layout from "../../components/Layout/Layout"
import axios from "axios"
import { useToken } from "../../context/AuthContext"
import { API_BASE_URL_V2 } from "../../constant/Api"
import styles from "./styles"
import CancelBookingModal from "./CancelBookingModel"

export default function AllBookings() {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtersVisible, setFiltersVisible] = useState(false)
    const [selectedFilter, setSelectedFilter] = useState({})
    const [searchBookingId, setSearchBookingId] = useState("")
    const [searchPhone, setSearchPhone] = useState("")
    const [refresh, setRefresh] = useState(false)
    const [cancelModel, setCancelModel] = useState(false)
    const [cancelBookingId, setCancelBookingId] = useState('')
    const [checkingLoading, setCheckingLoading] = useState(false)
    const [checkOutLoading, setCheckOutLoading] = useState(false)
    const { token } = useToken()

    useEffect(() => {
        fetchBookings()
    }, [selectedFilter]) // Removed unnecessary dependencies

    const fetchBookings = async () => {
        try {

            setLoading(true)
            const response = await axios.get(`${API_BASE_URL_V2}/get-bookings`, {
                headers: { Authorization: `Bearer ${token}` },
                params: selectedFilter,
            })
            const filterNotCancelBooking = response?.data?.data.filter((item) => item.status !== 'Cancelled')

            setBookings(filterNotCancelBooking || response.data.data || [])
        } catch (error) {
            if (error.response?.data?.message === "No bookings found matching the criteria") {
                setBookings([])
            } else {
                Alert.alert("Error", error.response?.data?.message || "Failed to fetch bookings")
                console.error("Error fetching bookings:", error.response?.data?.message || "Failed to fetch bookings")
            }

        } finally {
            setLoading(false)
        }
    }

    const toggleFilter = (key, value) => {
        setSelectedFilter((prev) => ({
            ...prev,
            [key]: prev[key] === value ? undefined : value,
        }))
    }

    const toggleBooleanFilter = (key) => {
        setSelectedFilter((prev) => ({
            ...prev,
            [key]: prev[key] === "true" ? "false" : "true",
        }))
    }

    const handleCheckIn = async (bookingId) => {
        try {
            setCheckingLoading(true)
            const response = await axios.post(
                `${API_BASE_URL_V2}/mark-check-in-booking?BookingId=${bookingId}`,
                { BookingId: bookingId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("response", response.data)
            Alert.alert("Check-In", `Booking ID: ${bookingId} checked in successfully.`);
            await fetchBookings()
            setCheckingLoading(false)

        } catch (error) {
            Alert.alert("Check-In Failed", error.response?.data?.message || "Something went wrong.");
            setCheckingLoading(false)

        }
    };

    const handleCheckOut = async (bookingId) => {
        try {
            setCheckOutLoading(true)

            const response = await axios.post(
                `${API_BASE_URL_V2}/mark-check-out-booking?BookingId=${bookingId}`,
                { BookingId: bookingId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("response", response.data)

            Alert.alert("Check-Out", `Booking ID: ${bookingId} checked out successfully.`);
            await fetchBookings()
            setCheckOutLoading(false)


        } catch (error) {
            Alert.alert("Check-Out Failed", error.response?.data?.message || "Something went wrong.");
            setCheckOutLoading(false)

        }
    };

    const handleOpenCancel = (id) => {
        setCancelBookingId(id)
        setCancelModel(true)
    }

    const handleAccept = async (id) => {
        try {
            const response = await axios.post(`${API_BASE_URL_V2}/accept-booking`, {
                Booking_id: id,
            });
            Alert.alert('Success ✅', 'Your booking has been successfully Confirmed.');
            await fetchBookings()


        } catch (error) {
            Alert.alert("Booking Not Confirmed", error.response?.data?.message, [{
                text: "OK",
                onPress: () => console.log('OK Pressed'),
            }])
        }
    }


    const handleCloseCancel = () => {
        setCancelBookingId('')
        fetchBookings()
        setCancelModel(false)
    }

    const clearFilters = () => {
        setSelectedFilter({})
        setSearchBookingId("")
        setSearchPhone("")
    }

    const applyBookingIdSearch = () => {
        if (searchBookingId) {
            setSelectedFilter((prev) => ({
                ...prev,
                Booking_id: searchBookingId,
            }))
        } else {
            const newFilters = { ...selectedFilter }
            delete newFilters.Booking_id
            setSelectedFilter(newFilters)
        }
    }

    const applyPhoneSearch = () => {
        if (searchPhone) {
            setSelectedFilter((prev) => ({
                ...prev,
                guestPhone: searchPhone,
            }))
        } else {
            const newFilters = { ...selectedFilter }
            delete newFilters.guestPhone
            setSelectedFilter(newFilters)
        }
    }
    const getIndiaDate = () => {
        const indiaTimeOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const nowUTC = new Date().getTime();
        return new Date(nowUTC + indiaTimeOffset).toDateString();
    };

    const handleRefresh = useCallback(() => {
        fetchBookings();
    }, [refresh]);

    const getStatusColor = (status) => {
        switch (status) {
            case "Confirmed":
                return "#4CAF50"
            case "Pending":
                return "#FFC107"
            case "Cancelled":
                return "#F44336"
            case "Checkout":
                return "#2196F3"
            default:
                return "#757575"
        }
    }
    const indiaDate = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });

    const renderActiveFilters = () => {
        const filters = []

        Object.entries(selectedFilter).forEach(([key, value]) => {
            if (value !== undefined) {
                let displayText

                switch (key) {
                    case "status":
                        displayText = `Status: ${value}`
                        break
                    case "Booking_id":
                        displayText = `ID: ${value}`
                        break
                    case "paymentMode":
                        displayText = `Payment: ${value}`
                        break
                    case "isUserCheckedIn":
                        displayText = value === "true" ? "Checked In" : "Not Checked In"
                        break
                    case "userCheckOutStatus":
                        displayText = value === "true" ? "Checked Out" : "Not Checked Out"
                        break
                    case "booking_payment_done":
                        displayText = value === "true" ? "Paid" : "Unpaid"
                        break
                    case "guestPhone":
                        displayText = `Phone: ${value}`
                        break
                    default:
                        displayText = `${key}: ${value}`
                }

                filters.push(
                    <View key={key} style={styles.activeFilterTag}>
                        <Text style={styles.activeFilterText}>{displayText}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                const newFilters = { ...selectedFilter }
                                delete newFilters[key]
                                setSelectedFilter(newFilters)
                                if (key === "Booking_id") setSearchBookingId("")
                                if (key === "guestPhone") setSearchPhone("")
                            }}
                        >
                            <AntDesign name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>,
                )
            }
        })

        return filters.length > 0 ? (
            <View style={styles.activeFiltersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {filters}
                    {filters.length > 0 && (
                        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                            <Text style={styles.clearFiltersText}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>
        ) : null
    }

    return (
        <Layout activeTab="bookings">
            <View style={styles.container}>
                <View style={styles.header}>
                    {/* <Text style={styles.headerTitle}>All Bookings</Text> */}
                    <TouchableOpacity style={styles.filterButton} onPress={() => setFiltersVisible(!filtersVisible)}>
                        <MaterialIcons name="filter-list" size={24} color="#fff" />
                        <Text style={styles.filterButtonText}>Filters</Text>
                    </TouchableOpacity>
                </View>

                {renderActiveFilters()}

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={filtersVisible}
                    onRequestClose={() => setFiltersVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filter Bookings</Text>
                                <TouchableOpacity onPress={() => setFiltersVisible(false)}>
                                    <AntDesign name="close" size={24} color="#c41e3a" />
                                </TouchableOpacity>
                            </View>


                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.filterSectionTitle}>Booking Status</Text>
                                <View style={styles.statusFiltersContainer}>
                                    {["Pending", "Confirmed", "Cancelled", "Checkout"].map((status) => (
                                        <TouchableOpacity
                                            key={status}
                                            style={[
                                                styles.statusFilterOption,
                                                selectedFilter.status === status && styles.selectedStatusFilter,
                                            ]}
                                            onPress={() => toggleFilter("status", status)}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusFilterText,
                                                    selectedFilter.status === status && styles.selectedStatusFilterText,
                                                ]}
                                            >
                                                {status}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.filterSectionTitle}>Payment Mode</Text>
                                <View style={styles.statusFiltersContainer}>
                                    {["Cash", "Online", "Card"].map((mode) => (
                                        <TouchableOpacity
                                            key={mode}
                                            style={[
                                                styles.statusFilterOption,
                                                selectedFilter.paymentMode === mode && styles.selectedStatusFilter,
                                            ]}
                                            onPress={() => toggleFilter("paymentMode", mode)}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusFilterText,
                                                    selectedFilter.paymentMode === mode && styles.selectedStatusFilterText,
                                                ]}
                                            >
                                                {mode}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.filterSectionTitle}>Booking ID</Text>
                                <View style={styles.searchContainer}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Enter Booking ID"
                                        value={searchBookingId}
                                        onChangeText={setSearchBookingId}
                                    />
                                    <TouchableOpacity style={styles.searchButton} onPress={applyBookingIdSearch}>
                                        <Text style={styles.searchButtonText}>Search</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.filterSectionTitle}>Guest Phone</Text>
                                <View style={styles.searchContainer}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Enter Guest Phone"
                                        value={searchPhone}
                                        onChangeText={setSearchPhone}
                                        keyboardType="phone-pad"
                                    />
                                    <TouchableOpacity style={styles.searchButton} onPress={applyPhoneSearch}>
                                        <Text style={styles.searchButtonText}>Search</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.filterSectionTitle}>Check-in Status</Text>
                                <View style={styles.switchContainer}>
                                    <Text style={styles.switchLabel}>
                                        {selectedFilter.isUserCheckedIn === "true" ? "Checked In" : "Not Checked In"}
                                    </Text>
                                    <Switch
                                        trackColor={{ false: "#767577", true: "#f8d7da" }}
                                        thumbColor={selectedFilter.isUserCheckedIn === "true" ? "#c41e3a" : "#f4f3f4"}
                                        ios_backgroundColor="#3e3e3e"
                                        onValueChange={() => toggleBooleanFilter("isUserCheckedIn")}
                                        value={selectedFilter.isUserCheckedIn === "true"}
                                    />
                                </View>

                                <Text style={styles.filterSectionTitle}>Check-out Status</Text>
                                <View style={styles.switchContainer}>
                                    <Text style={styles.switchLabel}>
                                        {selectedFilter.userCheckOutStatus === "true" ? "Checked Out" : "Not Checked Out"}
                                    </Text>
                                    <Switch
                                        trackColor={{ false: "#767577", true: "#f8d7da" }}
                                        thumbColor={selectedFilter.userCheckOutStatus === "true" ? "#c41e3a" : "#f4f3f4"}
                                        ios_backgroundColor="#3e3e3e"
                                        onValueChange={() => toggleBooleanFilter("userCheckOutStatus")}
                                        value={selectedFilter.userCheckOutStatus === "true"}
                                    />
                                </View>

                                <Text style={styles.filterSectionTitle}>Payment Status</Text>
                                <View style={styles.switchContainer}>
                                    <Text style={styles.switchLabel}>
                                        {selectedFilter.booking_payment_done === "true" ? "Payment Done" : "Payment Pending"}
                                    </Text>
                                    <Switch
                                        trackColor={{ false: "#767577", true: "#f8d7da" }}
                                        thumbColor={selectedFilter.booking_payment_done === "true" ? "#c41e3a" : "#f4f3f4"}
                                        ios_backgroundColor="#3e3e3e"
                                        onValueChange={() => toggleBooleanFilter("booking_payment_done")}
                                        value={selectedFilter.booking_payment_done === "true"}
                                    />
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                                        <Text style={styles.clearButtonText}>Clear All</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.applyButton} onPress={() => setFiltersVisible(false)}>
                                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#c41e3a" />
                        <Text style={styles.loadingText}>Loading bookings...</Text>
                    </View>
                ) : bookings.length > 0 ? (

                    <ScrollView refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refresh} />} style={styles.bookingsContainer}>
                        {bookings.map((booking) => (
                            <View key={booking._id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.bookingIdContainer}>
                                        <MaterialIcons name="confirmation-number" size={18} color="#c41e3a" />
                                        <Text style={styles.bookingId}>{booking.Booking_id}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                                        <Text style={styles.statusText}>{booking.status}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardDivider} />

                                <View style={styles.guestInfoContainer}>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            <Ionicons name="person" size={16} color="#c41e3a" />
                                            <Text style={styles.infoLabel}>Guest</Text>
                                            <Text style={styles.infoValue}>{booking.guestInformation[0]?.guestName || "N/A"}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Ionicons name="call" size={16} color="#c41e3a" />
                                            <Text style={styles.infoLabel}>Phone</Text>
                                            <Text style={styles.infoValue}>{booking.guestInformation[0]?.guestPhone || "N/A"}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            <FontAwesome5 name="money-bill-wave" size={16} color="#c41e3a" />
                                            {/* <Text style={styles.infoLabel}>Payment</Text> */}
                                            <Text style={styles.infoValue}>{booking.paymentMode}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="attach-money" size={14} color="#c41e3a" />
                                            <Text style={styles.infoLabel}>Room Books</Text>
                                            <Text style={styles.infoValue}>{booking.NumberOfRoomBooks}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Otp</Text>
                                            <Text style={styles.infoValue}>{booking.BookingOtp}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Total Guests</Text>
                                            <Text style={styles.infoValue}>{booking.totalGuests}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Guests Details</Text>
                                            <Text style={styles.infoValue}>{booking.numberOfGuestsDetails}</Text>
                                        </View>


                                    </View>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Mens</Text>
                                            <Text style={styles.infoValue}>{booking.no_of_mens}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Female</Text>
                                            <Text style={styles.infoValue}>{booking.no_of_womens}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Children</Text>
                                            <Text style={styles.infoValue}>{booking.no_of_child}</Text>
                                        </View>


                                    </View>

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            {/* <FontAwesome5 name="money-bill-wave" size={16} color="#c41e3a" /> */}
                                            <Text style={styles.infoLabel}>Room Type</Text>
                                            <Text style={styles.infoValue}>{booking.listing_id?.room_type}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="attach-money" size={16} color="#c41e3a" />
                                            <Text style={styles.infoLabel}>Amount</Text>
                                            <Text style={styles.infoValue}>₹{booking.final_price_according_to_days}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            <FontAwesome5 name="money-bill-wave" size={16} color="#c41e3a" />
                                            <Text style={styles.infoLabel}>checkIn</Text>
                                            <Text style={styles.infoValue}>{new Date(booking.checkInDate).toLocaleDateString('en-GB')}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <MaterialIcons name="attach-money" size={16} color="#c41e3a" />
                                            <Text style={styles.infoLabel}>Checkout</Text>
                                            <Text style={styles.infoValue}>{new Date(booking.checkOutDate).toLocaleDateString('en-GB')}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.paymentStatusContainer}>
                                        <Text
                                            style={[
                                                styles.paymentStatusText,
                                                { color: booking.booking_payment_done ? "#4CAF50" : "#F44336" },
                                            ]}
                                        >
                                            {booking.booking_payment_done ? "Payment Completed" : "Payment Pending"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardActions}>
                                    {!booking.isUserCheckedIn ? (
                                        new Date(booking.checkInDate).toLocaleDateString("en-IN") <= indiaDate ? (
                                            <View style={{ flexDirection: 'row', flex: 1, gap: 4 }}>

                                                {booking.status === 'Pending' || 'Cancelled' && (

                                                    <TouchableOpacity style={[styles.checkInButton, { flex: 1, backgroundColor: '#800080' }]} onPress={() => handleCheckIn(booking.Booking_id)}>
                                                        <Ionicons name="log-in-outline" size={18} color="#fff" />
                                                        <Text style={[styles.buttonText, { fontSize: 12 }]}>{checkingLoading ? 'Please Wait' : 'Check-In'}</Text>
                                                    </TouchableOpacity>

                                                )}

                                                {booking.status === 'Pending' && (
                                                    <>

                                                        <TouchableOpacity style={[styles.checkInButton, { flex: 1 }]} onPress={() => handleOpenCancel(booking.Booking_id)}>
                                                            <Ionicons name="close" size={18} color="#fff" />
                                                            <Text style={[styles.buttonText, { fontSize: 12 }]}>Reject</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity style={[styles.checkInButton, { flex: 1, backgroundColor: '#1CAC78' }]} onPress={() => handleAccept(booking.Booking_id)}>
                                                            <AntDesign name="check" size={18} color="#fff" />
                                                            <Text style={[styles.buttonText, { fontSize: 12 }]}>Accept</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                                {/* {booking.status !== 'Cancelled' || 'Confirmed' && (
                                                 
                                                )} */}



                                            </View>
                                        ) : (
                                            <Text style={styles.currentDateText}>
                                                Check-in available on: {new Date(booking.checkInDate).toDateString()}
                                            </Text>
                                        )
                                    ) : !booking.userCheckOutStatus ? (
                                        <TouchableOpacity style={styles.checkOutButton} onPress={() => handleCheckOut(booking.Booking_id)}>
                                            <Ionicons name="log-out-outline" size={18} color="#fff" />
                                            <Text style={styles.buttonText}>{checkOutLoading ? 'Please Wait' : 'Check-Out'}</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.completedContainer}>
                                            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                            <Text style={styles.completedText}>Stay Completed</Text>
                                        </View>
                                    )}
                                </View>



                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    bookings.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="hotel" size={64} color="#f8d7da" />
                            <Text style={styles.noDataText}>No bookings available</Text>
                            <Text style={styles.noDataSubText}>Try adjusting your filters</Text>
                            {Object.keys(selectedFilter).length > 0 && (
                                <TouchableOpacity style={styles.resetFiltersButton} onPress={clearFilters}>
                                    <Text style={styles.resetFiltersText}>Reset Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                )}
            </View>
            <CancelBookingModal isOpen={cancelModel} onClose={handleCloseCancel} Booking_id={cancelBookingId} />
        </Layout>
    )
}

