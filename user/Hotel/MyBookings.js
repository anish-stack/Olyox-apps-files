import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { tokenCache } from '../Auth/cache';

const API_BASE_URL = 'https://www.appv2.olyox.com/api/v1/hotels';

const MyBookings = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');



  const fetchBookings = async () => {
    try {
      const token = await tokenCache.getToken('auth_token_db');
      console.log('token', token);

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/get-bookings-user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        setBookings(response.data.data || []);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'checkmark-circle';
      case 'Pending':
        return 'time';
      case 'Cancelled':
        return 'close-circle';
      case 'CheckIn':
        return 'log-in';
      case 'Checkout':
        return 'log-out';
      default:
        return 'alert-circle';
    }
  };

  const calculateNights = (checkIn, checkOut) => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    return Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
  };

  const filteredBookings = bookings.filter((booking) => {
    if (selectedFilter === 'all') return true;
    return booking.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  const renderBookingCard = ({ item }) => {
    const nights = calculateNights(item.checkInDate, item.checkOutDate);
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() =>
          navigation.navigate('BookingDetails', { bookingId: item._id, booking: item })
        }
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.bookingId}>{item.Booking_id}</Text>
            <View style={styles.hotelBadge}>
              <Ionicons name="home" size={12} color="#666" />
              <Text style={styles.hotelText}>{item.NumberOfRoomBooks} room(s)</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Ionicons name={statusIcon} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesSection}>
          <View style={styles.dateItem}>
            <Ionicons name="log-in" size={16} color="#007AFF" />
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Check-in</Text>
              <Text style={styles.dateValue}>{formatDate(item.checkInDate)}</Text>
            </View>
          </View>

          <View style={styles.nightsIndicator}>
            <Text style={styles.nightsText}>{nights}N</Text>
          </View>

          <View style={styles.dateItem}>
            <Ionicons name="log-out" size={16} color="#FF6B6B" />
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Check-out</Text>
              <Text style={styles.dateValue}>{formatDate(item.checkOutDate)}</Text>
            </View>
          </View>
        </View>

        {/* Guest Details */}
        <View style={styles.guestSection}>
          <View style={styles.guestItem}>
            <Ionicons name="people" size={14} color="#666" />
            <Text style={styles.guestText}>{item.totalGuests} Guests</Text>
          </View>
          <View style={styles.guestItem}>
            <MaterialIcons name="payment" size={14} color="#666" />
            <Text style={styles.guestText}>{item.paymentMode}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>₹{item.bookingAmount}</Text>
        </View>

       

        {/* OTP Section (if available) */}
        {item.BookingOtp && (
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>Check-in OTP:</Text>
            <Text style={styles.otpValue}>{item.BookingOtp}</Text>
          </View>
        )}

        {/* Arrow */}
        <View style={styles.arrowIcon}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No Bookings Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all'
          ? 'You haven\'t made any bookings yet'
          : `No ${selectedFilter} bookings found`}
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => navigation.navigate('HotelSearch')}
      >
        <Ionicons name="search" size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Search Hotels</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Cancelled', value: 'cancelled' },
          ]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === item.value && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === item.value && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterContent}
        />
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loaderText}>Loading your bookings...</Text>
        </View>
      ) : filteredBookings.length > 0 ? (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          scrollEnabled={true}
        />
      ) : (
        <EmptyState />
      )}
    </SafeAreaView>
  );
};
export default MyBookings

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#000',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bookingCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  hotelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e8e8e8',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  hotelText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  datesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  nightsIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#000',
    borderRadius: 6,
  },
  nightsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  guestSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  guestItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  guestText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#d4edda',
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#28a745',
  },
  paidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#155724',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#FF8C00',
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF8C00',
  },
  otpSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  otpLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  otpValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  arrowIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});