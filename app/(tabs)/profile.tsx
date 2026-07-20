import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Share, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { fetchUserPosts, fetchUserReplies, fetchUserLikes, PostDto, deletePost, updatePost, UpdatePostRequest } from '@/services/forumApi';
import { fetchMyListings, ListingDto, deleteListing } from '@/services/listingApi';
import { fetchMyActivities, AppActivityDto, deleteActivity } from '@/services/api';
import { fetchNotifications, markNotificationRead, NotificationDto, NotificationType } from '@/services/notificationApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL, fetchWithTimeout } from '@/services/config';
import { getToken } from '@/utils/tokenStorage';
import { authApi } from '@/services/authApi';
import { unregisterPushNotifications } from '@/services/notificationService';
import { CelebrationModal } from '@/components/CelebrationModal';
import { SwipeNavigation } from '@/components/SwipeNavigation';


type ProfileTab = 'posts' | 'listings' | 'events' | 'likes' | 'notifications';

const TABS: { key: ProfileTab; label: string; icon: string; color: string }[] = [
    { key: 'posts', label: 'Paylaşımlar', icon: 'bubble.left.and.bubble.right.fill', color: '#6366F1' },
    { key: 'likes', label: 'Beğeniler', icon: 'heart.fill', color: '#EC4899' },
    { key: 'notifications', label: 'Bildirimler', icon: 'bell.fill', color: '#F43F5E' },
    { key: 'listings', label: 'İlanlar', icon: 'tag.fill', color: '#10B981' },
    { key: 'events', label: 'Etkinlikler', icon: 'calendar', color: '#F59E0B' },
];

