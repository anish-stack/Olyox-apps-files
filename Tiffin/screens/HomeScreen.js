import React, { useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Layout from '../components/Layout/_layout';
import Status from '../components/Status/Status';
import OrderCount from '../components/OrderCount/OrderCount';
import HomeFood from '../components/HomeFood/HomeFood';

const HomeScreen = () => {
  const [isRefreshDone, setIsRefreshDone] = useState(false);

  const onRefresh = () => {
    setIsRefreshDone(true);
    setTimeout(() => setIsRefreshDone(false), 1000); // Simulating refresh
  };

  return (
    <Layout>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshDone} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollViewContent}
      >
        <Status isRefresh={isRefreshDone} />
        <OrderCount isRefresh={isRefreshDone} />
        {/* <Graph /> */}
        <HomeFood isRefresh={isRefreshDone} />
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
});

export default HomeScreen;
