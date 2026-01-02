export const getRideType = (ride) => {
    console.log("🔹 Step 1: Received ride object:", ride);

    const { isRental = false, isLater = false } = ride;
    console.log(`🔹 Step 2: isRental = ${isRental}, isLater = ${isLater}`);

    if (isRental && isLater) {
        console.log("🔹 Step 3: Ride is both rental and later → returning 'later-rental'");
        return "later-rental";
    }

    if (isRental) {
        console.log("🔹 Step 4: Ride is rental only → returning 'rental'");
        return "rental";
    }

    if (isLater) {
        console.log("🔹 Step 5: Ride is later only → returning 'later'");
        return "later";
    }

    console.log("🔹 Step 6: Ride is normal → returning 'normal'");
    return "normal";
};
