import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Linking,
    Share,
    Alert,
    Platform,
    Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { AppActivityDto, getActivity, toggleActivityRsvp } from '@/services/api';
import { resolveImageUrl, safeOpenUrl } from '@/services/config';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { translateText } from '@/utils/translate';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isIphone16 = Platform.OS === 'ios' && SCREEN_HEIGHT >= 852;

const normalizeInstagramUrl = (url: string): string => {
    const s = url.trim();
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('instagram://')) return s;
    const username = s.replace(/^@/, '');
    if (!username.includes('.')) return `https://www.instagram.com/${username}/`;
    return `https://${s}`;
};

export default function EventDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t, i18n } = useTranslation();

    const [activity, setActivity] = useState<AppActivityDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [going, setGoing] = useState(false);
    const [rsvpCount, setRsvpCount] = useState(0);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
    const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);

    const handleToggleTranslation = async () => {
        if (!activity) return;
        if (translatedDesc || translatedTitle) {
            setTranslatedTitle(null);
            setTranslatedDesc(null);
            return;
        }
        setIsTranslating(true);
        const targetLang = 'en';
        const [tTitle, tDesc] = await Promise.all([
            activity.name ? translateText(activity.name, targetLang) : Promise.resolve(null),
            activity.description ? translateText(activity.description, targetLang) : Promise.resolve(null)
        ]);
        if (tTitle && tTitle !== activity.name) setTranslatedTitle(tTitle);
        if (tDesc) setTranslatedDesc(tDesc);
        setIsTranslating(false);
    };
    const lastTapRef = useRef<number>(0);

    useEffect(() => {
        if (!id) return;
        getActivity(id as string)
            .then((data) => {
                if (data) {
                    setActivity(data);
                    setGoing(data.userHasRsvp ?? false);
                    setRsvpCount(data.rsvpCount ?? 0);
                }
            })
            .catch(() => setLoadError(true))
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleRsvp = async () => {
        if (!isLoggedIn) {
            setShowLoginPrompt(true);
            return;
        }
        const now = Date.now();
        if (rsvpLoading || now - lastTapRef.current < 400) return;
        lastTapRef.current = now;

        // Optimistic update
        const optimisticGoing = !going;
        setGoing(optimisticGoing);
        setRsvpCount((prev) => optimisticGoing ? prev + 1 : Math.max(0, prev - 1));
        setRsvpLoading(true);

        const result = await toggleActivityRsvp(id as string);
        setRsvpLoading(false);

        if (result) {
            setGoing(result.going);
            setRsvpCount(result.rsvpCount);
        } else {
            // Revert on failure
            setGoing(!optimisticGoing);
            setRsvpCount((prev) => optimisticGoing ? Math.max(0, prev - 1) : prev + 1);
        }
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
        // Check if same day, month, year
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, isDark && { backgroundColor: '#000000' }, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!activity) {
        return (
            <View style={[styles.container, isDark && { backgroundColor: '#000000' }, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={64} color={isDark ? "#475569" : "#CBD5E1"} />
                <Text style={[{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16 }, isDark && { color: '#FFFFFF' }]}>
                    {loadError ? 'Bağlantı hatası.' : 'Etkinlik bulunamadı.'}
                </Text>
                <Text style={[{ fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 }, isDark && { color: '#94A3B8' }]}>
                    {loadError
                        ? 'Etkinlik yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.'
                        : 'Bu etkinlik silinmiş veya yayından kaldırılmış olabilir.'}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.back();
                    }}
                    style={[{ marginTop: 24, backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }, isDark && { backgroundColor: '#1C1C1E' }]}
                >
                    <Text style={{ color: '#3B82F6', fontWeight: '700' }}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const heroUri = resolveImageUrl(activity.imageUrl) ||
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80';

    const isEnActive = Boolean(translatedDesc || translatedTitle) || i18n.language.startsWith('en');

    return (
        <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
            {/* Floating back + share buttons */}
            <View style={[styles.headerActions, { top: insets.top + 10 }]}>
                <TouchableOpacity
                    style={[styles.iconButton, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]}
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.back();
                    }}
                >
                    <IconSymbol name="chevron.left" size={24} color={isDark ? "#FFFFFF" : "#1E293B"} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.iconButton, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]}
                    onPress={async () => {
                        try {
                            const shareUrl = `https://adaplus.app/explore/island/event/${activity.id}`;
                            await Share.share({
                                title: activity.name,
                                message: `${activity.name}\n\n${activity.description || ''}\n\nAdaPlus'ta etkinliği incele: ${shareUrl}`,
                                url: shareUrl,
                            });
                        } catch (error) {
                            console.log('Share error:', error);
                        }
                    }}
                >
                    <IconSymbol name="square.and.arrow.up" size={20} color={isDark ? "#FFFFFF" : "#1E293B"} />
                </TouchableOpacity>
            </View>

            {/* Hero image (Clickable for Fullscreen) */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setImageViewerVisible(true)}
                style={[styles.heroImage, { backgroundColor: isDark ? '#121212' : '#F1F5F9' }]}
            >
                <Image source={{ uri: heroUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>

            <ScrollView
                style={{ flex: 1, marginTop: 0 }}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            >
                <View style={[styles.content, { marginTop: 0 }, isDark && { backgroundColor: '#000000' }]}>
                    {/* Badge + date */}
                    <View style={[styles.metaRow, { justifyContent: 'space-between' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                            <View style={[styles.badge, isDark && { backgroundColor: '#1E3A8A' }]}>
                                <Text style={[styles.badgeText, isDark && { color: '#60A5FA' }]}>{isEnActive ? 'EVENT' : 'ETKİNLİK'}</Text>
                            </View>
                            {rsvpCount > 0 && (
                                <View style={[styles.attendeePill, isDark && { backgroundColor: '#1C1C1E' }]}>
                                    <IconSymbol name="person.2.fill" size={13} color="#F59E0B" />
                                    <Text style={[styles.attendeeText, { color: '#F59E0B' }]}>{rsvpCount} {isEnActive ? 'attendees' : 'katılımcı'}</Text>
                                </View>
                            )}
                        </View>
                        {activity.description && activity.description.trim().length > 3 && (
                            <TouchableOpacity 
                                onPress={handleToggleTranslation}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: isDark ? '#1E293B' : '#F0F7FF', borderRadius: 12 }}
                                activeOpacity={0.7}
                            >
                                {isTranslating ? (
                                    <ActivityIndicator size="small" color="#3B82F6" />
                                ) : (
                                    <>
                                        <IconSymbol name="globe" size={13} color="#3B82F6" />
                                        <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '700' }}>
                                            {(translatedDesc || translatedTitle) ? 'Show Original (TR)' : 'Translate to English'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>{translatedTitle || activity.name}</Text>

                    {/* Description */}
                    <Text style={[styles.description, { marginTop: 6, marginBottom: 12 }, isDark && { color: '#CBD5E1' }]}>
                        {translatedDesc || activity.description}
                    </Text>

                    <View style={[styles.divider, isDark && { backgroundColor: '#1C1C1E' }]} />

                    {/* Date / time */}
                    <View style={styles.infoItem}>
                        <View style={[styles.infoIcon, isDark && { backgroundColor: '#1C1C1E' }]}>
                            <IconSymbol name="calendar" size={20} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.infoLabel, isDark && { color: '#94A3B8' }]}>{isEnActive ? 'START TIME' : 'BAŞLANGIÇ'}</Text>
                            {(() => {
                                const parseDateAndTime = (ds?: string) => {
                                    if (!ds) return { date: '', time: '' };
                                    const d = new Date(ds);
                                    return {
                                        date: d.toLocaleDateString(isEnActive ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                                        time: d.toLocaleTimeString(isEnActive ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' })
                                    };
                                };
                                const start = parseDateAndTime(activity.startDate);
                                const end = activity.endDate ? parseDateAndTime(activity.endDate) : null;
                                
                                return (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingRight: 8 }}>
                                        <Text style={[styles.infoValue, isDark && { color: '#F8FAFC' }]}>{start.date}</Text>
                                        <View style={{ backgroundColor: isDark ? '#064E3B' : '#FFFFFF', borderColor: '#10B981', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                            <Text style={{ color: isDark ? '#34D399' : '#10B981', fontWeight: 'bold', fontSize: 14 }}>{start.time}</Text>
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>
                    </View>

                    {/* Location */}
                    {activity.eventPlace && (
                        <TouchableOpacity
                            style={[styles.infoItem, { marginTop: 20 }]}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (!activity.eventPlace) return;
                                const query = encodeURIComponent(`${activity.eventPlace}${activity.island ? `, ${activity.island}` : ''}`);
                                const url = Platform.OS === 'ios'
                                    ? `https://maps.apple.com/?q=${query}`
                                    : `https://www.google.com/maps/search/?api=1&query=${query}`;
                                Linking.openURL(url).catch(() => {
                                    Alert.alert(isEnActive ? 'Error' : 'Hata', isEnActive ? 'Failed to open maps.' : 'Harita uygulaması açılamadı.');
                                });
                            }}
                        >
                            <View style={[styles.infoIcon, isDark ? { backgroundColor: '#1C1C1E' } : { backgroundColor: '#EFF6FF' }]}>
                                <IconSymbol name="mappin.and.ellipse" size={20} color={isDark ? "#60A5FA" : "#3B82F6"} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.infoLabel, isDark && { color: '#94A3B8' }]}>{isEnActive ? 'LOCATION' : 'KONUM'}</Text>
                                <Text style={[styles.infoValue, { color: isDark ? '#60A5FA' : '#3B82F6', textDecorationLine: 'underline' }]}>{activity.eventPlace}</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Organizer */}
                    <View style={[styles.infoItem, { marginTop: 20 }]}>
                        <View style={[styles.infoIcon, isDark && { backgroundColor: '#1C1C1E' }]}>
                            <IconSymbol name="person.fill" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.infoLabel, isDark && { color: '#94A3B8' }]}>{isEnActive ? 'ORGANIZER' : 'ORGANİZATÖR'}</Text>
                            <Text style={[styles.infoValue, isDark && { color: '#F8FAFC' }]}>{activity.organizerName}</Text>
                        </View>
                    </View>

                    {/* Separate Phone / Email Contact Card */}
                    {activity.organizerContact && (() => {
                        const c = activity.organizerContact.trim().toLowerCase();
                        const isInsta = c.includes('instagram.com') || c.includes('instagr.am') || c.startsWith('@') || c.startsWith('ig:') || c.includes('insta');
                        if (isInsta) return null;

                        const isEmail = c.includes('@');

                        return (
                            <TouchableOpacity
                                style={[styles.infoItem, { marginTop: 20 }]}
                                activeOpacity={0.7}
                                onPress={() => {
                                    const contact = activity.organizerContact!.trim();
                                    if (isEmail) {
                                        Linking.openURL(`mailto:${contact}`).catch(() => Alert.alert(isEnActive ? 'Error' : 'Hata', isEnActive ? 'Failed to open mail app.' : 'E-posta uygulaması açılamadı.'));
                                    } else {
                                        Linking.openURL(`tel:${contact.replace(/[^\d+]/g, '')}`).catch(() => Alert.alert(isEnActive ? 'Call Failed' : 'Arama Yapılamadı', isEnActive ? 'Calling is not supported on this device.' : `Bu cihazda arama desteklenmiyor olabilir.\n\nNumara: ${contact}`));
                                    }
                                }}
                            >
                                <View style={[styles.infoIcon, isDark ? { backgroundColor: '#1C1C1E' } : { backgroundColor: isEmail ? '#EFF6FF' : '#ECFDF5' }]}>
                                    <IconSymbol 
                                        name={isEmail ? "envelope.fill" : "phone.fill"} 
                                        size={20} 
                                        color={isEmail ? (isDark ? '#60A5FA' : '#3B82F6') : (isDark ? '#34D399' : '#10B981')} 
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.infoLabel, isDark && { color: '#94A3B8' }]}>
                                        {isEmail ? (isEnActive ? 'EMAIL' : 'E-MAİL') : (isEnActive ? 'PHONE' : 'TELEFON')}
                                    </Text>
                                    <Text style={[styles.infoValue, { color: isEmail ? (isDark ? '#60A5FA' : '#3B82F6') : (isDark ? '#34D399' : '#10B981') }]}>
                                        {activity.organizerContact}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })()}

                    {/* Instagram */}
                    {activity.instagramLink && (
                        <TouchableOpacity
                            style={[styles.infoItem, { marginTop: 20 }]}
                            onPress={() => {
                                if (!activity.instagramLink) return;
                                const targetUrl = normalizeInstagramUrl(activity.instagramLink);
                                Linking.openURL(targetUrl).catch(() => {
                                    Alert.alert(isEnActive ? 'Error' : 'Hata', isEnActive ? 'Failed to open link.' : 'Bağlantı açılamadı.');
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.infoIcon, isDark ? { backgroundColor: '#1C1C1E' } : { backgroundColor: '#FCE7F3' }]}>
                                <MaterialCommunityIcons name="instagram" size={20} color="#E1306C" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.infoLabel, isDark && { color: '#94A3B8' }]}>{isEnActive ? 'INSTAGRAM' : 'INSTAGRAM'}</Text>
                                <Text style={[styles.infoValue, { color: '#E1306C' }]} numberOfLines={1}>
                                    {activity.instagramLink}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                </View>
            </ScrollView>

            <LoginPromptModal
                visible={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
                onLogin={() => {
                    setShowLoginPrompt(false);
                    router.push('/login');
                }}
                message="Etkinliğe katılmak için giriş yapmalısınız."
            />

            {/* Fullscreen Image Viewer Modal */}
            <Modal
                visible={imageViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImageViewerVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
                    {/* Close button */}
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            top: insets.top + 16,
                            right: 20,
                            zIndex: 20,
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => setImageViewerVisible(false)}
                    >
                        <IconSymbol name="xmark" size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    <Image
                        source={{ uri: heroUri }}
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                        resizeMode="contain"
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerActions: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    heroImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 0.78,
        backgroundColor: '#F1F5F9',
    },
    content: {
        padding: 24,
        marginTop: 0,
        backgroundColor: '#fff',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    badge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#3B82F6',
        letterSpacing: 1,
    },
    attendeePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    attendeeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F59E0B',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 24,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    infoIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    infoLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '700',
        lineHeight: 18,
    },
    contactText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },
    rsvpButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    rsvpButtonActive: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    rsvpButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    rsvpButtonTextActive: {
        color: '#3B82F6',
    },
});
