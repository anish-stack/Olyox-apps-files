import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
// You can use lucide-react-native or react-native-vector-icons
import { Star, Clock, Users } from "lucide-react-native";

const whyOlyoxFeatures = [
  {
    icon: Star,
    title: "5-Star Rated",
    description: "Top-rated drivers and excellent service quality",
  },
  {
    icon: Clock,
    title: "24/7 Available",
    description: "Round the clock service whenever you need",
  },
  {
    icon: Users,
    title: "Trusted Community",
    description: "Join Thousands of satisfied customers",
  },
];

const WhyOlyoxSection = () => {
  return (
    <ScrollView
      style={styles.section}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Why Choose OLYOX?</Text>
      <View style={styles.whyOlyoxContainer}>
        {whyOlyoxFeatures.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <View key={index} style={styles.whyOlyoxCard}>
              <View style={styles.whyOlyoxIcon}>
                <IconComponent size={24} color="#E53E3E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.whyOlyoxTitle}>{feature.title}</Text>
                <Text style={styles.whyOlyoxDescription}>
                  {feature.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default WhyOlyoxSection;

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: "#F9FAFB",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
  },
  whyOlyoxContainer: {
    gap: 16,
  },
  whyOlyoxCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // Android shadow
  },
  whyOlyoxIcon: {
    backgroundColor: "#FEF2F2",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  whyOlyoxTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  whyOlyoxDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});
