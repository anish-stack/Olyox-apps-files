import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function AllHotelRooms({navigation}) {
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    filterHotels();
  }, [searchQuery, selectedFilter, hotels]);

  const fetchHotels = async () => {
    try {
      const response = await fetch(
        'https://appv2.olyox.com/api/v1/hotels/find-near-by-hotels'
      );
      const data = await response.json();
      
      if (data.success) {
        setHotels(data.data || []);
        setFilteredHotels(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterHotels = () => {
    let filtered = [...hotels];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (hotel) =>
          hotel.room_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          hotel.hotel_user?.hotel_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Room type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(
        (hotel) => hotel.room_type?.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    setFilteredHotels(filtered);
  };

  const FilterButton = ({ title, value }) => (
    <TouchableOpacity
      style={[
        styles.filterBtn,
        selectedFilter === value && styles.filterBtnActive,
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text
        style={[
          styles.filterBtnText,
          selectedFilter === value && styles.filterBtnTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const RoomCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={()=> navigation.navigate("hotel_details",{id:item._id})} activeOpacity={0.9}>
      <Image
        source={{ uri: item.main_image?.url }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.roomType}>{item.room_type}</Text>
          {item.isRoomAvailable && (
            <View style={styles.availableBadge}>
              <Text style={styles.availableText}>available</Text>
            </View>
          )}
        </View>

        {item.hotel_user?.hotel_name && (
          <Text style={styles.hotelName}>{item.hotel_user.hotel_name}</Text>
        )}

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.cutPrice}>₹{item.cut_price}</Text>
            <Text style={styles.bookPrice}>₹{item.book_price}</Text>
          </View>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount_percentage}% off</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>{item.allowed_person} guests</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.infoText}>{item.NumberOfRoomBooks} rooms</Text>
          {item.is_tax_applied && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.infoText}>+₹{item.tax_fair} tax</Text>
            </>
          )}
        </View>

        {item.cancellation_policy && item.cancellation_policy.length > 0 && (
          <Text style={styles.cancellation}>{item.cancellation_policy[0]}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading hotels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hotel rooms</Text>
        <Text style={styles.headerSubtitle}>
          {filteredHotels.length} properties available
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="search by room type or hotel name"
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

    

      {filteredHotels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>no hotels found</Text>
          <Text style={styles.emptySubtext}>try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHotels}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <RoomCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontWeight: '400',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterBtn: {
    height:52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  availableBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availableText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  hotelName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontWeight: '400',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cutPrice: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  bookPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  discountText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  separator: {
    fontSize: 12,
    color: '#ccc',
    marginHorizontal: 6,
  },
  cancellation: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
});