import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
 
const styles = StyleSheet.create({
    container: {
        flex: 1
    }
});
 
const ChatModel = () => {
    return (
        <View style={styles.container}>
            <Text>ChatModel</Text>
        </View>
    );
}

 
export default ChatModel;