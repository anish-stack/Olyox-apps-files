import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const HeaderWithBack = ({ title, onBackPress, background = true }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: background ? theme.background : 'transparent' }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Icon name="arrow-back" style={[styles.icon, { color: theme.primary }]} />
      </TouchableOpacity>
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  icon: {
    fontSize: 24,
  },
});

export default HeaderWithBack;
