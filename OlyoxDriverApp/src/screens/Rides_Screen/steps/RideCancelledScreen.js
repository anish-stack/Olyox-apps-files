import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import useUserStore from "../../../../Store/useUserStore";

export default function RideCancelledScreen({ rideDetails }) {
    const navigation = useNavigation();
    const {fetchUserDetails} = useUserStore()

   useEffect(() => {
    if (rideDetails) {
        fetchUserDetails()
        const timer = setTimeout(() => {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Home" }], // replace "Home" with your home screen
                })
            );
        }, 3000);

        return () => clearTimeout(timer);
    }
}, [navigation, rideDetails]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ride Cancelled ❌</Text>
           
            <Text style={styles.info}>Redirecting to Home...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#ffe6e6", // soft red background
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#d64444",
        marginBottom: 10,
    },
    reason: {
        fontSize: 18,
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    info: {
        fontSize: 14,
        color: "#555",
    },
});
