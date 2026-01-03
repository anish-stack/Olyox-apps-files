const axios = require("axios");
const RidesSuggestionModel = require("../../models/Admin/RidesSuggestion.model");
const settings = require("../../models/Admin/Settings");

// In-memory caches
const directionsCache = new Map();
const weatherCache = new Map();
const surgeCache = new Map();

// DYNAMIC STATE-BASED DISCOUNTS CONFIGURATION
const STATE_BASED_DISCOUNTS = {
  "rajasthan": {
    "bike": 30,        // 30% off for bikes in Rajasthan
    "auto": 15,        // 15% off for autos
    "sedan": 20,       // 20% off for sedans
    "suv": 15,         // 15% off for SUVs
    "default": 10      // Default 10% for other vehicles
  },
  "jaipur": {
    "bike": 30,        // 30% off for bikes in Jaipur
    "auto": 15,        // 15% off for autos
    "sedan": 20,       // 20% off for sedans
    "suv": 15,         // 15% off for SUVs
    "default": 10      // Default 10% for other vehicles
  },
  "haryana": {
    "bike": 30,        // 30% off for bikes in Haryana
    "auto": 15,
    "sedan": 20,
    "suv": 15,
    "default": 10
  },
  "uttar_pradesh": {
    "bike": 25,
    "auto": 12,
    "sedan": 15,
    "suv": 12,
    "default": 8
  },
  "delhi": {
    "bike": 0,
    "auto": 0,
    "sedan": 0,
    "suv": 0,
    "default": 0
  },
  "uttar_pradesh": {
    "bike": 0,
    "auto": 0,
    "sedan": 0,
    "suv": 0,
    "default": 0
  },
  "default_state": {
    "bike": 0,
    "auto": 0,
    "sedan": 0,
    "suv": 0,
    "default": 0
  }
};

// Cache cleanup utility
const cleanupCache = (cache, maxAge = 900000) => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > maxAge) {
      cache.delete(key);
    }
  }
};

// Get discount percentage based on state and vehicle type
function getStateBasedDiscount(state, vehicleType) {
  const normalizedState = (state || "").toLowerCase().trim().replace(/\s+/g, "_");
  const normalizedVehicle = (vehicleType || "").toLowerCase().trim();

  const stateConfig = STATE_BASED_DISCOUNTS[normalizedState] || STATE_BASED_DISCOUNTS["default_state"];
  const discount = stateConfig[normalizedVehicle] || stateConfig["default"];

  return discount;
}

// Detect state from coordinates
function detectStateFromCoordinates(lat, lng) {
  // Delhi
  if (lat >= 28.404 && lat <= 28.8836 && lng >= 76.8388 && lng <= 77.3466) {
    return "delhi";
  }
  
  // Jaipur (specific coordinates)
  if (lat >= 26.8 && lat <= 27.2 && lng >= 75.7 && lng <= 75.9) {
    return "jaipur";
  }
  
  // Haryana (Gurgaon, Faridabad area)
  if (lat >= 27.5 && lat <= 29.5 && lng >= 75.5 && lng <= 77.5) {
    return "haryana";
  }
  
  // Rajasthan (broader Rajasthan area, excluding Jaipur)
  if (lat >= 26.5 && lat <= 28.9 && lng >= 75.0 && lng <= 77.5) {
    return "rajasthan";
  }
  
  // Uttar Pradesh
  if (lat >= 25.0 && lat <= 30.0 && lng >= 77.5 && lng <= 84.0) {
    return "uttar_pradesh";
  }

  return "default_state";
}

const JAIPUR_DIRECTION = {
  name: "Jaipur Route Discount",
  bounds: {
    minLat: 28.0,
    maxLat: 28.9,
    minLng: 76.5,
    maxLng: 77.3,
  },
  keyPoints: [
    { name: "Manesar", lat: 28.355, lng: 76.933 },
    { name: "Rewari", lat: 28.189, lng: 76.617 },
    { name: "Bawal", lat: 28.085, lng: 76.583 },
    { name: "Shahjahanpur", lat: 27.98, lng: 76.57 },
  ],
  discountPercent: 10,
};

function isJaipurRoute(origin, destination) {
  const destLat = destination.latitude;
  const destLng = destination.longitude;

  if (
    destLat >= JAIPUR_DIRECTION.bounds.minLat &&
    destLat <= JAIPUR_DIRECTION.bounds.maxLat &&
    destLng >= JAIPUR_DIRECTION.bounds.minLng &&
    destLng <= JAIPUR_DIRECTION.bounds.maxLng
  ) {
    if (destLng < origin.longitude - 0.1 || destLat < origin.latitude) {
      return true;
    }
  }

  for (const point of JAIPUR_DIRECTION.keyPoints) {
    const latDiff = Math.abs(destLat - point.lat);
    const lngDiff = Math.abs(destLng - point.lng);
    if (latDiff < 0.15 && lngDiff < 0.15) {
      return true;
    }
  }

  return false;
}

