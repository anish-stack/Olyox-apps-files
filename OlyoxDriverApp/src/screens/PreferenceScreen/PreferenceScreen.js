import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import BottomTab from "../../components/common/BottomTab";
import useUserStore from "../../../Store/useUserStore";
import axiosInstance from "../../../constant/axios";
import HeaderWithBack from "../../components/common/HeaderWithBack";

export default function PreferenceScreen() {
  const { user, fetchUserDetails } = useUserStore();
  const navigation = useNavigation();

  const [preferences, setPreferences] = useState({});
  const [availablePreferences, setAvailablePreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [vehicleTypeModal, setVehicleTypeModal] = useState(false);

  // Load user if not available
  useEffect(() => {
    const initUser = async () => {
      try {
        if (!user?._id) {
          await fetchUserDetails();
        }
      } catch (err) {
        console.log("Error fetching user details:", err);
      }
    };
    initUser();
  }, []);

  // Fetch preferences after user is ready
  useEffect(() => {
    if (user?._id) {
      getPreferences(user._id);
    }
  }, [user]);

  const getPreferences = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`api/v1/new/get-prefrences/${id}`);
      if (res.success && res.data?.success) {
        setPreferences(res.data.data.currentPreferences);
        setAvailablePreferences(res.data.data.availablePreferences);
      } else {
        setError(res.message || "Failed to fetch preferences");
      }
    } catch (err) {
      console.log("Error fetching preferences:", err);
      setError("Something went wrong while fetching preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    if (!user?._id) {
      Alert.alert("Error", "User not available");
      return;
    }

    setSaving(true);
    try {
      const res = await axiosInstance.post(`api/v1/new/update-rider-preferences`, {
        riderId: user._id,
        preferences: { [key]: value },
        changedBy: "rider",
        reason: "Updated from mobile app",
      });

      // console.log("res ",res )

      if (res.success && res.data?.success) {
        setPreferences((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            enabled: value,
          },
        }));
      } else {
        // Check for vehicle type restriction message
        const errorMsg = res.data?.message || "Update failed";
        const lowerMsg = errorMsg.toLowerCase();
        if ((lowerMsg.includes("parcel") && lowerMsg.includes("vehicle")) || 
            lowerMsg.includes("own vehicle type") ||
            lowerMsg.includes("vehicle t")) {
          setVehicleTypeModal(true);
        } else {
          Alert.alert("Update Failed", errorMsg);
        }
      }
    } catch (err) {
      console.log("Update error:", err);
      const errorMsg = err?.response?.data?.message || "Failed to update preference";
      const lowerMsg = errorMsg.toLowerCase();
      if ((lowerMsg.includes("parcel") && lowerMsg.includes("vehicle")) || 
          lowerMsg.includes("own vehicle type") ||
          lowerMsg.includes("vehicle t")) {
        setVehicleTypeModal(true);
      } else {
        Alert.alert("Error", errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const formatPreferenceName = (key) => {
    const nameMap = {
      OlyoxPriority: "Olyox Priority",
      FoodDelivery: "Food Delivery",
      ParcelDelivery: "Parcel Delivery",
      OlyoxGo: "Olyox Go",
      OlyoxIntercity: "Olyox Intercity",
      OlyoxAcceptMiniRides: "Accept Mini Rides",
      OlyoxAcceptSedanRides: "Accept Sedan Rides",
    };
    return nameMap[key] || key;
  };

  const getPreferenceIcon = (key) => {
    const iconMap = {
      OlyoxPriority: "⭐",
      FoodDelivery: "🍔",
      ParcelDelivery: "📦",
      OlyoxGo: "🚗",
      OlyoxIntercity: "🛣️",
      OlyoxAcceptMiniRides: "🚙",
      OlyoxAcceptSedanRides: "🚘",
    };
    return iconMap[key] || "⚙️";
  };

  const getPreferenceDescription = (key) => {
    const descMap = {
      OlyoxPriority: "Get priority access to rides",
      FoodDelivery: "Accept food delivery orders",
      ParcelDelivery: "Accept parcel delivery orders",
      OlyoxGo: "Accept regular ride requests",
      OlyoxIntercity: "Accept intercity trips",
      OlyoxAcceptMiniRides: "Accept mini vehicle rides",
      OlyoxAcceptSedanRides: "Accept sedan vehicle rides",
    };
    return descMap[key] || "";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderWithBack title="Preferences" background={false} />
        <View style={styles.centerContent}>
          <View style={styles.loadingIcon}>
            <Text style={styles.loadingIconText}>⚙️</Text>
          </View>
          <ActivityIndicator size="large" color="#000" style={styles.loader} />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // console.log("vehicleTypeModal",vehicleTypeModal)
  // if (error && vehicleTypeModal ===false) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <HeaderWithBack title="Preferences" background={false} />
  //       <View style={styles.centerContent}>
  //         <View style={styles.errorIcon}>
  //           <Text style={styles.errorIconText}>⚠️</Text>
  //         </View>
  //         <Text style={styles.errorTitle}>Oops!</Text>
  //         <Text style={styles.errorText}>{error}</Text>
  //         <TouchableOpacity style={styles.retryBtn} onPress={() => getPreferences(user?._id)}>
  //           <Text style={styles.retryText}>Try Again</Text>
  //         </TouchableOpacity>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithBack title="Preferences" background={false} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Your Service Preferences</Text>
          <Text style={styles.headerSubtitle}>
            Customize which services you want to receive
          </Text>
        </View>

        {availablePreferences.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>No Preferences Available</Text>
            <Text style={styles.emptyText}>
              There are no preferences to configure at the moment
            </Text>
          </View>
        ) : (
          <View style={styles.preferencesGrid}>
            {availablePreferences.map((key) => {
              const prefData = preferences[key];
              const isEnabled = prefData?.enabled || false;

              return (
                <View
                  key={key}
                  style={[styles.prefCard, isEnabled && styles.prefCardActive]}
                >
                  <View style={styles.prefIconContainer}>
                    <Text style={styles.prefIcon}>{getPreferenceIcon(key)}</Text>
                  </View>
                  
                  <View style={styles.prefContent}>
                    <Text style={[styles.prefTitle, isEnabled && styles.prefTitleActive]}>
                      {formatPreferenceName(key)}
                    </Text>
                    <Text style={styles.prefDescription}>
                      {getPreferenceDescription(key)}
                    </Text>
                  </View>

                  <Switch
                    value={isEnabled}
                    onValueChange={(val) => handleToggle(key, val)}
                    trackColor={{ false: "#E5E5E5", true: "#000" }}
                    thumbColor="#FFF"
                    disabled={saving}
                    style={styles.switch}
                  />
                </View>
              );
            })}
          </View>
        )}

        {saving && (
          <View style={styles.savingBanner}>
            <ActivityIndicator size="small" color="#000" />
            <Text style={styles.savingText}>Updating...</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Vehicle Type Restriction Modal */}
      <Modal
        visible={vehicleTypeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setVehicleTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>🚗</Text>
            </View>
            
            <Text style={styles.modalTitle}>Vehicle Type Restriction</Text>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                You can only accept parcel deliveries in your own vehicle type.
              </Text>
              
              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                  To accept parcel deliveries, make sure your vehicle type matches the service requirements.
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setVehicleTypeModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomTab active="Preference" showDetails={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },

  // Loading State
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loadingIconText: {
    fontSize: 40,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },

  // Error State
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorIconText: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Header Section
  headerSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Preferences Grid
  preferencesGrid: {
    gap: 12,
  },
  prefCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E5E5",
  },
  prefCardActive: {
    backgroundColor: "#F5F5F5",
    borderColor: "#000",
  },
  prefIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  prefIcon: {
    fontSize: 24,
  },
  prefContent: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  prefTitleActive: {
    fontWeight: "700",
  },
  prefDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  switch: {
    marginLeft: 12,
  },

  // Saving Banner
  savingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  savingText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconText: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
    textAlign: "center",
  },
  modalBody: {
    width: "100%",
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  bottomPadding: {
    height: 100,
  },
});