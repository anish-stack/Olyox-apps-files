import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ToastAndroid,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useGetCoupons from '../../hooks/GetUnlockCopons';

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

const CouponCard = ({ item, onCopyCode }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const expirationDate = formatDate(item.expirationDate);

  return (
    <View style={styles.couponContainer}>
      <View style={styles.couponHeader}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.textSecondary }]} />
          <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={() => onCopyCode(item.code)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="content-copy" size={16} color={colors.surface} />
          <Text style={styles.copyText}>Copy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.couponBody}>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Code:</Text>
          <Text style={styles.codeValue}>{item.code}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <FontAwesome name="percent" size={14} color={colors.textSecondary} style={styles.icon} />
            <Text style={styles.detailLabel}>Discount:</Text>
            <Text style={styles.detailValue}>{item.discount}%</Text>
          </View>

          <View style={styles.detailItem}>
            <Feather name="calendar" size={14} color={colors.textSecondary} style={styles.icon} />
            <Text style={styles.detailLabel}>Expires:</Text>
            <Text style={styles.detailValue}>{expirationDate}</Text>
          </View>
        </View>

        {item?.isUsed && (
          <View style={styles.usedContainer}>
            <Text style={styles.usedText}>This coupon has already been used.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default function UnlockCoupons() {
  const navigation = useNavigation();
  const { coupons, loading, refresh } = useGetCoupons();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleCopyCode = (code) => {
    Clipboard.setString(code);
    ToastAndroid.show('Coupon code copied!', ToastAndroid.SHORT);
  };

  const renderCouponItem = ({ item }) => <CouponCard item={item} onCopyCode={handleCopyCode} />;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading coupons...</Text>
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
        <Text style={styles.headerTitle}>Unlock Coupons</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={coupons}
        renderItem={renderCouponItem}
        keyExtractor={(item, index) => item._id || index.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="ticket-percent-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No coupons available</Text>
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
    backgroundColor: colors.primaryLight,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  couponContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  copyText: {
    color: colors.surface,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  couponBody: {
    padding: 16,
  },
  codeContainer: {
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: colors.text,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  usedContainer: {
    backgroundColor: colors.textSecondary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  usedText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
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