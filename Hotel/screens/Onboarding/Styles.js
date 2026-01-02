import { StyleSheet, Dimensions, Platform } from "react-native";
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { colors } from "../../constant/Colors";

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image_container: {
        width: width,
        height: height * 0.55,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    text_container: {
        alignItems: 'center',
        marginTop: verticalScale(20),
        paddingHorizontal: moderateScale(20),
    },
    title: {
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: colors.darkRed,
        textAlign: 'center',
        marginBottom: verticalScale(10),
    },
    subtitle: {
        fontSize: moderateScale(16),
        color: colors.primaryBlack,
        textAlign: 'center',
        marginBottom: verticalScale(30),
    },
    primary_button: {
        backgroundColor: colors.primaryRed,
        paddingVertical: verticalScale(12),
        paddingHorizontal: moderateScale(40),
        borderRadius: 25,
        marginBottom: verticalScale(15),
        width: width * 0.8,
        alignItems: 'center',
    },
    button_text: {
        color: colors.offWhite,
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    secondary_button: {
        borderWidth: 1,
        borderColor: colors.lightRed,
        paddingVertical: verticalScale(12),
        paddingHorizontal: moderateScale(40),
        borderRadius: 25,
        width: width * 0.8,
        alignItems: 'center',
    },
    secondary_button_text: {
        color: colors.primaryBlack,
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
});

export default styles;
