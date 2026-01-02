import axios from 'axios';
import { API_BASE_URL_V2 } from '../constant/Api';
import { useToken } from './AuthContext';
import { useState } from 'react';

const useHotelApi = () => {
  const { token, isLoggedIn } = useToken();
  const [data, setData] = useState(null);
  const [toggleloading, setToggleLoading] = useState(false);

  const findDetails = async () => {
    if (!isLoggedIn) {
      return { success: false, message: "Please login first." };
    }


    try {
      const response = await axios.get(`${API_BASE_URL_V2}/find-Me-Hotel`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        setData(response.data.data);
        return { success: true, data: response.data };
      } else {
        return { success: false, message: "Unexpected response from server." };
      }
    } catch (error) {
      console.error("Error fetching hotel details:", error.response?.data?.message || error.message);
      return {
        success: false,
        message: error.response?.data?.message || "An error occurred. Please try again.",
      };
    } 
  };

  const toggleHotel = async ({ status }) => {
    if (!isLoggedIn) {
      return { success: false, message: "Please login first." };
    }

    if (typeof status !== 'boolean') {
      return { success: false, message: "Invalid status value." };
    }

    setToggleLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL_V2}/toggle-hotel`, { status }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // Refresh hotel data after toggle
      await findDetails();

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: "Unexpected response from server." };
      }
    } catch (error) {
      console.error("Error toggling hotel status:", error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || "An error occurred. Please try again.",
      };
    } finally {
      setToggleLoading(false);
    }
  };

  return { data, toggleloading, findDetails, toggleHotel };
};

export default useHotelApi;
