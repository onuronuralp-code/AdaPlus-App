import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Share, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { s, vs, ms } from '@/utils/scale';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { fetchUserPosts, fetchUserReplies, fetchUserLikes, PostDto, deletePost, updatePost, UpdatePostRequest, voteOnPoll, PostType, UserType, Island } from '@/services/forumApi';
import { fetchMyListings, ListingDto, deleteListing } from '@/services/listingApi';
import { fetchMyActivities, AppActivityDto, deleteActivity } from '@/services/api';
import { fetchNotifications, markNotificationRead, NotificationDto, NotificationType } from '@/services/notificationApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { API_BASE_URL, fetchWithTimeout, resolveImageUrl } from '@/services/config';
import { getToken } from '@/utils/tokenStorage';
import { authApi } from '@/services/authApi';
import { unregisterPushNotifications } from '@/services/notificationService';
import { CelebrationModal } from '@/components/CelebrationModal';
import { SwipeNavigation } from '@/components/SwipeNavigation';

type ProfileTab = 'posts' | 'listings' | 'events' | 'likes' | 'notifications';

const TABS: { key: ProfileTab; label: string; icon: string; color: string }[] = [
    { key: 'posts', label: 'Paylaşımlar', icon: 'bubble.left.and.bubble.right.fill', color: '#6366F1' },
    { key: 'events', label: 'Etkinlikler', icon: 'calendar', color: '#3B82F6' },
    { key: 'listings', label: 'İlanlar', icon: 'tag.fill', color: '#F59E0B' },
    { key: 'likes', label: 'Beğeniler', icon: 'heart.fill', color: '#EC4899' },
    { key: 'notifications', label: 'Bildirimler', icon: 'bell.fill', color: '#F43F5E' },
];

