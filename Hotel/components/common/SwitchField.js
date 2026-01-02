import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

export default function SwitchField({ label, value, onValueChange }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d1d1d1', true: '#4CAF50' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingVertical: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});