import { PlaceDetailModal } from '@/components/PlaceDetailModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mock reviews for restaurants
const MOCK_REVIEWS = [
    { id: 'r1', user: 'Selim T.', rating: 5, comment: 'The best mezes on the island. Atmosphere is amazing!', date: '1 day ago' },
    { id: 'r2', user: 'Elif G.', rating: 4, comment: 'Very fresh seafood and friendly service.', date: '4 days ago' },
    { id: 'r3', user: 'Mark D.', rating: 5, comment: 'A classic island experience. Highly recommended.', date: '1 week ago' },
];

// Mock data for Restaurants and Cafes in Kınalıada
const DINING_PLACES = [
    {
        id: '1',
        title: 'Jash Istanbul',
        description: 'A famous and atmospheric island tavern (meyhane) known for its excellent mezes and traditional dishes.',
        icon: 'fork.knife',
        coordinate: { latitude: 40.9109, longitude: 29.0548 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '2',
        title: 'Mimoza Restaurant',
        description: 'Stunning seafood restaurant located right on the water. Perfect for a sunset dinner accompanied by fresh fish.',
        icon: 'fork.knife',
        coordinate: { latitude: 40.9091, longitude: 29.0552 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '3',
        title: 'Kınalıada Pastanesi',
        description: 'The classic island bakery. A must-visit stop for fresh morning pastries, savory borek, and traditional Turkish tea.',
        icon: 'cup.and.saucer.fill',
        coordinate: { latitude: 40.9108, longitude: 29.0544 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '4',
        title: 'Teos Beach Restaurant',
        description: 'A relaxed dining experience right on the beach club, offering great Mediterranean cuisine and refreshing cocktails.',
        icon: 'fork.knife',
        coordinate: { latitude: 40.9028, longitude: 29.0493 },
        reviews: MOCK_REVIEWS
    }
];

export default function RestaurantScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedPlace, setSelectedPlace] = useState<typeof DINING_PLACES[0] | null>(null);

    const openDirections = (place: typeof DINING_PLACES[0]) => {
        setSelectedPlace(place);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Restaurants & Cafes</Text>
            </View>

            {/* Places List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            >
                <View style={styles.infoBox}>
                    <IconSymbol name="fork.knife" size={20} color="#EAB308" />
                    <Text style={styles.infoText}>
                        Explore the finest local seafood, traditional taverns, and cozy bakeries on the island.
                    </Text>
                </View>

                {DINING_PLACES.map((place) => (
                    <View key={place.id} style={styles.placeCard}>
                        <View style={styles.placeHeader}>
                            <View style={styles.placeIconBg}>
                                <IconSymbol name={place.icon as any} size={24} color="#EAB308" />
                            </View>
                            <Text style={styles.placeTitle}>{place.title}</Text>
                        </View>
                        <Text style={styles.placeDesc}>{place.description}</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => openDirections(place)}
                            >
                                <IconSymbol name="map.fill" size={16} color="#EAB308" />
                                <Text style={styles.actionButtonText}>Get Directions</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuButton}
                                onPress={() => setSelectedPlace(place)}
                            >
                                <IconSymbol name="star.fill" size={16} color="#fff" />
                                <Text style={styles.menuButtonText}>Reviews & Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <PlaceDetailModal
                visible={selectedPlace !== null}
                onClose={() => setSelectedPlace(null)}
                title={selectedPlace?.title || ''}
                description={selectedPlace?.description || ''}
                coordinate={selectedPlace?.coordinate || { latitude: 0, longitude: 0 }}
                reviews={selectedPlace?.reviews}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#FEF9C3', // Light yellow to match dining theme
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        color: '#854D0E',
        fontSize: 14,
        lineHeight: 20,
    },
    placeCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    placeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    placeIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEF9C3',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    placeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        flex: 1,
    },
    placeDesc: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: '#FEF9C3',
        borderRadius: 20,
    },
    actionButtonText: {
        color: '#EAB308',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    },
    menuButton: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: '#EAB308',
        borderRadius: 20,
    },
    menuButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    }
});
