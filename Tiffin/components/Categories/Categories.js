import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('screen');
const ITEM_WIDTH = (width - 52) / 2;



export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('https://www.webapi.olyox.com/api/v1/categories_get');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF5A5F" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {categories.map((category) => (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        key={category._id}
                        style={styles.categoryButton}
                        onPress={() => console.log(`Selected category: ${category.title}`)}
                    >
                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: category.icon }}
                                style={styles.icon}
                            />
                        </View>
                        <Text style={styles.title}>{category.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    categoryButton: {
        width: ITEM_WIDTH,
        backgroundColor: 'rgba(237, 43, 38,0.8)',

        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        shadowColor: 'rgba(237, 43, 38,0.8)',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    imageContainer: {
        width: 60,
        height: 60,
        backgroundColor: 'rgba(237, 43, 38,0.7)',
        borderRadius: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        textAlign: 'center',
    },
});