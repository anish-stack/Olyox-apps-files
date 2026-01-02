import React, {
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagePicker from 'react-native-image-crop-picker'; // <-- NEW
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import loginStore from '../../../Store/authStore';
import * as SecureStore from 'expo-secure-store';

const { width: screenWidth } = Dimensions.get('window');

// ---------------------------------------------------------------------
// Document definitions
// ---------------------------------------------------------------------
const DOCUMENTS = [
  { id: 'dl', title: 'Driver\'s License', label: 'Driver\'s License', icon: 'car-outline' },
  { id: 'rc', title: 'Registration Certificate', label: 'RC', icon: 'document-text-outline' },
  { id: 'insurance', title: 'Insurance', label: 'Insurance (Optional)', icon: 'shield-checkmark-outline' },
  { id: 'aadharFront', title: 'aadharFront', label: 'Aadhar (Front)', icon: 'id-card-outline' },
  { id: 'aadharBack', title: 'aadharBack', label: 'Aadhar (Back)', icon: 'id-card-outline' },
  { id: 'pancard', title: 'pancard', label: 'Pan Card (Optional)', icon: 'card-outline' },
  { id: 'profile', title: 'profile', label: 'Profile Image', icon: 'person-outline' },
];

// ---------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------
const API_URL = 'https://www.appv2.olyox.com/api/v1/rider/rider-upload';
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
const COMPRESSION_QUALITY = 0.7;

export default function Documents() {
  const [images, setImages] = useState({});
  const [compressedImages, setCompressedImages] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const { token, logout } = loginStore();
  const [fileSizeError, setFileSizeError] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [compressionInfo, setCompressionInfo] = useState({});
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);
  const navigation = useNavigation();

  // -----------------------------------------------------------------
  // Memoised helpers
  // -----------------------------------------------------------------
  const requiredDocs = useMemo(
    () => DOCUMENTS.filter(doc => doc.id !== 'insurance' && doc.id !== 'pancard'),
    []
  );

  const isAllUploaded = useMemo(
    () => requiredDocs.every(doc => compressedImages[doc.id] && !fileSizeError[doc.id]),
    [requiredDocs, compressedImages, fileSizeError]
  );

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);

  // -----------------------------------------------------------------
  // Process and compress image (same as before)
  // -----------------------------------------------------------------
  const processAndCompressImage = useCallback(
    async (uri, originalSize = 0) => {
      try {
        setLoading(prev => ({ ...prev, [currentDocId]: true }));
        setError(prev => ({ ...prev, [currentDocId]: null }));
        setFileSizeError(prev => ({ ...prev, [currentDocId]: false }));
        setUploadProgress(prev => ({ ...prev, [currentDocId]: 30 }));

        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
        );

        setUploadProgress(prev => ({ ...prev, [currentDocId]: 60 }));

        let finalUri = compressed.uri;
        let estimatedSize = originalSize > 0 ? originalSize * COMPRESSION_QUALITY : MAX_FILE_SIZE * 0.8;

        if (estimatedSize > MAX_FILE_SIZE) {
          const recompressed = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          finalUri = recompressed.uri;
          estimatedSize *= 0.5;
        }

        setImages(prev => ({ ...prev, [currentDocId]: finalUri }));
        setCompressedImages(prev => ({ ...prev, [currentDocId]: finalUri }));

        setCompressionInfo(prev => ({
          ...prev,
          [currentDocId]: {
            originalSize: estimatedSize,
            compressedSize: estimatedSize * COMPRESSION_QUALITY,
            compressionRatio: estimatedSize > MAX_FILE_SIZE ? '50%' : '30%',
            finalUri,
          },
        }));

        for (let p = 70; p <= 100; p += 10) {
          setUploadProgress(prev => ({ ...prev, [currentDocId]: p }));
          await new Promise(r => setTimeout(r, 100));
        }

        setFileSizeError(prev => ({ ...prev, [currentDocId]: false }));
      } catch (err) {
        setError(prev => ({ ...prev, [currentDocId]: err.message || 'Failed to process image' }));
      } finally {
        setLoading(prev => ({ ...prev, [currentDocId]: false }));
      }
    },
    [currentDocId]
  );

  // -----------------------------------------------------------------
  // Picker Modal
  // -----------------------------------------------------------------
  const showPickerOptions = useCallback((type) => {
    setCurrentDocId(type);
    setShowPickerModal(true);
  }, []);

  // -----------------------------------------------------------------
  // GALLERY PICKER (with native cropper)
  // -----------------------------------------------------------------
  const pickFromGallery = useCallback(async () => {
    setShowPickerModal(false);
    setLoading(prev => ({ ...prev, [currentDocId]: true }));
    setError(prev => ({ ...prev, [currentDocId]: null }));

    try {
      const result = await ImagePicker.openPicker({
      width: 1000,
        height: 1000,
        cropping: true,
        cropperCircleOverlay: currentDocId === 'profile',
        freeStyleCropEnabled: true,  // FREE CROP
        mediaType: 'photo',
        compressImageQuality: 0.8,
        includeBase64: false,
      });

      await processAndCompressImage(result.path, result.size);
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        setError(prev => ({ ...prev, [currentDocId]: err.message || 'Gallery failed' }));
      }
    } finally {
      setLoading(prev => ({ ...prev, [currentDocId]: false }));
    }
  }, [currentDocId, processAndCompressImage]);

  // -----------------------------------------------------------------
  // CAMERA + NATIVE CROPPER
  // -----------------------------------------------------------------
  const pickFromCamera = useCallback(async () => {
    setShowPickerModal(false);
    setLoading(prev => ({ ...prev, [currentDocId]: true }));
    setError(prev => ({ ...prev, [currentDocId]: null }));

    try {
      const result = await ImagePicker.openCamera({
      width: 1000,
        height: 1000,
        cropping: true,
        cropperCircleOverlay: currentDocId === 'profile',
        freeStyleCropEnabled: true,  // FREE CROP
        mediaType: 'photo',
        compressImageQuality: 0.8,
        includeBase64: false,
      });

      await processAndCompressImage(result.path, result.size);
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        setError(prev => ({ ...prev, [currentDocId]: err.message || 'Camera failed' }));
      }
    } finally {
      setLoading(prev => ({ ...prev, [currentDocId]: false }));
    }
  }, [currentDocId, processAndCompressImage]);

  // -----------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------
  const handleLogout = useCallback(async () => {
    try {
      logout();
      await SecureStore.deleteItemAsync('auth_token');
      navigation.navigate('auth');
    } catch {
      Alert.alert('Error', 'Failed to log out');
    }
  }, [navigation, logout]);

  // -----------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!isAllUploaded) return;

    try {
      setLoading(prev => ({ ...prev, submit: true }));
      setUploadProgress(prev => ({ ...prev, submit: 0 }));

      if (!token) throw new Error('Authentication token not found');

      const formData = new FormData();
      let totalFiles = 0;
      Object.entries(compressedImages).forEach(([docType, uri]) => {
        if (!fileSizeError[docType] && uri) totalFiles++;
      });

      let processed = 0;
      Object.entries(compressedImages).forEach(([docType, uri]) => {
        if (fileSizeError[docType] || !uri) return;

        const uriParts = uri.split('.');
        const ext = uriParts[uriParts.length - 1] || 'jpg';
        formData.append('documents', {
          uri,
          name: `${docType}_compressed.${ext}`,
          type: `image/${ext}`,
        });
        formData.append('documentTypes', docType);
        processed++;
        setUploadProgress(prev => ({
          ...prev,
          submit: (processed / totalFiles) * 50,
        }));
      });

      const axiosConfig = {
        timeout: 120000,
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(50 + (progressEvent.loaded * 50) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, submit: percent }));
        },
      };

      const response = await axios.post(API_URL, formData, axiosConfig);
      if (response.data.success) {
        setUploadProgress(prev => ({ ...prev, submit: 100 }));
        Alert.alert('Success', 'Documents uploaded successfully!', [
          { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Wait_Screen' }] }) },
        ]);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? 'Upload timeout.'
        : err.response?.data?.message || err.message || 'Upload failed';
      Alert.alert('Upload Error', msg);
      setError(prev => ({ ...prev, submit: msg }));
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
      setTimeout(() => setUploadProgress(prev => ({ ...prev, submit: 0 })), 2000);
    }
  }, [isAllUploaded, compressedImages, fileSizeError, token, navigation]);

  // -----------------------------------------------------------------
  // Render Document Card
  // -----------------------------------------------------------------
  const renderDocumentCard = useCallback((doc) => (
    <View key={doc.id} style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <Text style={styles.documentLabel}>{doc.label}</Text>
        {compressionInfo[doc.id] && !fileSizeError[doc.id] && (
          <Text style={styles.compressionInfo}>
            Size: {formatFileSize(compressionInfo[doc.id].compressedSize)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.uploadArea,
          compressedImages[doc.id] && !fileSizeError[doc.id] && styles.uploadAreaSuccess,
          fileSizeError[doc.id] && styles.uploadAreaError,
          error[doc.id] && !fileSizeError[doc.id] && styles.uploadAreaError,
        ]}
        onPress={() => showPickerOptions(doc.id)}
        disabled={loading[doc.id]}
        activeOpacity={0.8}
      >
        {loading[doc.id] ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#000" size="large" />
            <Text style={styles.loadingText}>Processing...</Text>
            {uploadProgress[doc.id] !== undefined && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress[doc.id]}%` }]} />
                <Text style={styles.progressText}>{uploadProgress[doc.id]}%</Text>
              </View>
            )}
          </View>
        ) : images[doc.id] ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: images[doc.id] }} style={styles.preview} resizeMode="cover" />
            <View style={[styles.overlay, fileSizeError[doc.id] && styles.overlayError]}>
              {fileSizeError[doc.id] ? (
                <Ionicons name="close-circle" size={28} color="#FF4D4F" />
              ) : (
                <Ionicons name="checkmark-circle" size={28} color="#2F855A" />
              )}
              <Text style={[styles.overlayText, fileSizeError[doc.id] && styles.overlayTextError]}>
                {fileSizeError[doc.id] ? 'File too large' : 'Tap to change'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name={doc.icon} size={32} color="#666" />
            <Text style={styles.documentTitle}>{doc.label}</Text>
            <Text style={styles.uploadText}>Tap to upload</Text>
            <Text style={styles.fileSizeText}>Max 1MB</Text>
          </View>
        )}
      </TouchableOpacity>

      {error[doc.id] && <Text style={styles.errorText}>{error[doc.id]}</Text>}
    </View>
  ), [images, compressedImages, loading, fileSizeError, error, uploadProgress, compressionInfo, showPickerOptions, formatFileSize]);

  // -----------------------------------------------------------------
  // Picker Modal
  // -----------------------------------------------------------------
  const renderPickerModal = useMemo(() => (
    <Modal animationType="slide" transparent={true} visible={showPickerModal} onRequestClose={() => setShowPickerModal(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Source</Text>
          <Text style={styles.modalSubtitle}>You'll be able to crop and adjust the image</Text>

          <TouchableOpacity style={styles.modalButton} onPress={pickFromCamera}>
            <Ionicons name="camera" size={24} color="#000" />
            <Text style={styles.modalButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalButton} onPress={pickFromGallery}>
            <Ionicons name="images" size={24} color="#000" />
            <Text style={styles.modalButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowPickerModal(false); setCurrentDocId(null); }}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  ), [showPickerModal, pickFromCamera, pickFromGallery]);

  // -----------------------------------------------------------------
  // Main Render
  // -----------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      {renderPickerModal}

      <View style={styles.header}>
        <Text style={styles.title}>Document Upload</Text>
        <Text style={styles.subtitle}>Upload clear photos or documents (max 1MB)</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>{token ? 'Logout' : 'Login'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.documentsContainer}>
          {DOCUMENTS.map(renderDocumentCard)}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.submitButton, (!isAllUploaded || loading.submit) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isAllUploaded || loading.submit}
      >
        {loading.submit ? (
          <View style={styles.submitLoadingContainer}>
            <ActivityIndicator color="#FFF" size="small" />
            {uploadProgress.submit !== undefined && (
              <Text style={styles.submitProgressText}>Uploading... {uploadProgress.submit}%</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.submitButtonText}>
              Submit Documents ({Object.keys(compressedImages).length}/{requiredDocs.length})
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </>
        )}
      </TouchableOpacity>

      {error.submit && <Text style={[styles.errorText, styles.submitErrorText]}>{error.submit}</Text>}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------
// Styles (unchanged)
// ---------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#D0D0D0' },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  loginButton: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start' },
  loginButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  scrollContent: { flexGrow: 1, paddingBottom: 80 },
  documentsContainer: { padding: 16 },
  documentCard: { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#D0D0D0' },
  documentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  documentLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  compressionInfo: { fontSize: 12, color: '#2F855A', fontWeight: '500' },
  uploadArea: { borderRadius: 8, borderWidth: 1, borderColor: '#D0D0D0', borderStyle: 'dashed', overflow: 'hidden', height: 140, backgroundColor: '#F8F8F8' },
  uploadAreaSuccess: { borderColor: '#2F855A', borderStyle: 'solid', backgroundColor: '#F0FFF4' },
  uploadAreaError: { borderColor: '#FF4D4F', borderStyle: 'solid', backgroundColor: '#FFF1F1' },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  documentTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 4 },
  uploadText: { fontSize: 13, color: '#666', marginBottom: 4 },
  fileSizeText: { fontSize: 12, color: '#666', fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 13, color: '#666', fontWeight: '500' },
  progressBarContainer: { width: '80%', height: 6, backgroundColor: '#D0D0D0', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#000', borderRadius: 3 },
  progressText: { position: 'absolute', top: 8, alignSelf: 'center', fontSize: 12, color: '#000', fontWeight: '500' },
  previewContainer: { flex: 1, position: 'relative' },
  preview: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
  overlayError: { backgroundColor: 'rgba(255,200,200,0.85)' },
  overlayText: { marginTop: 6, fontSize: 13, color: '#000', fontWeight: '500' },
  overlayTextError: { color: '#FF4D4F', fontWeight: '600' },
  errorText: { color: '#FF4D4F', fontSize: 12, marginTop: 6, marginLeft: 4 },
  submitButton: { backgroundColor: '#000', margin: 16, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#A0A0A0' },
  submitButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600', marginRight: 8 },
  submitLoadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitProgressText: { color: '#FFF', fontSize: 13, marginLeft: 8, fontWeight: '500' },
  submitErrorText: { textAlign: 'center', marginBottom: 16 },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 32 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16, textAlign: 'center' },
  modalButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 8, backgroundColor: '#F8F8F8', marginBottom: 8 },
  modalButtonText: { fontSize: 16, color: '#333', marginLeft: 12, fontWeight: '500' },
  cancelButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D0D0D0', justifyContent: 'center', marginTop: 8 },
  cancelButtonText: { fontSize: 16, color: '#FF4D4F', fontWeight: '500', textAlign: 'center' },
});