import { View, Text } from 'react-native';
import React from 'react';
import ShowMap from './ShowMap';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Show_Cabs() {
  const route = useRoute();
  const { data, isLater } = route.params || {}; // safe destructure
  console.log("Show_Cabs data:", data, "isLater:", isLater);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {data ? (
        <ShowMap isLater={isLater} data={data} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>No ride data available</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
