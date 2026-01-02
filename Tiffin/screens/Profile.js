import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants/colors';
import { CommonActions, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useBhDetails } from '../hooks/useBhDetails';
import RechargeSection from './RechargeSection';

const Profile = () => {
    const navigation = useNavigation();
    const [restaurant, setRestaurant] = useState('');
    const [selectImage, setSelectedImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const { error, data, fetchDetails } = useBhDetails()


    const handleLogout = () => {
        AsyncStorage.removeItem('userToken')
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "Home" }],
            })
        );
    };



    // console.log("data",data)
    // console.log("i am resethdhjdf", restaurant)
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                if (!storedToken) {
                    navigation.replace('Login');
                    return;
                }

                // console.log("storedToken",storedToken)

                const { data } = await axios.get(
                    'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
                    {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    }
                );


                // console.log(data.data)
                if (data?.data) {
                    fetchDetails(data?.data?.restaurant_BHID)
                    setRestaurant(data.data);
                } else {
                    console.error("Error: restaurant_id not found in API response");
                }

            } catch (error) {
                console.error("Internal server error", error);
            }
        };

        fetchProfile();
    }, []);



    const pickImage = async () => {
        try {
            if (selectImage.length >= 1) {
                Alert.alert("Limit Exceeded", "You can only upload up to 1 image");
                return;
            }
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "You need to allow access to upload images.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });

            if (!result.canceled && result.assets.length > 0) {
                setSelectedImages([result.assets[0]]); // Store only the latest selected image
                // Automatically upload the selected image
                handleUploadImage(result.assets[0]);
            }
        } catch (error) {
            console.error("Error picking image:", error);
        }
    };




    const handleUploadImage = async (image) => {
        setLoading(true);
        try {
            const formData = new FormData();
            if (image) {
                const imageUri = image.uri;
                const filename = imageUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append('logo', {
                    uri: imageUri,
                    name: filename,
                    type
                });
            }


            const res = await axios.put(`https://appapi.olyox.com/api/v1/tiffin/update_logo/${restaurant._id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            if (res.data.success) {
                Alert.alert('Success', 'Profile image uploaded successfully!');
                setRestaurant(prevState => ({
                    ...prevState,
                    logo: res.data.logo // Assuming the logo data is returned from the backend
                }));
                navigation.goBack();
            } else {
                Alert.alert('Error', res.data.message || 'Failed to upload profile image');
            }
        } catch (error) {
            console.error('Submit error:', error);
            Alert.alert('Error', 'Failed to upload profile image');
        } finally {
            setLoading(false);
        }
    };


    const calculateTotalReferrals = data?.data
        ? (data?.data?.Child_referral_ids?.length || 0) +
        (data?.data?.Level1?.length || 0) +
        (data?.data?.Level2?.length || 0) +
        (data?.data?.Level3?.length || 0) +
        (data?.data?.Level4?.length || 0) +
        (data?.data?.Level5?.length || 0) +
        (data?.data?.Level6?.length || 0) +
        (data?.data?.Level7?.length || 0)
        : 0;

    // console.log("Total Referrals:", profileData);


    const calculateDaysLeft = (endDate) => {
        if (!endDate) return "No end date available";

        const today = new Date(); // Current date
        const end = new Date(endDate); // Convert endDate to Date object

        const timeDiff = end - today; // Difference in milliseconds
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert to days

        return daysLeft > 0 ? `${daysLeft} days left` : "Expired";
    };

    // Example usage
    const daysLeft = calculateDaysLeft(restaurant?.RechargeData?.expireData);
    // console.log(daysLeft);


    const MenuItem = ({ icon, title, value, onPress }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuLeft}>
                <Icon name={icon} size={24} color="#4CAF50" />
                <Text style={styles.menuText}>{title}</Text>
            </View>
            {value ? (
                <Text style={styles.menuValue}>{value}</Text>
            ) : (
                <Icon name="chevron-right" size={24} color="#666" />
            )}
        </TouchableOpacity>
    );

    return (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
            {/* Profile Header */}
            <View style={styles.header}>
                <View style={styles.profileImageContainer}>
                    <Image
                        source={{ uri: restaurant?.logo?.url || 'https://i.ibb.co/rGcJwG34/Hotel-2.png' }}
                        style={styles.profileImage}
                    />
                    <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
                        <Icon name="camera" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {loading && <ActivityIndicator size="large" color="#0000ff" />}

                <Text style={styles.name}>{restaurant?.restaurant_name || ''}</Text>
                <Text style={styles.category}>{restaurant?.category || ''}</Text>
                <View style={styles.planBadge}>
                    <Icon name="crown" size={16} color="#FFD700" />
                    <Text style={styles.planText}>{data?.data?.member_id?.title || "Not Recharged"}</Text>
                </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Icon name="gift" size={24} color="#FF9800" />

                    <Text style={styles.statAmount}>
                        ₹{typeof data?.data?.wallet === "number" ? data?.data?.wallet.toFixed(2) : "0.00"}
                    </Text>
                    <Text style={styles.statLabel}>Total Referral Earnings</Text>
                </View>
                <View style={styles.statBox}>
                    <Icon name="account-group" size={24} color="#2196F3" />
                    <Text style={styles.statAmount}>{calculateTotalReferrals}</Text>
                    <Text style={styles.statLabel}>Referrals</Text>
                </View>
                <View style={styles.statBox}>
                    <Icon name="currency-inr" size={24} color="#4CAF50" />


                    <Text style={styles.statAmount}>
                        ₹{typeof restaurant?.wallet === "number" ? restaurant.wallet.toFixed(2) : "0.00"}
                    </Text>
                    <Text style={styles.statLabel}> Earnings from food</Text>
                </View>
            </View>

            {/* Recharge Box */}
            {!restaurant?.isPaid ? (
                <RechargeSection navigation={navigation} />
            ) : (
                <View style={styles.rechargeBox}>
                    <View style={styles.rechargeInfo}>
                        <Text style={styles.rechargeTitle}>Plan expires in</Text>
                        <Text style={styles.rechargeExpiry}>{daysLeft}</Text>
                        <Text style={styles.referralCode}>Referral Code: {restaurant?.restaurant_BHID || "jdj"}</Text>
                    </View>
                    <TouchableOpacity style={styles.rechargeButton} onPress={() => navigation.navigate('Recharge Plan')}>
                        <Text style={styles.rechargeButtonText}>Recharge Now</Text>
                    </TouchableOpacity>
                </View>
            )}


            {/* Menu Items */}
            <View style={styles.menuContainer}>
                <Text style={styles.menuHeader}>Business</Text>
                <MenuItem icon="food" title="Add Listing" onPress={() => navigation.navigate('Add Listing')} />
                <MenuItem icon="food-variant" title="Customize Tiffin Plan" onPress={() => navigation.navigate('Customize Tiffine Plan')} />
                {/* <MenuItem icon="chart-bar" title="Order Report" onPress={() => navigation.navigate('Order Report')} /> */}
                {/* <MenuItem icon="account-multiple" title="Other Vendor IDs" /> */}

                {/* <Text style={styles.menuHeader}>Earnings & History</Text> */}
                <MenuItem icon="wallet" title="Unlock Deals" onPress={() => navigation.navigate('Unlock-Deals')} />
                <MenuItem icon="history" title="Recharge History" onPress={() => navigation.navigate('Recharge History')} />
                <MenuItem icon="cash-multiple" title="Withdraw History" onPress={() => navigation.navigate('Withdraw History')} />
                <MenuItem icon="account-group" title="Referral History" onPress={() => navigation.navigate('Referral History')} />

                <Text style={styles.menuHeader}>Account Settings</Text>
                <MenuItem icon="account-edit" title="Update Profile" onPress={() => navigation.navigate('Profile Update')} />
                {/* <MenuItem icon="lock-reset" title="Change Password" onPress={() => navigation.navigate('Change Password')} /> */}
                <MenuItem icon="headphones" title="Support" onPress={() => navigation.navigate('Support')} />
                <MenuItem onPress={handleLogout} icon="logout" title="Logout" />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: COLORS.redBackGround,
        padding: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editImageButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#4CAF50',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    category: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9C4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,

    },
    planText: {
        marginLeft: 4,
        color: '#FFA000',
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    rechargeBox: {
        backgroundColor: '#E8F5E9',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rechargeInfo: {
        flex: 1,
    },
    rechargeTitle: {
        fontSize: 14,
        color: '#666',
    },
    rechargeExpiry: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 4,
    },
    referralCode: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    rechargeButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    rechargeButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    menuContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        margin: 16,
        padding: 16,
    },
    menuHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 12,
    },
    menuValue: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
    },

});

export default Profile;