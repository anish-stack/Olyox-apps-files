import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL_V2 } from '../../constant/Api';

export default function CancelBookingModal({ isOpen, onClose, Booking_id }) {
    const [reason, setReason] = useState('');
    const [isSubmit, setIsSubmit] = useState(false);
    const [error, setError] = useState(null);

    const cancelBooking = async () => {
        // Validation
        if (!reason.trim()) {
            setError('Please provide a reason for cancellation.');
            return;
        }

        setIsSubmit(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE_URL_V2}/cancel-booking`, {
                Booking_id,
                reason
            });

            Alert.alert('Success ✅', 'Your booking has been successfully cancelled.');
            setReason('')
            onClose(); // Close modal after success
        } catch (error) {

            setError(error.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmit(false);
        }
    };

    return (
        <Modal visible={isOpen} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Cancel Booking</Text>

                    {/* Reason Input Field */}
                    <TextInput
                        style={styles.input}
                        placeholder="Enter cancellation reason"
                        value={reason}
                        multiline={true}
                        numberOfLines={4}

                        onChangeText={(text) => setReason(text)}
                        editable={!isSubmit}
                    />

                    {/* Error Message */}
                    {error && <Text style={styles.errorText}>{error}</Text>}

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                            disabled={isSubmit}
                        >
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton]}
                            onPress={cancelBooking}
                            disabled={isSubmit}
                        >
                            {isSubmit ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cancel Booking</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContainer: {
        width: '85%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        height: 100,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        marginBottom: 10
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
        fontSize: 14
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10
    },
    button: {
        flex: 1,
        padding: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    cancelButton: {
        backgroundColor: '#ccc',
        marginRight: 10
    },
    confirmButton: {
        backgroundColor: '#d9534f'
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
    }
});
