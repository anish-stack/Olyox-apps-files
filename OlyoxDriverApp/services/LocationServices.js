import {
  Platform,
  PermissionsAndroid,
  NativeModules,
  AppState
} from "react-native"
import axios from "axios"
import loginStore from "../Store/authStore"

const { LocationUpdateModule } = NativeModules

// xomm
// Configuration constants
const CONFIG = {
  API_TIMEOUT: 10000,
  LOCATION_UPDATE_INTERVAL: 4000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  API_ENDPOINT: "https://www.appv2.olyox.com/webhook/cab-receive-location",
  MIN_DISTANCE_THRESHOLD: 10,
  MIN_TIME_THRESHOLD: 30000,
  LOCATION_ACCURACY_THRESHOLD: 100
}

class LocationService {
  location = null
  error = null
  authToken = null
  appState = AppState.currentState
  lastLocation = null
  retryCount = 0
  isServiceActive = false
  permissionsGranted = false
  batteryOptimizationDisabled = false
  listeners = {}

  constructor() {}

  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        cb => cb !== callback
      )
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data))
    }
  }

  // Request all necessary permissions
  async requestLocationPermission() {
    if (Platform.OS === "android") {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        ]

        // Add notification permission for Android 13+
        if (Platform.Version >= 33) {
          permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
        }

        // Request basic permissions
        const results = await PermissionsAndroid.requestMultiple(permissions)

        const fineLocationGranted =
          results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED
        const coarseLocationGranted =
          results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED

        if (!fineLocationGranted && !coarseLocationGranted) {
          throw new Error("Location permissions denied")
        }

        console.log("✅ Basic location permissions granted")

        // Request background location permission for Android 10+
        if (Platform.Version >= 29) {
          const backgroundLocationResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: "Background Location Permission",
              message:
                "App needs background location access for continuous ride tracking.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          )

          if (backgroundLocationResult !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn("⚠️ Background location permission denied")
          } else {
            console.log("✅ Background location permission granted")
          }
        }

        this.permissionsGranted = true
        return true
      } catch (err) {
        console.error("❌ Permission request error:", err)
        this.error = err.message
        this.emit("error", err.message)
        return false
      }
    }

    this.permissionsGranted = true
    return true
  }

  async checkBatteryOptimization() {
    if (Platform.OS !== "android") {
      this.batteryOptimizationDisabled = true
      return true
    }

    try {
      const module = LocationUpdateModule
      if (module && module.isBatteryOptimizationDisabled) {
        const isDisabled = await module.isBatteryOptimizationDisabled()
        this.batteryOptimizationDisabled = isDisabled
        this.emit("batteryOptimizationStatus", isDisabled)
        
        if (!isDisabled) {
          console.warn("⚠️ Battery optimization is enabled")
        } else {
          console.log("✅ Battery optimization disabled")
        }
        
        return isDisabled
      }
      return false
    } catch (error) {
      console.error("❌ Error checking battery optimization:", error)
      return false
    }
  }

  async requestBatteryOptimizationExemption() {
    if (Platform.OS !== "android") {
      return true
    }

    try {
      const module = LocationUpdateModule
      if (module && module.requestBatteryOptimization) {
        const granted = await module.requestBatteryOptimization()
        this.batteryOptimizationDisabled = granted
        this.emit("batteryOptimizationStatus", granted)
        
        if (granted) {
          console.log("✅ Battery optimization exemption granted")
        } else {
          console.warn("⚠️ Battery optimization exemption denied")
        }
        
        return granted
      }
      return false
    } catch (error) {
      console.error("❌ Error requesting battery optimization exemption:", error)
      return false
    }
  }

  async isNativeServiceRunning() {
    try {
      const module = LocationUpdateModule
      if (module && module.isServiceRunning) {
        const isRunning = await module.isServiceRunning()
        return isRunning
      }
      return false
    } catch (error) {
      console.error("❌ Error checking service status:", error)
      return false
    }
  }

  async sendLocationToBackend(locationData, retryCount = 0) {
    if (!this.authToken) {
      console.log("⚠️ No auth token available")
      return false
    }

    if (!locationData || !locationData.latitude || !locationData.longitude) {
      console.error("❌ Invalid location data")
      return false
    }

    try {
      const payload = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
        app_state: this.appState,
        provider: locationData.provider || "unknown"
      }

      const response = await axios.post(CONFIG.API_ENDPOINT, payload, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json"
        },
        timeout: CONFIG.API_TIMEOUT
      })

      if (response.status === 200) {
        this.retryCount = 0
        const eventData = { location: locationData, response: response.data }
        this.emit("locationSent", eventData)
        console.log("✅ Location sent successfully")
        return true
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error("❌ Location send error:", error.message)
      const errorEventData = { error: error.message, retryCount }
      this.emit("locationSendError", errorEventData)

      if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, retryCount)
        console.log(`🔄 Retrying in ${delay}ms... Attempt ${retryCount + 1}`)

        setTimeout(() => {
          this.sendLocationToBackend(locationData, retryCount + 1)
        }, delay)
      } else {
        console.error("❌ Max retry attempts reached")
        const failedEventData = { error: error.message, location: locationData }
        this.emit("locationSendFailed", failedEventData)
      }
    }
    return false
  }

  hasLocationChanged(newLocation) {
    if (!this.lastLocation) return true

    const distance = this.calculateDistance(
      this.lastLocation.latitude,
      this.lastLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    )

    const timeDiff = newLocation.timestamp - this.lastLocation.timestamp

    return (
      distance > CONFIG.MIN_DISTANCE_THRESHOLD ||
      timeDiff > CONFIG.MIN_TIME_THRESHOLD
    )
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  handleLocationUpdate(locationData) {
    this.location = locationData
    this.error = null

    this.emit("locationUpdate", locationData)

    if (this.hasLocationChanged(locationData)) {
      this.sendLocationToBackend(locationData).then(success => {
        if (success) {
          this.lastLocation = locationData
        }
      })
    } else {
      console.log("ℹ️ Location change not significant")
    }
  }

  async startLocationService() {
    if (this.isServiceActive) {
      console.log("ℹ️ Location service already active")
      return
    }

    if (!this.permissionsGranted) {
      console.error("❌ Cannot start: permissions not granted")
      return
    }

    if (!this.authToken) {
      console.error("❌ Cannot start: no auth token")
      return
    }

    try {
      const module = LocationUpdateModule
      if (!module || !module.startLocationUpdates) {
        throw new Error("LocationUpdateModule not available")
      }

      console.log("🚀 Starting native location service...")
      console.log("📍 API Endpoint:", CONFIG.API_ENDPOINT)
      
      await module.startLocationUpdates(CONFIG.API_ENDPOINT, this.authToken)

      this.isServiceActive = true
      this.emit("serviceStarted")
      console.log("✅ Location service started successfully")
      
      // Verify service is running
      setTimeout(async () => {
        const isRunning = await this.isNativeServiceRunning()
        if (isRunning) {
          console.log("✅ Service verified running")
        } else {
          console.warn("⚠️ Service may not be running")
        }
      }, 2000)
      
    } catch (error) {
      console.error("❌ Failed to start location service:", error)
      this.error = error.message
      this.emit("error", error.message)
      throw error
    }
  }

  async stopLocationService() {
    if (!this.isServiceActive) {
      console.log("ℹ️ Location service already stopped")
      return
    }

    try {
      const module = LocationUpdateModule
      if (module && module.stopLocationUpdates) {
        console.log("⏹️ Stopping native location service...")
        await module.stopLocationUpdates()
      }

      this.isServiceActive = false
      this.emit("serviceStopped")
      console.log("✅ Location service stopped successfully")
    } catch (error) {
      console.error("❌ Failed to stop location service:", error)
      this.error = error.message
      this.emit("error", error.message)
    }
  }

  handleAppStateChange(nextAppState) {
    console.log(
      "📱 App state change:",
      this.appState,
      "->",
      nextAppState
    )
    this.appState = nextAppState

    switch (nextAppState) {
      case "active":
        if (
          !this.isServiceActive &&
          this.permissionsGranted &&
          this.authToken
        ) {
          console.log("🔄 Restarting location service (app active)")
          this.startLocationService()
        }
        break
      case "background":
        console.log("🌙 App in background, native service continues...")
        break
      case "inactive":
        console.log("💤 App is inactive...")
        break
      default:
        break
    }

    this.emit("appStateChange", nextAppState)
  }

  setAuthToken(token) {
    this.authToken = token
    console.log("🔑 Auth token set for location service")

    if (token && this.permissionsGranted && !this.isServiceActive) {
      this.startLocationService()
    }
  }

  async initialize() {
    try {
      console.log("🚀 Initializing location service...")

      // Request permissions
      const hasPermission = await this.requestLocationPermission()
      if (!hasPermission) {
        throw new Error("Location permission denied")
      }

      // Check battery optimization
      await this.checkBatteryOptimization()
      if (!this.batteryOptimizationDisabled) {
        console.warn(
          "⚠️ Battery optimization enabled - service may be restricted"
        )
        // Optionally prompt user
        // await this.requestBatteryOptimizationExemption()
      }

      // Get auth token
      try {
        const { token, authenticated } = loginStore.getState()
        console.log("🔑 Auth status:", authenticated ? "Authenticated" : "Not authenticated")
        
        if (token) {
          this.setAuthToken(token)
        } else {
          console.warn("⚠️ No auth token found - waiting for login")
        }
      } catch (err) {
        console.log("⚠️ No auth token found:", err.message)
      }

      // Only start service if we have a token
      if (this.authToken) {
        await this.startLocationService()
      } else {
        console.log("⏳ Waiting for auth token before starting service")
      }

      // Check if service is already running
      const isRunning = await this.isNativeServiceRunning()
      if (isRunning) {
        this.isServiceActive = true
        console.log("✅ Native service is already running")
      }

      console.log("✅ Location service initialized successfully")
      this.emit("initialized")
    } catch (error) {
      console.error("❌ Location service initialization failed:", error)
      this.emit("initializationError", error)
      throw error
    }
  }

  async cleanup() {
    console.log("🧹 Cleaning up location service...")
    await this.stopLocationService()
    this.listeners = {}
    this.location = null
    this.lastLocation = null
    this.authToken = null
    this.error = null
  }

  async getStatus() {
    const isRunning = await this.isNativeServiceRunning()

    return {
      isActive: isRunning,
      hasPermissions: this.permissionsGranted,
      hasAuthToken: !!this.authToken,
      currentLocation: this.location,
      lastError: this.error,
      appState: this.appState,
      isBatteryOptimizationDisabled: this.batteryOptimizationDisabled
    }
  }

  async forceLocationUpdate() {
    const isRunning = await this.isNativeServiceRunning()
    if (!isRunning) {
      throw new Error("Location service is not active")
    }
    console.log("🔄 Force location update requested")
  }
}

export default new LocationService()