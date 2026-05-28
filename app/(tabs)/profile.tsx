import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { fetchUserPosts, fetchUserReplies, fetchUserLikes, PostDto } from '@/services/forumApi';
import { fetchMyListings, ListingDto } from '@/services/listingApi';
import { fetchMyActivities, AppActivityDto } from '@/services/api';
import { fetchNotifications, markNotificationRead, NotificationDto, NotificationType } from '@/services/notificationApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import { useAuth } from '@/context/AuthContext';

type ProfileTab = 'posts' | 'replies' | 'listings' | 'events' | 'likes' | 'notifications';

const TABS: { key: ProfileTab; label: string; icon: string; color: string }[] = [
    { key: 'posts', label: 'Paylaşımlar', icon: 'bubble.left.and.bubble.right.fill', color: '#6366F1' },
    { key: 'replies', label: 'Yanıtlar', icon: 'arrow.uturn.left.circle.fill', color: '#8B5CF6' },
    { key: 'notifications', label: 'Bildirimler', icon: 'bell.fill', color: '#F43F5E' },
    { key: 'listings', label: 'İlanlar', icon: 'tag.fill', color: '#10B981' },
    { key: 'events', label: 'Etkinlikler', icon: 'calendar', color: '#F59E0B' },
    { key: 'likes', label: 'Beğeniler', icon: 'heart.fill', color: '#EC4899' },
];

