import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    StatusBar,
} from 'react-native';
import axios from 'axios';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function HotelDetails({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { id } = route.params || {};
    const [hotel, setHotel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        fetchHotelDetails();
    }, [id]);

    const fetchHotelDetails = async () => {
        try {
            const response = await axios.get(
                `https://appv2.olyox.com/api/v1/hotels/hotel-details/${id}`
            );

            if (response.data.success) {
                setHotel(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching hotel details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookNow = () => {
        navigation.navigate('HotelBooking', { hotelId: id, hotelData: hotel });
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>loading details...</Text>
            </View>
        );
    }

    if (!hotel) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>hotel not found</Text>
            </View>
        );
    }

    const images = [
        hotel.main_image?.url,
        hotel.second_image?.url,
        hotel.third_image?.url,
        hotel.fourth_image?.url,
        hotel.fifth_image?.url,
    ].filter(Boolean);

    //   console.log("images",images)

    const amenitiesList = Object.entries(hotel.amenities || {})
        .filter(([key, value]) => value === true)
        .map(([key]) => key);

    const hotelAmenitiesList = Object.entries(hotel.hotel_user?.amenities || {})
        .filter(([key, value]) => value === true)
        .map(([key]) => key);

    const getAmenityIcon = (amenity) => {
        const iconMap = {
            AC: { name: 'snow', library: Ionicons },
            freeWifi: { name: 'wifi', library: Ionicons },
            kitchen: { name: 'restaurant', library: Ionicons },
            TV: { name: 'tv', library: Ionicons },
            powerBackup: { name: 'flash', library: Ionicons },
            geyser: { name: 'water', library: Ionicons },
            parkingFacility: { name: 'car', library: Ionicons },
            elevator: { name: 'elevator', library: MaterialIcons },
            cctvCameras: { name: 'videocam', library: Ionicons },
            diningArea: { name: 'fast-food', library: Ionicons },
            reception: { name: 'people', library: Ionicons },
            caretaker: { name: 'person', library: Ionicons },
            security: { name: 'shield-checkmark', library: Ionicons },
            checkIn24_7: { name: 'time', library: Ionicons },
            dailyHousekeeping: { name: 'broom', library: MaterialIcons },
            fireExtinguisher: { name: 'fire-extinguisher', library: FontAwesome5 },
            firstAidKit: { name: 'medkit', library: Ionicons },
            attachedBathroom: { name: 'water', library: MaterialIcons },
        };
        return iconMap[amenity] || { name: 'checkmark-circle', library: Ionicons };
    };

    const formatAmenityName = (name) => {
        return name
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .toLowerCase()
            .replace(/24 7/, '24/7');
    };

    console.log("hotel.hotel_user?.hotel_name", hotel?.hotel_user)

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Image Gallery */}
            <View style={styles.imageContainer}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e) => {
                        const offset = e.nativeEvent.contentOffset.x;
                        const index = Math.round(offset / width);
                        setActiveImage(index);
                    }}
                    scrollEventThrottle={16}
                >
                    {images.map((img, index) => (
                        <Image
                            key={index}
                            source={{ uri: img }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ))}
                </ScrollView>

                <View style={styles.imageDots}>
                    {images.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                activeImage === index && styles.activeDot,
                            ]}
                        />
                    ))}
                </View>

                <View style={[styles.topButtons, { top: insets.top + 10 }]}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="heart-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Content */}
                <View style={styles.content}>
                    {/* Room Type & Availability */}
                    <View style={styles.headerRow}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.roomType}>{hotel.room_type}</Text>
                            {hotel.has_tag && hotel.has_tag.length > 0 && (
                                <View style={styles.tagsRow}>
                                    {hotel.has_tag.map((tag, index) => (
                                        <View key={index} style={styles.tag}>
                                            <Text style={styles.tagText}>{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                        {hotel.isRoomAvailable && (
                            <View style={styles.availableBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                                <Text style={styles.availableText}>Available</Text>
                            </View>
                        )}
                    </View>

                    {/* Hotel Name & Address */}
                    <View style={styles.locationSection}>
                        <View style={styles.locationRow}>
                            <Ionicons name="business" size={18} color="#000" />
                            <Text style={styles.hotelName}>{hotel.hotel_user?.hotel_name}</Text>
                        </View>

                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={18} color="#666" />
                            <Text style={styles.address}>{hotel.hotel_user?.hotel_address}</Text>
                        </View>
                    </View>

                    {/* Pricing Section */}
                    <View style={styles.pricingCard}>
                        <View style={styles.priceHeader}>
                            <View>
                                <Text style={styles.cutPrice}>₹{hotel.cut_price}</Text>
                                <View style={styles.priceMainRow}>
                                    <Text style={styles.bookPrice}>₹{hotel.book_price}</Text>
                                    <Text style={styles.perNight}>/night</Text>
                                </View>
                            </View>
                            <View style={styles.discountBadge}>
                                <Feather name="tag" size={14} color="#fff" />
                                <Text style={styles.discountText}>{hotel.discount_percentage}% off</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailsGrid}>
                            <View style={styles.detailBox}>
                                <Ionicons name="people" size={20} color="#000" />
                                <Text style={styles.detailLabel}>{hotel.allowed_person} guests</Text>
                            </View>
                            <View style={styles.detailBox}>
                                <Ionicons name="bed" size={20} color="#000" />
                                <Text style={styles.detailLabel}>{hotel.NumberOfRoomBooks} rooms</Text>
                            </View>
                        </View>

                        {hotel.is_tax_applied && (
                            <View style={styles.taxRow}>
                                <Ionicons name="information-circle-outline" size={16} color="#666" />
                                <Text style={styles.taxText}>+ ₹{hotel.tax_fair} taxes & fees</Text>
                            </View>
                        )}
                    </View>

                    {/* Cancellation Policy */}
                    {hotel.cancellation_policy && hotel.cancellation_policy.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="cancel" size={20} color="#000" />
                                <Text style={styles.sectionTitle}>Cancellation Policy</Text>
                            </View>
                            {hotel.cancellation_policy.map((policy, index) => (
                                <View key={index} style={styles.policyItem}>
                                    <Ionicons name="checkmark-circle" size={16} color="#000" />
                                    <Text style={styles.policyText}>{policy}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Room Amenities */}
                    {amenitiesList.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="list" size={20} color="#000" />
                                <Text style={styles.sectionTitle}>room amenities</Text>
                            </View>
                            <View style={styles.amenitiesGrid}>
                                {amenitiesList.map((amenity, index) => {
                                    const icon = getAmenityIcon(amenity);
                                    const IconComponent = icon.library;
                                    return (
                                        <View key={index} style={styles.amenityItem}>
                                            <IconComponent name={icon.name} size={18} color="#000" />
                                            <Text style={styles.amenityText}>{formatAmenityName(amenity)}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Hotel Amenities */}
                    {hotelAmenitiesList.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="business" size={20} color="#000" />
                                <Text style={styles.sectionTitle}>Hotel Facilities</Text>
                            </View>
                            <View style={styles.amenitiesGrid}>
                                {hotelAmenitiesList.map((amenity, index) => {
                                    const icon = getAmenityIcon(amenity);
                                    const IconComponent = icon.library;
                                    return (
                                        <View key={index} style={styles.amenityItem}>
                                            <IconComponent name={icon.name} size={18} color="#000" />
                                            <Text style={styles.amenityText}>{formatAmenityName(amenity)}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}


                </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 16 }]}>
                <View style={styles.bottomPriceInfo}>
                    <Text style={styles.bottomPrice}>₹{hotel.book_price}</Text>
                    <Text style={styles.bottomPriceLabel}>Per Night</Text>
                </View>
                <TouchableOpacity
                    style={styles.bookButton}
                    onPress={handleBookNow}
                    activeOpacity={0.8}
                >
                    <Text style={styles.bookButtonText}>book now</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        color: '#666',
    },
    errorText: {
        fontSize: 14,
        color: '#666',
    },
    imageContainer: {
        height: height * 0.45,
        position: 'relative',
    },
    image: {
        width: width,
        height: '100%',
        backgroundColor: '#f5f5f5',
    },
    imageDots: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: 3,
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 24,
        height: 6,
    },
    topButtons: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    roomType: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    tagText: {
        fontSize: 10,
        color: '#000',
        fontWeight: '500',
    },
    availableBadge: {
        backgroundColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    availableText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '500',
    },
    locationSection: {
        marginBottom: 20,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    hotelName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        flex: 1,
    },
    address: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    pricingCard: {
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    priceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cutPrice: {
        fontSize: 14,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    priceMainRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 2,
    },
    bookPrice: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
    },
    perNight: {
        fontSize: 13,
        color: '#666',
        marginLeft: 4,
    },
    discountBadge: {
        backgroundColor: '#000',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    discountText: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e5e5',
        marginVertical: 14,
    },
    detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    detailBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: 13,
        color: '#000',
        fontWeight: '500',
    },
    taxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 4,
    },
    taxText: {
        fontSize: 11,
        color: '#666',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    policyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    policyText: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    amenityItem: {
        width: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    amenityText: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    infoCard: {
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 8,
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: '#999',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
        paddingHorizontal: 20,
        paddingTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bottomPriceInfo: {
        flex: 1,
    },
    bottomPrice: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
    },
    bottomPriceLabel: {
        fontSize: 11,
        color: '#666',
    },
    bookButton: {
        backgroundColor: '#000',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bookButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});