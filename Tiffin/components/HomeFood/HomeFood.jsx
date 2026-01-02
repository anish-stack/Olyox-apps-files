import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const HomeFood = ({ isRefresh }) => {
    const navigation = useNavigation();
    const [allFood, setAllFood] = useState([]);

    const handleFetchFood = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('userToken');
            if (!storedToken) {
                navigation.replace('Login');
                return;
            }
            const { data } = await axios.get(
                'https://appapi.olyox.com/api/v1/tiffin/get_food_by_resutrant_id', {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            });
            const allData = data.data;
            const reverse = allData.reverse();
            setAllFood(reverse);
        } catch (error) {
            console.log('Internal server error', error);
            Alert.alert('Error', 'Failed to fetch food items');
        }
    };

    useEffect(() => {
        handleFetchFood();
    }, []);

    useEffect(() => {
        if (isRefresh === true) {
            handleFetchFood();
        }
    }, [isRefresh]);

    const renderFoodCard = (item) => (
        <TouchableOpacity
            key={item._id}
            style={styles.card}
            onPress={() => {/* Handle food item press */ }}
        >
            <Image
                source={{ uri: item?.images?.url }}
                style={styles.foodImage}
            // defaultSource={require('../assets/placeholder.png')}
            />
            <View style={styles.cardContent}>
                <View style={styles.categoryBadge}>
                    <Icon
                        name={item.food_category === "Veg" ? "leaf" : "food"}
                        size={14}
                        color={item.food_category === "Veg" ? "#4CAF50" : "#FF9800"}
                    />
                    <Text style={[
                        styles.categoryText,
                        { color: item.food_category === "Veg" ? "#4CAF50" : "#FF9800" }
                    ]}>
                        {item.food_category}
                    </Text>
                </View>
                <Text style={styles.foodName} numberOfLines={1}>
                    {item.food_name}
                </Text>
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>
                <View style={styles.footer}>
                    <Text style={styles.price}>₹{item.food_price}</Text>
                    <View style={styles.availabilityBadge}>
                        <Icon
                            name={item.food_availability ? "check-circle" : "close-circle"}
                            size={14}
                            color={item.food_availability ? "#4CAF50" : "#F44336"}
                        />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Our Menu</Text>
                    <Text style={styles.subtitle}>Fresh & Delicious Food</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.gridContainer}>
                    {allFood.slice(0, 4).map(renderFoodCard)}
                </View>

                <TouchableOpacity
                    style={styles.seeAllButton}
                    onPress={() => navigation.navigate('AllFood')}
                >
                    <Text style={styles.seeAllText}>See All Menu</Text>
                    <Icon name="chevron-right" size={20} color="#6366f1" />
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        marginTop: 15
    },
    header: {
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    addButton: {
        backgroundColor: '#4CAF50',
        padding: 8,
        borderRadius: 8,
    },
    scrollContent: {
        padding: 16,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: cardWidth,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    foodImage: {
        width: '100%',
        height: 120,
        resizeMode: 'cover',
    },
    cardContent: {
        padding: 12,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    foodName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    availabilityBadge: {
        padding: 4,
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f3ff',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    seeAllText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6366f1',
        marginRight: 4,
    },
});

export default HomeFood;