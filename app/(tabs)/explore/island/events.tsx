import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, RefreshControl, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchActivities, createActivity, AppActivityDto, CreateActivityRequest } from '@/services/api';
import * as ImagePicker from 'expo-image-picker';
import * as mediaApi from '@/services/mediaApi';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    
    // Form States
    const [newEventName, setNewEventName] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [newEventLocation, setNewEventLocation] = useState('');
    const [newEventDetails, setNewEventDetails] = useState('');
    const [organizerName, setOrganizerName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [socialLink, setSocialLink] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handlePublishEvent = async () => {
        if (!newEventName.trim()) {
            Alert.alert(t('common.error', { defaultValue: 'Hata' }), t('common.fillRequiredFields', { defaultValue: 'Lütfen zorunlu alanları doldurun.' }));
            return;
        }

        if (endDate < startDate) {
            Alert.alert(t('common.error', { defaultValue: 'Hata' }), t('common.invalidDateRange', { defaultValue: 'Bitiş tarihi başlangıç tarihinden önce olamaz.' }));
            return;
        }

        setIsUploading(true);
        let imageUrl = undefined;
        if (selectedImage) {
            imageUrl = await mediaApi.uploadImage(selectedImage) || undefined;
        }

        let formattedSocialLink = socialLink.trim();
        if (formattedSocialLink && !formattedSocialLink.startsWith('http')) {
            formattedSocialLink = 'https://' + formattedSocialLink;
        }

        const request: CreateActivityRequest = {
            name: newEventName.trim(),
            description: newEventDetails.trim(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            organizerName: organizerName.trim(),
            organizerContact: contactNumber.trim(),
            instagramLink: formattedSocialLink,
            imageUrl: imageUrl,
        };

        const createdActivity = await createActivity(request);
        setIsUploading(false);

        if (createdActivity) {
            setEvents([createdActivity, ...events]);
            setIsAddModalVisible(false);
            setNewEventName('');
            setStartDate(new Date());
            setEndDate(new Date());
            setNewEventLocation('');
            setNewEventDetails('');
            setOrganizerName('');
            setContactNumber('');
            setSocialLink('');
            setSelectedImage(null);

            Alert.alert(
                t('common.success', { defaultValue: 'Başarılı' }), 
                t('common.eventRequestReceived', { defaultValue: 'Etkinlik isteğiniz alınmıştır' })
            );
        } else {
            Alert.alert(t('common.error', { defaultValue: 'Hata' }), 'Etkinlik oluşturulamadı.');
        }
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
                    <EmptyState 
                        icon="calendar.badge.exclamationmark" 
                        title="Etkinlik Bulunamadı" 
                        subtitle="Şu an için aktif bir etkinlik bulunmamaktadır. İlk etkinliği siz ekleyebilirsiniz!"
                        color="#F59E0B"
                    />
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
                <KeyboardAvoidingView 
                    style={styles.modalContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1.2, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={styles.modalHeaderButton}>
                                <Text style={styles.cancelText}>İPTAL</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>YENİ ETKİNLİK</Text>
                        </View>
                        <View style={{ flex: 1.2, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <TouchableOpacity 
                                style={[styles.publishButton, (isUploading || endDate < startDate) && styles.publishButtonDisabled]} 
                                onPress={handlePublishEvent}
                                disabled={isUploading || endDate < startDate}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.publishText}>YAYINLA</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={{ padding: 20 }}>
                        {endDate < startDate && (
                            <View style={styles.dateErrorBanner}>
                                <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#EF4444" />
                                <Text style={styles.dateErrorText}>Bitiş tarihi başlangıçtan önce olamaz!</Text>
                            </View>
                        )}
                        <Text style={styles.inputLabel}>ETKİNLİK ADI *</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Etkinlik başlığı..."
                            placeholderTextColor="#94A3B8"
                            value={newEventName}
                            onChangeText={setNewEventName}
                        />

                        <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>BAŞLANGIÇ TARİHİ</Text>
                                <TouchableOpacity 
                                    style={styles.dateSelector} 
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Text style={styles.dateSelectorText}>{formatDate(startDate.toISOString())}</Text>
                                    <IconSymbol name="calendar" size={16} color="#3B82F6" />
                                </TouchableOpacity>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>BİTİŞ TARİHİ</Text>
                                <TouchableOpacity 
                                    style={styles.dateSelector} 
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <Text style={styles.dateSelectorText}>{formatDate(endDate.toISOString())}</Text>
                                    <IconSymbol name="calendar" size={16} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showStartPicker && (
                            <View>
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity 
                                        style={styles.doneButton} 
                                        onPress={() => setShowStartPicker(false)}
                                    >
                                        <Text style={styles.doneButtonText}>Tamam</Text>
                                    </TouchableOpacity>
                                )}
                                <DateTimePicker
                                    value={startDate}
                                    mode="datetime"
                                    is24Hour={true}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        if (Platform.OS === 'android') {
                                            setShowStartPicker(false);
                                        }
                                        if (selectedDate) {
                                            setStartDate(selectedDate);
                                        }
                                    }}
                                />
                            </View>
                        )}

                        {showEndPicker && (
                            <View>
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity 
                                        style={styles.doneButton} 
                                        onPress={() => setShowEndPicker(false)}
                                    >
                                        <Text style={styles.doneButtonText}>Tamam</Text>
                                    </TouchableOpacity>
                                )}
                                <DateTimePicker
                                    value={endDate}
                                    mode="datetime"
                                    is24Hour={true}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        if (Platform.OS === 'android') {
                                            setShowEndPicker(false);
                                        }
                                        if (selectedDate) {
                                            setEndDate(selectedDate);
                                        }
                                    }}
                                />
                            </View>
                        )}

                        <Text style={styles.inputLabel}>ETKİNLİK YERİ</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Örn: Büyükada Meydan"
                            placeholderTextColor="#94A3B8"
                            value={newEventLocation}
                            onChangeText={setNewEventLocation}
                        />

                        <Text style={styles.inputLabel}>ORGANİZASYON ADI</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Örn: Ada Kültür Derneği"
                            placeholderTextColor="#94A3B8"
                            value={organizerName}
                            onChangeText={setOrganizerName}
                        />

                        <Text style={styles.inputLabel}>İLETİŞİM NUMARASI</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Örn: 05xx xxx xx xx"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            value={contactNumber}
                            onChangeText={setContactNumber}
                        />

                        <Text style={styles.inputLabel}>SOSYAL MEDYA LİNKİ (INSTAGRAM VB.)</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="https://instagram.com/..."
                            placeholderTextColor="#94A3B8"
                            autoCapitalize="none"
                            value={socialLink}
                            onChangeText={setSocialLink}
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

                        <Text style={styles.inputLabel}>ETKİNLİK FOTOĞRAFI</Text>
                        {selectedImage ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                                <TouchableOpacity 
                                    style={styles.removeImageBtn} 
                                    onPress={() => setSelectedImage(null)}
                                >
                                    <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                                <IconSymbol name="camera.fill" size={24} color="#64748B" />
                                <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
                            </TouchableOpacity>
                        )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalHeaderButton: {
        paddingVertical: 8,
    },
    cancelText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '800',
        letterSpacing: 1,
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 1,
    },
    publishButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    publishText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 1,
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
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dateSelectorText: {
        fontSize: 14,
        color: '#1A1A1A',
        fontWeight: '600',
    },
    publishButtonDisabled: {
        backgroundColor: '#94A3B8',
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 14,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 2,
    },
    addPhotoBtn: {
        height: 120,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    addPhotoText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    doneButton: {
        alignSelf: 'flex-end',
        padding: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        marginBottom: 5,
    },
    doneButtonText: {
        color: '#3B82F6',
        fontWeight: '700',
    },
    dateErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    dateErrorText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '700',
    }
});
