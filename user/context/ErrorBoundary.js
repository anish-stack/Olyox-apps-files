import React, { Component } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import * as SecureStore from "expo-secure-store";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    // this.handleLogout(); // Auto logout on error
  }

  handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("auth_token_db"); // delete stored token
    } catch (err) {
      console.error("Error clearing SecureStore:", err);
    }

    // Reset navigation to Onboarding
    if (this.props.navigation) {
      this.props.navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Simple black & white loading screen while redirecting
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#000", // black background
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <ActivityIndicator size="large" color="#fff" />
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundaryWrapper(props) {
  return <ErrorBoundary {...props} />;
}