const SPECIAL_TOLLS = [
  {
    id: "dwarka_expressway",
    name: "Bijwasan Toll Plaza (Dwarka Expressway)",
    location: { lat: 28.53, lng: 77.04 },
    tollAmount: 320,
    radius: 0.02,
    description: "Dwarka Expressway connecting Gurgaon to Delhi",
    vehicleExemptions: ["bike"],
    priority: 1,
  },
  {
    id: "kundli_manesar_palwal",
    name: "KMP Expressway Toll",
    location: { lat: 28.88, lng: 77.12 },
    tollAmount: 250,
    radius: 0.015,
    description: "Kundli-Manesar-Palwal Expressway",
    vehicleExemptions: ["bike"],
    priority: 2,
  },
  {
    id: "yamuna_expressway",
    name: "Yamuna Expressway Toll Plaza",
    location: { lat: 28.45, lng: 77.52 },
    tollAmount: 400,
    radius: 0.02,
    description: "Greater Noida to Agra Expressway",
    vehicleExemptions: ["bike"],
    priority: 3,
  },
  {
    id: "eastern_peripheral",
    name: "Eastern Peripheral Expressway Toll",
    location: { lat: 28.71, lng: 77.45 },
    tollAmount: 180,
    radius: 0.015,
    description: "Eastern Peripheral connecting Kundli to Palwal",
    vehicleExemptions: ["bike"],
    priority: 4,
  },
  {
    id: "nh8_gurgaon",
    name: "NH-8 Gurgaon Toll Plaza",
    location: { lat: 28.46, lng: 77.02 },
    tollAmount: 150,
    radius: 0.012,
    description: "National Highway 8 Gurgaon Section",
    vehicleExemptions: ["bike"],
    priority: 5,
  },
];

const DWARKA_EXPRESSWAY_TOLL = {
  name: "Bijwasan Toll Plaza (Dwarka Expressway)",
  location: { lat: 28.53, lng: 77.04 },
  tollAmount: 320,
  radius: 0.02,
};

function checkDwarkaExpressway(origin, destination) {
  const { lat: tollLat, lng: tollLng } = DWARKA_EXPRESSWAY_TOLL.location;
  const { radius } = DWARKA_EXPRESSWAY_TOLL;

  const originNearToll =
    Math.abs(origin.latitude - tollLat) <= radius &&
    Math.abs(origin.longitude - tollLng) <= radius;

  const destNearToll =
    Math.abs(destination.latitude - tollLat) <= radius &&
    Math.abs(destination.longitude - tollLng) <= radius;

  const minLat = Math.min(origin.latitude, destination.latitude);
  const maxLat = Math.max(origin.latitude, destination.latitude);
  const minLng = Math.min(origin.longitude, destination.longitude);
  const maxLng = Math.max(origin.longitude, destination.longitude);

  const routeCrossesToll =
    minLat <= tollLat &&
    maxLat >= tollLat &&
    minLng <= tollLng &&
    maxLng >= tollLng;

  if (originNearToll || destNearToll || routeCrossesToll) {
    return true;
  }

  return false;
}

// Time-based utilities
const isNightTimeNow = (timezone = "Asia/Kolkata") => {
  try {
    const now = new Date();
    const currentHour = new Date(
      now.toLocaleString("en-US", { timeZone: timezone })
    ).getHours();
    return currentHour >= 22 || currentHour < 6;
  } catch (error) {
    const currentHour = new Date().getHours();
    return currentHour >= 22 || currentHour < 6;
  }
};

const isPeakHour = (timezone = "Asia/Kolkata") => {
  try {
    const now = new Date();
    const currentHour = new Date(
      now.toLocaleString("en-US", { timeZone: timezone })
    ).getHours();
    return (
      (currentHour >= 7 && currentHour <= 10) ||
      (currentHour >= 17 && currentHour <= 21)
    );
  } catch (error) {
    return false;
  }
};

// City boundary definitions
const CITY_BOUNDARIES = {
  delhi: {
    name: "Delhi",
    bounds: {
      minLat: 28.404,
      maxLat: 28.8836,
      minLng: 76.8388,
      maxLng: 77.3466,
    },
  },
  gurgaon: {
    name: "Gurgaon/Gurugram",
    bounds: {
      minLat: 28.4,
      maxLat: 28.55,
      minLng: 76.75,
      maxLng: 77.11,
    },
  },
  noida: {
    name: "Noida",
    bounds: {
      minLat: 28.47,
      maxLat: 28.64,
      minLng: 77.31,
      maxLng: 77.5,
    },
  },
  up: {
    name: "Uttar Pradesh (Other)",
    bounds: {
      minLat: 27.0,
      maxLat: 30.0,
      minLng: 77.5,
      maxLng: 84.0,
    },
  },
};

const CITY_BORDER_TOLLS = {
  gurgaon_to_delhi: {
    amount: 100,
    route: "Gurgaon → Delhi (Border Entry Toll)",
    type: "Border Entry Toll",
  },
  noida_to_delhi: {
    amount: 100,
    route: "Noida → Delhi (DND/Kalindi Toll)",
    type: "Border Entry Toll",
  },
  up_to_delhi: {
    amount: 100,
    route: "UP → Delhi (State Border Toll)",
    type: "Border Entry Toll",
  },
};

