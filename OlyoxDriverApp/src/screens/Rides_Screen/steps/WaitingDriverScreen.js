import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

export default function WaitingDriverScreen({ rideDetails }) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Animated Car Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.pulseOuter} />
                    <View style={styles.pulseMiddle} />
                    <View style={styles.iconCircle}>
                        <Text style={styles.carIcon}>🚗</Text>
                    </View>
                </View>

                {/* Main Text */}
                <Text style={styles.title}>Finding a Driver</Text>
                <Text style={styles.subtitle}>We're matching you with a nearby driver</Text>

                {/* Loader */}
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#000" />
                </View>

                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Status</Text>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusValue}>
                                {rideDetails?.ride_status || 'Searching'}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Ride ID</Text>
                        <Text style={styles.rideId}>
                            #{rideDetails?._id?.slice(-6).toUpperCase() || '------'}
                        </Text>
                    </View>
                </View>

                {/* Info Text */}
                <Text style={styles.infoText}>
                    This usually takes less than a minute
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    pulseOuter: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f0f0f0',
        opacity: 0.3,
    },
    pulseMiddle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0e0e0',
        opacity: 0.5,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    carIcon: {
        fontSize: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        textAlign: 'center',
    },
    loaderContainer: {
        marginBottom: 40,
    },
    statusCard: {
        width: '100%',
        backgroundColor: '#f8f8f8',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        marginRight: 6,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        textTransform: 'capitalize',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 16,
    },
    rideId: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        fontFamily: 'monospace',
    },
    infoText: {
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
    },
});