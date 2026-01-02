import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Modal,
    Dimensions,
    Alert,
    Linking,
    BackHandler,
    Animated,
    Image,
    RefreshControl,
} from 'react-native';
import axios from 'axios';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import loginStore from '../../../Store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosInstance from '../../../constant/axios';
import * as ImagePicker from 'expo-image-picker';
const { width, height } = Dimensions.get('window');

const colors = {
  primary: '#000000',        // Pure black for main accents or buttons
  primaryLight: '#1F2937',   // Deep gray (for hover or secondary buttons)
  secondary: '#F3F4F6',      // Light gray background
  accent: '#E5E7EB',         // Softer gray accent
  background: '#F9FAFB',     // Very light gray background
  surface: '#FFFFFF',        // White for cards/surfaces
  text: '#111827',           // Almost black text
  textSecondary: '#6B7280',  // Medium gray for secondary text
  success: '#16A34A',        // Subtle green for success
  warning: '#FACC15',        // Yellow for warnings
  error: '#DC2626',          // Red for errors
  pending: '#9CA3AF',        // Neutral gray for pending states
  approved: '#16A34A',       // Green for approved
  rejected: '#DC2626',       // Red for rejected
  border: '#D1D5DB',         // Soft gray border
  default: '#374151',        // Neutral dark gray (default element)
};


// Document type mapping with icons and labels
const documentTypes = {
    rc: { icon: 'file-document', label: 'RC (Registration Certificate)', color: colors.primary },
    pollution: { icon: 'leaf', label: 'Pollution Certificate', color: colors.success },
    aadharFront: { icon: 'card-account-details', label: 'Aadhar Card (Front)', color: colors.warning },
    aadharBack: { icon: 'card-account-details-outline', label: 'Aadhar Card (Back)', color: colors.warning },
    permit: { icon: 'license', label: 'Commercial Permit', color: colors.error },
    licence: { icon: 'card-account-details', label: 'Driving License', color: colors.primary },
    insurance: { icon: 'shield-check', label: 'Insurance Certificate', color: colors.success },
    panCard: { icon: 'card-account-details', label: 'PAN Card', color: colors.pending },
};

// Status badge component
const StatusBadge = ({ status }) => {
    const getStatusConfig = () => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return {
                    color: colors.success,
                    backgroundColor: colors.success + '20',
                    icon: 'check-circle',
                    text: 'Approved'
                };
            case 'rejected':
                return {
                    color: colors.error,
                    backgroundColor: colors.error + '20',
                    icon: 'close-circle',
                    text: 'Rejected'
                };
            case 'pending':
            default:
                return {
                    color: colors.pending,
                    backgroundColor: colors.pending + '20',
                    icon: 'clock',
                    text: 'Pending'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
            <MaterialCommunityIcons name={config.icon} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
        </View>
    );
};

// Default badge component for currently running vehicle
const DefaultBadge = () => (
    <View style={[styles.defaultBadge]}>
        <MaterialCommunityIcons name="star" size={14} color={colors.default} />
        <Text style={[styles.defaultText]}>Currently Running</Text>
    </View>
);

// Image viewer modal
const ImageViewerModal = ({ visible, imageUrl, onClose, title }) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={styles.imageModalOverlay}>
            <View style={styles.imageModalContent}>
                <View style={styles.imageModalHeader}>
                    <Text style={styles.imageModalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.imageModalClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
            </View>
        </View>
    </Modal>
);

// Document card component
const DocumentCard = ({ docKey, document, onImagePress ,vehicleId ,onUpload }) => {
    const docInfo = documentTypes[docKey];
    if (!docInfo) return null;

    return (
        <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
                <View style={styles.documentTitleContainer}>
                    <View style={[styles.documentIcon, { backgroundColor: docInfo.color + '20' }]}>
                        <MaterialCommunityIcons name={docInfo.icon} size={20} color={docInfo.color} />
                    </View>
                    <Text style={styles.documentTitle}>{docInfo.label}</Text>
                </View>
                <StatusBadge status={document.status} />
            </View>

            {document.url && (
                <TouchableOpacity
                    style={styles.documentImageContainer}
                    onPress={() => onImagePress(document.url, docInfo.label)}
                >
                    <Image
                        source={{ uri: document.url }}
                        style={styles.documentImage}
                        resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                        <MaterialCommunityIcons name="eye" size={24} color={colors.surface} />
                        <Text style={styles.imageOverlayText}>Tap to view</Text>
                    </View>
                </TouchableOpacity>
            )}
            {document.status?.toLowerCase() === 'rejected' && (
        <TouchableOpacity
          style={[styles.uploadButton, document.loading && styles.uploadButtonLoading]}
          onPress={() => onUpload(vehicleId, docKey)}
          disabled={document.loading}
        >
          {document.loading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <MaterialCommunityIcons name="upload" size={20} color={colors.surface} />
              <Text style={styles.uploadButtonText}>Upload New</Text>
            </>
          )}
        </TouchableOpacity>
      )}

            {document.expiryDate && (
                <View style={styles.documentInfo}>
                    <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
                    <Text style={styles.documentInfoText}>
                        Expires: {new Date(document.expiryDate).toLocaleDateString()}
                    </Text>
                </View>
            )}

            {document.note && document.note.length > 0 && (
                <View style={styles.documentNote}>
                    <MaterialCommunityIcons name="note-text" size={16} color={colors.warning} />
                    <Text style={styles.documentNoteText}>{document.note}</Text>
                </View>
            )}
        </View>
    );
};

