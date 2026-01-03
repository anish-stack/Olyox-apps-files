"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from "react-native"
import axios from "axios"
import { useNavigation } from "@react-navigation/native"
import CacheService from "../../context/cacheService"
import analytics from '@react-native-firebase/analytics';
import firebaseConfig from "../../context/firebaseConfig"
import { useTrack } from "../../hooks/useTrack"

const { width } = Dimensions.get("screen")
const ITEM_WIDTH = (width - 48) / 4 // Adjusted for better spacing

export default function Categories({ refreshing }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const navigation = useNavigation()
  const { track } = useTrack()
  const fetchCategories = useCallback(async () => {
    try {
    


      // If no cache or refreshing, fetch from API
      console.log("Fetching categories from API")
      const response = await axios.get(
        "https://webapi.olyox.com/api/v1/categories_get?forApp=true"
      )

      if (response.data.success) {
        const data = response.data.data

        // Separate Cab Service
        const cabService = data.find(cat => cat.title === "Cab Service")
        const rest = data.filter(cat => cat.title !== "Cab Service")

        // Sort others by position (null/undefined pushed last)
        const sorted = rest.sort((a, b) => {
          if (a.position == null && b.position == null) return 0
          if (a.position == null) return 1
          if (b.position == null) return -1
          return a.position - b.position
        })

        // Check if any category already at position 1
        const hasPosition1 = data.some(cat => cat.position === 1)

        // If no one has position 1 and Cab Service exists, insert it manually
        if (!hasPosition1 && cabService) {
          sorted.unshift({ ...cabService, position: 1 })
        } else if (cabService && cabService.position != null) {
          // Insert cabService where it belongs
          sorted.push(cabService)
          sorted.sort((a, b) => {
            if (a.position == null && b.position == null) return 0
            if (a.position == null) return 1
            if (b.position == null) return -1
            return a.position - b.position
          })
        }

        setCategories(sorted)
        // Cache the successful response
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }, [refreshing])

  useEffect(() => {
    fetchCategories()
  }, [refreshing])

  const fetchAppInstanceId = async () => {
    try {
      await firebaseConfig.analytics()
      // 1. Event log karo
      await analytics().logEvent('ride_booked_button_pressed');
      console.log("✅ Event logged: ride_booked");

      const appInstanceId = await analytics().getAppInstanceId();
      console.log("🔥 App Instance ID,:", appInstanceId);

    } catch (error) {
      console.error("❌ Error has:", error);
    }
  };

  // Memoized redirect function
  const redirect = useCallback(
    screen => {
      if (screen === "Cab Service") {
        fetchAppInstanceId()
        navigation.navigate("Start_Booking_Ride")
        track("ACTION", "RideBooking", "User click on Book Ride");
      } else if (screen === "Transport") {
        navigation.navigate("Transport")
      } else if (screen === "Hotel") {
        navigation.navigate("Hotel")
      } else if (screen === "Courier") {
        track("ACTION", "Parcel Booking", "User click on Courier");

        navigation.navigate("Parcel_Booking")
      } else {
        navigation.navigate("comming-soon") // Navigate to Coming Soon screen for Hotel and Tiffin
      }
    },
    [navigation]
  )

  // Check if service is coming soon (you can modify this logic based on your API)
  const isComingSoon = useCallback(title => {
    return title === "Tiffin"
  }, [])

  // Get service colors based on title
  const getServiceColor = useCallback(title => {
    switch (title) {
      case "Cab Service":
        return "#FED7AA"
      case "Courier":
        return "#FCA5A5"
      case "Hotel":
        return "#A7F3D0"
      case "Tiffin":
        return "#FDE68A"
      default:
        return "#E5E7EB"
    }
  }, [])

  // Memoized grid rendering - only updates when categories change
  const categoriesGrid = useMemo(() => {
    return (
      <View style={styles.servicesSection}>
        {categories.map(category => (
          <TouchableOpacity
            activeOpacity={0.7}
            key={category._id}
            style={styles.serviceCard}
            onPress={() => redirect(category.title)}
          >
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: getServiceColor(category.title) }
              ]}
            >
              <CategoryImage icon={category?.icon} />
            </View>
            <Text numberOfLines={1} style={styles.serviceName}>
              {category.title}
            </Text>
            {isComingSoon(category.title) && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>COMING SOON</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    )
  }, [categories, redirect, getServiceColor, isComingSoon])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.suggestionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggestions</Text>

        </View>
      </View>
      {categoriesGrid}
    </View>
  )
}

// Memoized image component to prevent unnecessary re-renders
const CategoryImage = React.memo(({ icon }) => {
  const [imageError, setImageError] = useState(false)

  return (
    <Image
      source={imageError ? require("../../assets/no-image.jpg") : { uri: icon }}
      style={styles.icon}
      onError={() => setImageError(true)}
      resizeMode="contain"
    />
  )
})

const styles = StyleSheet.create({
  container: {
    // paddingHorizontal: 16,
    // paddingVertical: 20,
    backgroundColor: "#FFFFFF"
  },
  headerContainer: {
    // marginBottom: 20,
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    // marginBottom: 4,
    textAlign: "center"
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "400"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 20
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500"
  },
  servicesSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingVertical: 12,
    // paddingHorizontal: 8
  },
  serviceCard: {
    alignItems: "center",
    width: ITEM_WIDTH,
    paddingVertical: 2,
    paddingHorizontal: 4
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)"
  },
  icon: {
    width: 40,
    height: 40,
    resizeMode: "contain"
  },
  serviceName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 16
  },
  comingSoonBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  comingSoonText: {
    fontSize: 8,
    color: "#E53E3E",
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    // marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
})
