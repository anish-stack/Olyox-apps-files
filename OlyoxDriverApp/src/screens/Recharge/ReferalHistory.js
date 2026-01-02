import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import useUserStore from '../../../Store/useUserStore';
import loginStore from '../../../Store/authStore';

const colors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  primary: '#1F2937',
  secondary: '#E0E0E0',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#991B1B',
  success: '#16A34A',
  border: '#D1D5DB',
};

const levels = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Level7'];

const ReferralCard = ({ item, index }) => {
  const isRechargeDone = item?.payment_id?.end_date
    ? new Date(item.payment_id.end_date) > new Date()
    : false;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <MaterialCommunityIcons name="gift" size={18} color={colors.surface} />
        </View>
        <Text style={styles.cardTitle}>Referral #{index + 1}</Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="account" size={18} color={colors.primary} />
          <Text style={styles.cardLabel}>Name:</Text>
          <Text style={styles.cardText}>{item.name || 'N/A'}</Text>
        </View>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="share" size={18} color={colors.success} />
          <Text style={styles.cardLabel}>BHID:</Text>
          <Text style={styles.cardText}>{item.bhId || 'N/A'}</Text>
        </View>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="phone" size={18} color={colors.accent} />
          <Text style={styles.cardLabel}>Phone:</Text>
          <Text style={styles.cardText}>{item.number || 'N/A'}</Text>
        </View>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="credit-card" size={18} color={colors.primary} />
          <Text style={styles.cardLabel}>Plan:</Text>
          <Text style={styles.cardText}>{isRechargeDone ? 'Recharge Done' : 'Recharge Not Done'}</Text>
        </View>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="tag" size={18} color={colors.primary} />
          <Text style={styles.cardLabel}>Category:</Text>
          <Text style={styles.cardText}>{item?.category?.title || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, isRechargeDone ? styles.activeBadge : styles.inactiveBadge]}>
          <MaterialCommunityIcons
            name={isRechargeDone ? 'check' : 'close'}
            size={12}
            color={colors.surface}
          />
          <Text style={styles.statusText}>{isRechargeDone ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
    </View>
  );
};

export default function ReferralHistory() {
  const navigation = useNavigation();
  const { user, fetchUserDetails } = useUserStore();
  const { token } = loginStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [activeLevelTab, setActiveLevelTab] = useState('Level1');
  const [error, setError] = useState(null);
  const [totalReferral, setTotalReferral] = useState(0);
  const [searchText, setSearchText] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setRefreshing(true);

    try {
      if (!token) throw new Error('Authentication token not found. Please login again.');
      await fetchUserDetails();
      if (!user?.BH) throw new Error('Partner information not found');

      const response = await axios.get(
        `https://webapi.olyox.com/api/v1/get-my-all-referral-history`,
        { params: { Bh: user?.BH }, headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data?.data[0] || [];
      const totalUnique = response.data?.totalReferral || data.length;
      setReferrals(data);
      setTotalReferral(totalUnique);
      setError(data.length === 0 ? 'No referral data available' : null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load referral data.');
      console.error('Error fetching referral data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and sort referrals: active first, then apply search
  const filteredReferrals = (referrals?.[activeLevelTab] || [])
    .filter(item => {
      const search = searchText.toLowerCase();
      return (
        item.name?.toLowerCase().includes(search) ||
        item.number?.toLowerCase().includes(search) ||
        item.bhId?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const isRechargeDoneA = a?.payment_id?.end_date
        ? new Date(a.payment_id.end_date) > new Date()
        : false;
      const isRechargeDoneB = b?.payment_id?.end_date
        ? new Date(b.payment_id.end_date) > new Date()
        : false;
      return isRechargeDoneB - isRechargeDoneA; // Active (true) before inactive (false)
    });

  const renderLevelTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabContainer}
    >
      {levels.map((level) => (
        <TouchableOpacity
          key={level}
          style={[styles.tabButton, activeLevelTab === level && styles.activeTabButton]}
          onPress={() => setActiveLevelTab(level)}
        >
          <Text style={[styles.tabText, activeLevelTab === level && styles.activeTabText]}>{level}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading referrals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={60} color={colors.accent} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
            <MaterialCommunityIcons name="refresh" size={16} color={colors.surface} />
            <Text style={styles.refreshButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referral History ({totalReferral || 0})</Text>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Name, Number, BHID"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {renderLevelTabs()}

      <FlatList
        data={filteredReferrals}
        renderItem={({ item, index }) => <ReferralCard item={item} index={index} />}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image
              source={{ uri: 'https://img.freepik.com/free-vector/referral-program-abstract-concept-vector-illustration_335657-2939.jpg' }}
              style={styles.emptyImage}
            />
            <Text style={styles.emptyText}>No referrals found for {activeLevelTab}</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
              <MaterialCommunityIcons name="refresh" size={16} color={colors.surface} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.surface,
    textAlign: 'center',
  },
  headerRight: { width: 40 },
  tabScrollView: {
    marginBottom: 10,
    maxHeight: 80,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  tabContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  tabButton: {
    paddingVertical: 5,
    height:30,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    marginRight: 10,
  },
  activeTabButton: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  activeTabText: { color: colors.surface },
  listContainer: { padding: 16, paddingBottom: 20 ,marginVertical:10 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: colors.surface,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.secondary,
  },
  badgeContainer: {
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  cardContent: {
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 8,
    width: 70,
  },
  cardText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  cardFooter: {
    padding: 12,
    backgroundColor: colors.secondary,
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
    backgroundColor: colors.success,
  },
  inactiveBadge: {
    backgroundColor: colors.accent,
  },
  statusText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,

    marginHorizontal: 16,
    marginBottom: 10,
marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
  },
});