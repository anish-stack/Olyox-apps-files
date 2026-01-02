// import React, { useState, useEffect } from 'react';
// import {
//     View,
//     Text,
//     Image,
//     ScrollView,
//     TouchableOpacity,
//     StyleSheet,
//     Dimensions,
//     ActivityIndicator,
//     Switch
// } from 'react-native';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import Layout from '../../components/Layout/Layout';
// import axios from 'axios';
// import { useToken } from '../../context/AuthContext';
// import { API_BASE_URL_V2 } from '../../constant/Api';
// import { ChevronLeft, Package, Wifi, Tv, Wind, Droplets, Utensils, Calculator as Elevator, Car, Shield, BatteryCharging } from 'lucide-react-native';

// export default function SingleDetailsPage() {
//     const navigation = useNavigation();
//     const route = useRoute();
//     const { roomId } = route.params || {};
//     const { token } = useToken();
//     const [room, setRoom] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [activeImage, setActiveImage] = useState(0);
//     const [error, setError] = useState(null);

//     const fetchRoomDetails = async () => {
//         setLoading(true);
//         try {
//             const { data } = await axios.get(`${API_BASE_URL_V2}/hotel-details/${roomId}`, {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: `Bearer ${token}`,
//                 },
//             });
//             console.log("data", data)
//             setRoom(data.data);
//         } catch (error) {
//             console.error('Error fetching room details:', error);
//             setError('Failed to load room details. Please try again.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchRoomDetails();
//     }, [roomId, token]);

//     const toggleRoomAvailability = async (roomId, currentStatus) => {
//         try {
//             console.log(roomId)
//             // Update local state immediately for responsive UI


//             // Here you would typically make an API call to update the status on the server
//             const { data } = await axios.post(`${API_BASE_URL_V2}//hotel-Room-toggle?roomId=${roomId}`,
//                 { isRoomAvailable: !currentStatus },
//                 { headers: { Authorization: `Bearer ${token}` } }
//             );

//             fetchRoomDetails();

//         } catch (error) {
//             console.error('Error toggling room availability:', error);
//             // Revert the change if the API call fails
//             alert(error.response.data.message || "Failed To Updated Status try again")

//             setRooms(rooms.map(room =>
//                 room._id === roomId
//                     ? { ...room, isRoomAvailable: currentStatus }
//                     : room
//             ));
//         }
//     };

//     const getAmenityIcon = (amenity) => {
//         switch (amenity) {
//             case 'freeWifi': return <Wifi size={20} color="#6366f1" />;
//             case 'TV': return <Tv size={20} color="#6366f1" />;
//             case 'AC': return <Wind size={20} color="#6366f1" />;
//             case 'geyser': return <Droplets size={20} color="#6366f1" />;
//             case 'kitchen': return <Utensils size={20} color="#6366f1" />;
//             case 'elevator': return <Elevator size={20} color="#6366f1" />;
//             case 'parkingFacility': return <Car size={20} color="#6366f1" />;
//             case 'security': return <Shield size={20} color="#6366f1" />;
//             case 'powerBackup': return <BatteryCharging size={20} color="#6366f1" />;
//             default: return null;
//         }
//     };

//     const formatAmenityName = (name) => {
//         // Convert camelCase to Title Case with spaces
//         return name
//             .replace(/([A-Z])/g, ' $1')
//             .replace(/^./, str => str.toUpperCase());
//     };

//     if (loading) {
//         return (
//             <Layout>
//                 <View style={styles.loadingContainer}>
//                     <ActivityIndicator size="large" color="#6366f1" />
//                     <Text style={styles.loadingText}>Loading room details...</Text>
//                 </View>
//             </Layout>
//         );
//     }

