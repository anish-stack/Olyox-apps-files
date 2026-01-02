import React, { useEffect, useMemo } from 'react';
import { 
    View, 
    Text, 
    Pressable, 
    ActivityIndicator, 
    ScrollView, 
    StyleSheet,
    Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import usePastRides from '../../hooks/PastRides';

const LocationSuggestions = ({ state, pastRideSuggestions, onSelectLocation }) => {
    const { rides, loading: ridesLoading, fetchData } = usePastRides();
    
    const isPickup = state.activeInput === 'pickup';

    console.log('=== LocationSuggestions Debug ===');
    console.log('rides:', rides);
    console.log('ridesLoading:', ridesLoading);
    console.log('isPickup:', isPickup);

    // Fetch past rides on component mount
    useEffect(() => {
        console.log('Fetching past rides data...');
        fetchData();
    }, []);

    // Get unique past rides from hook data
    const pastRides = useMemo(() => {
        console.log('Processing past rides...');
        console.log('rides length:', rides?.length);
        
        if (!rides || rides.length === 0) {
            console.log('No rides available');
            return [];
        }
        
        // Extract addresses and remove duplicates
        const addressMap = new Map();
        
        rides.forEach((ride, index) => {
            const address = isPickup 
                ? ride.pickup_address?.formatted_address 
                : ride.drop_address?.formatted_address;
            
            const coordinates = isPickup
                ? ride.pickup_address?.coordinates
                : ride.drop_address?.coordinates;
            
            console.log(`Ride ${index}:`, {
                address,
                coordinates,
                pickup: ride.pickup_address,
                drop: ride.drop_address
            });
            
            if (address && !addressMap.has(address)) {
                addressMap.set(address, {
                    description: address,
                    coordinates: coordinates
                });
            }
        });
        
        const uniqueRides = Array.from(addressMap.values());
        console.log('Unique past rides:', uniqueRides.length);
        console.log('Past rides data:', uniqueRides);
        
        return uniqueRides;
    }, [rides, isPickup]);

    const renderPastRideSuggestions = () => {
        if (ridesLoading) {
            return (
                <View style={styles.section}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#000000" />
                        <Text style={styles.loadingText}>Loading past rides...</Text>
                    </View>
                </View>
            );
        }

        if (!pastRides || pastRides.length === 0) return null;

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Icon 
                        name="history" 
                        size={18} 
                        color="#666666" 
                    />
                    <Text style={styles.sectionTitle}>
                        {isPickup ? 'Recent Pickups' : 'Recent Drop-offs'}
                    </Text>
                </View>

                <View style={styles.itemsContainer}>
                    {pastRides.slice(0, 5).map((item, index) => {
                        const mainLocation = item.description.split(',')[0].trim();
                        const subLocation = item.description.split(',').slice(1, 3).join(',').trim();
                        
                        return (
                            <Pressable
                                key={`past-${index}`}
                                style={({ pressed }) => [
                                    styles.suggestionItem,
                                    pressed && styles.suggestionItemPressed
                                ]}
                                onPress={() => onSelectLocation(item.description, item.coordinates)}
                                android_ripple={{ 
                                    color: '#F0F0F0',
                                    borderless: false 
                                }}
                            >
                                <View style={styles.iconContainer}>
                                    <Icon 
                                        name="clock-outline" 
                                        size={20} 
                                        color="#000000" 
                                    />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text numberOfLines={1} style={styles.primaryText}>
                                        {mainLocation}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.secondaryText}>
                                        {subLocation || 'Previous location'}
                                    </Text>
                                </View>
                                <Icon 
                                    name="arrow-top-left" 
                                    size={16} 
                                    color="#AAAAAA" 
                                />
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderSuggestions = () => {
        if (state.suggestions.length === 0) return null;

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Icon 
                        name="map-search" 
                        size={18} 
                        color="#666666" 
                    />
                    <Text style={styles.sectionTitle}>Search Results</Text>
                </View>

                <View style={styles.itemsContainer}>
                    {state.suggestions.map((suggestion, index) => {
                        const mainLocation = suggestion.description.split(',')[0].trim();
                        const subLocation = suggestion.description.split(',').slice(1, 3).join(',').trim();
                        
                        return (
                            <Pressable
                                key={`suggestion-${index}`}
                                style={({ pressed }) => [
                                    styles.suggestionItem,
                                    pressed && styles.suggestionItemPressed
                                ]}
                                onPress={() => onSelectLocation(suggestion.description)}
                                android_ripple={{ 
                                    color: '#F0F0F0',
                                    borderless: false 
                                }}
                            >
                                <View style={styles.iconContainer}>
                                    <Icon 
                                        name="map-marker" 
                                        size={20} 
                                        color="#000000" 
                                    />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text numberOfLines={1} style={styles.primaryText}>
                                        {mainLocation}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.secondaryText}>
                                        {subLocation}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderSearchLoading = () => {
        if (!state.loading || state.suggestions.length > 0) return null;

        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#000000" />
                <Text style={styles.loadingText}>Searching locations...</Text>
            </View>
        );
    };

    const renderEmptyState = () => {
        if (ridesLoading || state.loading || state.suggestions.length > 0 || (pastRides && pastRides.length > 0)) {
            return null;
        }

        return (
            <View style={styles.emptyContainer}>
                <Icon 
                    name="map-marker-question-outline" 
                    size={48} 
                    color="#CCCCCC" 
                />
                <Text style={styles.emptyTitle}>No locations found</Text>
                <Text style={styles.emptySubtitle}>
                    Try searching for a different location
                </Text>
            </View>
        );
    };

    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {/* Search Loading State */}
            {renderSearchLoading()}

            {/* Past Rides First (when no suggestions) */}
            {state.suggestions.length === 0 && renderPastRideSuggestions()}

            {/* Search Results */}
            {renderSuggestions()}

            {/* Empty State */}
            {renderEmptyState()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemsContainer: {
        gap: 8,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    suggestionItemPressed: {
        backgroundColor: '#F8F8F8',
        transform: [{ scale: 0.98 }],
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        gap: 2,
    },
    primaryText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000000',
    },
    secondaryText: {
        fontSize: 13,
        color: '#666666',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#999999',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#AAAAAA',
        textAlign: 'center',
    },
});

export default LocationSuggestions;