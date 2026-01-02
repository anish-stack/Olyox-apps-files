import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    Image,
    Alert,
    Modal,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { AntDesign, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Enhanced Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ visible, onClose, onConfirm, userName }) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.deleteModalContainer}>
                    <View style={styles.deleteModalHeader}>
                        <Ionicons name="warning-outline" size={60} color="#000" />
                        <Text style={styles.deleteModalTitle}>Delete Account?</Text>
                    </View>

                    <View style={styles.deleteModalContent}>
                        <Text style={styles.deleteModalMessage}>
                            Hey {userName}!
                        </Text>
                        <Text style={styles.deleteModalSubMessage}>
                            Your account holds the key to effortless bookings — don't lose that connection!
                        </Text>

                        <View style={styles.benefitsList}>
                            <View style={styles.benefitItem}>
                                <Ionicons name="car-sport-outline" size={22} color="#000" />
                                <Text style={styles.benefitText}>Quick cab bookings & ride history</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <Ionicons name="gift-outline" size={22} color="#000" />
                                <Text style={styles.benefitText}>Loyalty rewards & exclusive offers</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.deleteModalActions}>
                        <TouchableOpacity
                            style={styles.stayButton}
                            onPress={onClose}
                        >
                            <Text style={styles.stayButtonText}>Stay With Olyox</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.confirmDeleteButton}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmDeleteText}>Delete Anyway</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default function Help_Support() {
    const route = useRoute();
    const { id, userName } = route.params || {};
    const navigation = useNavigation();

    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [message, setMessage] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access the media library.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                setScreenshot(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const handleSubmit = async () => {
        if (!message || !number) {
            Alert.alert('Missing Information', 'Message and Number are required!');
            return;
        }

        if (!/^\d{10}$/.test(number)) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit number.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('number', number);
        formData.append('message', message);

        if (screenshot) {
            const fileName = screenshot.split('/').pop();
            const fileType = fileName.split('.').pop();

            formData.append('image', {
                uri: screenshot,
                name: fileName,
                type: `image/${fileType}`,
            });
        }

        setLoading(true);
        try {
            const response = await fetch('https://www.appv2.olyox.com/api/v1/admin/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Thank You!',
                    `Your issue has been sent to our support team. We'll review it and get back to you as soon as possible.`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setName('');
                                setNumber('');
                                setMessage('');
                                setScreenshot(null);
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', `${data.message || 'Something went wrong'}`);
            }
        } catch (error) {
            console.error('Submit error:', error);
            Alert.alert('Error', 'Something went wrong while submitting. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const autoLogout = useCallback(async () => {
        try {
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('cached_location');
            await SecureStore.deleteItemAsync('cached_coords');
            await SecureStore.deleteItemAsync('auth_token_db');

            navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
            });
        } catch (error) {
            console.error('Auto logout error:', error);
        }
    }, [navigation]);

    const handleLogout = useCallback(async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout from your account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await autoLogout();
                    }
                }
            ]
        );
    }, [autoLogout]);

    const deleteAccount = useCallback(async (userId) => {
        try {
            setLoading(true);
            const response = await axios.post(`https://www.appv2.olyox.com/api/v1/user/delete-my-account/${userId}`);
            Alert.alert('Account Deleted', response.data.message);
            await autoLogout();
        } catch (error) {
            console.error('Error deleting account:', error);
            Alert.alert('Error', 'Failed to delete account. Please try again.');
        } finally {
            setLoading(false);
            setDeleteModal(false);
        }
    }, [autoLogout]);

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Help & Support</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Help Guide Section */}
                    <View style={styles.guideContainer}>
                        <View style={styles.guideHeader}>
                            <Ionicons name="help-circle-outline" size={28} color="#000" />
                            <Text style={styles.guideTitle}>Getting Started Guide</Text>
                        </View>

                        <Text style={styles.guideSubtitle}>How to Register/Login</Text>

                        <View style={styles.stepsContainer}>
                            <View style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Enter Your Number Number</Text>
                                    <Text style={styles.stepDescription}>
                                        Enter your 10-digit  number to begin the registration process
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Verify OTP</Text>
                                    <Text style={styles.stepDescription}>
                                        Wait for the OTP on WhatsApp and Text Sms (up to 2 minutes). Enter the OTP to verify
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Complete Profile</Text>
                                    <Text style={styles.stepDescription}>
                                        After verification, complete your profile information to finish
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Issue Report Form */}
                    <View style={styles.formContainer}>
                        <View style={styles.formHeader}>
                            <Ionicons name="document-text-outline" size={28} color="#000" />
                            <Text style={styles.formTitle}>Report an Issue</Text>
                        </View>

                        <Text style={styles.formSubtitle}>
                            Having trouble? Let us know and we'll help you resolve it.
                        </Text>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Your Name (Optional)</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your name"
                                    placeholderTextColor="#999"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>WhatsApp Number *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="10-digit number"
                                    placeholderTextColor="#999"
                                    value={number}
                                    onChangeText={setNumber}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Describe Your Issue *</Text>
                            <View style={styles.messageContainer}>
                                <TextInput
                                    style={styles.messageInput}
                                    placeholder="Tell us what happened..."
                                    placeholderTextColor="#999"
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                            <Ionicons name="camera-outline" size={22} color="#666" />
                            <Text style={styles.uploadButtonText}>
                                {screenshot ? 'Change Screenshot' : 'Attach Screenshot (Optional)'}
                            </Text>
                        </TouchableOpacity>

                        {screenshot && (
                            <View style={styles.screenshotPreview}>
                                <Image source={{ uri: screenshot }} style={styles.screenshot} />
                                <TouchableOpacity
                                    style={styles.removeScreenshot}
                                    onPress={() => setScreenshot(null)}
                                >
                                    <Ionicons name="close-circle" size={28} color="#000" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color="#FFF" />
                                    <Text style={styles.submitButtonText}>Submit Report</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Account Actions - Only show if user is logged in */}
                    {id && userName && (
                        <>
                            <View style={styles.divider} />

                            <View style={styles.accountActionsContainer}>
                                <Text style={styles.sectionTitle}>Account Actions</Text>

                                {/* <TouchableOpacity
                                    style={styles.logoutButton}
                                    onPress={handleLogout}
                                >
                                    <Ionicons name="log-out-outline" size={20} color="#000" />
                                    <Text style={styles.logoutButtonText}>Logout</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#666" />
                                </TouchableOpacity> */}

                                <TouchableOpacity
                                    style={styles.deleteAccountButton}
                                    onPress={() => setDeleteModal(true)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#000" />
                                    <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#000" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* Contact Info */}
                    <View style={styles.contactContainer}>
                        <Text style={styles.contactTitle}>Need More Help?</Text>
                        <Text style={styles.contactDescription}>
                            You can also reach us directly at:
                        </Text>
                        <View style={styles.contactItem}>
                            <Ionicons name="mail-outline" size={18} color="#666" />
                            <Text style={styles.contactText}>helpcenter@olyox.com</Text>
                        </View>
                        <View style={styles.contactItem}>
                            <Ionicons name="call-outline" size={18} color="#666" />
                            <Text style={styles.contactText}>+91 01141236789</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Delete Confirmation Modal */}
                {id && userName && (
                    <DeleteConfirmationModal
                        visible={deleteModal}
                        onClose={() => setDeleteModal(false)}
                        onConfirm={() => deleteAccount(id)}
                        userName={userName || 'User'}
                    />
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 0.3,
    },
    placeholder: {
        width: 40,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    guideContainer: {
        backgroundColor: '#F9F9F9',
        padding: 20,
        marginBottom: 8,
    },
    guideHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    guideTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginLeft: 12,
    },
    guideSubtitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
        marginBottom: 20,
    },
    stepsContainer: {
        gap: 16,
    },
    stepCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    stepNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    stepNumberText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        color: '#000',
    },
    stepDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 20,
    },
    formContainer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginLeft: 12,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#000',
    },
    messageContainer: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        backgroundColor: '#FAFAFA',
        padding: 14,
        minHeight: 120,
    },
    messageInput: {
        fontSize: 15,
        color: '#000',
        textAlignVertical: 'top',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    uploadButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    screenshotPreview: {
        marginBottom: 20,
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    screenshot: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    removeScreenshot: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FFF',
        borderRadius: 14,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#666',
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        height: 8,
        backgroundColor: '#F5F5F5',
    },
    accountActionsContainer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    logoutButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginLeft: 12,
        flex: 1,
    },
    deleteAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 16,
        paddingHorizontal: 16,

    },
    deleteAccountButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginLeft: 12,
        flex: 1,
    },
    contactContainer: {
        padding: 20,
        backgroundColor: '#F9F9F9',
        marginTop: 8,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    contactDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    contactText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    deleteModalContainer: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 400,
    },
    deleteModalHeader: {
        padding: 30,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    deleteModalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
        marginTop: 12,
    },
    deleteModalContent: {
        padding: 24,
    },
    deleteModalMessage: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
        marginBottom: 12,
    },
    deleteModalSubMessage: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    benefitsList: {
        marginBottom: 0,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#F5F5F5',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    benefitText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#333',
        flex: 1,
        fontWeight: '500',
    },
    deleteModalActions: {
        padding: 24,
        paddingTop: 0,
    },
    stayButton: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    stayButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    confirmDeleteButton: {
        backgroundColor: '#FFF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    confirmDeleteText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
});