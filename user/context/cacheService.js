import AsyncStorage from "@react-native-async-storage/async-storage"

class CacheService {
  static CACHE_DURATION = 2 * 60 * 1000 // 2 minutes in milliseconds

  static async get(key) {
    try {
      const cachedItem = await AsyncStorage.getItem(key)
      if (!cachedItem) return null

      const parsedItem = JSON.parse(cachedItem)
      const now = Date.now()

      // Check if cache is still valid (within 2 minutes)
      if (now - parsedItem.timestamp < this.CACHE_DURATION) {
        console.log(`Cache hit for ${key}`)
        return parsedItem.data
      } else {
        // Cache expired, remove it
        console.log(`Cache expired for ${key}`)
        await AsyncStorage.removeItem(key)
        return null
      }
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error)
      return null
    }
  }

  static async set(key, data) {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now()
      }
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem))
      console.log(`Data cached for ${key}`)
    } catch (error) {
      console.error(`Error caching data for ${key}:`, error)
    }
  }

  static async remove(key) {
    try {
      await AsyncStorage.removeItem(key)
      console.log(`Cache cleared for ${key}`)
    } catch (error) {
      console.error(`Error removing cache for ${key}:`, error)
    }
  }

  static async clear() {
    try {
      await AsyncStorage.clear()
      console.log("All cache cleared")
    } catch (error) {
      console.error("Error clearing all cache:", error)
    }
  }

  // Cache keys constants
  static CACHE_KEYS = {
    BANNERS: "home_banners",
    CATEGORIES: "categories",
    OFFERS: "special_offers"
  }
}

export default CacheService
