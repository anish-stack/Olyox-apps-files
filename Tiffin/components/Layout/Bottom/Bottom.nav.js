import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';

const BottomNav = () => {
    const navigation = useNavigation();

    const tabs = [
        { name: 'Home', icon: 'home', route: 'Home' },
        { name: 'All Food', icon: 'utensils', route: 'AllFood' }, // ✅ Fixed route name
        { name: 'Custom Food', icon: 'concierge-bell', route: 'CustomFood' }, // ✅ Fixed typo
        { name: 'Profile', icon: 'account', route: 'Profile' },
        // { name: 'Get A Call', icon: 'phone', route: 'GetACall' }, // ✅ Fixed format
    ];

    const redirect = (screen) => {
        // console.log(`Navigating to: ${screen}`);
        navigation.navigate(screen);
    };

    return (
        <View style={styles.bottomNav}>
            {tabs.map((tab, index) => (
                <TouchableOpacity key={index} style={styles.tabItem} onPress={() => redirect(tab.route)}>
                    {['utensils', 'concierge-bell'].includes(tab.icon) ? (
                        <FontAwesome5 name={tab.icon} size={24} />
                    ) : (
                        <MaterialIcon name={tab.icon} size={24} />
                    )}
                    <Text style={styles.tabText}>{tab.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    tabItem: {
        alignItems: 'center',
    },
    tabText: {
        fontSize: 12,
        color: '#111',
    },
});

export default BottomNav;
