import { create } from "zustand";
import axiosInstance from "../constant/axios";
import loginStore from "./authStore";
import { API_URL_WEB } from "../constant/api";
import axios from "axios";

const useUserStore = create((set, get) => ({
  user: {
    _id: null,
    name: null,
    wallet: 0,
    BH: null,
    phone: null,
    category: null,
    isAvailable: false,
    isProfileComplete: false,
    isDocumentUpload: false,
    documentRejected:false,
    documentRejectReason:null,
    TotalRides: 0,
    points: 0,
    fcmToken: null,
    isOnline: false,
    YourQrCodeToMakeOnline: null,
    loading: false,
    // Recharge related fields
    RechargeData: {
      expireData: null,
      isActive: false,
      planName: null,
      amount: null,
    },
    documents: {
      rc: null,
      insurance: null,
      aadharFront: null,
      aadharBack: null,
      pancard: null,
      profile: null,
      pollution: null,
      license: null,
    },
    location:null,
    isFirstRechargeDone: false,
    isRechargeExpired: false,
    on_ride_id: null,
    on_intercity_ride_id:null,
    // Vehicle info
    rideVehicleInfo: {
      vehicleName: null,
      vehicleType: null,
      RcExpireDate: null,
      VehicleNumber: null,
    },
  },

  get free_for_ride() {
    const user = get().user;
    return !user?.on_ride_id; // true if on_ride_id is null
  },

  // ✅ Update user state partially
  setUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),

  // ✅ Check if recharge is expired
  checkRechargeExpiry: () => {
    const { user } = get();
    if (!user.RechargeData?.expireData) return false;

    const expireDate = new Date(user.RechargeData.expireData);
    const currentDate = new Date();
    const isExpired = expireDate < currentDate;

    set((state) => ({
      user: { ...state.user, isRechargeExpired: isExpired },
    }));

    return isExpired;
  },

  // ✅ Fetch user details (requires valid token)
  fetchUserDetails: async () => {
    try {
      const { token } = loginStore.getState();

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await axiosInstance.get("/api/v1/rider/user-details", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const userData = response.data?.partner || response.data;
      console.log("✅ Fetched user details:", userData);
      if (userData) {
        set({ user: { ...get().user, ...userData } });
        // Check recharge expiry after fetching user details
        get().checkRechargeExpiry();
        console.log("✅ User details loaded automatically");
      } else {
        throw new Error("Invalid user data received");
      }

      if (userData.BH) {
        try {
          const bhResponse = await get().checkBhDetails(userData.BH);
          const bhData = bhResponse?.details;
          console.log("✅ BH details fetched direct:", bhData);
          if (bhData && bhData.wallet !== undefined) {
            set((state) => ({
              user: { ...state.user, wallet: bhData.wallet || 0 },
            }));
          }
        } catch (bhError) {
          console.error(
            "❌ Error fetching BH details in fetchUserDetails:",
            bhError.message
          );
          // Continue without throwing to avoid blocking user details
        }
      }
    } catch (error) {
      console.error(
        "❌ Error fetching user details:",
        error.response?.data || error.message
      );
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch user details"
      );
    }
  },

  checkBhDetails: async (BhId) => {
    try {
      const response = await axios.post(`${API_URL_WEB}/check-bh-id`, {
        bh: BhId,
      });

      return response.data;
    } catch (error) {
      console.log("errors", error);
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Please reload the screen"
      );
    }
  },

  fetchCurrentDetails: async (id) => {
    try {
      console.log("🚀 fetchCurrentDetails called with id:", id);

      // Fallback to current user ID if no id is provided
      const userId = id || useUserStore.getState().user?._id;
      console.log("ℹ️ Using userId:", userId);

      if (!userId) {
        console.error("❌ No user ID available, aborting fetch");
        throw new Error("No user ID available");
      }

      const { token } = loginStore.getState();
      console.log("ℹ️ Retrieved token:", token ? "✅ exists" : "❌ missing");

      if (!token) {
        throw new Error("No authentication token available");
      }

      console.log("🔄 Sending API request to fetch user details...");
      const response = await axiosInstance.get(
        `/api/v1/rider/getMyAllDetails?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // console.log("✅ API response received current:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error fetching current details:",
        error.response?.data || error.message
      );
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch current details"
      );
    }
  },

  toggleFnc: async (logout = false) => {
    const state = get().user;
    // If logout, always go offline
    const goingOnline = logout ? false : !state.isOnline;

    try {
      console.log(
        `[toggleOnlineStatus] Toggling status | logout=${logout} | goingOnline=${goingOnline}`
      );

      // 🔹 Recharge check only if not logout
      if (!logout) {
        const isExpired = get().checkRechargeExpiry();

        if (goingOnline && isExpired) {
          console.log(
            "[toggleOnlineStatus] Recharge expired. Blocking online toggle."
          );
          const expiredError = {
            expired: true,
            message: "Please recharge to go online",
            rechargeInfo: {
              showOnlyBikePlan:
                state.rideVehicleInfo?.vehicleName === "2 Wheeler" ||
                state.rideVehicleInfo?.vehicleName === "Bike",
              role: state.category,
              firstRecharge: state.isFirstRechargeDone || false,
            },
          };
          throw new Error(JSON.stringify(expiredError));
        }
      }

      // 🔹 Start loading state
      set((state) => ({
        user: { ...state.user, loading: true, isOnline: goingOnline },
      }));

      const { token } = loginStore.getState();
      if (!token) throw new Error("No authentication token available");

      // 🔹 Always send API — if logout, status will be false
      console.log(
        "[toggleOnlineStatus] Sending API request toggleWorkStatus:",
        goingOnline
      );
      const res = await axiosInstance.post(
        "/api/v1/rider/toggleWorkStatusOfRider",
        { status: goingOnline },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("[toggleOnlineStatus] API Response:", res?.data);

      await get().fetchUserDetails();

      if (res.data?.success) {
        const newStatus = res.data?.cabRider === "online";
        set((state) => ({
          user: { ...state.user, isOnline: newStatus, loading: false },
        }));

        // If logout, confirm forced offline
        if (logout) {
          console.log(
            "[toggleOnlineStatus] Successfully set offline before logout ✅"
          );
          return { success: true, status: false, fromLogout: true };
        }

        return { success: true, status: newStatus };
      } else {
        console.log("[toggleOnlineStatus] API Failed | Reverting status");
        set((state) => ({
          user: { ...state.user, isOnline: !goingOnline, loading: false },
        }));
        throw new Error(res.data?.message || "Status update failed");
      }
    } catch (error) {
      console.error("[toggleOnlineStatus] Error:", error);

      // Revert status on error
      set((state) => ({
        user: { ...state.user, isOnline: !goingOnline, loading: false },
      }));

      try {
        await get().fetchUserDetails();
      } catch (fetchError) {
        console.error(
          "[toggleOnlineStatus] Failed to fetch user details after error:",
          fetchError
        );
      }

      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.expired) throw error;
      } catch {}

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Status update failed";
      throw new Error(errorMessage);
    }
  },

  // ✅ Clear user state
  clearUser: () =>
    set({
      user: {
        _id: null,
        name: null,
        phone: null,
        category: null,
        isAvailable: false,
        isProfileComplete: false,
        isDocumentUpload: false,
        TotalRides: 0,
        points: 0,
        fcmToken: null,
        isOnline: false,
        loading: false,
        RechargeData: {
          expireData: null,
          isActive: false,
          planName: null,
          amount: null,
        },
        isFirstRechargeDone: false,
        isRechargeExpired: false,
        on_ride_id: null,
        rideVehicleInfo: {
          vehicleName: null,
          vehicleType: null,
        },
      },
    }),
}));

// 🚀 Auto-fetch user details when token becomes available
const initializeUserStore = async () => {
  try {
    const { token } = loginStore.getState();
    if (token) {
      await useUserStore.getState().fetchUserDetails();
    }
  } catch (error) {
    console.error("❌ Failed to auto-fetch user details:", error.message);
  }
};

// Call initialization
initializeUserStore();

export default useUserStore;
