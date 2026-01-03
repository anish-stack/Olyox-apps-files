import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'https://www.appv2.olyox.com',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle common error cases
    if (error.response?.status === 429) {
      // Rate limiting
      return Promise.reject(new Error('Too many requests. Please try again later.'));
    }
    return Promise.reject(error);
  }
);

export const LocationService = {
  // Gets address from coordinates (Reverse Geocoding)
  getCurrentLocation: async (coords) => {
    try {
      const response = await api.post('/Fetch-Current-Location', {
        lat: coords.latitude,
        lng: coords.longitude,
      });
      console.log("getCurrentLocation response:", response);
      return response?.data?.address?.completeAddress || null;
    } catch (error) {
      console.error('Failed to fetch current location:', error);
      throw new Error('Failed to fetch current location');
    }
  },

  // Reverse geocoding method using your existing API
  reverseGeocode: async (latitude, longitude) => {
    try {
      // Use the existing getCurrentLocation endpoint which takes lat/lng and returns address
      const address = await LocationService.getCurrentLocation({ latitude, longitude });
      return address;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw new Error('Failed to reverse geocode coordinates');
    }
  },

  // Autocomplete search - returns array of suggestions
  searchLocations: async (query) => {
    console.log("query", query);
    try {
      const response = await api.post('/autocomplete', { input: query });
      console.log("autocomplete response:", response);
      
      // Response structure: response.data contains the array
      // Each item has: description, main_text, place_id, secondary_text
      if (response && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch location suggestions:', error?.response?.data || error);
      throw new Error('Failed to fetch location suggestions');
    }
  },

  // Get coordinates from address (Geocoding)
getCoordinates: async (address) => {
  console.log("Address:", address);
  try {
    const response = await api.get(`/geocode?address=${encodeURIComponent(address)}`);
 

    // Safely access nested fields
    const location = response.data?.location;
       console.log("geocode response:", location);
    if (location && location.lat !== undefined && location.lng !== undefined) {
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } else {
      throw new Error("Invalid coordinates response");
    }
  } catch (error) {
    console.error(
      "Failed to get coordinates for address:",
      error.response?.data || error.message
    );
    throw new Error("Failed to get coordinates for address");
  }
}

};