import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { find_me } from '../utils/helpers';

const ActivityScreen = () => {
  const [rides, setRides] = useState({
    normalRides: [],
    intercityRides: [],
    parcelOrder: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('rides');
  const navigation = useNavigation();

  /* --------------------------------------------------------------------- */
  /*  FETCH RIDES                                                          */
  /* --------------------------------------------------------------------- */
  const fetchRides = async () => {
    try {
      const user = await find_me();
      const response = await fetch(
        `https://www.appv2.olyox.com/api/v1/new/get-all-rides-user/${user?.user?._id}`
      );
      const data = await response.json();
      // console.log(data.normalRides[0])ß
      if (data.success) {
        setRides({
          normalRides: data.normalRides || [],
          intercityRides: (data.intercityRides || []).filter(r => r._id),
          parcelOrder: (data.normalRides || []).filter(i => i.isParcelOrder),
        });
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  /* --------------------------------------------------------------------- */
  /*  HELPERS                                                              */
  /* --------------------------------------------------------------------- */
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      case 'scheduled':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  /* --------------------------------------------------------------------- */
  /*  RIDE CARDS                              
   navigation.navigate('RideStarted', {
        rideId: user?.user?.currentRide,
        origin: user?.user?.currentRide?.origin,
        destination: user?.user?.currentRide?.destination,
      }                            */
  /* --------------------------------------------------------------------- */
  const NormalRideCard = ({ ride }) => (
    <TouchableOpacity onPress={() => navigation.navigate('RideStarted', {
      rideId: ride?._id
    })} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rideType}>Normal Ride</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(ride.ride_status || ride.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {(ride.ride_status || ride.status || '').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.locationRow}>
        <Text style={styles.locationLabel}>Pickup:</Text>
        <Text style={styles.locationText}>{ride.pickup_address?.formatted_address}</Text>
      </View>
      <View style={styles.locationRow}>
        <Text style={styles.locationLabel}>Drop:</Text>
        <Text style={styles.locationText}>{ride.drop_address?.formatted_address}</Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Vehicle:</Text>
        <Text style={styles.detailValue}>{ride.vehicle_type?.toUpperCase()}</Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Requested:</Text>
        <Text style={styles.detailValue}>{formatDate(ride.requested_at)}</Text>
      </View>
      {ride.cancellation_reason && (
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Reason:</Text>
          <Text style={styles.detailValue}>{ride.cancellation_reason}</Text>
        </View>
      )}
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Total Fare:</Text>
        <Text style={styles.priceValue}>
          ₹{(ride.pricing?.total_fare || 0).toFixed(2)}
        </Text>
      </View>

      <Text style={styles.rideId}>Ride ID: {ride._id}</Text>
    </TouchableOpacity>
  );

  const IntercityRideCard = ({ ride }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate('IntercityRide', { ride: ride._id })}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rideType}>Intercity Ride</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(ride.ride_status || ride.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {(ride.ride_status || ride.status || '').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Pickup:</Text>
          <Text style={styles.locationText}>{ride.pickup_address?.formatted_address}</Text>
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>Drop:</Text>
          <Text style={styles.locationText}>{ride.drop_address?.formatted_address}</Text>
        </View>


        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total Price:</Text>
          <Text style={styles.priceValue}>
            ₹{(ride.pricing?.total_fare || 0).toFixed(2)}
          </Text>
        </View>

        <Text style={styles.rideId}>Ride ID: {ride._id}</Text>
      </View>
    </TouchableOpacity>
  );

  /* --------------------------------------------------------------------- */
  /*  PARCEL RIDE CARD                                                     */
  /* --------------------------------------------------------------------- */
  const ParcelRideCard = ({ ride }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rideType}>Parcel Delivery</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(ride.ride_status || ride.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {(ride.ride_status || ride.status || '').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />


      {/* Receiver */}
      <View style={styles.locationRow}>
        <Text style={styles.locationLabel}>Receiver:</Text>
        <Text style={styles.locationText}>Name:- {ride.details?.reciver_details?.name || '—'}</Text>
        <Text style={styles.locationText}>Phone:- {ride.details?.reciver_details?.contact_number || '—'}</Text>
        <Text style={styles.locationText}>Reciver Address:- {ride.details?.reciver_details?.appartment || '—'}</Text>

      </View>

      {/* Pickup / Drop */}
      <View style={styles.locationRow}>
        <Text style={styles.locationLabel}>Pickup:</Text>
        <Text style={styles.locationText}>{ride.pickup_address?.formatted_address}</Text>
      </View>
      <View style={styles.locationRow}>
        <Text style={styles.locationLabel}>Drop:</Text>
        <Text style={styles.locationText}>{ride.drop_address?.formatted_address}</Text>
      </View>



      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Delivery Charge:</Text>
        <Text style={styles.priceValue}>
          ₹{(ride.pricing?.total_fare || 0).toFixed(2)}
        </Text>
      </View>

      <Text style={styles.rideId}>Order ID: {ride._id}</Text>
    </View>
  );

  /* --------------------------------------------------------------------- */
  /*  LOADING STATE                                                        */
  /* --------------------------------------------------------------------- */
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading rides…</Text>
      </View>
    );
  }

  /* --------------------------------------------------------------------- */
  /*  SELECT ACTIVE LIST                                                    */
  /* --------------------------------------------------------------------- */
  const activeList =
    activeTab === 'rides'
      ? rides.normalRides
      : activeTab === 'intercity'
        ? rides.intercityRides
        : rides.parcelOrder;

  const renderCard = (ride) => {
    if (activeTab === 'intercity') return <IntercityRideCard key={ride._id} ride={ride} />;
    if (activeTab === 'parcel') return <ParcelRideCard key={ride._id} ride={ride} />;
    return <NormalRideCard key={ride._id} ride={ride} />;
  };

  /* --------------------------------------------------------------------- */
  /*  RENDER                                                               */
  /* --------------------------------------------------------------------- */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Rides</Text>
          <Text style={styles.headerSubtitle}>
            {rides.normalRides.length + rides.intercityRides.length + rides.parcelOrder.length}{' '}
            total
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rides' && styles.activeTab]}
          onPress={() => setActiveTab('rides')}
        >
          <Text style={[styles.tabText, activeTab === 'rides' && styles.activeTabText]}>
            Rides ({rides.normalRides.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'parcel' && styles.activeTab]}
          onPress={() => setActiveTab('parcel')}
        >
          <Text style={[styles.tabText, activeTab === 'parcel' && styles.activeTabText]}>
            Parcel ({rides.parcelOrder.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'intercity' && styles.activeTab]}
          onPress={() => setActiveTab('intercity')}
        >
          <Text style={[styles.tabText, activeTab === 'intercity' && styles.activeTabText]}>
            Intercity ({rides.intercityRides.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#000']} />
        }
      >
        {activeList.length > 0 ? (
          <View style={styles.section}>{activeList.map(renderCard)}</View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>
              No{' '}
              {activeTab === 'rides'
                ? 'rides'
                : activeTab === 'parcel'
                  ? 'parcels'
                  : 'intercity rides'}{' '}
              found
            </Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/* --------------------------------------------------------------------- */
/*  STYLES                                                               */
/* --------------------------------------------------------------------- */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#ccc' },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#000', backgroundColor: '#fff' },
  tabText: { fontSize: 15, color: '#777', fontWeight: '600' },
  activeTabText: { color: '#000', fontWeight: '700' },

  section: { padding: 16 },
  scrollView: { flex: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rideType: { fontSize: 16, fontWeight: '600', color: '#000' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },

  locationRow: { marginBottom: 8 },
  locationLabel: { fontSize: 12, color: '#666' },
  locationText: { fontSize: 14, color: '#000' },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: '#666' },
  detailValue: { fontSize: 13, color: '#000', fontWeight: '500' },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  priceLabel: { fontSize: 15, fontWeight: '600' },
  priceValue: { fontSize: 18, fontWeight: 'bold' },

  rideId: { fontSize: 10, color: '#999', marginTop: 6 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#000', marginTop: 8 },
  emptySubtext: { fontSize: 14, color: '#666' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#000' },
});

export default ActivityScreen;