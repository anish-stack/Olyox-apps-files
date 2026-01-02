import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from "@react-navigation/native";

const Header = () => {
    const navigation = useNavigation();
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const [activeOrder, setActiveOrder] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const handleLogout = () => {
        AsyncStorage.removeItem('userToken')
        navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Home" }],
            })
          );
    }

    // Check for token in AsyncStorage
    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                }
            } catch (error) {
                console.error('Error checking token:', error);
            }
        };

        checkToken();
    }, []);

    const showSidebar = () => {
        setSidebarVisible(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const hideSidebar = () => {
        Animated.timing(slideAnim, {
            toValue: -300,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setSidebarVisible(false));
    };

    const menuItems = [
        { title: 'Home', icon: 'home' },
        { title: 'Profile', icon: 'account' },
        { title: 'All Order', icon: 'shopping' },
  
        { title: 'AllFood', icon: 'cog' },
        { title: 'Help', icon: 'help-circle' },
    ];

    return (
        <View>
            <View style={styles.header}>
                {/* Location Section */}
                <View style={styles.locationContainer}>
                   
                    <View style={styles.locationTextContainer}>
                        <Text style={styles.locationLabel}>Tiffin</Text>
                        <Text style={styles.locationDetails}>Service App</Text>
                    </View>
                </View>

                <View style={styles.headerRightContainer}>
                    {/* Notification Icon */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('New Order')}
                        style={styles.notificationButton}
                    >
                        <Icon
                            name={activeOrder ? "bell-badge" : "bell"}
                            size={24}
                            color="#ffffff"
                        />
                    </TouchableOpacity>

                    {/* Menu Button */}
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={showSidebar}
                    >
                        <Icon name="menu" size={28} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                visible={sidebarVisible}
                transparent={true}
                onRequestClose={hideSidebar}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.sidebar,
                            {
                                transform: [{ translateX: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarTitle}>Menu</Text>
                            <TouchableOpacity
                                onPress={hideSidebar}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.authButtons}>
                            {isLoggedIn ? (
                                <>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('Profile')}
                                        style={styles.loginButton}
                                    >
                                        <Text style={styles.loginButtonText}>Profile</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={handleLogout} style={styles.registerButton}>
                                        <Text style={styles.registerButtonText}>Log Out</Text>
                                    </TouchableOpacity>

                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('Login')}
                                        style={styles.loginButton}
                                    >
                                        <Text style={styles.loginButtonText}>Login</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.registerButton}>
                                        <Text style={styles.registerButtonText}>Register</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        <View style={styles.menuItems}>
                            {menuItems.map((item) => (
                                <TouchableOpacity
                                    key={item.title}
                                    style={styles.menuItem}
                                    onPress={() => navigation.navigate(item.title)}
                                >
                                    <Icon name={item.icon} size={24} color="#333" />
                                    <Text style={styles.menuText}>{item.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.error,
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 12,
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationTextContainer: {
        marginLeft: 8,
    },
    locationLabel: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    locationDetails: {
        color: '#ffffff',
        fontSize: 14,
        opacity: 0.9,
    },
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationButton: {
        marginRight: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 8,
        borderRadius: 8,
    },
    menuButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 8,
        borderRadius: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sidebar: {
        backgroundColor: '#ffffff',
        width: '80%',
        height: '100%',
        shadowColor: '#000',
        shadowOffset: {
            width: 2,
            height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sidebarTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 8,
    },
    authButtons: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    loginButton: {
        backgroundColor: '#FF6B6B',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginRight: 8,
    },
    registerButton: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    loginButtonText: {
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
    },
    registerButtonText: {
        color: '#FF6B6B',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuItems: {
        padding: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 16,
        fontWeight: '500',
    },
});

export default Header;