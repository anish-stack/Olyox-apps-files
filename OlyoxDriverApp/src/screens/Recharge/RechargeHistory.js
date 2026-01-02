import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import loginStore from '../../../Store/authStore';
import useUserStore from '../../../Store/useUserStore';

const colors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  primary: '#1F2937',
  secondary: '#E0E0E0',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#991B1B',
  success: '#16A34A',
  pending: '#F59E0B',
  border: '#D1D5DB',
};

const TransactionCard = ({ item }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.transactionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{item.member_id.title}</Text>
          <Text style={styles.validity}>
            {item.member_id.validityDays} {item.member_id.whatIsThis}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>Valid till: {formatDate(item.end_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="receipt" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>Transaction ID: {item.trn_no}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons
            name={item.payment_approved ? 'check-circle' : 'clock-outline'}
            size={16}
            color={item.payment_approved ? colors.success : colors.pending}
          />
          <Text style={[styles.detailText, { color: item.payment_approved ? colors.success : colors.pending }]}>
            {item.payment_approved ? 'Payment Approved' : 'Pending Approval'}
          </Text>
        </View>
      </View>

      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>Purchased on {formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
};

export default function RechargeHistory() {
  const navigation = useNavigation();
  const { user, fetchUserDetails } = useUserStore();
  const { token } = loginStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rechargeData, setRechargeData] = useState([]);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchUserDetails();
      await fetchBh();
    } catch (err) {
      setError('Failed to load recharge history');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBh = async () => {
    if (!token) {
      throw new Error('No authentication token found');
    }
    if (user?.BH) {
      const response = await axios.get(`https://webapi.olyox.com/api/v1/get-recharge?_id=${user.BH}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRechargeData(response.data.data || []);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your recharge history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recharge History</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={colors.accent} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recharge History</Text>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.subHeader}>
        <Text style={styles.headerSubtitle}>View your past transactions</Text>
      </View>

      <FlatList
        data={rechargeData}
        renderItem={({ item }) => <TransactionCard item={item} />}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No recharge history found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  headerRight: {
    width: 40,
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  validity: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  amountContainer: {
    backgroundColor: colors.secondary,
    padding: 8,
    borderRadius: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
  },
  dateContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});