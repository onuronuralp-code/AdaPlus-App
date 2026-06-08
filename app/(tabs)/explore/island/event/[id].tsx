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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { AppActivityDto, getActivity, toggleActivityRsvp } from '@/services/api';
import { resolveImageUrl } from '@/services/config';
import { useAuth } from '@/context/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EventDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn } = useAuth();
    const { i18n } = useTranslation();

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
                    onPress={() => router.navigate('/(tabs)/explore/island/events')}
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
            {/* Floating back button */}
            <View style={[styles.headerActions, { top: insets.top + 10 }]}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.navigate('/(tabs)/explore/island/events')}
                >
                    <IconSymbol name="chevron.left" size={24} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                {/* Hero image */}
                <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />

                <View style={styles.content}>
                    {/* Badge + date */}
                    <View style={styles.metaRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>ETKİNLİK</Text>
                        </View>
                        {rsvpCount > 0 && (
                            <View style={styles.attendeePill}>
                                <IconSymbol name="person.2.fill" size={13} color="#3B82F6" />
                                <Text style={styles.attendeeText}>{rsvpCount} katılımcı</Text>
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
                            <Text style={styles.infoLabel}>BAŞLANGIÇ</Text>
                            <Text style={styles.infoValue}>{formatDate(activity.startDate)}</Text>
                            {activity.endDate && (
                                <>
                                    <Text style={[styles.infoLabel, { marginTop: 6 }]}>BİTİŞ</Text>
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
                                <Text style={styles.infoLabel}>KONUM</Text>
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
                            <Text style={styles.infoLabel}>ORGANİZATÖR</Text>
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
                                onPress={() => Linking.openURL(activity.instagramLink!)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.infoLabel}>SOSYAL MEDYA</Text>
                                <Text style={[styles.infoValue, { color: '#3B82F6' }]} numberOfLines={1}>
                                    {activity.instagramLink}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Description */}
                    <Text style={styles.sectionTitle}>Etkinlik Detayları</Text>
                    <Text style={styles.description}>{activity.description}</Text>
                </View>
            </ScrollView>

            {/* Sticky RSVP bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity
                    style={[styles.rsvpButton, going && styles.rsvpButtonGoing, rsvpLoading && styles.rsvpButtonLoading]}
                    onPress={handleRsvp}
                    activeOpacity={0.85}
                    disabled={rsvpLoading}
                >
                    {rsvpLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : going ? (
                        <>
                            <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                            <Text style={styles.rsvpButtonText}>Katılıyorum</Text>
                        </>
                    ) : (
                        <>
                            <IconSymbol name="calendar.badge.plus" size={20} color="#fff" />
                            <Text style={styles.rsvpButtonText}>Katılmak İstiyorum</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

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
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
        height: SCREEN_WIDTH * 0.65,
        backgroundColor: '#F1F5F9',
    },
    content: {
        padding: 24,
        marginTop: -20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
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
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    rsvpButton: {
        height: 56,
        backgroundColor: '#3B82F6',
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    rsvpButtonGoing: {
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
    },
    rsvpButtonLoading: {
        opacity: 0.7,
    },
    rsvpButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});
