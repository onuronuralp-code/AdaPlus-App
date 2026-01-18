import React from 'react';
import { Dimensions, FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - (CARD_MARGIN * 3 + 32)) / 2; // 32 for screen padding

const ISLANDS = [
  {
    id: '1',
    name: 'KINALIADA',
    image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?q=80&w=600&auto=format&fit=crop', // Scenic view
    description: 'The closest island to Istanbul, known for its reddish soil, extensive beaches, and lack of horse carriages.',
    sunset: '19:42',
  },
  {
    id: '2',
    name: 'BURGAZADA',
    image: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=600&auto=format&fit=crop', // Blue water
    description: 'A peaceful retreat known for its writers, wooden mansions, and the cloudy Sait Faik Abasıyanık Museum.',
    sunset: '19:45',
  },
  {
    id: '3',
    name: 'HEYBELIADA',
    image: 'https://images.unsplash.com/photo-1566371486490-560ded23b5e4?q=80&w=600&auto=format&fit=crop', // Santorini style
    description: 'Home to the Naval Cadet School and lush pine groves perfect for picnics and hiking.',
    sunset: '19:47',
  },
  {
    id: '4',
    name: 'BÜYÜKADA',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop', // Beach sunset
    description: 'The largest of the princes\' islands, featuring the historic Splendid Palace Hotel and clock tower.',
    sunset: '19:50',
  }
];

import { useRouter } from 'expo-router';

// ... (imports)

export default function DiscoveryScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: typeof ISLANDS[0] }) => (
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(tabs)/explore/island/[id]', params: { id: item.id, name: item.name, image: item.image, description: item.description, sunset: item.sunset } })}
    >
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.cardImage}
        imageStyle={{ borderRadius: 24 }}
      >
        <View style={styles.cardOverlay}>
          <Text style={styles.cardText}>{item.name}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ready to explore?</Text>
        <Text style={styles.subtitle}>Choose your island, start the journey</Text>
      </View>

      <FlatList
        data={ISLANDS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 40, // Increased from 20
    marginBottom: 24,
    // Removed alignItems: center to align left
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 8,
    // Removed textAlign: center to align left
  },
  subtitle: {
    fontSize: 16,
    color: '#778DA9',
    // Removed textAlign: center to align left
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5, // Portrait aspect ratio
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardOverlay: {
    padding: 16,
    // Optional: Gradient or dimming could go here if text contrast is low
  },
  cardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
