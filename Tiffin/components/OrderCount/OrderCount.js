import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function OrderCount({isRefresh}) {
    const navigation = useNavigation();
    const [restaurantId, setRestaurantId] = useState('null');
    const [orderCount, setOrderCount] = useState({
        allOrder: 0,
        running: 0,
        completed: 0,
        newOrder:0
    })
    const [loading, setLoading] = useState(false)
    const orderStats = [
        {
            title: 'New Order',
            count: orderCount.newOrders,
            icon: 'shopping-outline',
            color: '#FF6B6B',
            bgColor: '#FFE8E8',
            link: 'New Order'
        },
        {
            title: 'Running',
            count: orderCount.running,
            icon: 'run-fast',
            color: '#4ECDC4',
            bgColor: '#E8F8F7',
            link: 'Running Order'
        },
        {
            title: 'Completed',
            count: orderCount.completed,
            icon: 'check-circle-outline',
            color: '#45B7D1',
            bgColor: '#E6F6FA',
            link: 'Complete Order'
        },
        {
            title: 'All Orders',
            count: orderCount.allOrder,
            icon: 'package-variant-closed',
            color: '#96C93D',
            bgColor: '#F0F7E6',
            link: 'All Order'
        }
    ];

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
                const allOder = data.data;
                const runningOrders = allOder.filter(order => order.status === 'Confirmed');
                const newOrders = allOder.filter(order => order.status === 'Pending');
                const completedOrders = allOder.filter(order => order.status === 'Out for Delivery');
                setOrderCount({
                    allOrder: allOder.length,
                    running: runningOrders.length,
                    completed: completedOrders.length,
                    newOrders:newOrders.length
                });
            }
        } catch (error) {
            console.log("Internal server error have come", error.response);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (restaurantId !== 'null') {
            handleFetchOrderDetails();
        }
    }, [restaurantId]);


    useEffect(()=>{
        if(isRefresh === true){

            handleFetchOrderDetails()
        }
    },[isRefresh])

     if (loading) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>Loading...</Text>
                </View>
            );
        }

    return (
        <View style={styles.container}>
            <View style={styles.inner_container}>
                {orderStats.map((stat, index) => (
                    <TouchableOpacity onPress={() => navigation.navigate(stat.link)} key={index} style={styles.col}>
                        <View style={[styles.statBox, { backgroundColor: stat.bgColor }]}>
                            <View style={[styles.iconContainer, { backgroundColor: stat.color }]}>
                                <Icon name={stat.icon} size={24} color="white" />
                            </View>
                            <Text style={styles.count}>{stat.count}</Text>
                            <Text style={styles.title}>{stat.title}</Text>
                            <View style={[styles.progressBar, { backgroundColor: stat.color + '40' }]}>
                                <View
                                    style={[
                                        styles.progress,
                                        {
                                            backgroundColor: stat.color,
                                            width: `${Math.min((stat.count / 200) * 100, 100)}%`
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingLeft: 16,
        paddingRight: 16,
    },
    inner_container: {
        width: '100%',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
    },
    col: {
        width: '48%',
        marginBottom: 16,
    },
    statBox: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    count: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    title: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    progressBar: {
        width: '100%',
        height: 4,
        borderRadius: 2,
    },
    progress: {
        height: '100%',
        borderRadius: 2,
    }
});