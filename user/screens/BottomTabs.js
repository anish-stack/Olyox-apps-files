import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Platform,
    Modal,
    Alert,
    Linking,
    Share
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';

const ShareModal = ({ code, visible, onClose }) => {
    const APP_STORE_LINK = code ? `https://olyox.in/app/register-with-my-code/${code}` : "https://olyox.in/app";
    const APPLE_STORE_LINK = "https://apps.apple.com/in/app/olyox-book-cab-hotel-food/id6744582670";
    const APP_NAME = "Olyox";
    const APP_TAGLINE = "Book Cab, Hotels, Food";

    const getAppStoreLink = () => {
        return Platform.OS === 'ios' ? APPLE_STORE_LINK : APP_STORE_LINK;
    };

    const shareContent = {
        title: `${APP_NAME} - ${APP_TAGLINE}`,
        message: Platform.OS === 'ios'
            ? `Discover Olyox - Your All-in-One Booking App!\n\n${APP_TAGLINE}\n✓ Quick cab bookings\n✓ Reserve Hotels\n✓ Order Food & Tiffin\n✓ Send Cargo\n\nDownload now: ${getAppStoreLink()}`
            : `Discover Olyox - Your All-in-One Booking App!\n\n${APP_TAGLINE}\n✓ Quick cab bookings\n✓ Reserve Hotels\n✓ Order Food & Tiffin\n✓ Send Cargo\n\nDownload now: ${getAppStoreLink()}`,
        url: getAppStoreLink()
    };

    const shareViaSystem = async () => {
        try {
            const result = await Share.share({
                message: shareContent.message,
                url: Platform.OS === 'ios' ? shareContent.url : undefined,
                title: shareContent.title,
            }, {
                dialogTitle: `Share ${APP_NAME} with friends!`,
                excludedActivityTypes: Platform.OS === 'ios' ? [
                    'com.apple.UIKit.activity.PostToTwitter'
                ] : undefined,
            });

            if (result.action === Share.sharedAction) {
                onClose();
            }
        } catch (error) {
            console.error('Error sharing via system:', error);
            Alert.alert('Error', 'Unable to share at this time');
        }
    };

    const shareViaWhatsApp = async () => {
        const message = `Check out Olyox - the ultimate booking app!\n\n${APP_TAGLINE}\n\n✓ Instant cab booking\n✓ Hotel reservations\n✓ Food & tiffin delivery\n✓ Cargo services\n\nDownload: ${getAppStoreLink()}`;
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

        try {
            const supported = await Linking.canOpenURL(whatsappUrl);
            if (supported) {
                await Linking.openURL(whatsappUrl);
                onClose();
            } else {
                Alert.alert(
                    'WhatsApp Not Found',
                    'WhatsApp is not installed on your device',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Install WhatsApp',
                            onPress: () => {
                                const storeUrl = Platform.OS === 'ios'
                                    ? 'https://apps.apple.com/app/whatsapp-messenger/id310633997'
                                    : 'https://play.google.com/store/apps/details?id=com.whatsapp';
                                Linking.openURL(storeUrl);
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('WhatsApp sharing error:', error);
            Alert.alert('Error', 'Unable to open WhatsApp');
        }
    };

    const copyToClipboard = async () => {
        try {
            await Clipboard.setStringAsync(getAppStoreLink());
            Alert.alert(
                'Link Copied!',
                `Olyox ${Platform.OS === 'ios' ? 'App Store' : 'Play Store'} link has been copied to your clipboard`,
                [{ text: 'OK', onPress: onClose }]
            );
        } catch (error) {
            console.error('Clipboard error:', error);
            Alert.alert('Error', 'Failed to copy link to clipboard');
        }
    };

    const shareOptions = [
        {
            name: 'Share App',
            icon: 'share-social',
            iconType: 'ionicon',
            color: '#000000',
            bgColor: '#F5F5F5',
            action: shareViaSystem
        },
        {
            name: 'WhatsApp',
            icon: 'logo-whatsapp',
            iconType: 'ionicon',
            color: '#25D366',
            bgColor: '#E8F8F0',
            action: shareViaWhatsApp
        },
        {
            name: 'Copy Link',
            icon: 'copy',
            iconType: 'ionicon',
            color: '#000000',
            bgColor: '#F5F5F5',
            action: copyToClipboard
        }
    ];

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.shareModalOverlay}>
                <TouchableOpacity
                    style={styles.overlayTouchable}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.shareModalContainer}>
                    {/* Handle Bar */}
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.shareModalHeader}>
                        <View style={styles.shareModalTitleContainer}>
                            <View style={styles.appIconContainer}>
                                <Ionicons name="rocket" size={28} color="#000000" />
                            </View>
                            <View>
                                <Text style={styles.shareModalTitle}>Share Olyox</Text>
                                <Text style={styles.shareModalTagline}>{APP_TAGLINE}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close-circle" size={32} color="#000000" />
                        </TouchableOpacity>
                    </View>

                    {/* Subtitle */}
                    <Text style={styles.shareModalSubtitle}>
                        Help your friends discover the convenience of Olyox!
                    </Text>

                    {/* Referral Code Display */}
                    {code && (
                        <View style={styles.referralCodeContainer}>
                            <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
                            <View style={styles.referralCodeBox}>
                                <Text style={styles.referralCodeText}>{code}</Text>
                                <TouchableOpacity
                                    style={styles.copyCodeButton}
                                    onPress={async () => {
                                        try {
                                            await Clipboard.setStringAsync(code);
                                            Alert.alert('Copied!', 'Referral code copied to clipboard');
                                        } catch (error) {
                                            console.error('Copy error:', error);
                                            Alert.alert('Error', 'Failed to copy code');
                                        }
                                    }}
                                >
                                    <Ionicons name="copy-outline" size={18} color="#000000" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Share Options */}
                    <View style={styles.shareOptionsContainer}>
                        {shareOptions.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.shareOption}
                                onPress={option.action}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.shareIconContainer,
                                    { backgroundColor: option.bgColor }
                                ]}>
                                    <Ionicons
                                        name={option.icon}
                                        size={28}
                                        color={option.color}
                                    />
                                </View>
                                <Text style={styles.shareOptionText}>{option.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* App Info */}
                    <View style={styles.appInfoContainer}>
                        <View style={styles.featuresList}>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#000000" />
                                <Text style={styles.featureText}>Quick cab bookings</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#000000" />
                                <Text style={styles.featureText}>Hotel reservations</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#000000" />
                                <Text style={styles.featureText}>Food & Tiffin delivery</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#000000" />
                                <Text style={styles.featureText}>Cargo services</Text>
                            </View>
                        </View>
                        <Text style={styles.appStoreText}>
                            {Platform.OS === 'ios' ? '📱 Available on App Store' : '📱 Available on Google Play'}
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const BottomTabs = ({ userData }) => {
    const navigation = useNavigation();
    const route = useRoute();
    const colorScheme = useColorScheme();
    const [shareModal, setShareModal] = useState(false);

    const isDark = colorScheme === "dark";

    // Memoize theme colors
    const theme = useMemo(() => ({
        background: isDark ? "#000000" : "#FFFFFF",
        activeColor: "#000000",
        inactiveColor: "#999999",
        borderColor: isDark ? "#2C2C2C" : "#EEEEEE",
        cardBg: isDark ? "#1A1A1A" : "#F8F8F8",
    }), [isDark]);

    const tabs = useMemo(() => [
        {
            name: "Activity",
            route: "Activity",
            icon: "time-outline",
            iconType: "ionicon",
        },
        {
            name: "Offers",
            route: "Offers",
            icon: "pricetag",
            iconType: "ionicon",
        },
        {
            name: "Share",
            route: "Share",
            icon: "share-social",
            iconType: "ionicon",
            isSpecial: true,
        },
        {
            name: "Profile",
            route: "Profile",
            icon: "person-circle-outline",
            iconType: "ionicon",
        },
    ], []);

    const handleTabPress = (tab) => {
        if (tab.name === "Share") {
            setShareModal(true);
        } else {
            navigation.navigate(tab.route);
        }
    };

    const renderIcon = (tab, isActive) => {
        const color = isActive ? theme.activeColor : theme.inactiveColor;
        const size = 24;

        if (tab.iconType === "fontawesome") {
            return <FontAwesome name={tab.icon} size={20} color={color} />;
        }
        return <Ionicons name={tab.icon} size={size} color={color} />;
    };

    return (
        <>
            <View style={[styles.container, {
                backgroundColor: theme.background,
                borderTopColor: theme.borderColor,
            }]}>
                <View style={styles.tabsWrapper}>
                    {tabs.map((tab, index) => {
                        const isActive = route.name === tab.route;

                        return (
                            <TouchableOpacity
                                key={tab.route}
                                style={styles.tabItem}
                                onPress={() => handleTabPress(tab)}
                                activeOpacity={0.7}
                                accessibilityLabel={`Navigate to ${tab.name}`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isActive }}
                            >
                                {tab.isSpecial ? (
                                    <View style={styles.specialTabContainer}>
                                        <LinearGradient
                                            colors={['#000000', '#2d2d2d']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.specialIconContainer}
                                        >
                                            <Ionicons name={tab.icon} size={24} color="#FFFFFF" />
                                        </LinearGradient>
                                    </View>
                                ) : (
                                    <View style={[
                                        styles.iconContainer,
                                        isActive && [styles.activeIconContainer, { backgroundColor: theme.cardBg }],
                                    ]}>
                                        {renderIcon(tab, isActive)}
                                    </View>
                                )}
                                <Text style={[
                                    styles.tabLabel,
                                    { color: isActive ? theme.activeColor : theme.inactiveColor },
                                    tab.isSpecial && styles.specialTabLabel,
                                ]}>
                                    {tab.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <ShareModal
                code={userData?.referralCode}
                visible={shareModal}
                onClose={() => setShareModal(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 28 : 42,
        borderTopWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    tabsWrapper: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingHorizontal: 8,
    },
    tabItem: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        paddingVertical: 4,
    },
    iconContainer: {
        marginBottom: 4,
        height: 32,
        width: 32,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
    },
    activeIconContainer: {
        transform: [{ scale: 1.05 }],
    },
    specialTabContainer: {
        marginTop: -24,
        marginBottom: 4,
    },
    specialIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
    specialTabLabel: {
        fontWeight: "700",
    },

    // Share Modal Styles
    shareModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    overlayTouchable: {
        flex: 1,
    },
    shareModalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '85%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    shareModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    shareModalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    appIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000000',
    },
    shareModalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000000',
    },
    shareModalTagline: {
        fontSize: 13,
        color: '#666666',
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    shareModalSubtitle: {
        fontSize: 15,
        color: '#666666',
        marginBottom: 20,
        lineHeight: 22,
    },
    referralCodeContainer: {
        backgroundColor: '#F8F8F8',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#000000',
        borderStyle: 'dashed',
    },
    referralCodeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666666',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    referralCodeBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    referralCodeText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000000',
        letterSpacing: 2,
    },
    copyCodeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    shareOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    shareOption: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E8E8E8',
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
    shareIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#EEEEEE',
    },
    shareOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000000',
        textAlign: 'center',
    },
    appInfoContainer: {
        backgroundColor: '#000000',
        borderRadius: 16,
        padding: 20,
    },
    featuresList: {
        gap: 10,
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    appStoreText: {
        fontSize: 13,
        color: '#CCCCCC',
        textAlign: 'center',
        fontWeight: '600',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333333',
    },
});

export default BottomTabs;