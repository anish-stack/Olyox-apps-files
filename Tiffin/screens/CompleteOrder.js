import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function CompleteOrder() {
    const navigation = useNavigation();
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [allOrders, setAllOrders] = useState([]);
    const [restaurantId, setRestaurantId] = useState('null');
    const [loading, setLoading] = useState(false);

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
                const reverse = data.data.reverse();
                const filteredOrders = reverse.filter(order => order.status === 'Out for Delivery');
                setAllOrders(filteredOrders || []);
            }
        } catch (error) {
            console.log("Internal server error", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (restaurantId !== 'null') {
            handleFetchOrderDetails();
        }
    }, [restaurantId]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return '#f59e0b';
            case 'In Progress': return '#6366f1';
            case 'Delivered': return '#10b981';
            default: return '#6b7280';
        }
    };

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

    // console.log("allOrders",allOrders)

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Icon name="clipboard-list" size={32} color="#FF6B6B" />
                <Text style={styles.title}>Completed Orders</Text>
            </View>

            {allOrders.map((order, index) => (
                <TouchableOpacity
                    key={order._id}
                    style={styles.orderCard}
                    onPress={() => setExpandedOrder(expandedOrder === index ? null : index)}
                    activeOpacity={0.7}
                >
                    <View style={styles.orderHeader}>
                        <View style={styles.orderIdContainer}>
                            <Icon name="shopping" size={20} color="#6366f1" />
                            <Text style={styles.orderId}>{order.Order_Id}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                {order.status}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.timeContainer}>
                        <Icon name="clock-outline" size={16} color="#6b7280" />
                        <Text style={styles.timeText}>{formatDate(order.order_date)}</Text>
                    </View>

                    <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>Order Details</Text>
                        <View style={styles.addressContainer}>
                            <Icon name="map-marker-outline" size={16} color="#6b7280" />
                            <Text style={styles.address}>
                                {order.address_details.flatNo}, {order.address_details.street}
                                {order.address_details.landmark && `, Near ${order.address_details.landmark}`}
                            </Text>
                        </View>
                    </View>

                    {expandedOrder === index && (
                        <View style={styles.orderDetails}>
                            <Text style={styles.detailsTitle}>Items Ordered</Text>
                            {order.items.map((item, idx) => (
                                <View key={idx} style={styles.itemRow}>
                                    <Text style={styles.itemName}>{item.foodItem_id.food_name}</Text>
                                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                                </View>
                            ))}
                            <View style={styles.totalContainer}>
                                <Text style={styles.totalLabel}>Total Amount</Text>
                                <Text style={styles.totalAmount}>₹{order.totalPrice}</Text>
                            </View>
                            
                            <View style={styles.paymentInfo}>
                                <Icon name="credit-card" size={16} color="#6b7280" />
                                <Text style={styles.paymentText}>
                                    Payment via {order.paymentMethod}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.expandButton}>
                        <Icon
                            name={expandedOrder === index ? "chevron-up" : "chevron-down"}
                            size={24}
                            color="#6b7280"
                        />
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginLeft: 12,
    },
    orderCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        margin: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginLeft: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    timeText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 6,
    },
    customerInfo: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    address: {
        flex: 1,
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 6,
    },
    orderDetails: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 16,
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemName: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#6b7280',
        marginHorizontal: 12,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6366f1',
    },
    expandButton: {
        alignItems: 'center',
        marginTop: 8,
    },
    paymentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    paymentText: {
        fontSize: 14,
        color: '#6b7280',
    },
});