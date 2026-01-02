export const getRideLabel = (rideDetails) => {
    const { isIntercity, isRental, isLater, is_rental } = rideDetails || {};
    const rental = isRental || is_rental;
    if (isIntercity && rental) return "INTERCITY RENTAL RIDE";
    if (isIntercity) return "INTERCITY RIDE";
    if(rental) return "RENTAL RIDE";
    if (isLater && rental) return "LATER RIDE WITH RENTAL";
    if (isLater) return "LATER RIDE";

    return "ACTIVE RIDE";
};