export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
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
    const [fetchError, setFetchError] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const [inviteEmailError, setInviteEmailError] = useState('');
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Check for 5 invites milestone
    useEffect(() => {
        if (isLoggedIn && user && (user as any)?.invitedUsersCount === 5) {
            // Ideally we'd check if we already showed it (e.g. from AsyncStorage), 
            // but for now, we trigger it once when the count is exactly 5.
            setShowCelebration(true);
        }
    }, [isLoggedIn, (user as any)?.invitedUsersCount]);

    const loadAll = useCallback(() => {
        if (!user) return;

        setFetchError(false);
        setLoadingPosts(true);
        setLoadingReplies(true);
        setLoadingLikes(true);
        setLoadingNotifications(true);
        setLoadingListings(true);
        setLoadingActivities(true);

        fetchNotifications()
            .then(data => setNotifications(data))
            .catch(() => { setNotifications([]); setFetchError(true); })
            .finally(() => setLoadingNotifications(false));

        fetchUserPosts(user.id)
            .then(data => setPosts(data))
            .catch(() => { setPosts([]); setFetchError(true); })
            .finally(() => setLoadingPosts(false));

        fetchUserReplies(user.id)
            .then(data => setReplies(data))
            .catch(() => { setReplies([]); setFetchError(true); })
            .finally(() => setLoadingReplies(false));

        fetchUserLikes(user.id)
            .then(data => setLikedPosts(data))
            .catch(() => { setLikedPosts([]); setFetchError(true); })
            .finally(() => setLoadingLikes(false));

        fetchMyListings()
            .then(data => setListings(data))
            .catch(() => { setListings([]); setFetchError(true); })
            .finally(() => setLoadingListings(false));

        fetchMyActivities()
            .then(data => setActivities(data))
            .catch(() => { setActivities([]); setFetchError(true); })
            .finally(() => setLoadingActivities(false));
    }, [user?.id]);

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleSendInvite = async () => {
        const email = inviteEmail.trim();
        if (!EMAIL_REGEX.test(email)) {
            setInviteEmailError(t('profile.inviteEmailError'));
            return;
        }
        setInviteEmailError('');
        setInviteLoading(true);
        try {
            const token = getToken();
            const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/invites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || t('profile.inviteSendFailed'));
            }
            Alert.alert(t('common.success'), t('profile.inviteSendSuccess'));
            setShowInviteModal(false);
            setInviteEmail('');
        } catch (e: any) {
            Alert.alert(t('common.error'), e.message || t('profile.inviteSendFailed'));
        } finally {
            setInviteLoading(false);
        }
    };

    const handleDeletePost = (id: string, isReply: boolean = false) => {
        Alert.alert(
            t('common.delete'),
            t('common.deleteConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { 
                    text: t('common.delete'), 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePost(id);
                            if (isReply) {
                                setReplies(replies.filter(r => r.id !== id));
                            } else {
                                setPosts(posts.filter(p => p.id !== id));
                            }
                        } catch (error) {
                            Alert.alert(t('common.error'), t('common.deleteFailed'));
                        }
                    }
                }
            ]
        );
    };

    const handleSaveEdit = async (id: string, isReply: boolean = false) => {
        if (!editingContent.trim() || isSavingEdit) return;
        setIsSavingEdit(true);
        try {
            const request: UpdatePostRequest = { content: editingContent.trim() };
            const updated = await updatePost(id, request);
            if (isReply) {
                setReplies(replies.map(r => r.id === id ? updated : r));
            } else {
                setPosts(posts.map(p => p.id === id ? updated : p));
            }
            setEditingPostId(null);
            setEditingContent('');
        } catch (error: any) {
            Alert.alert(t('common.error', { defaultValue: 'Hata' }), error?.message || 'Güncellenirken bir hata oluştu.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteListing = (id: string) => {
        Alert.alert(
            t('common.delete'),
            t('common.deleteConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { 
                    text: t('common.delete'), 
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteListing(id);
                        if (success) setListings(prev => prev.filter(l => l.id !== id));
                    }
                }
            ]
        );
    };

    const handleDeleteEvent = (id: string) => {
        Alert.alert(
            t('common.delete'),
            t('common.deleteConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { 
                    text: t('common.delete'), 
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteActivity(id);
                        if (success) loadAll();
                    }
                }
            ]
        );
    };

    useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

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
            style={{ marginTop: 40 }}
        />
    );

    const renderPostActions = (post: any, isReply: boolean) => {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                <TouchableOpacity onPress={() => { setEditingPostId(post.id); setEditingContent(post.content); }} style={{ backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="pencil" size={22} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.edit', { defaultValue: 'Düzenle' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeletePost(post.id, isReply)} style={{ backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="trash.fill" size={22} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderPosts = () => {
        if (loadingPosts) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366F1" /></View>;
        if (posts.length === 0) return renderEmpty('bubble.left.and.bubble.right.fill', t('profile.emptyPostsTitle', { defaultValue: 'Henüz Paylaşım Yok' }), t('profile.emptyPostsDesc', { defaultValue: 'Toplulukla fikirlerini paylaşmaya başla!' }), '#6366F1');
        return (
            <View style={styles.contentList}>
                {posts.map(post => (
                    <Swipeable key={post.id} renderRightActions={() => renderPostActions(post, false)} overshootRight={false}>
                    <View style={[styles.postCard, { backgroundColor: '#fff' }]}>
                        {editingPostId === post.id ? (
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={styles.editInput}
                                    value={editingContent}
                                    onChangeText={setEditingContent}
                                    multiline
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                    <TouchableOpacity onPress={() => setEditingPostId(null)} style={{ marginRight: 16, padding: 4 }}>
                                        <Text style={{ color: '#64748B' }}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleSaveEdit(post.id, false)} disabled={isSavingEdit} style={{ padding: 4, opacity: isSavingEdit ? 0.4 : 1 }}>
                                        {isSavingEdit ? <ActivityIndicator size="small" color="#10B981" /> : <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{t('common.saveAction')}</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={[styles.postContent, { marginBottom: 12 }]}>{post.content}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                    </Swipeable>
                ))}
            </View>
        );
    };

    const renderReplies = () => {
        if (loadingReplies) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#8B5CF6" /></View>;
        if (replies.length === 0) return renderEmpty('arrow.uturn.left.circle.fill', t('profile.emptyRepliesTitle', { defaultValue: 'Henüz Yanıt Yok' }), t('profile.emptyRepliesDesc', { defaultValue: 'Paylaşımlara yorum yaparak etkileşime geç!' }), '#8B5CF6');
        return (
            <View style={styles.contentList}>
                {replies.map(reply => (
                    <Swipeable key={reply.id} renderRightActions={() => renderPostActions(reply, true)} overshootRight={false}>
                    <View style={[styles.postCard, { backgroundColor: '#fff' }]}>
                        <View style={styles.replyHeader}>
                            <IconSymbol name="arrow.uturn.left" size={12} color="#64748B" />
                            <Text style={styles.replyContext}>Gönderiye yanıt olarak:</Text>
                        </View>
                        {editingPostId === reply.id ? (
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={styles.editInput}
                                    value={editingContent}
                                    onChangeText={setEditingContent}
                                    multiline
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                    <TouchableOpacity onPress={() => setEditingPostId(null)} style={{ marginRight: 16, padding: 4 }}>
                                        <Text style={{ color: '#64748B' }}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleSaveEdit(reply.id, true)} disabled={isSavingEdit} style={{ padding: 4, opacity: isSavingEdit ? 0.4 : 1 }}>
                                        {isSavingEdit ? <ActivityIndicator size="small" color="#10B981" /> : <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{t('common.saveAction')}</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={[styles.postContent, { marginBottom: 12 }]}>{reply.content}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.postTime}>{timeAgo(reply.createdAt)}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                    </Swipeable>
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
        if (notifications.length === 0) return renderEmpty('bell.fill', t('profile.emptyNotificationsTitle', { defaultValue: 'Bildirim Yok' }), t('profile.emptyNotificationsDesc', { defaultValue: 'Etkinlik onayları ve gönderi yanıtları burada görünecek.' }), '#EF4444');
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

    const renderListingActions = (listing: any) => {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                <TouchableOpacity onPress={() => router.push(`/(tabs)/explore/island/ilanlar?editListingId=${listing.id}`)} style={{ backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="pencil" size={22} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.edit', { defaultValue: 'Düzenle' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteListing(listing.id)} style={{ backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="trash.fill" size={22} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderListings = () => {
        if (loadingListings) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
        if (listings.length === 0) return renderEmpty('tag.fill', t('profile.emptyListingsTitle', { defaultValue: 'Henüz İlan Yok' }), t('profile.emptyListingsDesc', { defaultValue: 'İlk ilanınızı oluşturmak için İlanlar sayfasını ziyaret edin.' }), '#10B981');
        return (
            <View style={styles.contentList}>
                {listings.map(listing => (
                    <Swipeable key={listing.id} renderRightActions={() => renderListingActions(listing)} overshootRight={false}>
                    <TouchableOpacity 
                        style={[styles.listingCard, { backgroundColor: '#fff' }]}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/(tabs)/explore/island/ilan/${listing.id}`)}
                    >
                        <View style={styles.listingInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text style={[styles.listingTitle, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>{listing.title}</Text>
                            </View>
                            <Text style={styles.listingDesc} numberOfLines={2}>{listing.description}</Text>
                            <Text style={styles.listingTime}>{timeAgo(listing.createdAt)}</Text>
                        </View>
                    </TouchableOpacity>
                    </Swipeable>
                ))}
            </View>
        );
    };

    const renderEventActions = (activity: any) => {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                <TouchableOpacity onPress={() => router.push(`/(tabs)/explore/island/events?editActivityId=${activity.id}`)} style={{ backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="pencil" size={22} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.edit', { defaultValue: 'Düzenle' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteEvent(activity.id)} style={{ backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="trash.fill" size={22} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderEvents = () => {
        if (loadingActivities) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#F59E0B" /></View>;
        if (activities.length === 0) return renderEmpty('calendar', t('profile.emptyActivitiesTitle', { defaultValue: 'Henüz Etkinlik Yok' }), t('profile.emptyActivitiesDesc', { defaultValue: 'Oluşturduğunuz etkinlikler burada görünecek.' }), '#F59E0B');
        return (
            <View style={styles.contentList}>
                {activities.map(activity => {
                    return (
                        <Swipeable key={activity.id} renderRightActions={() => renderEventActions(activity)} overshootRight={false}>
                        <View style={[styles.postCard, { backgroundColor: '#fff' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[styles.listingTitle, { marginBottom: 4 }]} numberOfLines={1}>{activity.name}</Text>
                                    {activity.eventPlace ? <Text style={styles.listingDesc} numberOfLines={1}>{activity.eventPlace}</Text> : null}
                                    <Text style={[styles.postTime, { marginTop: 2 }]}>{timeAgo(activity.startDate)}</Text>
                                </View>
                            </View>
                        </View>
                        </Swipeable>
                    );
                })}
            </View>
        );
    };

    const renderLikes = () => {
        if (loadingLikes) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#EC4899" /></View>;
        if (likedPosts.length === 0) return renderEmpty('heart.fill', t('profile.emptyLikesTitle', { defaultValue: 'Henüz Beğeni Yok' }), t('profile.emptyLikesDesc', { defaultValue: 'Beğendiğiniz paylaşımlar burada görünecek.' }), '#EC4899');
        return (
            <View style={styles.contentList}>
                {likedPosts.map(post => (
                    <View 
                        key={post.id} 
                        style={styles.postCard}
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
                    </View>
                ))}
            </View>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'posts': return renderPosts();
            case 'notifications': return renderNotifications();
            case 'listings': return renderListings();
            case 'events': return renderEvents();
            case 'likes': return renderLikes();
        }
    };

    return (
        <SwipeNavigation leftRoute="/(tabs)/contact">
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>{t('common.tabProfile', { defaultValue: 'Profil' })}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    {!isLoggedIn ? (
                        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4 }}>
                            <TouchableOpacity
                                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: i18n.language.startsWith('tr') ? '#FFFFFF' : 'transparent', shadowColor: i18n.language.startsWith('tr') ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 }}
                                onPress={() => i18n.changeLanguage('tr')}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: i18n.language.startsWith('tr') ? '#0F172A' : '#64748B' }}>TR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: i18n.language.startsWith('en') ? '#FFFFFF' : 'transparent', shadowColor: i18n.language.startsWith('en') ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 }}
                                onPress={() => i18n.changeLanguage('en')}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: i18n.language.startsWith('en') ? '#0F172A' : '#64748B' }}>EN</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            onPress={() => router.push('/settings')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <IconSymbol name="gearshape.fill" size={24} color="#64748B" />
                        </TouchableOpacity>
                    )}

                    {isLoggedIn && (
                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert(
                                    t('profile.logoutTitle'),
                                    t('profile.logoutConfirm'),
                                    [
                                        { text: t('common.cancel'), style: 'cancel' },
                                        { text: t('profile.logoutBtn'), style: 'destructive', onPress: () => logout() },
                                    ]
                                );
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {!isLoggedIn ? (
                <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center' }]}>
                    <IconSymbol name="person.crop.circle.badge.exclamationmark" size={64} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>
                        {t('profile.notLoggedInTitle')}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        {t('profile.notLoggedInDesc')}
                    </Text>
                    <TouchableOpacity 
                        style={styles.loginButton}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={styles.loginButtonText}>
                            {t('common.login')}
                        </Text>
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
                        {user?.email && (
                            <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2, marginBottom: 12 }}>{user.email}</Text>
                        )}
                        <View style={[styles.roleBadge, 
                            user?.userType === 'ISLAND_RESIDENT' ? { backgroundColor: '#FEF9C3', borderWidth: 1.5, borderColor: '#F59E0B', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 12 } : 
                            user?.userType === 'ADMIN' ? { backgroundColor: '#BFDBFE' } : 
                            { backgroundColor: '#E2E8F0' }
                        ]}>
                            <Text style={[styles.roleText, 
                                user?.userType === 'ISLAND_RESIDENT' ? { color: '#B45309', fontWeight: '800', letterSpacing: 0.5 } : 
                                user?.userType === 'ADMIN' ? { color: '#1E40AF' } : 
                                { color: '#475569' }
                            ]}>
                                {user?.userType === 'ADMIN' ? 'Admin' : (user?.userType === 'ISLAND_RESIDENT' ? t('forum.role.islander', { defaultValue: 'Islander' }) : t('forum.role.visitor', { defaultValue: 'Visitor' }))}
                            </Text>
                        </View>

                        {/* Sadece Adalı ve Adminlerde Görünen Davet Sayısı Barı (ÖNİZLEME İÇİN HERKESE AÇIK) */}
                        {true && (
                            <View style={{ marginTop: 20, width: '100%' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <IconSymbol name="person.2.fill" size={16} color="#6366F1" />
                                        <Text style={{ fontSize: 13, color: '#475569', marginLeft: 6, fontWeight: '600' }}>
                                            Davet Ettiğin Adalılar
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#6366F1' }}>
                                        {(user as any)?.invitedUsersCount || 0}
                                    </Text>
                                </View>
                                <View style={{ width: '100%', height: 10, backgroundColor: '#E0E7FF', borderRadius: 5, overflow: 'hidden' }}>
                                    <View style={{ 
                                        width: `${Math.min((((user as any)?.invitedUsersCount || 0) / 5) * 100, 100)}%`, 
                                        height: '100%', 
                                        backgroundColor: '#6366F1', 
                                        borderRadius: 5 
                                    }} />
                                </View>
                                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, textAlign: 'right' }}>
                                    Hedef: 5
                                </Text>
                                {/* MOCK CELEBRATION TRIGGER BUTTON */}
                                <TouchableOpacity 
                                    onPress={() => setShowCelebration(true)}
                                    style={{ marginTop: 10, alignSelf: 'flex-end', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                    <Text style={{ fontSize: 12, color: '#D97706', fontWeight: 'bold' }}>Kutlamayı Test Et 🚀</Text>
                                </TouchableOpacity>
                            </View>
                        )}


                    </View>

                {fetchError && (
                    <TouchableOpacity
                        style={styles.errorBanner}
                        onPress={loadAll}
                        activeOpacity={0.8}
                    >
                        <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#92400E" />
                        <Text style={styles.errorBannerText}>Veriler yüklenirken hata oluştu. Tekrar denemek için dokun.</Text>
                    </TouchableOpacity>
                )}

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
                                    <Text style={[styles.tabLabel, isActive && { color: '#fff' }]}>
                                        {t(`profile.tabs.${tab.key}`)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Tab Content */}
                {renderContent()}
                </ScrollView>
            )}

            <CelebrationModal 
                visible={showCelebration} 
                onClose={() => setShowCelebration(false)} 
            />

            {/* Invite Modal */}
            <Modal
                visible={showInviteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => { setShowInviteModal(false); setInviteEmailError(''); setInviteEmail(''); }}
            >
                <KeyboardAvoidingView 
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('profile.inviteFriend')}</Text>
                            <TouchableOpacity onPress={() => { setShowInviteModal(false); setInviteEmailError(''); setInviteEmail(''); }}>
                                <IconSymbol name="xmark.circle.fill" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.modalDescription}>{t('profile.inviteDesc')}</Text>
                            <TextInput
                                style={[styles.inviteInput, inviteEmailError ? { borderColor: '#EF4444' } : {}]}
                                placeholder={t('profile.inviteEmailPlaceholder')}
                                value={inviteEmail}
                                onChangeText={(v) => { setInviteEmail(v); setInviteEmailError(''); }}
                                onBlur={() => { if (inviteEmail.trim() && !EMAIL_REGEX.test(inviteEmail.trim())) setInviteEmailError(t('profile.inviteEmailError')); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {inviteEmailError ? (
                                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{inviteEmailError}</Text>
                            ) : null}
                            <TouchableOpacity
                                style={[styles.inviteSendButton, (!inviteEmail.trim() || !EMAIL_REGEX.test(inviteEmail.trim()) || inviteLoading) && { opacity: 0.5 }]}
                                onPress={handleSendInvite}
                                disabled={!inviteEmail.trim() || !EMAIL_REGEX.test(inviteEmail.trim()) || inviteLoading}
                            >
                                {inviteLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.inviteSendButtonText}>{t('profile.inviteSend')}</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
        </SwipeNavigation>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    scrollContent: { paddingBottom: 100 },
    profileCard: { backgroundColor: '#fff', padding: 24, alignItems: 'center', paddingBottom: 28, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#F1F5F9', marginBottom: 14 },
    userName: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
    userBio: { fontSize: 14, color: '#64748B', marginBottom: 8 },
    avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 3, borderColor: '#F1F5F9' },
    avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
    roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    roleText: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    loginButton: { marginTop: 24, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Tab Bar
    tabBar: { paddingVertical: 16 },
    tabScroll: { paddingHorizontal: 20, gap: 8, paddingVertical: 6 },
    tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    tabLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },

    // Content
    loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 120 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 20 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12, textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: '#CBD5E1', marginTop: 4, textAlign: 'center' },
    contentList: { backgroundColor: '#fff' },

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
        borderRadius: 12,
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
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    switchRoleText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginHorizontal: 16,
        marginBottom: 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#92400E',
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineActionBtn: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        gap: 6,
        minWidth: 70,
    },
    inlineActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    inviteButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1',
    },
    editInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#1E293B',
        minHeight: 60,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    modalBody: {
        padding: 20,
    },
    modalDescription: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 16,
    },
    inviteInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
    },
    inviteSendButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    inviteSendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
