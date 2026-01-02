import { useEffect, useState } from "react"
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Image, Switch, Alert, KeyboardAvoidingView, Platform } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { launchImageLibrary } from "react-native-image-picker"
import axios from 'axios'
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useNavigation } from "@react-navigation/native"
import * as ImagePicker from 'expo-image-picker';

export function AddListing() {
  const [loading, setLoading] = useState(false)
  const [restaurant_id, setRestaurant_id] = useState(null);
  const navigation = useNavigation();
  const [error, setError] = useState({});

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

  const [formData, setFormData] = useState({
    food_name: "",
    description: "",
    food_price: "",
    food_category: "Veg",
    food_availability: true,
    what_includes: [],
    restaurant_id: '',
  })


  useEffect(() => {
    if (restaurant_id) {
      console.log("Updated restaurant_id:", restaurant_id); // Debug state update
    }
  }, [restaurant_id]);

  const [selectedImages, setSelectedImages] = useState([])
  const [currentInclude, setCurrentInclude] = useState("")

  const pickImage = async () => {
    try {
      if (selectedImages.length >= 1) {
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
  };


  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const addInclude = () => {
    if (currentInclude.trim()) {
      setFormData((prev) => ({
        ...prev,
        what_includes: [...prev.what_includes, currentInclude.trim()],
      }))
      setCurrentInclude("")
    }
  }

  const removeInclude = (index) => {
    setFormData((prev) => ({
      ...prev,
      what_includes: prev.what_includes.filter((_, i) => i !== index),
    }))
  }

  const validateForm = () => {
    if (!formData.food_name.trim()) {
      Alert.alert("Error", "Please enter dish name")
      return false
    }
    if (!formData.description.trim()) {
      Alert.alert("Error", "Please enter description")
      return false
    }
    if (!formData.food_price || isNaN(formData.food_price)) {
      Alert.alert("Error", "Please enter a valid price")
      return false
    }

    if (formData.what_includes.length === 0) {
      Alert.alert("Error", "Please add at least one item in What Includes")
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formD = new FormData();

      formD.append("food_name", formData.food_name);
      formD.append("description", formData.description);
      formD.append("food_price", formData.food_price);
      formD.append("food_category", formData.food_category);
      formD.append("food_availability", formData.food_availability.toString());
      formD.append("restaurant_id", restaurant_id);

      // Append 'what_includes' as JSON string
      formD.append("what_includes", formData.what_includes);

      // Append the selected image (assuming only one image is allowed)
      if (selectedImages.length > 0) {
        const image = selectedImages[0];
        formD.append("images", {
          uri: image.uri,
          name: `photo_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      }

      const response = await axios.post(
        "https://appapi.olyox.com/api/v1/tiffin/register_listing",
        formD,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const result = response.data;

      if (result.success) {
        Alert.alert("Success", "Food listing created successfully");
        // Reset form
        setFormData({
          food_name: "",
          description: "",
          food_price: "",
          food_category: "Veg",
          food_availability: true,
          what_includes: [],
          restaurant_id: "",
        });
        setSelectedImages([]);
        setCurrentInclude("");
        setLoading(false);
        navigation.navigate('AllFood')
      } else {
        Alert.alert("Error", result.error || "Something went wrong");
        setLoading(false);
      }
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.message || "Image upload failed");
      console.log("Error submitting form:", error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="food" size={30} color="#FF6B6B" />
          <Text style={styles.headerText}>Add New Dish</Text>
        </View>

        {/* Image Upload Section */}
        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
          {selectedImages.length > 0 ? (
            <View style={styles.imagePreviewContainer}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                    <Icon name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 5 && (
                <TouchableOpacity style={styles.addMoreImages} onPress={pickImage}>
                  <Icon name="plus" size={40} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Icon name="camera" size={40} color="#999" />
              <Text style={styles.uploadText}>Upload Dish Images</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Dish Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dish Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter dish name"
              value={formData.food_name}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, food_name: text }))}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your dish"
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
            />
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={formData.food_price}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, food_price: text }))}
            />
          </View>

          {/* Food Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Food Category</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.categoryButton, formData.food_category === "Veg" && styles.categoryButtonActive]}
                onPress={() => setFormData((prev) => ({ ...prev, food_category: "Veg" }))}
              >
                <Text
                  style={[styles.categoryButtonText, formData.food_category === "Veg" && styles.categoryButtonTextActive]}
                >
                  Veg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.categoryButton, formData.food_category === "Non-Veg" && styles.categoryButtonActive]}
                onPress={() => setFormData((prev) => ({ ...prev, food_category: "Non-Veg" }))}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    formData.food_category === "Non-Veg" && styles.categoryButtonTextActive,
                  ]}
                >
                  Non-Veg
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Food Availability Toggle */}
          <View style={[styles.row, styles.availabilityToggle]}>
            <Text style={styles.label}>Food Availability</Text>
            <Switch
              value={formData.food_availability}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, food_availability: value }))}
              trackColor={{ false: "#FF6B6B", true: "#4CAF50" }}
              thumbColor={formData.food_availability ? "#fff" : "#fff"}
            />
          </View>

          {/* What Includes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What Includes *</Text>
            <View style={styles.tagInput}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Add items included"
                value={currentInclude}
                onChangeText={setCurrentInclude}
                onSubmitEditing={addInclude}
              />
              <TouchableOpacity style={styles.addTagButton} onPress={addInclude}>
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagContainer}>
              {formData.what_includes.map((item, index) => (
                <TouchableOpacity key={index} style={styles.tag} onPress={() => removeInclude(index)}>
                  <Text style={styles.tagText}>{item}</Text>
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>{loading ? 'Adding...' : 'Add Dish'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#FF6B6B",
  },
  imageUpload: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  imagePreview: {
    position: "relative",
    marginRight: 10,
    marginBottom: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  removeImageBtn: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  addMoreImages: {
    width: 80,
    height: 80,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    color: "#999",
    marginTop: 10,
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  textArea: {
    height: 120,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    alignItems: "center",
    marginRight: 5,
  },
  categoryButtonActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  categoryButtonText: {
    color: "#333",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  availabilityToggle: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tagInput: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  addTagButton: {
    backgroundColor: "#FF6B6B",
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 5,
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  tagText: {
    marginRight: 5,
  },
  submitButton: {
    backgroundColor: "#FF6B6B",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
})

export default AddListing

