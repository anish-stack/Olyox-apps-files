import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import axiosInstance from '../../../constant/axios';
import loginStore from '../../../Store/authStore';
import logo from '../../../assets/images/logo.png';

export default function Wait_Screen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { token, logout } = loginStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const intervalRef = useRef(null);

    console.log("🔑 Wait_Screen token:", token);
    // Fade-in animation
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    // Check verification status every 10 seconds
    useEffect(() => {
        let isActive = true;

        const checkVerificationStatus = async () => {
            try {
                console.log('🔄 Checking verification status...');
                const response = await axiosInstance.get('/api/v1/rider/user-details', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!isActive) return;

                const userData = response?.data?.partner;
                console.log('✅ Verification status:', {
                    DocumentVerify: userData?.DocumentVerify,
                    category: userData?.category,
                });

                // Navigate if documents are verified
                if (userData?.DocumentVerify) {
                    if (userData.category === 'CAB' || userData.category === 'cab') {
                        console.log('🚖 Documents verified, navigating to Home');
                        navigation.replace('Home');
                    } else if (userData.category === 'Parcel') {
                        console.log('📦 Documents verified, navigating to ParcelHome');
                        navigation.replace('ParcelHome');
                    } else {
                        console.log('🔄 Documents verified, default navigation to Home');
                        navigation.replace('Home');
                    }
                }
            } catch (error) {
                console.error('❌ Verification check error:', error?.response?.data || error);
                // Continue polling on error to avoid premature navigation
            }
        };

        // Initial check
        checkVerificationStatus();

        // Poll every 10 seconds
        intervalRef.current = setInterval(checkVerificationStatus, 10000);

        return () => {
            isActive = false;
            clearInterval(intervalRef.current);
        };
    }, [token, navigation]);

    const handleLogin = () => {
        logout()
        console.log('🔄 Navigating to Login (Reset Stack)');
        navigation.reset({
            index: 0,
            routes: [{ name: 'splash' }],
        });
    };
        const handleCheck = () => {
 
        console.log('🔄 Navigating to ViewDocuments (Reset Stack)');
        navigation.navigate('ViewDocuments');
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
                <Text style={[styles.title, { color: theme.text }]}>
                    Document Verification in Progress
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Your documents are being reviewed. This may take a few hours. You'll be notified once the verification is complete.
                </Text>

                 <TouchableOpacity style={[styles.loginButton, { backgroundColor: theme.primary,marginBottom:12, }]} onPress={handleCheck}>
                    <Text style={styles.loginButtonText}>Check And Update Documents </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                        style={styles.buttonIcon}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.loginButton, { backgroundColor: theme.primary }]} onPress={handleLogin}>
                    <Text style={styles.loginButtonText}>Go to Login</Text>
                    <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                        style={styles.buttonIcon}
                    />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        textAlign: 'center',
        marginBottom: 30,
    },
    loginButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 10,
    },
    buttonIcon: {
        marginLeft: 5,
    },
});