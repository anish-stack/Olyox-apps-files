import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList,
    SafeAreaView,
    Platform,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { tokenCache } from '../Auth/cache';

const API_BASE_URL = 'https://appv2.olyox.com/api/v1/hotels';
const { width, height } = Dimensions.get('window');

export default function HotelBooking({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { hotelId, hotelData } = route.params || {};

    // State Management
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(
        new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
    );
    const [showCheckInPicker, setShowCheckInPicker] = useState(false);
    const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
    const [numberOfRooms, setNumberOfRooms] = useState(1);
    const [males, setMales] = useState(0);
    const [females, setFemales] = useState(0);
    const [children, setChildren] = useState(0);
    const [guestDetails, setGuestDetails] = useState([{ name: '', phone: '', age: '' }]);
    const [loading, setLoading] = useState(false);
    const [showAlert, setShowAlert] = useState({ visible: false, type: '', message: '' });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('online');
    const [anyNotes, setAnyNotes] = useState('');
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [editingGuestIndex, setEditingGuestIndex] = useState(null);

    // Calculate total guests
    const totalGuests = males + females + children;

    // Calculate number of days
    const numberOfDays = useMemo(() => {
        const timeDiff = checkOutDate - checkInDate;
        return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }, [checkInDate, checkOutDate]);

    // Calculate total amount
    const totalAmount = useMemo(() => {
        const pricePerNight = hotelData?.book_price || 1499;
        const baseAmount = pricePerNight * numberOfDays * numberOfRooms;
        return baseAmount 
    }, [hotelData, numberOfDays, numberOfRooms]);

    // Alert Handler
    const showCustomAlert = (type, message) => {
        setShowAlert({ visible: true, type, message });
        setTimeout(() => setShowAlert({ visible: false, type: '', message: '' }), 3000);
    };

    // Date Handlers
    const handleCheckInDateChange = (event, date) => {
        if (Platform.OS === 'android') setShowCheckInPicker(false);
        if (date) {
            setCheckInDate(date);
            if (date >= checkOutDate) {
                const newCheckOut = new Date(date.getTime() + 24 * 60 * 60 * 1000);
                setCheckOutDate(newCheckOut);
            }
        }
    };

    const handleCheckOutDateChange = (event, date) => {
        if (Platform.OS === 'android') setShowCheckOutPicker(false);
        if (date) {
            if (date > checkInDate) {
                setCheckOutDate(date);
            } else {
                showCustomAlert('error', 'Check-out date must be after check-in date');
            }
        }
    };

    // Guest Management
    const addGuest = () => {
        const newGuestCount = guestDetails.length + 1;
        if (newGuestCount > maxAllowedGuests) {
            showCustomAlert('error', `Please increase rooms for guests. Allowed: ${hotelData?.allowed_person} guests × ${numberOfRooms} room(s) = ${maxAllowedGuests} guests`);
            return;
        }
        setGuestDetails([...guestDetails, { name: '', phone: '', age: '' }]);
    };

    const removeGuest = (index) => {
        if (guestDetails.length > 1) {
            setGuestDetails(guestDetails.filter((_, i) => i !== index));
        }
    };

    const updateGuest = (index, field, value) => {
        const updated = [...guestDetails];
        updated[index][field] = value;
        setGuestDetails(updated);
    };

    const openGuestModal = (index) => {
        setEditingGuestIndex(index);
        setShowGuestModal(true);
    };

    // Calculate max allowed guests based on rooms
    const maxAllowedGuests = (hotelData?.allowed_person || 1) * numberOfRooms;

    // Validation
    const validateBooking = () => {
        if (guestDetails.length === 0) {
            showCustomAlert('error', 'Please add at least one guest');
            return false;
        }

        for (let guest of guestDetails) {
            if (!guest.name.trim()) {
                showCustomAlert('error', 'All guest names are required');
                return false;
            }
            if (!guest.phone.trim() || guest.phone.length < 10) {
                showCustomAlert('error', 'Valid phone number required for all guests');
                return false;
            }
        }

        if (totalGuests > maxAllowedGuests) {
            showCustomAlert('error', `Please increase rooms for guests. Allowed: ${hotelData?.allowed_person} guests × ${numberOfRooms} room(s) = ${maxAllowedGuests} guests`);
            return false;
        }

        if (numberOfDays <= 0) {
            showCustomAlert('error', 'Check-out date must be after check-in date');
            return false;
        }

        if (!hotelData?.isRoomAvailable) {
            showCustomAlert('error', 'Rooms are not available for selected dates');
            return false;
        }

        return true;
    };

    // Submit Booking
    const submitBooking = async () => {
        if (!validateBooking()) return;

        setLoading(true);
        try {
            const bookingData = {
                guestInformation: guestDetails.map(g => ({
                    guestName: g.name,
                    guestPhone: g.phone,
                    guestAge: parseInt(g.age) || 0,
                })),
                checkInDate: checkInDate.toISOString(),
                checkOutDate: checkOutDate.toISOString(),
                listing_id: hotelId,
                numberOfRooms,
                hotel_id: hotelData?.hotel_user?._id,
                males,
                females,
                children,
                totalGuests,
                totalAmount,
                paymentMethod: selectedPaymentMethod,
                booking_payment_done: selectedPaymentMethod === 'online',
                modeOfBooking: 'Online',
                bookingAmount: totalAmount,
                paymentMode: selectedPaymentMethod === 'hotel' ? 'Pay at Hotel' : 'Online',
                anyNotes,
            };
            console.log(bookingData)

            const token = await tokenCache.getToken('auth_token_db')
            console.log("token", token)
            const response = await axios.post(
                `${API_BASE_URL}/book-room-user`,
                bookingData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success) {
                showCustomAlert('success', 'Booking created successfully!');

                navigation.navigate('BookingConfirmation', {
                    bookingId: response.data.bookingId || response.data.data?.bookingId,
                    bookingData: response.data.booking || response.data.data?.booking || {},
                });
            }
        } catch (error) {
            console.log(error.response.data)
            const errorMessage =
                error.response?.data?.message || 'Failed to create booking. Please try again.';
            showCustomAlert('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
            <View style={{ flex: 1 }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    scrollEnabled={true}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={28} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{hotelData?.hotel_name || 'Hotel Booking'}</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {/* Alert */}
                    {showAlert.visible && (
                        <View style={[styles.alert, styles[`alert_${showAlert.type}`]]}>
                            <View style={styles.alertContent}>
                                {showAlert.type === 'success' ? (
                                    <MaterialIcons name="check-circle" size={20} color="#28a745" />
                                ) : (
                                    <MaterialIcons name="error" size={20} color="#dc3545" />
                                )}
                                <Text style={styles.alertText}>{showAlert.message}</Text>
                            </View>
                        </View>
                    )}

                    {/* Dates Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionIconTitle}>
                            <Ionicons name="calendar" size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Check-in & Check-out</Text>
                        </View>

                        <View style={styles.dateRow}>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowCheckInPicker(true)}
                            >
                                <View style={styles.dateInputContent}>
                                    <Ionicons name="log-in" size={16} color="#666" />
                                    <View style={styles.dateTextContainer}>
                                        <Text style={styles.dateLabel}>Check-in</Text>
                                        <Text style={styles.dateValue}>{checkInDate.toDateString()}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowCheckOutPicker(true)}
                            >
                                <View style={styles.dateInputContent}>
                                    <Ionicons name="log-out" size={16} color="#666" />
                                    <View style={styles.dateTextContainer}>
                                        <Text style={styles.dateLabel}>Check-out</Text>
                                        <Text style={styles.dateValue}>{checkOutDate.toDateString()}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.daysInfoBox}>
                            <MaterialIcons name="nights-stay" size={18} color="#000" />
                            <Text style={styles.daysInfo}>{numberOfDays} night(s)</Text>
                        </View>

                        {showCheckInPicker && (
                            <DateTimePicker
                                value={checkInDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleCheckInDateChange}
                                minimumDate={new Date()}
                            />
                        )}

                        {showCheckOutPicker && (
                            <DateTimePicker
                                value={checkOutDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleCheckOutDateChange}
                                minimumDate={new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)}
                            />
                        )}
                    </View>

                    {/* Rooms Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionIconTitle}>
                            <MaterialIcons name="meeting-room" size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Number of Rooms</Text>
                        </View>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity
                                style={styles.counterBtn}
                                onPress={() => setNumberOfRooms(Math.max(1, numberOfRooms - 1))}
                            >
                                <Feather name="minus" size={20} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.counterValue}>{numberOfRooms}</Text>
                            <TouchableOpacity
                                style={styles.counterBtn}
                                onPress={() => setNumberOfRooms(numberOfRooms + 1)}
                            >
                                <Feather name="plus" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Guests Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionIconTitle}>
                            <Ionicons name="people" size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Guests</Text>
                        </View>

                        <View style={styles.guestRow}>
                            <View style={styles.guestCounter}>
                                <View style={styles.guestCounterHeader}>
                                    <FontAwesome5 name="mars" size={14} color="#007AFF" />
                                    <Text style={styles.guestLabel}>Males</Text>
                                </View>
                                <View style={styles.counterContainer}>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => setMales(Math.max(0, males - 1))}
                                    >
                                        <Feather name="minus" size={16} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.counterValue}>{males}</Text>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => setMales(males + 1)}
                                    >
                                        <Feather name="plus" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.guestCounter}>
                                <View style={styles.guestCounterHeader}>
                                    <FontAwesome5 name="venus" size={14} color="#FF1493" />
                                    <Text style={styles.guestLabel}>Females</Text>
                                </View>
                                <View style={styles.counterContainer}>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => setFemales(Math.max(0, females - 1))}
                                    >
                                        <Feather name="minus" size={16} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.counterValue}>{females}</Text>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => setFemales(females + 1)}
                                    >
                                        <Feather name="plus" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.guestRow}>
                            <View style={styles.guestCounter}>
                                <View style={styles.guestCounterHeader}>
                                    <Ionicons name="child" size={14} color="#FF6B6B" />
                                    <Text style={styles.guestLabel}>Children</Text>
                                </View>
                                <View style={styles.counterContainer}>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => setChildren(Math.max(0, children - 1))}
                                    >
                                        <Feather name="minus" size={16} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.counterValue}>{children}</Text>
                                    <TouchableOpacity
                                        style={styles.counterBtn}
                                        onPress={() => setChildren(children + 1)}
                                    >
                                        <Feather name="plus" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.guestCounter, styles.totalGuests]}>
                                <View style={styles.guestCounterHeader}>
                                    <Ionicons name="people-circle" size={14} color="#fff" />
                                    <Text style={[styles.guestLabel, { color: '#ccc' }]}>Total</Text>
                                </View>
                                <Text style={styles.totalGuestsValue}>{totalGuests}</Text>
                                <Text style={styles.maxGuestsText}>Max: {maxAllowedGuests}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Guest Details Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconTitle}>
                                <MaterialIcons name="person-outline" size={20} color="#000" />
                                <Text style={styles.sectionTitle}>Guest Details</Text>
                            </View>
                            {guestDetails.length < maxAllowedGuests && (
                                <TouchableOpacity onPress={addGuest} style={styles.addGuestBtn}>
                                    <Feather name="plus" size={16} color="#fff" />
                                    <Text style={styles.addGuestBtnText}>Add</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {guestDetails.map((guest, index) => (
                            <View key={index} style={styles.guestCard}>
                                <View style={styles.guestCardHeader}>
                                    <View style={styles.guestCardTitleRow}>
                                        <Ionicons name="person-circle" size={20} color="#666" />
                                        <Text style={styles.guestCardTitle}>Guest {index + 1}</Text>
                                    </View>
                                    {guestDetails.length > 1 && (
                                        <TouchableOpacity onPress={() => removeGuest(index)}>
                                            <Ionicons name="close-circle" size={22} color="#dc3545" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.guestEditBtn}
                                    onPress={() => openGuestModal(index)}
                                >
                                    {guest.name ? (
                                        <View style={styles.guestInfoRow}>
                                            <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                                            <Text style={styles.guestEditText}>{guest.name} • {guest.phone}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.guestInfoRow}>
                                            <Ionicons name="add-circle-outline" size={16} color="#999" />
                                            <Text style={styles.guestEditPlaceholder}>Tap to add details</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {/* Notes Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionIconTitle}>
                            <Ionicons name="document-text" size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Special Requests</Text>
                        </View>
                        <TextInput
                            style={styles.notesInput}
                            placeholder="Any special requests or notes..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            value={anyNotes}
                            onChangeText={setAnyNotes}
                        />
                    </View>

                    {/* Payment Method */}
                    <View style={styles.section}>
                        <View style={styles.sectionIconTitle}>
                            <Ionicons name="card" size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Payment Method</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.paymentOption, selectedPaymentMethod === 'online' && styles.paymentOptionSelected]}
                            onPress={() => setSelectedPaymentMethod('online')}
                        >
                            <View style={styles.paymentRadio}>
                                {selectedPaymentMethod === 'online' && <View style={styles.paymentRadioInner} />}
                            </View>
                            <MaterialIcons name="payment" size={18} color="#000" />
                            <Text style={styles.paymentText}>Pay Online</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.paymentOption, selectedPaymentMethod === 'hotel' && styles.paymentOptionSelected]}
                            onPress={() => setSelectedPaymentMethod('hotel')}
                        >
                            <View style={styles.paymentRadio}>
                                {selectedPaymentMethod === 'hotel' && <View style={styles.paymentRadioInner} />}
                            </View>
                            <MaterialIcons name="store" size={18} color="#000" />
                            <Text style={styles.paymentText}>Pay at Hotel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Price Breakdown */}
                    <View style={styles.section}>
                        <View style={styles.sectionIconTitle}>
                            <Ionicons name="pricetag" size={20} color="#000" />
                            <Text style={styles.sectionTitle}>Price Breakdown</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Price per night:</Text>
                            <Text style={styles.priceValue}>₹{hotelData?.book_price || 1499}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Nights:</Text>
                            <Text style={styles.priceValue}>{numberOfDays}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Rooms:</Text>
                            <Text style={styles.priceValue}>{numberOfRooms}</Text>
                        </View>
                       
                        <View style={[styles.priceRow, styles.totalPrice]}>
                            <Text style={styles.totalPriceLabel}>Total Amount:</Text>
                            <Text style={styles.totalPriceValue}>₹{totalAmount}</Text>
                        </View>
                    </View>

                    {/* Discount Info */}
                    {hotelData?.discount_percentage > 0 && (
                        <View style={styles.discountBanner}>
                            <Ionicons name="gift" size={20} color="#FF8C00" />
                            <Text style={styles.discountText}>
                                {hotelData.discount_percentage}% Discount Applied!
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Fixed Bottom Button */}
                <View style={[styles.bottomContainer, { paddingBottom: insets.bottom }]}>
                    <TouchableOpacity
                        style={[styles.bookBtn, loading && styles.bookBtnDisabled]}
                        onPress={submitBooking}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <View style={styles.bookBtnContent}>
                                <Ionicons name="checkmark-done-sharp" size={20} color="#fff" />
                                <Text style={styles.bookBtnText}>Confirm Booking</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.priceFooter}>
                        <Text style={styles.priceFooterLabel}>Total:</Text>
                        <Text style={styles.priceFooterValue}>₹{totalAmount}</Text>
                    </View>
                </View>
            </View>

            {/* Guest Modal */}
            <Modal visible={showGuestModal} animationType="slide" transparent>
                <SafeAreaView style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Guest Details</Text>
                            <TouchableOpacity onPress={() => setShowGuestModal(false)}>
                                <Ionicons name="close" size={28} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {editingGuestIndex !== null && (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.inputGroup}>
                                    <View style={styles.inputLabelRow}>
                                        <MaterialIcons name="person" size={16} color="#000" />
                                        <Text style={styles.inputLabel}>Full Name *</Text>
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter full name"
                                        placeholderTextColor="#999"
                                        value={guestDetails[editingGuestIndex].name}
                                        onChangeText={(text) => updateGuest(editingGuestIndex, 'name', text)}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.inputLabelRow}>
                                        <Ionicons name="call" size={16} color="#000" />
                                        <Text style={styles.inputLabel}>Phone Number *</Text>
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter 10-digit phone number"
                                        placeholderTextColor="#999"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        value={guestDetails[editingGuestIndex].phone}
                                        onChangeText={(text) => updateGuest(editingGuestIndex, 'phone', text)}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.inputLabelRow}>
                                        <Ionicons name="calendar" size={16} color="#000" />
                                        <Text style={styles.inputLabel}>Age (Optional)</Text>
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter age"
                                        placeholderTextColor="#999"
                                        keyboardType="number-pad"
                                        value={guestDetails[editingGuestIndex].age}
                                        onChangeText={(text) => updateGuest(editingGuestIndex, 'age', text)}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.modalBtn}
                                    onPress={() => setShowGuestModal(false)}
                                >
                                    <Ionicons name="checkmark" size={20} color="#fff" />
                                    <Text style={styles.modalBtnText}>Done</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        maxWidth: 200,
        textAlign: 'center',
    },
    alert: {
        marginHorizontal: 16,
        marginTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
    },
    alert_success: {
        backgroundColor: '#d4edda',
        borderLeftColor: '#28a745',
    },
    alert_error: {
        backgroundColor: '#f8d7da',
        borderLeftColor: '#dc3545',
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    alertText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        flex: 1,
    },
    section: {
        marginHorizontal: 16,
        marginTop: 20,
    },
    sectionIconTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#f9f9f9',
    },
    dateInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateTextContainer: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    daysInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    daysInfo: {
        fontSize: 13,
        color: '#000',
        fontWeight: '600',
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    counterBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterValue: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
    },
    guestRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    guestCounter: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#f9f9f9',
    },
    guestCounterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    guestLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    totalGuests: {
        backgroundColor: '#000',
        borderColor: '#000',
        justifyContent: 'center',
    },
    totalGuestsValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginVertical: 4,
    },
    maxGuestsText: {
        fontSize: 10,
        color: '#ccc',
        textAlign: 'center',
    },
    guestCard: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
    },
    guestCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    guestCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    guestCardTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    guestEditBtn: {
        paddingVertical: 6,
    },
    guestInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    guestEditText: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    guestEditPlaceholder: {
        fontSize: 14,
        color: '#999',
        fontWeight: '400',
    },
    addGuestBtn: {
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addGuestBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        color: '#000',
        textAlignVertical: 'top',
        backgroundColor: '#f9f9f9',
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
        gap: 10,
    },
    paymentOptionSelected: {
        borderColor: '#000',
        backgroundColor: '#f0f0f0',
    },
    paymentRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentRadioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#000',
    },
    paymentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    priceLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 14,
        color: '#000',
        fontWeight: '600',
    },
    totalPrice: {
        borderBottomWidth: 0,
        paddingVertical: 12,
        marginTop: 8,
    },
    totalPriceLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    totalPriceValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    discountBanner: {
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#fff3cd',
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    discountText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    bottomContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    bookBtn: {
        paddingVertical: 14,
        backgroundColor: '#000',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    bookBtnDisabled: {
        opacity: 0.6,
    },
    bookBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bookBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    priceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    priceFooterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    priceFooterValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        flex: 1,
        marginTop: 50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    modalBody: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        color: '#000',
        backgroundColor: '#f9f9f9',
    },
    modalBtn: {
        marginTop: 20,
        paddingVertical: 14,
        backgroundColor: '#000',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    modalBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});