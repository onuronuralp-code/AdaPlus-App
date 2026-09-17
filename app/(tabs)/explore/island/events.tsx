import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, RefreshControl, Alert, Platform, KeyboardAvoidingView, ImageBackground, ActionSheetIOS, InputAccessoryView, Animated, Dimensions, Linking, DeviceEventEmitter, PanResponder } from 'react-native';
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
import { IslandDropdown } from '@/components/IslandDropdown';

const EVENT_BANNER_WIDTH = 4;
const EVENT_BANNER_HEIGHT = 5;
const EVENT_BANNER_ASPECT_RATIO = EVENT_BANNER_WIDTH / EVENT_BANNER_HEIGHT;

export default function EventsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn, user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { width } = Dimensions.get('window');
    const [pendingCropAsset, setPendingCropAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isCroppingImage, setIsCroppingImage] = useState(false);
    const cropPan = React.useRef(new Animated.ValueXY()).current;
    const cropOffsetRef = React.useRef({ x: 0, y: 0 });
    const cropGestureStartRef = React.useRef({ x: 0, y: 0 });

    const cropLayout = useMemo(() => {
        const frameWidth = Math.min(width - 48, 360);
        const frameHeight = frameWidth / EVENT_BANNER_ASPECT_RATIO;
        if (!pendingCropAsset?.width || !pendingCropAsset?.height) {
            return { frameWidth, frameHeight, displayWidth: frameWidth, displayHeight: frameHeight, scale: 1, maxX: 0, maxY: 0 };
        }

        const scale = Math.max(frameWidth / pendingCropAsset.width, frameHeight / pendingCropAsset.height);
        const displayWidth = pendingCropAsset.width * scale;
        const displayHeight = pendingCropAsset.height * scale;
        return {
            frameWidth,
            frameHeight,
            displayWidth,
            displayHeight,
            scale,
            maxX: Math.max(0, (displayWidth - frameWidth) / 2),
            maxY: Math.max(0, (displayHeight - frameHeight) / 2),
        };
    }, [pendingCropAsset, width]);

    const clampCropOffset = useCallback((x: number, y: number) => ({
        x: Math.max(-cropLayout.maxX, Math.min(cropLayout.maxX, x)),
        y: Math.max(-cropLayout.maxY, Math.min(cropLayout.maxY, y)),
    }), [cropLayout.maxX, cropLayout.maxY]);

    const cropPanResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
            cropGestureStartRef.current = cropOffsetRef.current;
        },
        onPanResponderMove: (_, gesture) => {
            const next = clampCropOffset(
                cropGestureStartRef.current.x + gesture.dx,
                cropGestureStartRef.current.y + gesture.dy
            );
            cropOffsetRef.current = next;
            cropPan.setValue(next);
        },
    }), [clampCropOffset, cropPan]);

    const [events, setEvents] = useState<AppActivityDto[]>([]);
    const [loading, setLoading] = useState(true);
    const isGridView = true;
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
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
                    const activityStartDate = act.startDate ? new Date(act.startDate) : new Date();
                    setHasStartDate(Boolean(act.startDate));
                    setHasStartTime(Boolean(act.startDate) && (activityStartDate.getHours() !== 0 || activityStartDate.getMinutes() !== 0));
                    setStartDate(activityStartDate);
                    setHasEndDate(Boolean(act.endDate));
                    const activityEndDate = act.endDate ? new Date(act.endDate) : new Date(activityStartDate.getTime() + 60 * 60 * 1000);
                    setEndDate(activityEndDate);
                    setHasEndTime(Boolean(act.endDate) && (activityEndDate.getHours() !== 0 || activityEndDate.getMinutes() !== 0));
                    setNewEventLocation(act.eventPlace || '');
                    setNewEventDetails(act.description);
                    setShowOptionalDetails(true);
                    setOrganizerName(act.organizerName);
                    setContactNumber(act.organizerContact || '');
                    setSocialLink(act.instagramLink || '');
                    setSelectedImage(act.imageUrl || null);
                    setSelectedIsland(act.island || null);
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
    const [hasStartDate, setHasStartDate] = useState(false);
    const [hasStartTime, setHasStartTime] = useState(false);
    const [endDate, setEndDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
    const [hasEndDate, setHasEndDate] = useState(false);
    const [hasEndTime, setHasEndTime] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [newEventLocation, setNewEventLocation] = useState('');
    const [newEventDetails, setNewEventDetails] = useState('');
    const [showOptionalDetails, setShowOptionalDetails] = useState(false);
    const [organizerName, setOrganizerName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [socialLink, setSocialLink] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
    const [selectedFilterIsland, setSelectedFilterIsland] = useState<string>('ALL');

    const ISLAND_FILTERS = [
        { id: 'ALL', label: t('common.allIslands', { defaultValue: 'Tüm Adalar' }) },
        { id: 'KINALIADA', label: 'Kınalıada' },
        { id: 'BURGAZADA', label: 'Burgazada' },
        { id: 'HEYBELIADA', label: 'Heybeliada' },
        { id: 'BUYUKADA', label: 'Büyükada' },
    ];

    const normalizeIslandId = (value?: unknown): string | null => {
        if (value === null || value === undefined) return null;

        const numericIslandMap: Record<string, string> = {
            '0': 'BUYUKADA',
            '1': 'HEYBELIADA',
            '2': 'BURGAZADA',
            '3': 'KINALIADA',
        };
        const rawValue = typeof value === 'object'
            ? String((value as any).id ?? (value as any).name ?? (value as any).value ?? '')
            : String(value);
        const trimmedValue = rawValue.trim();
        if (numericIslandMap[trimmedValue]) return numericIslandMap[trimmedValue];

        const normalizedValue = trimmedValue
            .toLocaleUpperCase('tr-TR')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/İ/g, 'I')
            .replace(/[^A-Z0-9]/g, '');

        if (normalizedValue.includes('KINALI')) return 'KINALIADA';
        if (normalizedValue.includes('BURGAZ')) return 'BURGAZADA';
        if (normalizedValue.includes('HEYBELI')) return 'HEYBELIADA';
        if (normalizedValue.includes('BUYUK')) return 'BUYUKADA';
        return null;
    };

    const getEventIslandId = (event: AppActivityDto): string | null => {
        return normalizeIslandId(event.island)
            ?? normalizeIslandId(event.eventPlace)
            ?? normalizeIslandId(event.name);
    };

    const filteredEvents = selectedFilterIsland === 'ALL'
        ? events
        : events.filter(event => getEventIslandId(event) === selectedFilterIsland);
    
    // removed isValidPhone
    
    const isPublishDisabled = !selectedImage || isUploading;

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('eventRsvpChanged', ({ id, count }) => {
            setEvents(prev => prev.map(e => e.id === id ? { ...e, rsvpCount: count } : e));
        });
        return () => sub.remove();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadEvents();
            DeviceEventEmitter.emit('eventsSeen');
            const id = setInterval(() => loadEvents(false), 60_000);
            return () => clearInterval(id);
        }, [])
    );

    const loadEvents = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await fetchActivities();
            setEvents(data);
            if (Array.isArray(data) && data.length > 0) {
                AsyncStorage.setItem('seenEventIds', JSON.stringify(data.map((e: any) => e.id)));
                AsyncStorage.setItem('cached_unseen_events', '0');
                DeviceEventEmitter.emit('eventsSeen');
            }
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
        const islandId = getEventIslandId(event);
        const rawName = islandId === 'BUYUKADA'
            ? 'Büyükada'
            : islandId === 'HEYBELIADA'
                ? 'Heybeliada'
                : islandId === 'BURGAZADA'
                    ? 'Burgazada'
                    : islandId === 'KINALIADA'
                        ? 'Kınalıada'
                        : '';
        return rawName ? t('places.' + rawName, { defaultValue: rawName }) : '';
    };

    const formatCardDate = (startStr?: string | null, endStr?: string | null, hideTime?: boolean) => {
        if (!startStr) return t('common.notSpecified', { defaultValue: 'Belirtilmemiş' });
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

    const openEventCropper = (asset: ImagePicker.ImagePickerAsset) => {
        cropOffsetRef.current = { x: 0, y: 0 };
        cropPan.setValue({ x: 0, y: 0 });
        setPendingCropAsset(asset);
    };

    const confirmEventCrop = async () => {
        if (!pendingCropAsset?.width || !pendingCropAsset?.height) return;
        setIsCroppingImage(true);
        try {
            const cropWidth = Math.min(pendingCropAsset.width, Math.round(cropLayout.frameWidth / cropLayout.scale));
            const cropHeight = Math.min(pendingCropAsset.height, Math.round(cropLayout.frameHeight / cropLayout.scale));
            const originX = Math.max(0, Math.min(
                pendingCropAsset.width - cropWidth,
                Math.round(((cropLayout.displayWidth - cropLayout.frameWidth) / 2 - cropOffsetRef.current.x) / cropLayout.scale)
            ));
            const originY = Math.max(0, Math.min(
                pendingCropAsset.height - cropHeight,
                Math.round(((cropLayout.displayHeight - cropLayout.frameHeight) / 2 - cropOffsetRef.current.y) / cropLayout.scale)
            ));

            // Imported lazily (rather than statically at the top of the file) so that on
            // app installs whose native binary predates this dependency, the missing
            // native module only surfaces as a catchable error here when a crop is
            // actually confirmed — not as a fatal crash the instant this screen opens.
            const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
            const croppedImage = await manipulateAsync(
                pendingCropAsset.uri,
                [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
                { compress: 0.9, format: SaveFormat.JPEG }
            );
            setSelectedImage(croppedImage.uri);
            setPendingCropAsset(null);
        } catch {
            Alert.alert(
                t('common.error', { defaultValue: 'Hata' }),
                i18n.language.startsWith('en')
                    ? 'The photo could not be cropped. Please try another photo.'
                    : 'Fotoğraf kırpılamadı. Lütfen başka bir fotoğraf deneyin.'
            );
        } finally {
            setIsCroppingImage(false);
        }
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
                    // iOS forces its native editor to a square crop, so the app applies
                    // the event banner's 4:5 crop after capture instead.
                    allowsEditing: Platform.OS !== 'ios',
                    aspect: [EVENT_BANNER_WIDTH, EVENT_BANNER_HEIGHT],
                    quality: 0.8,
                });
                if (!result.canceled) {
                    openEventCropper(result.assets[0]);
                }
            } catch (e: any) {
                Alert.alert(
                    t('common.error', { defaultValue: 'Hata' }),
                    t('common.cameraNotAvailable', { defaultValue: 'Kamera bu cihazda kullanılamıyor. Lütfen galeriden seçin.' })
                );
            }
        };

        const chooseFromGallery = async () => {
            try {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: Platform.OS !== 'ios',
                    aspect: [EVENT_BANNER_WIDTH, EVENT_BANNER_HEIGHT],
                    quality: 0.8,
                });
                if (!result.canceled) {
                    openEventCropper(result.assets[0]);
                }
            } catch {
                Alert.alert(
                    t('common.error', { defaultValue: 'Hata' }),
                    i18n.language.startsWith('en')
                        ? 'The photo could not be prepared. Please try another photo.'
                        : 'Fotoğraf hazırlanamadı. Lütfen başka bir fotoğraf deneyin.'
                );
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
            Alert.alert(t('common.error'), i18n.language.startsWith('en') ? 'Please add an event photo.' : 'Lütfen etkinlik fotoğrafı ekleyin.');
            return;
        }


        setIsUploading(true);
        try {
            let imageUrl = selectedImage;
            if (selectedImage && !selectedImage.startsWith('http') && !selectedImage.startsWith('/')) {
                const uploaded = await mediaApi.uploadImage(selectedImage);
                if (!uploaded) {
                    Alert.alert(
                        t('common.error', { defaultValue: 'Hata' }),
                        i18n.language.startsWith('en')
                            ? 'The event photo could not be uploaded. Please try again.'
                            : 'Etkinlik fotoğrafı yüklenemedi. Lütfen tekrar deneyin.'
                    );
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
            name: newEventName.trim() || (i18n.language.startsWith('en') ? 'Event' : 'Etkinlik'),
            description: newEventDetails.trim() || (i18n.language.startsWith('en') ? 'Event details are in the photo.' : 'Etkinlik detayları fotoğraftadır.'),
            startDate: hasStartDate ? startDate.toISOString() : null,
            endDate: hasStartDate && hasEndDate ? endDate.toISOString() : null,
            organizerName: organizerName.trim(),
            organizerContact: contactNumber.trim(),
            eventPlace: newEventLocation.trim(),
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
        setHasStartDate(false);
        setHasStartTime(false);
        setEndDate(new Date(Date.now() + 60 * 60 * 1000));
        setHasEndDate(false);
        setHasEndTime(false);
        setNewEventLocation('');
        setNewEventDetails('');
        setShowOptionalDetails(false);
        setOrganizerName('');
        setContactNumber('');
        setSocialLink('');
        setSelectedImage(null);
        setSuccessModalMessage(
            editingActivityId 
                ? t('common.eventUpdated', { defaultValue: 'Etkinlik başarıyla güncellendi.' })
                : t('common.eventRequestReceived', { defaultValue: 'Etkinliğiniz incelemeye gönderildi.' })
        );
        setSuccessModalVisible(true);
        loadEvents(true);
        DeviceEventEmitter.emit('contentUpdated');
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <IslandDropdown
                        options={ISLAND_FILTERS.map(item => ({ value: item.id, label: item.label }))}
                        value={selectedFilterIsland}
                        onChange={setSelectedFilterIsland}
                        isDark={isDark}
                        menuTop={insets.top + 62}
                        compact
                        triggerLabel={selectedFilterIsland === 'ALL' ? (i18n.language.startsWith('en') ? 'All' : 'Tümü') : undefined}
                    />
                </View>
            </View>

            <ScrollView
                style={[styles.content, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
                contentContainerStyle={[
                    { paddingBottom: 20 },
                    (loading || filteredEvents.length === 0) && { flex: 1 }
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
                ) : filteredEvents.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <EmptyState 
                            icon="calendar" 
                            title={t('events.emptyTitle')}
                            subtitle={t('events.emptySubtitle')}
                            color="#3B82F6"
                        />
                    </View>
                ) : (
                    <View style={isGridView ? { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 } : { paddingHorizontal: 16 }}>
                        {filteredEvents.map((event) => {
                            const resolvedUrl = resolveImageUrl(event.imageUrl);
                            const hasUserImage = event.imageUrl && resolvedUrl && resolvedUrl.startsWith('http');
                            
                            return (
                            <TouchableOpacity
                                key={event.id}
                                style={[styles.eventCard, isDark && { backgroundColor: '#121212', borderColor: '#3F3F46' }, isGridView && { width: (width - 44) / 2, marginHorizontal: 0, marginBottom: 14 }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setViewerImageUrl(
                                        hasUserImage
                                            ? resolvedUrl
                                            : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80'
                                    );
                                    setImageViewerVisible(true);
                                }}
                            >
                                {hasUserImage ? (
                                    <View
                                        style={{ width: '100%', aspectRatio: EVENT_BANNER_ASPECT_RATIO, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }}
                                    >
                                        <Image
                                            source={{ uri: resolvedUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="contain"
                                        />
                                    </View>
                                ) : (
                                    <View
                                        style={{ width: '100%', aspectRatio: EVENT_BANNER_ASPECT_RATIO, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }}
                                    >
                                        <Image
                                            source={{ uri: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80' }}
                                            style={styles.eventImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                )}
                                
                                <View style={[styles.eventInfo, isGridView && { padding: 12 }]}>
                                    <View style={[styles.titleRow, isGridView && { marginBottom: 4 }]}>
                                        <Text style={[styles.eventTitle, { flex: 1 }, isGridView && { fontSize: 14 }, isDark && { color: '#F8FAFC' }]} numberOfLines={1}>{event.name}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
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
                                            <View style={{ gap: 4, marginTop: isGridView ? 2 : 4 }}>
                                                {(() => {
                                                    const islandName = getIslandName(event);
                                                    if (!islandName && !event.eventPlace) return null;
                                                    
                                                    let locationText = islandName || '';
                                                    if (!isGridView && event.eventPlace) {
                                                        locationText += locationText ? ` - ${event.eventPlace}` : event.eventPlace;
                                                    }
                                                    
                                                    return (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <IconSymbol name="mappin.circle.fill" size={14} color={isDark ? '#60A5FA' : '#3B82F6'} />
                                                            <Text style={[styles.eventLocation, { fontSize: 13, marginLeft: 4, color: isDark ? '#60A5FA' : '#3B82F6', fontWeight: '600' }]} numberOfLines={1}>
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
                        setEditingActivityId(null);
                        setNewEventName('');
                        setNewEventDetails('');
                        setSocialLink('');
                        setNewEventLocation('');
                        setSelectedImage(null);
                        setStartDate(new Date());
                        setHasStartDate(false);
                        setHasStartTime(false);
                        setHasEndDate(false);
                        setHasEndTime(false);
                        setShowStartPicker(false);
                        setShowStartTimePicker(false);
                        setShowEndPicker(false);
                        setShowEndTimePicker(false);
                        setShowOptionalDetails(false);
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

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }, { marginBottom: 0 }]}>{i18n.language.startsWith('en') ? 'EVENT PHOTO (Required)' : 'ETKİNLİK FOTOĞRAFI (Zorunlu)'}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: selectedImage ? '#10B981' : (isDark ? '#94A3B8' : '#64748B') }}>
                                {selectedImage ? '1/1' : '0/1'}
                            </Text>
                        </View>
                        {selectedImage ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: selectedImage }} style={styles.imagePreview} resizeMode="contain" />
                                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                                    <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={[styles.addPhotoBtn, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]} onPress={pickImage}>
                                <IconSymbol name="camera.fill" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                                <Text style={[styles.addPhotoText, isDark && { color: '#94A3B8' }]}>{t('events.addPhoto')}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.optionalDetailsToggle, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]}
                            onPress={() => setShowOptionalDetails(value => !value)}
                            activeOpacity={0.75}
                        >
                            <View style={styles.optionalDetailsIcon}>
                                <IconSymbol name="plus" size={18} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.optionalDetailsTitle, isDark && { color: '#FFFFFF' }]}>
                                    {i18n.language.startsWith('en') ? 'Add event details' : 'Etkinlik bilgileri ekle'}
                                </Text>
                                <Text style={[styles.optionalDetailsSubtitle, isDark && { color: '#94A3B8' }]}>
                                    {i18n.language.startsWith('en') ? 'Name, location, date and more (Optional)' : 'Ad, konum, tarih ve diğerleri (İsteğe bağlı)'}
                                </Text>
                            </View>
                            <IconSymbol name={showOptionalDetails ? 'chevron.up' : 'chevron.down'} size={16} color="#64748B" />
                        </TouchableOpacity>

                        {showOptionalDetails && (<View style={styles.optionalDetailsContent}>
                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'EVENT NAME (Optional)' : 'ETKİNLİK ADI (İsteğe bağlı)'}</Text>
                        <TextInput
                            style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder={i18n.language.startsWith('en') ? 'Enter event name' : 'Etkinlik adını yazın'}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={newEventName}
                            onChangeText={setNewEventName}
                        />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'ISLAND (Optional)' : 'ADA / KONUM (İsteğe bağlı)'}</Text>
                        <View style={styles.optionalIslandGrid}>
                            {ISLAND_FILTERS.slice(1).map(item => {
                                const active = selectedIsland === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.optionalIslandButton, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }, active && styles.optionalIslandButtonActive]}
                                        onPress={() => setSelectedIsland(active ? null : item.id)}
                                    >
                                        <Text style={[styles.optionalIslandText, isDark && { color: '#CBD5E1' }, active && { color: '#FFFFFF' }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'EVENT PLACE (Optional)' : 'ETKİNLİK YERİ (İsteğe bağlı)'}</Text>
                        <TextInput
                            style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder={t('events.locationPlaceholder')}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={newEventLocation}
                            onChangeText={setNewEventLocation}
                        />

                        <Text style={[styles.dateFieldLabel, isDark && { color: '#CBD5E1' }]}>{i18n.language.startsWith('en') ? 'Start' : 'Başlangıç'}</Text>
                        <TouchableOpacity
                            style={[styles.dateSelector, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]}
                            onPress={() => setShowStartPicker(true)}
                        >
                            <Text style={[styles.dateSelectorText, { flex: 1 }, isDark && { color: '#FFFFFF' }]}>
                                {hasStartDate
                                    ? startDate.toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                                    : (i18n.language.startsWith('en') ? 'Select start date' : 'Başlangıç tarihi seç')}
                            </Text>
                            <IconSymbol name="calendar" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        {hasStartDate && (
                            <View style={styles.optionalActionsRow}>
                                <TouchableOpacity style={styles.addTimeButton} onPress={() => setShowStartTimePicker(true)}>
                                    <IconSymbol name="clock.fill" size={14} color="#3B82F6" />
                                    <Text style={styles.addTimeText}>
                                        {hasStartTime
                                            ? startDate.toLocaleTimeString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' })
                                            : (i18n.language.startsWith('en') ? '+ Add time' : '+ Saat ekle')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setHasStartDate(false); setHasStartTime(false); setHasEndDate(false); setHasEndTime(false); }}>
                                    <Text style={styles.removeOptionalText}>{i18n.language.startsWith('en') ? 'Remove' : 'Kaldır'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={[styles.dateFieldLabel, { marginTop: 14 }, isDark && { color: '#CBD5E1' }]}>{i18n.language.startsWith('en') ? 'End' : 'Bitiş'}</Text>
                        <TouchableOpacity
                            style={[styles.dateSelector, !hasStartDate && { opacity: 0.5 }, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]}
                            onPress={() => hasStartDate && setShowEndPicker(true)}
                            disabled={!hasStartDate}
                        >
                            <Text style={[styles.dateSelectorText, { flex: 1 }, isDark && { color: '#FFFFFF' }]}>
                                {hasEndDate
                                    ? endDate.toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                                    : (i18n.language.startsWith('en') ? 'Select end date' : 'Bitiş tarihi seç')}
                            </Text>
                            <IconSymbol name="calendar" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        {hasEndDate && (
                            <View style={styles.optionalActionsRow}>
                                <TouchableOpacity style={styles.addTimeButton} onPress={() => setShowEndTimePicker(true)}>
                                    <IconSymbol name="clock.fill" size={14} color="#3B82F6" />
                                    <Text style={styles.addTimeText}>
                                        {hasEndTime
                                            ? endDate.toLocaleTimeString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' })
                                            : (i18n.language.startsWith('en') ? '+ Add time' : '+ Saat ekle')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setHasEndDate(false); setHasEndTime(false); }}>
                                    <Text style={styles.removeOptionalText}>{i18n.language.startsWith('en') ? 'Remove' : 'Kaldır'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <CustomDateTimePicker
                            visible={showStartPicker}
                            value={startDate}
                            mode="date"
                            title={i18n.language.startsWith('en') ? 'Start date' : 'Başlangıç tarihi'}
                            accentColor="#3B82F6"
                            minimumDate={editingActivityId ? undefined : new Date()}
                            onConfirm={(date) => {
                                setStartDate(date);
                                setHasStartDate(true);
                                setHasStartTime(false);
                                if (hasEndDate && endDate < date) {
                                    setHasEndDate(false);
                                    setHasEndTime(false);
                                }
                                setShowStartPicker(false);
                            }}
                            onCancel={() => setShowStartPicker(false)}
                        />
                        <CustomDateTimePicker
                            visible={showStartTimePicker}
                            value={startDate}
                            mode="time"
                            title={i18n.language.startsWith('en') ? 'Start time (Optional)' : 'Başlangıç saati (İsteğe bağlı)'}
                            accentColor="#3B82F6"
                            onConfirm={(date) => { setStartDate(date); setHasStartTime(true); setShowStartTimePicker(false); }}
                            onCancel={() => setShowStartTimePicker(false)}
                        />
                        <CustomDateTimePicker
                            visible={showEndPicker}
                            value={endDate}
                            mode="date"
                            title={i18n.language.startsWith('en') ? 'End date' : 'Bitiş tarihi'}
                            accentColor="#3B82F6"
                            minimumDate={startDate}
                            onConfirm={(date) => { setEndDate(date); setHasEndDate(true); setHasEndTime(false); setShowEndPicker(false); }}
                            onCancel={() => setShowEndPicker(false)}
                        />
                        <CustomDateTimePicker
                            visible={showEndTimePicker}
                            value={endDate}
                            mode="time"
                            title={i18n.language.startsWith('en') ? 'End time (Optional)' : 'Bitiş saati (İsteğe bağlı)'}
                            accentColor="#3B82F6"
                            onConfirm={(date) => { setEndDate(date); setHasEndTime(true); setShowEndTimePicker(false); }}
                            onCancel={() => setShowEndTimePicker(false)}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 14 }, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'DESCRIPTION (Optional)' : 'ETKİNLİK AÇIKLAMASI (İsteğe bağlı)'}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                            placeholder={i18n.language.startsWith('en') ? 'Write event details...' : 'Etkinlik açıklamasını yazın...'}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={newEventDetails}
                            onChangeText={setNewEventDetails}
                            multiline
                            maxLength={500}
                            textAlignVertical="top"
                        />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'ORGANIZER (Optional)' : 'DÜZENLEYEN (İsteğe bağlı)'}</Text>
                        <TextInput style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]} placeholder={i18n.language.startsWith('en') ? 'Organizer name' : 'Düzenleyen kişi veya kurum'} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={organizerName} onChangeText={setOrganizerName} />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'CONTACT (Optional)' : 'İLETİŞİM (İsteğe bağlı)'}</Text>
                        <TextInput style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]} placeholder={i18n.language.startsWith('en') ? 'Phone or email' : 'Telefon veya e-posta'} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={contactNumber} onChangeText={setContactNumber} />

                        <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'SOCIAL LINK (Optional)' : 'SOSYAL MEDYA LİNKİ (İsteğe bağlı)'}</Text>
                        <TextInput style={[styles.input, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]} placeholder="https://instagram.com/..." placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} autoCapitalize="none" value={socialLink} onChangeText={setSocialLink} />
                        </View>)}
                        </View>
                    </KeyboardAwareScrollView>
                </Animated.View>
                </View>
            </Modal>

            <Modal
                visible={Boolean(pendingCropAsset)}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => !isCroppingImage && setPendingCropAsset(null)}
            >
                <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top }}>
                    <View style={{ height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                            onPress={() => setPendingCropAsset(null)}
                            disabled={isCroppingImage}
                            style={{ minWidth: 72, paddingVertical: 10 }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                                {i18n.language.startsWith('en') ? 'Cancel' : 'İptal'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                            {i18n.language.startsWith('en') ? 'Crop event banner' : 'Etkinlik afişini kırp'}
                        </Text>
                        <TouchableOpacity
                            onPress={confirmEventCrop}
                            disabled={isCroppingImage}
                            style={{ minWidth: 72, paddingVertical: 10, alignItems: 'flex-end' }}
                        >
                            {isCroppingImage ? (
                                <ActivityIndicator size="small" color="#60A5FA" />
                            ) : (
                                <Text style={{ color: '#60A5FA', fontSize: 15, fontWeight: '800' }}>
                                    {i18n.language.startsWith('en') ? 'Use' : 'Kullan'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <View
                            {...cropPanResponder.panHandlers}
                            style={{
                                width: cropLayout.frameWidth,
                                height: cropLayout.frameHeight,
                                overflow: 'hidden',
                                backgroundColor: '#111827',
                                borderRadius: 12,
                            }}
                        >
                            {pendingCropAsset && (
                                <Animated.Image
                                    source={{ uri: pendingCropAsset.uri }}
                                    style={{
                                        position: 'absolute',
                                        left: (cropLayout.frameWidth - cropLayout.displayWidth) / 2,
                                        top: (cropLayout.frameHeight - cropLayout.displayHeight) / 2,
                                        width: cropLayout.displayWidth,
                                        height: cropLayout.displayHeight,
                                        transform: cropPan.getTranslateTransform(),
                                    }}
                                    resizeMode="stretch"
                                />
                            )}
                            <View
                                pointerEvents="none"
                                style={[StyleSheet.absoluteFillObject, { borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 12 }]}
                            />
                        </View>
                        <Text style={{ color: '#CBD5E1', fontSize: 13, marginTop: 18, textAlign: 'center', paddingHorizontal: 30 }}>
                            {i18n.language.startsWith('en')
                                ? 'Drag the photo to position it inside the 4:5 event banner.'
                                : 'Fotoğrafı sürükleyerek 4:5 etkinlik afişi alanına yerleştirin.'}
                        </Text>
                    </View>
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

            <Modal
                visible={imageViewerVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setImageViewerVisible(false)}
            >
                <View style={styles.fullscreenPoster}>
                    <TouchableOpacity
                        style={[styles.fullscreenCloseButton, { top: insets.top + 16 }]}
                        onPress={() => setImageViewerVisible(false)}
                        activeOpacity={0.75}
                    >
                        <IconSymbol name="xmark" size={19} color="#FFFFFF" />
                    </TouchableOpacity>
                    {viewerImageUrl && (
                        <Image
                            source={{ uri: viewerImageUrl }}
                            style={styles.fullscreenPosterImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

        </View>
        </SwipeNavigation>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    fullscreenPoster: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
    },
    fullscreenPosterImage: {
        width: '100%',
        height: '100%',
    },
    fullscreenCloseButton: {
        position: 'absolute',
        right: 20,
        zIndex: 10,
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
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
        paddingHorizontal: 0,
        paddingTop: 16,
    },
    eventCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1.25,
        borderColor: '#CBD5E1',
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
        elevation: 6,
    },
    eventImage: {
        width: '100%',
        height: '100%',
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
    optionalDetailsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        padding: 14,
        marginTop: 2,
        marginBottom: 4,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
    },
    optionalDetailsIcon: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
    },
    optionalDetailsTitle: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '800',
    },
    optionalDetailsSubtitle: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    optionalDetailsContent: {
        marginTop: 20,
    },
    optionalIslandGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    optionalIslandButton: {
        width: '48%',
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
    },
    optionalIslandButtonActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    optionalIslandText: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '700',
    },
    dateFieldLabel: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 7,
    },
    optionalActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 38,
        marginTop: 4,
        paddingHorizontal: 4,
    },
    addTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingRight: 12,
    },
    addTimeText: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: '700',
    },
    removeOptionalText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700',
        paddingVertical: 8,
    },
    publishButtonDisabled: {
        backgroundColor: '#E2E8F0',
    },
    islandChip: {
        paddingHorizontal: 4,
        paddingVertical: 11,
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
        width: '100%',
        aspectRatio: EVENT_BANNER_ASPECT_RATIO,
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
