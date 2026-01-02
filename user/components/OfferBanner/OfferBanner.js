import { useRef, useState, useEffect } from "react"
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity
} from "react-native"
import axios from "axios"
import CacheService from "../../context/cacheService"
import { useNavigation } from "@react-navigation/native"

const { width } = Dimensions.get("screen")
const ITEM_WIDTH = width * 0.9
const ITEM_SPACING = (width - ITEM_WIDTH) / 2
const ITEM_HEIGHT = ITEM_WIDTH * 0.6

const OfferBanner = ({ refreshing }) => {
  const navigation = useNavigation()
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const scrollX = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef(null)

  const fallbackBanners = [
    {
      id: 1,
      title: "Quick City Rides",
      description: "Get to your destination fast and affordable",
      actionType: "book_ride",
      actionText: "Book Ride",
      image: {
        url: "https://res.cloudinary.com/dglihfwse/image/upload/v1736336797/WhatsApp_Image_2025-01-08_at_17.16.24_cot9nj.jpg"
      }
    },
    {
      id: 2,
      title: "Intercity Travel",
      description: "Comfortable rides between cities",
      actionType: "book_intercity",
      actionText: "Book Intercity",
      image: {
        url: "https://res.cloudinary.com/dglihfwse/image/upload/v1736336973/9878212_4224776_irocmo.jpg"
      }
    }
  ]

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const cached = await CacheService.get(CacheService.CACHE_KEYS.BANNERS)
        if (cached && !refreshing) {
          setBanners(cached)
          setLoading(false)
          return
        }

        const { data } = await axios.get(
          "https://www.appv2.olyox.com/api/v1/admin/get_home_banners"
        )

        const active = data?.data?.filter(b => b.is_active) || []
        if (active.length) {
          setBanners(active)
          await CacheService.set(CacheService.CACHE_KEYS.BANNERS, active)
        } else setBanners(fallbackBanners)
      } catch (err) {
        console.error(err.message)
        setBanners(fallbackBanners)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchBanners()
  }, [refreshing])

  const handleActionPress = type => {
    if (type === "inter") {
      navigation.navigate("Start_Booking_Ride", { isLater: true })
    } else {
      navigation.navigate("Parcel_Booking")
    }
  }

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading offers...</Text>
      </View>
    )

  if (error)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load banners</Text>
      </View>
    )

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: ITEM_SPACING }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      >
        {banners.map((item, index) => (
          <TouchableOpacity onPress={()=>navigation.navigate(index === 0 ? "Start_Booking_Ride":"Parcel_Booking")} key={index} activeOpacity={0.9} style={styles.bannerContainer}>
            <Image source={{ uri: item.image?.url }} style={styles.image} />
            <View style={styles.overlay}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.button}
                onPress={() => handleActionPress(index === 0 ? "inter" : "parcel")}
              >
                <Text style={styles.buttonText}>
                  {index === 0 ? "Book Intercity Ride" : "Book Parcel"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>

      {/* Dots */}
      <View style={styles.pagination}>
        {banners.map((_, i) => {
          const inputRange = [(i - 1) * ITEM_WIDTH, i * ITEM_WIDTH, (i + 1) * ITEM_WIDTH]
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: "clamp"
          })
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp"
          })
          return (
            <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  bannerContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginRight: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  overlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff"
  },
  description: {
    color: "#e0e0e0",
    marginTop: 4,
    fontSize: 14
  },
  button: {
    width: "80%",
    marginTop: 12,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: "center",
    paddingHorizontal: 20
  },
  buttonText: {
    color: "#000",
    textAlign: 'center',
    fontWeight: "700",
    fontSize: 15
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10
  },
  dot: {
    height: 8,
    backgroundColor: "#fff",
    borderRadius: 4,
    marginHorizontal: 4
  },
  loadingContainer: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    color: "#fff",
    marginTop: 10
  },
  errorContainer: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center"
  },
  errorText: {
    color: "#fff"
  }
})

export default OfferBanner
