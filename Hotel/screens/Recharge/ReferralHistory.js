import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ITEMS_PER_PAGE = 10;
const LEVELS = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Level7'];

export default function ReferralHistory({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activeLevelTab, setActiveLevelTab] = useState('Level1');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchDetails = useCallback(async (bhId) => {
    try {
      const { data } = await axios.post(
        'https://www.webapi.olyox.com/api/v1/getProviderDetailsByBhId',
        { BhId: bhId }
      );
      //   console.log(data)
      return data.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to fetch details');
    }
  }, []);

  const fetchProfile = useCallback(async (page = 1) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        navigation.replace('Login');
        return;
      }

      const { data } = await axios.get(
        'https://www.appv2.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
   
      if (!data?.data?.restaurant_BHID) {
        throw new Error('Restaurant ID not found');
      }

      setRestaurant(data.data);
      const detailsData = await fetchDetails(data.data.restaurant_BHID);

      // Handle pagination
      const levelData = detailsData[activeLevelTab] || [];
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const paginatedData = {
        ...detailsData,
        [activeLevelTab]: levelData.slice(0, end)
      };

      if (page === 1) {
        setUserData(paginatedData);
      } else {
        setUserData(prev => ({
          ...prev,
          [activeLevelTab]: [...(prev[activeLevelTab] || []), ...paginatedData[activeLevelTab]]
        }));
      }

      setHasMore(end < levelData.length);

    } catch (err) {
      setError({
        message: err.message || 'Failed to load profile',
        code: err.response?.status?.toString()
      });
    }
  }, [navigation, fetchDetails, activeLevelTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    try {
      await fetchProfile(1);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    try {
      await fetchProfile(currentPage + 1);
      setCurrentPage(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, currentPage, fetchProfile]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await fetchProfile(1);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchProfile]);

  useEffect(() => {
    setCurrentPage(1);
    handleRefresh();
  }, [activeLevelTab]);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
        }}
        style={styles.emptyImage}
      />
      <Text style={styles.emptyText}>No referrals found for {activeLevelTab}</Text>
      <TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
        <Icon name="refresh" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Icon name="alert-circle" size={40} color="#f44336" />
      </View>
      <Text style={styles.errorTitle}>Error Loading Data</Text>
      <Text style={styles.errorText}>{error?.message}</Text>
      <TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
        <Icon name="refresh" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading referrals...</Text>
    </View>
  );

  const LevelTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabContainer}
    >
      {LEVELS.map((level) => (
        <TouchableOpacity
          key={level}
          style={[
            styles.tabButton,
            activeLevelTab === level && styles.activeTabButton,
          ]}
          onPress={() => setActiveLevelTab(level)}
        >
          <Text
            style={[
              styles.tabText,
              activeLevelTab === level && styles.activeTabText,
            ]}
          >
            {level}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const ReferralCard = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <Icon name="account" size={20} color="#fff" />
        </View>
        <Text style={styles.cardTitle}>Referral #{index + 1}</Text>
      </View>

      <View style={styles.cardContent}>
        <CardRow icon="account" label="Name" value={item.name} />
        <CardRow icon="identifier" label="BHID" value={item.myReferral} />
        <CardRow icon="phone" label="Phone" value={item.number} />
        <CardRow
          icon="card-account-details"
          label="Plan"
          value={item?.member_id?.title || "Recharge Not Done"}
        />
        <CardRow
          icon="shape"
          label="Category"
          value={item?.category?.title}
        />
      </View>

      <View style={styles.cardFooter}>
        <View
          style={[
            styles.statusBadge,
            item?.plan_status ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Icon name={item?.plan_status ? "check-circle" : "close-circle"} size={16} color="#fff" />
          <Text style={styles.statusText}>
            {item?.plan_status ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
    </View>
  );

  const CardRow = ({ icon, label, value }) => (
    <View style={styles.cardRow}>
      <Icon name={icon} size={20} color="#007AFF" />
      <Text style={styles.cardLabel}>{label}:</Text>
      <Text style={styles.cardText}>{value || "N/A"}</Text>
    </View>
  );

  const LoadMoreButton = () => (
    hasMore && (
      <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Icon name="chevron-down" size={20} color="#fff" />
            <Text style={styles.loadMoreText}>Load More</Text>
          </>
        )}
      </TouchableOpacity>
    )
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name="history" size={24} color="#007AFF" />
          <Text style={styles.heading}>Referral History</Text>
        </View>

        <LevelTabs />

        {loading && !refreshing && currentPage === 1 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#007AFF"]}
                tintColor="#007AFF"
              />
            }
          >
            {userData && userData[activeLevelTab]?.length > 0 ? (
              <>
                {userData[activeLevelTab].map((item, index) => (
                  <ReferralCard key={index} item={item} index={index} />
                ))}
                <LoadMoreButton />
              </>
            ) : (
              <EmptyState />
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  tabScrollView: {
    maxHeight: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
    }),
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 15,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  badgeContainer: {
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardContent: {
    padding: 15,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
    width: 70,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  cardFooter: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: '#28a745',
  },
  inactiveBadge: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyImage: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
    marginBottom: 20,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 20,
  },
  loadMoreText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});