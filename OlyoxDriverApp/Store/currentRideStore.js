import { create } from 'zustand';
import axiosInstance from '../constant/axios';
import haversineDistance from 'haversine-distance';

// Decode Google polyline
export const decodePolyline = (encoded) => {
  const poly = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return poly;
};

// Calculate ETA
export const calculateETA = (currentLocation, targetLocation) => {
  if (!currentLocation || !targetLocation) return null;

  const distance = haversineDistance(
    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
    { latitude: targetLocation.latitude, longitude: targetLocation.longitude }
  );

  const distanceKm = (distance / 1000).toFixed(2);
  const avgSpeed = 25; // km/h
  const timeInMinutes = Math.ceil((distance / 1000 / avgSpeed) * 60);

  return {
    distance: distanceKm,
    time: timeInMinutes,
    distanceInMeters: distance,
  };
};

const useCurrentRideStore = create((set, get) => ({
  rideDetails: null,
  loading: false,
  error: null,
  rideStatus: null,
  driverLocation: null,
  payment_status:null,
  lastStatusUpdate: null,
  rideStep: null,
  cancelReasons: [],
  otpLoading: false,
  // Throttling state
  lastFetchTime: 0,
  ongoingFetchPromise: null,


  // -----------------------------
  // Fetch Ride Details
  // -----------------------------
  fetchRideDetails: async (rideId) => {
    try {
      if(!rideId){
        return null
      }
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(`/rider/${rideId}`);
 
      set({
        rideDetails: data.data,
        rideStatus: data.data.ride_status,
        driverLocation: data.data.driver?.location,
        lastStatusUpdate: new Date().toISOString(),
        loading: false
      });
      return data.data;
    } catch (err) {
      console.log(err)
      const message = err.response?.data|| "Failed to fetch ride details";
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },

  fetchOnlyLocationAndStatus: async (rideId) => {
    const now = Date.now();
    const timeSinceLastFetch = now - get().lastFetchTime;
    const THROTTLE_INTERVAL = 10000; // 10 seconds



    // Create and store the fetch promise
    const fetchPromise = (async () => {
      try {
        set({ loading: true, error: null });
        const { data: apiData } = await axiosInstance.get(`/rider-light/${rideId}`);
        const { ride_status, driver_location,pickup, updated_at ,payment_status} = apiData.data;
        // console.log("Pickuop",pickup)
        // Update state
        set((state) => ({
          rideStatus: ride_status,
          driverLocation: driver_location,
          pickup:pickup,
          payment_status:payment_status,
          lastStatusUpdate: updated_at || new Date().toISOString(),
          lastFetchTime: Date.now(),
          rideDetails: {
            ...state.rideDetails,
            ride_status: ride_status,
            driver: {
              ...state.rideDetails?.driver,
              location: driver_location
            }
          },
          loading: false,
          ongoingFetchPromise: null // Clear the promise after completion
        }));

        console.log("[LIGHTWEIGHT UPDATE] Status:", ride_status, "Location updated");

        return { ride_status, driver_location,payment_status, fromCache: false ,pickup};
      } catch (err) {
        const message = err.response?.data?.message || "Failed to fetch ride details";
        set({
          loading: false,
          error: message,
          ongoingFetchPromise: null // Clear the promise on error
        });
        throw new Error(message);
      }
    })();

    // Store the ongoing promise
    set({ ongoingFetchPromise: fetchPromise });

    return fetchPromise;
  },

  // Optional: Force fetch (bypasses throttle)
  forceFetchLocationAndStatus: async (rideId) => {
    set({ lastFetchTime: 0, ongoingFetchPromise: null });
    return get().fetchOnlyLocationAndStatus(rideId);
  },

  // Reset throttle state
  resetThrottle: () => {
    set({
      lastFetchTime: 0,
      ongoingFetchPromise: null
    });
  },

  // -----------------------------
  // Mark Driver Arrived
  // -----------------------------
  markReached: async (riderId, rideId, setShowOtpModal) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.post(`/api/v1/new/change-ride-status`, {
        riderId,
        rideId,
        status: "driver_arrived",
      });

      if (!data.success) throw new Error(data.error || "Failed to mark arrival");

      set({ rideStep: "otp", loading: false });
      if (setShowOtpModal) setShowOtpModal(true);
      await get().fetchRideDetails(rideId);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to mark arrival";
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },

  // -----------------------------
  // Verify OTP
  // -----------------------------
  verifyOtp: async (otp, riderId, rideId) => {
    if (!otp || !(otp.length === 4 || otp.length === 6)) {
      throw new Error("Please enter a valid 4-digit or 6-digit OTP.");
    }


    set({ otpLoading: true });
    try {
      const { data } = await axiosInstance.post(`/api/v1/new/verify-ride-otp`, {
        riderId,
        rideId,
        otp,
      });
      console.log("ok",data)
      // await get().fetchRideDetails(rideId);
      if (!data.success) throw new Error(data.error  || data.message|| "Invalid OTP");

      set({ rideStep: "drop", otpLoading: false });

      return data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "OTP verification failed";
      set({ otpLoading: false, error: message });
      throw new Error(message);
    }
  },

  // -----------------------------
  // Mark Drop Completed
  // -----------------------------
  markDrop: async (riderId, rideId) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.post(`/api/v1/new/change-ride-status`, {
        riderId,
        rideId,
        status: "completed",
      });

      if (data.error) throw new Error(data.error);

      set({ rideStep: "payment", loading: false });
      await get().fetchRideDetails(rideId);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to mark drop";
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  // Get current status (prioritizes lightweight updates)
  getCurrentStatus: () => {
    const { rideStatus, rideDetails } = get();
    return rideStatus || rideDetails?.ride_status;
  },

  // Get current driver location (prioritizes lightweight updates)
  getCurrentDriverLocation: () => {
    const { driverLocation, rideDetails } = get();
    return driverLocation || rideDetails?.driver?.location;
  },

  // Reset lightweight state (optional)
  resetLightweightState: () => {
    set({
      rideStatus: null,
      driverLocation: null,
      lastStatusUpdate: null
    });
  },
// ---------------p--------------
  // Collect Payment
  // -----------------------------
  paymentCollect: async (riderId, rideId, amount, mode) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.post(`/api/v1/new/collect-payment`, {
        riderId,
        rideId,
        amount,
        mode,
      });
      console.log("data?",data)

      if (!data.success) throw new Error(data.error || "Payment failed");

      set({ loading: false });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Payment failed";
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },

  // -----------------------------
  // Fetch Cancel Reasons
  // -----------------------------
  fetchCancelReasons: async () => {
    try {
      const { data } = await axiosInstance.get(`/api/v1/admin/cancel-reasons?active=active&type=driver`);
      set({ cancelReasons: data?.data || [] });
      return data?.data || [];
    } catch (err) {
      const message = err.response?.data?.message || "Failed to fetch cancel reasons";
      set({ error: message });
      throw new Error(message);
    }
  },

  // -----------------------------
  // Handle Ride Cancel
  // -----------------------------
  handleCancel: async (activeRideData, selectedReason) => {
    console.log("data",activeRideData, selectedReason)
    try {
      set({ loading: true, error: null });
      await axiosInstance.post(`/api/v1/new/ride/cancel`, {
        intercity: activeRideData?.isIntercityRides,
        ride: activeRideData._id,
        cancelBy: "driver",
        reason_id: selectedReason._id,
        reason: selectedReason.name,
      });
      set({ loading: false });
      return true;
    } catch (err) {
      const message = err.response?.data?.message || "Failed to cancel ride";
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
}));

export default useCurrentRideStore;
