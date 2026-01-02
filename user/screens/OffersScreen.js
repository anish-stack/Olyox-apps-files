import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderNewUser from './HeaderNewHomeScreen';
import BottomTabs from './BottomTabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width * 0.85, 400); // Max width for tablets
const CARD_SPACING = 16;
const CARD_HEIGHT = Math.min(280, height * 0.35); // Responsive height

const offers = [
    {
        badge: "Upto 40% OFF",
        title: "Get a Upto 40% Off on Every Ride for New Users",
        description: "save more with every ride you take",
        icon: "car",
        route: "Start_Booking_Ride",
        gradient: ['#000000', '#1a1a1a'],
        accentColor: '#FFFFFF',
    },
    {
        badge: "Upto 20% Extra OFF",
        title: "Weekend Special",
        description: "Save big on weekend rides with friends",
        icon: "calendar",
        route: "Start_Booking_Ride",
        gradient: ['#1a1a1a', '#2d2d2d'],
        accentColor: '#FFFFFF',
    },
    {
        badge: "Upto 30% OFF",
        title: "Courier Delivery",
        description: "Fast and secure courier service at discounted rates",
        icon: "cube",
        route: "Parcel_Booking",
        gradient: ['#000000', '#1a1a1a'],
        accentColor: '#FFFFFF',
    },
];

const comingSoon = [
    {
        title: "Hotels",
        description: "Book stays at best prices",
        icon: "building",
    },
    {
        title: "Tiffins",
        description: "Home-cooked meals delivered",
        icon: "cutlery",
    },
];

const OfferCard = ({ item, index, navigation }) => {
    return (
        <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => navigation.navigate(item.route)}
            style={[styles.card, { marginLeft: index === 0 ? 20 : CARD_SPACING / 2 }]}
        >
            <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Background Pattern */}
                <View style={styles.backgroundPattern}>
                    <View style={styles.circle1} />
                    <View style={styles.circle2} />
                    <View style={styles.circle3} />
                </View>

                {/* Badge */}
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText} numberOfLines={1}>{item.badge}</Text>
                </View>

                {/* Icon */}
                <View style={styles.iconContainer}>
                    <FontAwesome name={item.icon} size={Math.min(48, width * 0.12)} color="#FFFFFF" />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                </View>

                {/* CTA Button */}
                <TouchableOpacity 
                    onPress={() => navigation.navigate(item.route)}
                    style={styles.ctaButton} 
                    activeOpacity={0.8}
                >
                    <Text style={styles.ctaText}>Claim Now</Text>
                    <FontAwesome name="arrow-right" size={14} color="#000000" />
                </TouchableOpacity>

                {/* Decorative Elements */}
                <View style={styles.cornerDecor} />
            </LinearGradient>
        </TouchableOpacity>
    );
};

const ComingSoonCard = ({ item, index }) => {
    return (
        <View style={[styles.comingSoonCard, { marginLeft: index === 0 ? 20 : 12 }]}>
            <View style={styles.comingSoonIconContainer}>
                <FontAwesome name={item.icon} size={Math.min(32, width * 0.08)} color="#000000" />
            </View>
            <Text style={styles.comingSoonTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.comingSoonDescription} numberOfLines={2}>{item.description}</Text>
            <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
            </View>
        </View>
    );
};

