import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { COLORS } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    const [restaurantId, setRestaurantId] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                if (!storedToken) {
                    navigation.replace('Login');
                    return;
                }

                const { data } = await axios.get(
                    'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
                    {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    }
                );

                if (data?.data) {
                    setRestaurantId(data.data._id);
                } else {
                    console.error("Error: restaurant_id not found in API response");
                }

            } catch (error) {
                console.error("Internal server error", error);
            }
        };

        fetchProfile();
    }, []);

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'All fields are required.');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New password and confirm password do not match.');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.put(
                `https://appapi.olyox.com/api/v1/tiffin/update_password/${restaurantId}`,
                { Password: currentPassword, newPassword }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Password changed successfully.');
                // navigation.goBack(); // Go back after success
                AsyncStorage.removeItem('userToken')
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: "Home" }],
                    })
                );
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const renderPasswordInput = (label, value, setValue, showPassword, setShowPassword, icon) => (
        <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
                <Icon name={icon} size={20} color="#6366f1" />
                <Text style={styles.label}>{label}</Text>
            </View>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    value={value}
                    onChangeText={setValue}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                >
                    <Icon
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#6366f1"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Icon name="shield-lock" size={40} color="#6366f1" />
                <Text style={styles.title}>Change Password</Text>
                <Text style={styles.subtitle}>
                    Ensure your account is using a long, strong password to stay secure
                </Text>
            </View>

            <View style={styles.formContainer}>
                {renderPasswordInput(
                    'Current Password',
                    currentPassword,
                    setCurrentPassword,
                    showCurrentPassword,
                    setShowCurrentPassword,
                    'lock-outline'
                )}

                {renderPasswordInput(
                    'New Password',
                    newPassword,
                    setNewPassword,
                    showNewPassword,
                    setShowNewPassword,
                    'lock-plus-outline'
                )}

                {renderPasswordInput(
                    'Confirm Password',
                    confirmPassword,
                    setConfirmPassword,
                    showConfirmPassword,
                    setShowConfirmPassword,
                    'lock-check-outline'
                )}

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleUpdatePassword}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Icon name="shield-check" size={24} color="#fff" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Update Password</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    formContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    inputContainer: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
        marginLeft: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 16,
        color: '#1f2937',
    },
    eyeIcon: {
        padding: 12,
    },
    button: {
        backgroundColor: COLORS.primary, // Update with your theme color
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginTop: 12,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ChangePassword;
