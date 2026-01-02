
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from "react-native"
import { useEffect, useState, useCallback } from "react"
import Layout from "../../components/Layout/Layout"
import { useToken } from "../../context/AuthContext"
import useHotelApi from "../../context/HotelDetails"
import { Feather, MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons"
import styles from "./Profile.style"
import { useNavigation } from "@react-navigation/native"
import { API_BASE_URL_V1, API_BASE_URL_V2 } from "../../constant/Api"
import axios from 'axios'
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
export default function Profile() {
    const { token } = useToken()
    const [retryCount, setRetryCount] = useState(0);
    const [hotelData, setHotelData] = useState(null)
    const [bhData, setBhData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const { findDetails } = useHotelApi()
    const navigation = useNavigation()


    const fetchHotelData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await findDetails();
            if (response.success) {
                setHotelData(response.data.data);
                return response.data.data; // Return fetched data
            } else {
                setError(response.message);
                return null;
            }
        } catch (err) {
                  console.log("err from profile",err.response.data)
            
            setError("Failed to fetch hotel data. Please try again.");
            return null;
        } finally {
            setLoading(false);
        }
    }, [findDetails]);


    const fetchBhDetails = async (bhId) => {
        // console.log("Bh Come", bhId)
        setLoading(true)

        try {
            const { data } = await axios.post(`https://www.webapi.olyox.com/api/v1/getProviderDetailsByBhId`, {
                BhId: bhId
            })
            // console.log("Bh Details", data.data)
            if (data.data) {
                setBhData(data.data)

            }
            setLoading(false)


        } catch (error) {
            console.log("error Details", error.response.data)
            setLoading(false)

        }
    }

    useEffect(() => {
        const attemptFetch = async () => {
            let attempts = 0;
            let fetchedHotelData = null;

            while (attempts < MAX_RETRIES) {
                fetchedHotelData = await fetchHotelData();

                if (fetchedHotelData?.bh) {
                    fetchBhDetails(fetchedHotelData.bh);
                    return; // Stop retrying if bhData is found
                }

                attempts++;
                setRetryCount(attempts);
                console.log(`Retrying... Attempt ${attempts}/${MAX_RETRIES}`);

                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }

            console.warn("Max retry attempts reached. BH data is still undefined.");
        };

        attemptFetch();
    }, []);



    if (loading) {
        return (
            <Layout activeTab="profile">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#D32F2F" />
                    <Text style={styles.loadingText}>Loading profile data...</Text>
                </View>
            </Layout>
        )
    }

    if (error) {
        return (
            <Layout activeTab="profile">
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#D32F2F" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchHotelData}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </Layout>
        )
    }

    if (!hotelData) {
        return (
            <Layout activeTab="profile">
                <View style={styles.errorContainer}>
                    <MaterialIcons name="info-outline" size={48} color="#D32F2F" />
                    <Text style={styles.errorText}>No profile data available</Text>
                </View>
            </Layout>
        )
    }

    const {
        BhJsonData,
        hotel_name,
        hotel_owner,
        hotel_phone,
        hotel_address,
        hotel_main_show_image,
        amenities,
        ClearAllCheckOut,
        contactNumberVerify,
        Documents,
        DocumentUploaded,
        DocumentUploadedVerified,
    } = hotelData


    const renderStatusBadge = (isActive) => (
        <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{isActive ? "Active" : "Inactive"}</Text>
        </View>
    )

    const renderDocumentStatus = () => {
        if (!DocumentUploaded) {
            return (
                <View style={styles.documentStatus}>
                    <MaterialIcons name="warning" size={20} color="#FFA000" />
                    <Text style={styles.documentPending}>Documents Not Uploaded</Text>
                    <View>
                        <TouchableOpacity onPress={() => navigation.navigate('upload_Documents')} style={styles.uploadButton}>
                            <Text style={styles.uploadButtonText}>Upload Documents</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )
        } else if (!DocumentUploadedVerified) {
            return (
                <View style={styles.documentStatus}>
                    <MaterialIcons name="pending" size={20} color="#1976D2" />
                    <Text style={styles.documentPending}>Verification Pending</Text>
                </View>
            )
        } else {
            return (
                <View style={styles.documentStatus}>
                    <MaterialIcons name="verified" size={20} color="#2E7D32" />
                    <Text style={styles.documentVerified}>Documents Verified</Text>
                </View>
            )
        }
    }

    return (
        <Layout activeTab="profile">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Hotel Header */}
                <View style={styles.hotelHeader}>
                    <Image
                        source={{ uri: hotel_main_show_image || "https://via.placeholder.com/150" }}
                        style={styles.hotelImage}
                    />
                    <View style={styles.hotelInfo}>
                        <Text style={styles.hotelName}>{hotel_name}</Text>
                        <Text style={styles.hotelOwner}>Owner: {hotel_owner}</Text>
                        <View style={styles.phoneContainer}>
                            <Feather name="phone" size={14} color="#D32F2F" />
                            <Text style={styles.hotelPhone}>{hotel_phone}</Text>
                        </View>
                    </View>
                </View>

                {/* Address */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="map-pin" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Address</Text>
                    </View>
                    <Text style={styles.addressText}>{hotel_address}</Text>
                </View>

                {/* User Details */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="user" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>User Details</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{bhData?.name}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email:</Text>
                        <Text style={styles.detailValue}>{bhData?.email}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailValue}>{bhData?.number}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>DOB:</Text>
                        <Text style={styles.detailValue}>{new Date(bhData?.dob).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Referral Information */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <FontAwesome5 name="user-friends" size={16} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Referral Information</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>My Referral Code:</Text>
                        <View style={styles.referralCodeContainer}>
                            <Text style={styles.referralCode}>{bhData?.myReferral}</Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Applied Referral:</Text>
                        <Text style={styles.detailValue}>
                            {bhData?.is_referral_applied ? bhData?.referral_code_which_applied : "None"}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Referral Status:</Text>
                        {renderStatusBadge(bhData?.is_referral_applied)}
                    </View>
                </View>

                {/* Account Status */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Account Status</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Status:</Text>
                        {renderStatusBadge(bhData?.isActive)}
                    </View>


                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Complete:</Text>
                        {renderStatusBadge(ClearAllCheckOut)}
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Plan Status:</Text>
                        {renderStatusBadge(bhData?.plan_status)}
                    </View>

                    {/* <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Free Plan:</Text>
                        {renderStatusBadge(bhData?.isFreePlanActive)}
                    </View> */}
                </View>

                {/* Wallet & Recharge */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="credit-card" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Wallet & Recharge</Text>
                    </View>

                    <View style={styles.walletContainer}>
                        <View style={styles.walletItem}>
                            <Text style={styles.walletLabel}>Wallet Balance</Text>
                            <Text style={styles.walletAmount}>₹{bhData?.wallet}</Text>
                        </View>

                        {bhData?.recharge === 0 && !bhData?.isPaid ? (

                            <TouchableOpacity onPress={() => navigation.navigate('Recharge')} style={styles.walletItem}>
                                <Text style={styles.walletAmount}>Make Your First Recharge</Text>
                            </TouchableOpacity>
                        ) :
                            <View style={styles.walletItem}>
                                <Text style={styles.walletLabel}>Recharge</Text>
                                <Text style={styles.walletAmount}>{bhData?.recharge}</Text>
                            </View>
                        }

                    </View>
                </View>

                {/* Documents */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="file-text" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Documents</Text>
                    </View>

                    {renderDocumentStatus()}

                </View>

                {/* Amenities */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="hotel" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Amenities</Text>
                    </View>

                    <View style={styles.amenitiesContainer}>
                        {Object.entries(amenities).map(([key, value]) => (
                            <View key={key} style={styles.amenityItem}>
                                {value ? (
                                    <MaterialIcons name="check-circle" size={16} color="#2E7D32" />
                                ) : (
                                    <MaterialIcons name="cancel" size={16} color="#D32F2F" />
                                )}
                                <Text style={styles.amenityText}>
                                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </Layout>
    )
}