function isNearTollPlaza(point, tollLocation, radius) {
  return (
    Math.abs(point.latitude - tollLocation.lat) <= radius &&
    Math.abs(point.longitude - tollLocation.lng) <= radius
  );
}

function routeCrossesTollArea(origin, destination, tollLocation, radius) {
  const minLat = Math.min(origin.latitude, destination.latitude);
  const maxLat = Math.max(origin.latitude, destination.latitude);
  const minLng = Math.min(origin.longitude, origin.longitude);
  const maxLng = Math.max(destination.longitude, destination.longitude);

  const tollLat = tollLocation.lat;
  const tollLng = tollLocation.lng;

  return (
    minLat <= tollLat &&
    maxLat >= tollLat &&
    minLng <= tollLng &&
    maxLng >= tollLng
  );
}

function isVehicleExempt(vehicleName, exemptions) {
  if (!exemptions || exemptions.length === 0) return false;
  const normalizedVehicle = (vehicleName || "").toLowerCase().trim();
  return exemptions.some(
    (exempt) => exempt.toLowerCase() === normalizedVehicle
  );
}

function checkSpecialTolls(origin, destination, vehicleName = null) {
  const sortedTolls = [...SPECIAL_TOLLS].sort(
    (a, b) => a.priority - b.priority
  );

  for (const toll of sortedTolls) {
    const {
      location,
      radius,
      name,
      tollAmount,
      vehicleExemptions,
      description,
      id,
    } = toll;

    const originNearToll = isNearTollPlaza(origin, location, radius);
    const destNearToll = isNearTollPlaza(destination, location, radius);

    const routeCrosses = routeCrossesTollArea(
      origin,
      destination,
      location,
      radius
    );

    if (originNearToll || destNearToll || routeCrosses) {
      if (vehicleName && isVehicleExempt(vehicleName, vehicleExemptions)) {
        return {
          hasTolls: true,
          tollAmount: 0,
          isExempted: true,
          tollDetails: {
            id,
            route: name,
            origin: "Special Toll Route",
            destination: "Special Toll Route",
            tollType: "Expressway/Highway Toll",
            note: description,
            originalAmount: tollAmount,
            exemptionReason: `${vehicleName} vehicles are exempt`,
          },
        };
      }

      return {
        hasTolls: true,
        tollAmount: tollAmount,
        isExempted: false,
        tollDetails: {
          id,
          route: name,
          origin: "Special Toll Route",
          destination: "Special Toll Route",
          tollType: "Expressway/Highway Toll",
          note: description,
        },
      };
    }
  }

  return null;
}

// Detect city from coordinates (Priority-based detection)
function detectCity(lat, lng) {
  if (
    lat >= CITY_BOUNDARIES.gurgaon.bounds.minLat &&
    lat <= CITY_BOUNDARIES.gurgaon.bounds.maxLat &&
    lng >= CITY_BOUNDARIES.gurgaon.bounds.minLng &&
    lng <= CITY_BOUNDARIES.gurgaon.bounds.maxLng
  ) {
    return "gurgaon";
  }

  if (
    lat >= CITY_BOUNDARIES.noida.bounds.minLat &&
    lat <= CITY_BOUNDARIES.noida.bounds.maxLat &&
    lng >= CITY_BOUNDARIES.noida.bounds.minLng &&
    lng <= CITY_BOUNDARIES.noida.bounds.maxLng
  ) {
    return "noida";
  }

  if (
    lat >= CITY_BOUNDARIES.delhi.bounds.minLat &&
    lat <= CITY_BOUNDARIES.delhi.bounds.maxLat &&
    lng >= CITY_BOUNDARIES.delhi.bounds.minLng &&
    lng <= CITY_BOUNDARIES.delhi.bounds.maxLng
  ) {
    return "delhi";
  }

  if (
    lat >= CITY_BOUNDARIES.up.bounds.minLat &&
    lat <= CITY_BOUNDARIES.up.bounds.maxLat &&
    lng >= CITY_BOUNDARIES.up.bounds.minLng &&
    lng <= CITY_BOUNDARIES.up.bounds.maxLng
  ) {
    return "up";
  }

  return null;
}

