import { useState, useEffect } from "react";
import axios from "axios";
import useHotelApi from "../context/HotelDetails";
import { API_BASE_URL_V1, API_BASE_URL_V2 } from "../constant/Api";

const useAnalyticData = () => {
    const { findDetails } = useHotelApi();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const details = await findDetails();
                console.log("Hotel Details:", details?.data?.data?._id);

                if (!details?.data?.data?._id) {
                    throw new Error("Hotel ID not found.");
                }

                const response = await axios.get(`${API_BASE_URL_V2}/HotelAnalyticData/${details?.data?.data?._id}`);

                setData(response.data);
            } catch (err) {
                console.error("Error fetching analytics data:", err);
                setError(err.message || "An error occurred.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};

export default useAnalyticData;
