import { StyleSheet } from "react-native"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#D32F2F",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#D32F2F",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  hotelHeader: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hotelImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  hotelInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: "center",
  },
  hotelName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#D32F2F",
    marginBottom: 4,
  },
  hotelOwner: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  hotelPhone: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FFEBEE",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D32F2F",
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  referralCodeContainer: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  referralCode: {
    fontSize: 14,
    color: "#D32F2F",
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: "#E8F5E9",
  },
  statusInactive: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  walletContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  walletItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  walletLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  walletAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D32F2F",
  },
  documentStatus: {
    // flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 4,
  },
  documentPending: {
    fontSize: 14,
    color: "#1976D2",
    marginLeft: 8,
  },
  documentVerified: {
    fontSize: 14,
    color: "#2E7D32",
    marginLeft: 8,
  },
  documentList: {
    marginTop: 8,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  documentName: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  noDocuments: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    paddingVertical: 6,
  },
  amenityText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  uploadButton:{
    padding:10,
    textAlign:'center',
    backgroundColor: "#1976D2",
   

  },
  uploadButtonText:{
    fontSize: 16,
    color: "#fff",
    textAlign:'center',

    
  }
})

export default styles

