import AsyncStorage from '@react-native-async-storage/async-storage';
import io from "socket.io-client";
import axios from "axios";

const SOCKET_URL = "https://appapi.olyox.com";
let socket = null;

export const fetchUserData = async () => {
    try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
            throw new Error("No auth token found");
        }

        const { data } = await axios.get(
            'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log("ids",data.data._id);
        return data.data._id;
    } catch (error) {
        console.error("Error fetching user details context:", error);
        throw error;
    }
};

export const initializeSocket = async ({ userType = "tiffin_partner", userId }) => {
    console.log("userId",userId)
    if (!userId) {
        console.error("User ID is required to initialize socket");
        return null;
    }

    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000,
        });

        socket.userType = userType;
        socket.userId = userId;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("tiffin_partner", { userType: socket.userType, userId: socket.userId });
        });
   
        socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
            if (reason === "io server disconnect") {
                socket.connect();
            }
        });

        socket.on("reconnect_attempt", (attempt) => {
            console.log(`Reconnection attempt #${attempt}`);
        });

        socket.on("reconnect", () => {
            console.log("Socket reconnected:", socket.id);
            socket.emit("tiffin_partner", { userType: socket.userType, userId: socket.userId });
        });

        socket.on("reconnect_failed", () => {
            console.error("Reconnection failed. Check your server or network.");
        });

        socket.on("connect_error", (error) => {
            console.error("Connection error:", error.message);
            alert("Connection failed. Please try again later.");
        });

        socket.on("connect_timeout", () => {
            console.warn("Connection timed out. Retrying...");
        });
    }

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        throw new Error("Socket is not initialized. Call initializeSocket() first.");
    }
    return socket;
};

export const cleanupSocket = () => {
    if (socket) {
        socket.off("tiffin_partner");
        socket.off("disconnect");
        socket.disconnect();
        socket = null;
    }
};
