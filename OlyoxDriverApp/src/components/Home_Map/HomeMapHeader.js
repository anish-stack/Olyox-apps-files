import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  NativeModules,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import useUserStore from "../../../Store/useUserStore";
import { useNavigation } from "@react-navigation/native";
import useAppPermissions from "../../hooks/useAppPermissions";
import useRideStore from "../../../Store/PoolingStore";
import { API_URL_APP } from "../../../constant/api";
import loginStore from "../../../Store/authStore";
import { getFCMToken } from "../../../utility/NotificationService";

const { FloatingWidget, RideModule } = NativeModules;

export default function HomeMapHeader({ onZoom, onCenter }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { token } = loginStore();
  const { startPooling, stopPooling } = useRideStore();
  const { user, toggleFnc, fetchUserDetails } = useUserStore();
  const [onDuty, setOnDuty] = useState(user?.isAvailable || false);
  const [isLoading, setIsLoading] = useState(false);
  const { permissions, requestPermission, checkPermissions } =
    useAppPermissions();

  const handleToggle = async () => {
    console.log("🚀 handleToggle started", token);
    setIsLoading(true);
    await getFCMToken(token);
    let result;

    try {
      // 1️⃣ Check permissions
      console.log("Checking permissions...");
      await checkPermissions();
      console.log("Permissions checked:", permissions);

      if (
        !permissions.location ||
        !permissions.overlay ||
        (Platform.Version >= 33 && !permissions.notification)
      ) {
        console.log("❌ Required permissions missing, redirecting to Settings");
        Alert.alert(
          "Permissions Required",
          "Please grant all required permissions to go ON DUTY."
        );
        navigation.navigate("Settings");
        return;
      }

      // 2️⃣ Toggle duty status
      console.log("✅ All permissions granted, toggling duty status...");
      result = await toggleFnc(false);
      console.log("Toggle API result:", result);

      // 3️⃣ Handle recharge expired case (returned from API)
      if (result?.expired) {
        const vehicle = user.rideVehicleInfo || {};
        const showOnlyBikePlan =
          vehicle.vehicleName?.toLowerCase() === "2 wheeler" ||
          vehicle.vehicleType?.toLowerCase() === "bike";
        console.log("⚠️ Recharge expired");
        Alert.alert("Recharge Expired", result.message, [
          {
            text: "Recharge Now",
            onPress: () => {
              console.log(
                "Navigating to Recharge screen with info:",
                result.rechargeInfo
              );
              navigation.navigate("RechargeScreen", {
                showOnlyBikePlan,
                role: user.category,
                firstRecharge: user.isFirstRechargeDone || false,
              });
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }

      // 4️⃣ Handle API failure
      if (!result?.success) {
        const errorMessage = result?.error || "Status update failed";
        console.log("❌ Toggle failed:", errorMessage);

        const vehicle = user.rideVehicleInfo || {};
        const showOnlyBikePlan =
          vehicle.vehicleName?.toLowerCase() === "2 wheeler" ||
          vehicle.vehicleType?.toLowerCase() === "bike";

        if (errorMessage.toLowerCase().includes("recharge")) {
          console.log("⚠️ Recharge required, opening alert");
          Alert.alert("Recharge Required", errorMessage, [
            {
              text: "Recharge Now",
              onPress: () => {
                console.log(
                  "Navigating to Recharge for bike plan:",
                  showOnlyBikePlan
                );
                navigation.navigate("RechargeScreen", {
                  showOnlyBikePlan,
                  role: user.category,
                  firstRecharge: user.isFirstRechargeDone || false,
                });
              },
            },
            { text: "Cancel", style: "cancel" },
          ]);
        } else {
          Alert.alert("Error", errorMessage);
        }
        return;
      }

      // 5️⃣ Success case
      if (result?.success) {
        console.log("✅ Toggle successful, user status:", result.status);
        Alert.alert(
          "Success",
          `You are now ${result.status ? "online" : "offline"}`
        );
        RideModule.startPoolingService(
          user.isAvailable ? true : false,
          user?._id,
          API_URL_APP
        )
          .then((res) => console.log("From Backgorund", res))
          .catch((err) => console.error(err));
        setOnDuty(result.status);

        if (result.status === true) {
          console.log("✅ User is online, starting pooling and FloatingWidget");
          startPooling();
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          });
          if (Platform.OS === "android") {
            FloatingWidget.startWidget();
          }
        } else {
          console.log(
            "⚪ User went offline, stopping pooling and FloatingWidget"
          );
          stopPooling();
          FloatingWidget?.stopWidget();
        }
      }
    } catch (error) {
      console.log("❌ Error in handleToggle (catch):", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";

      const vehicle = user.rideVehicleInfo || {};
      const showOnlyBikePlan =
        vehicle.vehicleName?.toLowerCase() === "2 wheeler" ||
        vehicle.vehicleType?.toLowerCase() === "bike";

      if (errorMessage.toLowerCase().includes("recharge")) {
        console.log("⚠️ Recharge required (catch), opening alert");
        Alert.alert("Recharge Required", errorMessage, [
          {
            text: "Recharge Now",
            onPress: () => {
              console.log(
                "Navigating to Recharge from catch:",
                showOnlyBikePlan
              );
              navigation.navigate("RechargeScreen", {
                showOnlyBikePlan,
                role: user.category,
                firstRecharge: user.isFirstRechargeDone || false,
              });
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      console.log("handleToggle finished, setting isLoading to false");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      // Always fetch the latest user details before using them
      await fetchUserDetails();
    };

    loadUserData();
  }, []);

  // Watch for user availability changes from Zustand
  useEffect(() => {
    if (user?.isAvailable !== undefined) {
      setOnDuty(user.isAvailable);
    }
  }, [user?.isAvailable]);

  return (
    <View style={styles.container}>
      {/* Profile Image */}
      <TouchableOpacity
        onPress={() => navigation.navigate("ProfileScreen")}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: user?.documents?.profile }}
          style={styles.profileImage}
        />
      </TouchableOpacity>

      {/* ON DUTY Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleToggle}
        disabled={isLoading}
        style={[
          styles.dutyButton,
          {
            backgroundColor: onDuty ? "#E8F8E5" : "#F8E8E8",
            borderColor: onDuty ? "#32a852" : "#d64444",
            opacity: isLoading ? 0.7 : 1,
          },
        ]}
      >
        {isLoading ? (
          <>
            <ActivityIndicator
              size="small"
              color={onDuty ? "#32a852" : "#d64444"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.dutyText,
                { color: onDuty ? "#32a852" : "#d64444" },
              ]}
            >
              {onDuty ? "GOING OFFLINE..." : "GOING ONLINE..."}
            </Text>
          </>
        ) : (
          <>
            <Text
              style={[
                styles.dutyText,
                { color: onDuty ? "#32a852" : "#d64444" },
              ]}
            >
              {onDuty ? "ON DUTY" : "OFF DUTY"}
            </Text>
            <Icon
              name={onDuty ? "checkmark-circle" : "close-circle"}
              size={18}
              color={onDuty ? "#32a852" : "#d64444"}
            />
          </>
        )}
      </TouchableOpacity>

      {/* Map Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme?.primary }]}
          onPress={() => onZoom && onZoom(1)}
          disabled={isLoading}
        >
          <Icon name="add" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme?.primary }]}
          onPress={() => onZoom && onZoom(-1)}
          disabled={isLoading}
        >
          <Icon name="remove" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme?.primary }]}
          onPress={onCenter}
          disabled={isLoading}
        >
          <Icon name="locate" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    zIndex: 999,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "#fff",
  },
  dutyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dutyText: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 6,
  },
  controlsContainer: {
    flexDirection: "column",
    gap: 12,
    marginTop: 5,
  },
  controlButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
