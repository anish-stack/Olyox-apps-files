import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';

const TokenContext = createContext();

export const TokenProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadToken = async () => {
            setLoading(true)
            // await SecureStore.deleteItemAsync('userToken');
            try {
                const storedToken = await SecureStore.getItemAsync('userToken');
                // console.log(storedToken)
                if (storedToken) {
                    setToken(storedToken);
                    setIsLoggedIn(true);
                    setLoading(false)
                }
                setLoading(false)

            } catch (error) {
                console.error('Failed to load token:', error);
                setLoading(false)

            }
        };

        loadToken();
    }, []);

    const updateToken = async (newToken) => {
        setLoading(false)

        try {
            await SecureStore.setItemAsync('userToken', newToken);
            setToken(newToken);
            setIsLoggedIn(true);
            setLoading(false)

        } catch (error) {
            setLoading(false)

            console.error('Failed to save token:', error);
        }
    };

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync('userToken');
            setToken(null);
            setIsLoggedIn(false); // ✅ Ensure logout state is updated
        } catch (error) {
            setLoading(false)

            console.error('Failed to remove token:', error);
        }
    };

    return (
        <TokenContext.Provider value={{ token,loading, isLoggedIn, updateToken, logout }}>
            {children}
        </TokenContext.Provider>
    );
};

export const useToken = () => {
    return useContext(TokenContext);
};
