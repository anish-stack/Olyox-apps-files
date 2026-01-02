import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderNewUser from './HeaderNewHomeScreen';
import BottomTabs from './BottomTabs';

const NOTIFICATION_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const STORAGE_KEY = '@notifications_storage';

export default function NotificationsScreens() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load notifications from AsyncStorage on mount
        loadNotifications();

        // Listener for foreground notifications
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('Received notification:', notification);

            const newNotification = {
                request: {
                    content: {
                        title: notification.request.content.title,
                        body: notification.request.content.body,
                        data: notification.request.content.data,
                    },
                    identifier: notification.request.identifier,
                },
                timestamp: Date.now(),
                id: notification.request.identifier
            };

            // Check for duplicates and add notification
            addNotification(newNotification);
        });

        // Listener for response when user taps on notification
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);
        });

        // Auto-clear expired notifications every minute
        const clearInterval = setInterval(() => {
            clearExpiredNotifications();
        }, 60000); // Check every minute

        return () => {
            subscription.remove();
            responseSubscription.remove();

        };
    }, []);

    // Load notifications from AsyncStorage
    const loadNotifications = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Filter out expired notifications on load
                const now = Date.now();
                const validNotifications = parsed.filter(n => (now - n.timestamp) < NOTIFICATION_EXPIRY_TIME);
                setNotifications(validNotifications);

                // Update storage if any were filtered
                if (validNotifications.length !== parsed.length) {
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validNotifications));
                }
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Save notifications to AsyncStorage
    const saveNotifications = async (notifs) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
        } catch (error) {
            console.error('Error saving notifications:', error);
        }
    };

    // Add new notification (check for duplicates)
    const addNotification = (newNotification) => {
        setNotifications(prev => {
            const isDuplicate = prev.some(n =>
                n.request.content.title === newNotification.request.content.title &&
                n.request.content.body === newNotification.request.content.body
            );

            if (isDuplicate) {
                console.log('Duplicate notification ignored');
                return prev;
            }

            const updated = [newNotification, ...prev];

            // Save to AsyncStorage
            saveNotifications(updated).then(() => {
                console.log('✅ Notification saved to AsyncStorage');
            });

            return updated;
        });
    };

    // Clear expired notifications
    const clearExpiredNotifications = () => {
        setNotifications(prev => {
            const now = Date.now();
            const filtered = prev.filter(n => (now - n.timestamp) < NOTIFICATION_EXPIRY_TIME);

            if (filtered.length !== prev.length) {
                console.log(`Cleared ${prev.length - filtered.length} expired notifications`);

                // Save to AsyncStorage
                saveNotifications(filtered).then(() => {
                    console.log('✅ Expired notifications cleared from AsyncStorage');
                });
            }

            return filtered;
        });
    };

    const clearAllNotifications = () => {
        setNotifications([]);
        saveNotifications([]).then(() => {
            console.log('✅ All notifications cleared from AsyncStorage');
        });
    };

    const deleteNotification = (id) => {
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);

            // Save to AsyncStorage
            saveNotifications(updated).then(() => {
                console.log('✅ Notification deleted from AsyncStorage');
            });

            return updated;
        });
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins} min${mins > 1 ? 's' : ''} ago`;
        } else if (diff < NOTIFICATION_EXPIRY_TIME) {
            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            return `${hours}h ${mins}m ago`;
        }

        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const uniqueNotifications = notifications.reduce((uniqueNotifs, notif) => {
        const title = notif?.request?.content?.title || notif.title || 'No Title';
        const body = notif?.request?.content?.body || notif.body || 'No Body';

        const isDuplicate = uniqueNotifs.some(n => {
            const nTitle = n?.request?.content?.title || n.title || 'No Title';
            const nBody = n?.request?.content?.body || n.body || 'No Body';
            return nTitle === title && nBody === body;
        });

        if (!isDuplicate) {
            uniqueNotifs.push(notif);
        }

        return uniqueNotifs;
    }, []);


    return (
        <SafeAreaView style={styles.container}>
            <HeaderNewUser showBack={true} isShowThis={false} />

            {/* Header with Clear All button */}
            {uniqueNotifications.length > 0 && (
                <View style={styles.headerBar}>
                    <Text style={styles.headerText}>
                        {uniqueNotifications.length} Notification{uniqueNotifications.length > 1 ? 's' : ''}
                    </Text>
                    <TouchableOpacity onPress={clearAllNotifications} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.loadingText}>Loading notifications...</Text>
                    </View>
                ) : uniqueNotifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
                        <Text style={styles.noNotifications}>No notifications yet</Text>
                        <Text style={styles.emptySubtext}>
                            You'll see your notifications here
                        </Text>
                    </View>
                ) : (
                    notifications.reduce((uniqueNotifs, notif) => {
                        const title = notif?.request?.content?.title || notif.title || 'No Title';
                        const body = notif?.request?.content?.body || notif.body || 'No Body';

                        // Check if this title+body combination already exists
                        const isDuplicate = uniqueNotifs.some(n => {
                            const nTitle = n?.request?.content?.title || n.title || 'No Title';
                            const nBody = n?.request?.content?.body || n.body || 'No Body';
                            return nTitle === title && nBody === body;
                        });

                        // Only add if not duplicate
                        if (!isDuplicate) {
                            uniqueNotifs.push(notif);
                        }

                        return uniqueNotifs;
                    }, []).map((notif) => (
                        <View key={notif.id} style={styles.notificationCard}>
                            <View style={styles.notificationHeader}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="notifications" size={20} color="#000" />
                                </View>
                                <View style={styles.notificationContent}>
                                    <Text style={styles.title}>
                                        {notif?.request?.content?.title || notif.title || 'No Title'}
                                    </Text>
                                    <Text style={styles.body}>
                                        {notif?.request?.content?.body || notif.body || 'No Body'}
                                    </Text>
                                    <Text style={styles.timestamp}>
                                        {formatTime(notif.timestamp)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => deleteNotification(notif.id)}
                                    style={styles.deleteButton}
                                >
                                    <Ionicons name="close-circle" size={24} color="#999" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <BottomTabs />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    headerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    clearButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContainer: {
        padding: 16,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    noNotifications: {
        textAlign: 'center',
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    emptySubtext: {
        textAlign: 'center',
        marginTop: 8,
        fontSize: 14,
        color: '#6C757D',
    },
    notificationCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E7F3FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        color: '#000',
        marginBottom: 4,
    },
    body: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 20,
        marginBottom: 6,
    },
    timestamp: {
        fontSize: 12,
        color: '#6C757D',
        marginTop: 4,
    },
    deleteButton: {
        padding: 4,
        marginLeft: 8,
    },
    loadingText: {
        fontSize: 16,
        color: '#6C757D',
        textAlign: 'center',
    },
});