function detectTollsForRoute(origin, destination, vehicleName = null) {
  const specialToll = checkSpecialTolls(origin, destination, vehicleName);

  if (specialToll) {
    return specialToll;
  }

  const originCity = detectCity(origin.latitude, origin.longitude);
  const destCity = detectCity(destination.latitude, destination.longitude);

  if (!originCity || !destCity) {
    return { hasTolls: false, tollAmount: 0, tollDetails: null };
  }

  if (originCity === destCity) {
    return { hasTolls: false, tollAmount: 0, tollDetails: null };
  }

  if (destCity === "delhi") {
    let tollAmount = 0;
    let routeDescription = "";

    if (originCity === "gurgaon") {
      tollAmount = 100;
      routeDescription = "Gurgaon → Delhi (Border Entry Toll)";
    } else if (originCity === "noida") {
      tollAmount = 100;
      routeDescription = "Noida → Delhi (DND/Kalindi Toll)";
    } else if (originCity === "up") {
      tollAmount = 100;
      routeDescription = "UP → Delhi (State Border Toll)";
    }

    if (tollAmount > 0) {
      return {
        hasTolls: true,
        tollAmount: tollAmount,
        tollDetails: {
          route: routeDescription,
          origin: CITY_BOUNDARIES[originCity].name,
          destination: CITY_BOUNDARIES[destCity].name,
          tollType: "Border Entry Toll",
        },
      };
    }
  }

  return { hasTolls: false, tollAmount: 0, tollDetails: null };
}

// Google Maps Directions API with caching
async function getDirectionsData(origin, destination, cacheKey) {
  try {
    cleanupCache(directionsCache);

    const cached = directionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 900000) {
      return cached.data;
    }

    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = `${destination.latitude},${destination.longitude}`;

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: originStr,
          destination: destinationStr,
          key:
            process.env.GOOGLE_MAPS_API_KEY ||
            "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8",
          traffic_model: "best_guess",
          departure_time: "now",
          units: "metric",
        },
        timeout: 15000,
      }
    );

    if (!response.data?.routes?.length) {
      throw new Error("No routes found");
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    if (!leg?.distance?.value || !leg?.duration?.value) {
      throw new Error("Invalid route data");
    }

    const standardizedData = {
      distance_km: leg.distance.value / 1000,
      duration_minutes: leg.duration.value / 60,
      traffic_duration_minutes:
        leg.duration_in_traffic?.value / 60 || leg.duration.value / 60,
      distance_text: leg.distance.text,
      duration_text: leg.duration.text,
      polyline: route.overview_polyline?.points || null,
    };

    directionsCache.set(cacheKey, {
      data: standardizedData,
      timestamp: Date.now(),
    });

    return standardizedData;
  } catch (error) {
    throw new Error(`Failed to fetch directions: ${error.message}`);
  }
}

// Weather condition check with caching
async function getWeatherCondition(latitude, longitude) {
  const cacheKey = `weather:${latitude},${longitude}`;

  try {
    cleanupCache(weatherCache, 600000);

    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 600000) {
      return cached.data;
    }

    const apiKey = process.env.OPEN_WEATHER_API_KEY;
    if (!apiKey) {
      return { isRaining: false, condition: "unknown" };
    }

    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat: latitude,
          lon: longitude,
          appid: apiKey,
          units: "metric",
        },
        timeout: 5000,
      }
    );

    const weatherMain = weatherResponse.data?.weather?.[0]?.main || "Clear";
    const weatherData = {
      isRaining: weatherMain === "Rain",
      condition: weatherMain,
      temperature: weatherResponse.data?.main?.temp || null,
    };

    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now(),
    });

    return weatherData;
  } catch (error) {
    return { isRaining: false, condition: "unknown" };
  }
}

// Dynamic Surge Pricing Calculator
function calculateSurgeMultiplier(options = {}) {
  const {
    isPeakHour = false,
    isNightTime = false,
    isRaining = false,
    distance_km = 0,
    demandLevel = "normal",
  } = options;

  let surgeMultiplier = 1.0;

  if (isPeakHour) {
    surgeMultiplier += 0.3;
  }

  if (isNightTime) {
    surgeMultiplier += 0.25;
  }

  if (isRaining) {
    surgeMultiplier += 0.2;
  }

  const demandMultipliers = {
    low: 0,
    normal: 0,
    high: 0.4,
    very_high: 0.8,
  };
  surgeMultiplier += demandMultipliers[demandLevel] || 0;

  if (distance_km > 50) {
    surgeMultiplier -= 0.1;
  }

  surgeMultiplier = Math.max(1.0, Math.min(3.0, surgeMultiplier));

  return parseFloat(surgeMultiplier.toFixed(2));
}

// Calculate fuel surcharge dynamically
function calculateFuelSurcharge(distance_km, vehicle) {
  const { avgMileage, fuelSurchargePerKM } = vehicle;
  const fuelConsumed = distance_km / avgMileage;
  const fuelSurcharge = fuelConsumed * fuelSurchargePerKM;

  return Math.round(fuelSurcharge * 100) / 100;
}

function calculateTollCharges(distance_km, vehicle, tollInfo) {
  const vehicleName = (vehicle.name || "").toLowerCase().trim();
  if (vehicleName === "bike") {
    return 0;
  }

  if (tollInfo.hasTolls && tollInfo.tollAmount > 0) {
    return tollInfo.tollAmount;
  }

  if (vehicle.tollExtra && distance_km > 50 && !tollInfo.hasTolls) {
    const fallbackToll = Math.min(200, 50 + (distance_km - 50) * 2);
    return fallbackToll;
  }

  return 0;
}