export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { logout, user, isLoggedIn } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [posts, setPosts] = useState<PostDto[]>([]);
    const [replies, setReplies] = useState<PostDto[]>([]);
    const [likedPosts, setLikedPosts] = useState<PostDto[]>([]);
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [listings, setListings] = useState<ListingDto[]>([]);
    const [activities, setActivities] = useState<AppActivityDto[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(true);
    const [loadingLikes, setLoadingLikes] = useState(true);
    const [loadingNotifications, setLoadingNotifications] = useState(true);
    const [loadingListings, setLoadingListings] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showQuotaModal, setShowQuotaModal] = useState(false);
    const [showInviteQuotaModal, setShowInviteQuotaModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteEmailError, setInviteEmailError] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [editingPost, setEditingPost] = useState<PostDto | null>(null);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isBadgesExpanded, setIsBadgesExpanded] = useState(true);

    // Check for 3 invites milestone
    useEffect(() => {
        if (isLoggedIn && user && (user as any)?.invitedUsersCount === 3) {
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
            .then(data => setPosts(data || []))
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
            .then(data => setActivities(Array.isArray(data) ? data.filter(activity => activity?.id) : []))
            .catch(() => { setActivities([]); setFetchError(true); })
            .finally(() => setLoadingActivities(false));
    }, [user?.id]);

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleOpenInviteModal = () => {
        const invitedCount = (user as any)?.invitedUsersCount || 0;
        if (invitedCount >= 5) {
            Alert.alert(
                i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu',
                i18n.language.startsWith('en')
                    ? 'You can invite a maximum of 5 islanders. Your invitation quota (5/5) has been reached.'
                    : 'En fazla 5 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (5/5) dolmuştur.'
            );
            return;
        }
        setShowInviteModal(true);
    };

    const handleSendInvite = async () => {
        const invitedCount = (user as any)?.invitedUsersCount || 0;
        if (invitedCount >= 5) {
            Alert.alert(
                i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu',
                i18n.language.startsWith('en')
                    ? 'You can invite a maximum of 5 islanders. Your invitation quota (5/5) has been reached.'
                    : 'En fazla 5 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (5/5) dolmuştur.'
            );
            return;
        }

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
                if (response.status === 400 || response.status === 403 || response.status === 409 || response.status === 429 || (err.message && err.message.toLowerCase().includes('quota'))) {
                    Alert.alert(
                        i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu',
                        i18n.language.startsWith('en')
                            ? 'You can invite a maximum of 3 islanders. Your invitation quota (3/3) has been reached.'
                            : 'En fazla 3 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (3/3) dolmuştur.'
                    );
                    return;
                }
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

    const isPollEnded = (post: any) => {
        if (!post) return false;
        if (typeof post === 'string') {
            return new Date(post).getTime() < Date.now();
        }
        const endsAt = post.pollEndsAt || post.poll_ends_at || post.expiresAt;
        if (post.isEnded || post.ended) return true;
        if (!endsAt) return false;
        return new Date(endsAt).getTime() < Date.now();
    };

    const getPollCountdown = (post: any) => {
        if (!post) return null;
        const endsAt = typeof post === 'string' ? post : (post.pollEndsAt || post.poll_ends_at || post.expiresAt);
        if (typeof post === 'object' && (post.isEnded || post.ended)) return i18n.language.startsWith('en') ? 'Poll ended' : 'Süre doldu';
        if (!endsAt) return null;
        const diff = new Date(endsAt).getTime() - Date.now();
        if (diff <= 0) return i18n.language.startsWith('en') ? 'Poll ended' : 'Süre doldu';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return i18n.language.startsWith('en') ? `${days}d left` : `${days} gün kaldı`;
        }
        return i18n.language.startsWith('en') ? `${hours}h ${mins}m left` : `${hours}sa ${mins}dk kaldı`;
    };

    const renderEmpty = (icon: string, title: string, subtitle: string, color?: string) => (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
            <EmptyState 
                icon={icon} 
                title={title} 
                subtitle={subtitle}
                color={color}
                compact={true}
                style={{ marginTop: 0 }}
            />
        </View>
    );

    const renderPostActions = (post: any, isReply: boolean) => (progress: any, dragX: any, swipeable?: any) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        });
        return (
            <Animated.View style={{ flexDirection: 'row', alignItems: 'stretch', width: 80, transform: [{ translateX: trans }] }}>
                <GHTouchableOpacity onPress={() => { swipeable?.close(); handleDeletePost(post.id, isReply); }} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="trash.fill" size={24} color="#FFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                </GHTouchableOpacity>
            </Animated.View>
        );
    };

    const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});

    useEffect(() => {
        AsyncStorage.getItem('user_voted_polls').then(val => {
            if (val) {
                try { setVotedPolls(JSON.parse(val)); } catch {}
            }
        });
    }, []);

    const handlePollVote = async (post: any, optionId: string) => {
        if (isPollEnded(post)) {
            Alert.alert(
                t('common.info', { defaultValue: 'Bilgi' }),
                t('forum.pollEndedWarning', { defaultValue: 'Bu anketin süresi dolduğu için oy kullanamazsınız.' })
            );
            return;
        }
        const postId = typeof post === 'string' ? post : post.id;
        const currentVotedOptionId = votedPolls[postId];

        const updatePostPoll = (p: PostDto) => {
            if (p.id !== postId) return p;
            const pollOpts = p.pollOptions || (p as any).options || (p as any).poll_options || [];
            const updatedOpts = pollOpts.map((opt: any) => {
                let count = opt.voteCount || opt.votes || 0;
                if (currentVotedOptionId && opt.id === currentVotedOptionId) {
                    count = Math.max(0, count - 1);
                }
                if (opt.id === optionId) {
                    count = count + 1;
                }
                return {
                    ...opt,
                    voteCount: count,
                    votes: count,
                    isVoted: opt.id === optionId,
                    voted: opt.id === optionId,
                };
            });
            return {
                ...p,
                userVotedOptionId: optionId,
                pollOptions: updatedOpts,
                options: updatedOpts,
            };
        };

        setVotedPolls(prev => {
            const next = { ...prev, [postId]: optionId };
            AsyncStorage.setItem('user_voted_polls', JSON.stringify(next)).catch(() => {});
            return next;
        });

        setPosts(prev => prev.map(updatePostPoll));
        setLikedPosts(prev => prev.map(updatePostPoll));

        try {
            const updated = await voteOnPoll(postId, optionId);
            if (updated) {
                const finalPost = updatePostPoll(updated);
                setPosts(prev => prev.map(p => p.id === postId ? finalPost : p));
                setLikedPosts(prev => prev.map(p => p.id === postId ? finalPost : p));
            }
        } catch {}
    };

    const renderPollAndImage = (post: PostDto) => {
        const isPoll = (post.postType as any) === 'POLL' || String(post.postType)?.toUpperCase() === 'POLL';
        const pollOpts = post.pollOptions || (post as any).options || (post as any).poll_options;

        return (
            <>
                {post.imageUrl ? (
                    <Image 
                        source={{ uri: resolveImageUrl(post.imageUrl) }} 
                        style={{ width: '100%', height: 180, borderRadius: 12, marginTop: 8, marginBottom: 8 }}
                        resizeMode="cover" 
                    />
                ) : null}
                {isPoll && pollOpts && pollOpts.length > 0 ? (
                    <View style={{ marginTop: 8, marginBottom: 4 }}>
                        {(() => {
                            const ended = isPollEnded(post);
                            const countdown = getPollCountdown(post);
                            const totalVotes = pollOpts.reduce((sum: number, opt: any) => sum + (opt.voteCount || opt.votes || 0), 0);
                            return (
                                <View>
                                    {pollOpts.map((option: any, optIdx: number) => {
                                        const optVotes = Number(option.voteCount || option.votes || option.count || 0);
                                        const userVotedId = votedPolls[post.id] || (post as any).votedOptionId || (post as any).voted_option_id || (post as any).userVotedOptionId;
                                        const isOptionVoted = Boolean(
                                            optVotes > 0 &&
                                            (userVotedId 
                                                ? (option.id && String(option.id) === String(userVotedId))
                                                : (option.isVoted || option.voted || option.is_voted || option.selected))
                                        );
                                        const optText = option.text || option.optionText || option.title || '';
                                        const optPercent = option.percentage !== undefined ? option.percentage : (totalVotes > 0 ? ((optVotes / totalVotes) * 100) : 0);
                                        return (
                                            <TouchableOpacity
                                                key={option.id || `opt-${optIdx}`}
                                                style={[
                                                    {
                                                        padding: 12,
                                                        borderRadius: 10,
                                                        marginVertical: 4,
                                                        backgroundColor: isDark ? '#121212' : '#F8FAFC',
                                                        borderWidth: 1.5,
                                                        borderColor: isDark ? '#2C2C2E' : '#E2E8F0',
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        overflow: 'hidden',
                                                        position: 'relative'
                                                    },
                                                    ended && { opacity: 0.5 },
                                                    isOptionVoted && (isDark ? { backgroundColor: '#064E3B', borderColor: '#10B981' } : { backgroundColor: '#D1FAE5', borderColor: '#10B981' })
                                                ]}
                                                onPress={() => handlePollVote(post, option.id)}
                                                activeOpacity={ended ? 1 : 0.7}
                                                disabled={ended}
                                            >
                                                <View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0 }, Math.round(optPercent) >= 100 ? { right: 0 } : { width: `${optPercent}%` }, { backgroundColor: isOptionVoted ? 'rgba(16, 185, 129, 0.45)' : 'rgba(99, 102, 241, 0.15)' }]} />
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1 }}>
                                                    {isOptionVoted && <IconSymbol name="checkmark.circle.fill" size={16} color={isDark ? "#34D399" : "#059669"} />}
                                                    <Text style={[{ fontSize: 14, fontWeight: '600', color: isDark ? '#F8FAFC' : '#1E293B' }, isOptionVoted && { color: isDark ? '#34D399' : '#047857', fontWeight: '800' }]}>{optText}</Text>
                                                </View>
                                                <Text style={[{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#64748B', zIndex: 1 }, isOptionVoted && { color: isDark ? '#34D399' : '#047857', fontWeight: '800' }]}>{Math.round(optPercent)}%</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {countdown ? (
                                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ended ? (isDark ? '#451A1A' : '#FEE2E2') : (isDark ? '#453010' : '#FEF3C7'), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                <IconSymbol name={ended ? "checkmark.circle.fill" : "clock.fill"} size={11} color={ended ? "#EF4444" : "#F59E0B"} />
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: ended ? "#EF4444" : "#D97706" }}>{countdown}</Text>
                                            </View>
                                        </View>
                                    ) : null}
                                </View>
                            );
                        })()}
                    </View>
                ) : null}
            </>
        );
    };

    const renderPosts = () => {
        if (loadingPosts) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366F1" /></View>;
        if (posts.length === 0) return renderEmpty('bubble.left.and.bubble.right.fill', t('profile.emptyPostsTitle', { defaultValue: 'Paylaşım Yok' }), t('profile.emptyPostsDesc', { defaultValue: 'Toplulukla fikirlerini paylaşmaya başla!' }), '#6366F1');
        return (
            <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {posts.map(post => {
                    const isPoll = (post.postType as any) === 'POLL' || String(post.postType)?.toUpperCase() === 'POLL';
                    const pollOpts = post.pollOptions || (post as any).options || (post as any).poll_options;
                    const totalVotes = isPoll && pollOpts ? pollOpts.reduce((sum: number, opt: any) => sum + (opt.voteCount || opt.votes || 0), 0) : 0;

                    return (
                        <Swipeable key={post.id} renderRightActions={renderPostActions(post, false)} overshootRight={false}>
                        <View style={[styles.postCard, { backgroundColor: isDark ? '#000000' : '#fff', borderBottomColor: isDark ? '#1A1A1A' : '#F1F5F9' }]}>
                            {editingPostId === post.id ? (
                                <View style={{ flex: 1 }}>
                                    <TextInput
                                        style={[styles.editInput, isDark && { color: '#FFFFFF', backgroundColor: '#1A1A1A' }]}
                                        value={editingContent}
                                        onChangeText={setEditingContent}
                                        multiline
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                        <TouchableOpacity onPress={() => setEditingPostId(null)} style={{ marginRight: 16, padding: 4 }}>
                                            <Text style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{t('common.cancel')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleSaveEdit(post.id, false)} disabled={isSavingEdit} style={{ padding: 4, opacity: isSavingEdit ? 0.4 : 1 }}>
                                            {isSavingEdit ? <ActivityIndicator size="small" color="#10B981" /> : <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{t('common.saveAction')}</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    <Text style={[styles.postContent, { marginBottom: 4 }, isDark && { color: '#E2E8F0' }]}>{post.content}</Text>
                                    {renderPollAndImage(post)}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <IconSymbol name="clock" size={12} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                            <Text style={[styles.postTime, { color: isDark ? '#60A5FA' : '#3B82F6', marginLeft: 4, fontWeight: '600' }]}>{timeAgo(post.createdAt)}</Text>
                                        </View>
                                        {isPoll && pollOpts && pollOpts.length > 0 ? (
                                            <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
                                                {i18n.language.startsWith('en') 
                                                    ? `Total vote: ${totalVotes}` 
                                                    : `Toplam oy: ${totalVotes}`}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            )}
                        </View>
                        </Swipeable>
                    );
                })}
            </ScrollView>
        );
    };

    const renderReplies = () => {
        if (loadingReplies) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#8B5CF6" /></View>;
        if (replies.length === 0) return renderEmpty('arrow.uturn.left.circle.fill', t('profile.emptyRepliesTitle', { defaultValue: 'Yanıt Yok' }), t('profile.emptyRepliesDesc', { defaultValue: 'Paylaşımlara yorum yaparak etkileşime geç!' }), '#8B5CF6');
        return (
            <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {replies.map(reply => (
                    <Swipeable key={reply.id} renderRightActions={renderPostActions(reply, true)} overshootRight={false}>
                    <View style={[styles.postCard, { backgroundColor: isDark ? '#000000' : '#fff', borderBottomColor: isDark ? '#1A1A1A' : '#F1F5F9' }]}>
                        <View style={styles.replyHeader}>
                            <IconSymbol name="arrow.uturn.left" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                            <Text style={[styles.replyContext, isDark && { color: '#94A3B8' }]}>Gönderiye yanıt olarak:</Text>
                        </View>
                        {editingPostId === reply.id ? (
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={[styles.editInput, isDark && { color: '#FFFFFF', backgroundColor: '#1A1A1A' }]}
                                    value={editingContent}
                                    onChangeText={setEditingContent}
                                    multiline
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                    <TouchableOpacity onPress={() => setEditingPostId(null)} style={{ marginRight: 16, padding: 4 }}>
                                        <Text style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleSaveEdit(reply.id, true)} disabled={isSavingEdit} style={{ padding: 4, opacity: isSavingEdit ? 0.4 : 1 }}>
                                        {isSavingEdit ? <ActivityIndicator size="small" color="#10B981" /> : <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{t('common.saveAction')}</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={[styles.postContent, { marginBottom: 12 }, isDark && { color: '#E2E8F0' }]}>{reply.content}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <IconSymbol name="clock" size={12} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                    <Text style={[styles.postTime, { color: isDark ? '#60A5FA' : '#3B82F6', marginLeft: 4, fontWeight: '600' }]}>{timeAgo(reply.createdAt)}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                    </Swipeable>
                ))}
            </ScrollView>
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
            <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {notifications.map(notif => {
                    const { name, color, bg } = getNotifIcon(notif.type);
                    return (
                        <TouchableOpacity
                            key={notif.id}
                            style={[
                                styles.notifCard, 
                                !notif.read && (isDark ? { backgroundColor: '#121212' } : styles.notifCardUnread), 
                                isDark && { backgroundColor: notif.read ? '#000000' : '#121212', borderBottomColor: '#1A1A1A' }
                            ]}
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
                            <View style={[styles.notifIcon, { backgroundColor: isDark ? '#1A1A2E' : bg }]}>
                                <IconSymbol name={name as any} size={16} color={color} />
                            </View>
                            <View style={styles.notifBody}>
                                <Text style={[styles.notifTitle, isDark && { color: '#FFFFFF' }]}>{notif.title}</Text>
                                <Text style={[styles.notifContent, isDark && { color: '#94A3B8' }]} numberOfLines={2}>{notif.body}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <IconSymbol name="clock" size={12} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                    <Text style={[styles.postTime, { color: isDark ? '#60A5FA' : '#3B82F6', marginLeft: 4, fontWeight: '600' }]}>{timeAgo(notif.createdAt)}</Text>
                                </View>
                            </View>
                            {!notif.read && <View style={[styles.notifDot, { backgroundColor: color }]} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        );
    };

    const renderListingActions = (listing: any) => (progress: any, dragX: any, swipeable?: any) => {
        const trans = dragX.interpolate({
            inputRange: [-160, 0],
            outputRange: [0, 160],
            extrapolate: 'clamp',
        });
        return (
            <Animated.View style={{ flexDirection: 'row', alignItems: 'stretch', width: 160, transform: [{ translateX: trans }] }}>
                <GHTouchableOpacity onPress={() => { swipeable?.close(); router.push(`/(tabs)/explore/island/ilanlar?editListingId=${listing.id}`); }} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="pencil" size={24} color="#FFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.edit', { defaultValue: i18n.language.startsWith('en') ? 'Edit' : 'Düzenle' })}</Text>
                </GHTouchableOpacity>
                <GHTouchableOpacity onPress={() => { swipeable?.close(); handleDeleteListing(listing.id); }} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="trash.fill" size={24} color="#FFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                </GHTouchableOpacity>
            </Animated.View>
        );
    };

    const renderListings = () => {
        if (loadingListings) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#F59E0B" /></View>;
        if (listings.length === 0) return renderEmpty('tag.fill', t('profile.emptyListingsTitle', { defaultValue: 'İlan Yok' }), t('profile.emptyListingsDesc', { defaultValue: 'İlanınızı oluşturmak için İlanlar sayfasını ziyaret edin.' }), '#F59E0B');
        return (
            <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {listings.map(listing => (
                    <Swipeable key={listing.id} renderRightActions={renderListingActions(listing)} overshootRight={false}>
                    <TouchableOpacity 
                        style={[styles.listingCard, { backgroundColor: isDark ? '#000000' : '#fff', borderBottomColor: isDark ? '#1A1A1A' : '#F1F5F9', alignItems: 'center' }]}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/(tabs)/explore/island/ilan/${listing.id}`)}
                    >
                        {listing.imageUrl ? (
                            <Image 
                                source={{ uri: resolveImageUrl(listing.imageUrl) }} 
                                style={{ width: 80, height: 80, borderRadius: 12, marginRight: 16, backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9' }} 
                                resizeMode="cover" 
                            />
                        ) : (
                            <View style={{ width: 80, height: 80, borderRadius: 12, marginRight: 16, backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                <IconSymbol name="photo" size={24} color="#94A3B8" />
                            </View>
                        )}
                        <View style={styles.listingInfo}>
                            <Text style={[styles.listingTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={2}>{listing.title}</Text>
                            <Text style={[styles.listingDesc, isDark && { color: '#CBD5E1' }]} numberOfLines={2}>{listing.description}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <IconSymbol name="clock" size={12} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                <Text style={[styles.listingTime, { color: isDark ? '#60A5FA' : '#3B82F6', marginLeft: 4, fontWeight: '600' }]}>{timeAgo(listing.createdAt)}</Text>
                            </View>
                        </View>
                        {listing.price > 0 && (
                            <View style={[styles.priceTag, { marginLeft: 12, alignSelf: 'center' }]}>
                                <Text style={styles.priceText}>{listing.price.toLocaleString('tr-TR')} ₺</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    </Swipeable>
                ))}
            </ScrollView>
        );
    };

    const renderEventActions = (activity: any) => (progress: any, dragX: any, swipeable?: any) => {
        const trans = dragX.interpolate({
            inputRange: [-160, 0],
            outputRange: [0, 160],
            extrapolate: 'clamp',
        });
        return (
            <Animated.View style={{ flexDirection: 'row', alignItems: 'stretch', width: 160, transform: [{ translateX: trans }] }}>
                <GHTouchableOpacity onPress={() => { swipeable?.close(); router.push(`/(tabs)/explore/island/events?editActivityId=${activity.id}`); }} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="pencil" size={24} color="#FFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.edit', { defaultValue: i18n.language.startsWith('en') ? 'Edit' : 'Düzenle' })}</Text>
                </GHTouchableOpacity>
                <GHTouchableOpacity onPress={() => { swipeable?.close(); handleDeleteEvent(activity.id); }} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                    <IconSymbol name="trash.fill" size={24} color="#FFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                </GHTouchableOpacity>
            </Animated.View>
        );
    };
    const renderEvents = () => {
        if (loadingActivities) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /></View>;
        if (activities.length === 0) return renderEmpty('calendar', t('profile.emptyActivitiesTitle', { defaultValue: 'Etkinlik Yok' }), t('profile.emptyActivitiesDesc', { defaultValue: 'Oluşturduğunuz etkinlikler burada görünecek.' }), '#3B82F6');
        return (
            <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {activities.map(activity => {
                    return (
                        <Swipeable key={activity.id} renderRightActions={renderEventActions(activity)} overshootRight={false}>
                        <View style={[styles.postCard, { backgroundColor: isDark ? '#000000' : '#fff', borderBottomColor: isDark ? '#1A1A1A' : '#F1F5F9', flexDirection: 'row', alignItems: 'center' }]}>
                            {activity.imageUrl ? (
                                <Image 
                                    source={{ uri: resolveImageUrl(activity.imageUrl) }} 
                                    style={{ width: 80, height: 80, borderRadius: 12, marginRight: 16, backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9' }} 
                                    resizeMode="cover" 
                                />
                            ) : (
                                <View style={{ width: 80, height: 80, borderRadius: 12, marginRight: 16, backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconSymbol name="calendar" size={24} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                </View>
                            )}
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Text style={[styles.listingTitle, { marginBottom: 4 }, isDark && { color: '#FFFFFF' }]} numberOfLines={2}>{activity.name}</Text>
                                {activity.eventPlace ? <Text style={[styles.listingDesc, { marginBottom: 4 }, isDark && { color: '#94A3B8' }]} numberOfLines={1}>{activity.eventPlace}</Text> : null}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <IconSymbol name="clock" size={12} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                    <Text style={[styles.listingTime, { color: isDark ? '#60A5FA' : '#3B82F6', marginLeft: 4, fontWeight: '700' }]}>
                                        {timeAgo(activity.startDate)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        </Swipeable>
                    );
                })}
            </ScrollView>
        );
    };

    const renderLikes = () => {
        if (loadingLikes) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#EC4899" /></View>;
        if (likedPosts.length === 0) return renderEmpty('heart.fill', t('profile.emptyLikesTitle', { defaultValue: 'Beğeni Yok' }), t('profile.emptyLikesDesc', { defaultValue: 'Beğendiğiniz paylaşımlar burada görünecek.' }), '#EC4899');
        return (
            <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {likedPosts.map(post => {
                    const isPoll = (post.postType as any) === 'POLL' || String(post.postType)?.toUpperCase() === 'POLL';
                    const pollOpts = post.pollOptions || (post as any).options || (post as any).poll_options;
                    const totalVotes = isPoll && pollOpts ? pollOpts.reduce((sum: number, opt: any) => sum + (opt.voteCount || opt.votes || 0), 0) : 0;

                    return (
                        <View 
                            key={post.id} 
                            style={[styles.postCard, { backgroundColor: isDark ? '#000000' : '#fff', borderBottomColor: isDark ? '#1A1A1A' : '#F1F5F9' }]}
                        >
                            <Text style={[styles.postContent, { marginBottom: 4 }, isDark && { color: '#E2E8F0' }]}>{post.content}</Text>
                            {renderPollAndImage(post)}
                            <View style={styles.postFooter}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <IconSymbol name="clock" size={12} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                    <Text style={[styles.postTime, { color: isDark ? '#60A5FA' : '#3B82F6', marginLeft: 4, fontWeight: '600' }]}>{timeAgo(post.createdAt)}</Text>
                                </View>
                                <View style={styles.statsRow}>
                                    {isPoll && pollOpts && pollOpts.length > 0 ? (
                                        <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
                                            {i18n.language.startsWith('en') 
                                                ? `Total vote: ${totalVotes}` 
                                                : `Toplam oy: ${totalVotes}`}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
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

    // Mirrors ListingService's monthly-limit check on the backend exactly: count of all
    // listings (any status — the backend doesn't exclude inactive/rejected ones either)
    // created since the start of the current calendar month. Previously this counted every
    // active listing ever, with no date filtering at all, so it never reflected the actual
    // monthly reset and stayed pinned at "5/5" forever once a user hit the limit once.
    const LISTING_MONTHLY_LIMIT = 5;
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);
    const listingsThisMonth = listings.filter(l => new Date(l.createdAt) >= startOfThisMonth).length;
    const profileBadges = [
        {
            key: 'islander',
            title: t('profile.badges.islander'),
            badgeIcon: 'shield-star',
            color: '#F59E0B',
            earned: true,
        },
        {
            key: 'community',
            title: t('profile.badges.community'),
            badgeIcon: 'forum',
            color: '#6366F1',
            earned: true,
        },
        {
            key: 'seller',
            title: t('profile.badges.seller'),
            badgeIcon: 'treasure-chest',
            color: '#10B981',
            earned: true,
        },
        {
            key: 'ambassador',
            title: t('profile.badges.ambassador'),
            badgeIcon: 'email-seal',
            color: '#8B5CF6',
            earned: true,
        },
    ];

    return (
        <SwipeNavigation leftRoute="/(tabs)/contact">
        <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
            {!isLoggedIn ? (
                <View style={{ flex: 1 }}>
                    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                        <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>{t('common.tabProfile', { defaultValue: 'Profil' })}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={{ 
                                flexDirection: 'row', 
                                backgroundColor: isDark ? '#1E293B' : '#F1F5F9', 
                                borderRadius: 10, 
                                padding: 4,
                                borderWidth: isDark ? 1 : 0,
                                borderColor: '#334155',
                            }}>
                                <TouchableOpacity
                                    style={{ 
                                        paddingHorizontal: 16, 
                                        paddingVertical: 8, 
                                        borderRadius: 8, 
                                        backgroundColor: i18n.language.startsWith('tr') 
                                            ? (isDark ? '#334155' : '#FFFFFF') 
                                            : 'transparent', 
                                        shadowColor: i18n.language.startsWith('tr') && !isDark ? '#000' : 'transparent', 
                                        shadowOffset: { width: 0, height: 1 }, 
                                        shadowOpacity: 0.1, 
                                        shadowRadius: 1 
                                    }}
                                    onPress={() => i18n.changeLanguage('tr')}
                                >
                                    <Text style={{ 
                                        fontSize: 15, 
                                        fontWeight: '700', 
                                        color: i18n.language.startsWith('tr') 
                                            ? (isDark ? '#FFFFFF' : '#0F172A') 
                                            : (isDark ? '#94A3B8' : '#64748B') 
                                    }}>TR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ 
                                        paddingHorizontal: 16, 
                                        paddingVertical: 8, 
                                        borderRadius: 8, 
                                        backgroundColor: i18n.language.startsWith('en') 
                                            ? (isDark ? '#334155' : '#FFFFFF') 
                                            : 'transparent', 
                                        shadowColor: i18n.language.startsWith('en') && !isDark ? '#000' : 'transparent', 
                                        shadowOffset: { width: 0, height: 1 }, 
                                        shadowOpacity: 0.1, 
                                        shadowRadius: 1 
                                    }}
                                    onPress={() => i18n.changeLanguage('en')}
                                >
                                    <Text style={{ 
                                        fontSize: 15, 
                                        fontWeight: '700', 
                                        color: i18n.language.startsWith('en') 
                                            ? (isDark ? '#FFFFFF' : '#0F172A') 
                                            : (isDark ? '#94A3B8' : '#64748B') 
                                    }}>EN</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
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
                </View>
            ) : (
                <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
                    {/* Unified Top Card */}
                    <View style={[styles.unifiedTopCard, isDark && { backgroundColor: '#000000' }]}>
                        <View style={[styles.header, { paddingTop: insets.top + 6, paddingBottom: 0 }]}>
                            <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>{t('common.tabProfile', { defaultValue: 'Profil' })}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <TouchableOpacity 
                                    onPress={() => router.push('/settings')}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <IconSymbol name="gearshape.fill" size={22} color="#64748B" />
                                </TouchableOpacity>
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
                                    <IconSymbol name="rectangle.portrait.and.arrow.right" size={22} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Profile Info */}
                        <View style={styles.profileCard}>
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || '?'}</Text>
                            </View>
                            <Text style={[styles.userName, isDark && { color: '#FFFFFF' }]}>{user?.fullName || 'İsimsiz Kullanıcı'}</Text>
                            {user?.email && (
                                <Text style={{ fontSize: 13, color: isDark ? '#CBD5E1' : '#64748B', marginTop: 1, marginBottom: 6 }}>{user.email}</Text>
                            )}
                            <View style={[styles.roleBadge, 
                                user?.userType === 'ISLAND_RESIDENT' ? { backgroundColor: isDark ? '#451A03' : '#FEF9C3', borderWidth: 1, borderColor: '#F59E0B', paddingVertical: 3, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 } : 
                                user?.userType === 'ADMIN' ? { backgroundColor: isDark ? '#1E3A8A' : '#BFDBFE' } : 
                                { backgroundColor: isDark ? '#1C1C1E' : '#E2E8F0' }
                            ]}>
                                {user?.userType === 'ISLAND_RESIDENT' && <IconSymbol name="star.fill" size={12} color="#F59E0B" />}
                                <Text style={[styles.roleText, 
                                    user?.userType === 'ISLAND_RESIDENT' ? { color: '#F59E0B', fontWeight: '800', letterSpacing: 0.5 } : 
                                    user?.userType === 'ADMIN' ? { color: '#93C5FD' } : 
                                    { color: isDark ? '#CBD5E1' : '#475569' }
                                ]}>
                                    {user?.userType === 'ADMIN' ? 'Admin' : (user?.userType === 'ISLAND_RESIDENT' ? t('forum.role.islander', { defaultValue: 'Islander' }) : t('forum.role.visitor', { defaultValue: 'Visitor' }))}
                                </Text>
                            </View>

                                {/* Kotalar Kartı */}
                                <View style={{ marginTop: 10, width: '100%', backgroundColor: isDark ? '#121212' : '#FFFFFF', padding: 10, paddingHorizontal: 14, borderRadius: 14 }}>
                                    {/* İlan Kotası */}
                                    <View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <IconSymbol name="tag.fill" size={13} color="#10B981" />
                                                <Text style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#475569', marginLeft: 6, fontWeight: '700' }}>
                                                    {t('profile.listingQuota', { defaultValue: i18n.language.startsWith('en') ? 'Monthly Listing Publishing Quota' : 'Aylık İlan Yayınlama Kotası' })}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
                                                {listingsThisMonth} / {LISTING_MONTHLY_LIMIT}
                                            </Text>
                                        </View>
                                        <View style={{ width: '100%', height: 6, backgroundColor: isDark ? '#064E3B' : '#D1FAE5', borderRadius: 3, overflow: 'hidden' }}>
                                            <View style={{
                                                width: `${Math.min((listingsThisMonth / LISTING_MONTHLY_LIMIT) * 100, 100)}%`,
                                                height: '100%',
                                                backgroundColor: '#10B981',
                                                borderRadius: 3
                                            }} />
                                        </View>
                                        <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', marginTop: 3, textAlign: 'right', fontWeight: '600' }}>
                                            {t('profile.remainingQuota', { count: Math.max(0, LISTING_MONTHLY_LIMIT - listingsThisMonth), defaultValue: i18n.language.startsWith('en') ? `Remaining Quota: ${Math.max(0, LISTING_MONTHLY_LIMIT - listingsThisMonth)}` : `Kalan Hakkın: ${Math.max(0, LISTING_MONTHLY_LIMIT - listingsThisMonth)}` })}
                                        </Text>
                                    </View>
                                </View>

                                {/* Davet Edilen Adalılar Kartı */}
                                <View style={{ marginTop: 10, width: '100%', backgroundColor: isDark ? '#121212' : '#FFFFFF', padding: 10, paddingHorizontal: 14, borderRadius: 14 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <IconSymbol name="person.2.fill" size={14} color={isDark ? "#A78BFA" : "#5B21B6"} />
                                            <Text style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#475569', marginLeft: 6, fontWeight: '700' }}>
                                                {t('profile.invitedIslanders', { defaultValue: i18n.language.startsWith('tr') ? 'Davet Edilen Adalılar' : 'Invited Islanders' })}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#C084FC' : '#5B21B6' }}>
                                            {(user as any)?.invitedUsersCount || 0} / 5
                                        </Text>
                                    </View>
                                    <View style={{ width: '100%', height: 6, backgroundColor: isDark ? '#2E1065' : '#F3E8FF', borderRadius: 3, overflow: 'hidden' }}>
                                        <View style={{ 
                                            width: `${Math.min((((user as any)?.invitedUsersCount || 0) / 5) * 100, 100)}%`, 
                                            height: '100%', 
                                            backgroundColor: isDark ? '#C084FC' : '#5B21B6', 
                                            borderRadius: 3 
                                        }} />
                                    </View>
                                    <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', marginTop: 3, textAlign: 'right', fontWeight: '600' }}>
                                        {i18n.language.startsWith('en') ? 'Target: 5' : 'Hedef: 5'}
                                    </Text>
                                </View>
                        </View>
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
                <View style={[styles.tabBar, isDark && { backgroundColor: '#000000' }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                        {TABS.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <TouchableOpacity 
                                    key={tab.key} 
                                    style={[
                                        styles.tabItem, 
                                        isDark && !isActive && { backgroundColor: '#1C1C1E', shadowColor: 'transparent' },
                                        isActive && { backgroundColor: tab.color }
                                    ]}
                                    onPress={() => setActiveTab(tab.key)}
                                    activeOpacity={0.7}
                                >
                                    <IconSymbol name={tab.icon as any} size={16} color={isActive ? '#fff' : (isDark ? '#94A3B8' : tab.color)} />
                                    <Text style={[styles.tabLabel, isDark && !isActive && { color: '#94A3B8' }, isActive && { color: '#fff' }]}>
                                        {t(`profile.tabs.${tab.key}`)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Tab Content */}
                <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
                    {renderContent()}
                </View>
                </View>
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
                    <View style={[styles.modalContent, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
                        <View style={[styles.modalHeader, isDark && { borderBottomColor: '#2C2C2E' }]}>
                            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{t('profile.inviteFriend')}</Text>
                            <TouchableOpacity onPress={() => { setShowInviteModal(false); setInviteEmailError(''); setInviteEmail(''); }}>
                                <IconSymbol name="xmark.circle.fill" size={24} color={isDark ? "#64748B" : "#94A3B8"} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={[styles.modalDescription, isDark && { color: '#CBD5E1' }]}>{t('profile.inviteDesc')}</Text>
                            <TextInput
                                style={[styles.inviteInput, isDark && { backgroundColor: '#18181B', borderColor: '#2C2C2E', color: '#FFFFFF' }, inviteEmailError ? { borderColor: '#EF4444' } : {}]}
                                placeholder={t('profile.inviteEmailPlaceholder')}
                                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
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

            {/* Listing Quota Limit Modal */}
            <Modal
                visible={showQuotaModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowQuotaModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ width: '88%', maxWidth: 360, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#064E3B' : '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#047857' : '#A7F3D0' }}>
                            <IconSymbol name="tag.fill" size={30} color={isDark ? '#34D399' : '#10B981'} />
                        </View>

                        <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', textAlign: 'center', marginBottom: 10 }}>
                            {i18n.language.startsWith('en') ? 'Listing Quota Reached' : 'Bu Ayki İlan Limitiniz Doldu'}
                        </Text>

                        <Text style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
                            {i18n.language.startsWith('en')
                                ? 'You have reached your monthly free publishing limit (5/5). You can publish new listings next month.'
                                : 'Bu ayki ilan yayınlama limitinize ulaştınız (5/5). Yeni ilan eklemek için gelecek ayı bekleyebilirsiniz.'}
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setShowQuotaModal(false)}
                            style={{ width: '100%', height: 48, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                                {i18n.language.startsWith('en') ? 'Close' : 'Anladım'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Invitation Quota Limit Modal (Dark Purple Theme) */}
            <Modal
                visible={showInviteQuotaModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowInviteQuotaModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ width: '88%', maxWidth: 360, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#2E1065' : '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#5B21B6' : '#DDD6FE' }}>
                            <IconSymbol name="person.2.fill" size={30} color={isDark ? '#C084FC' : '#5B21B6'} />
                        </View>

                        <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', textAlign: 'center', marginBottom: 10 }}>
                            {i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu'}
                        </Text>

                        <Text style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
                            {i18n.language.startsWith('en')
                                ? 'You can invite a maximum of 3 islanders. Your invitation quota (3/3) has been reached.'
                                : 'En fazla 3 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (3/3) dolmuştur.'}
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setShowInviteQuotaModal(false)}
                            style={{ width: '100%', height: 48, borderRadius: 14, backgroundColor: '#5B21B6', justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                                {i18n.language.startsWith('en') ? 'Understood' : 'Anladım'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
        </SwipeNavigation>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    unifiedTopCard: { backgroundColor: '#FFFFFF', paddingBottom: vs(8), borderBottomLeftRadius: s(20), borderBottomRightRadius: s(20), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, zIndex: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s(20), paddingBottom: vs(4), backgroundColor: 'transparent' },
    headerTitle: { fontSize: ms(25), fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    scrollContent: { paddingBottom: vs(100) },
    profileCard: { backgroundColor: 'transparent', paddingHorizontal: s(20), paddingTop: vs(4), paddingBottom: vs(8), alignItems: 'center' },
    avatar: { width: s(68), height: s(68), borderRadius: s(34), borderWidth: 2, borderColor: '#F1F5F9', marginBottom: vs(8) },
    userName: { fontSize: ms(20), fontWeight: 'bold', color: '#0F172A', marginBottom: 2 },
    userBio: { fontSize: ms(14), color: '#64748B', marginBottom: 6 },
    avatarPlaceholder: { width: s(68), height: s(68), borderRadius: s(34), backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', marginBottom: vs(8), borderWidth: 2, borderColor: '#F1F5F9' },
    avatarText: { fontSize: ms(28), fontWeight: 'bold', color: '#fff' },
    roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: s(12), paddingVertical: vs(4), borderRadius: s(8) },
    roleText: { fontSize: ms(11.5), fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    badgesCard: { width: '100%', marginTop: vs(10), padding: s(12), borderRadius: s(14), backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    badgesCardDark: { backgroundColor: '#121212', borderColor: '#2C2C2E' },
    badgesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(9) },
    badgesTitle: { fontSize: ms(13), fontWeight: '800', color: '#0F172A' },
    badgesCount: { fontSize: ms(11), fontWeight: '800', color: '#8B5CF6', backgroundColor: '#EDE9FE', paddingHorizontal: s(8), paddingVertical: vs(3), borderRadius: s(10) },
    badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
    profileBadge: { width: '48%', minHeight: vs(46), flexDirection: 'row', alignItems: 'center', gap: s(7), padding: s(8), borderRadius: s(11), backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
    profileBadgeDark: { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' },
    profileBadgeLocked: { opacity: 0.58 },
    profileBadgeIcon: { width: s(30), height: s(30), borderRadius: s(15), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    badgeRosetteContainer: { width: s(30), height: s(30), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    profileBadgeText: { flex: 1, fontSize: ms(10.5), lineHeight: ms(13), fontWeight: '700', color: '#334155' },
    loginButton: { marginTop: vs(16), backgroundColor: '#10B981', paddingHorizontal: s(20), paddingVertical: vs(10), borderRadius: s(10) },
    loginButtonText: { color: '#fff', fontSize: ms(15), fontWeight: '700' },

    // Tab Bar
    tabBar: { paddingVertical: vs(8), backgroundColor: '#FFFFFF' },
    tabScroll: { paddingHorizontal: s(20), gap: s(8), paddingVertical: vs(6) },
    tabItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(6), paddingHorizontal: s(14), paddingVertical: vs(10), borderRadius: s(12), backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    tabLabel: { fontSize: ms(14), fontWeight: '700', color: '#475569' },

    // Content
    loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: vs(120) },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: vs(100), paddingHorizontal: s(20) },
    emptyTitle: { fontSize: ms(17), fontWeight: '600', color: '#94A3B8', marginTop: vs(12), textAlign: 'center' },
    emptySubtitle: { fontSize: ms(14), color: '#CBD5E1', marginTop: vs(4), textAlign: 'center' },
    contentList: { backgroundColor: '#fff' },

    // Post Cards
    postCard: { paddingVertical: vs(16), paddingHorizontal: s(20), borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    postContent: { fontSize: ms(16), color: '#1E293B', lineHeight: ms(23), marginBottom: vs(12) },
    postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    postTime: { fontSize: ms(13), color: '#94A3B8', fontWeight: '500' },
    replyHeader: { flexDirection: 'row', alignItems: 'center', gap: s(6), marginBottom: vs(8) },
    replyContext: { fontSize: ms(12), color: '#64748B', fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: s(12) },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
    statText: { fontSize: ms(13), fontWeight: '600', color: '#64748B' },

    // Listing Cards
    listingCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(16), paddingHorizontal: s(20), borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    listingInfo: { flex: 1, justifyContent: 'center' },
    listingTitle: { fontSize: ms(16), fontWeight: '700', color: '#1E293B', marginBottom: vs(4) },
    listingDesc: { fontSize: ms(14), color: '#64748B', lineHeight: ms(19), marginBottom: vs(6) },
    listingTime: { fontSize: ms(13), color: '#94A3B8' },
    priceTag: { backgroundColor: '#10B981', paddingHorizontal: s(12), paddingVertical: vs(7), borderRadius: s(10), marginLeft: s(12), alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
    priceText: { fontSize: ms(14), fontWeight: '800', color: '#FFFFFF', textAlign: 'center', lineHeight: ms(18) },
    
    // Notifications
    notifCard: {
        flexDirection: 'row',
        padding: s(16),
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'flex-start',
        gap: s(12),
    },
    notifCardUnread: {
        backgroundColor: '#FAFAFA',
    },
    notifIcon: {
        width: s(36),
        height: s(36),
        borderRadius: s(14),
        backgroundColor: '#FFF1F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBody: {
        flex: 1,
    },
    notifTitle: {
        fontSize: ms(15),
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: vs(4),
    },
    notifAuthor: {
        fontWeight: '700',
        color: '#0F172A',
    },
    notifContent: {
        fontSize: ms(13.5),
        color: '#64748B',
        fontStyle: 'italic',
        marginBottom: vs(6),
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
