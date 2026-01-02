
import { useState, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal

} from "react-native"
import * as ImagePicker from "expo-image-picker"
import axios from "axios"
import { MaterialIcons, Ionicons } from "@expo/vector-icons"
import { } from 'react-native'
import { API_BASE_URL_V2 } from "../../constant/Api"
import { useToken } from "../../context/AuthContext"
import { useNavigation, CommonActions } from "@react-navigation/native"

import Layout from "../../components/Layout/Layout"
import styles from './upload_Documents.styles'

export default function UploadDocuments() {
  const { token } = useToken()
  const [selectedImages, setSelectedImages] = useState({})
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const navigation = useNavigation()
  const documentFields = [
    { key: "aadhar_front", label: "Aadhar Front", icon: "credit-card" },
    { key: "aadhar_Back", label: "Aadhar Back", icon: "credit-card" },
    { key: "panCard", label: "PAN Card", icon: "account-balance-wallet" },
    { key: "gst", label: "GST", icon: "receipt" },
    { key: "addressProof", label: "Address Proof", icon: "home" },
    { key: "ProfilePic", label: "Profile Picture", icon: "person" },
  ]

  useEffect(() => {
    ; (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Required", "You need to grant permission to access the gallery.")
      }
    })()
  }, [])

  const pickImage = async (fieldName) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })

    if (!result.canceled) {
      setSelectedImages((prev) => ({ ...prev, [fieldName]: result.assets[0].uri }))
    }
  }

  const uploadDocuments = async () => {
    if (Object.keys(selectedImages).length === 0) {
      Alert.alert("Error", "Please select at least one document to upload.")
      return
    }

    setLoading(true)

    const formData = new FormData()
    Object.keys(selectedImages).forEach((key) => {
      formData.append(key, {
        uri: selectedImages[key],
        type: "image/jpeg",
        name: `${key}.jpg`,
      })
    })

    try {
      const response = await axios.post(`${API_BASE_URL_V2}/add-document`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success) {
        Alert.alert("Success", "Documents uploaded successfully.")
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        );
        setSelectedImages({})
      } else {
        Alert.alert("Upload Failed", response.data.message || "Something went wrong.")
      }
    } catch (error) {
      console.error("Upload Error:", error)
      Alert.alert("Error", error.response.data.message)
    } finally {
      setLoading(false)
      setModalVisible(false)
    }
  }

  const renderDocumentCard = (field) => (
    <TouchableOpacity key={field.key} style={styles.documentCard} onPress={() => pickImage(field.key)}>
      <View style={styles.documentIconContainer}>
        <MaterialIcons name={field.icon} size={32} color="#c41e3a" />
      </View>
      <Text style={styles.documentLabel}>{field.label}</Text>
      {selectedImages[field.key] ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImages[field.key] }} style={styles.previewImage} />
          <View style={styles.uploadedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
        </View>
      ) : (
        <View style={styles.uploadPrompt}>
          <Ionicons name="cloud-upload-outline" size={24} color="#666" />
          <Text style={styles.uploadPromptText}>Tap to upload</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Upload Documents</Text>
        <Text style={styles.subtitle}>Please upload clear images of the following documents</Text>

        <View style={styles.documentGrid}>{documentFields.map(renderDocumentCard)}</View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(Object.keys(selectedImages).length / documentFields.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Object.keys(selectedImages).length} of {documentFields.length} uploaded
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, Object.keys(selectedImages).length === 0 && styles.submitButtonDisabled]}
          onPress={() => setModalVisible(true)}
          disabled={Object.keys(selectedImages).length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" style={styles.submitIcon} />
              <Text style={styles.submitText}>Submit Documents</Text>
            </>
          )}
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Submission</Text>
              <Text style={styles.modalText}>Are you sure you want to submit the selected documents?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={uploadDocuments}>
                  <Text style={styles.modalButtonText}>{loading ? 'Please Wait ...' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </Layout>
  )
}


