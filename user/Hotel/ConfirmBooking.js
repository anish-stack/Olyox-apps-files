import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function ConfirmBooking({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId, bookingData } = route.params || {};
  const [otpVisible, setOtpVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!bookingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialIcons name="error-outline" size={60} color="#dc3545" />
          <Text style={styles.emptyText}>Booking data not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateNights = () => {
    const checkIn = new Date(bookingData.checkInDate);
    const checkOut = new Date(bookingData.checkOutDate);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareBooking = async () => {
    try {
      await Share.share({
        message: `🎉 Booking Confirmed!\n\n` +
          `Booking ID: ${bookingData.Booking_id}\n` +
          `Check-in OTP: ${bookingData.BookingOtp}\n\n` +
          `Hotel: ${bookingData.HotelUserId || 'N/A'}\n` +
          `Check-in: ${formatDate(bookingData.checkInDate)}\n` +
          `Check-out: ${formatDate(bookingData.checkOutDate)}\n` +
          `Nights: ${nights}\n` +
          `Total Amount: ₹${bookingData.bookingAmount}\n\n` +
          `Thank you for booking with us!`,
        title: 'My Hotel Booking Confirmation',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Confirmed</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Success Section */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <MaterialIcons name="check" size={60} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>Your room is reserved</Text>
        </View>

        {/* Booking ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking ID</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Reference ID</Text>
            <View style={styles.row}>
              <Text style={styles.infoValue}>{bookingData.Booking_id || 'N/A'}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyToClipboard(bookingData.Booking_id)}>
                <Ionicons name={copied ? 'checkmark' : 'copy'} size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* OTP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check-in OTP</Text>
          <View style={styles.infoCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.infoLabel}>Your OTP</Text>
              <TouchableOpacity onPress={() => setOtpVisible(!otpVisible)}>
                <Ionicons name={otpVisible ? 'eye-off' : 'eye'} size={22} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={styles.otpValue}>
                {otpVisible ? bookingData.BookingOtp : '••••••'}
              </Text>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyToClipboard(bookingData.BookingOtp?.toString())}>
                <Ionicons name={copied ? 'checkmark' : 'copy'} size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoHint}>Show this OTP at check-in • Valid for 5 mins</Text>
          </View>
        </View>

        {/* Hotel & Stay Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stay Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hotel</Text>
              <Text style={styles.detailValue}>{bookingData.HotelUserId || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rooms Booked</Text>
              <Text style={styles.detailValue}>{bookingData.NumberOfRoomBooks || 1}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Guests</Text>
              <Text style={styles.detailValue}>{bookingData.totalGuests || 1}</Text>
            </View>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check-in & Check-out</Text>
          <View style={styles.datesRow}>
            <View style={styles.dateBox}>
              <Ionicons name="log-in" size={24} color="#007AFF" />
              <Text style={styles.dateLabel}>Check-in</Text>
              <Text style={styles.dateValue}>{formatDate(bookingData.checkInDate)}</Text>
              <Text style={styles.dateTime}>After 2:00 PM</Text>
            </View>

            <View style={styles.dateMiddle}>
              <Text style={styles.nightsBadge}>{nights} Night{nights > 1 ? 's' : ''}</Text>
              <Ionicons name="arrow-forward" size={28} color="#ccc" style={{ marginTop: 8 }} />
            </View>

            <View style={styles.dateBox}>
              <Ionicons name="log-out" size={24} color="#FF4444" />
              <Text style={styles.dateLabel}>Check-out</Text>
              <Text style={styles.dateValue}>{formatDate(bookingData.checkOutDate)}</Text>
              <Text style={styles.dateTime}>Before 11:00 AM</Text>
            </View>
          </View>
        </View>

        {/* Guests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guests</Text>

          {bookingData.guestInformation?.length > 0 ? (
            bookingData.guestInformation.map((guest, index) => (
              <View key={index} style={styles.guestCard}>
                <View style={styles.guestHeader}>
                  <Ionicons name="person" size={20} color="#007AFF" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.guestName}>{guest.guestName || 'Guest'}</Text>
                    <Text style={styles.guestPhone}>{guest.guestPhone || 'N/A'}</Text>
                  </View>
                </View>
                {guest.guestAge ? (
                  <Text style={styles.guestAge}>Age: {guest.guestAge}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No guest details available</Text>
          )}

          <View style={styles.guestSummaryRow}>
            <View style={styles.summaryItem}>
              <FontAwesome5 name="mars" size={16} color="#007AFF" />
              <Text style={styles.summaryLabel}>Males</Text>
              <Text style={styles.summaryValue}>{bookingData.no_of_mens || 0}</Text>
            </View>
            <View style={styles.summaryItem}>
              <FontAwesome5 name="venus" size={16} color="#FF1493" />
              <Text style={styles.summaryLabel}>Females</Text>
              <Text style={styles.summaryValue}>{bookingData.no_of_womens || 0}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="child" size={16} color="#FF6B6B" />
              <Text style={styles.summaryLabel}>Children</Text>
              <Text style={styles.summaryValue}>{bookingData.no_of_child || 0}</Text>
            </View>
          </View>
        </View>

        {/* Payment & Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Total Amount</Text>
              <Text style={styles.priceAmount}>₹{bookingData.bookingAmount || 0}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Payment Method</Text>
              <Text style={styles.priceValue}>{bookingData.paymentMode || 'N/A'}</Text>
            </View>
          </View>

          
        </View>

        {/* Share & Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.shareButton} onPress={shareBooking}>
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share Booking Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <MaterialIcons name="bookmark" size={20} color="#000" />
            <Text style={styles.secondaryButtonText}>View All Bookings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#000', marginBottom: 8 },
  successSubtitle: { fontSize: 16, color: '#666', fontWeight: '500' },
  section: { marginHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 12 },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  infoLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  infoValue: { fontSize: 20, fontWeight: '800', color: '#000', letterSpacing: 1 },
  otpValue: { fontSize: 28, fontWeight: '800', color: '#000', letterSpacing: 4 },
  infoHint: { fontSize: 12, color: '#999', marginTop: 10 },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: { backgroundColor: '#f9f9f9', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  detailLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  detailValue: { fontSize: 15, color: '#000', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginHorizontal: 18 },
  datesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBox: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  dateLabel: { fontSize: 13, color: '#666', marginTop: 8, marginBottom: 4 },
  dateValue: { fontSize: 15, fontWeight: '700', color: '#000' },
  dateTime: { fontSize: 12, color: '#999', marginTop: 6 },
  dateMiddle: { alignItems: 'center', paddingHorizontal: 10 },
  nightsBadge: { fontSize: 14, fontWeight: '800', color: '#000', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  guestCard: { backgroundColor: '#f9f9f9', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  guestHeader: { flexDirection: 'row', alignItems: 'center' },
  guestName: { fontSize: 15, fontWeight: '700', color: '#000' },
  guestPhone: { fontSize: 13, color: '#666', marginTop: 2 },
  guestAge: { fontSize: 13, color: '#666', marginTop: 6, marginLeft: 30 },
  noDataText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 20 },
  guestSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  summaryItem: { flex: 1, alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  summaryLabel: { fontSize: 12, color: '#666', marginTop: 6 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#000', marginTop: 4 },
  priceCard: { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#eee' },
  priceItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priceLabel: { fontSize: 15, color: '#666' },
  priceAmount: { fontSize: 24, fontWeight: '800', color: '#000' },
  statusBadgeSuccess: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, backgroundColor: '#d4edda', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#28a745' },
  statusBadgePending: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, backgroundColor: '#fff3cd', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#FF8C00' },
  statusText: { fontSize: 14, fontWeight: '600' },
  shareButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  shareButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  actionButtons: { marginHorizontal: 20,marginBottom:20, marginTop: 10, gap: 12 },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryButtonText: { fontSize: 16, fontWeight: '700', color: '#000' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#000', marginVertical: 20 },
  backBtn: { backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '600' },
});