// Main pricing calculation for regular vehicles
function calculateVehiclePrice(
  vehicle,
  routeData,
  conditions,
  tollInfo,
  origin,
  destination,
  stateInfo
) {
  const {
    distance_km,
    traffic_duration_minutes,
    waitingTimeInMinutes = 0,
  } = routeData;

  const { isNightTime, isRaining, isPeakHour, demandLevel } = conditions;

  const {
    baseFare = 0,
    baseKM = 0,
    perKM = 0,
    perMin = 0,
    waitingChargePerMin = 0,
    nightPercent = 0,
    minFare = 0,
  } = vehicle;

  const chargeableDistance = Math.max(0, distance_km - baseKM);
  const distanceCost = chargeableDistance * perKM;
  const timeCost = traffic_duration_minutes * perMin;
  const waitingTimeCost = waitingTimeInMinutes * waitingChargePerMin;
  const nightSurcharge = isNightTime
    ? ((baseFare + distanceCost) * nightPercent) / 100
    : 0;

  const fuelSurcharge = calculateFuelSurcharge(distance_km, vehicle);
  const tollCharges = calculateTollCharges(distance_km, vehicle, tollInfo);

  const surgeMultiplier = calculateSurgeMultiplier({
    isPeakHour,
    isNightTime,
    isRaining,
    distance_km,
    demandLevel,
  });

  let basePrice =
    baseFare +
    distanceCost +
    timeCost +
    waitingTimeCost +
    nightSurcharge +
    fuelSurcharge;

  let totalPrice = basePrice * surgeMultiplier;
  totalPrice += tollCharges;

  // JAIPUR ROUTE DISCOUNT
  let jaipurDiscount = 0;
  if (
    origin &&
    destination &&
    distance_km > 69 &&
    isJaipurRoute(origin, destination)
  ) {
    jaipurDiscount = totalPrice * (JAIPUR_DIRECTION.discountPercent / 100);
    totalPrice -= jaipurDiscount;
  }

  // STATE-BASED DYNAMIC DISCOUNT
  let stateBasedDiscount = 0;
  const vehicleType = (vehicle.name || "").toLowerCase().trim();
  const discountPercentage = getStateBasedDiscount(stateInfo.state, vehicleType);

  if (discountPercentage > 0) {
    // Apply state discount on the fare after surge but before min fare
    stateBasedDiscount = totalPrice * (discountPercentage / 100);
    totalPrice -= stateBasedDiscount;
  }

  totalPrice = Math.max(totalPrice, minFare);

  return {
    vehicleId: vehicle._id.toString(),
    vehicleName: vehicle.name || "Unknown Vehicle",
    vehicleType: vehicle.vehicleType || vehicle.type,
    vehicleImage: vehicle.icons_image?.url || null,
    totalPrice: Math.round(totalPrice * 100) / 100,
    distanceInKm: Math.round(distance_km * 100) / 100,
    durationInMinutes: Math.round(traffic_duration_minutes * 100) / 100,
    surgeMultiplier,
    jaipurDiscount: Math.round(jaipurDiscount * 100) / 100,
    stateBasedDiscount: Math.round(stateBasedDiscount * 100) / 100,
    pricing: {
      baseFare: Math.round(baseFare * 100) / 100,
      distanceCost: Math.round(distanceCost * 100) / 100,
      timeCost: Math.round(timeCost * 100) / 100,
      waitingTimeCost: Math.round(waitingTimeCost * 100) / 100,
      nightSurcharge: Math.round(nightSurcharge * 100) / 100,
      fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
      tollCharges: Math.round(tollCharges * 100) / 100,
      surgeAmount: Math.round(basePrice * (surgeMultiplier - 1) * 100) / 100,
      jaipurDiscount: Math.round(jaipurDiscount * 100) / 100,
      stateBasedDiscount: Math.round(stateBasedDiscount * 100) / 100,
      priceBeforeSurge: Math.round(basePrice * 100) / 100,
    },
    conditions: {
      isNightTime,
      isRaining,
      isPeakHour,
      demandLevel,
      baseKmIncluded: baseKM,
      chargeableDistance: Math.round(chargeableDistance * 100) / 100,
      avgMileage: vehicle.avgMileage,
      hasTolls: tollInfo.hasTolls,
      tollDetails: tollInfo.tollDetails,
      jaipurRoute: distance_km > 69 && isJaipurRoute(origin, destination),
      state: stateInfo.state,
      stateDiscountPercentage: discountPercentage,
    },
    isRental: false,
  };
}

