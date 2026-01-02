import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, Keyboard, ScrollView } from 'react-native';
import FormInput from './FormInput';
import axios from 'axios';
import { API_BASE_URL_LOCATION } from '../../constant/Api';
import styles from './Styles';

export default function AddressForm({ address, onAddressChange, errors }) {
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchAddressSuggestions = async (query) => {
    if (!query.trim()) {
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL_LOCATION}/autocomplete?input=${encodeURIComponent(query)}`
      );
      setAddressSuggestions(res.data);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error fetching address suggestions:', err);
      setShowSuggestions(false);
    }
  };

  const fetchGeocode = async (selectedAddress) => {
    try {
      setSelectedSuggestion(selectedAddress);
      const res = await axios.get(
        `${API_BASE_URL_LOCATION}/geocode?address=${encodeURIComponent(
          selectedAddress?.description
        )}`
      );
      const { latitude, longitude } = res.data;
      onAddressChange('location', {
        type: 'Point',
        coordinates: [longitude, latitude],
      });
      onAddressChange('street_address', selectedAddress.description);
      setShowSuggestions(false);
      setAddressSuggestions([]);
      Keyboard.dismiss();
    } catch (err) {
      console.error('Error fetching geocode:', err);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        selectedSuggestion?.description === item.description && styles.selectedSuggestion
      ]}
      onPress={() => fetchGeocode(item)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.suggestionText,
          selectedSuggestion?.description === item.description && styles.selectedSuggestionText
        ]}
        numberOfLines={2}
      >
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.Form} keyboardShouldPersistTaps="handled">
      <FormInput
        label="Area"
        value={address.area}
        onChangeText={(text) => onAddressChange('area', text)}
        placeholder="Enter your area"
      />
      <View style={styles.addressInputContainer}>
        <FormInput
          label="Street Address"
          value={address.street_address}
          onChangeText={(text) => {
            onAddressChange('street_address', text);
            fetchAddressSuggestions(text);
          }}
          placeholder="Enter street address"
        />
        {showSuggestions && addressSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={addressSuggestions}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderSuggestion}
              style={styles.suggestionList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              bounces={true}
              nestedScrollEnabled={true}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
            />
          </View>
        )}
      </View>
      <FormInput
        label="Landmark"
        value={address.landmark}
        onChangeText={(text) => onAddressChange('landmark', text)}
        placeholder="Enter landmark"
      />
      <FormInput
        label="Pincode"
        value={address.pincode}
        onChangeText={(text) => onAddressChange('pincode', text)}
        placeholder="Enter pincode"
        keyboardType="numeric"
        error={errors.pincode}
      />
    </ScrollView>
  );
}

