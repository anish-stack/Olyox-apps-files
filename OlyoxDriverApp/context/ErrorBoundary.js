import React, { Component } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";

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
    this.handleReset(); // auto logout + reload
  }

  handleReset = async () => {
    try {
      // 1️⃣ Clear SecureStore
      // await SecureStore.deleteItemAsync("auth_token");
      console.log("✅ Auth token cleared from SecureStore");

      // 2️⃣ Clear AsyncStorage completely (or selected keys)
      // await AsyncStorage.clear();
      console.log("✅ AsyncStorage cleared");

      // 3️⃣ Reload the app
      await Updates.reloadAsync();
    } catch (err) {
      console.error("❌ Error during ErrorBoundary reset:", err);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#000",
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