async function calculateRentalPrices(
  distance_km,
  traffic_duration_minutes,
  conditions,
  origin,
  destination,
  stateInfo
) {
  try {
    const rentalSettings = await settings.findOne().select("rental");

    if (!rentalSettings || !rentalSettings.rental) {
      return [];
    }

    const tollInfo = detectTollsForRoute(origin, destination);
    const tollCharges = tollInfo.hasTolls ? tollInfo.tollAmount : 0;

    const rentalVehicles = [];
    const vehicleTypes = ["mini", "sedan", "suv"];

    for (const vehicleType of vehicleTypes) {
      const rentalConfig = rentalSettings.rental[vehicleType];
      if (!rentalConfig || !rentalConfig.isAvailable) continue;

      const {
        baseKmPrice = 0,
        pricePerKm = 0,
        pricePerMin = 0,
        vehicleImage = "",
        baseFare = 0,
        fixedKmforBaseFare = 0,
        showingName = vehicleType.toUpperCase(),
        isAvailable,
      } = rentalConfig;

      const effectiveMinutes = Math.max(traffic_duration_minutes, 60);
      const extraKm = Math.max(0, distance_km - fixedKmforBaseFare);

      const extraKmCost = extraKm * pricePerKm;
      const timeCost = effectiveMinutes * pricePerMin;

      let totalPrice = baseFare + extraKmCost + timeCost;
      const rentalSurge = conditions.isPeakHour ? 1.15 : 1.0;
      totalPrice *= rentalSurge;
      totalPrice += tollCharges;

      // RENTAL STATE-BASED DISCOUNT
      let rentalStateDiscount = 0;
      const rentalDiscountPercentage = getStateBasedDiscount(stateInfo.state, vehicleType);

      if (rentalDiscountPercentage > 0) {
        rentalStateDiscount = totalPrice * (rentalDiscountPercentage / 100);
        totalPrice -= rentalStateDiscount;
      }

      rentalVehicles.push({
        vehicleType: showingName,
        vehicleName: vehicleType.toUpperCase(),
        vehicleImage,
        totalPrice: Math.round(totalPrice * 100) / 100,
        distanceInKm: Math.round(distance_km * 100) / 100,
        durationInMinutes: Math.round(effectiveMinutes * 100) / 100,
        surgeMultiplier: rentalSurge,
        stateBasedDiscount: Math.round(rentalStateDiscount * 100) / 100,
        pricing: {
          baseFare: Math.round(baseFare * 100) / 100,
          baseKmIncluded: fixedKmforBaseFare,
          extraKm: Math.round(extraKm * 100) / 100,
          extraKmCost: Math.round(extraKmCost * 100) / 100,
          timeCost: Math.round(timeCost * 100) / 100,
          pricePerKm: Math.round(pricePerKm * 100) / 100,
          pricePerMin: Math.round(pricePerMin * 100) / 100,
          tollCharges: Math.round(tollCharges * 100) / 100,
          stateBasedDiscount: Math.round(rentalStateDiscount * 100) / 100,
          surgeAmount:
            Math.round(
              (totalPrice - tollCharges - (baseFare + extraKmCost + timeCost) - rentalStateDiscount) *
                100
            ) / 100,
        },
        isRental: true,
        isAvailable,
        tollInfo: tollInfo.hasTolls
          ? {
              hasTolls: true,
              tollAmount: tollCharges,
              route: tollInfo.tollDetails?.route || "Auto-detected toll",
            }
          : { hasTolls: false },
        conditions: {
          state: stateInfo.state,
          stateDiscountPercentage: rentalDiscountPercentage,
        },
      });
    }

    rentalVehicles.sort((a, b) => a.totalPrice - b.totalPrice);
    return rentalVehicles;
  } catch (error) {
    return [];
  }
}

