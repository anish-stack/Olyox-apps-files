import { View, Text, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './Styles';
import { useNavigation } from '@react-navigation/native';

export default function Onboarding() {
    const navigation = useNavigation()
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.image_container}>
                <Image style={styles.image} source={require('../../assets/onboarding_images/Hotel_App_.jpg')} />
            </View>

            <View style={styles.text_container}>
                <Text style={styles.title}>Manage Your Rooms And Guests</Text>
                <Text style={styles.subtitle}>Register Here Or Login</Text>

                <TouchableOpacity onPress={() => navigation.navigate('BhVerification')} style={styles.primary_button}>
                    <Text style={styles.button_text}>Get Started</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.secondary_button}>
                    <Text style={styles.secondary_button_text}>Login Via BH</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity onPress={() => navigation.navigate('HotelListing')} style={[styles.secondary_button, { marginVertical: 5 }]}>
                    <Text style={styles.secondary_button_text}>Complete Profile</Text>
                </TouchableOpacity> */}
            </View>
        </SafeAreaView>
    );
}