// Vehicle dropdown item
const VehicleDropdownItem = ({ vehicle, isExpanded, onToggle, onImagePress, onMakeRunning, makingRunningId ,onUpload }) => {
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(animation, {
            toValue: isExpanded ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isExpanded]);

    const maxHeight = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 2000], // Adjust based on content
    });

    const rotateIcon = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const documentsArray = Object.entries(vehicle.documents || {});
    const isApproved = vehicle.vehicleApprovedForRunning?.status === 'approved';
    const isCurrentlyRunning = vehicle.isActive;
    const isLoadingThisVehicle = makingRunningId === vehicle._id;

    return (
        <View style={[
            styles.vehicleCard,
            isCurrentlyRunning && styles.currentVehicleCard
        ]}>
            <TouchableOpacity style={styles.vehicleHeader} onPress={onToggle}>
                <View style={styles.vehicleHeaderLeft}>
                    <View style={[
                        styles.vehicleIcon,
                        isCurrentlyRunning && styles.currentVehicleIcon
                    ]}>
                        <MaterialCommunityIcons 
                            name="car" 
                            size={24} 
                            color={isCurrentlyRunning ? colors.default : colors.primary} 
                        />
                    </View>
                    <View style={styles.vehicleInfo}>
                        <View style={styles.vehicleNameRow}>
                            <Text style={styles.vehicleName}>
                                {vehicle.vehicleDetails?.name || 'Unknown Vehicle'}
                            </Text>
                            {isCurrentlyRunning && <DefaultBadge />}
                        </View>
                        <Text style={styles.vehicleNumber}>
                            {vehicle.vehicleDetails?.numberPlate || 'No Number'}
                        </Text>
                        <Text style={styles.vehicleType}>
                            Type: {vehicle.vehicleDetails?.type || 'Unknown'}
                        </Text>
                    </View>
                </View>
                <View style={styles.vehicleHeaderRight}>
                    <StatusBadge status={vehicle.vehicleApprovedForRunning?.status} />
                    <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </Animated.View>
                </View>
            </TouchableOpacity>

            <Animated.View style={[styles.vehicleContent, { maxHeight }]}>
                <View style={styles.vehicleDetails}>
                    <Text style={styles.sectionTitle}>📋 Vehicle Information</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Created Date</Text>
                            <Text style={styles.infoValue}>
                                {new Date(vehicle.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Last Updated</Text>
                            <Text style={styles.infoValue}>
                                {new Date(vehicle.updatedAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <Text style={styles.infoValue}>
                                {vehicle.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Running Status</Text>
                            <Text style={[
                                styles.infoValue,
                                { color: isCurrentlyRunning ? colors.default : colors.textSecondary }
                            ]}>
                                {isCurrentlyRunning ? 'Currently Running' : 'Not Running'}
                            </Text>
                        </View>
                    </View>
         <TouchableOpacity 
                            style={[
                                styles.makeRunningButton,
                                isLoadingThisVehicle && styles.makeRunningButtonLoading
                            ]}
                            onPress={() => onMakeRunning(vehicle._id)}
                            disabled={isLoadingThisVehicle}
                        >
                            {isLoadingThisVehicle ? (
                                <ActivityIndicator size="small" color={colors.surface} />
                            ) : (
                                <MaterialCommunityIcons name="play-circle" size={20} color={colors.surface} />
                            )}
                            <Text style={styles.makeRunningButtonText}>
                                {isLoadingThisVehicle ? 'Setting as Running...' : 'Make it Running'}
                            </Text>
                        </TouchableOpacity>
                    <Text style={styles.sectionTitle}>📄 Documents ({documentsArray.length})</Text>
                    <View style={styles.documentsContainer}>
                        {documentsArray.map(([docKey, document]) => (
                            <DocumentCard
                                key={docKey}
                                docKey={docKey}
                                 document={{ ...document, loading: vehicle.loading?.[docKey] }}
                                  vehicleId={vehicle._id}
                            onUpload={onUpload}

                                onImagePress={onImagePress}
                            />
                        ))}
                    </View>
                    

                    {documentsArray.length === 0 && (
                        <View style={styles.emptyDocuments}>
                            <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyDocumentsText}>No documents found</Text>
                        </View>
                    )}

                
               
                
                    {isCurrentlyRunning && (
                        <View style={styles.currentlyRunningInfo}>
                            <MaterialCommunityIcons name="information" size={20} color={colors.default} />
                            <Text style={styles.currentlyRunningText}>
                                This vehicle is currently set for taking rides
                            </Text>
                        </View>
                    )}
                </View>
            </Animated.View>
        </View>
    );
};

export default function PendingVehicleDetails  () {
    const navigation = useNavigation();
    const {token} = loginStore()
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [vehicleData, setVehicleData] = useState([]);
    const [expandedVehicle, setExpandedVehicle] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState({ url: '', title: '' });
    const [makingRunningId, setMakingRunningId] = useState(null);
      const [uploadingDoc, setUploadingDoc] = useState({});
    const fetchVehicleDetails = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
         
            if (token) {
            
                const response = await axiosInstance.get('/api/v1/rider/get-vehicles-details',{
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (response.data.data) {
                    setVehicleData(response.data.data);
                } else {
                    setVehicleData([]);
                }
            }
        } catch (error) {
            console.log("Error:", error.response?.data?.message || error.message);
            Alert.alert('Error', 'Failed to fetch vehicle details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const changeVehicleForRunning = async (activeVehicleId) => {
        setMakingRunningId(activeVehicleId);
        
        try {
      
            if (token) {
             
                     const response = await axiosInstance.post('/api/v1/rider/change-vehicle-for-driver',  { activeVehicleId },{
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (response.data.success) {
                    Alert.alert(
                        "Success", 
                        "Vehicle has been updated for taking rides",
                        [{ text: "OK", onPress: () => fetchVehicleDetails() }]
                    );
                }
            }
        } catch (error) {
            console.log("Error:", error.response?.data?.message || error.message);
            Alert.alert('Error', 'Failed to update vehicle details');
        } finally {
            setMakingRunningId(null);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchVehicleDetails();
            return () => {};
        }, [])
    );

    const handleVehicleToggle = (vehicleId) => {
        setExpandedVehicle(expandedVehicle === vehicleId ? null : vehicleId);
    };

    const handleImagePress = (url, title) => {
        setSelectedImage({ url, title });
        setImageModalVisible(true);
    };

    const onRefresh = () => {
        fetchVehicleDetails(true);
    };

    const handleMakeRunning = (vehicleId) => {
        Alert.alert(
            "Make Vehicle Running",
            "Are you sure you want to set this vehicle for taking rides?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Yes", onPress: () => changeVehicleForRunning(vehicleId) }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading vehicle details...</Text>
            </View>
        );
    }

    const handleUploadDocument = async (vehicleId, docKey) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setVehicleData((prev) =>
          prev.map((vehicle) =>
            vehicle._id === vehicleId
              ? {
                  ...vehicle,
                  loading: { ...vehicle.loading, [docKey]: true },
                }
              : vehicle
          )
        );

        const formData = new FormData();
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('documents', {
          uri,
          name: `${docKey}.${fileType}`,
          type: `image/${fileType}`,
        });
        formData.append('documentTypes', docKey);

        const response = await axiosInstance.put(`/api/v1/rider/update_vehicle/${vehicleId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          Alert.alert('Success', 'Document uploaded successfully', [
            { text: 'OK', onPress: () => fetchVehicleDetails() },
          ]);
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }
      }
    } catch (error) {
      console.log('Error uploading document:', error.response?.data?.message || error.message);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setVehicleData((prev) =>
        prev.map((vehicle) =>
          vehicle._id === vehicleId
            ? {
                ...vehicle,
                loading: { ...vehicle.loading, [docKey]: false },
              }
            : vehicle
        )
      );
    }
  };

    const currentRunningVehicle = vehicleData.find(v => v.isDefault);
    const approvedCount = vehicleData.filter(v => v.vehicleApprovedForRunning?.status === 'approved').length;

    return (
        <SafeAreaView  style={styles.container}>
   <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Vehicle Details</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.content}>
                    {vehicleData.length > 0 ? (
                        <>
                            <View style={styles.summaryCard}>
                                <MaterialCommunityIcons name="car-multiple" size={32} color={colors.primary} />
                                <Text style={styles.summaryTitle}>
                                    {vehicleData.length} Vehicle{vehicleData.length > 1 ? 's' : ''} Found
                                </Text>
                                <Text style={styles.summaryDescription}>
                                    {approvedCount} approved • {currentRunningVehicle ? '1 currently running' : 'None currently running'}
                                </Text>
                            </View>

                            {vehicleData.map((vehicle) => (
                                <VehicleDropdownItem
                                    key={vehicle._id}
                                    vehicle={vehicle}
                                                                         onUpload={handleUploadDocument}

                                    isExpanded={expandedVehicle === vehicle._id}
                                    onToggle={() => handleVehicleToggle(vehicle._id)}
                                    onImagePress={handleImagePress}
                                    onMakeRunning={handleMakeRunning}
                                    makingRunningId={makingRunningId}
                                />
                            ))}
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="car-off" size={80} color={colors.textSecondary} />
                            <Text style={styles.emptyTitle}>No Vehicles Found</Text>
                            <Text style={styles.emptyDescription}>
                                You don't have any vehicle registrations at the moment.
                            </Text>
                            <TouchableOpacity
                                style={styles.addVehicleButton}
                                onPress={() => navigation.navigate('VehicleRegistrationForm')}
                            >
                                <MaterialCommunityIcons name="plus" size={20} color={colors.surface} />
                                <Text style={styles.addVehicleButtonText}>Add New Vehicle</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <ImageViewerModal
                visible={imageModalVisible}
                imageUrl={selectedImage.url}
                title={selectedImage.title}
                onClose={() => setImageModalVisible(false)}
            />
        </View>
        </SafeAreaView>
     
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 16,
        paddingHorizontal: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.surface,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    summaryCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 12,
        marginBottom: 8,
    },
    summaryDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    vehicleCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    currentVehicleCard: {
        borderWidth: 2,
        borderColor: colors.default,
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: colors.accent,
    },
    vehicleHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    vehicleIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    currentVehicleIcon: {
        backgroundColor: colors.default + '20',
        borderWidth: 2,
        borderColor: colors.default,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    vehicleName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginRight: 8,
    },
    vehicleNumber: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 2,
    },
    vehicleType: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    vehicleHeaderRight: {
        alignItems: 'flex-end',
    },
    defaultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.default + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    defaultText: {
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 4,
        color: colors.default,
    },
    vehicleContent: {
        overflow: 'hidden',
    },
    vehicleDetails: {
        padding: 20,
        paddingTop: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 20,
        marginBottom: 16,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    infoItem: {
        width: '50%',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
    },
    documentsContainer: {
        gap: 12,
    },
    documentCard: {
        backgroundColor: colors.secondary,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    documentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    documentTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    documentIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    documentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    makeRunningButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success,
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    makeRunningButtonLoading: {
        backgroundColor: colors.textSecondary,
    },
    makeRunningButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    currentlyRunningInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.default + '20',
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
    },
    currentlyRunningText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: colors.default,
        fontWeight: '500',
    },
    documentImageContainer: {
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
    },
    documentImage: {
        width: '100%',
        height: 120,
        backgroundColor: colors.border,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 8,
        alignItems: 'center',
    },
    imageOverlayText: {
        color: colors.surface,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    documentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    documentInfoText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginLeft: 6,
    },
    documentNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.warning + '20',
        padding: 8,
        borderRadius: 6,
        marginTop: 8,
    },
    documentNoteText: {
        fontSize: 12,
        color: colors.warning,
        marginLeft: 6,
        flex: 1,
        lineHeight: 16,
    },
    emptyDocuments: {
        alignItems: 'center',
        padding: 32,
    },
    emptyDocumentsText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        marginTop: 50,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 20,
        marginBottom: 12,
    },
    emptyDescription: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    addVehicleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    addVehicleButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    imageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageModalContent: {
        width: width * 0.95,
        height: height * 0.8,
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
    },
    imageModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: colors.secondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    imageModalTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    imageModalClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        flex: 1,
        width: '100%',
    },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  uploadButtonLoading: {
    backgroundColor: colors.textSecondary,
  },
  uploadButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});