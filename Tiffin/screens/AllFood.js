import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { Switch } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ITEMS_PER_PAGE = 10;
const windowWidth = Dimensions.get('window').width;

const AllFood = () => {
  const navigation = useNavigation();
  const [allFood, setAllFood] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const handleFetchFood = async () => {
    setLoading(true);
    setError(null);
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (!storedToken) {
        navigation.replace('Login');
        return;
      }
      const { data } = await axios.get(
        'https://appapi.olyox.com/api/v1/tiffin/get_food_by_resutrant_id',
        {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        }
      );
      setAllFood(data.data.reverse());
    } catch (error) {
      setError('Failed to fetch food items. Please try again.');
      console.log('Internal server error', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      handleFetchFood()
      setRefreshing(false);
    }, 2000);
  };



  useEffect(() => {
    handleFetchFood();
  }, [navigation]);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Food',
      'Are you sure you want to delete this food item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`https://appapi.olyox.com/api/v1/tiffin/delete_tiffin_listing/${id}`);
              handleFetchFood();
              Alert.alert('Success', 'Food item deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete food item');
            }
          },
        },
      ]
    );
  };

  const handleUpdateFoodAvailableStatus = async (id, food_availability) => {
    try {
      const updatedStatus = !food_availability;
      const res = await axios.put(
        `https://appapi.olyox.com/api/v1/tiffin/update_available_food_status/${id}`,
        { food_availability: updatedStatus }
      );
      if (res.data.success) {
        Alert.alert('Success', 'Food availability updated successfully');
        handleFetchFood();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update food availability');
    }
  };

  // Filter and sort the food items
  const filteredAndSortedFood = allFood
    .filter(item =>
      item.food_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.food_category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.food_name.localeCompare(b.food_name);
      }
      return b.food_name.localeCompare(a.food_name);
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedFood.length / ITEMS_PER_PAGE);
  const paginatedFood = filteredAndSortedFood.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Food Menu</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Add Listing')}
        style={styles.addButton}
      >
        <Icon name="plus" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Icon name="magnify" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
      >
        <Icon
          name={sortOrder === 'asc' ? 'sort-alphabetical-ascending' : 'sort-alphabetical-descending'}
          size={24}
          color="#666"
        />
      </TouchableOpacity>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      <TouchableOpacity
        style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        <Icon name="chevron-left" size={24} color={currentPage === 1 ? "#999" : "#333"} />
      </TouchableOpacity>
      <Text style={styles.pageText}>
        Page {currentPage} of {totalPages}
      </Text>
      <TouchableOpacity
        style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
      >
        <Icon name="chevron-right" size={24} color={currentPage === totalPages ? "#999" : "#333"} />
      </TouchableOpacity>
    </View>
  );

  const renderFoodCard = (item) => (
    <View style={styles.card} key={item._id}>
      <Image
        source={{ uri: item?.images?.url }}
        style={styles.cardImage}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.foodName} numberOfLines={1}>{item.food_name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.food_category}</Text>
          </View>
        </View>

        <Text style={styles.price}>₹{item.food_price}</Text>

        <View style={styles.cardActions}>
          <View style={styles.availabilitySwitch}>
            <Switch
              value={item.food_availability}
              onValueChange={() => handleUpdateFoodAvailableStatus(item._id, item.food_availability)}
            />
            <Text style={[
              styles.availabilityText,
              { color: item.food_availability ? '#4CAF50' : '#F44336' }
            ]}>
              {item.food_availability ? 'Available' : 'Unavailable'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item._id)}
          >
            <Icon name="delete" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleFetchFood}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSearchBar()}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.cardsContainer}>
          {paginatedFood.map(renderFoodCard)}
        </View>
      </ScrollView>

      {renderPagination()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  sortButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    width: (windowWidth - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilitySwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pageButton: {
    padding: 8,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AllFood;