import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://www.appv2.olyox.com/api/v1/rider';

export const useRideChat = (rideId, isPooling = false) => {

  
  // console.log("isPooling",isPooling)
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const hasInitialFetch = useRef(false);

  useEffect(() => {
    if (!rideId) return;

    let isMounted = true;
    let interval = null;

    const fetchMessages = async () => {
      try {
        if (!hasInitialFetch.current && isMounted) {
          setLoading(true);
        }

        console.log(`[Polling] Fetching messages for rideId: ${rideId}...`);

        const res = await axios.get(`${API_BASE_URL}/${rideId}/messages`, {
          timeout: 15000,
        });

        if (isMounted) {
          setMessages(res.data.messages || []);
          setError(null);
          hasInitialFetch.current = true;
          console.log(`[Polling] Messages updated (${res.data.messages?.length || 0})`);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[Polling] Error fetching ride messages:', err.message);
          if (!hasInitialFetch.current) {
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

    if (isPooling) {
      console.log('[Polling] Pooling started...');
      interval = setInterval(fetchMessages, isPooling ? 2000:10000);
    } else {
      console.log('[Polling] Pooling is disabled.');
    }

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
        console.log('[Polling] Pooling stopped.');
      }
    };
  }, [rideId, isPooling]);

  const sendMessage = async (rideId, fromType, message) => {
    if (!message?.trim()) throw new Error('Message cannot be empty');
    if (!rideId) throw new Error('Ride ID is required');

    try {
      console.log(`[Chat] Sending message: "${message}" from ${fromType}`);
      
      const res = await axios.post(
        `${API_BASE_URL}/${rideId}/messages`,
        {
          from: rideId,
          fromType,
          message: message.trim(),
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
      }

      console.log('[Chat] Message sent successfully.');
      return res.data;
    } catch (err) {
      console.error('[Chat] Error sending message:', err.message);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send message';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const clearMessages = () => {
    console.log('[Chat] Clearing messages...');
    setMessages([]);
    setError(null);
    hasInitialFetch.current = false;
  };

  return {
    messages,
    sendMessage,
    clearMessages,
    loading,
    error,
  };
};
