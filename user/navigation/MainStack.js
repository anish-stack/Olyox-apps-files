import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Screens from "./screens";

const Stack = createNativeStackNavigator();

const MainStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="splash"
      screenOptions={{ headerShown: false }}
    >
      {/* Initial Screens */}
      <Stack.Screen name="splash" component={Screens.SplashScreen} />
      <Stack.Screen name="open" component={Screens.ManualCheck} />
      
      {/* Main App Screens */}
      <Stack.Screen name="Home" component={Screens.HomeScreen} />
      <Stack.Screen name="Onboarding" component={Screens.OnboardingScreen} />
      
      {/* Ride Booking */}
      <Stack.Screen name="Start_Booking_Ride" component={Screens.RideLocationSelector} />
      <Stack.Screen name="second_step_of_booking" component={Screens.Show_Cabs} />
      <Stack.Screen name="confirm_screen" component={Screens.BookingConfirmation} />
      <Stack.Screen name="driver_match" component={Screens.DriverMatching} />
      <Stack.Screen name="RideStarted" component={Screens.OnWayRide} />
      <Stack.Screen name="RateRiderOrRide" component={Screens.RateRiderOrRide} />
      
      {/* Intercity */}
      <Stack.Screen name="confirm_screen_done" component={Screens.IntercityRides} />
      <Stack.Screen name="IntercityRide" component={Screens.IntercityRide} />
      <Stack.Screen 
        name="RatingReservations" 
        component={Screens.RatingReservations}
        options={{
          headerShown: true,
          headerTitle: "Rate Your Driver",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#b32d2d" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      
      {/* Profile & Settings */}
      <Stack.Screen name="Profile" component={Screens.UserProfile} />
      <Stack.Screen name="AppSettings" component={Screens.AppSetting} />
      <Stack.Screen name="Activity" component={Screens.ActivityScreen} />
      <Stack.Screen name="notifications" component={Screens.NotificationsScreens} />
      
      {/* Transport & Parcel */}
      <Stack.Screen name="Transport" component={Screens.MainTransport} />
      <Stack.Screen name="delivery_parcel" component={Screens.Parcel_Transport} />
      <Stack.Screen name="Book-Parcel" component={Screens.BookParcel} />
      <Stack.Screen name="Parcel" component={Screens.Parcel_Orders} options={{ headerShown: true }} />
      <Stack.Screen name="OrderDetails" component={Screens.OrderDetails} />
      
      {/* Parcel Booking */}
      <Stack.Screen name="Parcel_Booking" component={Screens.Get_Pickup_Drop} />
      <Stack.Screen name="Choose_Vehicle" component={Screens.Choose_Vehicle} />
      <Stack.Screen name="PaymentScreen" component={Screens.PaymentScreen} options={{ headerShown: true, title: "Review Booking" }} />
      <Stack.Screen name="Booking_Complete_Find_Rider" component={Screens.FindRider} options={{ headerShown: true, title: "Parcel Info" }} />
      
      {/* Other */}
      <Stack.Screen name="Offers" component={Screens.Offer} />
      <Stack.Screen name="share_ride" component={Screens.ShareRideScreen} />
      <Stack.Screen name="back_searching" component={Screens.BackRideSearching} />
      <Stack.Screen name="comming-soon" component={Screens.ComingSoon} options={{ headerShown: true, title: "Coming Soon" }} />
      <Stack.Screen name="policy" component={Screens.Policy} options={{ headerShown: true, title: "Olyox App Policies" }} />
      <Stack.Screen name="policyauth" component={Screens.Policy} options={{ headerShown: true, title: "Olyox App Policies" }} />
      <Stack.Screen name="Help_me" component={Screens.Help_On} />
      <Stack.Screen name="LocationError" component={Screens.LocationErrorScreen} />
    </Stack.Navigator>
  );
};

export default MainStack;