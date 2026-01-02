import { StyleSheet } from "react-native"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#D32F2F",
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#D32F2F",
  },
  statLabel: {
    fontSize: 12,
    color: "#B71C1C",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#333",
  },
  listContainer: {
    paddingBottom: 20,
  },
  guestCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  guestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#D32F2F",
  },
  guestPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  whatsappButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 12,
  },
  guestDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFEBEE",
    borderRadius: 6,
    padding: 12,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  detailValueTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D32F2F",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
  },
})

export default styles

