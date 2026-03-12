import { PlaceDetailModal } from '@/components/PlaceDetailModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mock reviews for places
const MOCK_REVIEWS = [
    { id: 'r1', user: 'Ahmet Y.', rating: 5, comment: 'A truly historical and peaceful place. Must see!', date: '2 days ago' },
    { id: 'r2', user: 'Maria S.', rating: 4, comment: 'Beautiful architecture and very well preserved.', date: '1 week ago' },
    { id: 'r3', user: 'Can K.', rating: 5, comment: 'One of the best views on the island.', date: '3 days ago' },
];

// Real Touristic locations in Kınalıada
const TOUR_PLACES = [
    {
        id: '1',
        title: 'Surp Krikor Lusavoriç Armenian Church',
        description: 'Founded in 1857, this is the only Armenian Apostolic church in the Princes\' Islands, known for its intricate stonework and beautiful courtyard.',
        icon: 'building.columns.fill',
        coordinate: { latitude: 40.9091, longitude: 29.0527 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '2',
        title: 'Kınalıada Mosque',
        description: 'Built in 1964 with a highly unique, modern triangular design, it stands out completely from classical Ottoman mosque architecture.',
        icon: 'building.columns.fill',
        coordinate: { latitude: 40.9104, longitude: 29.0541 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '3',
        title: 'Panagia Greek Orthodox Church',
        description: 'A beautifully preserved historical church located right by the center. A peaceful spot offering a glimpse into the island\'s Greek heritage.',
        icon: 'building.columns.fill',
        coordinate: { latitude: 40.9082, longitude: 29.0520 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '4',
        title: 'Teos Beach',
        description: 'A beautiful beach club and restaurant located at the southern tip of the island, offering crystal clear waters and a relaxed atmosphere.',
        icon: 'sun.max.fill',
        coordinate: { latitude: 40.9028, longitude: 29.0493 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '5',
        title: 'Ayazma Beach',
        description: 'One of the most famous and accessible sandy beaches on the island. Perfect for a relaxing swim in the Marmara Sea.',
        icon: 'sun.max.fill',
        coordinate: { latitude: 40.9054, longitude: 29.0464 },
        reviews: MOCK_REVIEWS
    },
    {
        id: '6',
        title: 'Sıraevler (The Row Houses)',
        description: 'A distinct row of historical wooden mansions showcasing classic island architecture, perfect for an evening photography stroll.',
        icon: 'house.fill',
        coordinate: { latitude: 40.9099, longitude: 29.0547 },
        reviews: MOCK_REVIEWS
    }
];

export default function GuideScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedPlace, setSelectedPlace] = useState<typeof TOUR_PLACES[0] | null>(null);

    const openDirections = (place: typeof TOUR_PLACES[0]) => {
        setSelectedPlace(place);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tour Guide</Text>
            </View>

            {/* Places List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            >
                <View style={styles.infoBox}>
                    <IconSymbol name="map.fill" size={20} color="#EC4899" />
                    <Text style={styles.infoText}>
                        Discover the most beautiful and historic spots across the island at your own pace.
                    </Text>
                </View>

                {TOUR_PLACES.map((place) => (
                    <View key={place.id} style={styles.placeCard}>
                        <View style={styles.placeHeader}>
                            <View style={styles.placeIconBg}>
                                {/* Render the unique icon for this place */}
                                <IconSymbol name={place.icon as any} size={24} color="#EC4899" />
                            </View>
                            <Text style={styles.placeTitle}>{place.title}</Text>
                        </View>
                        <Text style={styles.placeDesc}>{place.description}</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => openDirections(place)}
                            >
                                <IconSymbol name="map.fill" size={16} color="#EC4899" />
                                <Text style={styles.actionButtonText}>Get Directions</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.detailsButton}
                                onPress={() => setSelectedPlace(place)}
                            >
                                <IconSymbol name="star.fill" size={16} color="#fff" />
                                <Text style={styles.detailsButtonText}>Reviews & Details</Text>
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
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
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
        backgroundColor: '#FCE7F3', // Light pink to match the tour guide theme
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        color: '#9D174D',
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
        backgroundColor: '#FDF2F8',
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
        backgroundColor: '#FDF2F8',
        borderRadius: 20,
    },
    actionButtonText: {
        color: '#EC4899',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    },
    detailsButton: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: '#EC4899',
        borderRadius: 20,
    },
    detailsButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    }
});
