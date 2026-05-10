import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchActivities, AppActivityDto } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function EventsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn } = useAuth();

    const [events, setEvents] = useState<AppActivityDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventLocation, setNewEventLocation] = useState('');
    const [newEventDetails, setNewEventDetails] = useState('');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await fetchActivities();
            setEvents(data);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const onRefresh = () => {
        setIsRefreshing(true);
        loadEvents(false);
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
                <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)/explore')}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('common.events')}</Text>
            </View>

            <ScrollView 
                style={styles.content} 
                contentContainerStyle={[
                    { paddingBottom: 40 },
                    (loading || events.length === 0) && { flex: 1 }
                ]} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
                }
            >
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                ) : events.length === 0 ? (
                    <View style={styles.emptyState}>
                        <IconSymbol name="calendar.badge.exclamationmark" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Etkinlik bulunamadı</Text>
                        <Text style={styles.emptySubtext}>Şu an için aktif bir etkinlik bulunmamaktadır.</Text>
                    </View>
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

            <TouchableOpacity 
                style={[styles.fab, { bottom: insets.bottom + 20 }]} 
                activeOpacity={0.8}
                onPress={() => {
                    if (!isLoggedIn) {
                        setShowLoginPrompt(true);
                        return;
                    }
                    setIsAddModalVisible(true);
                }}
            >
                <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <IconSymbol name="plus" size={24} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            <Modal
                visible={isAddModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsAddModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
                        <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={styles.modalHeaderButton}>
                            <IconSymbol name="xmark" size={24} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{t('common.addEvent', { defaultValue: 'Etkinlik Ekle' })}</Text>
                        <TouchableOpacity style={styles.publishButton}>
                            <Text style={styles.publishText}>{t('common.share', { defaultValue: 'Paylaş' })}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 20 }}>
                        <Text style={styles.inputLabel}>ETKİNLİK ADI</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Etkinlik başlığı..."
                            placeholderTextColor="#94A3B8"
                            value={newEventName}
                            onChangeText={setNewEventName}
                        />

                        <Text style={styles.inputLabel}>TARİH VE SAAT</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Örn: 15 Haziran, 20:00"
                            placeholderTextColor="#94A3B8"
                            value={newEventDate}
                            onChangeText={setNewEventDate}
                        />

                        <Text style={styles.inputLabel}>ETKİNLİK YERİ</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Örn: Büyükada Meydan"
                            placeholderTextColor="#94A3B8"
                            value={newEventLocation}
                            onChangeText={setNewEventLocation}
                        />

                        <Text style={styles.inputLabel}>ETKİNLİK DETAYLARI</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]}
                            placeholder="Etkinlik hakkında bilgi verin..."
                            placeholderTextColor="#94A3B8"
                            value={newEventDetails}
                            onChangeText={setNewEventDetails}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </ScrollView>
                </View>
            </Modal>

            <LoginPromptModal 
                visible={showLoginPrompt} 
                onClose={() => setShowLoginPrompt(false)} 
                onLogin={() => {
                    setShowLoginPrompt(false);
                    router.push('/login');
                }}
                message={t('auth.loginToPost', { defaultValue: 'Etkinlik eklemek için giriş yapmalısınız.' })}
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
        paddingBottom: 8,
        backgroundColor: '#F8FAFC',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
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
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 220,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 12,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 13,
        color: '#CBD5E1',
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalHeaderButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    publishButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    publishText: {
        color: '#fff',
        fontWeight: '700',
    },
    modalBody: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        color: '#1A1A1A',
        marginBottom: 20,
    },
    textArea: {
        minHeight: 120,
        paddingTop: 16,
    }
});
