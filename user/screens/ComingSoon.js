import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ComingSoon() {
  const handleNotify = () => {
    Alert.alert("Notification", "Thank you! We will inform you when it's ready.");
  };

  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.backgroundDecor}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
      </View>

      {/* Content Container */}
      <View style={styles.content}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <Image
            source={{
              uri: "https://olyox.in/wp-content/uploads/2025/04/cropped-cropped-logo-CWkwXYQ_-removebg-preview.png"
            }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="time-outline" size={16} color="#000" />
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Something Amazing{'\n'}is on the Way</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Get ready for exciting new features like Hotel Booking & Tiffin Services launching soon on Olyox
        </Text>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="bed-outline" size={24} color="#000" />
            </View>
            <Text style={styles.featureText}>Hotel Booking</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="restaurant-outline" size={24} color="#000" />
            </View>
            <Text style={styles.featureText}>Tiffin Services</Text>
          </View>
        </View>

        {/* Notify Button */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleNotify}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Notify Me</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Additional Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#666" />
          <Text style={styles.infoText}>We'll send you an update as soon as we launch</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>© 2025 Olyox. All rights reserved.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: 'relative',
  },
  backgroundDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F8F8F8',
    top: -100,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F8F8F8',
    bottom: -50,
    left: -50,
  },
  circle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F8F8F8',
    top: '40%',
    left: '10%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#000000',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logo: {
    width: 120,
    height: 120,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1,
  },
  title: {
    fontSize: Math.min(34, width * 0.085),
    fontWeight: Platform.OS === 'ios' ? '800' : 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
    lineHeight: Math.min(42, width * 0.105),
  },
  subtitle: {
    fontSize: Math.min(16, width * 0.042),
    textAlign: 'center',
    color: '#666666',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: Math.min(24, width * 0.06),
    maxWidth: 400,
  },
  featuresContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    minWidth: 200,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: 320,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
});