import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RechargeSection = ({navigation}) => {
    return (
        <View style={styles.container}>
            <Icon name="error-outline" size={40} color="#f44336" style={styles.icon} />
            <Text style={styles.rechargeText}>Your account is not rechargeable</Text>
            <TouchableOpacity style={styles.rechargeButton} onPress={() => navigation.navigate('Recharge Plan')}>
                <Icon name="credit-card" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.rechargeButtonText}>Make Your First Recharge</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        elevation: 5, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginVertical: 20,
    },
    icon: {
        marginBottom: 10,
    },
    rechargeText: {
        fontSize: 16,
        color: '#d32f2f',
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    rechargeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007C01',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        elevation: 3,
    },
    buttonIcon: {
        marginRight: 8,
    },
    rechargeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default RechargeSection;
