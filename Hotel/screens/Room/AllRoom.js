import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, RefreshControl, Switch, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout/Layout';
import axios from 'axios';
import { useToken } from '../../context/AuthContext';
import { API_BASE_URL_V2 } from '../../constant/Api';
import styles from './AllRoomStyles';

export default function AllRoom() {
  const navigation = useNavigation();
  const { token } = useToken();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const fetchAllRooms = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL_V2}/find-My-Rooms`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.rooms.length > 0) {
        setRooms(data.rooms);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllRooms();
  }, [token]);

  const toggleRoomAvailability = async (roomId, currentStatus) => {
    try {
      console.log(roomId)
      // Update local state immediately for responsive UI


      // Here you would typically make an API call to update the status on the server
      const { data } = await axios.post(`${API_BASE_URL_V2}//hotel-Room-toggle?roomId=${roomId}`,
        { isRoomAvailable: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setRooms(rooms.map(room =>
          room._id === roomId
            ? { ...room, isRoomAvailable: !currentStatus }
            : room
        ));

      } else {
        alert("Failed To Updated Status try again")
      }

    } catch (error) {
      console.error('Error toggling room availability:', error);
      // Revert the change if the API call fails
      alert(error.response.data.message || "Failed To Updated Status try again")

      setRooms(rooms.map(room =>
        room._id === roomId
          ? { ...room, isRoomAvailable: currentStatus }
          : room
      ));
    }
  };

  const handleDelete = async (roomId) => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${API_BASE_URL_V2}/delete-hotels?roomId=${roomId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(data)
      alert("Room Deleted Successful ")
      fetchAllRooms()
      setLoading(false)

    } catch (error) {
      console.log(error.response.data)
      alert(error.response.data?.message)
      setLoading(false)


    }
  }

  const handleRefresh = useCallback(() => {
    fetchAllRooms();
  }, [refresh]);

  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.roomCard}
      onPress={() => navigation.navigate('RoomDetail', { roomId: item._id })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.main_image.url }} style={styles.roomImage} />
        {item.isPackage && (
          <View style={styles.packageBadge}>
            {/* <Package size={14} color="#ffffff" /> */}
            <Text style={styles.packageText}>Package</Text>
          </View>
        )}
      </View>
      <View style={styles.roomInfo}>
        <Text style={styles.roomType}>{item.room_type}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{item.book_price}</Text>
          <Text style={styles.cutPrice}>₹{item.cut_price}</Text>
          <Text style={styles.discount}>{item.discount_percentage}% OFF</Text>
        </View>
        <Text style={styles.allowedPerson}>For {item.allowed_person} Persons</Text>
        <View style={styles.availabilityContainer}>
          <Text style={styles.availabilityText}>
            Booking {item.isRoomAvailable ? 'Available' : 'Unavailable'}
          </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#6366f1" }}
            thumbColor={item.isRoomAvailable ? "#ffffff" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => toggleRoomAvailability(item._id, item.isRoomAvailable)}
            value={item.isRoomAvailable}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => handleDelete(item?._id)}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <Layout activeTab={"rooms"} >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout activeTab={"rooms"}>

      <ScrollView refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refresh} />}>

        {rooms.length > 0 ? (
          <FlatList
            data={rooms}
            renderItem={renderRoomItem}
            keyExtractor={item => item._id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.noRooms}>No rooms available.</Text>
            <Text style={styles.noRoomsSubtext}>Add your first room to get started.</Text>
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}