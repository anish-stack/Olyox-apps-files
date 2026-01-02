
import { View, Text, FlatList, TextInput, TouchableOpacity, Linking, ActivityIndicator, ScrollView } from "react-native"
import { useEffect, useState, useCallback } from "react"
import Layout from "../../components/Layout/Layout"
import { useToken } from "../../context/AuthContext"
import { API_BASE_URL_V2 } from "../../constant/Api"
import axios from "axios"
import { Feather, MaterialIcons } from "@expo/vector-icons"
import styles from "./AllGuests.style"

export default function AllGuests() {
  const { token } = useToken()
  const [guests, setGuests] = useState([])
  const [filteredGuests, setFilteredGuests] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(`${API_BASE_URL_V2}/get-guests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (data.success) {
        setGuests(data.data)
        setFilteredGuests(data.data)
      }
    } catch (error) {
      setError("Failed to load guests")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (searchQuery) {
      const filtered = guests.filter(
        (guest) =>
          guest.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || guest.guestPhone.includes(searchQuery),
      )
      setFilteredGuests(filtered)
    } else {
      setFilteredGuests(guests)
    }
  }, [searchQuery, guests])

  const handleWhatsAppCall = (phoneNumber) => {
    Linking.openURL(`whatsapp://send?phone=${phoneNumber}`)
  }

  const renderGuestItem = ({ item }) => {
    const totalAmount = item.totalDays * item.totalExpense

    return (
      <View style={styles.guestCard}>
        <View style={styles.guestHeader}>
          <View style={styles.guestInfo}>
            <Text style={styles.guestName}>{item.guestName}</Text>
            <Text style={styles.guestPhone}>{item.guestPhone}</Text>
          </View>
          <TouchableOpacity style={styles.whatsappButton} onPress={() => handleWhatsAppCall(item.guestPhone)}>
            <Feather name="phone" size={18} color="#fff" />
            <Text style={styles.whatsappButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guestDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Days</Text>
            <Text style={styles.detailValue}>{item.totalDays}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Rate</Text>
            <Text style={styles.detailValue}>₹{item.totalExpense}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.detailValueTotal}>₹{totalAmount}</Text>
          </View>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text style={styles.loadingText}>Loading guests...</Text>
        </View>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#D32F2F" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Layout>
    )
  }

  return (
    <Layout activeTab="guests">
      <View style={styles.container}>
       

        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#D32F2F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color="#D32F2F" />
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredGuests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={48} color="#D32F2F" />
            <Text style={styles.emptyText}>No guests found</Text>
          </View>
        ) : (
           <ScrollView showsVerticalScrollIndicator={false}>
             <View style={styles.listContainer}>
            {filteredGuests.map((item, index) => (
              <View key={index}>
                {renderGuestItem({ item })}
              </View>
            ))}
          </View>
           </ScrollView>
          
        )}
      </View>
    </Layout>
  )
}

