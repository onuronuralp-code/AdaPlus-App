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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { AppActivityDto, getActivity, toggleActivityRsvp } from '@/services/api';
import { resolveImageUrl, safeOpenUrl } from '@/services/config';
import { useAuth } from '@/context/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    const { t, i18n } = useTranslation();

    const [activity, setActivity] = useState<AppActivityDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [going, setGoing] = useState(false);
    const [rsvpCount, setRsvpCount] = useState(0);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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
            <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!activity) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={64} color="#CBD5E1" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16 }}>
                    {loadError ? 'Bağlantı hatası.' : 'Etkinlik bulunamadı.'}
                </Text>
                <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
                    {loadError
                        ? 'Etkinlik yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.'
                        : 'Bu etkinlik silinmiş veya yayından kaldırılmış olabilir.'}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/(tabs)/explore/island/events');
                    }}
                    style={{ marginTop: 24, backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                >
                    <Text style={{ color: '#3B82F6', fontWeight: '700' }}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const heroUri = resolveImageUrl(activity.imageUrl) ||
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80';

    return (
        <View style={styles.container}>
            {/* Floating back + share buttons */}
            <View style={[styles.headerActions, { top: insets.top + 10 }]}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/(tabs)/explore/island/events');
                    }}
                >
                    <IconSymbol name="chevron.left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => Share.share({
                        title: activity.name,
                        message: `${activity.name}\n\n${activity.description}${activity.eventPlace ? `\n\nKonum: ${activity.eventPlace}` : ''}\n\nAdaPlus uygulamasından paylaşıldı`,
                    })}
                >
                    <IconSymbol name="square.and.arrow.up" size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Hero image (Fixed) */}
            <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />

            <ScrollView
                style={{ flex: 1, marginTop: 0 }}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            >
                <View style={[styles.content, { marginTop: 0 }]}>
                    {/* Badge + date */}
                    <View style={styles.metaRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t('events.badge', { defaultValue: i18n.language.startsWith('en') ? 'EVENT' : 'ETKİNLİK' })}</Text>
                        </View>
                        {rsvpCount > 0 && (
                            <View style={styles.attendeePill}>
                                <IconSymbol name="person.2.fill" size={13} color="#3B82F6" />
                                <Text style={styles.attendeeText}>{rsvpCount} {t('events.attendeesCount', { defaultValue: 'katılımcı' })}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.title}>{activity.name}</Text>

                    <View style={styles.divider} />

                    {/* Date / time */}
                    <View style={styles.infoItem}>
                        <View style={styles.infoIcon}>
                            <IconSymbol name="calendar" size={20} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>{t('events.startLabel', { defaultValue: 'BAŞLANGIÇ' })}</Text>
                            <Text style={styles.infoValue}>{formatDate(activity.startDate)}</Text>
                            {activity.endDate && (
                                <>
                                    <Text style={[styles.infoLabel, { marginTop: 6 }]}>{t('events.endLabel', { defaultValue: 'BİTİŞ' })}</Text>
                                    <Text style={styles.infoValue}>{formatDate(activity.endDate)}</Text>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Location */}
                    {activity.eventPlace && (
                        <View style={[styles.infoItem, { marginTop: 20 }]}>
                            <View style={styles.infoIcon}>
                                <IconSymbol name="mappin.and.ellipse" size={20} color="#64748B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>{t('events.locationLabel', { defaultValue: 'KONUM' })}</Text>
                                <Text style={styles.infoValue}>{activity.eventPlace}</Text>
                            </View>
                        </View>
                    )}

                    {/* Organizer */}
                    <View style={[styles.infoItem, { marginTop: 20 }]}>
                        <View style={styles.infoIcon}>
                            <IconSymbol name="person.fill" size={20} color="#64748B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>{t('events.organizerLabel', { defaultValue: 'ORGANİZATÖR' })}</Text>
                            <Text style={styles.infoValue}>{activity.organizerName}</Text>
                            {activity.organizerContact && (
                                <Text style={styles.contactText}>{activity.organizerContact}</Text>
                            )}
                        </View>
                    </View>

                    {/* Instagram */}
                    {activity.instagramLink && (
                        <View style={[styles.infoItem, { marginTop: 20 }]}>
                            <View style={styles.infoIcon}>
                                <IconSymbol name="link" size={20} color="#64748B" />
                            </View>
                            <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => safeOpenUrl(activity.instagramLink ? normalizeInstagramUrl(activity.instagramLink) : undefined)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.infoLabel}>{t('events.socialMediaLabel', { defaultValue: 'SOSYAL MEDYA' })}</Text>
                                <Text style={[styles.infoValue, { color: '#3B82F6' }]} numberOfLines={1}>
                                    {activity.instagramLink}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Description */}
                    <Text style={styles.sectionTitle}>{t('events.detailsLabel', { defaultValue: 'Etkinlik Detayları' })}</Text>
                    <Text style={styles.description}>{activity.description}</Text>
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
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    heroImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 0.8,
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
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    attendeeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3B82F6',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
        letterSpacing: -0.5,
        lineHeight: 30,
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
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    infoLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '700',
        lineHeight: 22,
    },
    contactText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#475569',
        lineHeight: 26,
    },
});