//     if (error) {
//         return (
//             <Layout>
//                 <View style={styles.errorContainer}>
//                     <Text style={styles.errorText}>{error}</Text>
//                     <TouchableOpacity
//                         style={styles.retryButton}
//                         onPress={fetchRoomDetails}
//                     >
//                         <Text style={styles.retryButtonText}>Retry</Text>
//                     </TouchableOpacity>
//                 </View>
//             </Layout>
//         );
//     }

//     if (!room) {
//         return (
//             <Layout>
//                 <View style={styles.errorContainer}>
//                     <Text style={styles.errorText}>Room not found</Text>
//                     <TouchableOpacity
//                         style={styles.backButton}
//                         onPress={() => navigation.goBack()}
//                     >
//                         <Text style={styles.backButtonText}>Go Back</Text>
//                     </TouchableOpacity>
//                 </View>
//             </Layout>
//         );
//     }

//     const images = [
//         room.main_image,
//         room.second_image,
//         room.third_image,
//         room.fourth_image,
//         room.fifth_image
//     ].filter(img => img && img.url);

//     return (
//         <Layout activeTab={"rooms"}>
//             <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//                 {/* Header with back button */}
//                 <View style={styles.header}>
//                     <TouchableOpacity
//                         style={styles.backBtn}
//                         onPress={() => navigation.goBack()}
//                     >
//                         <ChevronLeft size={24} color="#ffffff" />
//                     </TouchableOpacity>
//                 </View>

//                 {/* Image Carousel */}
//                 <View style={styles.imageCarousel}>
//                     <ScrollView
//                         horizontal
//                         pagingEnabled
//                         showsHorizontalScrollIndicator={false}
//                         onScroll={(event) => {
//                             const slideSize = event.nativeEvent.layoutMeasurement.width;
//                             const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
//                             setActiveImage(index);
//                         }}
//                         scrollEventThrottle={200}
//                     >
//                         {images.map((image, index) => (
//                             <Image
//                                 key={index}
//                                 source={{ uri: image.url }}
//                                 style={styles.carouselImage}
//                                 resizeMode="cover"
//                             />
//                         ))}
//                     </ScrollView>

//                     {/* Image indicators */}
//                     <View style={styles.indicatorContainer}>
//                         {images.map((_, index) => (
//                             <View
//                                 key={index}
//                                 style={[
//                                     styles.indicator,
//                                     { backgroundColor: index === activeImage ? '#6366f1' : '#D1D5DB' }
//                                 ]}
//                             />
//                         ))}
//                     </View>
//                 </View>

//                 {/* Room Details */}
//                 <View style={styles.detailsContainer}>
//                     <View style={styles.titleRow}>
//                         <Text style={styles.roomType}>{room.room_type}</Text>
//                         {room.isPackage && (
//                             <View style={styles.packageBadge}>
//                                 <Package size={16} color="#ffffff" />
//                                 <Text style={styles.packageText}>Package</Text>
//                             </View>
//                         )}
//                     </View>

//                     <View style={styles.priceContainer}>
//                         <Text style={styles.price}>₹{room.book_price}</Text>
//                         <Text style={styles.cutPrice}>₹{room.cut_price}</Text>
//                         <Text style={styles.discount}>{room.discount_percentage}% OFF</Text>
//                     </View>

//                     <View style={styles.infoRow}>
//                         <Text style={styles.infoLabel}>Allowed Persons:</Text>
//                         <Text style={styles.infoValue}>{room.allowed_person}</Text>
//                     </View>

//                     <View style={styles.availabilityContainer}>
//                         <Text style={styles.availabilityText}>
//                             Booking {room.isRoomAvailable ? 'Available' : 'Unavailable'}
//                         </Text>
//                         <Switch
//                             trackColor={{ false: "#767577", true: "#6366f1" }}
//                             thumbColor={room.isRoomAvailable ? "#ffffff" : "#f4f3f4"}
//                             ios_backgroundColor="#3e3e3e"
//                             onValueChange={() => toggleRoomAvailability(room?._id, room?.isRoomAvailable)}
//                             value={room.isRoomAvailable}
//                         />
//                     </View>