// Main API endpoint
exports.calculateRidePriceForUser = async (req, res) => {
  const startTime = performance.now();

  try {
    const {
      origin,
      destination,
      isLater = false,
      waitingTimeInMinutes = 0,
      vehicleIds = [],
      isNightTime,
      timezone = "Asia/Kolkata",
      demandLevel = "normal",
    } = req.body;

    // STEP 1: Input Validation
    if (
      !origin?.latitude ||
      !origin?.longitude ||
      !destination?.latitude ||
      !destination?.longitude
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid origin or destination coordinates",
        executionTime: `${((performance.now() - startTime) / 1000).toFixed(
          3
        )}s`,
      });
    }

    if (
      Math.abs(origin.latitude) > 90 ||
      Math.abs(origin.longitude) > 180 ||
      Math.abs(destination.latitude) > 90 ||
      Math.abs(destination.longitude) > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinate ranges",
        executionTime: `${((performance.now() - startTime) / 1000).toFixed(
          3
        )}s`,
      });
    }

    // STEP 2: Detect State for Dynamic Discount
    const originState = detectStateFromCoordinates(origin.latitude, origin.longitude);
    const destState = detectStateFromCoordinates(destination.latitude, destination.longitude);
    const stateInfo = {
      originState,
      destState,
      state: destState || originState || "default_state", // Primary state for discount
    };

    // STEP 3: Route & Toll Detection
    const tollInfo = detectTollsForRoute(origin, destination);

    const actualIsNightTime =
      isNightTime !== undefined ? isNightTime : isNightTimeNow(timezone);
    const actualIsPeakHour = isPeakHour(timezone);

    const directionsCacheKey = `directions:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`;
    const directionsData = await getDirectionsData(
      origin,
      destination,
      directionsCacheKey
    );

    let weatherData = { isRaining: false, condition: "unknown" };
    try {
      weatherData = await Promise.race([
        getWeatherCondition(origin.latitude, origin.longitude),
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ isRaining: false, condition: "timeout" }),
            3000
          )
        ),
      ]);
    } catch (error) {
      // Weather check failed
    }

    const { distance_km, traffic_duration_minutes } = directionsData;

    if (distance_km <= 0 || traffic_duration_minutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid route data: distance or duration is zero or negative",
        executionTime: `${((performance.now() - startTime) / 1000).toFixed(
          3
        )}s`,
      });
    }

    // STEP 4: Ride Type Classification
    const isIntercityRide = distance_km > 69;
    const shouldCalculateRentals = distance_km < 69 && !isLater;

    // STEP 5: Fetch All Vehicles
    let vehicleQuery = { status: true };

    if (vehicleIds.length > 0) {
      vehicleQuery._id = { $in: vehicleIds };
    }

    const allVehicles = await RidesSuggestionModel.find(vehicleQuery);

    if (allVehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          vehicleIds.length > 0
            ? "No active vehicles found for the specified vehicle IDs"
            : "No active vehicles found",
        executionTime: `${((performance.now() - startTime) / 1000).toFixed(
          3
        )}s`,
      });
    }

    // STEP 6: Filter Vehicles (Bike & Auto Logic)
    const filteredVehicles = [];
    const excludedVehicles = [];

    for (const vehicle of allVehicles) {
      const vehicleName = (vehicle.name || "").toLowerCase().trim();
      let shouldExclude = false;
      let exclusionReasons = [];

      // BIKE SPECIAL RULES
      if (vehicleName === "bike") {
        if (distance_km > 50) {
          shouldExclude = true;
          exclusionReasons.push(
            `distance exceeds 50 km (${distance_km.toFixed(2)} km)`
          );
        }

        if (isLater) {
          shouldExclude = true;
          exclusionReasons.push("scheduled for later");
        }

        if (shouldExclude) {
          excludedVehicles.push({
            name: vehicle.name,
            id: vehicle._id,
            reasons: exclusionReasons,
          });
        } else {
          filteredVehicles.push(vehicle);
        }
        continue;
      }

      // AUTO SPECIAL RULES
      if (vehicleName === "auto") {
        const originCity = detectCity(origin.latitude, origin.longitude);
        const destCity = detectCity(
          destination.latitude,
          destination.longitude
        );

        if (distance_km > 50) {
          shouldExclude = true;
          exclusionReasons.push(
            `distance exceeds 50 km (${distance_km.toFixed(2)} km)`
          );
        }

        if (isLater) {
          shouldExclude = true;
          exclusionReasons.push("scheduled for later");
        }

        if (originCity && destCity && originCity !== destCity) {
          shouldExclude = true;
          const boundaryInfo = `${
            CITY_BOUNDARIES[originCity]?.name || originCity
          } → ${CITY_BOUNDARIES[destCity]?.name || destCity}`;
          exclusionReasons.push(`cannot cross city boundary (${boundaryInfo})`);
        }

        if (!originCity || !destCity) {
          shouldExclude = true;
          exclusionReasons.push("location outside service area");
        }

        if (shouldExclude) {
          excludedVehicles.push({
            name: vehicle.name,
            id: vehicle._id,
            reasons: exclusionReasons,
          });
        } else {
          filteredVehicles.push(vehicle);
        }
        continue;
      }

      // OTHER VEHICLES - Always included
      filteredVehicles.push(vehicle);
    }

    if (filteredVehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vehicles available for this route",
        rideType: isIntercityRide ? "intercity" : "local",
        isLaterRide: isLater,
        distanceKm: Math.round(distance_km * 100) / 100,
        excludedVehicles: excludedVehicles.map((ev) => ({
          name: ev.name,
          reasons: ev.reasons,
        })),
        executionTime: `${((performance.now() - startTime) / 1000).toFixed(
          3
        )}s`,
      });
    }

    // STEP 7: Prepare Conditions
    const conditions = {
      isNightTime: actualIsNightTime,
      isRaining: weatherData.isRaining,
      isPeakHour: actualIsPeakHour,
      demandLevel,
    };

    const routeData = {
      distance_km,
      traffic_duration_minutes,
      waitingTimeInMinutes,
    };

    // STEP 8: Calculate Prices for Regular Vehicles
    const vehiclePrices = filteredVehicles.map((vehicle) => {
      const vehicleName = (vehicle.name || "").toLowerCase().trim();
      const vehicleTollInfo =
        vehicleName === "bike"
          ? { hasTolls: false, tollAmount: 0, tollDetails: null }
          : tollInfo;

      return calculateVehiclePrice(
        vehicle,
        routeData,
        conditions,
        vehicleTollInfo,
        origin,
        destination,
        stateInfo
      );
    });

    vehiclePrices.sort((a, b) => a.totalPrice - b.totalPrice);

    // STEP 9: Calculate Rental Prices (if applicable)
    let rentalVehiclePrices = [];
    if (shouldCalculateRentals) {
      rentalVehiclePrices = await calculateRentalPrices(
        distance_km,
        traffic_duration_minutes,
        conditions,
        origin,
        destination,
        stateInfo
      );
    }

    // STEP 10: Prepare Response
    const executionTime = `${((performance.now() - startTime) / 1000).toFixed(
      3
    )}s`;

    const response = {
      success: true,
      message: "Ride prices calculated successfully",
      rideType: isIntercityRide ? "intercity" : "local",
      routeInfo: {
        distanceInKm: Math.round(distance_km * 100) / 100,
        durationInMinutes: Math.round(traffic_duration_minutes * 100) / 100,
        distanceText: directionsData.distance_text,
        durationText: directionsData.duration_text,
        isIntercityRide,
        isLaterRide: isLater,
        tollInfo: tollInfo.hasTolls
          ? {
              hasTolls: true,
              tollAmount: tollInfo.tollAmount,
              route: tollInfo.tollDetails?.route || "Auto-detected toll route",
              note: "Bikes are exempt from all toll charges",
            }
          : { hasTolls: false },
        stateInfo: {
          originState: stateInfo.originState,
          destState: stateInfo.destState,
          primaryStateForDiscount: stateInfo.state,
        },
        conditions: {
          ...conditions,
          weatherCondition: weatherData.condition,
          timeDetection: isNightTime !== undefined ? "manual" : "auto-detected",
        },
      },
      vehiclePrices,
      executionTime,
    };

    if (rentalVehiclePrices.length > 0) {
      response.rentalVehiclePrices = rentalVehiclePrices;
      response.message =
        "Ride prices calculated successfully (including rental options)";
    }

    if (excludedVehicles.length > 0) {
      response.vehicleExclusion = {
        totalExcluded: excludedVehicles.length,
        excluded: excludedVehicles.map((ev) => ({
          vehicleName: ev.name,
          reasons: ev.reasons,
        })),
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    const executionTime = `${((performance.now() - startTime) / 1000).toFixed(
      3
    )}s`;

    return res.status(500).json({
      success: false,
      message: "Failed to calculate the ride price",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      executionTime,
    });
  }
};

