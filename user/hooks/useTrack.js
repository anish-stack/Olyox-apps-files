import { useCallback } from "react";
import axios from "axios";
import { Platform } from "react-native";
import { tokenCache } from "../Auth/cache";

const API_URL = "https://www.appv2.olyox.com/track";

export function useTrack() {
  const track = useCallback(async (event, screen, action, params = {}) => {
    try {
      const payload = {
        event,
        screen,
        action,
        params,
        device: Platform.OS,
        timestamp: new Date().toISOString(),
      };
      const token = await tokenCache.getToken('auth_token_db') 
   
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(API_URL, payload, { headers });
      if (response.data.success) {
        console.log("📊 Event tracked successfully:", response.data);
      } else {
        console.error("⚠️ Tracking failed:", response.data.error);
      }
    } catch (err) {
      console.error("⚠️ Tracking failed:", err.response.data);
    }
  }, []);

  return { track };
}