//                     {/* Amenities Section */}
//                     <View style={styles.sectionContainer}>
//                         <Text style={styles.sectionTitle}>Amenities</Text>
//                         <View style={styles.amenitiesContainer}>
//                             {Object.entries(room.amenities)
//                                 .filter(([_, value]) => value)
//                                 .map(([key], index) => (
//                                     <View key={index} style={styles.amenityItem}>
//                                         {getAmenityIcon(key)}
//                                         <Text style={styles.amenityText}>{formatAmenityName(key)}</Text>
//                                     </View>
//                                 ))}

//                             {Object.values(room.amenities).every(v => !v) && (
//                                 <Text style={styles.noAmenities}>No amenities available</Text>
//                             )}
//                         </View>
//                     </View>

//                     {/* Cancellation Policy */}
//                     <View style={styles.sectionContainer}>
//                         <Text style={styles.sectionTitle}>Cancellation Policy</Text>
//                         {room.cancellation_policy && room.cancellation_policy.length > 0 ? (
//                             room.cancellation_policy.map((policy, index) => (
//                                 <Text key={index} style={styles.policyText}>{policy}</Text>
//                             ))
//                         ) : (
//                             <Text style={styles.policyText}>No cancellation policy available</Text>
//                         )}
//                     </View>

//                     {/* Tax Information */}
//                     <View style={styles.sectionContainer}>
//                         <Text style={styles.sectionTitle}>Tax Information</Text>
//                         <View style={styles.infoRow}>
//                             <Text style={styles.infoLabel}>Tax Applied:</Text>
//                             <Text style={styles.infoValue}>{room.is_tax_applied ? 'Yes' : 'No'}</Text>
//                         </View>
//                         {room.is_tax_applied && (
//                             <View style={styles.infoRow}>
//                                 <Text style={styles.infoLabel}>Tax Amount:</Text>
//                                 <Text style={styles.infoValue}>₹{room.tax_fair}</Text>
//                             </View>
//                         )}
//                     </View>

//                     {/* Package Add-ons */}
//                     {room.isPackage && room.package_add_ons && room.package_add_ons.length > 0 && (
//                         <View style={styles.sectionContainer}>
//                             <Text style={styles.sectionTitle}>Package Add-ons</Text>
//                             {room.package_add_ons.map((addon, index) => (
//                                 <Text key={index} style={styles.addonText}>{addon}</Text>
//                             ))}
//                         </View>
//                     )}

//                     {/* Tags */}
//                     {room.has_tag && room.has_tag.length > 0 && (
//                         <View style={styles.tagsContainer}>
//                             {room.has_tag.map((tag, index) => (
//                                 <View key={index} style={styles.tag}>
//                                     <Text style={styles.tagText}>{tag}</Text>
//                                 </View>
//                             ))}
//                         </View>
//                     )}
//                 </View>
//             </ScrollView>
//         </Layout>
//     );
// }

