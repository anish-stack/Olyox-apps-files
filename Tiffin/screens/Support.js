import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useSettings from '../hooks/Settings';

export function Support () {

    const {settings} = useSettings()

    const supportOptions = [
        {
            title: 'Chat with Us',
            description: 'Get instant help from our support team',
            icon: 'message-text',
            whatsappNumber:settings?.whatsappNumber,
            color: '#10b981'
        },
        {
            title: 'Call Support',
            description: 'Speak directly with a support agent',
            icon: 'phone',
            callNumber:settings?.support_number,
            color: '#6366f1'
        },
        {
            title: 'Email Support',
            description: 'Send us your queries via email',
            icon: 'email',
            emailId:settings?.adminEmail,
            color: '#f59e0b'
        }
    ];


    const handleSupportPress = (option) => {
    if (option.whatsappNumber) {
        const whatsappURL = `https://wa.me/${option.whatsappNumber}`;
        Linking.openURL(whatsappURL);
    } else if (option.callNumber) {
        const phoneURL = `tel:${option.callNumber}`;
        Linking.openURL(phoneURL);
    } else if (option.emailId) {
        const emailURL = `mailto:${option.emailId}`;
        Linking.openURL(emailURL);
    }
};

    const faqItems = [
        {
            question: 'How do I track my order?',
            answer: 'You can track your order in the Orders section of the app.'
        },
        {
            question: 'How can I change my delivery address?',
            answer: 'Go to Profile > Addresses to manage your delivery locations.'
        },
        {
            question: 'What payment methods do you accept?',
            answer: 'We accept credit cards, debit cards, and digital wallets.'
        }
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Icon name="headphones" size={48} color="#6366f1" />
                <Text style={styles.title}>How can we help you?</Text>
                <Text style={styles.subtitle}>Choose from the options below to get assistance</Text>
            </View>

            <View style={styles.supportOptionsContainer}>
                {supportOptions.map((option, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={styles.supportCard}
                         onPress={() => handleSupportPress(option)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                            <Icon name={option.icon} size={28} color={option.color} />
                        </View>
                        <Text style={styles.optionTitle}>{option.title}</Text>
                        <Text style={styles.optionDescription}>{option.description}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.faqSection}>
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                {faqItems.map((item, index) => (
                    <View key={index} style={styles.faqItem}>
                        <View style={styles.questionContainer}>
                            <Icon name="help-circle" size={20} color="#6366f1" />
                            <Text style={styles.question}>{item.question}</Text>
                        </View>
                        <Text style={styles.answer}>{item.answer}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.emergencySupport}>
                <Icon name="alert-circle" size={24} color="#ef4444" />
                <View style={styles.emergencyTextContainer}>
                    <Text style={styles.emergencyTitle}>Emergency Support</Text>
                    <Text style={styles.emergencyDescription}>
                        Need urgent help? Call our 24/7 emergency support line
                    </Text>
                </View>
                <TouchableOpacity onPress={()=>Linking.openURL(`tel:${settings.support_number}`)} style={styles.emergencyButton}>
                    <Icon name="phone" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    supportOptionsContainer: {
        padding: 16,
    },
    supportCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    optionDescription: {
        fontSize: 14,
        color: '#6b7280',
    },
    faqSection: {
        padding: 16,
        backgroundColor: '#f8fafc',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    faqItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    questionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginLeft: 8,
        flex: 1,
    },
    answer: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 28,
    },
    emergencySupport: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    emergencyTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    emergencyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    emergencyDescription: {
        fontSize: 12,
        color: '#ef4444',
        opacity: 0.8,
    },
    emergencyButton: {
        backgroundColor: '#ef4444',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});