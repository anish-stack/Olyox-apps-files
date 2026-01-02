import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  TextInput,
  Dimensions
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Switch } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const ITEMS_PER_PAGE = 4;
const windowWidth = Dimensions.get('window').width;

const AllCustomTiffins = () => {
  const navigation = useNavigation();
  const [allCustomTiffins, setAllCustomTiffins] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleFetchTiffin = async () => {
    setLoading(true);
    setError(null);
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (!storedToken) {
        navigation.replace('Login');
        return;
      }
      const { data } = await axios.get(
        'https://appapi.olyox.com/api/v1/tiffin/get_custom_tiffin_by_resutrant_id',
        {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        }
      );
      setAllCustomTiffins(data.data.reverse());
    } catch (error) {
      setError('Failed to fetch tiffin data. Please try again.');
      console.log("Internal server error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    handleFetchTiffin();
  }, []);

  useEffect(() => {
    handleFetchTiffin();
  }, []);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Tiffin Plan',
      'Are you sure you want to delete this tiffin plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`https://appapi.olyox.com/api/v1/tiffin/delete_custom_tiffin/${id}`);
              handleFetchTiffin();
              Alert.alert('Success', 'Tiffin plan deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete tiffin plan');
            }
          }
        }
      ]
    );
  };

  const handleUpdateTiffinAvailability = async (id, food_availability) => {
    try {
      const updated = !food_availability;
      const response = await axios.put(
        `https://appapi.olyox.com/api/v1/tiffin/update_tiffin_availability/${id}`,
        { food_availability: updated }
      );
      if (response.status === 200) {
        handleFetchTiffin();
        Alert.alert('Success', 'Tiffin availability updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update tiffin availability');
    }
  };

  // Filter and sort the tiffins
  const filteredAndSortedTiffins = allCustomTiffins
    .filter(tiffin => 
      tiffin.packageName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tiffin.duration.toString().includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.packageName?.localeCompare(b.packageName || '');
      }
      return b.packageName?.localeCompare(a.packageName || '');
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedTiffins.length / ITEMS_PER_PAGE);
  const paginatedTiffins = filteredAndSortedTiffins.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Custom Tiffin Plans</Text>
      <TouchableOpacity 
        onPress={() => navigation.navigate('Customize Tiffine Plan')} 
        style={styles.addButton}
      >
        <Icon name="plus" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Plan</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Icon name="magnify" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search plans..."
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

  const MealSection = ({ title, meal, icon }) => {
    if (!meal?.enabled || !meal?.items?.length) return null;

    return (
      <View style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <Icon name={icon} size={20} color="#1976D2" />
          <Text style={styles.mealTitle}>{title}</Text>
        </View>
        {meal.items.map((item, index) => (
          <View key={index} style={styles.mealItem}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTiffinCard = (tiffin) => (
    <View key={tiffin._id} style={styles.card}>
      <View style={styles.cardHeader}>
        {tiffin.images?.url && (
          <Image
            source={{ uri: tiffin.images.url }}
            style={styles.tiffinImage}
          />
        )}
        <View style={styles.headerContent}>
          <View style={styles.durationBadge}>
            <Icon name="calendar-clock" size={16} color="#1976D2" />
            <Text style={styles.durationText}>{tiffin.duration} Days</Text>
          </View>
          {tiffin.packageName && (
            <Text style={styles.packageName}>{tiffin.packageName}</Text>
          )}
          <Text style={styles.totalPrice}>₹{tiffin.totalPrice}</Text>
        </View>
      </View>

      <View style={styles.preferencesContainer}>
        <View style={styles.preferenceBadge}>
          <Icon
            name={tiffin.preferences.isVeg ? "leaf" : "food"}
            size={14}
            color={tiffin.preferences.isVeg ? "#4CAF50" : "#FF9800"}
          />
          <Text style={styles.preferenceText}>
            {tiffin.preferences.isVeg ? "Veg" : "Non-Veg"}
          </Text>
        </View>
        <View style={styles.preferenceBadge}>
          <Icon name="fire" size={14} color="#F44336" />
          <Text style={styles.preferenceText}>
            {tiffin.preferences.spiceLevel.charAt(0).toUpperCase() +
              tiffin.preferences.spiceLevel.slice(1)} Spice
          </Text>
        </View>
        <View style={styles.preferenceBadge}>
          <Icon
            name={tiffin.preferences.includeWeekends ? "calendar-check" : "calendar-remove"}
            size={14}
            color="#673AB7"
          />
          <Text style={styles.preferenceText}>
            {tiffin.preferences.includeWeekends ? "Includes" : "Excludes"} Weekends
          </Text>
        </View>
      </View>

      <View style={styles.mealsContainer}>
        <MealSection
          title="Breakfast"
          meal={tiffin.meals.breakfast}
          icon="coffee-outline"
        />
        <MealSection
          title="Lunch"
          meal={tiffin.meals.lunch}
          icon="food-outline"
        />
        <MealSection
          title="Dinner"
          meal={tiffin.meals.dinner}
          icon="food-turkey"
        />
      </View>

      <View style={styles.cardActions}>
        <View style={styles.availabilitySwitch}>
          <Switch
            value={tiffin.food_availability}
            onValueChange={() => handleUpdateTiffinAvailability(tiffin._id, tiffin.food_availability)}
          />
          <Text style={[
            styles.availabilityText,
            { color: tiffin.food_availability ? '#4CAF50' : '#F44336' }
          ]}>
            {tiffin.food_availability ? 'Available' : 'Unavailable'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(tiffin._id)}
        >
          <Icon name="delete" size={20} color="#F44336" />
        </TouchableOpacity>
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
        <TouchableOpacity style={styles.retryButton} onPress={handleFetchTiffin}>
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.cardsContainer}>
          {paginatedTiffins.map(renderTiffinCard)}
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
    fontSize: 18,
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
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  tiffinImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  durationText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  preferencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  preferenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  preferenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  mealsContainer: {
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  mealSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  itemName: {
    fontSize: 13,
    color: '#666',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4CAF50',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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

export default AllCustomTiffins;