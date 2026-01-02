import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://www.appv2.olyox.com/api/v1/rider';

export const useRideChat = (rideId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Poll messages every 2 seconds
  useEffect(() => {
    if (!rideId) return;

    let isMounted = true;

    const fetchMessages = async () => {
      try {
        // Only show loading for initial fetch
        if (messages.length === 0) {
          setLoading(true);
        }

        const res = await axios.get(
          `${API_BASE_URL}/${rideId}/messages`,
          {
            timeout: 15000, // 5 second timeout
          }
        );

        if (isMounted) {
          setMessages(res.data.messages || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching ride messages:', err.message);
          // Only set error on initial load, ignore polling errors
          if (messages.length === 0) {
            setError(err.message || 'Failed to fetch messages');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchMessages();

    // Poll every 2 seconds
    const interval = setInterval(fetchMessages, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [rideId]);

  const sendMessage = async (rideId, fromType, message) => {
    if (!message?.trim()) {
      throw new Error('Message cannot be empty');
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/${rideId}/messages`,
        {
          from: rideId,
          fromType,
          message: message.trim(),
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000, // 10 second timeout for sending
        }
      );

      // Optimistically update messages
      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
      }

      return res.data;
    } catch (err) {
      console.error('Error sending message:', err.message);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send message';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    messages,
    sendMessage,
    loading,
    error,
  };
};