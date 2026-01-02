import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { API_URL_APP } from "../../../constant/api";
import loginStore from "../../../Store/authStore";

const API_BASE_URL = "https://webapi.olyox.com/api/v1";
const MAIN_API_BASE_URL =API_URL_APP
const { width } = Dimensions.get("window");

export default function Register() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bh ,phone:comingPhone } = route.params || {};
  const headerHeight = useHeaderHeight();

  const [step, setStep] = useState(1);
  const [maxAllowedStep, setMaxAllowedStep] = useState(1);
  const [userData, setUserData] = useState(null);
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [bhId, setBhId] = useState(bh ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("cab");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [rcExpireDate, setRcExpireDate] = useState("");
  const [showBhLookupModal, setShowBhLookupModal] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState(false);
  const [showVehicleNameDropdown, setShowVehicleNameDropdown] = useState(false);
  const [showParcelTypeDropdown, setShowParcelTypeDropdown] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [parcelVehicles, setParcelVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (bh) {
      setBhId(bh);
      fetchUserDetails();
    }
  }, [bh]);
  useEffect(()=>{
    if(comingPhone){
      setLookupPhone(comingPhone);
    setShowBhLookupModal(true)
    lookupBhId()
    }
  },[comingPhone])

  useEffect(() => {
    if (vehicleTypeId && role === "cab") {
      fetchVehicleBrands(vehicleTypeId);
    }
  }, [vehicleTypeId, role]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    setVehicleType("");
    setVehicleTypeId("");
    setVehicleName("");
    setVehicleBrands([]);
  }, [role]);

  const initializeComponent = useCallback(async () => {
    setIsInitializing(true);
    try {
      await Promise.all([fetchVehicleTypes(), fetchParcelVehicles()]);
    } catch (error) {
      setError("Failed to initialize. Please restart the app.");
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const fetchUserDetails = useCallback(async () => {
    if (!bhId || bhId.length < 2) {
      setError("Please enter a valid BH ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/app-get-details?Bh=${bhId}`);
      if (response.data.success) {
        const userData = response.data.data;
        setUserData(userData);
        setName(userData.name);
        setPhone(userData.number || "");
        advanceToStep(2);
        // setSuccess("User details loaded successfully!");
      } else {
        setError("User not found with this BH ID.");
      }
    } catch (error) {
      setError("Failed to fetch user details.");
    } finally {
      setLoading(false);
    }
  }, [bhId]);

  const fetchVehicleTypes = useCallback(async () => {
    try {
      const response = await axios.get(`${MAIN_API_BASE_URL}/api/v1/admin/getAllSuggestions`);
      if (response.data.success) {
        setVehicleTypes(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching vehicle types:", error);
    }
  }, []);

  const fetchVehicleBrands = useCallback(async (typeId) => {
    try {
      const response = await axios.get(`${MAIN_API_BASE_URL}/api/v1/admin/ride-sub-suggestion/by-category/${typeId}`);
      if (response.data.success && response.data.data.length > 0) {
        setVehicleBrands(response.data.data[0].subCategory || []);
      } else {
        setVehicleBrands([]);
      }
    } catch (error) {
      console.error("Error fetching vehicle brands:", error);
      setVehicleBrands([]);
    }
  }, []);

  const fetchParcelVehicles = useCallback(async () => {
    try {
      const response = await axios.get(`${MAIN_API_BASE_URL}/api/v1/parcel/all-parcel`);
      if (response.data.success) {
        setParcelVehicles(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching parcel vehicles:", error);
    }
  }, []);

  const lookupBhId = useCallback(async () => {
    if (!lookupPhone || lookupPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setLookupLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE_URL}/getProviderDetailsByNumber`, {
        number: lookupPhone,
      });
      if (response.data.success && response.data.BH_ID) {
        setBhId(response.data.BH_ID);
        setShowBhLookupModal(false);
        setLookupPhone("");
        setSuccess("BH ID found!");
      } else {
        setError("No BH ID found for this phone number");
      }
    } catch (error) {
      setError("Failed to lookup BH ID.");
    } finally {
      setLookupLoading(false);
    }
  }, [lookupPhone]);

const registerRider = useCallback(async () => {
  if (!validateStep2Form()) {
    console.log('❌ Step 2 validation failed');
    return;
  }

  setLoading(true);
  setError("");

  try {
    const endpoint = `${MAIN_API_BASE_URL}/api/v1/rider/register`;
    const payload = {
      name,
      phone,
      BH: bhId,
      role,
      aadharNumber: userData?.aadharNumber || "",
      rideVehicleInfo: {
        vehicleName,
        vehicleType,
        RcExpireDate: rcExpireDate,
        VehicleNumber: vehicleNumber,
      },
    };

    console.log('📤 Sending registration payload:', payload);

    const response = await axios.post(endpoint, payload);
    console.log('📥 Registration response:', response.data.token);
    console.log('📥 Registration response:', response.data);


    if (response.data.success) {
      const data = response.data;

      // ✅ If backend returns a token, set Zustand login store state
      if (data.token) {
        loginStore.setState({
          token: data.token,
          authenticated: true,
          loading: false,
          otp_sent: false,
          role: data.redirect || role,
          accountStatus: data.accountStatus,
          documentVerify: data.DocumentVerify,
          isDocumentUpload: data.isDocumentUpload,
        });

        console.log('✅ Login store updated after registration');

        setSuccess("Registration successful!");

        // Save token securely for persistence
        const tokenKey = role === "cab" ? "auth_token" : "auth_token";
        await SecureStore.setItemAsync(tokenKey, data.token);

        // Navigate based on user status
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "DocumentUpload", params: { role } }],
          });
        }, 1000);
      } else {
        // 🔁 OTP flow
        setSuccess(data.message || "OTP sent successfully!");
        console.log('🔑 OTP registration, navigate to OTP screen', data.rider?.otp);

        navigation.reset({
          index: 0,
          routes: [{ name: "DocumentUpload", params: { phone, role, BH: bhId } }],
        });
      }
    } else {
      setError(response.data.message || "Registration failed");
    }
  } catch (error) {
    console.error('❌ Registration error:', error.response?.data || error.message);
    setError(error.response?.data?.message || "Registration failed.");
  } finally {
    setLoading(false);
  }
}, [name, phone, bhId, role, userData, vehicleName, vehicleType, rcExpireDate, vehicleNumber, navigation]);
  const validateStep2Form = useCallback(() => {
    const missingFields = [];
    if (!name.trim()) missingFields.push("Name");
    if (!phone.trim()) missingFields.push("Phone");
    if (role === "cab") {
      if (!vehicleType) missingFields.push("Vehicle Type");
      if (!vehicleName) missingFields.push("Vehicle Brand");
    } else {
      if (!vehicleType) missingFields.push("Parcel Vehicle Type");
    }
    if (!vehicleNumber.trim()) missingFields.push("Vehicle Number");
    if (!rcExpireDate) missingFields.push("RC Registration Date");
    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(", ")}`);
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number");
      return false;
    }
    return true;
  }, [name, phone, role, vehicleType, vehicleName, vehicleNumber, rcExpireDate]);

  const navigateToStep = useCallback((targetStep) => {
    if (targetStep <= maxAllowedStep && targetStep >= 1) {
      setStep(targetStep);
      setError("");
      setSuccess("");
    }
  }, [maxAllowedStep]);

  const advanceToStep = useCallback((targetStep) => {
    setStep(targetStep);
    setMaxAllowedStep(Math.max(maxAllowedStep, targetStep));
  }, [maxAllowedStep]);

  const showDatePicker = useCallback(() => setIsDatePickerVisible(true), []);
  const hideDatePicker = useCallback(() => setIsDatePickerVisible(false), []);

  const formatDate = useCallback((date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
  }, []);

  const handleDateChange = useCallback((event, selectedDate) => {
    if (event.type === "set") {
      setRcExpireDate(selectedDate || date);
      hideDatePicker();
    } else {
      hideDatePicker();
    }
  }, [date, hideDatePicker]);

  const renderProgressIndicator = useMemo(() => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        {[1, 2].map((stepNumber) => (
          <View key={stepNumber} style={styles.progressStepContainer}>
            <TouchableOpacity
              style={[
                styles.progressStep,
                step >= stepNumber && styles.progressStepActive,
                stepNumber <= maxAllowedStep && styles.progressStepClickable,
              ]}
              onPress={() => navigateToStep(stepNumber)}
              disabled={stepNumber > maxAllowedStep}
            >
              <Text style={[styles.progressStepText, step >= stepNumber && styles.progressStepTextActive]}>
                {stepNumber}
              </Text>
            </TouchableOpacity>
            {stepNumber < 2 && (
              <View style={[styles.progressLine, step > stepNumber && styles.progressLineActive]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>BH ID</Text>
        <Text style={styles.progressLabel}>Details</Text>
      </View>
    </View>
  ), [step, maxAllowedStep, navigateToStep]);

  const renderBhLookupModal = useMemo(() => (
    <Modal
      visible={showBhLookupModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBhLookupModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Find Your Refferal ID</Text>
          <Text style={styles.modalSubtitle}>Enter your registered phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit phone number"
            value={lookupPhone}
            onChangeText={setLookupPhone}
            keyboardType="phone-pad"
            maxLength={10}
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                setShowBhLookupModal(false);
                setLookupPhone("");
              }}
              disabled={lookupLoading}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, (lookupLoading || lookupPhone.length !== 10) && styles.buttonDisabled]}
              onPress={lookupBhId}
              disabled={lookupLoading || lookupPhone.length !== 10}
            >
              {lookupLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Find Refferal ID</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [showBhLookupModal, lookupPhone, lookupLoading, lookupBhId]);

  const renderDropdown = useMemo(
    () => (visible, setVisible, items, onSelect, placeholder, selectedValue) => (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <ScrollView style={styles.dropdownScrollView}>
              {items.map((item, index) => {
                const displayText = item.name || item.title || item;
                const compareValue = item.name || item.info || item;
                return (
                  <TouchableOpacity
                    key={item._id || index}
                    style={[styles.dropdownItem, selectedValue === compareValue && styles.dropdownItemSelected]}
                    onPress={() => onSelect(item)}
                  >
                    <Text style={[styles.dropdownItemText, selectedValue === compareValue && styles.dropdownItemTextSelected]}>
                      {displayText}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    ),
    []
  );

  const renderUserInfo = useMemo(() => {
    if (!userData) return null;
    return (
      <View style={styles.userInfoCard}>
        <Text style={styles.userInfoTitle}>✓ User Verified</Text>
        <View style={styles.userInfoRow}>
          <Text style={styles.userInfoLabel}>Name:</Text>
          <Text style={styles.userInfoValue}>{userData.name}</Text>
        </View>
        {userData.category && (
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Category:</Text>
            <Text style={styles.userInfoValue}>{userData.category.title}</Text>
          </View>
        )}
        <View style={styles.userInfoRow}>
          <Text style={styles.userInfoLabel}>Aadhar:</Text>
          <Text style={styles.userInfoValue}>{userData.aadharNumber || "Not provided"}</Text>
        </View>
        <Text style={styles.userInfoNote}>*Aadhar cannot be changed after registration.</Text>
      </View>
    );
  }, [userData]);

  const renderRoleSelection = useMemo(() => (
    <View style={styles.roleContainer}>
      <Text style={styles.sectionTitle}>Service Type</Text>
      <View style={styles.roleButtonsContainer}>
        <TouchableOpacity
          style={[styles.roleButton, role === "cab" && styles.roleButtonActive]}
          onPress={() => setRole("cab")}
        >
          <Ionicons name="car-outline" size={24} color={role === "cab" ? "#000000" : "#666666"} />
          <Text style={[styles.roleButtonText, role === "cab" && styles.roleButtonTextActive]}>Cab / Bike Driver</Text>
          <Text style={styles.roleButtonSubtext}>Passenger rides</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === "parcel" && styles.roleButtonActive]}
          onPress={() => setRole("parcel")}
        >
          <Ionicons name="cube-outline" size={24} color={role === "parcel" ? "#000000" : "#666666"} />
          <Text style={[styles.roleButtonText, role === "parcel" && styles.roleButtonTextActive]}>Delivery Partner</Text>
          <Text style={styles.roleButtonSubtext}>Parcel delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [role]);

  const renderStep1 = useMemo(() => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Enter Your Refferal ID</Text>
      <Text style={styles.stepSubtitle}>Enter your Refferal ID to proceed</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Refferal ID"
        value={bhId}
        onChangeText={setBhId}
        autoComplete="off"
        textContentType="none"
        autoCapitalize="characters"
      />
      <TouchableOpacity onPress={() => setShowBhLookupModal(true)} style={styles.helpButton}>
        <Text style={styles.helpButtonText}>Find your Refferal ID</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, (!bhId.trim() || loading) && styles.buttonDisabled]}
        onPress={fetchUserDetails}
        disabled={loading || !bhId.trim()}
      >
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonPrimaryText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  ), [bhId, loading, fetchUserDetails]);

  const renderStep2 = useMemo(() => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={headerHeight + 120}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Complete Profile</Text>
          {renderUserInfo}
          {renderRoleSelection}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TextInput style={[styles.input, styles.disabledInput]} placeholder="Full Name" value={name} editable={false} />
            <TextInput style={[styles.input, styles.disabledInput]} placeholder="Phone Number" value={phone} editable={false} keyboardType="phone-pad" />
          </View>
          {role === "cab" ? (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              <TouchableOpacity onPress={() => setShowVehicleTypeDropdown(true)} style={styles.dropdownButton}>
                <Text style={[styles.dropdownButtonText, !vehicleType && styles.dropdownButtonPlaceholder]}>
                  {vehicleType || "Select Vehicle Type *"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666666" />
              </TouchableOpacity>
              {vehicleTypeId && (
                <TouchableOpacity onPress={() => setShowVehicleNameDropdown(true)} style={styles.dropdownButton}>
                  <Text style={[styles.dropdownButtonText, !vehicleName && styles.dropdownButtonPlaceholder]}>
                    {vehicleName || "Select Vehicle Brand *"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666666" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Delivery Vehicle</Text>
              <TouchableOpacity onPress={() => setShowParcelTypeDropdown(true)} style={styles.dropdownButton}>
                <Text style={[styles.dropdownButtonText, !vehicleType && styles.dropdownButtonPlaceholder]}>
                  {vehicleType || "Select Delivery Vehicle Type *"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666666" />
              </TouchableOpacity>
              {vehicleType && (
                <View style={styles.selectedVehicleInfo}>
                  <Text style={styles.selectedVehicleTitle}>Selected Vehicle:</Text>
                  <Text style={styles.selectedVehicleText}>{vehicleName} - {vehicleType}</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Vehicle Registration</Text>
            <TextInput
              style={styles.input}
              placeholder="Vehicle Number (e.g., DL01ABC1234)"
              value={vehicleNumber}
              onChangeText={(text) => setVehicleNumber(text.toUpperCase())}
              maxLength={15}
              autoCapitalize="characters"
            />
            <TouchableOpacity onPress={showDatePicker} style={styles.dateButton}>
              <Text style={[styles.dateButtonText, !rcExpireDate && styles.dropdownButtonPlaceholder]}>
                {rcExpireDate ? `RC Registration: ${formatDate(rcExpireDate)}` : "Select RC Registration Date *"}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#666666" />
            </TouchableOpacity>
            {isDatePickerVisible && (
              <DateTimePicker value={date} mode="date" onChange={handleDateChange} display="default" maximumDate={new Date()} />
            )}
          </View>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={registerRider}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonPrimaryText}>Complete Registration</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  ), [
    name,
    phone,
    role,
    vehicleType,
    vehicleName,
    vehicleTypeId,
    vehicleNumber,
    rcExpireDate,
    loading,
    renderUserInfo,
    renderRoleSelection,
    showDatePicker,
    isDatePickerVisible,
    handleDateChange,
    registerRider,
    formatDate,
  ]);

  const renderMessage = useMemo(() => {
    if (!error && !success) return null;
    return (
      <View style={[styles.messageContainer, error ? styles.errorMessage : styles.successMessage]}>
        <Text style={styles.messageText}>{error || success}</Text>
      </View>
    );
  }, [error, success]);

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {renderProgressIndicator}
        {renderMessage}
        {step === 1 && renderStep1}
        {step === 2 && renderStep2}
        {renderBhLookupModal}
        {renderDropdown(
          showVehicleTypeDropdown,
          setShowVehicleTypeDropdown,
          vehicleTypes,
          (type) => {
            setVehicleType(type.name);
            setVehicleTypeId(type._id);
            setShowVehicleTypeDropdown(false);
            setVehicleName("");
          },
          "Select Vehicle Type",
          vehicleType
        )}
        {renderDropdown(
          showVehicleNameDropdown,
          setShowVehicleNameDropdown,
          vehicleBrands,
          (brand) => {
            setVehicleName(brand);
            setShowVehicleNameDropdown(false);
          },
          "Select Vehicle Brand",
          vehicleName
        )}
        {renderDropdown(
          showParcelTypeDropdown,
          setShowParcelTypeDropdown,
          parcelVehicles,
          (vehicle) => {
            setVehicleType(vehicle.info);
            setVehicleName(vehicle.title);
            setShowParcelTypeDropdown(false);
          },
          "Select Delivery Vehicle Type",
          vehicleType
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 12,
  },
  progressContainer: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  progressStepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  progressStepActive: {
    backgroundColor: "#000000",
  },
  progressStepClickable: {
    borderWidth: 1,
    borderColor: "#000000",
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  progressStepTextActive: {
    color: "#FFFFFF",
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: "#000000",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  progressLabel: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorMessage: {
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FF4D4F",
  },
  successMessage: {
    backgroundColor: "#F0FFF4",
    borderWidth: 1,
    borderColor: "#2F855A",
  },
  messageText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333333",
    textAlign: "center",
  },
  stepContainer: {
    paddingVertical: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    color: "#333333",
  },
  disabledInput: {
    backgroundColor: "#F0F0F0",
    color: "#A0A0A0",
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#000000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  buttonDisabled: {
    backgroundColor: "#A0A0A0",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: "#333333",
    fontSize: 15,
    fontWeight: "500",
  },
  helpButton: {
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  helpButtonText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  userInfoCard: {
    marginBottom: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  userInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  userInfoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  userInfoLabel: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
    width: 80,
  },
  userInfoValue: {
    fontSize: 13,
    color: "#333333",
    fontWeight: "500",
    flex: 1,
  },
  userInfoNote: {
    fontSize: 12,
    color: "#A0A0A0",
    fontStyle: "italic",
    marginTop: 8,
  },
  roleContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  roleButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  roleButtonActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginTop: 4,
    marginBottom: 4,
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  roleButtonSubtext: {
    fontSize: 12,
    color: "#A0A0A0",
  },
  formSection: {
    marginBottom: 16,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    marginBottom: 12,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: "#333333",
    fontWeight: "500",
  },
  dropdownButtonPlaceholder: {
    color: "#A0A0A0",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dropdownContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    width: width - 32,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D0D0D0",
  },
  dropdownScrollView: {
    maxHeight: 240,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownItemSelected: {
    backgroundColor: "#F0F0F0",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333333",
  },
  dropdownItemTextSelected: {
    color: "#000000",
    fontWeight: "600",
  },
  selectedVehicleInfo: {
    backgroundColor: "#F8F8F8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  selectedVehicleTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  selectedVehicleText: {
    fontSize: 13,
    color: "#666666",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: "#333333",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    width: width - 32,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
});