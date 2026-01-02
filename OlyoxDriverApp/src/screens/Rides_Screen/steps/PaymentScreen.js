import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import useCurrentRideStore from "../../../../Store/currentRideStore";

export default function PaymentScreen({ rideDetails }) {
    const { paymentCollect } = useCurrentRideStore();
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        try {
            setLoading(true);
            await paymentCollect(rideDetails.user._id, rideDetails._id, rideDetails.total_fare, "cash");
            setLoading(false);
        } catch (err) { console.error(err); setLoading(false); }
    };

    return (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
            <Text>Total Fare: ₹{rideDetails.total_fare}</Text>
            <Button title={loading ? "Processing..." : "Collect Payment"} onPress={handlePayment} disabled={loading} />
        </View>
    );
}
