import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../constant/Colors';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 cards per row with margins

export default StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    heading: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    listContainer: {
        padding: 12,
    },
    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    roomCard: {
        width: cardWidth,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    imageContainer: {
        position: 'relative',
    },
    roomImage: {
        width: '100%',
        height: 120,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    packageBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    packageText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    roomInfo: {
        padding: 12,
    },
    roomType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    cutPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
        marginLeft: 4,
    },
    discount: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    allowedPerson: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    availabilityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    availabilityText: {
        fontSize: 12,
        color: '#4B5563',
        flex: 1,
    },
    amenitiesHeading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4B5563',
        marginTop: 8,
    },
    amenities: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noRooms: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 8,
    },
    noRoomsSubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    button: {
        backgroundColor: colors.primaryRed,
        padding: 8,
        textAlign: 'center',
        borderRadius: 22

    }
});