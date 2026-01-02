import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { tokenCache } from '../Auth/cache';

const UpdateDetailsModel = () => {
  const [visible, setVisible] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const openModal = () => setVisible(true);
  const closeModal = () => setVisible(false);

  const updateDetails = useCallback(async () => {
    try {
      if (!name && !email) {
        Alert.alert('No changes detected', 'Please provide a name or email to update.');
        return;
      }

      setLoading(true);
      const gmail_token = await tokenCache.getToken('auth_token');
      const db_token = await tokenCache.getToken('auth_token_db');
      const token = db_token || gmail_token;

      const form = new FormData();
      if (name) form.append('name', name);
      if (email) form.append('email', email);

      await axios.post('https://www.appv2.olyox.com/api/v1/user/update-profile', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert('✅ Success', 'Profile updated successfully!');
      closeModal();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('❌ Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [name, email]);

  return (
    <View style={styles.container}>
      {/* Button to open modal */}
   
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.heading}>Update Profile</Text>

            <TextInput
              placeholder="Enter Name"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#777"
            />
            <TextInput
              placeholder="Enter Email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#777"
              keyboardType="email-address"
            />

            {loading ? (
              <ActivityIndicator size="large" color="#E53E3E" style={{ marginVertical: 10 }} />
            ) : (
              <TouchableOpacity style={styles.button} onPress={updateDetails}>
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003873',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E53E3E',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#d64444',
    fontSize: 15,
    fontWeight: '600',
  },
  openButton: {
    backgroundColor: '#003873',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UpdateDetailsModel;
