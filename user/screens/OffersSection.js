import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const offers = [
  {
    badge: "Upto 40% OFF",
    title: "Get a Upto 40% Off on Every Ride for New Users ",
    description: "save more with every ride you take",
  },
  {
    badge: "Upto 20% Extra OFF",
    title: "Weekend Special",
    description: "Save big on weekend rides with friends",
  },
  {
    badge: "Upto 30% OFF",
    title: "Courier Delivery",
    description: "Fast and secure courier service at discounted rates",
  },
];

const OffersSection = () => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>New Launch Special Offers</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {offers.map((offer, index) => (
        <View key={index} style={styles.offerCard}>
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>{offer.badge}</Text>
          </View>
          <Text style={styles.offerTitle}>{offer.title}</Text>
          <Text style={styles.offerDescription}>{offer.description}</Text>
        </View>
      ))}
    </ScrollView>
  </View>
);

export default OffersSection;

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: "#F9FAFB",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
  },
  offerCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginRight: 16,
    width: 200,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // Android shadow
  },
  offerBadge: {
    backgroundColor: "#000",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  offerBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  offerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 10,
    color: "#6B7280",
    lineHeight: 16,
  },
});
