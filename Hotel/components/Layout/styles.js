import { StyleSheet, Dimensions, Platform } from 'react-native';
import { colors } from '../../constant/Colors';

// Reusing the colors from HotelDashboard

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  contentContainer: {
    flex: 1,
    flexDirection: isWeb ? 'row' : 'column',
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  // Header styles
  header: {
    backgroundColor: colors.primaryRed,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    color: colors.primaryWhite,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 8,
    marginRight: 10,
  },
  profileButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.primaryGreen,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: colors.primaryWhite,
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileImage: {
    width: 25,
    height: 25,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
  },
  // Sidebar styles
  sidebar: {
    width: isWeb ? 250 : '80%',
    height: isWeb ? '100%' : '100%',
    backgroundColor: colors.primaryWhite,
    position: isWeb ? 'relative' : 'absolute',
    left: 0,
    top: 0,
    zIndex: 100,
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  sidebarHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    backgroundColor: colors.lightViolet,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkRed,
    marginTop: 10,
  },
  hotelAddress: {
    fontSize: 12,
    color: colors.darkGray,
    marginTop: 5,
  },
  sidebarContent: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.offWhite,
  },
  menuItemActive: {
    backgroundColor: colors.lightRed,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryViolet,
  },
  menuIcon: {
    width: 24,
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    color: colors.darkGray,
  },
  menuTextActive: {
    color: colors.primaryBlack,
    fontWeight: 'bold',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  versionText: {
    fontSize: 12,
    color: colors.darkGray,
    textAlign: 'center',
  },
  // Bottom bar styles
  bottomBar: {
    backgroundColor: colors.primaryWhite,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    flex: 1,
  },
  bottomBarItemActive: {
    borderTopWidth: 2,
    borderTopColor: colors.primaryViolet,
  },
  bottomBarLabel: {
    fontSize: 12,
    marginTop: 4,
    color: colors.darkGray,
  },
  bottomBarLabelActive: {
    color: colors.primaryViolet,
    fontWeight: 'bold',
  },
  // Overlay for mobile sidebar
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.transparentBlack,
    zIndex: 90,
  },
  // Content container with proper padding
  childrenContainer: {
    flex: 1,
    // paddingBottom: isWeb ? 0 : 60, // Add padding for bottom bar on mobile
  }
});