import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, AppState, NativeModules, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import messaging from '@react-native-firebase/messaging';
import BottomTab from '../components/common/BottomTab';
import HomeMap from '../components/Home_Map/HomeMap';
import RideScreen from '../components/RideScreen/RideScreen';
import useRideStore from '../../Store/PoolingStore';
import useUserStore from '../../Store/useUserStore';
import axiosInstance from '../../constant/axios';
import { API_URL_APP } from '../../constant/api';

const { FloatingWidget, PlayerModule, RideModule } = NativeModules;


const HomePage = () => {
  const navigation = useNavigation();

  const { isPooling, startPooling, stopPooling } = useRideStore();
  const { user, free_for_ride } = useUserStore();

  // console.log("navigation",)


  // ──────────────────────── State ────────────────────────
  const [rides, setRides] = useState(new Map());
  const [rideIdsSet, setRideIdsSet] = useState(new Set());
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // ──────────────────────── Refs ────────────────────────
  const isMountedRef = useRef(true);
  const appStateRef = useRef(AppState.currentState);
  const isPollingInFlightRef = useRef(false);
  const timerIdRef = useRef(null);
  const processedNotifIdsRef = useRef(new Set());
  const lastFetchTimeRef = useRef(0);

  const ridesArray = Array.from(rides.values());

  // ──────────────────────── Haptics ────────────────────────
  const triggerHapticFeedback = (type = 'medium') => {
    const style =
      type === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : type === 'light'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium;
    Haptics.impactAsync(style).catch(() => { });
  };

  // ──────────────────────── Direct PlayerModule Calls ────────────────────────
const playSound = () => {
  if (Platform.OS !== "android" || !PlayerModule) {
    console.log("Sound not supported on this platform");
    return;
  }

  PlayerModule.playSound("sound")
    .then(() => console.log("Sound played"))
    .catch(err => console.error("playSound error:", err));
};

const stopSound = () => {
  if (Platform.OS !== "android" || !PlayerModule) {
    console.log("stopSound skipped: iOS or module missing");
    return;
  }

  PlayerModule.stopSound()
    .then(() => console.log("Sound stopped"))
    .catch(err => console.error("stopSound error:", err));
};
  // ──────────────────────── Normalize Ride ────────────────────────
  const normalizeRideFromNotification = (data) => {
    const toNumber = v => {
      const n = Number.parseFloat(String(v));
      return Number.isFinite(n) ? n : undefined;
    };

    return {
      _id: data?.rideId ?? String(Date.now()),
      vehicle_type: data?.vehicleType ?? data?.vehicle_type ?? 'bike',
      pickup_address: data?.pickup ?? '',
      pickup_corrdinates: data?.pickup_corrdinates ?? '',
      drop_address: data?.drop ?? '',
      distance: toNumber(data?.distance),
      total_fare: toNumber(data?.price) || toNumber(data?.pricing) || 0,
      isRental: data?.isRental === true || data?.isRental === 'true',
      isLater: data?.isLater === true || data?.isLater === 'true',
      isIntercity: data?.isIntercity === true || data?.isIntercity === 'true',
      rentalHours: Number(data?.rentalHours) || 0,
      rental_km_limit: Number(data?.rental_km_limit) || 0,
      distance_from_pickup_km: toNumber(data?.distance_from_pickup_km),
      timestamp: new Date().toISOString(),
      source: 'fcm',
    };
  };

 useEffect(() => {
  if (Platform.OS === 'android') {
    if (user?._id) {
      const isAvailable = user.isAvailable ? true : false;
      RideModule.startPoolingService(isAvailable, user._id, API_URL_APP)
        .then(res => console.log("From Background:", res))
        .catch(err => console.error("RideModule error:", err));
    } else {
      console.log("RideModule not started: user not available");
    }
  } else {
    console.log("RideModule only works on Android");
  }
}, [user?.isAvailable, user?._id]);
  // ──────────────────────── API Polling ────────────────────────
  const fetchPoolingRides = async (riderId) => {
        console.log("Pool aaya",riderId)

    if (!riderId || isPollingInFlightRef.current) return;
    console.log("Pool hu")
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 800) return;
    lastFetchTimeRef.current = now;

    isPollingInFlightRef.current = true;

    try {
      const { data } = await axiosInstance.get(
        `/api/v1/new/pooling-rides-for-rider/${riderId}`
      );

      const ridesData = data?.data || [];
      if (ridesData.length && isMountedRef.current) {
        const ridesMap = new Map(rides);
        const newRides = [];
        console.log("ridesData ffill",ridesData)

        ridesData.forEach((ride) => {
          if (ridesMap.has(ride._id) || rideIdsSet.has(ride._id)) return;

          const riderInfo = Array.isArray(ride.notified_riders)
            ? ride.notified_riders.find((n) => n.rider_id === riderId)
            : ride.notified_rider || null;

          const filteredRide = {
            _id: ride._id,
            pickup_address: ride.pickup_address?.formatted_address || ride.pickup_address || null,
            drop_address: ride.drop_address?.formatted_address || ride.drop_address || null,
            vehicle_type: ride.vehicle_type,
            ride_status: ride.ride_status,
            isLater: ride.isLater || false,
            pickup_coordinates: ride.pickup_coordinates?.coordinates || ride.pickup_coordinates || null,
            isIntercity: ride.isIntercity || false,
            isParcelOrder: ride.isParcelOrder,
            isRental: ride.isRental || false,
            rentalHours: ride.rentalHours || 0,
            rental_km_limit: ride.estimatedKm || ride.rental_km_limit || 0,
            total_fare: ride.pricing?.total_fare || ride.total_fare || null,
            distance: ride.route_info?.distance || ride.distance || null,
            distance_from_pickup_km: riderInfo?.distance_from_pickup_km || null,
            notified_rider: riderInfo
              ? {
                distance_from_pickup: riderInfo.distance_from_pickup,
                distance_from_pickup_km: riderInfo.distance_from_pickup_km,
              }
              : null,
            timestamp: new Date().toISOString(),
            source: "pooling_api",
          };

          ridesMap.set(ride._id, filteredRide);
          newRides.push(filteredRide);
        });

        if (newRides.length) {
          console.log(`${newRides.length} new rides added`);
          setRides(ridesMap);
          setRideIdsSet((prev) => {
            const s = new Set(prev);
            newRides.forEach((r) => s.add(r._id));
            return s;
          });
        }
      }
    } catch (e) {
      console.error("fetchPoolingRides error:", e);
    } finally {
      isPollingInFlightRef.current = false;
    }
  };

  // ──────────────────────── FCM ────────────────────────
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      const data = remoteMessage?.data;
      if (!data) return;

      const channelId = remoteMessage?.notification?.android?.channelId;
      const dedupeKey =
        data?.notificationId ||
        data?.messageId ||
        (data?.rideId ? `ride:${data.rideId}` : null);

      if (dedupeKey && processedNotifIdsRef.current.has(dedupeKey)) return;
      if (dedupeKey) {
        processedNotifIdsRef.current.add(dedupeKey);
        setTimeout(() => processedNotifIdsRef.current.delete(dedupeKey), 60_000);
      }

      // Cancel
      if (channelId === 'ride_cancel_channel' || data?.type === 'ride_cancelled') {
        console.log('Ride cancelled via FCM');
        setRides(new Map());
        setRideIdsSet(new Set());
        stopSound();               // Direct call
        return;
      }

      // New ride
      if (data?.type === 'ride_request' || data?.eventType === 'NEW_RIDE') {
        const ride = normalizeRideFromNotification(data);
        if (rideIdsSet.has(ride._id)) return;

        setRides(prev => {
          const m = new Map(prev);
          m.set(ride._id, ride);
          return m;
        });
        setRideIdsSet(prev => new Set([...prev, ride._id]));

        triggerHapticFeedback('heavy');
        // playSound();               // Direct call
      }
    });

    // Background handler (widget)
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      const d = remoteMessage?.data || {};
      const {
        event,
        vehicleType,
        pickup,
        drop,
        price,
        rideId,
        distance_from_pickup_km,
        distance,
        token,
      } = d;

      if (
        event !== 'NEW_RIDE' ||
        !rideId ||
        !pickup ||
        !drop ||
        !vehicleType ||
        !price
      )
        return;

   if(Platform.OS ==="android"){
       await FloatingWidget?.startWidgetWithData({
        vehicleType,
        pickup,
        drop,
        price: price ? `₹${price}` : '',
        rideId,
        distance_from_pickup: `${distance_from_pickup_km || '0'} KM`,
        dropDistance: `${distance || '0'} KM`,
        acceptUrl: `https://www.appv2.olyox.com/api/v1/new/ride-action-reject-accepet-via/${rideId}/${token}/accept`,
        rejectUrl: `https://www.appv2.olyox.com/api/v1/new/ride-action-reject-accepet-via/${rideId}/${token}/reject`,
        playSound: true,
      });
   }

      // Also play from JS (optional)
      // playSound();
    });

    return unsubscribe;
  }, [rideIdsSet]);

