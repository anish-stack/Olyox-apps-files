import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SocketProvider } from "../context/SocketContext";
import { LocationProvider } from "../context/LocationContext";
import { GuestProvider } from "../context/GuestLoginContext";
import { RideProvider } from "../context/RideContext";
import { BookingParcelProvider } from "../context/ParcelBookingContext/ParcelBookingContext";
import { RideSearchingProvider } from "../context/ride_searching";
import ErrorBoundary from "../ErrorBoundary";
import { navigationRef } from "../RootNavigation";
import AppInitializer from "../components/AppInitializer";
import MainStack from "./MainStack";

const linking = {
  prefixes: ["https://olyox.in"],
  config: {
    screens: {
      share_ride: "app/share-ride/:rideId",
      Onboarding: "app/register-with-my-code/:code",
    },
  },
};

const AppNavigator = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SocketProvider>
        <LocationProvider>
          <GuestProvider>
            <RideProvider>
              <BookingParcelProvider>
                <SafeAreaProvider>
                  <StatusBar style="auto" />
                  <ErrorBoundary>
                    <NavigationContainer ref={navigationRef} linking={linking}>
                      <RideSearchingProvider>
                        <AppInitializer>
                          <MainStack />
                        </AppInitializer>
                      </RideSearchingProvider>
                    </NavigationContainer>
                  </ErrorBoundary>
                </SafeAreaProvider>
              </BookingParcelProvider>
            </RideProvider>
          </GuestProvider>
        </LocationProvider>
      </SocketProvider>
    </GestureHandlerRootView>
  );
};

export default AppNavigator;