export default function ProfileScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { logout, user, isLoggedIn } = useAuth();
    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [posts, setPosts] = useState<PostDto[]>([]);
    const [replies, setReplies] = useState<PostDto[]>([]);
    const [likedPosts, setLikedPosts] = useState<PostDto[]>([]);
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [listings, setListings] = useState<ListingDto[]>([]);
    const [activities, setActivities] = useState<AppActivityDto[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingReplies, setLoadingReplies] = useState(true);
    const [loadingLikes, setLoadingLikes] = useState(true);
    const [loadingNotifications, setLoadingNotifications] = useState(true);
    const [loadingListings, setLoadingListings] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);

    useFocusEffect(useCallback(() => {
        if (!user) return;

        setLoadingPosts(true);
        setLoadingReplies(true);
        setLoadingLikes(true);
        setLoadingNotifications(true);
        setLoadingListings(true);
        setLoadingActivities(true);

        fetchNotifications()
            .then(data => setNotifications(data))
            .catch(() => setNotifications([]))
            .finally(() => setLoadingNotifications(false));

        fetchUserPosts(user.id)
            .then(data => setPosts(data))
            .catch(() => setPosts([]))
            .finally(() => setLoadingPosts(false));

        fetchUserReplies(user.id)
            .then(data => setReplies(data))
            .catch(() => setReplies([]))
            .finally(() => setLoadingReplies(false));

        fetchUserLikes(user.id)
            .then(data => setLikedPosts(data))
            .catch(() => setLikedPosts([]))
            .finally(() => setLoadingLikes(false));

        fetchMyListings()
            .then(data => setListings(data))
            .catch(() => setListings([]))
            .finally(() => setLoadingListings(false));

        fetchMyActivities()
            .then(data => setActivities(data))
            .catch(() => setActivities([]))
            .finally(() => setLoadingActivities(false));
    }, [user?.id]));

    const timeAgo = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), {
                addSuffix: true,
                locale: i18n.language.startsWith('tr') ? tr : enUS
            });
        } catch {
            return '';
        }
    };

    const renderEmpty = (icon: string, title: string, subtitle: string, color?: string) => (
        <EmptyState 
            icon={icon} 
            title={title} 
            subtitle={subtitle}
            color={color}
            compact={true}
        />
    );

    const renderPosts = () => {
        if (loadingPosts) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366F1" /></View>;
        if (posts.length === 0) return renderEmpty('bubble.left.and.bubble.right.fill', 'Henüz Paylaşım Yok', 'Toplulukla fikirlerini paylaşmaya başla!', '#6366F1');
        return (
            <View style={styles.contentList}>
                {posts.map(post => (
                    <View key={post.id} style={styles.postCard}>
                        <Text style={styles.postContent}>{post.content}</Text>
                        <View style={styles.postFooter}>
                            <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <IconSymbol name="heart.fill" size={14} color="#EC4899" />
                                    <Text style={styles.statText}>{post.likeCount}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <IconSymbol name="bubble.left.and.bubble.right.fill" size={14} color="#64748B" />
                                    <Text style={styles.statText}>{post.replyCount}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderReplies = () => {
        if (loadingReplies) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#8B5CF6" /></View>;
        if (replies.length === 0) return renderEmpty('arrow.uturn.left.circle.fill', 'Henüz Yanıt Yok', 'Paylaşımlara yorum yaparak etkileşime geç!', '#8B5CF6');
        return (
            <View style={styles.contentList}>
                {replies.map(reply => (
                    <View key={reply.id} style={styles.postCard}>
                        <View style={styles.replyHeader}>
                            <IconSymbol name="arrow.uturn.left" size={12} color="#64748B" />
                            <Text style={styles.replyContext}>Gönderiye yanıt olarak:</Text>
                        </View>
                        <Text style={styles.postContent}>{reply.content}</Text>
                        <View style={styles.postFooter}>
                            <Text style={styles.postTime}>{timeAgo(reply.createdAt)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const getNotifIcon = (type: NotificationType): { name: string; color: string; bg: string } => {
        switch (type) {
            case NotificationType.REPLY:    return { name: 'bubble.left.fill',        color: '#6366F1', bg: '#EEF2FF' };
            case NotificationType.LIKE:     return { name: 'heart.fill',               color: '#EC4899', bg: '#FDF2F8' };
            case NotificationType.ACTIVITY: return { name: 'calendar.circle.fill',     color: '#F59E0B', bg: '#FFFBEB' };
            default:                        return { name: 'bell.fill',                color: '#F43F5E', bg: '#FFF1F2' };
        }
    };

    const renderNotifications = () => {
        if (loadingNotifications) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#F43F5E" /></View>;
        if (notifications.length === 0) return renderEmpty('bell.fill', 'Bildirim Yok', 'Etkinlik onayları ve gönderi yanıtları burada görünecek.');
        return (
            <View style={styles.contentList}>
                {notifications.map(notif => {
                    const { name, color, bg } = getNotifIcon(notif.type);
                    return (
                        <TouchableOpacity
                            key={notif.id}
                            style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (!notif.read) {
                                    markNotificationRead(notif.id);
                                    setNotifications(prev =>
                                        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                                    );
                                }
                            }}
                        >
                            <View style={[styles.notifIcon, { backgroundColor: bg }]}>
                                <IconSymbol name={name as any} size={16} color={color} />
                            </View>
                            <View style={styles.notifBody}>
                                <Text style={styles.notifTitle}>{notif.title}</Text>
                                <Text style={styles.notifContent} numberOfLines={2}>{notif.body}</Text>
                                <Text style={styles.postTime}>{timeAgo(notif.createdAt)}</Text>
                            </View>
                            {!notif.read && <View style={[styles.notifDot, { backgroundColor: color }]} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const renderListings = () => {
        if (loadingListings) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
        if (listings.length === 0) return renderEmpty('tag.fill', 'Henüz İlan Yok', 'İlk ilanınızı oluşturmak için İlanlar sayfasını ziyaret edin.', '#10B981');
        return (
            <View style={styles.contentList}>
                {listings.map(listing => (
                    <TouchableOpacity 
                        key={listing.id} 
                        style={styles.listingCard}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/(tabs)/explore/island/ilan/${listing.id}`)}
                    >
                        <View style={styles.listingInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text style={[styles.listingTitle, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>{listing.title}</Text>
                                {listing.status && listing.status !== 'APPROVED' && (() => {
                                    const c = listing.status === 'REJECTED' ? '#EF4444' : '#F59E0B';
                                    const l = listing.status === 'REJECTED' ? 'Reddedildi' : 'Beklemede';
                                    return <View style={{ backgroundColor: c + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}><Text style={{ fontSize: 10, fontWeight: '700', color: c }}>{l}</Text></View>;
                                })()}
                            </View>
                            <Text style={styles.listingDesc} numberOfLines={2}>{listing.description}</Text>
                            <Text style={styles.listingTime}>{timeAgo(listing.createdAt)}</Text>
                        </View>
                        {listing.price > 0 && (
                            <View style={styles.priceTag}>
                                <Text style={styles.priceText}>{listing.price} ₺</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderEvents = () => {
        if (loadingActivities) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#F59E0B" /></View>;
        if (activities.length === 0) return renderEmpty('calendar', 'Henüz Etkinlik Yok', 'Oluşturduğunuz etkinlikler burada görünecek.', '#F59E0B');
        return (
            <View style={styles.contentList}>
                {activities.map(activity => {
                    const statusColor = activity.status === 'APPROVED' ? '#10B981' : activity.status === 'REJECTED' ? '#EF4444' : '#F59E0B';
                    const statusLabel = activity.status === 'APPROVED' ? 'Onaylı' : activity.status === 'REJECTED' ? 'Reddedildi' : 'Beklemede';
                    return (
                        <View key={activity.id} style={styles.postCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                <Text style={[styles.listingTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{activity.name}</Text>
                                <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
                                </View>
                            </View>
                            {activity.eventPlace ? <Text style={styles.listingDesc} numberOfLines={1}>{activity.eventPlace}</Text> : null}
                            <Text style={styles.postTime}>{timeAgo(activity.startDate)}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderLikes = () => {
        if (loadingLikes) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#EC4899" /></View>;
        if (likedPosts.length === 0) return renderEmpty('heart.fill', 'Henüz Beğeni Yok', 'Beğendiğiniz paylaşımlar burada görünecek.', '#EC4899');
        return (
            <View style={styles.contentList}>
                {likedPosts.map(post => (
                    <TouchableOpacity 
                        key={post.id} 
                        style={styles.postCard}
                        onPress={() => router.push(`/(tabs)/explore/island/forum/${post.id}`)}
                    >
                        <Text style={styles.postContent}>{post.content}</Text>
                        <View style={styles.postFooter}>
                            <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <IconSymbol name="heart.fill" size={14} color="#EC4899" />
                                    <Text style={styles.statText}>{post.likeCount}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'posts': return renderPosts();
            case 'replies': return renderReplies();
            case 'notifications': return renderNotifications();
            case 'listings': return renderListings();
            case 'events': return renderEvents();
            case 'likes': return renderLikes();
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.headerTitle}>{t('common.tabProfile')}</Text>
                {isLoggedIn && (
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinizden emin misiniz?', [
                                { text: 'İptal', style: 'cancel' },
                                { text: 'Çıkış Yap', style: 'destructive', onPress: () => logout() },
                            ]);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ marginTop: 4 }}
                    >
                        <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>

            {!isLoggedIn ? (
                <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center' }]}>
                    <IconSymbol name="person.crop.circle.badge.exclamationmark" size={64} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Giriş Yapılmadı</Text>
                    <Text style={styles.emptySubtitle}>Profilini görmek ve paylaşımlarını yönetmek için giriş yapmalısın.</Text>
                    <TouchableOpacity 
                        style={styles.loginButton}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={styles.loginButtonText}>Giriş Yap</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    overScrollMode="never"
                >
                    {/* Profile Info */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || '?'}</Text>
                        </View>
                        <Text style={styles.userName}>{user?.fullName || 'İsimsiz Kullanıcı'}</Text>
                        <Text style={styles.userBio}>{user?.email || ''}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.userType === 'ADMIN' ? 'Yönetici' : (user?.userType === 'ISLAND_RESIDENT' ? 'Adalı' : 'Ziyaretçi')}</Text>
                        </View>
                    </View>

                {/* Tab Bar */}
                <View style={styles.tabBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                        {TABS.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <TouchableOpacity 
                                    key={tab.key} 
                                    style={[styles.tabItem, isActive && { backgroundColor: tab.color }]}
                                    onPress={() => setActiveTab(tab.key)}
                                    activeOpacity={0.7}
                                >
                                    <IconSymbol name={tab.icon as any} size={16} color={isActive ? '#fff' : tab.color} />
                                    <Text style={[styles.tabLabel, isActive && { color: '#fff' }]}>{tab.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Tab Content */}
                {renderContent()}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
    scrollContent: { paddingBottom: 100 },
    profileCard: { backgroundColor: '#fff', padding: 24, alignItems: 'center', paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#F1F5F9', marginBottom: 14 },
    userName: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
    userBio: { fontSize: 14, color: '#64748B', marginBottom: 8 },
    avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 3, borderColor: '#F1F5F9' },
    avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
    roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleText: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    loginButton: { marginTop: 24, backgroundColor: '#0F172A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
    loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Tab Bar
    tabBar: { paddingVertical: 16 },
    tabScroll: { paddingHorizontal: 20, gap: 10 },
    tabItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    tabLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },

    // Content
    loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 120 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 20 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12, textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: '#CBD5E1', marginTop: 4, textAlign: 'center' },
    contentList: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },

    // Post Cards
    postCard: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    postContent: { fontSize: 15, color: '#1E293B', lineHeight: 22, marginBottom: 12 },
    postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    postTime: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
    replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    replyContext: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, fontWeight: '600', color: '#64748B' },

    // Listing Cards
    listingCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    listingInfo: { flex: 1 },
    listingTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    listingDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 6 },
    listingTime: { fontSize: 12, color: '#94A3B8' },
    priceTag: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginLeft: 12 },
    priceText: { fontSize: 14, fontWeight: '800', color: '#10B981' },
    
    // Notifications
    notifCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'flex-start',
        gap: 12,
    },
    notifCardUnread: {
        backgroundColor: '#FAFAFA',
    },
    notifIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF1F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBody: {
        flex: 1,
    },
    notifTitle: {
        fontSize: 14,
        color: '#1E293B',
        marginBottom: 4,
    },
    notifAuthor: {
        fontWeight: '700',
        color: '#0F172A',
    },
    notifContent: {
        fontSize: 13,
        color: '#64748B',
        fontStyle: 'italic',
        marginBottom: 6,
    },
    notifDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F43F5E',
        marginTop: 6,
    },
    switchRoleBtn: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    switchRoleText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1',
    },
});
