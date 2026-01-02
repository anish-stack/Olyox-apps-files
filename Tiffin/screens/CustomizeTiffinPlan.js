import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
// import ImagePicker from 'react-native-image-picker';

export function CustomizeTiffinPlan() {
  const [loading, setLoading] = useState(false);
  const [restaurant_id, setRestaurant_id] = useState(null);
  const navigation = useNavigation();
  const [selectImage, setSelectedImages] = useState([])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (!storedToken) {
          navigation.replace('Login');
          return;
        }

        const { data } = await axios.get(
          'https://appapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
          {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          }
        );

        // console.log("API Response:", data); // Debug API response

        if (data?.data?._id) {
          setRestaurant_id(data.data._id);
        } else {
          console.error("Error: restaurant_id not found in API response");
        }

      } catch (error) {
        console.error("Internal server error", error);
      }
    };

    fetchProfile();
  }, []);

  const [plan, setPlan] = useState({
    packageName: '',
    duration: 7,
    // images: null,
    meals: {
      breakfast: {
        enabled: false,
        items: []
      },
      lunch: {
        enabled: false,
        items: []
      },
      dinner: {
        enabled: false,
        items: []
      }
    },
    preferences: {
      isVeg: true,
      spiceLevel: 'medium',
      includeWeekends: true
    },
    restaurant_id: restaurant_id
  });

  // Separate newItem state for each meal type
  const [newItems, setNewItems] = useState({
    breakfast: { name: '', price: '' },
    lunch: { name: '', price: '' },
    dinner: { name: '', price: '' }
  });

  const [activeMeal, setActiveMeal] = useState(null);

  // const selectImage = async () => {
  //   const options = {
  //     mediaType: 'photo',
  //     quality: 1,
  //   };

  //   // ImagePicker.launchImageLibrary(options,(res)=>{
  //   //   console.log("res",res)
  //   // })

  //   try {
  //     // console.log("object")
  //     const result = await launchImageLibrary(options);
  //     // console.log("result",result)
  //     if (result.assets && result.assets[0]) {
  //       setPlan(prev => ({
  //         ...prev,
  //         images: result.assets[0].uri || 'https://placehold.co/600x400'
  //       }));
  //     }
  //   } catch (error) {
  //     Alert.alert('Error', 'Failed to pick image');
  //   }
  // };

  const pickImage = async () => {
    try {
      if (selectImage.length >= 1) {
        Alert.alert("Limit Exceeded", "You can only upload up to 1 image");
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Denied", "You need to allow access to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedImages([result.assets[0]]); // Store only the latest selected image
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  }

  const calculateMealTotal = (mealItems) => {
    return mealItems.reduce((sum, item) => sum + Number(item.price), 0);
  };

  const calculateTotalPrice = () => {
    let total = 0;
    Object.entries(plan.meals).forEach(([meal, data]) => {
      if (data.enabled) {
        total += calculateMealTotal(data.items);
      }
    });
    const days = plan.preferences.includeWeekends ? plan.duration : Math.floor(plan.duration * 5 / 7);
    return total * days;
  };

  const addItemToMeal = (mealType) => {
    const newItem = newItems[mealType];

    if (!newItem.name || !newItem.price) {
      Alert.alert('Invalid Input', 'Please enter both item name and price');
      return;
    }

    // Convert price to number
    const itemToAdd = {
      name: newItem.name,
      price: Number(newItem.price)
    };

    setPlan(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealType]: {
          ...prev.meals[mealType],
          items: [...prev.meals[mealType].items, itemToAdd]
        }
      }
    }));

    // Reset only the specific meal type's new item
    setNewItems(prev => ({
      ...prev,
      [mealType]: { name: '', price: '' }
    }));
  };

  const removeItem = (meal, index) => {
    setPlan(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [meal]: {
          ...prev.meals[meal],
          items: prev.meals[meal].items.filter((_, i) => i !== index)
        }
      }
    }));
  };

  // Update the handleSubmit function to properly handle image upload

  const handleSubmit = async () => {
    setLoading(true);
    const totalPrice = calculateTotalPrice();
    const formData = new FormData();

    // Convert meals object to match the schema
    const mealsData = {
      breakfast: {
        enabled: plan.meals.breakfast.enabled,
        items: plan.meals.breakfast.items.map(item => ({
          name: item.name,
          price: Number(item.price)
        }))
      },
      lunch: {
        enabled: plan.meals.lunch.enabled,
        items: plan.meals.lunch.items.map(item => ({
          name: item.name,
          price: Number(item.price)
        }))
      },
      dinner: {
        enabled: plan.meals.dinner.enabled,
        items: plan.meals.dinner.items.map(item => ({
          name: item.name,
          price: Number(item.price)
        }))
      }
    };

    // Append form data
    formData.append('duration', plan.duration.toString());
    formData.append('meals', JSON.stringify(mealsData));
    formData.append('preferences', JSON.stringify(plan.preferences));
    formData.append('totalPrice', totalPrice.toString());
    formData.append('restaurant_id', restaurant_id);
    formData.append('packageName', plan.packageName);

    // Handle image upload
    if (selectImage.length > 0) {
      const image = selectImage[0];
      const imageUri = image.uri;
      const filename = imageUri.split('/').pop();

      // Infer the type from the extension
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('images', {
        uri: imageUri,
        name: filename,
        type
      });
    }

    try {
      const response = await axios.post(
        'https://appapi.olyox.com/api/v1/tiffin/create_custom_tiffin',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Tiffin plan created successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to create tiffin plan');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to create tiffin plan');
    } finally {
      setLoading(false);
    }
  };

  const renderMealCard = (mealType, icon) => {
    const mealData = plan.meals[mealType];
    const isActive = activeMeal === mealType;
    const total = calculateMealTotal(mealData.items);
    const currentNewItem = newItems[mealType];

    return (
      <View style={styles.mealSection}>
        <TouchableOpacity
          style={[
            styles.mealHeader,
            mealData.enabled && styles.mealHeaderActive
          ]}
          onPress={() => {
            setPlan(prev => ({
              ...prev,
              meals: {
                ...prev.meals,
                [mealType]: {
                  ...prev.meals[mealType],
                  enabled: !prev.meals[mealType].enabled
                }
              }
            }));
          }}
        >
          <View style={styles.mealHeaderLeft}>
            <Icon
              name={icon}
              size={24}
              color={mealData.enabled ? '#fff' : '#666'}
            />
            <Text style={[
              styles.mealHeaderText,
              mealData.enabled && styles.mealHeaderTextActive
            ]}>
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
          </View>
          <Text style={[
            styles.mealTotal,
            mealData.enabled && styles.mealTotalActive
          ]}>
            ₹{total}
          </Text>
        </TouchableOpacity>

        {mealData.enabled && (
          <View style={styles.mealContent}>
            {mealData.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  <TouchableOpacity
                    onPress={() => removeItem(mealType, index)}
                    style={styles.removeButton}
                  >
                    <Icon name="close" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.addItemSection}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.itemInput}
                  placeholder="Item name"
                  value={currentNewItem.name}
                  onChangeText={text => setNewItems(prev => ({
                    ...prev,
                    [mealType]: { ...prev[mealType], name: text }
                  }))}
                />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Price"
                  keyboardType="numeric"
                  value={currentNewItem.price}
                  onChangeText={text => setNewItems(prev => ({
                    ...prev,
                    [mealType]: { ...prev[mealType], price: text }
                  }))}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addItemToMeal(mealType)}
                >
                  <Icon name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
  <View style={styles.header}>
          <Icon name="food-variant" size={32} color="#FF6B6B" />
          <Text style={styles.headerText}>Customize Your Tiffin Plan</Text>
        </View>
      <ScrollView style={styles.container}>

      

        {/* Image Upload Section */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
            {plan.images ? (
              <Image source={{ uri: plan.images }} style={styles.selectedImage} />
            ) : (
              <>
                <Icon name="camera" size={32} color="#666" />
                <Text style={styles.imageUploadText}>Upload Tiffin Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Duration Selection */}
        <View style={styles.durationCard}>
          <Text style={styles.cardTitle}>Plan Duration</Text>
          <View style={styles.durationButtons}>
            {[7, 15, 30].map(days => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.durationButton,
                  plan.duration === days && styles.durationButtonActive
                ]}
                onPress={() => setPlan(prev => ({ ...prev, duration: days }))}
              >
                <Text style={[
                  styles.durationText,
                  plan.duration === days && styles.durationTextActive
                ]}>
                  {days} Days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View
          style={styles.durationCard}
        >
          <Text style={styles.cardTitle}>Package Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter package name"
            value={plan.packageName}
            onChangeText={(text) => setPlan((prev) => ({ ...prev, packageName: text }))}
          />
        </View>

        {/* Preferences Section */}
        <View style={styles.preferencesCard}>
          <Text style={styles.cardTitle}>Preferences</Text>

          {/* Veg/Non-veg Toggle */}
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Vegetarian</Text>
            <TouchableOpacity
              style={[styles.toggleButton, plan.preferences.isVeg && styles.toggleButtonActive]}
              onPress={() => setPlan(prev => ({
                ...prev,
                preferences: { ...prev.preferences, isVeg: !prev.preferences.isVeg }
              }))}
            >
              <Icon
                name={plan.preferences.isVeg ? "leaf" : "food-drumstick"}
                size={24}
                color={plan.preferences.isVeg ? "#fff" : "#666"}
              />
            </TouchableOpacity>
          </View>

          {/* Spice Level Selection */}
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Spice Level</Text>
            <View style={styles.spiceLevelButtons}>
              {["low", "medium", "high"].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.spiceLevelButton,
                    plan.preferences.spiceLevel === level && styles.spiceLevelButtonActive
                  ]}
                  onPress={() => setPlan(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, spiceLevel: level }
                  }))}
                >
                  <Text style={[
                    styles.spiceLevelText,
                    plan.preferences.spiceLevel === level && styles.spiceLevelTextActive
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Weekend Toggle */}
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Include Weekends</Text>
            <TouchableOpacity
              style={[styles.toggleButton, plan.preferences.includeWeekends && styles.toggleButtonActive]}
              onPress={() => setPlan(prev => ({
                ...prev,
                preferences: { ...prev.preferences, includeWeekends: !prev.preferences.includeWeekends }
              }))}
            >
              <Icon
                name={plan.preferences.includeWeekends ? "calendar-check" : "calendar-remove"}
                size={24}
                color={plan.preferences.includeWeekends ? "#fff" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Meals Section */}
        <View style={styles.mealsCard}>
          <Text style={styles.cardTitle}>Select Meals & Items</Text>
          {renderMealCard('breakfast', 'coffee')}
          {renderMealCard('lunch', 'food')}
          {renderMealCard('dinner', 'food-variant')}
        </View>

        {/* Price Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Price</Text>
            <Text style={styles.summaryPrice}>₹{calculateTotalPrice()}</Text>
          </View>
          <Text style={styles.summaryNote}>
            {plan.duration} days × {Object.values(plan.meals).filter(m => m.enabled).length} meals per day
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          {
            loading ? (
              <>
                <Text style={styles.submitText}>Adding...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitText}>Confirm Plan</Text>
                <Icon name="check-circle" size={24} color="#fff" />
              </>
            )
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  imageSection: {
    margin: 15,
    alignItems: 'center',
  },
  imageUploadButton: {
    width: '100%',
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  imageUploadText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  durationCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  preferencesCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggleButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  spiceLevelButtons: {
    flexDirection: 'row',
  },
  spiceLevelButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginLeft: 10,
  },
  spiceLevelButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  spiceLevelText: {
    color: '#666',
  },
  spiceLevelTextActive: {
    color: '#fff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  durationText: {
    color: '#666',
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#fff',
  },
  mealsCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mealSection: {
    marginBottom: 15,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
  },
  mealHeaderActive: {
    backgroundColor: '#FF6B6B',
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealHeaderText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  mealHeaderTextActive: {
    color: '#fff',
  },
  mealTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  mealTotalActive: {
    color: '#fff',
  },
  mealContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 16,
    color: '#333',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
  },
  removeButton: {
    padding: 5,
  },
  addItemSection: {
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInput: {
    flex: 2,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 24,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  summaryNote: {
    marginTop: 5,
    color: '#666',
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    margin: 15,
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
});

export default CustomizeTiffinPlan;