import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";  // Import axios
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupSocket, initializeSocket } from "./SocketService";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const [socket, setSocket] = useState(null);  // Store the socket instance in state
    const [isSocketReady, setSocketReady] = useState(false);
    const [isReconnecting, setReconnecting] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadUserAndInitializeSocket = async () => {
            try {
                setLoading(true);

                // Step 1: Retrieve token from AsyncStorage
                const token = await AsyncStorage.getItem("userToken");
                // console.log(token)
                if (!token) {
                    throw new Error("No auth token found");
                }

                // Step 2: Fetch user data
                const response = await axios.get(
                    'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
                    {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );

                // console.log("Full API Response:", response);

                // Ensure response structure is correct
                if (!response || !response.data || !response.data.data) {
                    throw new Error("Invalid API response structure");
                }

                const user = response.data.data;
                // console.log("User Data:", user);

                if (!user || !user._id) {
                    throw new Error("Invalid user data");
                }

                setUserData(user);

                // Step 3: Initialize the socket after fetching user data
                const socketInstance = await initializeSocket({
                    userType: "tiffin_partner",
                    userId: user._id,  // Ensure you're passing the correct user ID
                });

                if (socketInstance) {
                    socketRef.current = socketInstance;
                    setSocket(socketInstance);
                    setSocketReady(true);
                    setReconnecting(false);
                }
            } catch (err) {
                const token = await AsyncStorage.removeItem("userToken");

                console.error("Socket initialization error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadUserAndInitializeSocket();

        return () => {
            if (socketRef.current) {
                cleanupSocket();
                socketRef.current = null;
                setSocket(null);
            }
            setSocketReady(false);
            setReconnecting(false);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isSocketReady, isReconnecting, loading, error, userData }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};
