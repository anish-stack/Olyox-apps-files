import { io } from "socket.io-client";

const SOCKET_URL = "https://www.appv2.olyox.com";
let socket = null;

/** Chat listeners */
let chatListeners = [];

/** Notify all chat listeners */
const notifyChatListeners = (message) => {
  chatListeners.forEach((callback) => callback(message));
};

/** Subscribe to new chat messages */
export const onNewChatMessage = (callback) => {
  if (typeof callback === "function") {
    chatListeners.push(callback);
  }
  return () => {
    chatListeners = chatListeners.filter((cb) => cb !== callback);
  };
};

/** Initialize Socket.IO */
export const initializeSocket = ({ userType = "user", userId, name }) => {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  socket.userType = userType;
  socket.userId = userId;
  socket.name = name || "user";

  /** Connection events */
  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);
    socket.emit("register", { userId, userType, name });
  });

  socket.on("disconnect", (reason) => console.warn("🔴 Socket disconnected:", reason));
  socket.on("connect_error", (err) => console.error("⚠️ Connection error:", err.message));
  socket.on("reconnect_attempt", (attempt) => console.log(`🔁 Reconnect attempt #${attempt}`));
  socket.on("reconnect", (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit("register", { userId, userType, name });
  });

  /** Ping */
  socket.on("pong-custom-user", (data) => console.log("📡 Pong received:", data));
  startPing();

  /** ================= CHAT EVENTS ================= */

  // Join confirmation
  socket.on("chat_joined", (data) => {
    console.log(`🗨️ Joined chat for ride ${data.ride_id}`, data);
  });
  
  // Incoming chat messages - notify listeners immediately
  socket.on("chat_message", (chatData) => {
    console.log("💬 New chat message received:", chatData);
    
    if (chatData) {
      // Notify listeners with the new message immediately
      notifyChatListeners(chatData);
    }
  });

  return socket;
};

/** Start emitting ping every 20s */
const startPing = () => {
  setInterval(() => {
    if (socket && socket.connected) {
      socket.emit("ping-custom-user", { timestamp: Date.now() });
    }
  }, 20000);
};

/** Join ride chat room */
export const joinRideChat = (ride_id) => {
  if (!socket || !socket.connected) {
    console.warn("⚠️ Socket not connected");
    return;
  }
  if (!ride_id) {
    console.warn("⚠️ ride_id is required to join chat");
    return;
  }
  socket.emit("join_ride_chat", { ride_id });
  console.log(`🗨️ Joining chat room for ride ${ride_id}`);
};

/** Fetch all messages for a ride */
export const fetchAllMessages = (ride_id) => {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      console.warn("⚠️ Socket not connected");
      return reject(new Error("Socket not connected"));
    }
    if (!ride_id) {
      console.warn("⚠️ ride_id is required");
      return reject(new Error("ride_id is required"));
    }

    // Create timeout to prevent hanging
    const timeout = setTimeout(() => {
      socket.off('all_messages');
      reject(new Error("Timeout fetching messages"));
    }, 10000);

    // Remove any existing listener
    socket.off('all_messages');

    // Listen for response
    socket.once('all_messages', ({ messages }) => {
      clearTimeout(timeout);
      console.log("📩 All messages received:", messages?.length || 0);
      resolve(messages || []);
    });

    // Request messages
    socket.emit('get_all_messages', { ride_id });
    console.log(`📨 Requesting all messages for ride ${ride_id}`);
  });
};

/** Send message to ride chat */
export const sendRideChatMessage = (data) => {
  if (!socket || !socket.connected) {
    console.warn("⚠️ Socket not connected");
    return false;
  }
  if (!data?.ride_id || !data?.message || !data?.who) {
    console.warn("⚠️ ride_id, message, and who are required");
    return false;
  }

  socket.emit("chat_message", { data });
  console.log(`💬 Sent message for ride ${data.ride_id}`);
  return true;
};

/** Disconnect socket */
export const cleanupSocket = () => {
  if (socket) {
    console.log("🛑 Cleaning up socket connection...");
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    chatListeners = [];
  }
};

/** Check connection status */
export const isSocketConnected = () => socket && socket.connected;