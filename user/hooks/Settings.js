import { useState, useEffect, useCallback } from "react";
import { findSettings } from "../utils/helpers";

const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getSettings = useCallback(async () => {
    // console.log("🔄 Fetching settings...");
    setLoading(true);
    setError(null);

    try {
      const response = await findSettings();
      // console.log("✅ Settings fetched successfully:", response);
      setSettings(response);
    } catch (err) {
      console.error("❌ Error fetching settings:", err);
      setError(err);
    } finally {
      console.log("⏳ Done fetching settings. Loading:", false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("📌 useSettings mounted. Calling getSettings...");
    getSettings();
  }, [getSettings]);

  return { settings, loading, error, refetch: getSettings };
};

export default useSettings;
