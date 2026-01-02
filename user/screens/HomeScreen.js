import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import HeaderNewUser from './HeaderNewHomeScreen';
import Categories from '../components/Categories/Categories';
import OfferBanner from '../components/OfferBanner/OfferBanner';
import OffersSection from './OffersSection';
import BottomTabs from './BottomTabs';
import Footer from '../components/Layout/Top/Footer';
import { find_me } from '../utils/helpers';

const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const navigation = useNavigation();

const fetchData = async (isRefresh = false) => {
  try {
    if (!isRefresh) setLoading(true);

    const user = await find_me();
    if (user?.user?.IntercityRide && user?.user?.IntercityRide?.status !== "cancelled") {
      navigation.navigate('IntercityRide', {
        ride: user?.user?.IntercityRide,
      });
      return;
    }

    // 🚗 If user has a currently running normal ride
    if (user?.user?.currentRide) {
      navigation.navigate('RideStarted', {
        rideId: user?.user?.currentRide,
        origin: user?.user?.currentRide?.origin,
        destination: user?.user?.currentRide?.destination,
      });
      return;
    }

  } catch (error) {
    console.log('Error fetching user:', error);
  } finally {
    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }
};


  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading your experience...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#000']}
              progressBackgroundColor="#fff"
              tintColor="#000"
              title="Refreshing..."
              titleColor="#000"
            />
          }
        >
          <HeaderNewUser />
          <Categories />
          <OfferBanner />
          <OffersSection />

          <View style={styles.promo}>
            <Text style={styles.promoTitle}>🇮🇳 Bharat Ka Apna App</Text>
            <Text style={styles.promoSub}>Follow us on</Text>
          </View>

          <Footer />
        </ScrollView>
      </Animated.View>
      <BottomTabs />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingBottom: 80,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  promo: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  promoSub: {
    fontSize: 14,
    color: '#003873',
    marginTop: 4,
  },
});

export default HomeScreen;