// const { width } = Dimensions.get('window');

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//     },
//     header: {
//         position: 'absolute',
//         top: 10,
//         left: 10,
//         zIndex: 10,
//     },
//     backBtn: {
//         backgroundColor: 'rgba(0,0,0,0.5)',
//         borderRadius: 20,
//         width: 40,
//         height: 40,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     imageCarousel: {
//         width: width,
//         height: 300,
//     },
//     carouselImage: {
//         width: width,
//         height: 300,
//     },
//     indicatorContainer: {
//         position: 'absolute',
//         bottom: 10,
//         flexDirection: 'row',
//         justifyContent: 'center',
//         width: '100%',
//     },
//     indicator: {
//         height: 8,
//         width: 8,
//         borderRadius: 4,
//         marginHorizontal: 4,
//     },
//     detailsContainer: {
//         padding: 16,
//         backgroundColor: '#ffffff',
//         borderTopLeftRadius: 20,
//         borderTopRightRadius: 20,
//         marginTop: -20,
//     },
//     titleRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 8,
//     },
//     roomType: {
//         fontSize: 24,
//         fontWeight: 'bold',
//         color: '#1F2937',
//     },
//     packageBadge: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#6366f1',
//         paddingHorizontal: 10,
//         paddingVertical: 5,
//         borderRadius: 12,
//     },
//     packageText: {
//         color: '#ffffff',
//         fontWeight: 'bold',
//         marginLeft: 4,
//         fontSize: 12,
//     },
//     priceContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 16,
//     },
//     price: {
//         fontSize: 22,
//         fontWeight: 'bold',
//         color: '#1F2937',
//     },
//     cutPrice: {
//         fontSize: 16,
//         color: '#9CA3AF',
//         textDecorationLine: 'line-through',
//         marginLeft: 8,
//     },
//     discount: {
//         fontSize: 14,
//         color: '#10B981',
//         fontWeight: 'bold',
//         marginLeft: 8,
//     },
//     infoRow: {
//         flexDirection: 'row',
//         marginBottom: 8,
//     },
//     infoLabel: {
//         fontSize: 16,
//         color: '#6B7280',
//         width: 140,
//     },
//     infoValue: {
//         fontSize: 16,
//         color: '#1F2937',
//         fontWeight: '500',
//     },
//     availabilityContainer: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         backgroundColor: '#F3F4F6',
//         padding: 12,
//         borderRadius: 8,
//         marginVertical: 16,
//     },
//     availabilityText: {
//         fontSize: 16,
//         fontWeight: '500',
//         color: '#4B5563',
//     },
//     sectionContainer: {
//         marginBottom: 20,
//     },
//     sectionTitle: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#1F2937',
//         marginBottom: 12,
//     },
//     amenitiesContainer: {
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//     },
//     amenityItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#F3F4F6',
//         paddingHorizontal: 12,
//         paddingVertical: 8,
//         borderRadius: 8,
//         marginRight: 8,
//         marginBottom: 8,
//     },
//     amenityText: {
//         marginLeft: 6,
//         color: '#4B5563',
//         fontSize: 14,
//     },
//     noAmenities: {
//         color: '#9CA3AF',
//         fontStyle: 'italic',
//     },
//     policyText: {
//         fontSize: 14,
//         color: '#4B5563',
//         marginBottom: 4,
//         lineHeight: 20,
//     },
//     addonText: {
//         fontSize: 14,
//         color: '#4B5563',
//         marginBottom: 4,
//     },
//     tagsContainer: {
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//         marginTop: 8,
//     },
//     tag: {
//         backgroundColor: '#EEF2FF',
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 16,
//         marginRight: 8,
//         marginBottom: 8,
//     },
//     tagText: {
//         color: '#6366f1',
//         fontSize: 12,
//         fontWeight: '500',
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     loadingText: {
//         marginTop: 12,
//         fontSize: 16,
//         color: '#6B7280',
//     },
//     errorContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         padding: 20,
//     },
//     errorText: {
//         fontSize: 16,
//         color: '#EF4444',
//         marginBottom: 16,
//         textAlign: 'center',
//     },
//     retryButton: {
//         backgroundColor: '#6366f1',
//         paddingHorizontal: 20,
//         paddingVertical: 10,
//         borderRadius: 8,
//     },
//     retryButtonText: {
//         color: '#ffffff',
//         fontWeight: 'bold',
//     },
//     backButton: {
//         backgroundColor: '#6B7280',
//         paddingHorizontal: 20,
//         paddingVertical: 10,
//         borderRadius: 8,
//     },
//     backButtonText: {
//         color: '#ffffff',
//         fontWeight: 'bold',
//     },
// });
import { View, Text } from 'react-native'
import React from 'react'

export default function SingleDetailsPage() {
  return (
    <View>
      <Text>SingleDetailsPage</Text>
    </View>
  )
}