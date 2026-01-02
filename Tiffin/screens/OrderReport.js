import React, { useState } from 'react';
import { Text, StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function OrderReport() {
    const [selectedPeriod, setSelectedPeriod] = useState('7d');

    // Sample data for different time periods
    const reportData = {
        totalOrders: 156,
        totalRevenue: 78000,
        averageOrderValue: 500,
        topSellingItems: [
            { name: 'Veg Thali', count: 45, revenue: 9000 },
            { name: 'South Indian Thali', count: 32, revenue: 7040 },
            { name: 'North Indian Thali', count: 28, revenue: 5880 }
        ],
        dailyStats: [
            { day: 'Mon', orders: 25, revenue: 12500 },
            { day: 'Tue', orders: 30, revenue: 15000 },
            { day: 'Wed', orders: 28, revenue: 14000 },
            { day: 'Thu', orders: 35, revenue: 17500 },
            { day: 'Fri', orders: 32, revenue: 16000 },
            { day: 'Sat', orders: 38, revenue: 19000 },
            { day: 'Sun', orders: 28, revenue: 14000 }
        ]
    };

    const timePeriods = [
        { id: '7d', label: '7 Days' },
        { id: '15d', label: '15 Days' },
        { id: '1m', label: '1 Month' },
        { id: '3m', label: '3 Months' },
        { id: '6m', label: '6 Months' },
        { id: '1y', label: '1 Year' },
        { id: '2y', label: '2 Years' }
    ];

    const maxRevenue = Math.max(...reportData.dailyStats.map(stat => stat.revenue));
    const maxOrders = Math.max(...reportData.dailyStats.map(stat => stat.orders));

    return (
        <ScrollView style={styles.container}>
            {/* Time Period Selector */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.periodSelector}
            >
                {timePeriods.map(period => (
                    <TouchableOpacity
                        key={period.id}
                        style={[
                            styles.periodButton,
                            selectedPeriod === period.id && styles.periodButtonActive
                        ]}
                        onPress={() => setSelectedPeriod(period.id)}
                    >
                        <Text style={[
                            styles.periodButtonText,
                            selectedPeriod === period.id && styles.periodButtonTextActive
                        ]}>
                            {period.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Icon name="shopping" size={24} color="#4CAF50" />
                    <Text style={styles.summaryValue}>{reportData.totalOrders}</Text>
                    <Text style={styles.summaryLabel}>Total Orders</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Icon name="currency-inr" size={24} color="#2196F3" />
                    <Text style={styles.summaryValue}>₹{reportData.totalRevenue}</Text>
                    <Text style={styles.summaryLabel}>Total Revenue</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Icon name="chart-areaspline" size={24} color="#FF9800" />
                    <Text style={styles.summaryValue}>₹{reportData.averageOrderValue}</Text>
                    <Text style={styles.summaryLabel}>Avg. Order Value</Text>
                </View>
            </View>

            {/* Daily Stats Graph */}
            <View style={styles.graphContainer}>
                <Text style={styles.sectionTitle}>Daily Performance</Text>
                <View style={styles.graph}>
                    {reportData.dailyStats.map((stat, index) => (
                        <View key={index} style={styles.graphBar}>
                            <View style={styles.barContainer}>
                                <View 
                                    style={[
                                        styles.bar,
                                        { height: `${(stat.revenue / maxRevenue) * 100}%` }
                                    ]}
                                />
                                <View 
                                    style={[
                                        styles.orderDot,
                                        { bottom: `${(stat.orders / maxOrders) * 100}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.barLabel}>{stat.day}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.graphLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                        <Text style={styles.legendText}>Revenue</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                        <Text style={styles.legendText}>Orders</Text>
                    </View>
                </View>
            </View>

            {/* Top Selling Items */}
            <View style={styles.topItemsContainer}>
                <Text style={styles.sectionTitle}>Top Selling Items</Text>
                {reportData.topSellingItems.map((item, index) => (
                    <View key={index} style={styles.topItemRow}>
                        <View style={styles.topItemInfo}>
                            <Text style={styles.topItemRank}>#{index + 1}</Text>
                            <Text style={styles.topItemName}>{item.name}</Text>
                        </View>
                        <View style={styles.topItemStats}>
                            <Text style={styles.topItemCount}>{item.count} orders</Text>
                            <Text style={styles.topItemRevenue}>₹{item.revenue}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    periodSelector: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    periodButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#F5F5F5',
    },
    periodButtonActive: {
        backgroundColor: '#FF6B6B',
    },
    periodButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    periodButtonTextActive: {
        color: '#FFF',
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'space-between',
    },
    summaryCard: {
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
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    graphContainer: {
        backgroundColor: '#FFF',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    graph: {
        height: 200,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingTop: 20,
    },
    graphBar: {
        flex: 1,
        alignItems: 'center',
    },
    barContainer: {
        width: '60%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
        opacity: 0.8,
    },
    orderDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2196F3',
        left: '50%',
        marginLeft: -4,
    },
    barLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#666',
    },
    graphLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    legendText: {
        fontSize: 12,
        color: '#666',
    },
    topItemsContainer: {
        backgroundColor: '#FFF',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    topItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    topItemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topItemRank: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginRight: 12,
    },
    topItemName: {
        fontSize: 16,
        color: '#333',
    },
    topItemStats: {
        alignItems: 'flex-end',
    },
    topItemCount: {
        fontSize: 14,
        color: '#666',
    },
    topItemRevenue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 4,
    },
});