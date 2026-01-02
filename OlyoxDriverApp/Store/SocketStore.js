import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://www.appv2.olyox.com/'; // Change to your server URL
const PING_INTERVAL = 5000; // 5 seconds
const PING_TIMEOUT = 1000; // 1 second

const useSocketStore = create((set, get) => ({
  // State
  socket: null,
  isConnected: false,
  isRegistered: false,
  messages: [],
  notifications: [],
  driverLocation: null,
  rideUpdates: null,
  connectionError: null,
  pingInterval: null,
  lastPongTime: null,
  latency: null,

  // Initialize Socket Connection
  initializeSocket: (userId, userType, userName) => {
    const { socket: existingSocket, pingInterval } = get();
    console.log("userId, userType, userName", userId, userType, userName)

    // Clear existing ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
    }

    // If socket already exists, disconnect it first
    if (existingSocket) {
      existingSocket.disconnect();
    }

    // Create new socket instance
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
      autoConnect: true,
      timeout: 20000,
    });

    // Connection event
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      set({
        isConnected: true,
        connectionError: null,
        socket,
        lastPongTime: Date.now(),
      });

      socket.on('chat_joined', (data) => {
        console.log(`🗨️ Joined ride chat:`, data);
      });

      // Receive chat messages
      socket.on('chat_message', (chatData) => {
        console.log('💬 New chat message received:', chatData);

        // Append to local messages
        set((state) => ({
          messages: [...state.messages, chatData],
        }));
      });

      // Auto-register after connection
      socket.emit('register', {
        userId,
        userType,
        name: userName,
      });

      // Start ping-pong mechanism
      const interval = setInterval(() => {
        const { lastPongTime } = get();
        const now = Date.now();

        // Check if we haven't received pong in time
        if (lastPongTime && now - lastPongTime > PING_INTERVAL + PING_TIMEOUT) {
          console.warn('⚠️ Ping timeout - connection may be dead');
          set({ connectionError: 'Connection timeout' });
        }

        // Send ping
        console.log('🏓 Sending ping...');
        socket.emit('ping', { timestamp: now });
      }, PING_INTERVAL);

      set({ pingInterval: interval });
    });

    // Pong response
    socket.on('pong', (data) => {
      const now = Date.now();
      const latency = now - data.timestamp;
      console.log(`🏓 Pong received - Latency: ${latency}ms`);
      set({
        lastPongTime: now,
        latency,
        connectionError: null,
      });
    });

    // Registration confirmation
    socket.on('registered', (data) => {
      console.log('✅ Registered successfully:', data);
      set({ isRegistered: true });
    });

    // Disconnect event
    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      const { pingInterval } = get();
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      set({
        isConnected: false,
        isRegistered: false,
        pingInterval: null,
        lastPongTime: null,
      });
    });

    // Reconnection event
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      set({
        isConnected: true,
        lastPongTime: Date.now(),
      });

      // Re-register after reconnection
      socket.emit('register', {
        userId,
        userType,
        name: userName,
      });
    });

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('⚠️ Connection error:', error.message);
      set({
        connectionError: error.message,
        isConnected: false
      });
    });

    // Error event
    socket.on('error', (error) => {
      console.error('⚠️ Socket error:', error);
      set({ connectionError: error.message || 'Socket error occurred' });
    });

    // Listen for custom messages
    socket.on('message_ack', (data) => {
      console.log('Message acknowledged:', data);
    });

    // Listen for location acknowledgment
    socket.on('location_ack', (data) => {
      console.log('Location acknowledged:', data);
    });

    // Listen for new ride requests (for drivers)
    socket.on('new_ride_request', (data) => {
      // console.log('🚗 New ride request from io:', data);
      set((state) => ({
        notifications: [...state.notifications, {
          type: 'ride_request',
          data,
          timestamp: new Date().toISOString(),
        }],
      }));
    });

    // Listen for ride updates (for users)
    socket.on('ride_update', (data) => {
      console.log('📍 Ride update:', data);
      set({ rideUpdates: data });
    });

    socket.on('clear_ride_request', (data) => {
      // console.log('📍 Ride Clear:', data);

      set((state) => {
        // console.log("Before filter:", state.notifications);

        // Remove all notifications with the same rideId
        const updatedNotifications = state.notifications.filter(
          (notif) => notif.data?.rideId !== data.rideId
        );

        // console.log("After filter:", updatedNotifications);

        return {
          notifications: updatedNotifications,
          rideUpdates: state.rideUpdates?.rideId === data.rideId ? null : state.rideUpdates,
        };
      });
    });


    // Listen for driver location (for users)
    socket.on('driver_location', (data) => {
      console.log('📍 Driver location:', data);
      set({ driverLocation: data.location });
    });

    // Listen for admin announcements
    socket.on('admin_announcement', (data) => {
      console.log('📢 Admin announcement:', data);
      set((state) => ({
        notifications: [...state.notifications, {
          type: 'announcement',
          data,
          timestamp: new Date().toISOString(),
        }],
      }));
    });

    // Listen for all messages response
    socket.on('all_messages', (data) => {
      console.log("📩 All messages received:", data.messages);
      set({ messages: data.messages || [] });
    });

    // Store socket instance
    set({ socket });
  },

  // Disconnect socket
  disconnectSocket: () => {
    const { socket, pingInterval } = get();

    if (pingInterval) {
      clearInterval(pingInterval);
    }

    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        isRegistered: false,
        driverLocation: null,
        rideUpdates: null,
        pingInterval: null,
        lastPongTime: null,
        latency: null,
      });
      console.log('Socket disconnected manually');
    }
  },

  // Send location update
  sendLocationUpdate: (latitude, longitude, accuracy, speed) => {
    const { socket, isConnected } = get();

    if (!socket || !isConnected) {
      console.warn('⚠️ Socket not connected. Cannot send location.');
      return false;
    }

    socket.emit('location_update', {
      latitude,
      longitude,
      accuracy: accuracy || 10,
      speed: speed || 0,
      timestamp: Date.now(),
    });

    console.log('📍 Location sent:', { latitude, longitude });
    return true;
  },

  // Join a ride chat room
  joinRideChat: (ride_id) => {
    const { socket, isConnected } = get();
    if (!socket || !isConnected) return console.warn('⚠️ Socket not connected');

    socket.emit('join_ride_chat', { ride_id });
    console.log(`🗨️ Joining chat for ride: ${ride_id}`);
  },

  // Send chat message
  sendRideChatMessage: (ride_id, message, who) => {
    const { socket, isConnected } = get();
    if (!socket || !isConnected) return console.warn('⚠️ Socket not connected');

    if (!ride_id || !message || !who) return console.warn('⚠️ ride_id, message, and who are required');

    socket.emit('chat_message', { ride_id, message, who });
    console.log(`💬 Sending message in ride ${ride_id}: ${message}`);
  },

  // Fetch all messages for a ride
  fetchAllMessages: (ride_id) => {
    const { socket, isConnected } = get();
    if (!socket || !isConnected) return console.warn("⚠️ Socket not connected");
    if (!ride_id) return console.warn("⚠️ ride_id is required");

    socket.emit('get_all_messages', { ride_id });
    console.log(`📩 Fetching all messages for ride: ${ride_id}`);
  },

  // Send custom message
  sendMessage: (message) => {
    const { socket, isConnected } = get();

    if (!socket || !isConnected) {
      console.warn('⚠️ Socket not connected. Cannot send message.');
      return false;
    }

    const messageData = {
      text: message,
      timestamp: Date.now(),
    };

    socket.emit('message', messageData);

    // Add to local messages
    set((state) => ({
      messages: [...state.messages, {
        ...messageData,
        sent: true,
      }],
    }));

    console.log('💬 Message sent:', message);
    return true;
  },

  // Register user/driver
  registerUser: (userId, userType, userName) => {
    const { socket, isConnected } = get();

    if (!socket || !isConnected) {
      console.warn('⚠️ Socket not connected. Cannot register.');
      return false;
    }

    socket.emit('register', {
      userId,
      userType,
      name: userName,
    });

    console.log('📝 Registration request sent');
    return true;
  },

  // Clear notifications
  clearNotifications: () => {
    set({ notifications: [] });
  },

  // Clear messages
  clearMessages: () => {
    set({ messages: [] });
  },

  // Remove specific notification
  removeNotification: (index) => {
    set((state) => ({
      notifications: state.notifications.filter((_, i) => i !== index),
    }));
  },

  // Get connection status
  getConnectionStatus: () => {
    const { isConnected, isRegistered, latency } = get();
    return { isConnected, isRegistered, latency };
  },

  // Reset store
  resetStore: () => {
    const { socket, pingInterval } = get();

    if (pingInterval) {
      clearInterval(pingInterval);
    }

    if (socket) {
      socket.disconnect();
    }

    set({
      socket: null,
      isConnected: false,
      isRegistered: false,
      messages: [],
      notifications: [],
      driverLocation: null,
      rideUpdates: null,
      connectionError: null,
      pingInterval: null,
      lastPongTime: null,
      latency: null,
    });
  },
}));

export default useSocketStore;