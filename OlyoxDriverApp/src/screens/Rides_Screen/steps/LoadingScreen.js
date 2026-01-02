import React from "react";
import { SafeAreaView, ActivityIndicator, Text, View, StyleSheet } from "react-native";

export default function LoadingScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#000" />
                </View>
                <Text style={styles.text}>Finding your ride...</Text>
                <Text style={styles.subText}>Please wait a moment</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    loaderContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    text: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    subText: {
        fontSize: 14,
        color: '#666',
    },
});