import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import useFetchProfile from "./useFetchProfile";


const API_URL_APP = `https://appapi.olyox.com`

const useGetCoupons = () => {
  const [coupons, setCoupons] = useState([]);

  const [loading, setLoading] = useState(false);
  const { restaurant } = useFetchProfile()
console.log(restaurant?._id)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = restaurant?._id;
      if (!userId) return;

      const response = await axios.get(
        `${API_URL_APP}/api/v1/admin/personal-coupon/${userId}`
      );

      console.log(response?.data.data)
      const allData = response.data?.data || [];

      setCoupons(allData);
    } catch (error) {
      // console.error("Error fetching call and message data:", error.response.data);
    } finally {
      setLoading(false);
    }
  }, [restaurant?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { coupons, loading, refresh: fetchData };
};

export default useGetCoupons;
