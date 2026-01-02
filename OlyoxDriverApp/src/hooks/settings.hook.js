import { useEffect, useState } from 'react';
import axios from 'axios';

const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
   const fetchSettings = async () => {
      try {
        const response = await axios.get('https://www.appv2.olyox.com/api/v1/admin/get_Setting');
        // console.log(response.data)
        setSettings(response.data); // Assuming API wraps in { success, data }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
  useEffect(() => {
 

    fetchSettings();
  }, []);

return { settings, loading, error, fetch: fetchSettings };
};

export default useSettings;
