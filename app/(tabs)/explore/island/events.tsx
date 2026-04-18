import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchActivities, AppActivityDto } from '@/services/api';
import { useTranslation } from 'react-i18next';

export default function EventsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [events, setEvents] = useState<AppActivityDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const data = await fetchActivities();
            setEvents(data);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return t('common.notSpecified', { defaultValue: 'Belirtilmemiş' });
        const d = new Date(dateString);
        return d.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('common.events')}</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
                ) : events.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 40, color: '#94A3B8' }}>{t('common.noEventsFound', { defaultValue: 'Şu an için etkinlik bulunmamaktadır.' })}</Text>
                ) : (
                    events.map((event) => (
                        <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.8}>
                            <Image 
                                source={{ uri: event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80' }} 
                                style={styles.eventImage} 
                            />
                            <View style={styles.eventInfo}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.eventTitle} numberOfLines={1}>{event.name}</Text>
                                    <IconSymbol name="star.fill" size={20} color="#94A3B8" />
                                </View>
                                <View style={styles.eventDetailsRow}>
                                    <IconSymbol name="calendar" size={14} color="#3B82F6" />
                                    <Text style={[styles.eventDate, { color: '#3B82F6' }]} numberOfLines={1}>{formatDate(event.startDate)}</Text>
                                </View>
                                <View style={styles.eventDetailsRow}>
                                    <IconSymbol name="person.fill" size={14} color="#778DA9" />
                                    <Text style={styles.eventLocation} numberOfLines={1}>{event.organizerName || 'Ada Plus'}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
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