// ──────────────────────── Polling ────────────────────────
useEffect(() => {
  console.log("🔄 Polling useEffect triggered");
  console.log("🧠 Dependencies:", {
    user_id: user?._id,
    isAvailable: user?.isAvailable,
    on_ride_id: user?.on_ride_id,
    free_for_ride,
    isProcessingAction,
    isPooling,
    appState: appStateRef.current,
  });

  const shouldPoll =
    user?._id &&
    free_for_ride &&
    user?.isAvailable &&
    !user?.on_ride_id &&
    !isProcessingAction &&
    appStateRef.current === "active";

  console.log("📊 shouldPoll:", shouldPoll);

  if (shouldPoll) {
    console.log("✅ Polling conditions met.");

    if (!isPooling) {
      console.log("🚀 Starting pooling...");
      startPooling(user._id);
    } else {
      console.log("ℹ️ Pooling already active.");
    }

    console.log("📡 Fetching pooling rides immediately...");
    fetchPoolingRides(user._id);

    if (!timerIdRef.current) {
      console.log("🕒 Starting new polling interval (1000ms)");
      timerIdRef.current = setInterval(() => {
        if (isMountedRef.current && !isPollingInFlightRef.current) {
          console.log("🔁 Interval tick → fetchPoolingRides");
          fetchPoolingRides(user._id);
        } else {
          console.log("⏸️ Skipping fetch (unmounted or in flight)");
        }
      }, 1000);
    } else {
      console.log("⚠️ Timer already running, skipping new interval.");
    }
  } else {
    console.log("❌ Polling conditions NOT met → stopping.");

    if (isPooling) {
      console.log("🛑 Stopping pooling...");
      stopPooling();
    }

    if (timerIdRef.current) {
      console.log("🧹 Clearing polling interval...");
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    } else {
      console.log("ℹ️ No active interval to clear.");
    }
  }

  return () => {
    console.log("🧽 Cleanup: clearing interval if exists");
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  };
}, [
  user?._id,
  user?.isAvailable,
  user?.on_ride_id,
  free_for_ride,
  isProcessingAction,
  isPooling,
]);


  // ──────────────────────── App State ────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active') {
        if (user?._id && user?.isAvailable && !user?.on_ride_id) {
          fetchPoolingRides(user._id);
        }
      }
    });
    return () => sub.remove();
  }, [user?._id, user?.isAvailable, user?.on_ride_id]);

  // ──────────────────────── Sound when rides change ────────────────────────
  useEffect(() => {
    if (ridesArray.length > 0) {
      // playSound();               // Direct call
    } else {
      stopSound();               // Direct call
    }
  }, [ridesArray.length]);

  // ──────────────────────── Cleanup ────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      stopSound();               // Direct call
    };
  }, []);

  const isShow = ridesArray.length > 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flex: 1 }}>
        <HomeMap />
      </ScrollView>

      <BottomTab navigation={navigation} showDetails={true} />

      <RideScreen
        id={user?._id}
        isShow={isShow}
        ridesData={ridesArray}
        stopSound={stopSound}
        clearRides={() => {
          setRides(new Map());
          setRideIdsSet(new Set());
          stopSound();           // Direct call
        }}
      />
    </SafeAreaView>
  );
};

export default HomePage;