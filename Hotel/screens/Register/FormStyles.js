import { StyleSheet } from "react-native";
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const styles = StyleSheet.create({

    inputGroup: {
        marginBottom: 20,
      },
      label: {
        fontSize: 14,
        marginBottom: 8,
        color: '#666',
      },
      input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
      },
      inputError: {
        borderColor: '#ff0000',
      },
      errorText: {
        color: '#ff0000',
        fontSize: 12,
        marginTop: 5,
      },
});

export default styles;
