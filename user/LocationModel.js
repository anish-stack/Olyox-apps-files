import React, { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as IntentLauncher from "expo-intent-launcher";
import * as Location from "expo-location";

export default function LocationPermissionModal({ show ,onPress }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!!show);
  }, [show]);

  // 🚀 Function to open settings


  // 🌀 Listen if user gives permission after going to settings
  useEffect(() => {
    let interval;
    if (visible) {
      interval = setInterval(async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          clearInterval(interval);
          setVisible(false);
          // 🔁 Reload the app automatically
          setTimeout(() => {
            global.locationReloaded = true;
            // simple reload logic (works in Expo & RN)
            if (typeof globalThis?.Expo !== "undefined") {
              // Expo go specific
              console.log("Permission granted — refreshing app...");
            } else {
              console.log("Permission granted — refreshing app...");
            }
          }, 500);
        }
      }, 2000); // check every 2s
    }
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Ionicons
            name="location-outline"
            size={60}
            color="#000"
            style={styles.icon}
          />
          <Text style={styles.title}>Location Permission Denied</Text>
          <Text style={styles.message}>
            You’ve denied location permission. Location access is required for
            this app to work properly. Please enable it in settings.
          </Text>

          <TouchableOpacity style={styles.fixButton} onPress={onPress}>
            <Text style={styles.fixButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 10,
  },
  icon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  fixButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  fixButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
