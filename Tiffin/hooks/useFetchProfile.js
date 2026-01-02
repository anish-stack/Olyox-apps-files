import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const useFetchProfile = () => {
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigation = useNavigation();

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const storedToken = await AsyncStorage.getItem('userToken');
            if (!storedToken) {
                navigation.replace('Login');
                return;
            }

            const { data } = await axios.get(
                'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
                {
                    headers: { 'Authorization': `Bearer ${storedToken}` }
                }
            );

            if (data?.data) {
                setRestaurant(data.data);
            } else {
                setError("Restaurant ID not found in API response");
            }
            setLoading(false);

        } catch (err) {
            setLoading(false);

            setError("Internal server error");
            console.error("Internal server error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return { restaurant, userLoading: loading, error, refetch: fetchProfile };
};

export default useFetchProfile;
