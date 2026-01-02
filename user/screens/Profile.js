import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert,
    Modal,
    StatusBar,
    Platform,
    RefreshControl,
    Linking
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { tokenCache } from '../Auth/cache';
import { MaterialIcons, Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import EditModal from './EditModel';
import { find_me } from '../utils/helpers';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');


export default function OlyoxUserProfile() {
    const navigation = useNavigation();
    const [editModel, setEditModel] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [image, setImage] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Menu items after profile
    const menuItems = [
        {
            id: 1,
            title: 'Edit Profile',
            subtitle: 'Update your profile information',
            icon: 'person-outline',
            route: 'edit'
        },


        {
            id: 3,
            title: 'App Settings',
            subtitle: 'Notifications, language & more',
            icon: 'notifications-outline',
            route: 'AppSettings'
        },
        {
            id: 4,
            title: 'Privacy & Security',
            subtitle: 'Manage your privacy settings',
            icon: 'shield-checkmark-outline',
            route: 'policy'
        },
        {
            id: 7,
            title: 'Hotel Bookings',
            subtitle: 'Check Your Hotels Bookings',
            icon: 'home',
            route: 'MyBookings'
        },
        {
            id: 5,
            title: 'Help & Support',
            subtitle: 'Get help and contact us',
            icon: 'help-circle-outline',
            route: 'Help_me'
        },
        {
            id: 6,
            title: 'About',
            subtitle: 'App version and legal information',
            icon: 'information-circle-outline',
            route: 'About'
        },

    ];

    // Auto logout when no data/token found
    const autoLogout = useCallback(async () => {
        try {
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('cached_location');
            await SecureStore.deleteItemAsync('cached_coords');
            await SecureStore.deleteItemAsync('auth_token_db');

            navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
            });
        } catch (error) {
            console.error('Auto logout error:', error);
        }
    }, [navigation]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);

            // Check if tokens exist
            const gmail_token = await tokenCache.getToken('auth_token');
            const db_token = await tokenCache.getToken('auth_token_db');
            const token = db_token || gmail_token;

            if (!token) {
                await autoLogout();
                return;
            }

            const user = await find_me();
            if (!user || !user.user) {
                await autoLogout();
                return;
            }

            setUserData(user.user);


        } catch (error) {
            console.error('Error fetching data:', error);
            // If API fails with auth error, logout
            if (error.response && error.response.status === 401) {
                await autoLogout();

                return;

            }
            await autoLogout();
            Alert.alert('Error', 'Failed to load profile data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [autoLogout]);


    const handleLogout = useCallback(async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout from your account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await autoLogout();
                    }
                }
            ]
        );
    }, [autoLogout]);

    const pickImage = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access the media library.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.length > 0) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    }, []);

    const uploadImage = useCallback(async () => {
        if (!image) return;

        try {
            setLoading(true);
            const gmail_token = await tokenCache.getToken('auth_token');
            const db_token = await tokenCache.getToken('auth_token_db');
            const token = db_token || gmail_token;

            const form = new FormData();
            form.append('image', {
                uri: image,
                name: 'profile.jpg',
                type: 'image/jpeg',
            });

            const response = await axios.post('https://www.appv2.olyox.com/api/v1/user/update-profile', form, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });

            Alert.alert('Success', 'Profile image updated successfully!');
            fetchData();
            setImage(null);
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [image, fetchData]);

    const updateDetails = useCallback(async ({ name, email }) => {
        try {
            setLoading(true);
            const gmail_token = await tokenCache.getToken('auth_token');
            const db_token = await tokenCache.getToken('auth_token_db');
            const token = db_token || gmail_token;

            const form = new FormData();
            if (name) form.append('name', name);
            if (email) form.append('email', email);

            if (!name && !email) {
                Alert.alert('No changes detected', 'Please provide a name or email to update.');
                setLoading(false);
                return;
            }

            const response = await axios.post('https://www.appv2.olyox.com/api/v1/user/update-profile', form, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });

            Alert.alert('Success', 'Profile updated successfully!');
            fetchData();
            setEditModel(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [fetchData]);


    useEffect(() => {
        if (image) {
            const timer = setTimeout(() => {
                uploadImage();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [image, uploadImage]);

    const handleMenuPress = (route) => {

        if (route === 'edit') {
            setEditModel(true)
        } else if (route === "About") {
            Linking.openURL('https://book-a-ride.olyox.com/')
        } else if (route === "Help_me") {
            navigation.navigate(route, { id: userData?._id, userName: userData.name || "user" });

        } else {
            navigation.navigate(route);

        }

    };

    if (loading && !userData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                        <Image
                            source={{
                                uri: userData?.profileImage?.image || image || 'https://i.ibb.co/4ZhfBryk/image.png'
                            }}
                            style={styles.avatar}
                        />
                        <View style={styles.cameraButton}>
                            <Ionicons name="camera" size={20} color="#FFF" />
                        </View>
                        {image && (
                            <View style={styles.uploadingIndicator}>
                                <ActivityIndicator size="small" color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.userName}>
                        {userData?.name || "Add Your Name"}
                    </Text>
                    <Text style={styles.userPhone}>{userData?.number}</Text>

                    {userData?.email && (
                        <Text style={styles.userEmail}>{userData?.email}</Text>
                    )}

                    {userData?.referralCode && (
                        <View style={styles.referralContainer}>
                            <Text style={styles.referralLabel}>Referral Code</Text>
                            <Text style={styles.referralCode}>{userData?.referralCode}</Text>
                        </View>
                    )}

                    {userData?.isOtpVerify && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#000" />
                            <Text style={styles.verifiedText}>Verified User</Text>
                        </View>
                    )}

                    {/* Action Buttons */}

                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Menu Section */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Settings</Text>

                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={() => handleMenuPress(item.route)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconContainer}>
                                <Ionicons name={item.icon} size={24} color="#000" />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#666" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Danger Zone */}
                <View style={styles.dangerZone}>
                    <Text style={styles.sectionTitle}>Account Actions</Text>

                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#000" />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>


                </View>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>OLYOX</Text>
                    <Text style={styles.versionNumber}>Version {Application?.nativeApplicationVersion || "1.0.2"}</Text>
                </View>

                {/* Modals */}


                <EditModal
                    previousData={userData}
                    visible={editModel}
                    onClose={() => setEditModel(false)}
                    onSubmit={updateDetails}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 0.5,
    },
    placeholder: {
        width: 40,
    },
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#000',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    uploadingIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 26,
        fontWeight: '700',
        color: '#000',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    userPhone: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 15,
        color: '#666',
        marginBottom: 12,
    },
    referralContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 12,
    },
    referralLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    referralCode: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        letterSpacing: 1,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        // marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    verifiedText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
    },
    actionButtons: {
        width: '100%',
        marginTop: 10,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%',
    },
    editButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    divider: {
        height: 8,
        backgroundColor: '#F5F5F5',
    },
    menuSection: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    dangerZone: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',

    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginLeft: 8,
    },
    deleteAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    deleteAccountButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
        marginLeft: 8,
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingBottom: 40,
    },
    versionText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 2,
        marginBottom: 4,
    },
    versionNumber: {
        fontSize: 13,
        color: '#999',
    },


});