// Recalculate rental prices with additional hours
exports.reCalculatePriceForOnlyRentals = async (req, res) => {
  const startTime = performance.now();

  try {
    const {
      rentalType,
      originalHours,
      additionalHours,
      originalDistanceKm,
      currentFare = 0,
    } = req.body;

    const origHrs = parseFloat(originalHours);
    const addHrs = parseFloat(additionalHours);
    const origDist = parseFloat(originalDistanceKm);
    const currFare = parseFloat(currentFare);

    if (
      isNaN(origHrs) ||
      isNaN(addHrs) ||
      isNaN(origDist) ||
      origHrs < 0 ||
      origDist < 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid numeric values" });
    }

    const rentalSettings = await settings.findOne().select("rental");
    const config = rentalSettings?.rental?.[rentalType];
    if (!config || !config.isAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Rental type unavailable" });
    }

    const { pricePerMin, pricePerKm } = config;

    let totalHours = origHrs + addHrs;
    let estimatedDistanceKm = origDist;
    let additionalTimeCost = 0;
    let additionalDistanceCost = 0;
    let totalFare = currFare;

    if (origHrs === 1 && addHrs === 1) {
      estimatedDistanceKm += 15;
      totalHours = origHrs;
      totalFare = currFare;
    } else if (addHrs > 0) {
      const additionalMinutes = addHrs * 60;
      additionalTimeCost = additionalMinutes * pricePerMin;

      const extraHoursAfterFirst = Math.max(totalHours - 1, 0);
      const additionalDistance = extraHoursAfterFirst * 15;
      estimatedDistanceKm = origDist + additionalDistance;
      additionalDistanceCost = additionalDistance * pricePerKm;

      totalFare = currFare + additionalTimeCost + additionalDistanceCost;
    }

    const response = {
      success: true,
      additional: {
        originalHours: parseFloat(origHrs.toFixed(2)),
        additionalHours: parseFloat(addHrs.toFixed(2)),
        currentDistanceKm: parseFloat(origDist.toFixed(2)),
        totalHours: parseFloat(totalHours.toFixed(2)),
        estimatedDistanceKm: parseFloat(estimatedDistanceKm.toFixed(2)),
        currentFare: parseFloat(currFare.toFixed(2)),
        additionalTimeCost: parseFloat(additionalTimeCost.toFixed(2)),
        additionalDistanceCost: parseFloat(additionalDistanceCost.toFixed(2)),
        totalFare: parseFloat(totalFare.toFixed(2)),
      },
      executionTime: `${((performance.now() - startTime) / 1000).toFixed(3)}s`,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || error,
      executionTime: `${((performance.now() - startTime) / 1000).toFixed(3)}s`,
    });
  }
};