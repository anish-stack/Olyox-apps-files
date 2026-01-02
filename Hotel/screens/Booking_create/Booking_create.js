import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

import { FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import Layout from '../../components/Layout/Layout';
import { useToken } from '../../context/AuthContext';
import { API_BASE_URL_V2 } from '../../constant/Api';
import axios from 'axios';
import styles from './BookingStyles';

export default function BookingCreate() {
  const navigation = useNavigation();
  const { token } = useToken();
  const [formData, setFormData] = useState({
    guestInformation: [{ guestName: '', guestPhone: '' }],
    checkInDate: '',
    male: 0,
    females: 0,
    child: 0,
    checkOutDate: '',
    listing_id: '',
    booking_payment_done: false,
    modeOfBooking: 'Offline',
    bookingAmount: '',
    noOfRoomsBook: 1,
    anyDiscountByHotel: '',
    paymentMode: 'Cash',
  });


  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [otp, setOtp] = useState('');
  const [datePicker, setDatePicker] = useState({ show: false, mode: 'date', field: '' });
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [bookingDays, setBookingDays] = useState(0);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [allowed_person, setAllowed_person] = useState(0)



  const totalGuests = formData.male + formData.females + formData.child;
  const maxAllowedGuests = formData.noOfRoomsBook * selectedRoom?.allowed_person || 0;
  const isValidGuests = totalGuests <= maxAllowedGuests;


  useEffect(() => {
    fetchAllRooms();
  }, []);

  const fetchAllRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE_URL_V2}/find-My-Rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const availableRooms = data.rooms.filter((room) => room?.isRoomAvailable);
      setRooms(availableRooms);
      if (availableRooms.length === 0) {
        setError('No available rooms found. Please make sure you have rooms with booking available.');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error.response.data);
      if (error.response?.data?.message === "No rooms found for this user.") {
        setError('No rooms! Please add first rooms');
      } else {

        setError(error.response?.data?.message);
      }

    } finally {
      setLoading(false);
    }
  };



  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGuestChange = (index, field, value) => {
    const updatedGuests = [...formData.guestInformation];
    updatedGuests[index][field] = value;
    setFormData((prev) => ({ ...prev, guestInformation: updatedGuests }));
  };

  const addGuest = () => {
    setFormData((prev) => ({
      ...prev,
      guestInformation: [...prev.guestInformation, { guestName: '', guestPhone: '' }],
    }));
  };

  const removeGuest = (index) => {
    if (formData.guestInformation.length > 1) {
      setFormData((prev) => ({
        ...prev,
        guestInformation: prev.guestInformation.filter((_, i) => i !== index),
      }));
    } else {
      setError('At least one guest is required');
      setTimeout(() => setError(null), 3000);
    }
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    console.log(room?.book_price)
    handleChange('listing_id', room?._id);
    setShowRoomModal(false);
    setAllowed_person(room?.allowed_person)
    setFormData((prev) => ({
      ...prev,
      bookingAmount: room?.book_price, // Updating bookingAmount
    }));
  };


  const validateForm = () => {
    if (!formData.listing_id) {
      alert('Please select a room')
      setError('Please select a room');
      return false;
    }
    if (!formData.checkInDate) {
      alert('Please select a check-in date')
      setError('Please select a check-in date');
      return false;
    }
    if (!formData.checkOutDate) {
      setError('Please select a check-out date');
      alert('Please select a check-out date')

      return false;
    }

    // Validate all guests have name and phone
    const invalidGuest = formData.guestInformation.find(
      guest => !guest.guestName || !guest.guestPhone
    );

    if (invalidGuest) {
      setError('Please fill in all guest information');
      alert('Please fill in all guest information')

      return false;
    }

    // Validate phone numbers
    const invalidPhone = formData.guestInformation.find(
      guest => guest.guestPhone && !/^\d{10}$/.test(guest.guestPhone)
    );

    if (invalidPhone) {
      alert('Please enter valid 10-digit phone numbers for all guests')

      setError('Please enter valid 10-digit phone numbers for all guests');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    const datas = { ...formData, bookingDays, priceTotal: formData.bookingAmount * bookingDays };

    if (!validateForm()) {
      return;
    }


    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE_URL_V2}/book-room`, datas, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookingId(data.booking.Booking_id);
      setShowOtpField(true);
      setSuccess('Booking created successfully! Please verify with the OTP sent to the guest.');
      alert('Booking created successfully! Please verify with the OTP sent to the guest.')
    } catch (error) {
      console.error('Booking error:', (error.response?.data?.message));
      alert(error.response?.data?.message || 'Failed to create booking. Please try again.')
      setError(error.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyBooking = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    if (!bookingId) {
      setError('Booking ID not found. Please try creating the booking again.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${API_BASE_URL_V2}/verify-booking`,
        { bookingId, otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Booking verified successfully!');
      setShowOtpField(false);

      navigation.navigate("Bookings")
    } catch (error) {
      console.error('Verification error:', error.response.data);
      setError(error.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!bookingId) {
      setError('No booking found to resend OTP');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL_V2}/resend-otp-booking`,
        { bookingId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('OTP resent successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Resend OTP error:', error.response.data);
      setError(error.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.checkInDate && formData.checkOutDate) {
      // Convert string dates to Date objects
      const checkIn = new Date(formData.checkInDate);
      const checkOut = new Date(formData.checkOutDate);

      // Calculate the difference in milliseconds
      const timeDifference = checkOut - checkIn;

      // Convert milliseconds to days
      const differenceOfDays = timeDifference / (1000 * 60 * 60 * 24);

      console.log("Difference of days:", differenceOfDays);
      setBookingDays(differenceOfDays)
    }
  }, [formData.checkInDate, formData.checkOutDate]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderDatePicker = () => {
    if (!datePicker.show) return null;

    return (
      <DateTimePicker
        value={new Date()} // Default to current date
        mode={datePicker.mode}
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        minimumDate={new Date()} // Disable past dates
        onChange={(event, selectedDate) => {
          setDatePicker({ show: false, mode: 'date', field: '' });

          if (selectedDate && event.type !== 'dismissed') {
            const localDate = selectedDate.toLocaleDateString('en-CA'); // Fix timezone issue
            handleChange(datePicker.field, localDate);
          }
        }}
      />
    );
  };

  return (
    <Layout activeTab='bookings'>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>


        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room Selection</Text>

          <TouchableOpacity
            style={styles.roomSelector}
            onPress={() => setShowRoomModal(true)}
          >
            <Text style={styles.roomSelectorText}>
              {selectedRoom ? selectedRoom.room_type : 'Select a Room'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setDatePicker({ show: true, mode: 'date', field: 'checkInDate' })}
          >
            <FontAwesome name="calendar" size={20} color="#6B7280" />
            <Text style={styles.datePickerText}>
              {formData.checkInDate ? formatDate(formData.checkInDate) : 'Select Check-in Date'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setDatePicker({ show: true, mode: 'date', field: 'checkOutDate' })}
          >
            <FontAwesome name="calendar" size={20} color="#6B7280" />
            <Text style={styles.datePickerText}>
              {formData.checkOutDate ? formatDate(formData.checkOutDate) : 'Select Check-out Date'}
            </Text>
          </TouchableOpacity>
        </View>


        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Guest Details</Text>

          {/* {errors.guests && (
            <Text style={styles.errorText}>{errors.guests}</Text>
          )} */}

          <View style={styles.roomInfoContainer}>
            <Text style={styles.roomInfoText}>
              Room Capacity: {selectedRoom?.allowed_person} guests per room
            </Text>
            <Text style={styles.roomInfoText}>
              Your Selection: {formData.noOfRoomsBook} room(s) - Maximum {maxAllowedGuests} guests
            </Text>
          </View>

          <View style={styles.roomCountContainer}>
            <Text style={styles.roomCountLabel}>Number of Rooms:</Text>
            <View style={styles.roomCountControls}>
              <TouchableOpacity
                onPress={() => setFormData((prev) => ({
                  ...prev,
                  noOfRoomsBook: Math.max(1, (prev.noOfRoomsBook || 1) - 1) // Ensuring it doesn't go below 1
                }))}

                style={styles.roomCountButton}
                disabled={formData.noOfRoomsBook <= 1}
              >
                <FontAwesome name="minus" size={16} color="white" />
              </TouchableOpacity>

              <Text style={styles.roomCountValue}>{formData.noOfRoomsBook}</Text>

              <TouchableOpacity
                onPress={() => setFormData((prev) => ({
                  ...prev,
                  noOfRoomsBook: (prev.noOfRoomsBook || 0) + 1
                }))}
                style={styles.roomCountButton}
              >
                <FontAwesome name="plus" size={16} color="white" />
              </TouchableOpacity>

            </View>
          </View>

          <View style={styles.guestTypeContainer}>
            <View style={styles.guestTypePicker}>
              <Text style={styles.guestTypeLabel}>Male</Text>
              <Picker
                selectedValue={formData.male} // Ensure correct state key
                style={styles.picker}
                onValueChange={(value) => setFormData((prev) => ({
                  ...prev,
                  male: value, // Set selected value properly
                }))}
              >
                {[...Array(maxAllowedGuests + 1)].map((_, i) => (
                  <Picker.Item
                    key={`male-${i}`}
                    label={i.toString()}
                    value={i}
                  />
                ))}
              </Picker>

            </View>

            <View style={styles.guestTypePicker}>
              <Text style={styles.guestTypeLabel}>Female</Text>
              <Picker
                selectedValue={formData.females}
                style={styles.picker}
                onValueChange={(value) => setFormData((prev) => ({
                  ...prev,
                  females: value, // Set selected value properly
                }))}
              >
                {[...Array(maxAllowedGuests + 1)].map((_, i) => (
                  <Picker.Item
                    key={`female-${i}`}
                    label={i.toString()}
                    value={i}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.guestTypePicker}>
              <Text style={styles.guestTypeLabel}>Children</Text>
              <Picker
                selectedValue={formData.child}

                style={styles.picker}
                onValueChange={(value) => setFormData((prev) => ({
                  ...prev,
                  child: value,
                }))}
              >
                {[...Array(maxAllowedGuests + 1)].map((_, i) => (
                  <Picker.Item
                    key={`child-${i}`}
                    label={i.toString()}
                    value={i}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.guestSummaryContainer}>
            <Text style={styles.guestSummaryText}>
              Total Guests: {totalGuests}
            </Text>
            {!isValidGuests && (
              <Text style={styles.guestSummaryError}>
                Please add more rooms or reduce the number of guests
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Information</Text>

          {formData.guestInformation.map((guest, index) => (
            <View key={index} style={styles.guestContainer}>
              <View style={styles.guestHeader}>
                <Text style={styles.guestTitle}>Guest {index + 1}</Text>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeGuest(index)}
                  >
                    <FontAwesome name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.input}
                autoComplete="off"
                importantForAutofill="no"
                textContentType="none" 
                disableFullscreenUI={true} 
                autoCorrect={false} 
                placeholder="Guest Name"
                value={guest.guestName}
                onChangeText={(text) => handleGuestChange(index, 'guestName', text)}
              />

              <TextInput
                style={styles.input}
                placeholder="Guest Phone (10 digits)"
                // keyboardType="phone-pad"
                value={guest.guestPhone}
                disableFullscreenUI={true} 
                autoCorrect={false} 
                autoComplete="off"
                importantForAutofill="no"
                textContentType="none" 
                onChangeText={(text) => handleGuestChange(index, 'guestPhone', text)}
                maxLength={10}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addGuestButton} onPress={addGuest}>
            <Ionicons name="add-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.addGuestText}>Add Another Guest</Text>
          </TouchableOpacity>
        </View>



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.paymentSection}>
            <Text style={[styles.sectionTitle, { fontSize: 14 }]}>Payment Mode</Text>

            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => handleChange('paymentMode', 'Cash')}
            >
              <View style={styles.radioButton}>
                {formData.paymentMode === 'Cash' && <View style={styles.radioButtonSelected} />}
              </View>
              <Text style={styles.paymentOptionText}>Cash</Text>
            </TouchableOpacity>



            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => handleChange('paymentMode', 'Online')}
            >
              <View style={styles.radioButton}>
                {formData.paymentMode === 'Online' && <View style={styles.radioButtonSelected} />}
              </View>
              <Text style={styles.paymentOptionText}>Online</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, padding: 5 }}>For One Day Only</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="Booking Amount (₹)"
            keyboardType="numeric"
            autoComplete="off"

            value={formData.bookingAmount?.toString()}
            onChangeText={(text) => handleChange('bookingAmount', text)}
          />
          {bookingDays > 1 && (
            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>
                For <Text style={styles.highlight}>{bookingDays}</Text> {bookingDays === 1 ? "Day" : "Days"},
                the total is <Text style={styles.price}>(₹) {formData.bookingAmount?.toString() * bookingDays}</Text>
              </Text>
            </View>
          )}

          <View>

          </View>


          <TextInput
            style={styles.amountInput}
            placeholder="Discount Amount (₹)"
            keyboardType="numeric"
         autoComplete="off"
            value={formData.anyDiscountByHotel}
            onChangeText={(text) => handleChange('anyDiscountByHotel', text)}
          />

          <View style={styles.paymentOption}>
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => handleChange('booking_payment_done', !formData.booking_payment_done)}
            >
              {formData.booking_payment_done && <View style={styles.radioButtonSelected} />}
            </TouchableOpacity>
            <Text style={styles.paymentOptionText}>Payment Completed</Text>
          </View>
        </View>

        {!showOtpField ? (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Booking</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.otpContainer}>
            <Text style={styles.sectionTitle}>Verify Booking</Text>
            <Text style={{ color: '#6B7280', marginBottom: 12 }}>
              An OTP has been sent to the guest's phone number. Please enter it below to verify the booking.
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter OTP"
              keyboardType="numeric"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
            />

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={verifyBooking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Booking</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={resendOtp}
              disabled={loading}
            >
              <Text style={styles.resendButtonText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Room Selection Modal */}
      <Modal
        visible={showRoomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoomModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Room</Text>

            <ScrollView style={styles.modalScrollView}>
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <TouchableOpacity
                    key={room._id}
                    style={styles.modalItem}
                    onPress={() => selectRoom(room)}
                  >
                    <Text style={styles.modalItemText}>{room.room_type}</Text>
                    <Text style={styles.modalItemPrice}>
                      ₹{room.book_price} {room.isPackage && '(Package)'}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>
                  No available rooms found
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRoomModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker (for iOS) */}
      {Platform.OS === 'ios' ? renderDatePicker() : null}

      {/* Android Date Picker is rendered directly */}
      {Platform.OS === 'android' && datePicker.show && renderDatePicker()}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}
    </Layout>
  );
}