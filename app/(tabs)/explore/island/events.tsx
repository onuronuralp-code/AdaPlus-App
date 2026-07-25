import React, { useState, useEffect, useCallback } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, RefreshControl, Alert, Platform, KeyboardAvoidingView, ImageBackground, ActionSheetIOS, InputAccessoryView, Animated, Dimensions } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SwipeNavigation } from '@/components/SwipeNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchActivities, createActivity, updateActivity, getActivity, AppActivityDto, CreateActivityRequest } from '@/services/api';
import { resolveImageUrl } from '@/services/config';
import * as ImagePicker from 'expo-image-picker';
import * as mediaApi from '@/services/mediaApi';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { isLargeScreen } from '@/utils/scale';
import { useTranslation } from 'react-i18next';
import SuccessModal from '@/components/SuccessModal';
import { LinearGradient } from 'expo-linear-gradient';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function EventsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn, user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [events, setEvents] = useState<AppActivityDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGridView, setIsGridView] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const titleInputRef = React.useRef<TextInput>(null);
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
    const modalSlideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;

    React.useEffect(() => {
        if (isAddModalVisible) {
            modalSlideAnim.setValue(Dimensions.get('window').height);
            Animated.spring(modalSlideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0,
            }).start();
        }
    }, [isAddModalVisible]);

    const closeModal = () => {
        Animated.timing(modalSlideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setIsAddModalVisible(false);
            if (editingActivityId) setEditingActivityId(null);
        });
    };
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successModalMessage, setSuccessModalMessage] = useState('');

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
                    if (act.island) setSelectedIsland(act.island);
                    setIsAddModalVisible(true);
                }
            });
        } else {
            AsyncStorage.getItem('defaultIsland').then(island => {
                if (island) {
                    let apiValue = null;
                    if (island === 'Kınalıada') apiValue = 'KINALIADA';
                    else if (island === 'Burgazada') apiValue = 'BURGAZADA';
                    else if (island === 'Heybeliada') apiValue = 'HEYBELIADA';
                    else if (island === 'Büyükada') apiValue = 'BUYUKADA';
                    if (apiValue) setSelectedIsland(apiValue);
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
    const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
    
    // removed isValidPhone
    
    const isPublishDisabled = 
        newEventName.trim().length < 3 || 
        newEventDetails.trim().length < 1 || 
        !newEventLocation.trim() ||
        !selectedIsland ||
        !organizerName.trim() || 
        contactNumber.trim().length === 0 || 
        isUploading;

    useFocusEffect(
        useCallback(() => {
            loadEvents();
            const id = setInterval(() => loadEvents(false), 60_000);
            return () => clearInterval(id);
        }, [])
    );

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

    const formatDateRange = (startStr?: string, endStr?: string) => {
        if (!startStr) return '';
        const s = new Date(startStr);
        const startFormatted = s.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        if (!endStr) return startFormatted;

        const e = new Date(endStr);
        if (
            s.getDate() === e.getDate() &&
            s.getMonth() === e.getMonth() &&
            s.getFullYear() === e.getFullYear()
        ) {
            const endFormattedTime = e.toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
            });
            return `${startFormatted} - ${endFormattedTime}`;
        } else {
            const endFormatted = e.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            return `${startFormatted} - ${endFormatted}`;
        }
    };

    const getIslandName = (event: AppActivityDto) => {
        if (event.island) {
            const id = event.island.toUpperCase();
            const rawName = id === 'BUYUKADA' ? 'Büyükada' : id === 'HEYBELIADA' ? 'Heybeliada' : id === 'BURGAZADA' ? 'Burgazada' : id === 'KINALIADA' ? 'Kınalıada' : event.island;
            return t('places.' + rawName, { defaultValue: rawName });
        }
        
        const searchText = `${event.eventPlace || ''} ${event.name || ''}`.toLowerCase();
        if (searchText.includes('kınalı') || searchText.includes('kinal') || searchText.includes('kınal')) return t('places.Kınalıada');
        if (searchText.includes('burgaz')) return t('places.Burgazada');
        if (searchText.includes('heybeli')) return t('places.Heybeliada');
        if (searchText.includes('büyük') || searchText.includes('buyuk')) return t('places.Büyükada');
        
        return '';
    };

    const formatCardDate = (startStr?: string, endStr?: string, hideTime?: boolean) => {
        if (!startStr) return '';
        const s = new Date(startStr);
        if (hideTime) {
            return s.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        }
        return s.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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
        if (isPublishDisabled) {
            Alert.alert('Eksik Bilgi', 'Lütfen ilan içeriğini düzeltiniz.');
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
            await publishEvent(imageUrl || undefined);
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
            organizerName: organizerName.trim(),
            organizerContact: contactNumber.trim(),
            eventPlace: newEventLocation.trim() || undefined,
            instagramLink: formattedSocialLink,
            imageUrl: imageUrl,
            island: selectedIsland || undefined,
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
        setSuccessModalMessage(
            editingActivityId 
                ? t('common.eventUpdated', { defaultValue: 'Etkinlik başarıyla güncellendi.' })
                : t('common.eventRequestReceived', { defaultValue: 'Etkinlik isteğiniz alınmıştır ve incelemeye alınmıştır.' })
        );
        setSuccessModalVisible(true);
        loadEvents(true);
    };

    return (
        <SwipeNavigation rightRoute="/(tabs)/explore/island/ilanlar">
        <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={[styles.header, { paddingTop: insets.top + 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 }, isDark && { backgroundColor: '#000000' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={[styles.backButton, isDark && { backgroundColor: '#1C1C1E' }]} onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.back();
                        }
                    }}>
                        <IconSymbol name="chevron.left" size={24} color={isDark ? "#FFFFFF" : "#1E293B"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>{t('common.events', { defaultValue: 'Etkinlikler' })}</Text>
                </View>
                <TouchableOpacity
                    style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }, isDark && { backgroundColor: '#1C1C1E' }]}
                    onPress={() => setIsGridView(!isGridView)}
                    activeOpacity={0.7}
                >
                    <IconSymbol name={isGridView ? "list.bullet" : "square.grid.2x2.fill"} size={20} color={isDark ? "#FFFFFF" : "#1E293B"} />
                </TouchableOpacity>
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
                            icon="calendar" 
                            title={t('events.emptyTitle')}
                            subtitle={t('events.emptySubtitle')}
                            color="#3B82F6"
                        />
                    </View>
                ) : (
                    <View style={isGridView ? { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, justifyContent: 'space-between' } : {}}>
                        {events.map((event) => {
                            const resolvedUrl = resolveImageUrl(event.imageUrl);
                            const hasUserImage = event.imageUrl && resolvedUrl && resolvedUrl.startsWith('http');
                            
                            return (
                            <TouchableOpacity
                                key={event.id}
                                style={[styles.eventCard, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E', borderWidth: 1 }, isGridView && { width: '48%', marginHorizontal: 0 }]}
                                activeOpacity={0.8}
                                onPress={() => router.push({ pathname: '/explore/island/event/[id]', params: { id: event.id } })}
                            >
                                {hasUserImage ? (
                                    <View style={{ width: '100%', height: isGridView ? 140 : 300, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }}>
                                        <Image
                                            source={{ uri: resolvedUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ) : (
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80' }}
                                        style={[styles.eventImage, isGridView && { height: 140 }]}
                                    />
                                )}
                                {isGridView && (
                                    <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
                                        <IconSymbol name="person.2.fill" size={11} color="#FFFFFF" />
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginLeft: 4 }}>{event.rsvpCount || 0}</Text>
                                    </View>
                                )}
                                <View style={[styles.eventInfo, isGridView && { padding: 12 }]}>
                                    <View style={[styles.titleRow, isGridView && { marginBottom: 4 }]}>
                                        <Text style={[styles.eventTitle, isGridView && { fontSize: 14 }, isDark && { color: '#F8FAFC' }]} numberOfLines={1}>{event.name}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            {/* 1. Tarih (Date) */}
                                            <View style={[styles.eventDetailsRow, isGridView && { marginTop: 2, marginBottom: 0 }]}>
                                                <IconSymbol name="calendar" size={14} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                                <Text 
                                                    style={[styles.eventDate, { color: isDark ? '#60A5FA' : '#3B82F6', fontSize: isGridView ? 11.5 : 13, marginLeft: 4, flex: 1, fontWeight: '700' }]} 
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit={true}
                                                    minimumFontScale={0.85}
                                                >
                                                    {formatCardDate(event.startDate, event.endDate, true)}
                                                </Text>
                                            </View>

                                            {/* 2. Lokasyon & Organizasyon (Yan Yana) */}
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: isGridView ? 2 : 4 }}>
                                                {(() => {
                                                    const islandName = getIslandName(event);
                                                    if (!islandName && !event.eventPlace) return null;
                                                    
                                                    let locationText = islandName || '';
                                                    if (!isGridView && event.eventPlace) {
                                                        locationText += locationText ? ` - ${event.eventPlace}` : event.eventPlace;
                                                    }
                                                    
                                                    return (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <IconSymbol name="mappin.circle.fill" size={14} color={isDark ? '#94A3B8' : '#94A3B8'} />
                                                            <Text style={[styles.eventLocation, { fontSize: 13, marginLeft: 4, color: isDark ? '#CBD5E1' : '#64748B', fontWeight: '600' }]} numberOfLines={1}>
                                                                {locationText}
                                                            </Text>
                                                        </View>
                                                    );
                                                })()}

                                                {!isGridView && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <IconSymbol name="person.fill" size={14} color={isDark ? '#94A3B8' : '#778DA9'} />
                                                        <Text style={[styles.eventLocation, { fontSize: 13, marginLeft: 4 }, isDark && { color: '#CBD5E1' }]} numberOfLines={1}>
                                                            {event.organizerName || 'Ada Plus'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        {!isGridView && (event.rsvpCount || 0) >= 0 && (
                                            <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }]}>
                                                <IconSymbol name="person.2.fill" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                                                <Text style={[{ fontSize: 11, fontWeight: '700', color: '#475569', marginLeft: 4 }, isDark && { color: '#CBD5E1' }]}>{event.rsvpCount || 0}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity 
                style={[styles.fab, { bottom: 20, backgroundColor: isDark ? '#121212' : '#FFFFFF' }]} 
                onPress={() => {
                    if (!isLoggedIn) {
                        setShowLoginPrompt(true);
                    } else {
                        setContactNumber(user?.phone || user?.email || '');
                        setOrganizerName(user?.fullName || user?.email || '');
                        setIsAddModalVisible(true);
                    }
                }}
                activeOpacity={0.85}
            >
                <View style={[styles.fabGradient, isDark ? { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' } : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }]}>
                    <IconSymbol name="plus" size={32} color="#3B82F6" />
                </View>
            </TouchableOpacity>

            <Modal
                visible={isAddModalVisible}
                animationType="fade"
                transparent={true}
                statusBarTranslucent={true}
                navigationBarTranslucent={true}
                onRequestClose={closeModal}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={closeModal} activeOpacity={1} />
                    <Animated.View 
                        style={[styles.modalContainer, isDark && { backgroundColor: '#000000' }, { flex: 0, height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom, transform: [{ translateY: modalSlideAnim }] }]} 
                    >
                    <View style={[styles.modalHeader, isDark && { backgroundColor: '#000000', borderBottomColor: '#1C1C1E' }]}>
                        <View style={{ flex: 1.5, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity 
                                style={styles.modalHeaderButton} 
                            onPress={closeModal}
                            >
                                <Text style={[styles.cancelText, isDark && { color: '#94A3B8' }]}>{t('common.cancel', { defaultValue: 'İPTAL' })}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>{editingActivityId ? t('events.editEvent') : t('events.newEvent')}</Text>
                        </View>
                        <View style={{ flex: 1.5, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <TouchableOpacity 
                                style={[styles.publishButton, isPublishDisabled && (isDark ? { backgroundColor: '#27272A' } : styles.publishButtonDisabled)]} 
                                onPress={handlePublishEvent}
                                disabled={isPublishDisabled}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={[styles.publishText, isPublishDisabled && { color: isDark ? '#52525B' : '#94A3B8' }]}>{editingActivityId ? t('events.update') : t('common.publish')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <KeyboardAwareScrollView style={[styles.modalBody, isDark && { backgroundColor: '#000000' }]} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={80} keyboardShouldPersistTaps="handled">
                        <View style={{ padding: 20 }}>

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>ADA SEÇİMİ *</Text>
                        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 20 }}>
                            {['KINALIADA', 'BURGAZADA', 'HEYBELIADA', 'BUYUKADA'].map((islandId) => (
                                <TouchableOpacity 
                                    key={islandId}
                                    style={[
                                        styles.islandChip, 
                                        { flex: 1 },
                                        selectedIsland === islandId && styles.islandChipSelected
                                    ]}
                                    onPress={() => setSelectedIsland(islandId)}
                                >
                                    <Text 
                                        numberOfLines={1} 
                                        adjustsFontSizeToFit 
                                        style={[
                                            styles.islandChipText, 
                                            selectedIsland === islandId && styles.islandChipTextSelected
                                        ]}
                                    >
                                        {t('places.' + (islandId === 'BUYUKADA' ? 'Büyükada' : islandId === 'HEYBELIADA' ? 'Heybeliada' : islandId === 'BURGAZADA' ? 'Burgazada' : 'Kınalıada'))}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('events.eventName')}</Text>
                        <TextInput 
                            style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder={t('events.titlePlaceholder')}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={newEventName}
                            onChangeText={setNewEventName}
                            ref={titleInputRef}
                        />

                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]} numberOfLines={1} adjustsFontSizeToFit>{t('events.startDate')}</Text>
                                <TouchableOpacity 
                                    style={[styles.dateSelector, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }, { paddingHorizontal: 12 }]} 
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Text style={[styles.dateSelectorText, isDark && { color: '#FFFFFF' }, { fontSize: 12, flexShrink: 1, marginRight: 4 }]} numberOfLines={1} adjustsFontSizeToFit>
                                        {startDate.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')} • {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </Text>
                                    <IconSymbol name="calendar" size={14} color="#3B82F6" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <CustomDateTimePicker
                            visible={showStartPicker}
                            value={startDate}
                            title="Başlangıç Tarihi ve Saati"
                            accentColor="#3B82F6"
                            minimumDate={new Date()}
                            onConfirm={(date) => { setStartDate(date); setShowStartPicker(false); }}
                            onCancel={() => setShowStartPicker(false)}
                        />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('events.eventLocation')}</Text>
                        <TextInput 
                            style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder={t('events.locationPlaceholder')}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={newEventLocation}
                            onChangeText={setNewEventLocation}
                        />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('events.orgName')}</Text>
                        <TextInput 
                            style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder={t('events.orgPlaceholder')}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={organizerName}
                            onChangeText={setOrganizerName}
                        />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>İLETİŞİM BİLGİSİ (TEL/E-POSTA) *</Text>
                        <TextInput 
                            style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder="Örn: 05xx xxx xx xx veya ornek@email.com"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            keyboardType="default"
                            value={contactNumber}
                            onChangeText={setContactNumber}
                        />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('events.socialLink')}</Text>
                        <TextInput 
                            style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder="https://instagram.com/..."
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            autoCapitalize="none"
                            value={socialLink}
                            onChangeText={setSocialLink}
                        />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('events.eventDetails')}</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder={t('events.detailsPlaceholder')}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={newEventDetails}
                            onChangeText={setNewEventDetails}
                            multiline
                            scrollEnabled={false}
                            numberOfLines={4}
                            textAlignVertical="top"
                            maxLength={500}
                        />
                        <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{newEventDetails.length}/500</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }, { marginBottom: 0 }]}>{t('events.eventPhoto')}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: selectedImage ? '#10B981' : (isDark ? '#94A3B8' : '#64748B') }}>
                                {selectedImage ? '1/1 foto' : '0/1 foto'}
                            </Text>
                        </View>
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
                            <TouchableOpacity style={[styles.addPhotoBtn, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]} onPress={pickImage}>
                                <IconSymbol name="camera.fill" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                                <Text style={[styles.addPhotoText, isDark && { color: '#94A3B8' }]}>{t('events.addPhoto')}</Text>
                            </TouchableOpacity>
                        )}
                        </View>
                    </KeyboardAwareScrollView>
                </Animated.View>
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

            <SuccessModal 
                visible={successModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                title={t('common.success', { defaultValue: 'Başarılı' })}
                message={successModalMessage}
            />
        </View>
        </SwipeNavigation>
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
        borderRadius: 12,
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
        paddingHorizontal: isLargeScreen ? 16 : 4,
        paddingTop: 16,
    },
    eventCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
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
        height: 300,
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
        borderRadius: 20,
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
        borderRadius: 20,
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
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
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
        borderRadius: 10,
        padding: 16,
        fontSize: 16,
        color: '#1A1A1A',
        marginBottom: 20,
        textAlign: 'left',
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
        borderRadius: 10,
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
        backgroundColor: '#E2E8F0',
    },
    islandChip: {
        paddingHorizontal: 4,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    islandChipSelected: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    islandChipText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    islandChipTextSelected: {
        color: '#FFFFFF',
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 10,
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
        borderRadius: 10,
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
        borderRadius: 8,
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
