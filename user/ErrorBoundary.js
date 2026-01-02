import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { resetToOnboarding } from './RootNavigation';
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // optional: auto logout on major crash
    try {
      // await SecureStore.deleteItemAsync('auth_token');
      // await SecureStore.deleteItemAsync('cached_location');
      // await SecureStore.deleteItemAsync('cached_coords');
      // await SecureStore.deleteItemAsync('auth_token_db');
      // resetToOnboarding();
    } catch (e) {
      console.error('ErrorBoundary logout failed:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong.</Text>
          <Text style={styles.errorDetails}>
            {this.state.error?.toString()}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d64444',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 14,
    color: '#333',
  },
});

export default ErrorBoundary;
