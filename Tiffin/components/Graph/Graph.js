import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon2 from 'react-native-vector-icons/MaterialIcons'

export default function Graph() {
    // Sample data for the last 7 days
    const data = [
        { day: 'Mon', orders: 25, revenue: 2500 },
        { day: 'Tue', orders: 32, revenue: 3200 },
        { day: 'Wed', orders: 28, revenue: 2800 },
        { day: 'Thu', orders: 45, revenue: 4500 },
        { day: 'Fri', orders: 38, revenue: 3800 },
        { day: 'Sat', orders: 50, revenue: 5000 },
        { day: 'Sun', orders: 35, revenue: 3500 }
    ];

    // Calculate max values for scaling
    const maxOrders = Math.max(...data.map(d => d.orders));
    const maxRevenue = Math.max(...data.map(d => d.revenue));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Performance Overview</Text>
                    <Text style={styles.subtitle}>Last 7 days</Text>
                </View>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                        <Text style={styles.legendText}>Orders</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                        <Text style={styles.legendText}>Revenue</Text>
                    </View>
                </View>
            </View>

            <View style={styles.graphContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                    {[0, maxOrders].map((value, index) => (
                        <Text key={index} style={styles.axisLabel}>
                            {value}
                        </Text>
                    ))}
                </View>

                {/* Graph bars and lines */}
                <View style={styles.graph}>
                    {data.map((item, index) => (
                        <View key={index} style={styles.barContainer}>
                            {/* Bar for orders */}
                            <View style={styles.barWrapper}>
                                <View 
                                    style={[
                                        styles.bar,
                                        { 
                                            height: `${(item.orders / maxOrders) * 100}%`,
                                            backgroundColor: '#4CAF50'
                                        }
                                    ]}
                                />
                            </View>
                            
                            {/* Revenue dot */}
                            <View 
                                style={[
                                    styles.revenueDot,
                                    { 
                                        bottom: `${(item.revenue / maxRevenue) * 100}%`,
                                        backgroundColor: '#2196F3'
                                    }
                                ]}
                            />
                            
                            {/* X-axis label */}
                            <Text style={styles.dayLabel}>{item.day}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Summary cards */}
            <View style={styles.summaryContainer}>
                <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="shopping" size={24} color="#4CAF50" />
                    <Text style={styles.summaryTitle}>Total Orders</Text>
                    <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                        {data.reduce((sum, item) => sum + item.orders, 0)}
                    </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                    <Icon2 name="currency-rupee" size={24} color="#2196F3" />
                    <Text style={styles.summaryTitle}>Total Revenue</Text>
                    <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                    ₹{data.reduce((sum, item) => sum + item.revenue, 0)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: 'white',
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
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    legendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 16,
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
    graphContainer: {
        height: 200,
        flexDirection: 'row',
        paddingRight: 16,
        marginBottom: 20,
    },
    yAxis: {
        width: 40,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingRight: 8,
    },
    axisLabel: {
        fontSize: 10,
        color: '#666',
    },
    graph: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
    },
    barContainer: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    barWrapper: {
        width: '60%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: 4,
    },
    revenueDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dayLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    summaryCard: {
        flex: 1,
        marginHorizontal: 8,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    summaryTitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4,
    },
});