const Offer = () => {
    const scrollViewRef = useRef(null);
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.wrapper}>
                <HeaderNewUser isShowThis={false} showBack={true} title='Exclusive Offers' />
                
                <ScrollView 
                    style={styles.mainScroll}
                    contentContainerStyle={styles.mainScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.headerTitle}>Exclusive Offers</Text>
                                <Text style={styles.headerSubtitle}>Limited time deals just for you</Text>
                            </View>
                        </View>

                        {/* Offers Carousel */}
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={CARD_WIDTH + CARD_SPACING}
                            decelerationRate="fast"
                            contentContainerStyle={styles.scrollContent}
                            style={styles.scrollView}
                        >
                            {offers.map((offer, index) => (
                                <OfferCard navigation={navigation} key={index} item={offer} index={index} />
                            ))}
                            <View style={{ width: 20 }} />
                        </ScrollView>

                        {/* Coming Soon Section */}
                        <View style={styles.comingSoonSection}>
                            <View style={styles.comingSoonHeader}>
                                <FontAwesome name="clock-o" size={20} color="#000000" />
                                <Text style={styles.comingSoonHeaderText}>Coming Soon</Text>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.comingSoonScrollContent}
                            >
                                {comingSoon.map((item, index) => (
                                    <ComingSoonCard key={index} item={item} index={index} />
                                ))}
                                <View style={{ width: 20 }} />
                            </ScrollView>
                        </View>
                    </View>
                </ScrollView>

                <BottomTabs />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    wrapper: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    mainScroll: {
        flex: 1,
    },
    mainScrollContent: {
        flexGrow: 1,
        paddingBottom: Platform.OS === 'android' ? 80 : 60, // Space for bottom tabs
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Math.min(24, width * 0.06),
        fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
        color: '#000000',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: Math.min(13, width * 0.035),
        color: '#666666',
        marginTop: 2,
    },
    viewAllButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#000000',
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000000',
    },
    scrollView: {
        flexGrow: 0,
        minHeight: CARD_HEIGHT + 16,
    },
    scrollContent: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginRight: CARD_SPACING / 2,
        borderRadius: 24,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    cardGradient: {
        flex: 1,
        padding: 20,
        position: 'relative',
        justifyContent: 'space-between',
    },
    backgroundPattern: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.1,
        overflow: 'hidden',
    },
    circle1: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#FFFFFF',
        top: -50,
        right: -30,
    },
    circle2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        bottom: 30,
        left: -20,
    },
    circle3: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        top: '40%',
        right: 40,
    },
    badgeContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        maxWidth: '80%',
    },
    badgeText: {
        fontSize: Math.min(13, width * 0.035),
        fontWeight: '700',
        color: '#000000',
        letterSpacing: 0.5,
    },
    iconContainer: {
        opacity: 0.9,
        paddingVertical: 8,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 60,
    },
    title: {
        fontSize: Math.min(20, width * 0.05),
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: Math.min(26, width * 0.065),
        marginBottom: 6,
    },
    description: {
        fontSize: Math.min(14, width * 0.037),
        color: '#CCCCCC',
        lineHeight: Math.min(20, width * 0.05),
        textTransform: 'capitalize',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        alignSelf: 'stretch',
    },
    ctaText: {
        fontSize: Math.min(15, width * 0.04),
        fontWeight: '700',
        color: '#000000',
    },
    cornerDecor: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 80,
        height: 80,
        borderTopLeftRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    comingSoonSection: {
        marginTop: 32,
        paddingBottom: 20,
    },
    comingSoonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 8,
    },
    comingSoonHeaderText: {
        fontSize: Math.min(18, width * 0.047),
        fontWeight: '700',
        color: '#000000',
    },
    comingSoonScrollContent: {
        paddingVertical: 4,
        alignItems: 'flex-start',
    },
    comingSoonCard: {
        width: Math.min(180, width * 0.45),
        minHeight: 180,
        backgroundColor: '#F8F8F8',
        borderRadius: 20,
        padding: 16,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#E8E8E8',
        borderStyle: 'dashed',
        justifyContent: 'space-between',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    comingSoonIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#000000',
    },
    comingSoonTitle: {
        fontSize: Math.min(16, width * 0.042),
        fontWeight: '700',
        color: '#000000',
        marginBottom: 4,
    },
    comingSoonDescription: {
        fontSize: Math.min(12, width * 0.032),
        color: '#666666',
        lineHeight: Math.min(16, width * 0.042),
        marginBottom: 12,
        flex: 1,
    },
    comingSoonBadge: {
        backgroundColor: '#000000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    comingSoonBadgeText: {
        fontSize: Math.min(10, width * 0.027),
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

export default Offer;