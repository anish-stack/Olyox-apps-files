import React, { useState, useCallback, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    Alert,
    ScrollView,
    Animated,
    Dimensions
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { find_me } from '../../utils/helpers';

const { width } = Dimensions.get('window');

const RatingReservations = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { id } = route.params || {};
    
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [reviewerId, setReviewerId] = useState(id);
    const [rideId, setRideId] = useState(null);
    const [scaleAnim] = useState(new Animated.Value(1));

    // Fetch ride data
    const fetchRideData = useCallback(async () => {
        try {
            const data = await find_me();
            const ride = data?.user?.IntercityRide?._id || null;
            const reviewer = data?.user?._id || null;

            setRideId(ride || id);
            setReviewerId(reviewer);

            return { ride, reviewer };
        } catch (error) {
            console.error('Error fetching ride data:', error);
            return null;
        }
    }, [id]);

    useEffect(() => {
        fetchRideData();
    }, [fetchRideData]);

    // Reset all states
    const resetStates = useCallback(() => {
        setRating(0);
        setComment('');
        setLoading(false);
    }, []);


    const navigateToHome = useCallback(() => {
        resetStates();
       navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }, [navigation, resetStates]);

    // Submit review with enhanced UX
    const submitReview = async () => {
        if (!rating) {
            Alert.alert('Rating Required', 'Please select a star rating before submitting.');
            return;
        }

        // Animate button press
        Animated.sequence([
            Animated.timing(scaleAnim, { duration: 100, toValue: 0.95, useNativeDriver: true }),
            Animated.timing(scaleAnim, { duration: 100, toValue: 1, useNativeDriver: true }),
        ]).start();

        try {
            setLoading(true);
            const response = await axios.post(
                'https://www.appv2.olyox.com/api/v1/new/rate-your-ride-intercity',
                {
                    reviewerId,
                    rating,
                    comment,
                    rideId,
                }
            );

            if (response.data.success) {
                Alert.alert(
                    'Thank You! 🎉',
                    'Your feedback has been submitted successfully!',
                    [
                        {
                            text: 'Continue',
                            onPress: navigateToHome,
                            style: 'default'
                        }
                    ]
                );
            } else {
                Alert.alert('Submission Failed', response.data.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting review:', error.response.data);
            Alert.alert(
                'Network Error',
                'Failed to submit review. Please check your connection and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    // Enhanced star rendering with animations
    const renderStars = () => {
        return [1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity 
                key={star} 
                onPress={() => setRating(star)}
                style={styles.starButton}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.star, 
                    rating >= star ? styles.starSelected : styles.starUnselected
                ]}>
                    ★
                </Text>
            </TouchableOpacity>
        ));
    };

    // Rating labels
    const getRatingLabel = () => {
        const labels = {
            1: 'Poor',
            2: 'Fair',
            3: 'Good',
            4: 'Very Good',
            5: 'Excellent'
        };
        return rating > 0 ? labels[rating] : 'Tap a star to rate';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.heading}>Rate Your Experience</Text>
                    <Text style={styles.subheading}>How was your ride with us?</Text>
                </View>

                {/* Rating Card */}
                <View style={styles.ratingCard}>
                    <View style={styles.starsContainer}>
                        {renderStars()}
                    </View>
                    
                    <Text style={[
                        styles.ratingLabel,
                        rating > 0 && styles.ratingLabelActive
                    ]}>
                        {getRatingLabel()}
                    </Text>
                </View>

                {/* Comment Section */}
                <View style={styles.commentSection}>
                    <Text style={styles.commentLabel}>Share your feedback (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Tell us about your experience..."
                        placeholderTextColor="#999"
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                    />
                    <Text style={styles.characterCount}>{comment.length}/500</Text>
                </View>

                {/* Submit Button */}
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity
                        style={[
                            styles.button, 
                            loading && styles.buttonDisabled,
                            !rating && styles.buttonInactive
                        ]}
                        onPress={submitReview}
                        disabled={loading || !rating}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.buttonText,
                            (!rating || loading) && styles.buttonTextDisabled
                        ]}>
                            {loading ? 'Submitting...' : 'Submit Review'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Your feedback helps us improve our service
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 20,
    },
    heading: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 8,
    },
    subheading: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    ratingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    starButton: {
        padding: 8,
        marginHorizontal: 4,
    },
    star: {
        fontSize: 36,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    starSelected: {
        color: '#e74c3c',
    },
    starUnselected: {
        color: '#e0e0e0',
    },
    ratingLabel: {
        fontSize: 16,
        color: '#999',
        fontWeight: '500',
    },
    ratingLabelActive: {
        color: '#e74c3c',
        fontWeight: '600',
    },
    commentSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    commentLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: '#f9f9f9',
        color: '#333',
        marginBottom: 8,
        fontFamily: 'System',
    },
    characterCount: {
        alignSelf: 'flex-end',
        fontSize: 12,
        color: '#999',
    },
    button: {
        backgroundColor: '#e74c3c',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#e74c3c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        backgroundColor: '#bbb',
        shadowOpacity: 0.1,
    },
    buttonInactive: {
        backgroundColor: '#ddd',
        shadowOpacity: 0.1,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    buttonTextDisabled: {
        color: '#888',
    },
    footer: {
        textAlign: 'center',
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
    },
});

export default RatingReservations;