import axios from "axios";
import { useState } from "react";

export const useBhDetails = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchDetails = async (BhId) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(
                "https://www.webapi.olyox.com/api/v1/getProviderDetailsByBhId",
                { BhId }
            );
            setData(response.data);
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return { data, error, loading, fetchDetails };
};