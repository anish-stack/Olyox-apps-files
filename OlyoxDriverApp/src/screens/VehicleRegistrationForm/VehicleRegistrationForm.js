import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system"; // Use new File class
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import loginStore from "../../../Store/authStore";
import axiosInstance from "../../../constant/axios";

// Document definitions
const DOCUMENTS = [
  { id: "licence", title: "licence", label: "Driver's License", icon: "car" },
  { id: "rc", title: "rc", label: "Registration Certificate", icon: "id-card" },
  { id: "insurance", title: "insurance", label: "Insurance", icon: "shield" },
  { id: "pollution", title: "pollution", label: "Pollution Certificate", icon: "leaf" },
  { id: "aadharFront", title: "aadharFront", label: "Front Side Of Aadhar", icon: "id-card" },
  { id: "aadharBack", title: "aadharBack", label: "Back Side Of Aadhar", icon: "id-card" },
  { id: "panCard", title: "panCard", label: "Pan Card", icon: "card" },
  { id: "permit", title: "permit", label: "Permit", icon: "id-card" },
];

// API Configuration

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB in bytes

function VehicleRegistrationForm() {
  const { token } = loginStore();
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const [errors, setErrors] = useState({});
  const [fileSizeError, setFileSizeError] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const navigation = useNavigation();
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [formData, setFormData] = useState({
    vehicleDetails: {
      name: "",
      type: "",
      numberPlate: "",
    },
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(""); // "vehicleType" or "vehicleBrand"

  // Check if all required documents are uploaded
  const isAllUploaded = DOCUMENTS.every((doc) => images[doc.id] && !fileSizeError[doc.id]);

  // Check if form is valid
  const isFormValid =
    formData.vehicleDetails.name &&
    formData.vehicleDetails.type &&
    formData.vehicleDetails.numberPlate;

  useEffect(() => {
    fetchVehicleTypes();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant camera roll permissions to upload documents.", [
          { text: "OK" },
        ]);
      }
    } catch (error) {
      console.error("Permission request error:", error);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
            const response = await axiosInstance.get(`/api/v1/admin/getAllSuggestions`);

      if (response.data.success) {
        setVehicleTypes(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching vehicle types:", error);
      Alert.alert("Error", "Failed to fetch vehicle types. Please try again later.");
    }
  };

  const fetchVehicleBrands = async (typeId) => {
    try {
      const response = await axiosInstance.get(`/api/v1/admin/ride-sub-suggestion/by-category/${typeId}`);
      if (response.data.success && response.data.data.length > 0) {
        setVehicleBrands(response.data.data[0].subCategory || []);
      } else {
        setVehicleBrands([]);
      }
    } catch (error) {
      console.error("Error fetching vehicle brands:", error);
      setVehicleBrands([]);
      Alert.alert("Error", "Failed to fetch vehicle brands. Please try again later.");
    }
  };

  // Function to check file size using new File class
  const checkFileSize = async (uri) => {
    try {
      const file = new File(uri);
      console.log("Checking file size for URI:", file);
      const size = await file.size;
      return {
        size,
        isOverLimit: size > MAX_FILE_SIZE,
      };
    } catch (error) {
      console.error("Error checking file size:", error);
      return { size: 0, isOverLimit: false };
    }
  };

  // Format file size to a human-readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};

    if (!formData.vehicleDetails.type) {
      newErrors.vehicleType = "Please select a vehicle type";
    }

    if (!formData.vehicleDetails.name) {
      newErrors.vehicleName = "Please enter vehicle brand/name";
    }

    if (!formData.vehicleDetails.numberPlate) {
      newErrors.numberPlate = "Please enter number plate";
    } else if (!/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(formData.vehicleDetails.numberPlate)) {
      newErrors.numberPlate = "Please enter a valid number plate (e.g., DL01AB1234)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Image picking function with size validation
  const pickImage = async (type) => {
    try {
      setLoading((prev) => ({ ...prev, [type]: true }));
      setError((prev) => ({ ...prev, [type]: null }));
      setFileSizeError((prev) => ({ ...prev, [type]: false }));

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setError((prev) => ({
          ...prev,
          [type]: "Permission to access media library was denied",
        }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable cropping
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const { size, isOverLimit } = await checkFileSize(uri);

        if (isOverLimit) {
          setFileSizeError((prev) => ({ ...prev, [type]: true }));
          setError((prev) => ({
            ...prev,
            [type]: `File size (${formatFileSize(size)}) exceeds limit of 1MB`,
          }));
          setImages((prev) => ({ ...prev, [type]: uri }));
        } else {
          setImages((prev) => ({ ...prev, [type]: uri }));
          setUploadProgress((prev) => ({ ...prev, [type]: 100 }));
          setFileSizeError((prev) => ({ ...prev, [type]: false }));
        }
      }
    } catch (err) {
      setError((prev) => ({ ...prev, [type]: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Submit all documents
  const handleSubmit = async () => {
    if (!validateForm() || !isAllUploaded) {
      Alert.alert("Error", "Please complete all required fields and upload valid documents.");
      return;
    }

    if (!token) {
      Alert.alert("Error", "Authentication token not found");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, submit: true }));

      const formDataToSend = new FormData();
      formDataToSend.append("vehicleDetails[name]", formData.vehicleDetails.name);
      formDataToSend.append("vehicleDetails[type]", formData.vehicleDetails.type);
      formDataToSend.append("vehicleDetails[numberPlate]", formData.vehicleDetails.numberPlate.toUpperCase());

      Object.entries(images).forEach(([docType, uri]) => {
        if (fileSizeError[docType]) return;

        const uriParts = uri.split(".");
        const fileType = uriParts[uriParts.length - 1];

        formDataToSend.append("documents", {
          uri: uri,
          name: `${docType}.${fileType}`,
          type: `image/${fileType}`,
        });
        formDataToSend.append("documentTypes", docType);
      });

 

      const response = await axiosInstance.post('api/v1/rider/add-more-vehicle', formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress((prev) => ({ ...prev, submit: percentCompleted }));
        },
      });


      if (response.data.success) {
        Alert.alert(
          "Success",
          "Vehicle and documents registered successfully!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        setError({});
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (err) {
      console.log("Error during submission:", err.response);
      const errorMessage = err.response?.data?.message || err.message || "Failed to submit documents";
      Alert.alert("Error", errorMessage, [{ text: "OK" }]);
      setError((prev) => ({ ...prev, submit: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
      setUploadProgress((prev) => ({ ...prev, submit: 0 }));
    }
  };

  // Render document card
  const renderDocumentItem = ({ item: doc }) => (
    <View style={styles.documentCard}>
      <Text style={styles.documentLabel}>{doc.label}</Text>
      <TouchableOpacity
        style={[
          styles.uploadArea,
          fileSizeError[doc.id] && styles.uploadAreaError,
        ]}
        onPress={() => pickImage(doc.id)}
        disabled={loading[doc.id]}
      >
        {loading[doc.id] ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#1F2937" size="large" />
            <Text style={styles.loadingText}>Uploading...</Text>
            {uploadProgress[doc.id] !== undefined && (
              <Text style={styles.progressText}>{uploadProgress[doc.id]}%</Text>
            )}
          </View>
        ) : images[doc.id] ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: images[doc.id] }} style={styles.preview} />
            <View style={[styles.overlay, fileSizeError[doc.id] && styles.overlayError]}>
              {fileSizeError[doc.id] ? (
                <MaterialCommunityIcons name="close-circle" size={24} color="#991B1B" />
              ) : (
                <MaterialCommunityIcons name="check-circle" size={24} color="#1F2937" />
              )}
              <Text style={[styles.overlayText, fileSizeError[doc.id] && styles.overlayTextError]}>
                {fileSizeError[doc.id] ? "File too large" : "Tap to change"}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <MaterialCommunityIcons name={doc.icon} size={24} color="#6B7280" />
            <Text style={styles.uploadText}>Tap to upload</Text>
            <Text style={styles.fileSizeText}>Max size: 1MB</Text>
          </View>
        )}
      </TouchableOpacity>
      {error[doc.id] && (
        <Text style={styles.errorText}>{error[doc.id]}</Text>
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
        <Text style={styles.headerTitle}>Add New Vehicle</Text>
      </View>
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Vehicle Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <Text style={styles.sectionSubtitle}>Please fill all required details</Text>

            {/* Vehicle Type */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Vehicle Type <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.input, errors.vehicleType && styles.errorBorder]}
                onPress={() => {
                  setModalType("vehicleType");
                  setModalVisible(true);
                }}
              >
                <Text style={styles.inputText}>
                  {formData.vehicleDetails.type || "Select Vehicle Type"}
                </Text>
              </TouchableOpacity>
              {errors.vehicleType && <Text style={styles.formErrorText}>{errors.vehicleType}</Text>}
            </View>

            {/* Vehicle Brand/Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Vehicle Brand/Name <Text style={styles.required}>*</Text>
              </Text>
              {vehicleBrands.length > 0 ? (
                <TouchableOpacity
                  style={[styles.input, errors.vehicleName && styles.errorBorder]}
                  onPress={() => {
                    setModalType("vehicleBrand");
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.inputText}>
                    {formData.vehicleDetails.name || "Select Brand"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[styles.input, errors.vehicleName && styles.errorBorder]}
                  placeholder="Enter vehicle brand/name"
                  value={formData.vehicleDetails.name}
                  onChangeText={(text) => {
                    setFormData((prev) => ({
                      ...prev,
                      vehicleDetails: { ...prev.vehicleDetails, name: text },
                    }));
                    setErrors((prev) => ({ ...prev, vehicleName: null }));
                  }}
                />
              )}
              {errors.vehicleName && <Text style={styles.formErrorText}>{errors.vehicleName}</Text>}
            </View>

            {/* Number Plate */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Number Plate <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.numberPlate && styles.errorBorder]}
                placeholder="Ex: DL01AB1234"
                value={formData.vehicleDetails.numberPlate}
                onChangeText={(text) => {
                  setFormData((prev) => ({
                    ...prev,
                    vehicleDetails: { ...prev.vehicleDetails, numberPlate: text.toUpperCase() },
                  }));
                  setErrors((prev) => ({ ...prev, numberPlate: null }));
                }}
                autoCapitalize="characters"
                maxLength={15}
              />
              {errors.numberPlate && <Text style={styles.formErrorText}>{errors.numberPlate}</Text>}
            </View>
          </View>

          {/* Documents Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Upload</Text>
            <Text style={styles.sectionSubtitle}>Please upload clear photos of your documents</Text>
            <FlatList
              data={DOCUMENTS}
              renderItem={renderDocumentItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.listContent}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!isAllUploaded || !isFormValid || loading.submit) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isAllUploaded || !isFormValid || loading.submit}
          >
            {loading.submit ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Documents</Text>
            )}
          </TouchableOpacity>
          {error.submit && (
            <Text style={[styles.errorText, styles.submitErrorText]}>{error.submit}</Text>
          )}
        </ScrollView>
      </View>

      {/* Modal for selecting vehicle type or brand */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === "vehicleType" ? "Select Vehicle Type" : "Select Vehicle Brand"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {modalType === "vehicleType" ? (
                vehicleTypes.map((type) => (
                  <TouchableOpacity
                    key={type._id}
                    style={styles.modalItem}
                    onPress={() => {
                      setFormData((prev) => ({
                        ...prev,
                        vehicleDetails: { ...prev.vehicleDetails, type: type.name },
                      }));
                      setErrors((prev) => ({ ...prev, vehicleType: null }));
                      fetchVehicleBrands(type._id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{type.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                vehicleBrands.map((brand, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.modalItem}
                    onPress={() => {
                      setFormData((prev) => ({
                        ...prev,
                        vehicleDetails: { ...prev.vehicleDetails, name: brand },
                      }));
                      setErrors((prev) => ({ ...prev, vehicleName: null }));
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{brand}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(VehicleRegistrationForm);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    elevation: 2,
    shadowColor: "#000",
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
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
  },
  required: {
    color: "#991B1B",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  inputText: {
    color: "#1F2937",
    fontSize: 14,
  },
  errorBorder: {
    borderColor: "#991B1B",
  },
  formErrorText: {
    color: "#991B1B",
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  documentCard: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  uploadArea: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    height: 120,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  uploadAreaError: {
    borderColor: "#991B1B",
    borderStyle: "solid",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  uploadText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  fileSizeText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  progressText: {
    marginTop: 4,
    fontSize: 10,
    color: "#1F2937",
  },
  previewContainer: {
    flex: 1,
    position: "relative",
  },
  preview: {
    flex: 1,
    resizeMode: "cover",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayError: {
    backgroundColor: "rgba(254, 226, 226, 0.85)",
  },
  overlayText: {
    marginTop: 8,
    fontSize: 12,
    color: "#1F2937",
  },
  overlayTextError: {
    color: "#991B1B",
    fontWeight: "500",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: "#1F2937",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  submitErrorText: {
    textAlign: "center",
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 8,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalItemText: {
    fontSize: 16,
    color: "#1F2937",
  },
});