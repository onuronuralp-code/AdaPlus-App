import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, RefreshControl, Alert, Platform, KeyboardAvoidingView, ImageBackground, ActionSheetIOS } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchActivities, createActivity, updateActivity, getActivity, AppActivityDto, CreateActivityRequest } from '@/services/api';
import { resolveImageUrl } from '@/services/config';
import * as ImagePicker from 'expo-image-picker';
import * as mediaApi from '@/services/mediaApi';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';


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
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

    const params = useLocalSearchParams();
    
    useEffect(() => {
        if (params.editActivityId && typeof params.editActivityId === 'string') {
            const id = params.editActivityId;
            setEditingActivityId(id);
            getActivity(id).then(act => {
                if (act) {
                    setNewEventName(act.name);
                    setStartDate(new Date(act.startDate));
                    if (act.endDate) setEndDate(new Date(act.endDate));
                    if (act.eventPlace) setNewEventLocation(act.eventPlace);
                    setNewEventDetails(act.description);
                    setOrganizerName(act.organizerName);
                    if (act.organizerContact) setContactNumber(act.organizerContact);
                    if (act.instagramLink) setSocialLink(act.instagramLink);
                    if (act.imageUrl) setSelectedImage(act.imageUrl);
                    setIsAddModalVisible(true);
                }
            });
        }
    }, [params.editActivityId]);
    
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
    
    const isValidPhone = contactNumber.replace(/\D/g, '').length >= 10;
    
    const isPublishDisabled = 
        newEventName.trim().length < 3 || 
        newEventDetails.trim().length < 1 || 
        !newEventLocation.trim() ||
        !organizerName.trim() || 
        !isValidPhone || 
        endDate < startDate || 
        isUploading;

    useEffect(() => {
        loadEvents();
        const id = setInterval(() => loadEvents(false), 60_000);
        return () => clearInterval(id);
    }, []);

    const loadEvents = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await fetchActivities();
            setEvents(data);
        } catch {
            // keep existing list on background poll failure; only show error on initial load
            if (showLoading) Alert.alert('Bağlantı Hatası', 'Etkinlikler yüklenemedi. Lütfen tekrar deneyin.');
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

    const pickImage = () => {
        const takePhoto = async () => {
            try {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert(t('common.error', { defaultValue: 'Hata' }), t('common.cameraPermissionDenied', { defaultValue: 'Kamera izni verilmedi.' }));
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
                if (!result.canceled) {
                    setSelectedImage(result.assets[0].uri);
                }
            } catch (e: any) {
                Alert.alert(
                    t('common.error', { defaultValue: 'Hata' }),
                    t('common.cameraNotAvailable', { defaultValue: 'Kamera bu cihazda kullanılamıyor. Lütfen galeriden seçin.' })
                );
            }
        };

        const chooseFromGallery = async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });
            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
            }
        };

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [
                        t('common.cancel', { defaultValue: 'İptal' }),
                        t('common.takePhoto', { defaultValue: '📷 Fotoğraf Çek' }),
                        t('common.chooseFromGallery', { defaultValue: '🖼️ Galeriden Seç' })
                    ],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setTimeout(takePhoto, 500);
                    } else if (buttonIndex === 2) {
                        setTimeout(chooseFromGallery, 500);
                    }
                }
            );
        } else {
            Alert.alert(
                t('common.selectPhoto', { defaultValue: 'Fotoğraf Seç' }),
                t('common.selectPhotoDesc', { defaultValue: 'Fotoğrafı nereden eklemek istersiniz?' }),
                [
                    { text: t('common.takePhoto', { defaultValue: '📷 Fotoğraf Çek' }), onPress: () => setTimeout(takePhoto, 500) },
                    { text: t('common.chooseFromGallery', { defaultValue: '🖼️ Galeriden Seç' }), onPress: () => setTimeout(chooseFromGallery, 500) },
                    { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' }
                ]
            );
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
        try {
            let imageUrl = selectedImage;
            if (selectedImage && !selectedImage.startsWith('http')) {
                const uploaded = await mediaApi.uploadImage(selectedImage);
                if (!uploaded) {
                    Alert.alert(t('common.error', { defaultValue: 'Hata' }), 'Fotoğraf yüklenemedi. Fotoğrafsız devam etmek ister misiniz?', [
                        { text: 'İptal', style: 'cancel', onPress: () => setIsUploading(false) },
                        { text: 'Devam Et', onPress: async () => {
                            await publishEvent(undefined);
                        }},
                    ]);
                    return;
                }
                imageUrl = uploaded;
            }
            await publishEvent(imageUrl);
        } catch {
            Alert.alert(t('common.error', { defaultValue: 'Hata' }), 'Etkinlik oluşturulamadı. Lütfen tekrar deneyin.');
        } finally {
            setIsUploading(false);
        }
    };

    const publishEvent = async (imageUrl: string | undefined) => {
        let formattedSocialLink = socialLink.trim();
        if (formattedSocialLink) {
            if (formattedSocialLink.startsWith('http://') || formattedSocialLink.startsWith('https://')) {
                // already a full URL — use as-is
            } else if (formattedSocialLink.startsWith('@') || !formattedSocialLink.includes('.')) {
                // @username or bare username → instagram profile URL
                const username = formattedSocialLink.replace(/^@/, '');
                formattedSocialLink = `https://www.instagram.com/${username}/`;
            } else {
                // domain without scheme (e.g. instagram.com/foo)
                formattedSocialLink = 'https://' + formattedSocialLink;
            }
        }

        const request: CreateActivityRequest = {
            name: newEventName.trim(),
            description: newEventDetails.trim(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            organizerName: organizerName.trim(),
            organizerContact: contactNumber.replace(/\D/g, ''),
            eventPlace: newEventLocation.trim() || undefined,
            instagramLink: formattedSocialLink,
            imageUrl: imageUrl,
        };

        const resultActivity = editingActivityId 
            ? await updateActivity(editingActivityId, request)
            : await createActivity(request);
            
        if (!resultActivity) throw new Error('operation failed');

        setIsAddModalVisible(false);
        setEditingActivityId(null);
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
            editingActivityId 
                ? t('common.eventUpdated', { defaultValue: 'Etkinlik başarıyla güncellendi.' })
                : t('common.eventRequestReceived', { defaultValue: 'Etkinlik isteğiniz alınmıştır ve incelemeye alınmıştır.' })
        );
        loadEvents(true);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(tabs)/explore');
                    }
                }}>
                    <IconSymbol name="chevron.left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('common.events', { defaultValue: 'Etkinlikler' })}</Text>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    { paddingBottom: 20 },
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
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <EmptyState 
                            icon="calendar.badge.exclamationmark" 
                            title={t('events.emptyTitle')}
                            subtitle={t('events.emptySubtitle')}
                            color="#F59E0B"
                        />
                    </View>
                ) : (
                    events.map((event) => {
                        const resolvedUrl = resolveImageUrl(event.imageUrl);
                        const hasUserImage = event.imageUrl && resolvedUrl && resolvedUrl.startsWith('http');
                        
                        return (
                        <TouchableOpacity
                            key={event.id}
                            style={styles.eventCard}
                            activeOpacity={0.8}
                            onPress={() => router.push({ pathname: '/explore/island/event/[id]', params: { id: event.id } })}
                        >
                            {hasUserImage ? (
                                <View style={{ width: '100%', height: 200, backgroundColor: '#F1F5F9' }}>
                                    <Image
                                        source={{ uri: resolvedUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="contain"
                                    />
                                </View>
                            ) : (
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80' }}
                                    style={styles.eventImage}
                                />
                            )}
                            <View style={styles.eventInfo}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.eventTitle} numberOfLines={1}>{event.name}</Text>
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
                        );
                    })
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { bottom: 20 }]}
                activeOpacity={0.8}
                onPress={() => {
                    if (!isLoggedIn) {
                        setShowLoginPrompt(true);
                    } else {
                        setIsAddModalVisible(true);
                    }
                }}
            >
                <LinearGradient
                    colors={['#ffffff', '#ffffff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <IconSymbol name="plus" size={32} color="#3B82F6" />
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
                        <View style={{ flex: 1.5, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity 
                                style={styles.modalHeaderButton} 
                                onPress={() => {
                                    setIsAddModalVisible(false);
                                    if (editingActivityId) {
                                        setEditingActivityId(null);
                                    }
                                }}
                            >
                                <Text style={styles.cancelText}>{t('common.cancel', { defaultValue: 'İPTAL' })}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{editingActivityId ? t('events.editEvent') : t('events.newEvent')}</Text>
                        </View>
                        <View style={{ flex: 1.5, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <TouchableOpacity 
                                style={[styles.publishButton, isPublishDisabled && styles.publishButtonDisabled]} 
                                onPress={handlePublishEvent}
                                disabled={isPublishDisabled}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.publishText}>{editingActivityId ? t('events.update') : t('common.publish')}</Text>
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
                        <Text style={styles.inputLabel}>{t('events.eventName')}</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder={t('events.titlePlaceholder')}
                            placeholderTextColor="#94A3B8"
                            value={newEventName}
                            onChangeText={setNewEventName}
                        />

                        <View style={{ marginBottom: 20 }}>
                            <Text style={styles.inputLabel}>{t('events.startDate')}</Text>
                            <TouchableOpacity 
                                style={styles.dateSelector} 
                                onPress={() => setShowStartPicker(true)}
                            >
                                <Text style={styles.dateSelectorText}>
                                    {startDate.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')} • {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </Text>
                                <IconSymbol name="calendar" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 20 }}>
                            <Text style={styles.inputLabel}>{t('events.endDate')}</Text>
                            <TouchableOpacity 
                                style={styles.dateSelector} 
                                onPress={() => setShowEndPicker(true)}
                            >
                                <Text style={styles.dateSelectorText}>
                                    {endDate.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')} • {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </Text>
                                <IconSymbol name="calendar" size={16} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <CustomDateTimePicker
                            visible={showStartPicker}
                            value={startDate}
                            title="Başlangıç Tarihi ve Saati"
                            accentColor="#3B82F6"
                            onConfirm={(date) => { setStartDate(date); setShowStartPicker(false); }}
                            onCancel={() => setShowStartPicker(false)}
                        />

                        <CustomDateTimePicker
                            visible={showEndPicker}
                            value={endDate}
                            title="Bitiş Tarihi ve Saati"
                            accentColor="#64748B"
                            onConfirm={(date) => { setEndDate(date); setShowEndPicker(false); }}
                            onCancel={() => setShowEndPicker(false)}
                        />

                        <Text style={styles.inputLabel}>{t('events.eventLocation')}</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder={t('events.locationPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            value={newEventLocation}
                            onChangeText={setNewEventLocation}
                        />

                        <Text style={styles.inputLabel}>{t('events.orgName')}</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder={t('events.orgPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            value={organizerName}
                            onChangeText={setOrganizerName}
                        />

                        <Text style={styles.inputLabel}>{t('events.contactNumber')}</Text>
                        <TextInput 
                            style={[styles.input, contactNumber.length > 0 && !isValidPhone && { borderColor: '#EF4444', borderWidth: 1 }]}
                            placeholder="Örn: 05xx xxx xx xx"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            value={contactNumber}
                            onChangeText={setContactNumber}
                        />
                        {contactNumber.length > 0 && !isValidPhone && (
                            <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500' }}>En az 10 haneli bir numara girin</Text>
                        )}

                        <Text style={styles.inputLabel}>{t('events.socialLink')}</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="https://instagram.com/..."
                            placeholderTextColor="#94A3B8"
                            autoCapitalize="none"
                            value={socialLink}
                            onChangeText={setSocialLink}
                        />

                        <Text style={styles.inputLabel}>{t('events.eventDetails')}</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]}
                            placeholder={t('events.detailsPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            value={newEventDetails}
                            onChangeText={setNewEventDetails}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            maxLength={500}
                        />
                        <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{newEventDetails.length}/500</Text>

                        <Text style={styles.inputLabel}>{t('events.eventPhoto')}</Text>
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
                                <Text style={styles.addPhotoText}>{t('events.addPhoto')}</Text>
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
        paddingBottom: 16,
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
        fontSize: 26,
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
        bottom: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        height: 64,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
        backgroundColor: '#fff',
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
    },
});
