import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useUserStore from '../../../Store/useUserStore';
import loginStore from '../../../Store/authStore';

const API_URL = 'https://www.appv2.olyox.com/api/v1/rider/rider-uploadPaymentQr';
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

export default function UploadQr() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const navigation = useNavigation();
  const { user: userData, fetchUserDetails } = useUserStore();
    const { token } = loginStore();
  // Check if user has existing QR code on component mount
  useEffect(() => {
    if (userData && !userData.YourQrCodeToMakeOnline) {
      setShowUploader(true);
    }
  }, [userData]);

  const checkImageSize = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Error checking image size:', error);
      return 0;
    }
  };

  const pickImage = async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setError('Permission to access media library was denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const imageSize = await checkImageSize(result.assets[0].uri);

        if (imageSize > MAX_IMAGE_SIZE) {
          setError('Image size must be less than 2MB');
          return;
        }

        setImage(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tokenSend = await SecureStore.getItemAsync('auth_token') || token;
      if (!tokenSend) {
        throw new Error('Authentication token not found');
      }

      const formData = new FormData();

      const uriParts = image.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('image', {
        uri: image,
        name: `qr.${fileType}`,
        type: `image/${fileType}`,
      });

      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${tokenSend}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'QR code uploaded successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                fetchUserDetails();
                setShowUploader(false);
                setImage(null);
              },
            },
          ]
        );
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.log(err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload QR code';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleChangeQr = () => {
    setShowUploader(true);
    setImage(null);
    setError(null);
  };

  const handleCancelChange = () => {
    setShowUploader(false);
    setImage(null);
    setError(null);
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  // Show existing QR code if available and uploader is not shown
  if (userData?.YourQrCodeToMakeOnline && !showUploader) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Payment QR Code</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.subtitle}>This is your current payment QR code</Text>
            <View style={styles.qrCard}>
              <View style={styles.cardContent}>
                <Image
                  source={{ uri: userData?.YourQrCodeToMakeOnline }}
                  style={styles.existingQrImage}
                  resizeMode="contain"
                />
                <View style={styles.statusContainer}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#000000" />
                  <Text style={styles.statusText}>QR Code Active</Text>
                </View>
                <TouchableOpacity style={styles.button}>
                  <Text style={styles.buttonText}>Show QR Code</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.changeButton} onPress={handleChangeQr}>
              <MaterialCommunityIcons name="qrcode-edit" size={20} color="#000000" />
              <Text style={styles.changeButtonText}>Change QR Code</Text>
            </TouchableOpacity>
           
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show uploader (either first time or changing existing QR)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {userData?.YourQrCodeToMakeOnline ? 'Update Payment QR Code' : 'Upload Payment QR Code'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {userData?.YourQrCodeToMakeOnline
              ? 'Upload a new QR code to replace your current one'
              : 'Please upload a clear image of your payment QR code'}
          </Text>
          {userData?.YourQrCodeToMakeOnline && (
            <View style={styles.currentQrContainer}>
              <Text style={styles.currentQrLabel}>Current QR Code:</Text>
              <Image
                source={{ uri: userData.YourQrCodeToMakeOnline }}
                style={styles.currentQrPreview}
                resizeMode="contain"
              />
            </View>
          )}
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={pickImage}
            disabled={loading}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <MaterialCommunityIcons name="qrcode" size={48} color="#000000" />
                <Text style={styles.placeholderText}>
                  {userData?.YourQrCodeToMakeOnline ? 'Tap to select new QR code' : 'Tap to select QR code'}
                </Text>
                <Text style={styles.sizeLimit}>Maximum size: 2MB</Text>
              </View>
            )}
          </TouchableOpacity>
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#333333" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {loading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={styles.progressText}>
                {uploadProgress > 0 ? `Uploading: ${uploadProgress}%` : 'Processing...'}
              </Text>
            </View>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!image || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!image || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {userData?.YourQrCodeToMakeOnline ? 'Update QR Code' : 'Upload QR Code'}
              </Text>
            </TouchableOpacity>
            {userData?.YourQrCodeToMakeOnline && (
              <TouchableOpacity
                style={[styles.cancelButton, loading && { opacity: 0.5 }]}
                onPress={handleCancelChange}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray background for a modern look
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2, // Subtle shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937', // Dark gray for better contrast
    flex: 1, // Take up remaining space
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280', // Softer gray for subtitle
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrCard: {
    width: '100%',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    alignItems: 'center',
    padding: 20,
  },
  existingQrImage: {
    width: '100%',
    height: 250,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // Light gray background
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    marginLeft: 8,
    color: '#1F2937',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    marginBottom: 16,
  },
  changeButtonText: {
    marginLeft: 8,
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  homeButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  currentQrContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  currentQrLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  currentQrPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  uploadArea: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 20,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  sizeLimit: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2', // Light red for error
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    marginLeft: 8,
    color: '#991B1B', // Dark red for error text
    fontSize: 14,
  },
  progressContainer: {
    flexDirection:'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  submitButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
});