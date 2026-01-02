import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";

const UpdateModal = React.memo(({ visible, onUpdate, isForced = true, updateInfo = {} }) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={() => {
      // Only allow closing if it's not a forced update
      if (!isForced) return;
    }}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {isForced ? "🚨 Update Required" : "📱 Update Available"}
          </Text>
        </View>

        {/* Body */}
        <View style={styles.modalBody}>
          <Text style={styles.modalDescription}>
            {isForced
              ? "A critical update is required to continue using the app. Please update now to access all features."
              : "A new version of Olyox Driver is available with exciting new features and improvements!"}
          </Text>

          <View style={styles.featureList}>
            <Text style={styles.featureTitle}>✨ What's New:</Text>
            <Text style={styles.featureItem}>• Enhanced performance</Text>
            <Text style={styles.featureItem}>• Bug fixes and improvements</Text>
            <Text style={styles.featureItem}>• Better user experience</Text>
            {updateInfo.releaseNotes?.map((note, index) => (
              <Text key={index} style={styles.featureItem}>
                • {note}
              </Text>
            ))}
          </View>

          {updateInfo.currentVersion && updateInfo.latestVersion && (
            <View style={styles.versionInfo}>
              <Text style={styles.versionText}>
                Current: {updateInfo.currentVersion} → Latest: {updateInfo.latestVersion}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.updateButton} onPress={onUpdate}>
            <Text style={styles.updateButtonText}>
              {isForced ? "Update Now" : "Update App"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)", // black overlay with opacity
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1e1e1e", // dark grey background
    borderRadius: 16,
    marginHorizontal: 20,
    maxWidth: 400,
    paddingBottom: 20,
    elevation: 10,
  },
  modalHeader: {
    backgroundColor: "#000000", // black header
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: "#f0f0f0", // white-ish text
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  featureList: {
    backgroundColor: "#2c2c2c", // darker grey box
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    color: "#cccccc",
    marginBottom: 4,
    paddingLeft: 8,
  },
  versionInfo: {
    backgroundColor: "#3a3a3a",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  versionText: {
    fontSize: 14,
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  updateButton: {
    backgroundColor: "#ff3b30", // red button
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  updateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default UpdateModal;
