import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import useSettings from '../../hooks/settings.hook';

const BhVerification = () => {
  const [bh, setBh] = useState('BH');
  const [response, setResponse] = useState(null);
  const { settings } = useSettings();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const navigation = useNavigation();

  const checkBhId = async () => {
    try {
      setLoading(true);
      setError(null);
      setResponse(null);

      const { data } = await axios.post('https://www.api.olyox.com/api/v1/check-bh-id', { bh });

      if (!data.success) {
        setLoading(false);
        return setError(data.message || 'Failed to validate Referral ID.');
      }

      setResponse(data);

      setTimeout(() => {
        navigation.navigate('step_2', { bh_id: bh });
      }, 1200);
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setSkipping(true);

    if (settings && settings.adminBh) {
      setTimeout(() => {
        navigation.navigate('step_2', { bh_id: settings.adminBh });
        setSkipping(false);
      }, 1000);
    } else {
      setError('No default Referral ID available. Please enter a valid Referral ID or contact support.');
      setSkipping(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
            }
          }}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Image
          source={{ uri: 'https://res.cloudinary.com/dlasn7jtv/image/upload/v1735719280/llocvfzlg1mojxctm7v0.png' }}
          style={styles.logo}
        />

        <Text style={styles.title}>Enter Referral ID</Text>
        {/* <Text style={styles.subtitle}>Register at olyox.com and start earning today</Text> */}

        <TextInput
          style={styles.input}
          placeholder="Enter your Referral ID"
          placeholderTextColor="#999"
          value={bh}
          onChangeText={setBh}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.8 }]}
          onPress={checkBhId}
          disabled={loading || skipping}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Referral ID</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading || skipping}
        >
          {skipping ? (
            <ActivityIndicator color="#bbb" />
          ) : (
            <Text style={styles.skipButtonText}>Don't have a Referral ID? Skip</Text>
          )}
        </TouchableOpacity>

        {response && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              {response.message || 'Referral ID verified successfully! Redirecting...'}
            </Text>
          </View>
        )}

        {skipping && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Using default Referral ID. Redirecting...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#000', // black background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 50,
  },
  card: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 6,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#111',
    color: '#fff',
  },
  button: {
    width: '100%',
    backgroundColor: '#e3342f', // red button
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  skipButton: {
    width: '100%',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#999',
    textDecorationLine: 'underline',
  },
  successBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#0f5132',
    borderRadius: 8,
    width: '100%',
  },
  successText: {
    color: '#d1e7dd',
    textAlign: 'center',
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#842029',
    borderRadius: 8,
    width: '100%',
  },
  errorText: {
    color: '#f8d7da',
    textAlign: 'center',
  },
});

export default BhVerification;
