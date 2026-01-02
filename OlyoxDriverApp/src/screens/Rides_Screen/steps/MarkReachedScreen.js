import React, { useState, useEffect } from "react";
import { View, Text, Button } from "react-native";
import OTPModal from "../OtpModel";
import useCurrentRideStore from "../../../../Store/currentRideStore";

export default function MarkReachedScreen({ status,rideDetails }) {
    const [showOtpModal, setShowOtpModal] = useState(false);
    const { markReached } = useCurrentRideStore();

    // Show OTP modal automatically if ride is already marked as arrived
    useEffect(() => {
        if (status === "driver_arrived") {
            setShowOtpModal(true);
        }
    }, [status]);

    const handleReached = async () => {
        try {
            if (status === "driver_arrived") {
                // Already marked, just show OTP modal
                console.log("ok")
                setShowOtpModal(true);
                return;
            }
            await markReached(rideDetails.user._id, rideDetails._id, setShowOtpModal);
        } catch (err) {
            console.error("handle mark", err);
        }
    };

    return (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
            {/* <Text>Driver has reached pickup location</Text>
            <Button title="Arrived" onPress={handleReached} /> */}
            {showOtpModal && <OTPModal rideDetails={rideDetails} />}
        </View>
    );
}
