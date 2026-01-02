import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL_APP } from "../../constant/api";
import useUserStore from "../../Store/useUserStore";
import axiosInstance from "../../constant/axios";

const useGetCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, fetchUserDetails } = useUserStore();

  // Fetch coupons by userId
  const fetchCoupons = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {

      const response = await axiosInstance.get(`/api/v1/admin/personal-coupon/${userId}`);
      setCoupons(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching coupons:", error?.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user details first, then fetch coupons
  const fetchUserAndCoupons = useCallback(async () => {
    try {
      const fetchedUser = await fetchUserDetails(); // fetch latest user info
      const userId = user?._id || fetchedUser?._id;
      if (userId) {
        await fetchCoupons(userId);
      }
    } catch (error) {
      console.error("Error fetching user and coupons:", error.message);
    }
  }, [fetchCoupons, fetchUserDetails, user?._id]);

  // Automatically fetch on mount
  useEffect(() => {
    fetchUserAndCoupons();
  }, [fetchUserAndCoupons]);

  return {
    coupons,
    loading,
    refresh: fetchUserAndCoupons, // manually trigger refresh
  };
};

export default useGetCoupons;
