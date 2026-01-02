import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { Settings } from "react-native-fbsdk-next";

export default function ConsentModal({ visible, onClose }) {
  const handleConsent = async (allow) => {
    if (allow) {
      // ✅ Enable all FB SDK flags
      Settings.setAutoInitEnabled(true);
      Settings.setAutoLogAppEventsEnabled(true);
      Settings.setAdvertiserIDCollectionEnabled(true);
      await Settings.initializeSDK();
      console.log("✅ User consented, Facebook SDK enabled");
    } else {
      // ❌ Keep disabled
      Settings.setAutoInitEnabled(false);
      Settings.setAutoLogAppEventsEnabled(false);
      Settings.setAdvertiserIDCollectionEnabled(false);
      console.log("❌ User declined, Facebook SDK disabled");
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Allow Analytics?</Text>
          <Text style={styles.subtitle}>
            We use Facebook Analytics to improve app experience and measure ads.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "green" }]}
              onPress={() => handleConsent(true)}
            >
              <Text style={styles.btnText}>Allow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "red" }]}
              onPress={() => handleConsent(false)}
            >
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 20 },
  actions: { flexDirection: "row", justifyContent: "space-around" },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "bold" },
});
