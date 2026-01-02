import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { initializeSocket, cleanupSocket, getSocket } from "../services/socketService";
import { find_me } from "../utils/helpers";
import { tokenCache } from "../Auth/cache";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const socketInitialized = useRef(false);

  // fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await find_me();
        if (data?.user?._id) {
          setUser(data.user._id);
        } else {
          console.warn("⚠️ No user found");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

useEffect(() => {
    if (!user) return;

    console.log("🚀 Socket init ho raha hai user ke liye:", user);

    if (socketInitialized.current) {
      cleanupSocket();
      socketInitialized.current = false;
    }

    const socket = initializeSocket({ userId: user });

    setSocketInstance(socket);
    socketInitialized.current = true;

    socket.on("connect", async () => {
      console.log("🔌 Socket connected ✅");
      setIsConnected(true);
      setLastConnectedAt(new Date());

      try {
        const token = await tokenCache.getToken("auth_token_db");
        // console.log("🔑 Token mila:", token);

        socket.emit("authenticate", {
          userId: user,
          userType: "user", // agar driver hai to "driver" bhejna
          token: token,
        });
      } catch (err) {
        console.error("❌ Token fetch karte time error:", err);
      }
    });

    // ✅ Backend se confirm hone wala event
    socket.on("authenticated", (data) => {
      console.log("🎉 Socket authenticated ho gaya bhai!", data);
    });

    socket.on("auth_error", (err) => {
      console.error("🚫 Authentication fail ho gaya:", err);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnect ho gaya:", reason);
      setIsConnected(false);
    });

    // socket.on("connect_error", (err) => {
    //   console.error("🚨 Socket connect error:", err.message);
    //   setIsConnected(false);
    // });

    return () => {
      console.log("🛑 Socket cleanup ho raha hai...");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("authenticated");
      socket.off("auth_error");
      cleanupSocket();
      socketInitialized.current = false;
      setIsConnected(false);
      setSocketInstance(null);
    };
  }, [user]);

  // safe socket getter
  const getSafeSocket = () => {
    try {
      return socketInstance || getSocket();
    } catch (error) {
      console.error("Error getting socket:", error);
      return null;
    }
  };

  const contextValue = {
    isConnected,
    lastConnectedAt,
    socket: getSafeSocket,
    userId: user,
  };

  return (
    <SocketContext.Provider value={contextValue}>
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
