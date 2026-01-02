import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import useHotelApi from "../context/HotelDetails";
import { BASE_URL } from "../constant/Api";


const useGetCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const { findDetails } = useHotelApi(); // Assumes findDetails returns an Axios response

  // Function to fetch coupons
  const fetchCoupons = useCallback(async () => {
    setLoading(true);

    try {
      const response = await findDetails();
     

      if (!response?.data?.data) {
        console.warn("⚠️ No valid user data found in response.");
        return;
      }

      const userId = response.data.data._id;

      const couponsRes = await axios.get(
        `${BASE_URL}/admin/personal-coupon/${userId}`
      );

      console.log("🎟️ Coupon response:", couponsRes);

      const couponData = couponsRes.data?.data || [];
      console.log("📦 Coupons fetched:", couponData);

      setCoupons(couponData);
    } catch (error) {
      if(error.response.data.message === "Coupon not foun"){
        setCoupons([])
      }
      // console.error("❌ Error fetching coupons:", error.response.data);
    } finally {
      setLoading(false);
      console.log("✅ fetchCoupons complete.");
    }
  }, []);

  // Fetch coupons on component mount
  useEffect(() => {
    fetchCoupons();
  }, []);

  return {
    coupons,
    loading,
    refresh: fetchCoupons,
  };
};

export default useGetCoupons;
