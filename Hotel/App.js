import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as Notifications from "expo-notifications";

import { TokenProvider, useToken } from "./context/AuthContext";
import {
  AppPermissionProvider,
  useAppPermissions,
} from "./context/AppPermissionContext";

/* Screens */
import Home from "./screens/Home/Home";
import Onboarding from "./screens/Onboarding/Onboarding";
import BhVerification from "./screens/Register/BhVerification";
import RegisterViaBh from "./screens/Register/RegisterViaBh";
import BhOtpVerification from "./screens/Register/BhOtpVerification";
import Hotel_List from "./screens/Hotel_List/Hotel_List";
import VerifyOtp from "./screens/Hotel_List/VerifyOtp";
import HotelListingForm from "./screens/HotelListingForm/HotelListingForm";
import Login from "./screens/Login/Login";
import AllRoom from "./screens/Room/AllRoom";
import SingleDetailsPage from "./screens/Room/SingleDetailsPage";
import Booking_create from "./screens/Booking_create/Booking_create";
import AllBookings from "./screens/AllBookings/AllBookings";
import AllGuests from "./screens/Guests/AllGuests";
import Profile from "./screens/Profile/Profile";
import Upload_Documents from "./screens/Profile/Upload_Documents";
import Recharge from "./screens/Recharge/Recharge";
import RechargeHistoryTiffin from "./screens/Recharge/RechargeHistory";
import ReferralHistory from "./screens/Refferal/ReferalHistory";
import { Withdraw } from "./screens/Recharge/Withdraw";

const Stack = createNativeStackNavigator();

/* 🔔 Notification Handler */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


/* ============================= */
/* 🚦 NAVIGATOR */
/* ============================= */
const AppNavigator = () => {
  const { isLoggedIn, loading } = useToken();
  const { permissionLoading } = useAppPermissions();

  if (loading || permissionLoading ) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isLoggedIn ? "Home" : "Onboard"}>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="Onboard" component={Onboarding} options={{ headerShown: false }} />
        <Stack.Screen name="BhVerification" component={BhVerification} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterViaBh} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="OtpVerify" component={BhOtpVerification} options={{ headerShown: false }} />
        <Stack.Screen name="OtpVerifyRegister" component={VerifyOtp} options={{ headerShown: false }} />

        <Stack.Screen name="HotelListing" component={Hotel_List} options={{ headerShown: false }} />
        <Stack.Screen name="Rooms" component={HotelListingForm} options={{ headerShown: false }} />
        <Stack.Screen name="All Rooms" component={AllRoom} options={{ headerShown: false }} />
        <Stack.Screen name="RoomDetail" component={SingleDetailsPage} options={{ headerShown: false }} />

        <Stack.Screen name="Booking-create" component={Booking_create} options={{ headerShown: false }} />
        <Stack.Screen name="Bookings" component={AllBookings} options={{ headerShown: false }} />
        <Stack.Screen name="Guests" component={AllGuests} options={{ headerShown: false }} />

        <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
        <Stack.Screen name="upload_Documents" component={Upload_Documents} options={{ headerShown: false }} />
        <Stack.Screen name="Recharge" component={Recharge} />
        <Stack.Screen name="Recharge History" component={RechargeHistoryTiffin} />
        <Stack.Screen name="Referral History" component={ReferralHistory} options={{ headerShown: false }} />
        <Stack.Screen name="Withdraw History" component={Withdraw} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

/* ============================= */
/* 🏁 ROOT */
/* ============================= */
export default function RootApp() {
  return (
  <SafeAreaProvider>
      <TokenProvider>
        <AppPermissionProvider>
          <AppNavigator />
        </AppPermissionProvider>
      </TokenProvider>
    </SafeAreaProvider>
  );
}
