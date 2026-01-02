import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Linking, Platform, Alert, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
// import { RefreshControl } from 'react-native-gesture-handler';

export function NewOrder() {
    const navigation = useNavigation();
    const [order, setOrder] = useState([]);
    const [restaurantId, setRestaurantId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                if (!storedToken) {
                    navigation.replace('Login');
                    return;
                }

                const { data } = await axios.get(
                    'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
                    {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    }
                );

                if (data?.data) {
                    setRestaurantId(data.data._id);
                } else {
                    console.error("Error: restaurant_id not found in API response");
                }

            } catch (error) {
                console.error("Internal server error", error);
            }
        };

        fetchProfile();
    }, []);

    const handleFetchOrderDetails = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`https://appapi.olyox.com/api/v1/tiffin/get_order_for_resturant/${restaurantId}`);
            if (data.success) {
                const orders = data.data;
                const filterData = orders.filter((order) => order.status === 'Pending');
                const reverse = filterData.reverse();
                setOrder(reverse || []);
            }
        } catch (error) {
            console.log("Internal server error", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        handleFetchOrderDetails().finally(() => setRefreshing(false));
      }, []);


    useEffect(() => {
        if (restaurantId !== null) {
            handleFetchOrderDetails();
        }
    }, [restaurantId]);

    const handleChangeOrderStatus = async (orderId, status) => {
        try {
            console.log("object", orderId, status);
            const { data } = await axios.put(`https://appapi.olyox.com/api/v1/tiffin/update_order_status/${orderId}`, { status: status });
            if (data.success) {
                alert('Order status updated successfully');
                handleFetchOrderDetails();
            }
        } catch (error) {
            console.log("Internal server error", error);
        }
    };

    const handleMakeCall = (phone) => {
        let phoneNumber = phone;
        if (Platform.OS !== 'android') {
            phoneNumber = `telprompt:${phone}`;
        }
        else {
            phoneNumber = `tel:${phone}`;
        }
        Linking.canOpenURL(phoneNumber)
            .then(supported => {
                if (!supported) {
                    Alert.alert('Phone number is not available');
                } else {
                    return Linking.openURL(phoneNumber);
                }
            })
        // Linking.openURL(`tel:${phone}`);
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!order || order.length === 0) {
        return (
            <View style={styles.noOrderContainer}>
                <Image source={require('../assets/no-orders.png')} style={styles.noOrderImage} />
                <Text style={styles.noOrderText}>No Orders Yet!</Text>
                <Text style={styles.noOrderSubText}>You don't have any orders at the moment. Check back later!</Text>
            </View>
        );
    }

    return (
        <ScrollView
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {order.map((item, index) => (
                <View key={index} style={styles.container}>
                    <View style={styles.header}>
                        <View style={styles.orderInfo}>
                            <Text style={styles.orderId}>{item.Order_Id}</Text>
                            <View style={styles.timeContainer}>
                                <Icon name="clock-outline" size={16} color="#666" />
                                <Text style={styles.timeText}>{formatDate(item?.order_date)}</Text>
                            </View>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>New Order</Text>
                        </View>
                    </View>

                    <View style={styles.customerSection}>
                        <View style={styles.customerInfo}>
                            <Icon name="account" size={24} color="#4CAF50" />
                            <View style={styles.customerDetails}>
                                <Text style={styles.customerName}>Delivery Details</Text>
                                <Text style={styles.address} numberOfLines={2}>
                                    {item?.address_details?.flatNo}, {item?.address_details?.street}
                                    {item?.address_details?.landmark && `, Near ${item?.address_details?.landmark}`}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.callButton}
                            onPress={() => { handleMakeCall(item?.user?.number) }}
                        >
                            <Icon name="phone" size={20} color="#4CAF50" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.itemsContainer}>
                        <Text style={styles.sectionTitle}>Order Details</Text>
                        {item.items.map((orderItem, idx) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <View style={styles.foodIconContainer}>
                                        <Icon name="food" size={16} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.itemName}>{orderItem?.foodItem_id?.food_name}</Text>
                                    <Text style={styles.itemQuantity}>x{orderItem?.quantity}</Text>
                                </View>
                                <Text style={styles.itemPrice}>₹{orderItem?.price}</Text>
                            </View>
                        ))}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalText}>Total ({item.items.length} items)</Text>
                            <Text style={styles.totalAmount}>₹{item?.totalPrice}</Text>
                        </View>
                    </View>

                    <View style={styles.paymentStatus}>
                        <Icon name="cash-multiple" size={20} color="#FF9800" />
                        <Text style={styles.paymentText}>Payment via {item?.paymentMethod}</Text>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.button, styles.acceptButton]}
                            onPress={() => handleChangeOrderStatus(item._id, 'Confirmed')}
                        >
                            <Icon name="check-circle" size={20} color="#FFF" />
                            <Text style={styles.buttonText}>Accept Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.rejectButton]}
                            onPress={() => handleChangeOrderStatus(item._id, 'Cancelled')}
                        >
                            <Icon name="close-circle" size={20} color="#FFF" />
                            <Text style={styles.buttonText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    orderInfo: {
        flex: 1,
    },
    orderId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    timeText: {
        marginLeft: 4,
        color: '#666',
        fontSize: 12,
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: '#4CAF50',
        fontWeight: '600',
        fontSize: 12,
    },
    customerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    customerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerDetails: {
        marginLeft: 12,
        flex: 1,
    },
    customerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    address: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemsContainer: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    foodIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    itemName: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#666',
        marginHorizontal: 8,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        marginTop: 8,
        paddingTop: 8,
    },
    totalText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    totalAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    paymentStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    paymentText: {
        marginLeft: 8,
        color: '#FF9800',
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 6,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF5252',
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
        marginLeft: 8,
    },
    noOrderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        flex: 1,
    },
    noOrderImage: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    noOrderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    noOrderSubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});