import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import useHotelApi from "../../context/HotelDetails";
import useAnalyticData from "../../hooks/useAnyliticData";
import Layout from "../../components/Layout/Layout";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// Banner Images (High-quality hotel visuals)
const bannerImages = [
  "https://imageio.forbes.com/specials-images/imageserve/652f603a91415a3d647fc207/0x0.jpg?format=jpg&height=900&width=1600&fit=bounds",
  "https://media.istockphoto.com/id/1035603262/photo/3d-render-of-luxury-hotel-lobby-entrance-reception.jpg?s=612x612&w=0&k=20&c=2HjCO3fUpmDovGnfjvwJRytKB5ciUvppGPhrkzKjMqc=",
  "https://thumbs.dreamstime.com/b/luxurious-hotel-room-boasts-stunning-city-skyline-view-night-king-size-bed-elegant-furniture-cozy-interior-design-ambient-384816896.jpg",
  "https://www.americanexpress.com/en-us/travel/discover/photos/100142/1688/1200/lux1488ex-202486-Hotel%20Exterior%20-%20night%20%281%29.jpg",
];

export default function HotelDashboard() {
  const { findDetails, toggleHotel ,toggleloading } = useHotelApi();
  const { data, loading: dataLoading } = useAnalyticData();
  const [hotelData, setHotelData] = useState(null);
  const [workStatus, setWorkStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    fetchHotelData();
  }, []);

  const hasActivePlan = hotelData?.isPaid || false;

  // Auto-slide banner every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchHotelData = async () => {
    setLoading(true);
    try {
      const response = await findDetails();
      if (response.success) {
        setHotelData(response.data.data);
        setWorkStatus(response.data.data?.isOnline || false);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to fetch hotel data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const newStatus = !workStatus;
    setWorkStatus(newStatus);

    try {
      const response = await toggleHotel({ status: newStatus });

      if (response.success) {
        Alert.alert(
          "Status Updated",
          newStatus
            ? "Hotel is now Online and accepting bookings"
            : "Hotel is now Offline and not accepting bookings"
        );
      } else {
        setWorkStatus(!newStatus); // Revert toggle

        if (response.message.includes("upload the required documents")) {
          Alert.alert("Documents Required", response.message, [
            {
              text: "Upload Now",
              onPress: () => navigation.navigate("upload_Documents"),
            },
            { text: "Cancel", style: "cancel" },
          ]);
        } else if (
          response.message.includes("subscription") ||
          response.message.includes("recharge")
        ) {
          Alert.alert(
            "Subscription Required",
            response.message || "Please activate your plan to go online.",
            [
              {
                text: "Recharge Now",
                onPress: () => navigation.navigate("Recharge"),
              }, // Replace with your actual recharge screen name
              { text: "Cancel", style: "cancel" },
            ]
          );
        } else {
          Alert.alert(
            "Update Failed",
            response.message || "Failed to update status"
          );
        }
      }
    } catch (err) {
      setWorkStatus(!newStatus);
      Alert.alert("Error", "An error occurred while updating status");
    }
  };
  const handleRefresh = useCallback(() => {
    setRefresh(true);
    fetchHotelData().finally(() => setRefresh(false));
  }, []);

  if (loading || toggleloading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E30613" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={60} color="#E30613" />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHotelData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const StatCard = ({ icon, label, value, color }) => (
    <BlurView intensity={80} tint="light" style={styles.statCard}>
      <LinearGradient
        colors={["rgba(255,255,255,0.9)", "rgba(245,245,245,0.8)"]}
        style={StyleSheet.absoluteFill}
      />
      <FontAwesome5 name={icon} size={28} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </BlurView>
  );

  return (
    <Layout
      data={hotelData}
      title={hotelData?.hotel_name}
      profileImages="https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={handleRefresh}
            colors={["#E30613"]}
          />
        }
        style={{ flex: 1, backgroundColor: "#f8f8f8" }}
      >
        {/* Banner Slider */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: bannerImages[currentBannerIndex] }}
            style={styles.bannerImage}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.bannerOverlay}
          />
          <View style={styles.bannerDots}>
            {bannerImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentBannerIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Hotel Name & Status */}
        <View style={styles.headerCard}>
          <Text style={styles.hotelName}>{hotelData?.hotel_name}</Text>
          <View style={styles.statusRow}>
            <Switch
              value={workStatus}
              onValueChange={
                hasActivePlan
                  ? handleToggle
                  : () =>
                      Alert.alert(
                        "Subscription Required",
                        "Please recharge your plan to go online."
                      )
              }
              disabled={!hasActivePlan}
              trackColor={{ false: "#ccc", true: "#E30613" }}
              thumbColor="#fff"
              ios_backgroundColor="#ccc"
            />
            <Text
              style={[
                styles.statusText,
                workStatus ? styles.online : styles.offline,
              ]}
            >
              {workStatus ? "● Online" : "● Offline"}
            </Text>
          </View>
        </View>
        {!hasActivePlan && (
          <View style={styles.alertCard}>
            <MaterialIcons name="warning-amber" size={20} color="#E30613" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.alertText}>
                No active recharge plan. Please recharge to accept bookings and
                go online.
              </Text>
              <TouchableOpacity
                style={{ marginTop: 8, alignSelf: "flex-start" }}
                onPress={() => navigation.navigate("Recharge")} // Adjust screen name
              >
                <Text style={{ color: "#E30613", fontWeight: "bold" }}>
                  Recharge Now →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="money-bill-wave"
            label="Total Earnings"
            value={`₹${data?.totalEarnings || 0}`}
            color="#E30613"
          />
          <StatCard
            icon="gift"
            label="Referral Balance"
            value={`₹${data?.referralBalance || 0}`}
            color="#9C27B0"
          />
          <StatCard
            icon="calendar-check"
            label="Total Bookings"
            value={data?.totalBookings || 0}
            color="#2196F3"
          />
          <StatCard
            icon="clock"
            label="Pending"
            value={data?.pendingBookings || 0}
            color="#FF9800"
          />
          <StatCard
            icon="check-circle"
            label="Completed"
            value={data?.completedBookings || 0}
            color="#4CAF50"
          />
          <StatCard
            icon="times-circle"
            label="Rejected"
            value={data?.rejectedBookings || 0}
            color="#F44336"
          />
          <StatCard
            icon="hotel"
            label="Total Rooms"
            value={data?.totalRooms || 0}
            color="#E30613"
          />
          <StatCard
            icon="bed"
            label="Occupied"
            value={data?.occupiedRooms || 0}
            color="#FF5722"
          />
        </View>

        {/* Packages Section */}
        <View style={styles.packageSection}>
          <Text style={styles.sectionTitle}>Packages</Text>
          <View style={styles.packageRow}>
            <StatCard
              icon="box"
              label="Total Packages"
              value={data?.totalPackages || 0}
              color="#673AB7"
            />
            <StatCard
              icon="box-open"
              label="Running"
              value={data?.runningPackages || 0}
              color="#4CAF50"
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("Booking-create")}
      >
        <LinearGradient
          colors={["#E30613", "#C10510"]}
          style={styles.fabGradient}
        >
          <FontAwesome5 name="plus" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Layout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E30613",
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: "#E30613",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  retryText: { color: "#fff", fontWeight: "bold" },

  bannerContainer: { height: 220, position: "relative" },
  bannerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  bannerDots: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    opacity: 0.5,
    marginHorizontal: 4,
  },
  activeDot: { opacity: 1, backgroundColor: "#E30613", width: 20 },

  headerCard: {
    margin: 20,
    marginTop: -40,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  hotelName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#222",
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  statusText: { marginLeft: 12, fontSize: 18, fontWeight: "600" },
  online: { color: "#4CAF50" },
  offline: { color: "#F44336" },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  statCard: {
    width: width / 2 - 20,
    height: 130,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
  },
  statValue: { fontSize: 24, fontWeight: "bold", marginTop: 6 },

  packageSection: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  packageRow: { flexDirection: "row", justifyContent: "space-between" },

  infoCard: {
    margin: 20,
    marginBottom: 100,
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 16,
    textAlign: "center",
  },
  infoItem: { fontSize: 16, color: "#444", marginBottom: 10 },
alertCard: {
  marginHorizontal: 16,
  marginVertical: 12,
  backgroundColor: '#FFEBEE',
  borderLeftWidth: 5,
  borderLeftColor: '#E30613',
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 16,
  flexDirection: 'row',
  alignItems: 'flex-start',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
alertText: {
  marginLeft: 12,
  fontSize: 14,
  color: '#C62828',
  lineHeight: 20,
  flex: 1,
  fontWeight: '500',
},

  fab: { position: "absolute", right: 20, bottom: 30 },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#E30613",
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});
