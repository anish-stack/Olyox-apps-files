import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { tokenCache } from '../Auth/cache';

const API_BASE_URL = 'https://www.appv2.olyox.com/api/v1/hotels';

const BookingDetails = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const token = await tokenCache.getToken('auth_token_db');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.goBack();
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/get_single_hotel_booking/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setBooking(response.data.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch booking details');
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    setCancelling(true);
    try {
      const token = await tokenCache.getToken('auth_token_db');

      const response = await axios.post(
        `${API_BASE_URL}/cancel-booking`,
        {
          Booking_id: booking.Booking_id,
          reason: cancelReason.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Booking cancelled successfully', [
          {
            text: 'OK',
            onPress: () => {
              setCancelModalVisible(false);
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    return Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed':
        return '#28a745';
      case 'Pending':
        return '#FFC107';
      case 'Cancelled':
        return '#dc3545';
      case 'CheckIn':
        return '#007AFF';
      case 'Checkout':
        return '#6C757D';
      default:
        return '#000';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loaderText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#dc3545" />
          <Text style={styles.errorText}>Booking not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
  const statusColor = getStatusColor(booking.status);
  const canCancel = booking.status === 'Pending' || booking.status === 'Confirmed';

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hotel Images */}
        {booking.listing_id?.main_image?.url && (
          <Image
            source={{ uri: booking.listing_id.main_image.url }}
            style={styles.hotelImage}
            resizeMode="cover"
          />
        )}

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{booking.status}</Text>
          </View>
        </View>

        {/* Booking ID Card */}
        <View style={styles.section}>
          <View style={styles.bookingIdCard}>
            <Text style={styles.bookingIdLabel}>Booking ID</Text>
            <Text style={styles.bookingIdValue}>{booking.Booking_id}</Text>
          </View>
        </View>

        {/* Hotel Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hotel Details</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="business" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Hotel Name</Text>
                <Text style={styles.infoValue}>
                  {booking.HotelUserId?.hotel_name || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {booking.HotelUserId?.hotel_address || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact</Text>
                <Text style={styles.infoValue}>
                  {booking.HotelUserId?.hotel_phone || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="home" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Room Type</Text>
                <Text style={styles.infoValue}>
                  {booking.listing_id?.room_type || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Check-in/Check-out */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stay Duration</Text>
          <View style={styles.card}>
            <View style={styles.dateRow}>
              <View style={styles.dateBox}>
                <Ionicons name="log-in" size={24} color="#007AFF" />
                <Text style={styles.dateBoxLabel}>Check-in</Text>
                <Text style={styles.dateBoxValue}>{formatDate(booking.checkInDate)}</Text>
                <Text style={styles.dateBoxTime}>{formatTime(booking.checkInDate)}</Text>
              </View>
              <View style={styles.nightsBadge}>
                <Text style={styles.nightsText}>{nights}</Text>
                <Text style={styles.nightsLabel}>Night{nights > 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.dateBox}>
                <Ionicons name="log-out" size={24} color="#FF6B6B" />
                <Text style={styles.dateBoxLabel}>Check-out</Text>
                <Text style={styles.dateBoxValue}>{formatDate(booking.checkOutDate)}</Text>
                <Text style={styles.dateBoxTime}>{formatTime(booking.checkOutDate)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Guest Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Information</Text>
          <View style={styles.card}>
            {booking.guestInformation?.map((guest, index) => (
              <View key={guest._id || index}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.guestCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={20} color="#666" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Name</Text>
                      <Text style={styles.infoValue}>{guest.guestName}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={20} color="#666" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{guest.guestPhone}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.guestSummary}>
              <View style={styles.guestSummaryItem}>
                <Ionicons name="people" size={18} color="#666" />
                <Text style={styles.guestSummaryText}>
                  {booking.totalGuests} Total Guests
                </Text>
              </View>
              <View style={styles.guestSummaryItem}>
                <Ionicons name="man" size={18} color="#666" />
                <Text style={styles.guestSummaryText}>
                  {booking.no_of_mens} Men
                </Text>
              </View>
              <View style={styles.guestSummaryItem}>
                <Ionicons name="woman" size={18} color="#666" />
                <Text style={styles.guestSummaryText}>
                  {booking.no_of_womens} Women
                </Text>
              </View>
              <View style={styles.guestSummaryItem}>
                <MaterialIcons name="child-care" size={18} color="#666" />
                <Text style={styles.guestSummaryText}>
                  {booking.no_of_child} Children
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* OTP Section */}
        {booking.BookingOtp && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-in OTP</Text>
            <View style={styles.otpCard}>
              <Ionicons name="key" size={24} color="#007AFF" />
              <Text style={styles.otpValue}>{booking.BookingOtp}</Text>
              <Text style={styles.otpLabel}>Show this OTP at check-in</Text>
            </View>
          </View>
        )}

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Room Price ({nights} night{nights > 1 ? 's' : ''})</Text>
              <Text style={styles.priceValue}>
                ₹{booking.listing_id?.book_price || 0}
              </Text>
            </View>
            {booking.listing_id?.is_tax_applied && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Taxes & Fees</Text>
                <Text style={styles.priceValue}>
                  ₹{booking.listing_id?.tax_fair || 0}
                </Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{booking.bookingAmount}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.paymentInfo}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Mode</Text>
                <Text style={styles.paymentValue}>{booking.paymentMode}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Status</Text>
                {booking.booking_payment_done ? (
                  <View style={styles.paidBadge}>
                    <MaterialIcons name="check-circle" size={16} color="#28a745" />
                    <Text style={styles.paidText}>Completed</Text>
                  </View>
                ) : (
                  <View style={styles.pendingPaymentBadge}>
                    <MaterialIcons name="schedule" size={16} color="#FF8C00" />
                    <Text style={styles.pendingPaymentText}>Pending</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Additional Notes */}
        {booking.anyNotes && booking.anyNotes !== 'No Note' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{booking.anyNotes}</Text>
            </View>
          </View>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCancelModalVisible(true)}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel Booking Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Please provide a reason for cancellation
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter cancellation reason..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={cancelReason}
              onChangeText={setCancelReason}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.modalCancelText}>No, Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, cancelling && styles.modalConfirmBtnDisabled]}
                onPress={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BookingDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  hotelImage: {
    width: '100%',
    height: 200,
  },
  statusContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  bookingIdCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  bookingIdLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  bookingIdValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateBoxLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  dateBoxValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginTop: 4,
  },
  dateBoxTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  nightsBadge: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nightsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  nightsLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  guestCard: {
    gap: 12,
  },
  guestSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  guestSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  guestSummaryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  otpCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  otpValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 12,
    letterSpacing: 4,
  },
  otpLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  paymentInfo: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#d4edda',
    borderRadius: 6,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#155724',
  },
  pendingPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
  },
  pendingPaymentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF8C00',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#dc3545',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc3545',
    marginTop: 16,
  },
  backBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#000',
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});