import { StyleSheet,Dimensions } from 'react-native';
const { width } = Dimensions.get("window")

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginBottom:20,
        backgroundColor: "#f5f5f5",
        padding: 10,
      },
      title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
      },
      subtitle: {
        fontSize: 16,
        color: "#666",
        marginBottom: 20,
      },
      documentGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
      },
      documentCard: {
        width: (width - 50) / 2,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      documentIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#f8d7da",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
      },
      documentLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 10,
        textAlign: "center",
      },
      imagePreviewContainer: {
        width: "100%",
        height: 100,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
      },
      previewImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
      },
      uploadedIndicator: {
        position: "absolute",
        top: 5,
        right: 5,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 2,
      },
      uploadPrompt: {
        width: "100%",
        height: 100,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
      },
      uploadPromptText: {
        color: "#666",
        marginTop: 5,
      },
      progressContainer: {
        marginVertical: 20,
      },
      progressBar: {
        height: 8,
        backgroundColor: "#e0e0e0",
        borderRadius: 4,
        overflow: "hidden",
      },
      progressFill: {
        height: "100%",
        backgroundColor: "#c41e3a",
      },
      progressText: {
        marginTop: 5,
        textAlign: "center",
        color: "#666",
      },
      submitButton: {
        backgroundColor: "#c41e3a",
        paddingVertical: 20,
        borderRadius: 8,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
      },
      submitButtonDisabled: {
        backgroundColor: "#ccc",
      },
      submitIcon: {
        marginRight: 10,
      },
      submitText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
      },
      modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      },
      modalContent: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        width: "80%",
        alignItems: "center",
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
      },
      modalText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
      },
      modalButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        width: "100%",
      },
      modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: "center",
      },
      modalButtonCancel: {
        backgroundColor: "#f8d7da",
      },
      modalButtonConfirm: {
        backgroundColor: "#c41e3a",
      },
      modalButtonText: {
        color: "#fff",
        fontWeight: "bold",
      },
});

export default styles;