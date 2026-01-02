import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Help = () => {
    const [expandedFaq, setExpandedFaq] = useState(null);

    const supportOptions = [
        {
            title: 'Chat Support',
            description: 'Chat with our support team',
            icon: 'message-text-outline',
            color: '#10b981'
        },
        {
            title: 'Call Us',
            description: 'Talk to our support team',
            icon: 'phone-outline',
            color: '#6366f1'
        },
        {
            title: 'Email Support',
            description: 'Write to our support team',
            icon: 'email-outline',
            color: '#f59e0b'
        }
    ];

    const faqItems = [
        {
            question: 'How do I modify my tiffin subscription?',
            answer: 'You can modify your subscription from the Subscription tab. Changes will be effective from the next day.'
        },
        {
            question: 'What are your delivery timings?',
            answer: 'We deliver lunch tiffins between 11:30 AM - 1:00 PM and dinner tiffins between 7:00 PM - 8:30 PM.'
        },
        {
            question: 'How can I pause my tiffin delivery?',
            answer: 'Go to Active Subscriptions and use the pause option. Please notify us 12 hours before delivery time.'
        },
        {
            question: 'Do you provide special diet options?',
            answer: 'Yes, we offer vegetarian, non-vegetarian, and special diet meals. You can select your preference while subscribing.'
        }
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Icon name="help-circle-outline" size={48} color="#6366f1" />
                <Text style={styles.title}>How can we help?</Text>
                <Text style={styles.subtitle}>Choose from the options below to get assistance</Text>
            </View>

            <View style={styles.quickHelpContainer}>
                {supportOptions.map((option, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={styles.quickHelpCard}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
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
                    <TouchableOpacity 
                        key={index}
                        style={styles.faqItem}
                        onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    >
                        <View style={styles.faqHeader}>
                            <Icon 
                                name="help-circle-outline" 
                                size={20} 
                                color="#6366f1" 
                                style={styles.faqIcon}
                            />
                            <Text style={styles.question}>{item.question}</Text>
                            <Icon 
                                name={expandedFaq === index ? 'chevron-up' : 'chevron-down'} 
                                size={24} 
                                color="#9ca3af"
                            />
                        </View>
                        {expandedFaq === index && (
                            <Text style={styles.answer}>{item.answer}</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.emergencyContact}>
                <Icon name="phone-in-talk" size={24} color="#dc2626" />
                <View style={styles.emergencyTextContainer}>
                    <Text style={styles.emergencyTitle}>Emergency Contact</Text>
                    <Text style={styles.emergencyDescription}>
                        Need urgent assistance? Call our priority line
                    </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#dc2626" />
            </TouchableOpacity>
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
    },
    quickHelpContainer: {
        padding: 16,
    },
    quickHelpCard: {
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
        marginBottom: 4,
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
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    faqIcon: {
        marginRight: 12,
    },
    question: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    answer: {
        marginTop: 12,
        marginLeft: 32,
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    emergencyContact: {
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
        color: '#dc2626',
    },
    emergencyDescription: {
        fontSize: 12,
        color: '#dc2626',
        opacity: 0.8,
    },
});

export default Help;