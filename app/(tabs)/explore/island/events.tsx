import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EventsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const events = [
        {
            id: '1',
            title: 'Summer Music Festival',
            date: 'Tomorrow, 19:00',
            location: 'Sunset Beach',
            image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
            color: '#EC4899',
            categoryIcon: 'sunny'
        },
        {
            id: '2',
            title: 'Bicycle Tour',
            date: 'Saturday, 10:00',
            location: 'Main Square',
            image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80',
            color: '#3B82F6',
            categoryIcon: 'bicycle'
        },
        {
            id: '3',
            title: 'Local Art Exhibition',
            date: 'Next Week',
            location: 'Island Gallery',
            image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop&q=80',
            color: '#10B981',
            categoryIcon: 'camera.fill'
        }
    ];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Etkinlikler</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {events.map((event) => (
                    <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.8}>
                        <Image source={{ uri: event.image }} style={styles.eventImage} />
                        <View style={styles.eventInfo}>
                            <View style={styles.titleRow}>
                                <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                                {event.categoryIcon && (
                                    <IconSymbol name={event.categoryIcon as any} size={20} color="#94A3B8" />
                                )}
                            </View>
                            <View style={styles.eventDetailsRow}>
                                <IconSymbol name="calendar" size={14} color={event.color} />
                                <Text style={[styles.eventDate, { color: event.color }]} numberOfLines={1}>{event.date}</Text>
                            </View>
                            <View style={styles.eventDetailsRow}>
                                <IconSymbol name="mappin.and.ellipse" size={14} color="#778DA9" />
                                <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
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
    content: {
        flex: 1,
        padding: 16,
    },
    eventCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    eventImage: {
        width: '100%',
        height: 160,
    },
    eventInfo: {
        padding: 16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    eventDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    eventDate: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    eventLocation: {
        fontSize: 14,
        color: '#778DA9',
        marginLeft: 8,
    }
});
