import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axiosInstance from "../../../constant/axios";
import useUserStore from "../../../Store/useUserStore";
import { SafeAreaView } from "react-native-safe-area-context";
export default function ViewAndEditDocuments() {
  const { user, fetchUserDetails } = useUserStore();
  const [documents, setDocuments] = useState(user?.documents || {});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigation = useNavigation();

  const documentLabels = {
    profile: "Profile Photo",
    aadharFront: "Aadhar Front",
    aadharBack: "Aadhar Back",
    license: "License",
    rc: "RC",
    pancard: "PAN Card",
    insurance: "Insurance",
  };

  // Pick image from gallery and reload user details
  const handleImagePick = async (key) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission required to access gallery!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0].uri;
      setDocuments((prev) => ({
        ...prev,
        [key]: selectedImage,
      }));
      // Reload user details after image pick
      await fetchUserDetails();
    }
  };

  // Submit updated documents
  const handleUpdate = async () => {
    try {
      setLoading(true);
      const formData = new FormData();

      // Append updated image files
      for (const [key, value] of Object.entries(documents)) {
        if (value && value.startsWith("file")) {
          formData.append(key, {
            uri: value,
            name: `${key}.jpg`,
            type: "image/jpeg",
          });
        }
      }

      const res = await axiosInstance.put(
        `/api/v1/rider/update_rider_detail/${user?._id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await fetchUserDetails();
      alert("Documents updated successfully!");
    } catch (error) {
      console.error("Error updating documents", error);
      alert("Something went wrong while updating!");
    } finally {
      setLoading(false);
    }
  };

  // Handle image click to show in modal
  const handleImagePress = (uri) => {
    if (uri && uri !== "https://via.placeholder.com/150?text=No+Image") {
      setSelectedImage(uri);
      setModalVisible(true);
    }
  };

  // Render each document card
  const renderDocumentItem = ({ item: key }) => (
    <View style={styles.card}>
      <Text style={styles.label}>{documentLabels[key]}</Text>
      <TouchableOpacity onPress={() => handleImagePress(documents[key])}>
        <Image
          source={{
            uri:
              documents[key] ||
              "https://via.placeholder.com/150?text=No+Image",
          }}
          style={styles.image}
        />
      </TouchableOpacity>
      {!user?.DocumentVerify && (
        <TouchableOpacity
          onPress={() => handleImagePick(key)}
          style={styles.uploadButton}
        >
          <Text style={styles.uploadText}>Upload New</Text>
        </TouchableOpacity>
      )}

    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Documents</Text>

      </View>
      <View style={styles.content}>

        {user?.documentRejected && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffe5e5',
              borderLeftWidth: 4,
              borderLeftColor: '#ff4d4d',
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 8,
              marginVertical: 8,
            }}
          >
            <MaterialCommunityIcons
              name="alert-circle"
              size={22}
              color="#d32f2f"
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: '#d32f2f',
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                Rejected
              </Text>
              <Text
                style={{
                  color: '#b71c1c',
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {user?.documentRejectReason || 'No reason provided'}
              </Text>
            </View>
          </View>
        )}

        <FlatList
          data={Object.keys(documentLabels)}
          renderItem={renderDocumentItem}
          keyExtractor={(item) => item}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
        />
        {!user?.DocumentVerify && (
          <TouchableOpacity
            style={[styles.updateButton, loading && { opacity: 0.6 }]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.updateButtonText}>Update Documents</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Modal for full-screen image view */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
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
    color: '#1F2937',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '48%', // Adjusted for two columns with spacing
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 120, // Reduced height for grid layout
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#E5E7EB',
  },
  uploadButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadText: {
    color: '#1F2937',
    fontWeight: '500',
    fontSize: 12,
  },
  updateButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  updateButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
});