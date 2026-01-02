import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Gift, Wallet, Star } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const CashbackModal = ({ visible, amount, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      bounceAnim.setValue(0);
      sparkleAnim.setValue(0);
      confettiAnim.setValue(0);

      // Start celebration animation sequence
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous sparkle animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Confetti animation
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -10, 0],
  });

  const confettiTranslate = confettiAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, height],
  });

  const ConfettiPiece = ({ delay, color, left }) => {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (visible) {
        Animated.loop(
          Animated.timing(animValue, {
            toValue: 1,
            duration: 3000 + delay,
            useNativeDriver: true,
          })
        ).start();
      }
    }, [visible]);

    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [-50, height + 50],
    });

    const rotate = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={[
          styles.confettiPiece,
          {
            backgroundColor: color,
            left: left,
            transform: [{ translateY }, { rotate }],
          },
        ]}
      />
    );
  };

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.androidBlur} />
        )}

        {/* Confetti Animation */}
        {visible && (
          <>
            <ConfettiPiece delay={0} color="#FFD700" left="10%" />
            <ConfettiPiece delay={200} color="#FF6B6B" left="20%" />
            <ConfettiPiece delay={400} color="#4ECDC4" left="30%" />
            <ConfettiPiece delay={600} color="#45B7D1" left="40%" />
            <ConfettiPiece delay={800} color="#96CEB4" left="50%" />
            <ConfettiPiece delay={1000} color="#FFEAA7" left="60%" />
            <ConfettiPiece delay={1200} color="#DDA0DD" left="70%" />
            <ConfettiPiece delay={1400} color="#98D8C8" left="80%" />
            <ConfettiPiece delay={1600} color="#F7DC6F" left="90%" />
          </>
        )}

        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            {/* Sparkle Effects */}
            <Animated.View
              style={[
                styles.sparkleContainer,
                { opacity: sparkleOpacity },
              ]}
            >
              <Sparkles
                size={20}
                color="#FFD700"
                style={[styles.sparkle, { top: 20, left: 20 }]}
              />
              <Sparkles
                size={16}
                color="#FFF"
                style={[styles.sparkle, { top: 40, right: 30 }]}
              />
              <Sparkles
                size={18}
                color="#FFD700"
                style={[styles.sparkle, { bottom: 60, left: 30 }]}
              />
              <Sparkles
                size={14}
                color="#FFF"
                style={[styles.sparkle, { bottom: 40, right: 20 }]}
              />
            </Animated.View>

            <View style={styles.modalContent}>
              {/* Trophy/Gift Icon */}
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [{ translateY: bounceTranslate }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.iconGradient}
                >
                  <Gift size={40} color="#FFF" />
                </LinearGradient>
              </Animated.View>

              {/* Celebration Text */}
              <Text style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
              <Text style={styles.firstRideText}>First Ride Completed!</Text>

              {/* Cashback Amount with Animation */}
              <Animated.View
                style={[
                  styles.amountContainer,
                  {
                    transform: [{ translateY: bounceTranslate }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#25d366', '#20b358']}
                  style={styles.amountGradient}
                >
                  <Wallet size={24} color="#FFF" style={styles.walletIcon} />
                  <Text style={styles.cashbackLabel}>Cashback Earned</Text>
                  <Text style={styles.amountText}>₹{amount}</Text>
                </LinearGradient>
              </Animated.View>

              {/* Success Message */}
              <View style={styles.messageContainer}>
                <Star size={16} color="#FFD700" />
                <Text style={styles.successMessage}>
                  Amazing! Your cashback has been added to your wallet
                </Text>
                <Star size={16} color="#FFD700" />
              </View>

              {/* Benefits List */}
              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>What's Next?</Text>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>✨</Text>
                  <Text style={styles.benefitText}>Use cashback on your next ride</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>🚗</Text>
                  <Text style={styles.benefitText}>Enjoy more rides with savings</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>🎁</Text>
                  <Text style={styles.benefitText}>Earn more rewards with every trip</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Rate Your Driver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                //   onPress={onClose}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>Awesome! 🎊</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  androidBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  gradientBackground: {
    padding: 0,
    position: 'relative',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  sparkle: {
    position: 'absolute',
  },
  modalContent: {
    padding: 32,
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  congratsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  firstRideText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F0F8FF',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  amountContainer: {
    marginBottom: 24,
    width: '100%',
  },
  amountGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#25d366',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  walletIcon: {
    marginBottom: 8,
  },
  cashbackLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginHorizontal: 8,
    fontWeight: '500',
    opacity: 0.95,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitBullet: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  benefitText: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
  },
  primaryButtonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
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
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default CashbackModal;