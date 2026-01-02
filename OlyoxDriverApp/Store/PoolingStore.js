import { create } from "zustand";
import axiosInstance from "../constant/axios";
import useUserStore from "./useUserStore";

const useRideStore = create((set, get) => ({
  rides: new Map(),
  loading: false,
  error: null,
  isPooling: false,

  // Internal interval IDs
  _fetchInterval: null,
  _statusIntervals: new Map(),

  // ✅ Set rides directly (for external updates like FCM)
  setRides: (ridesMapOrUpdater) => {
    if (typeof ridesMapOrUpdater === 'function') {
      // Support functional updates: setRides(prev => new Map(prev))
      const currentRides = get().rides;
      const newRides = ridesMapOrUpdater(currentRides);
      set({ rides: newRides instanceof Map ? newRides : new Map(newRides) });
    } else {
      // Direct update: setRides(new Map([...]))
      set({ rides: ridesMapOrUpdater instanceof Map ? ridesMapOrUpdater : new Map(ridesMapOrUpdater) });
    }
  },

  // ✅ Add a single ride (helper method)
  addRide: (ride) => {
    const ridesMap = new Map(get().rides);
    ridesMap.set(ride._id, ride);
    set({ rides: ridesMap });
    console.log(`✅ Ride added: ${ride._id}`);
  },

  // ✅ Remove a single ride (helper method)
  removeRide: (rideId) => {
    const ridesMap = new Map(get().rides);
    const removed = ridesMap.delete(rideId);
    if (removed) {
      set({ rides: ridesMap });
      console.log(`🗑️ Ride removed: ${rideId}`);
    }
    return removed;
  },

  // ✅ Clear all rides
  clearRides: () => {
    set({ rides: new Map() });
    console.log('🗑️ All rides cleared');
  },

  // ✅ Fetch new pooling rides for a rider
  fetchNewRides: async (riderId) => {
    try {
      const userState = useUserStore.getState();
      console.log('🔍 Checking rider status before fetching new rides...', userState?.user?.on_ride_id);

      // 🚫 Stop polling if rider is on ride or not free
      if (
        !userState.free_for_ride ||
        userState?.user?.on_ride_id ||
        !userState?.user?.isAvailable
      ) {
        console.log("🛑 Rider is busy. Checking reasons...");

        if (!userState.free_for_ride) {
          console.log("⛔ Rider is not free for ride (free_for_ride = false)");
        }

        if (userState?.user?.on_ride_id) {
          console.log(
            `🚗 Rider is currently on a ride (on_ride_id = ${userState.user.on_ride_id})`
          );
        }

        if (!userState?.user?.isAvailable) {
          console.log(
            "🔕 Rider is marked as unavailable (isAvailable = false)"
          );
        }

        console.log("🛑 Stopping pooling automatically.");
        get().stopPooling();
        return;
      } else {
        console.log(
          "✅ Rider is free, available, and not on any ride. Pooling continues..."
        );
      }

      console.log(`⏳ Fetching new rides for rider: ${riderId}...`);
      let freshRiderId = riderId ? riderId : userState?.user?._id;
      const response = await axiosInstance.get(
        `/api/v1/new/pooling-rides-for-rider/${freshRiderId}`
      );

      const ridesData = response.data?.data;
      if (!ridesData || ridesData.length === 0) {
        console.log("ℹ️ No new rides found.");
        return;
      }

      const ridesMap = new Map(get().rides);

      ridesData.forEach((ride) => {
        if (!ridesMap.has(ride._id)) {
          const filteredRide = {
            _id: ride._id,
            pickup_address:
              ride.pickup_address?.formatted_address ||
              ride.pickup_address ||
              null,
            drop_address:
              ride.drop_address?.formatted_address || ride.drop_address || null,
            vehicle_type: ride.vehicle_type,
            ride_status: ride.ride_status,
            isLater: ride.isLater,
            pickup_corrdinates: ride?.pickup_corrdinates,
            isIntercity: ride?.isIntercity || false,
            isRental: ride?.isRental || false,
            rentalHours: ride?.rentalHours,
            isParcelOrder: ride?.isParcelOrder,
            rental_km_limit: ride?.estimatedKm,
            total_fare: ride.pricing?.total_fare || ride.total_fare || null,
            distance: ride.route_info?.distance || ride.distance || null,
            notified_rider: ride.notified_riders
              ? (() => {
                const riderInfo = ride.notified_riders.find(
                  (n) => n.rider_id === freshRiderId
                );
                return riderInfo
                  ? {
                    distance_from_pickup: riderInfo.distance_from_pickup,
                    distance_from_pickup_km:
                      riderInfo.distance_from_pickup_km,
                  }
                  : null;
              })()
              : ride.notified_rider || null,
          };
          console.log("filteredRide from res", filteredRide);
          ridesMap.set(ride._id, filteredRide);

          console.log(
            `✅ New ride added: ${ride._id}, Pickup: ${filteredRide.pickup_address}, Drop: ${filteredRide.drop_address}`
          );

          // Start polling this ride's status
          const intervalId = setInterval(async () => {
            try {
              const result = await get().checkRideStatus(ride._id, freshRiderId);
              if (result.action === "remove") {
                clearInterval(get()._statusIntervals.get(ride._id));
                get()._statusIntervals.delete(ride._id);
                console.log(`🗑️ Ride removed from polling: ${ride._id}`);
              }
            } catch (pollError) {
              console.error(
                `❌ Error polling ride ${ride._id}:`,
                pollError.message
              );
            }
          }, 1000);

          get()._statusIntervals.set(ride._id, intervalId);
        }
      });

      set({ rides: ridesMap, isPooling: true });
      console.log(
        `🟢 Pooling active. Total rides being polled: ${ridesMap.size}`
      );
    } catch (error) {
      console.error(
        "❌ Error fetching new rides:",
        error?.response?.data || error.message
      );
    }
  },

  // ✅ Unified Check Ride Status
  checkRideStatus: async (rideId, riderId) => {
    const { rides } = get();
    try {
      const response = await axiosInstance.get(
        `/api/v1/new/status-driver/${rideId}`
      );
      const ride = response.data.data;
      if (!ride) return { action: "error", rideId };

      const rideStatus = ride.ride_status;

      if (rideStatus === "driver_assigned" || rideStatus === "cancelled") {
        rides.delete(rideId);
        set({ rides: new Map(rides) });
        return { action: "remove", rideId };
      }
      const userState = useUserStore.getState();
      let freshRiderId = riderId ? riderId : userState?.user?._id;

      const filteredRide = {
        _id: ride._id,
        pickup_address:
          ride.pickup_address?.formatted_address || ride.pickup_address || null,
        drop_address:
          ride.drop_address?.formatted_address || ride.drop_address || null,
        vehicle_type: ride.vehicle_type,
        ride_status: ride.ride_status,
        isLater: ride.isLater,
        isParcelOrder: ride?.isParcelOrder,
        isIntercity: ride?.isIntercity || false,
        isRental: ride?.isRental || false,
        pickup_corrdinates: ride?.pickup_corrdinates,
        rentalHours: ride?.rentalHours,
        rental_km_limit: ride?.estimatedKm,
        total_fare: ride.pricing?.total_fare || ride.total_fare || null,
        distance: ride.route_info?.distance || ride.distance || null,
        notified_rider: ride.notified_riders
          ? (() => {
            const riderInfo = ride.notified_riders.find(
              (n) => n.rider_id === freshRiderId
            );
            return riderInfo
              ? {
                distance_from_pickup: riderInfo.distance_from_pickup,
                distance_from_pickup_km: riderInfo.distance_from_pickup_km,
              }
              : null;
          })()
          : ride.notified_rider || null,
      };

      rides.set(rideId, filteredRide);
      set({ rides: new Map(rides) });

      return { action: "update", rideId, ride: filteredRide };
    } catch (error) {
      console.error(
        "Error checking ride status:",
        error?.response?.data || error.message
      );
      return { action: "error", rideId };
    }
  },

  // ✅ Start pooling only if rider is free
  startPooling: (riderId) => {
    const userState = useUserStore.getState();

    if (!userState.free_for_ride || userState?.user?.on_ride_id) {
      console.log("🟡 Rider is busy. Pooling not started.");
      return;
    }
    let freshRiderId = riderId ? riderId : userState?.user?._id;

    get().stopPooling(); // Clear previous intervals
    console.log("✅ Starting pooling...");
    get().fetchNewRides(freshRiderId); // First fetch immediately

    const intervalId = setInterval(() => {
      const userState = useUserStore.getState();
      if (userState.free_for_ride && !userState?.user?.on_ride_id) {
        get().fetchNewRides(freshRiderId);
      } else {
        console.log(
          "🛑 Rider picked up a ride — stopping pooling automatically..."
        );
        get().stopPooling();
      }
    }, 2000);

    set({ _fetchInterval: intervalId, isPooling: true });
  },

  // ✅ Stop pooling - Safe to call anytime, whether pooling is active or not
  stopPooling: () => {
    const state = get();
    const { _fetchInterval, _statusIntervals, isPooling } = state;

    // If already stopped, just return silently
    if (
      !isPooling &&
      !_fetchInterval &&
      (!_statusIntervals || _statusIntervals.size === 0)
    ) {
      console.log("ℹ️ Pooling already stopped. Nothing to do.");
      return;
    }

    console.log("🛑 Stopping pooling...");

    // Clear main fetch interval
    if (_fetchInterval) {
      clearInterval(_fetchInterval);
      console.log("✅ Cleared main fetch interval");
    }

    // Clear all status polling intervals
    if (
      _statusIntervals &&
      _statusIntervals instanceof Map &&
      _statusIntervals.size > 0
    ) {
      _statusIntervals.forEach((intervalId, rideId) => {
        if (intervalId) {
          clearInterval(intervalId);
          console.log(`✅ Cleared status interval for ride: ${rideId}`);
        }
      });
    }

    // Reset state
    set({
      rides: new Map(),
      isPooling: false,
      _fetchInterval: null,
      _statusIntervals: new Map(),
    });

    console.log("✅ Pooling stopped successfully. All state cleared.");
  },
}));

export default useRideStore;