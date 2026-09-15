import { IconSymbol } from '@/components/ui/icon-symbol';
import { s, vs, ms, isLargeScreen } from '@/utils/scale';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SwipeNavigation } from '@/components/SwipeNavigation';
import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Animated, Dimensions, Keyboard, ActionSheetIOS, InputAccessoryView, Share } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTranslation } from 'react-i18next';
import i18n from '@/utils/i18n';
import * as forumApi from '@/services/forumApi';
import { PostDto, PostType, Island, UserType } from '@/services/forumApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import * as mediaApi from '@/services/mediaApi';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import VerifyPhoneModal from '@/components/VerifyPhoneModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmptyState } from '@/components/EmptyState';
import { API_BASE_URL, fetchWithTimeout, resolveImageUrl } from '@/services/config';
import { getToken } from '@/utils/tokenStorage';

import Swipeable from 'react-native-gesture-handler/Swipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';

import { translateText } from '@/utils/translate';

const ENABLE_PHOTO_UPLOAD = true; // Feature flag for photo upload in community posts

export default function ForumScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn, user, updateProfile } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [showVerifyPhoneModal, setShowVerifyPhoneModal] = useState(false);

    React.useEffect(() => {
        if (!isLoggedIn) {
            Alert.alert(
                t('common.accessDenied', { defaultValue: 'Erişim Engellendi' }),
                t('forum.loginRequiredDesc', { defaultValue: 'Topluluğu görüntülemek için giriş yapmalısınız.' }),
                [{ text: t('common.ok', { defaultValue: 'Tamam' }), onPress: () => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(tabs)/explore');
                    }
                }}]
            );
        }
    }, [isLoggedIn]);

    const [posts, setPosts] = useState<PostDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isWriteModalVisible, setIsWriteModalVisible] = useState(false);
    const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
    const writeModalSlideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const postInputRef = useRef<TextInput>(null);
    const replyInputRef = useRef<TextInput>(null);
    const commentsScrollRef = useRef<ScrollView>(null);



    useEffect(() => {
        // writeModalSlideAnim is now handled in Modal's onShow to ensure native view is ready
    }, [isWriteModalVisible]);

    const [isSwipeOnboardingVisible, setIsSwipeOnboardingVisible] = useState(false);
    const [isSwipeOnboardingPending, setIsSwipeOnboardingPending] = useState(false);
    const [isRulesCheckComplete, setIsRulesCheckComplete] = useState(false);
    const onboardingSwipeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isSwipeOnboardingVisible) {
            onboardingSwipeAnim.setValue(0);
            const loopAnim = Animated.loop(
                Animated.sequence([
                    Animated.delay(400),
                    Animated.timing(onboardingSwipeAnim, {
                        toValue: -88,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.delay(900),
                    Animated.timing(onboardingSwipeAnim, {
                        toValue: 0,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                ])
            );
            loopAnim.start();
            return () => loopAnim.stop();
        }
    }, [isSwipeOnboardingVisible]);

    useEffect(() => {
        const checkSwipeOnboarding = async () => {
            try {
                const hasSeen = await AsyncStorage.getItem('has_seen_swipe_onboarding');
                if (hasSeen !== 'true') setIsSwipeOnboardingPending(true);
            } catch (error) {
                console.log('Error checking swipe onboarding status', error);
            }
        };

        checkSwipeOnboarding();
    }, []);

    // iOS can freeze when two native modals are presented at the same time.
    // Show the swipe onboarding only after the first-visit rules modal is closed.
    useEffect(() => {
        if (!isSwipeOnboardingPending || !isRulesCheckComplete || isRulesModalVisible) return;
        const timer = setTimeout(() => {
            setIsSwipeOnboardingPending(false);
            setIsSwipeOnboardingVisible(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [isSwipeOnboardingPending, isRulesCheckComplete, isRulesModalVisible]);

    const dismissSwipeOnboarding = async () => {
        setIsSwipeOnboardingVisible(false);
        try {
            await AsyncStorage.setItem('has_seen_swipe_onboarding', 'true');
        } catch {}
    };

    useEffect(() => {
        const checkRulesVisit = async () => {
            try {
                const lastShown = await AsyncStorage.getItem('lastCommunityRulesShownTimestamp');
                const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
                const now = Date.now();
                if (!lastShown || (now - Number(lastShown)) >= SEVEN_DAYS_MS) {
                    setTimeout(() => {
                        setIsRulesModalVisible(true);
                        setIsRulesCheckComplete(true);
                    }, 500);
                    await AsyncStorage.setItem('lastCommunityRulesShownTimestamp', now.toString());
                } else {
                    setIsRulesCheckComplete(true);
                }
            } catch (error) {
                console.error("Error reading rules visit status", error);
            }
        };
        checkRulesVisit();
    }, []);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostType, setNewPostType] = useState('discussion');
    const [userRole, setUserRole] = useState<'visitor' | 'islander'>('visitor');
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [shouldFocusReply, setShouldFocusReply] = useState(false);
    const [replies, setReplies] = useState<PostDto[]>([]);
    const [isAdModalVisible, setIsAdModalVisible] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [newReplyContent, setNewReplyContent] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const isSendingReplyRef = useRef(false);
    const [pollDurationHours, setPollDurationHours] = useState(24);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [deleteConfirmState, setDeleteConfirmState] = useState<{ visible: boolean, id: string | null }>({ visible: false, id: null });
    const [reportConfirmState, setReportConfirmState] = useState<{ visible: boolean, id: string | null }>({ visible: false, id: null });
    const [translatedPosts, setTranslatedPosts] = useState<Record<string, { text: string; isTranslated: boolean; loading: boolean }>>({});

    useEffect(() => {
        if (isKeyboardVisible && isDetailModalVisible) {
            const timer1 = setTimeout(() => {
                commentsScrollRef.current?.scrollToEnd({ animated: true });
            }, 50);
            const timer2 = setTimeout(() => {
                commentsScrollRef.current?.scrollToEnd({ animated: true });
            }, 150);
            const timer3 = setTimeout(() => {
                commentsScrollRef.current?.scrollToEnd({ animated: true });
            }, 300);
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [isKeyboardVisible, isDetailModalVisible]);

    const handleToggleTranslation = async (postId: string, text: string) => {
        const current = translatedPosts[postId];
        if (current?.isTranslated) {
            setTranslatedPosts(prev => ({
                ...prev,
                [postId]: { ...prev[postId], isTranslated: false }
            }));
            return;
        }

        setTranslatedPosts(prev => ({
            ...prev,
            [postId]: { text: current?.text || '', isTranslated: false, loading: true }
        }));

        const targetLang = i18n.language.startsWith('tr') ? 'en' : 'tr';
        const translated = await translateText(text, targetLang);

        setTranslatedPosts(prev => ({
            ...prev,
            [postId]: { text: translated, isTranslated: true, loading: false }
        }));
    };
    const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
    const [inviteContactInput, setInviteContactInput] = useState('');

    // Ad Fields
    const [adTitle, setAdTitle] = useState('');
    const [adPrice, setAdPrice] = useState('');
    const [adDesc, setAdDesc] = useState('');
    const [adCategory, setAdCategory] = useState('eşya');
    const [selectedIsland, setSelectedIsland] = useState('Kınalıada');

    React.useEffect(() => {
        AsyncStorage.getItem('defaultIsland').then(island => {
            if (island && islands.includes(island)) {
                setSelectedIsland(island);
            }
        });
    }, []);

    const islands = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];

    const adCategories = [
        { id: 'item', label: 'Eşya', icon: 'package-variant-closed' },
        { id: 'estate', label: 'Emlak', icon: 'home-city-outline' },
        { id: 'other', label: 'Diğer', icon: 'dots-horizontal-circle-outline' },
    ];

    const openPostDetails = async (post: PostDto, focusInput: boolean = false) => {
        setSelectedPost(post);
        setShouldFocusReply(focusInput);
        setIsDetailModalVisible(true);
        setReplies([]); // Clear old replies
        const data = await forumApi.fetchReplies(post.id);
        setReplies(data);
    };

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const [isInvitingInForum, setIsInvitingInForum] = useState(false);

    const performInviteShare = async () => {
        if (isInvitingInForum) return;

        try {
            const email = inviteContactInput.trim();
            if (!email) {
                const appStoreUrl = 'https://apps.apple.com/tr/app/ada-plus/id6743840993';
                await Share.share({
                    message: i18n.language.startsWith('en')
                        ? `Join the AdaPlus Community! Download on the App Store: ${appStoreUrl}`
                        : `AdaPlus Topluluğuna sen de katıl! Adalıların buluşma noktası, App Store'dan indir: ${appStoreUrl}`,
                    url: appStoreUrl,
                });
                setIsInviteModalVisible(false);
                return;
            }

            if (!EMAIL_REGEX.test(email)) {
                Alert.alert(
                    t('common.error', { defaultValue: 'Hata' }),
                    i18n.language.startsWith('en') ? 'Please enter a valid email address.' : 'Geçerli bir e-posta adresi girin.'
                );
                return;
            }

            setIsInvitingInForum(true);
            const token = getToken();
            if (!token) {
                Alert.alert(t('common.error', { defaultValue: 'Hata' }), i18n.language.startsWith('en') ? 'You must be logged in to send invites.' : 'Davet göndermek için giriş yapmalısın.');
                return;
            }

            const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/invites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });
            const errorBody = response.ok ? null : await response.json().catch(() => null);
            const errorMessage = String(errorBody?.message || errorBody?.error || '').toLowerCase();

            if (response.status === 409 || errorMessage.includes('already') || errorMessage.includes('zaten')) {
                Alert.alert(
                    i18n.language.startsWith('en') ? 'Already Invited' : 'Davet Zaten Gönderilmiş',
                    i18n.language.startsWith('en')
                        ? 'An invitation has already been sent to this email address.'
                        : 'Bu e-posta adresine daha önce davet gönderilmiş.'
                );
                return;
            }

            if (response.status === 400 || response.status === 403 || response.status === 429) {
                Alert.alert(
                    i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu',
                    i18n.language.startsWith('en')
                        ? 'You can invite a maximum of 3 islanders. Your invitation quota (3/3) has been reached.'
                        : 'En fazla 3 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (3/3) dolmuştur.'
                );
                return;
            }

            if (!response.ok) {
                throw new Error(errorBody?.message || `HTTP ${response.status}`);
            }

            Alert.alert(
                t('common.success', { defaultValue: 'Başarılı' }),
                i18n.language.startsWith('tr')
                    ? `${email} adresine davetiye başarıyla gönderildi!`
                    : `Invitation successfully sent to ${email}!`
            );
            setInviteContactInput('');
            setIsInviteModalVisible(false);
        } catch (error) {
            console.error('Failed to send invite from forum:', error);
            Alert.alert(t('common.error', { defaultValue: 'Hata' }), t('profile.inviteSendFailed', { defaultValue: 'Davet gönderilemedi, lütfen tekrar deneyin.' }));
        } finally {
            setIsInvitingInForum(false);
        }
    };

    const handleInviteFriends = () => {
        const invitedCount = (user as any)?.invitedUsersCount || 0;
        if (invitedCount >= 3) {
            Alert.alert(
                i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu',
                i18n.language.startsWith('en')
                    ? 'You can invite a maximum of 3 islanders. Your invitation quota (3/3) has been reached.'
                    : 'En fazla 3 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (3/3) dolmuştur.'
            );
            return;
        }
        setIsInviteModalVisible(true);
    };

    const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});

    useEffect(() => {
        AsyncStorage.getItem('user_voted_polls').then(val => {
            if (val) {
                try { setVotedPolls(JSON.parse(val)); } catch {}
            }
        });
    }, []);

    const handlePollVote = async (postId: string, optionId: string) => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        const targetPost = posts.find(p => p.id === postId) || (selectedPost?.id === postId ? selectedPost : null);
        if (targetPost && isPollEnded(targetPost.pollEndsAt)) {
            Alert.alert(
                t('common.info', { defaultValue: i18n.language.startsWith('en') ? 'Info' : 'Bilgi' }),
                i18n.language.startsWith('en') ? 'This poll has ended.' : 'Bu anket sona ermiştir.'
            );
            return;
        }

        const prevOptId = votedPolls[postId] || (targetPost as any)?.votedOptionId || (targetPost as any)?.userVotedOptionId;
        if (prevOptId === optionId) return;

        // 1. Optimistic VotedPolls state update
        setVotedPolls(prev => {
            const next = { ...prev, [postId]: optionId };
            AsyncStorage.setItem('user_voted_polls', JSON.stringify(next)).catch(() => {});
            return next;
        });

        // 2. Optimistic Post Options & Vote Count update (Instant 0ms UI transition)
        const updateOptimisticPost = (p: PostDto): PostDto => {
            if (p.id !== postId) return p;
            const pollOpts = p.pollOptions || (p as any).options || (p as any).poll_options;
            if (!pollOpts) return p;

            const newOpts = pollOpts.map((opt: any) => {
                let count = Number(opt.voteCount || opt.votes || opt.count || 0);
                if (prevOptId && String(opt.id) === String(prevOptId)) {
                    count = Math.max(0, count - 1);
                }
                if (String(opt.id) === String(optionId)) {
                    count = count + 1;
                }
                return {
                    ...opt,
                    voteCount: count,
                    votes: count,
                    isVoted: String(opt.id) === String(optionId),
                    voted: String(opt.id) === String(optionId)
                };
            });

            const totalVotes = newOpts.reduce((sum: number, opt: any) => sum + opt.voteCount, 0);
            const calculatedOpts = newOpts.map((opt: any) => ({
                ...opt,
                percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0
            }));

            return {
                ...p,
                pollOptions: calculatedOpts,
                options: calculatedOpts,
                votedOptionId: optionId,
                userVotedOptionId: optionId,
            } as any;
        };

        setPosts(prevPosts => prevPosts.map(updateOptimisticPost));
        if (selectedPost && selectedPost.id === postId) {
            setSelectedPost((prev: PostDto | null) => prev ? updateOptimisticPost(prev) : null);
        }

        // 3. Background API sync. The response already contains the new counts;
        // recalculate percentages from those counts without applying the vote twice.
        try {
            const updatedPost = await forumApi.voteOnPoll(postId, optionId);
            if (updatedPost) {
                const finalPost = normalizePollPost(updatedPost);
                setPosts(prevPosts => prevPosts.map(p => p.id === postId ? finalPost : p));
                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost(finalPost);
                }
            }
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    const getPollVoteCount = (option: any): number =>
        Number(option?.voteCount ?? option?.votes ?? option?.count ?? 0) || 0;

    const normalizePollPost = (post: PostDto): PostDto => {
        const options = (post.pollOptions || (post as any).options || (post as any).poll_options) as any[] | undefined;
        if (!options) return post;
        const total = options.reduce((sum, option) => sum + getPollVoteCount(option), 0);
        const normalized = options.map(option => {
            const votes = getPollVoteCount(option);
            return {
                ...option,
                voteCount: votes,
                votes,
                percentage: total > 0 ? (votes / total) * 100 : 0,
            };
        });
        return { ...post, pollOptions: normalized, options: normalized } as any;
    };

    const handleSendReply = async () => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        if (!newReplyContent.trim() || !selectedPost) return;
        // The button's disabled state only ever reflected whether the text field was
        // empty, not whether a send was already in flight — tapping twice quickly (before
        // the first request cleared the field) sent the same comment twice.
        if (isSendingReplyRef.current) return;
        isSendingReplyRef.current = true;
        setIsSendingReply(true);

        try {
            if (editingReplyId) {
                const request: forumApi.UpdatePostRequest = {
                    content: newReplyContent.trim(),
                };
                const updatedReply = await forumApi.updatePost(editingReplyId, request);
                setReplies(replies.map(r => r.id === editingReplyId ? updatedReply : r));
                setNewReplyContent('');
                setEditingReplyId(null);
            } else {
                const request: Partial<forumApi.CreatePostRequest> = {
                    content: newReplyContent.trim(),
                    postType: PostType.DISCUSSION,
                    island: selectedPost.island,
                    anonymous: false
                };

                const reply = await forumApi.postReply(selectedPost.id, request);
                if (reply) {
                    const completeReply: any = {
                        ...reply,
                        authorId: reply.authorId || user?.id,
                        authorName: reply.authorName || user?.fullName || 'Anonim',
                        authorUserType: reply.authorUserType || user?.userType || UserType.VISITOR
                    };
                    setReplies([...replies, completeReply]);
                    setNewReplyContent('');
                    // Update both the feed list's copy of this post AND the separate
                    // selectedPost state the detail modal's header count reads from — same
                    // mismatch as the delete path had.
                    const incremented = selectedPost.replyCount + 1;
                    setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, replyCount: incremented } : p));
                    setSelectedPost({ ...selectedPost, replyCount: incremented });
                }
            }
        } catch (error: any) {
            Alert.alert('Yanıt Gönderilemedi', error?.message || 'Bir hata oluştu.');
        } finally {
            isSendingReplyRef.current = false;
            setIsSendingReply(false);
        }
    };

    const roles = [
        { id: 'visitor', label: t('forum.role.visitor'), color: '#3B82F6' },
        { id: 'islander', label: t('forum.role.islander'), color: '#F59E0B' },
    ];

    const postTypes = [
        { id: 'discussion', label: t('forum.type.discussion') },
        { id: 'poll', label: t('forum.type.poll') },
        { id: 'complaint', label: t('forum.type.complaint') },
        { id: 'info', label: t('forum.type.info') },
    ];

    const tabs = [
        { id: 'all', icon: 'square.grid.2x2.fill', label: t('forum.tabs.all') },
        { id: 'hot', icon: 'flame.fill', label: t('forum.tabs.hot') },
        { id: 'polls', icon: 'chart.bar.fill', label: t('forum.tabs.polls') },
        { id: 'complaints', icon: 'exclamationmark.triangle.fill', label: t('forum.type.complaint', { defaultValue: 'Şikayet' }) },
        { id: 'info', icon: 'info.circle.fill', label: t('forum.type.info', { defaultValue: 'Bilgi' }) },
    ] as const;

    React.useEffect(() => {
        const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
        const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const [pageNumber, setPageNumber] = useState<number>(0);
    const [hasMorePosts, setHasMorePosts] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

    const loadPosts = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setPageNumber(0);
        setHasMorePosts(true);
        try {
            if (activeTab === 'hot') {
                const data = await forumApi.fetchHotPosts();
                setPosts(Array.isArray(data) ? data : []);
                setHasMorePosts(false);
            } else {
                const result = await forumApi.fetchPosts(undefined, 0, 25);
                setPosts(result.posts);
                setHasMorePosts(!result.isLastPage);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            setPosts([]);
            setHasMorePosts(false);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMorePosts || activeTab === 'hot' || isLoading) return;
        setIsLoadingMore(true);
        const nextPage = pageNumber + 1;
        try {
            const result = await forumApi.fetchPosts(undefined, nextPage, 25);
            if (result.posts && result.posts.length > 0) {
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newUniquePosts = result.posts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newUniquePosts];
                });
                setPageNumber(nextPage);
                setHasMorePosts(!result.isLastPage);
            } else {
                setHasMorePosts(false);
            }
        } catch (error) {
            console.error('Failed to load more posts:', error);
            setHasMorePosts(false);
        } finally {
            setIsLoadingMore(false);
        }
    };

    React.useEffect(() => {
        loadPosts();
    }, [activeTab]);

    const onRefresh = () => {
        setIsRefreshing(true);
        loadPosts(false);
    };

    const getRoleInfo = (userType?: UserType | string) => {
        const type = String(userType || '').toUpperCase();
        if (type === 'ADMIN' || type === UserType.ADMIN) {
            return {
                name: 'Admin',
                color: '#EF4444',
                icon: 'shield.fill'
            };
        }
        if (type === 'BELEDIYE' || type === 'ADALAR_BELEDIYESI' || type === UserType.BELEDIYE || type === UserType.ADALAR_BELEDIYESI) {
            return {
                name: i18n.language.startsWith('en') ? 'Municipality' : 'Adalar Belediyesi',
                color: '#3B82F6',
                icon: 'building.2.fill'
            };
        }
        if (type === 'MUHTAR' || type === UserType.MUHTAR) {
            return {
                name: i18n.language.startsWith('en') ? 'Headman' : 'Muhtar',
                color: '#10B981',
                icon: 'checkmark.seal.fill'
            };
        }
        if (type === 'ISLAND_RESIDENT' || type === 'RESIDENT' || type === UserType.ISLAND_RESIDENT || type === UserType.RESIDENT) {
            return {
                name: t('forum.role.islander', { defaultValue: 'Adalı' }),
                color: '#F59E0B',
                icon: 'star.fill'
            };
        }
        return {
            name: t('forum.role.visitor', { defaultValue: 'Ziyaretçi' }),
            color: '#64748B',
            icon: null
        };
    };

    const getUserAvatarColor = (userId?: string | null, userName?: string | null, isAnonymous?: boolean) => {
        if (isAnonymous) return '#64748B';
        const name = (userName || '').trim().toLowerCase();
        if (name === 'anonim' || name === 'anonymous' || name === 'gizli kullanıcı' || name === 'gizli kullanici') {
            return '#64748B'; // Slate Gray for Anonymous
        }
        const seed = (userId || userName || 'user').toString();
        const AVATAR_PALETTE = [
            '#3B82F6', // Royal Blue
            '#10B981', // Emerald Green
            '#8B5CF6', // Purple
            '#F59E0B', // Amber Gold
            '#EC4899', // Hot Pink
            '#06B6D4', // Cyan
            '#EF4444', // Red
            '#6366F1', // Indigo
            '#14B8A6', // Teal
            '#F97316', // Vibrant Orange
            '#D946EF', // Fuchsia
            '#84CC16', // Lime Green
            '#FB7185', // Coral Rose
            '#0284C7', // Deep Sky Blue
            '#A855F7', // Bright Violet
            '#F43F5E', // Rose Red
            '#0EA5E9', // Electric Blue
            '#EAB308', // Golden Yellow
            '#059669', // Dark Emerald
            '#7C3AED', // Deep Purple
            '#D97706', // Dark Amber
            '#2563EB', // Sapphire Blue
            '#C084FC', // Soft Purple
            '#38BDF8', // Soft Sky Blue
        ];
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % AVATAR_PALETTE.length;
        return AVATAR_PALETTE[index];
    };

    const getTagColor = (userType?: UserType | string) => {
        return getRoleInfo(userType).color;
    };

    const formatTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), {
                addSuffix: true,
                locale: i18n.language.startsWith('tr') ? tr : enUS
            }).replace('yaklaşık ', '').replace('about ', '');
        } catch (e) {
            return dateString;
        }
    };

    const getIslandEnum = (islandName: string): Island => {
        const mapping: Record<string, Island> = {
            'Büyükada': Island.BUYUKADA,
            'Heybeliada': Island.HEYBELIADA,
            'Burgazada': Island.BURGAZADA,
            'Kınalıada': Island.KINALIADA,
            'Sedef Adası': Island.SEDEF_ADASI
        };
        return mapping[islandName] || Island.BUYUKADA;
    };

    const getIslandName = (island: Island): string => {
        const mapping: Record<Island, string> = {
            [Island.BUYUKADA]: 'Büyükada',
            [Island.HEYBELIADA]: 'Heybeliada',
            [Island.BURGAZADA]: 'Burgazada',
            [Island.KINALIADA]: 'Kınalıada',
            [Island.SEDEF_ADASI]: 'Sedef Adası'
        };
        return mapping[island] || island;
    };

    const pickImage = async () => {
        const handleGallery = async () => {
            try {
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: false, // allowsEditing must be false for allowsMultipleSelection to work on iOS
                    allowsMultipleSelection: true,
                    selectionLimit: 3 - selectedImages.length,
                    quality: 0.8,
                });
                if (!result.canceled) {
                    const newImages = result.assets.map(a => a.uri);
                    setSelectedImages(prev => [...prev, ...newImages].slice(0, 3));
                }
            } catch (e) {
                console.log('Error picking image:', e);
            }
        };

        const handleCamera = async () => {
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
                    setSelectedImages(prev => [...prev, result.assets[0].uri].slice(0, 3));
                }
            } catch (e) {
                console.log('Error picking from camera:', e);
            }
        };

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [t('common.cancel', { defaultValue: 'İptal' }), t('common.takePhoto', { defaultValue: '📷 Fotoğraf Çek' }), t('common.chooseFromGallery', { defaultValue: '🖼️ Galeriden Seç' })],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setTimeout(handleCamera, 500);
                    } else if (buttonIndex === 2) {
                        setTimeout(handleGallery, 500);
                    }
                }
            );
        } else {
            Alert.alert(
                t('common.selectPhoto', { defaultValue: 'Fotoğraf Seç' }),
                t('common.selectPhotoDesc', { defaultValue: 'Fotoğrafı nereden eklemek istersiniz?' }),
                [
                    { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                    { text: t('common.takePhoto', { defaultValue: 'Fotoğraf Çek' }), onPress: () => setTimeout(handleCamera, 500) },
                    { text: t('common.chooseFromGallery', { defaultValue: 'Galeriden Seç' }), onPress: () => setTimeout(handleGallery, 500) },
                ]
            );
        }
    };

    const MIN_POST_LENGTH = 10;
    const MAX_POST_LENGTH = 500;
    const POLL_QUESTION_MAX_LENGTH = 200;
    const trimmedPostContent = newPostContent.trim();
    // Applies to the poll question too, not just regular post content — it has the same
    // MIN_POST_LENGTH requirement (see isPublishActive below), but previously got no
    // feedback explaining why the publish button stayed disabled.
    const currentPostContentLength = newPostType === 'poll' ? pollQuestion.trim().length : trimmedPostContent.length;
    const postContentTooShort = currentPostContentLength > 0 && currentPostContentLength < MIN_POST_LENGTH;
    const isPublishActive = (
      newPostType === 'poll'
        ? (pollQuestion.trim().length >= MIN_POST_LENGTH && pollOptions.filter(o => o.trim()).length >= 2)
        : trimmedPostContent.length >= MIN_POST_LENGTH
    ) && !isUploading;

    const isWriteFormDirty = newPostContent.trim().length > 0 || pollQuestion.trim().length > 0 || selectedImages.length > 0;

    const resetWriteForm = () => {
        Keyboard.dismiss();
        setIsWriteModalVisible(false);
        setNewPostContent('');
        setPollQuestion('');
        setPollOptions(['', '']);
        setSelectedImages([]);
        setEditingPostId(null);
        setEditingReplyId(null);

        // Reset the animation value implicitly after closing
        writeModalSlideAnim.setValue(Dimensions.get('window').height);
    };

    const handleCloseWriteModal = () => {
        Animated.timing(writeModalSlideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            resetWriteForm();
        });
    };

    const handleCreatePost = async () => {
        const content = newPostType === 'poll' ? pollQuestion.trim() : trimmedPostContent;
        if (!content || content.length < MIN_POST_LENGTH) return;

        setIsUploading(true);
        try {
            let imageUrl: string | undefined = undefined;
            if (selectedImages.length > 0) {
                const uploadedUrls: string[] = [];
                for (const uri of selectedImages) {
                    if (uri.startsWith('http') || uri.startsWith('/')) {
                        uploadedUrls.push(uri);
                    } else {
                        const uploaded = await mediaApi.uploadImage(uri);
                        if (uploaded) uploadedUrls.push(uploaded);
                    }
                }
                if (uploadedUrls.length < selectedImages.length) {
                    Alert.alert(
                        t('common.error', { defaultValue: 'Hata' }),
                        t('forum.photoUploadFailed', { defaultValue: 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin.' }),
                    );
                    return;
                }
                imageUrl = uploadedUrls.join(',');
            }

            if (editingPostId) {
                const updateReq: forumApi.UpdatePostRequest = {
                    content,
                    imageUrl: imageUrl,
                };
                const updatedPost = await forumApi.updatePost(editingPostId, updateReq);
                const completeUpdatedPost = { ...updatedPost, imageUrl: updatedPost.imageUrl ?? imageUrl };
                setPosts(posts.map(p => p.id === editingPostId ? completeUpdatedPost : p));
                if (selectedPost && selectedPost.id === editingPostId) {
                    setSelectedPost(completeUpdatedPost);
                }
                setNewPostContent('');
                setNewPostType('discussion');
                setPollQuestion('');
                setPollOptions(['', '']);
                setPollDurationHours(24);
                setSelectedImages([]);
                setIsAnonymous(false);
                setEditingPostId(null);
                setIsWriteModalVisible(false);
            } else {
                const filterOpts = newPostType === 'poll' ? pollOptions.filter(opt => opt.trim() !== '') : undefined;
                const createReq: forumApi.CreatePostRequest = {
                    content,
                    postType: newPostType.toUpperCase() as PostType,
                    island: getIslandEnum(selectedIsland),
                    anonymous: isAnonymous,
                    pollOptions: filterOpts,
                    imageUrl: imageUrl,
                    pollDurationHours: (newPostType === 'poll' && pollDurationHours > 0) ? pollDurationHours : undefined,
                };

                const createdPost = await forumApi.createPost(createReq);
                const optionsFromReq = filterOpts ? filterOpts.map((text, idx) => ({
                    id: `opt-${idx}-${Date.now()}`,
                    text,
                    voteCount: 0,
                    percentage: 0,
                    isVoted: false,
                    voted: false
                })) : undefined;

                const completePost: PostDto = {
                    ...createdPost,
                    postType: createdPost.postType || (newPostType.toUpperCase() as PostType),
                    authorId: createdPost.authorId || user?.id,
                    authorName: createdPost.authorName || user?.fullName || 'Anonim',
                    authorUserType: (createdPost.authorUserType || user?.userType || UserType.VISITOR) as any,
                    imageUrl: createdPost.imageUrl || imageUrl,
                    pollOptions: (createdPost.pollOptions && createdPost.pollOptions.length > 0)
                        ? createdPost.pollOptions
                        : (createdPost as any).options || (createdPost as any).poll_options || optionsFromReq
                };
                setPosts([completePost, ...posts]);
                setNewPostContent('');
                setNewPostType('discussion');
                setPollQuestion('');
                setPollOptions(['', '']);
                setPollDurationHours(24);
                setSelectedImages([]);
                setIsAnonymous(false);
                setIsWriteModalVisible(false);
            }
        } catch (error: any) {
            if (error?.code === 'phone_verification_required') {
                // Close the write modal first — iOS won't present a new native Modal while
                // another is still mid-dismiss-animation, so setting both visible states in
                // the same tick can silently drop the second presentation entirely. Give the
                // dismiss animation time to finish before showing the next one (same pattern
                // used elsewhere in this file for stacked alerts/modals).
                setIsWriteModalVisible(false);
                setTimeout(() => setShowVerifyPhoneModal(true), 400);
            } else {
                Alert.alert('Gönderi Oluşturulamadı', error?.message || 'Bir hata oluştu.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const performDelete = async (postId: string) => {
        try {
            await forumApi.deletePost(postId);
            setPosts(posts.filter(p => p.id !== postId));
            if (selectedPost && selectedPost.id === postId) {
                setIsDetailModalVisible(false);
            } else {
                setReplies(replies.filter(r => r.id !== postId));
                if (selectedPost) {
                    // Update both the feed list's copy of this post AND the separate
                    // selectedPost state the detail modal's header count reads from —
                    // they're two different state objects, so updating only one left the
                    // comment count badge stuck at its pre-delete value.
                    const decremented = Math.max(0, selectedPost.replyCount - 1);
                    setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, replyCount: decremented } : p));
                    setSelectedPost({ ...selectedPost, replyCount: decremented });
                }
            }
        } catch (error: any) {
            setTimeout(() => {
                Alert.alert(t('common.error', { defaultValue: 'Hata' }), error?.message || 'Silinirken bir hata oluştu.');
            }, 300);
        }
    };

    const handleDeletePost = (postId: string) => {
        if (!postId) return;

        if (isDetailModalVisible) {
            setDeleteConfirmState({ visible: true, id: postId });
            return;
        }

        Alert.alert(
            t('forum.deletePostTitle', { defaultValue: 'Gönderiyi Sil' }),
            t('forum.deletePostConfirm', { defaultValue: 'Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' }),
            [
                { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                { text: t('common.delete', { defaultValue: 'Sil' }), style: 'destructive', onPress: () => performDelete(postId) }
            ]
        );
    };

    const handleEditPost = (post: PostDto) => {
        if (post.postType === 'POLL') {
            Alert.alert('Hata', 'Anketler düzenlenemez.');
            return;
        }
        setEditingPostId(post.id);
        setNewPostContent(post.content);
        setNewPostType(post.postType.toLowerCase());
        setIsAnonymous((post as any).anonymous || false);
        setSelectedImages(post.imageUrl ? post.imageUrl.split(',').map(url => url.trim()).filter(Boolean) : []);

        if (isDetailModalVisible) {
            setIsDetailModalVisible(false);
            setTimeout(() => {
                setIsWriteModalVisible(true);
            }, 400);
        } else {
            setIsWriteModalVisible(true);
        }
    };

    const handleEditReply = (reply: PostDto) => {
        setEditingReplyId(reply.id);
        setNewReplyContent(reply.content);
        setTimeout(() => {
            replyInputRef.current?.focus();
        }, 100);
    };

    const toggleLike = async (id: string) => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        const data = await forumApi.likePost(id);
        if (data) {
            // Update main list
            setPosts(posts.map(post => {
                if (post.id === id) {
                    return {
                        ...post,
                        isLiked: data.liked,
                        likeCount: data.likeCount
                    };
                }
                return post;
            }));

            // Update selectedPost state if it's currently open
            if (selectedPost && selectedPost.id === id) {
                setSelectedPost({
                    ...selectedPost,
                    isLiked: data.liked,
                    likeCount: data.likeCount
                });
            }
        }
    };

    const performReport = async (id: string) => {
        try {
            await forumApi.reportPost(id, "User reported via mobile app");
            setTimeout(() => {
                Alert.alert(t('common.success', { defaultValue: 'Başarılı' }), t('forum.reportSuccess', { defaultValue: 'Şikayetiniz alındı. Teşekkürler.' }));
            }, 300);
        } catch (error: any) {
            setTimeout(() => {
                Alert.alert(t('common.error', { defaultValue: 'Hata' }), error?.message || 'Şikayet edilirken bir sorun oluştu.');
            }, 300);
        }
    };

    const handleReport = (id: string) => {
        setReportConfirmState({ visible: true, id });
    };

    const isPollEnded = (pollEndsAt?: string): boolean => {
        if (!pollEndsAt) return false;
        return new Date(pollEndsAt) < new Date();
    };

    const getPollCountdown = (pollEndsAt?: string): string | null => {
        const isEn = i18n.language.startsWith('en');
        if (!pollEndsAt) return isEn ? 'Unlimited' : 'Süresiz';
        const diff = new Date(pollEndsAt).getTime() - Date.now();
        if (diff <= 0) return isEn ? 'Poll Ended' : 'Anket Sona Erdi';
        const totalMinutes = Math.floor(diff / 60000);
        if (totalMinutes < 60) return isEn ? `${totalMinutes}m left` : `${totalMinutes} dk kaldı`;
        const hours = Math.floor(diff / 3600000);
        if (hours < 24) return isEn ? `${hours}h left` : `${hours} saat kaldı`;
        const days = Math.floor(hours / 24);
        if (days > 365) return isEn ? 'Unlimited' : 'Süresiz';
        return isEn ? `${days}d left` : `${days} gün kaldı`;
    };

    const renderPost = ({ item }: { item: PostDto }) => {
        const isMyPost = Boolean(user?.id && item.authorId === user.id);
        const isPostAnonymous = Boolean((item as any).isAnonymous || (item as any).anonymous);
        const roleInfo = getRoleInfo(item.authorUserType);
        const tagColor = roleInfo.color;
        const authorName = isPostAnonymous
            ? (isMyPost
                ? (i18n.language.startsWith('en') ? 'You (Anonymous)' : 'Siz (Anonim)')
                : t('forum.anonymous', { defaultValue: i18n.language.startsWith('en') ? 'Anonymous' : 'Anonim' }))
            : isMyPost
            ? (i18n.language.startsWith('en') ? 'You' : 'Siz')
            : (item.authorName || t('forum.anonymous', { defaultValue: 'Anonim' }));
        const roleName = roleInfo.name;

        const renderRightActions = (progress: any, dragX: any, swipeable?: any) => {
            return (
                <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                    {isMyPost ? (
                        <TouchableOpacity
                            style={{ height: '100%', backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 12 }}
                            activeOpacity={0.7}
                            onPress={() => { swipeable?.close(); handleDeletePost(item.id); }}
                        >
                            <IconSymbol name="trash.fill" size={22} color="#FFF" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={{ height: '100%', backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 12 }}
                            activeOpacity={0.7}
                            onPress={() => { swipeable?.close(); handleReport(item.id); }}
                        >
                            <IconSymbol name="exclamationmark.triangle.fill" size={22} color="#FFF" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.report', { defaultValue: 'Bildir' })}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        };

        return (
            <View style={styles.postWrapper}>
                <Swipeable renderRightActions={renderRightActions} containerStyle={{ backgroundColor: isDark ? '#121212' : '#FFFFFF', borderRadius: s(16) }}>
                <TouchableOpacity
                    style={[
                        styles.bubbleContainer,
                        isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' },
                        isMyPost && (isDark ? { borderLeftWidth: 4, borderLeftColor: '#60A5FA' } : { borderLeftWidth: 4, borderLeftColor: '#3B82F6' })
                    ]}
                    activeOpacity={1}
                    onPress={() => {
                        if (!isLoggedIn) {
                            router.push('/login');
                        } else {
                            openPostDetails(item);
                        }
                    }}
                >
                    <View style={styles.bubbleHeader}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {(() => {
                                const isAnon = isPostAnonymous || authorName?.toLowerCase() === 'anonim' || authorName?.toLowerCase() === 'anonymous';
                                const postAuthorColor = isAnon ? '#64748B' : (isMyPost ? (isDark ? '#60A5FA' : '#2563EB') : getUserAvatarColor(item.authorId || item.authorName, item.authorName, isAnon));
                                return (
                                    <Text style={[styles.authorName, { color: postAuthorColor }]}>~ {authorName}</Text>
                                );
                            })()}
                            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '15', borderColor: roleInfo.color + '30' }]}>
                                {roleInfo.icon ? (
                                    <IconSymbol name={roleInfo.icon as any} size={10} color={roleInfo.color} />
                                ) : (
                                    <View style={[styles.roleDot, { backgroundColor: roleInfo.color }]} />
                                )}
                                <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.name}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.islandBadge, isDark && { backgroundColor: '#1C1C1E' }]}>
                                <IconSymbol name="mappin" size={10} color={isDark ? "#CBD5E1" : "#64748B"} />
                                <Text style={[styles.islandBadgeText, isDark && { color: '#CBD5E1' }]}>
                                    {t('places.' + getIslandName(item.island), { defaultValue: getIslandName(item.island) })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.postCardBody}>
                        <Text style={[styles.contentText, isDark && { color: '#F8FAFC' }]}>
                            {translatedPosts[item.id]?.isTranslated ? translatedPosts[item.id].text : item.content}
                        </Text>
                        {item.content && item.content.trim().length > 3 && (
                            <TouchableOpacity
                                onPress={() => handleToggleTranslation(item.id, item.content)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 4, alignSelf: 'flex-start' }}
                                activeOpacity={0.7}
                            >
                                {translatedPosts[item.id]?.loading ? (
                                    <ActivityIndicator size="small" color="#3B82F6" />
                                ) : (
                                    <>
                                        <IconSymbol name="globe" size={13} color="#3B82F6" />
                                        <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '700' }}>
                                            {translatedPosts[item.id]?.isTranslated
                                                ? (i18n.language.startsWith('en') ? 'See Original' : 'Orijinalini Gör')
                                                : (i18n.language.startsWith('en') ? 'Translate to English' : 'İngilizceye Çevir')}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        {(() => {
                            const isPoll = (item.postType as any) === PostType.POLL || (item.postType as any) === 'POLL' || String(item.postType)?.toUpperCase() === 'POLL';
                            const pollOpts = item.pollOptions || (item as any).options || (item as any).poll_options;
                            if (!isPoll || !pollOpts || pollOpts.length === 0) return null;

                            const ended = isPollEnded(item.pollEndsAt);
                            const countdown = getPollCountdown(item.pollEndsAt);
                            const totalVotes = pollOpts.reduce((sum: number, opt: any) => sum + getPollVoteCount(opt), 0);

                            return (
                                <View style={styles.renderedPollContainer}>
                                    {pollOpts.map((option: any, optIdx: number) => {
                                        const optVotes = getPollVoteCount(option);
                                        const userVotedId = votedPolls[item.id] || (item as any).votedOptionId || (item as any).voted_option_id || (item as any).userVotedOptionId;
                                        const isOptionVoted = Boolean(
                                            optVotes > 0 &&
                                            (userVotedId
                                                ? (option.id && String(option.id) === String(userVotedId))
                                                : (option.isVoted || option.voted || option.is_voted || option.selected))
                                        );
                                        const optText = option.text || option.optionText || option.title || '';
                                        const optPercent = totalVotes > 0 ? ((optVotes / totalVotes) * 100) : 0;
                                        return (
                                        <TouchableOpacity
                                            key={option.id || `opt-${optIdx}`}
                                            style={[
                                                styles.renderedPollOption,
                                                isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' },
                                                ended && { opacity: 0.6 },
                                                isOptionVoted && (isDark ? { backgroundColor: '#064E3B', borderWidth: 1.5, borderColor: '#10B981' } : { backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#10B981' })
                                            ]}
                                            onPress={() => !ended && handlePollVote(item.id, option.id)}
                                            activeOpacity={ended ? 1 : 0.7}
                                            disabled={ended}
                                        >
                                            <View style={[styles.pollProgressFill, Math.round(optPercent) >= 100 ? { right: 0 } : { width: `${optPercent}%` }, { backgroundColor: isOptionVoted ? '#10B98140' : tagColor + '40' }]} />
                                            <View style={styles.pollOptionTextRow}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    {isOptionVoted && <IconSymbol name="checkmark.circle.fill" size={16} color={isDark ? "#34D399" : "#059669"} />}
                                                    <Text style={[styles.renderedPollOptionText, isDark && { color: '#F8FAFC' }, isOptionVoted && { color: isDark ? '#34D399' : '#059669', fontWeight: '800' }]}>{optText}</Text>
                                                </View>
                                                <Text style={[styles.pollPercentText, isDark && { color: '#CBD5E1' }, isOptionVoted && { color: isDark ? '#34D399' : '#059669', fontWeight: '800' }]}>{Math.round(optPercent)}%</Text>
                                            </View>
                                        </TouchableOpacity>
                                        );
                                    })}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                        <Text style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#94A3B8', fontWeight: '600' }}>
                                            {i18n.language.startsWith('en')
                                                ? `Total vote: ${totalVotes}`
                                                : `Toplam oy: ${totalVotes}`}
                                        </Text>
                                        {countdown && (
                                            <View style={[styles.pollCountdownBadge, ended && styles.pollEndedBadge, { marginTop: 0 }]}>
                                                <IconSymbol name={ended ? "checkmark.circle.fill" : "clock.fill"} size={11} color={ended ? "#EF4444" : "#F59E0B"} />
                                                <Text style={[styles.pollCountdownText, ended && styles.pollEndedText]}>{countdown}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })()}
                        {item.imageUrl && (
                            <View style={styles.bubbleImageWrapper}>
                                <Image source={{ uri: resolveImageUrl(item.imageUrl.split(',')[0].trim()) }} style={styles.postImage} resizeMode="cover" />
                            </View>
                        )}
                    </View>

                    <View style={styles.bubbleFooter}>
                        <View style={styles.interactionGroup}>
                            <TouchableOpacity
                                style={styles.chatInteraction}
                                onPress={() => toggleLike(item.id)}
                            >
                                <IconSymbol
                                    name={item.isLiked ? "heart.fill" : "heart"}
                                    size={15}
                                    color={item.isLiked ? "#EF4444" : (isDark ? "#CBD5E1" : "#64748B")}
                                />
                                <Text style={[styles.interactionCount, item.isLiked ? { color: "#EF4444" } : (isDark ? { color: "#CBD5E1" } : { color: "#64748B" })]}>
                                    {item.likeCount > 0 ? item.likeCount : '0'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.chatInteraction}
                                onPress={() => {
                                    if (!isLoggedIn) {
                                        router.push('/login');
                                    } else {
                                        openPostDetails(item, true);
                                    }
                                }}
                            >
                                <IconSymbol name="bubble.left" size={14} color={isDark ? "#CBD5E1" : "#64748B"} />
                                <Text style={[styles.interactionCount, isDark ? { color: "#CBD5E1" } : { color: "#64748B" }]}>
                                    {item.replyCount > 0 ? item.replyCount : '0'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.chatTime, isDark && { color: '#CBD5E1' }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                </TouchableOpacity>
                </Swipeable>
            </View>
        );
    };

    return (
        <SwipeNavigation leftRoute="/(tabs)/explore/island/ilanlar">
        <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={[styles.header, { paddingTop: insets.top + 10 }, isDark && { backgroundColor: '#000000', borderBottomColor: '#1C1C1E' }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDark && { backgroundColor: '#1C1C1E' }]}>
                    <IconSymbol name="chevron.left" size={24} color={isDark ? "#FFFFFF" : "#1E293B"} />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>{t('common.community')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity onPress={handleInviteFriends} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <IconSymbol name="person.badge.plus" size={24} color={isDark ? "#FFFFFF" : "#1E293B"} />
                    </TouchableOpacity>
                </View>
            </View>
            {!isLoggedIn ? (
                <View style={[{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }, isDark && { backgroundColor: '#000000' }]}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <IconSymbol name="person.crop.circle.badge.exclamationmark" size={64} color="#CBD5E1" />
                    </View>
                    <Text style={[{ fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 10 }, isDark && { color: '#FFFFFF' }]}>
                        {t('profile.notLoggedInTitle', { defaultValue: i18n.language.startsWith('en') ? 'Not Logged In' : 'Giriş Yapılmadı' })}
                    </Text>
                    <Text style={[{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 30 }, isDark && { color: '#94A3B8' }]}>
                        {i18n.language.startsWith('en') ? 'You must log in to view community posts and join the discussion.' : 'Topluluktaki mesajları görmek ve tartışmaya katılmak için giriş yapmalısınız.'}
                    </Text>
                    <TouchableOpacity
                        style={{ backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignSelf: 'center' }}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                            {t('common.login', { defaultValue: i18n.language.startsWith('en') ? 'Log In' : 'Giriş Yap' })}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={[styles.tabsWrapper, isDark && { backgroundColor: '#000000' }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabsContainer}
                            bounces={true}
                        >
                            {tabs.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <TouchableOpacity
                                        key={tab.id}
                                        style={[styles.tabItem, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }, isActive && (isDark ? { backgroundColor: '#1E3A8A', borderColor: '#3B82F6' } : styles.activeTabItem)]}
                                        onPress={() => setActiveTab(tab.id)}
                                        activeOpacity={0.7}
                                    >
                                        <IconSymbol
                                            name={tab.icon}
                                            size={12}
                                            color={isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569')}
                                        />
                                        <Text style={[styles.tabLabel, isDark && { color: '#94A3B8' }, isActive && styles.activeTabLabel]}>
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                    <FlatList
                        data={posts.filter(post => {
                            if (activeTab === 'polls') return post.postType === PostType.POLL;
                            if (activeTab === 'complaints') return post.postType === PostType.COMPLAINT;
                            if (activeTab === 'info') return post.postType === PostType.INFO;
                            return true;
                        })}
                        renderItem={renderPost}
                        keyExtractor={item => item.id}
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.listContent,
                            posts.filter(post => {
                                if (activeTab === 'polls') return post.postType === PostType.POLL;
                                if (activeTab === 'complaints') return post.postType === PostType.COMPLAINT;
                                if (activeTab === 'info') return post.postType === PostType.INFO;
                                return true;
                            }).length === 0 && { flexGrow: 1, justifyContent: 'center', paddingBottom: 0 }
                        ]}
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={() => {
                            if (!isLoadingMore) return null;
                            return (
                                <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="small" color="#3B82F6" />
                                </View>
                            );
                        }}
                        ListEmptyComponent={isLoading ? (
                            <ActivityIndicator size="large" color="#3B82F6" />
                        ) : (
                            <EmptyState
                                icon="bubble.left.and.bubble.right"
                                title={t('forum.emptyTitle', { defaultValue: i18n.language.startsWith('en') ? 'No Posts Yet' : 'Henüz Gönderi Yok' })}
                                subtitle={t('forum.emptySubtitle', { defaultValue: i18n.language.startsWith('en') ? 'Would you like to send the first message to the community? Share something now!' : 'Topluluğa ilk mesajı sen göndermek ister misin? Hemen bir paylaşım yap!' })}
                                color="#3B82F6"
                                style={{ marginTop: -140 }}
                            />
                        )}
                    />
                    <TouchableOpacity
                        style={[styles.fab, { bottom: 20, backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}
                        onPress={() => {
                            if (!isLoggedIn) {
                                setShowLoginPrompt(true);
                                return;
                            }
                            setIsWriteModalVisible(true);
                        }}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.fabGradient, isDark ? { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' } : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }]}>
                            <IconSymbol name="plus" size={32} color="#3B82F6" />
                        </View>
                    </TouchableOpacity>
                </>
            )}
            <Modal
                visible={isWriteModalVisible}
                animationType="none"
                transparent={true}
                statusBarTranslucent={true}
                navigationBarTranslucent={true}
                onRequestClose={handleCloseWriteModal}
                onShow={() => {
                    writeModalSlideAnim.setValue(Dimensions.get('window').height);
                    Animated.timing(writeModalSlideAnim, {
                        toValue: 0,
                        duration: 150,
                        useNativeDriver: true,
                    }).start();
                    setTimeout(() => {
                        postInputRef.current?.focus();
                    }, 50);
                }}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={handleCloseWriteModal}
                        />
                        <Animated.View style={[styles.modalContainer, isDark && { backgroundColor: '#000000' }, { flex: 0, height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, transform: [{ translateY: writeModalSlideAnim }] }]}>
                            <View style={[styles.modalHeader, { paddingTop: 24 }, isDark && { backgroundColor: '#000000', borderBottomColor: '#1C1C1E' }]}>
                                <TouchableOpacity onPress={handleCloseWriteModal} style={styles.modalHeaderButton}>
                            <IconSymbol name="xmark" size={24} color={isDark ? "#94A3B8" : "#64748B"} />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center', marginLeft: 55 }}>
                            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{editingPostId ? t('common.edit', { defaultValue: i18n.language.startsWith('en') ? 'Edit' : 'Düzenle' }) : t('forum.createPost')}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleCreatePost}
                            style={[styles.premiumPublishBtn, isPublishActive && styles.activePremiumPublishBtn, !isPublishActive && { opacity: 0.5 }]}
                            disabled={!isPublishActive}
                        >
                            {isUploading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.premiumPublishText}>{t('common.send', { defaultValue: 'Paylaş' })}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    <KeyboardAwareScrollView style={[styles.modalBody, isDark && { backgroundColor: '#000000' }]} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={60} keyboardShouldPersistTaps="handled">
                        <View style={styles.formSection}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('forum.islandSelection')}</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {islands.map(island => (
                                    <TouchableOpacity
                                        key={island}
                                        style={[styles.writeChip, isDark && { backgroundColor: '#000000', borderColor: '#262626' }, { flex: 1, alignItems: 'center', paddingHorizontal: 0 }, selectedIsland === island && styles.activeWriteChipPink]}
                                        onPress={() => setSelectedIsland(island)}
                                    >
                                        <Text style={[styles.writeChipText, isDark && { color: '#E5E5E5' }, { fontSize: 13 }, selectedIsland === island && styles.activeWriteChipPinkText]}>{t('places.' + island, { defaultValue: island })}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.formSection}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('forum.postType')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer} keyboardShouldPersistTaps="handled">
                                {postTypes.map(type => {
                                    const isSelected = newPostType === type.id;
                                    return (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={[
                                                styles.writeChip,
                                                !isSelected && (isDark
                                                    ? { backgroundColor: '#172554', borderColor: '#1E40AF' }
                                                    : { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }),
                                                isDark && isSelected && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                                                isSelected && styles.activeWriteChipPink
                                            ]}
                                            onPress={() => setNewPostType(type.id)}
                                        >
                                            <Text style={[
                                                styles.writeChipText,
                                                !isSelected && (isDark
                                                    ? { color: '#93C5FD' }
                                                    : { color: '#2563EB' }),
                                                isSelected && styles.activeWriteChipPinkText
                                            ]}>
                                                {type.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        <View style={[styles.writeOptionsDivider, isDark && { backgroundColor: '#1C1C1E' }]} />
                        <View style={styles.formSection}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }, { marginBottom: 0 }]}>{newPostType === 'poll' ? t('forum.pollTitle') : t('forum.yourMessage')}</Text>
                                <Text style={{ color: currentPostContentLength >= (newPostType === 'poll' ? POLL_QUESTION_MAX_LENGTH : MAX_POST_LENGTH) ? '#EF4444' : (isDark ? '#94A3B8' : '#64748B'), fontSize: 12, fontWeight: '700' }}>
                                    {currentPostContentLength}/{newPostType === 'poll' ? POLL_QUESTION_MAX_LENGTH : MAX_POST_LENGTH}
                                </Text>
                            </View>
                            <TextInput
                                style={[styles.premiumTextInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }, newPostType === 'poll' && { minHeight: 60, height: undefined, paddingVertical: 16, paddingHorizontal: 16, textAlign: 'left', lineHeight: 20 }]}
                                placeholder={newPostType === 'poll' ? t('forum.pollPlaceholder') : t('forum.whatsOnYourMind')}
                                placeholderTextColor={isDark ? '#64748B' : '#CBD5E1'}
                                multiline={newPostType !== 'poll'}
                                maxLength={newPostType === 'poll' ? POLL_QUESTION_MAX_LENGTH : MAX_POST_LENGTH}
                                value={newPostType === 'poll' ? pollQuestion : newPostContent}
                                onChangeText={newPostType === 'poll' ? setPollQuestion : setNewPostContent}
                                ref={postInputRef}
                                textAlignVertical={newPostType === 'poll' ? "center" : "top"}
                            />
                            {postContentTooShort && (
                                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>
                                    En az {MIN_POST_LENGTH} karakter gerekli ({currentPostContentLength}/{MIN_POST_LENGTH})
                                </Text>
                            )}
                        </View>
                        {newPostType !== 'poll' && ENABLE_PHOTO_UPLOAD && (
                            <View style={styles.formSection}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }, { marginBottom: 0 }]}>
                                        {i18n.language.startsWith('en') ? 'PHOTOS' : 'FOTOĞRAFLAR'}
                                    </Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: selectedImages.length >= 3 ? '#EF4444' : (isDark ? '#94A3B8' : '#64748B') }}>
                                        {selectedImages.length}/3
                                    </Text>
                                </View>
                                {selectedImages.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }} keyboardShouldPersistTaps="handled">
                                        {selectedImages.map((uri, index) => (
                                            <View key={index} style={[styles.imagePreviewContainer, { marginRight: 10 }]}>
                                                <Image source={{ uri }} style={styles.imagePreview} />
                                                <TouchableOpacity
                                                    style={styles.removeImageBtn}
                                                    onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                                                >
                                                    <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        {selectedImages.length < 3 && (
                                            <TouchableOpacity
                                                style={[styles.addPhotoBtn, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }, { width: 100, height: 100, borderRadius: 14, marginTop: 0 }]}
                                                onPress={pickImage}
                                            >
                                                <IconSymbol name="plus" size={28} color={isDark ? "#94A3B8" : "#94A3B8"} />
                                            </TouchableOpacity>
                                        )}
                                    </ScrollView>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.addPhotoBtn, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }, { marginTop: 0, marginBottom: 10, height: 100, borderRadius: 14 }]}
                                        onPress={pickImage}
                                    >
                                        <IconSymbol name="photo.fill" size={28} color={isDark ? "#94A3B8" : "#94A3B8"} />
                                        <Text style={[styles.addPhotoText, { color: '#94A3B8', fontSize: 14 }]}>{t('forum.addPhoto')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        {newPostType === 'poll' && (
                            <>
                            <View style={styles.formSection}>
                                <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('forum.options')}</Text>
                                {pollOptions.map((opt, index) => (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        <TextInput
                                            style={[styles.premiumTextInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }, { flex: 1, minHeight: 50, height: undefined, paddingVertical: 14, paddingHorizontal: 15, fontSize: 16, textAlign: 'left', lineHeight: 20 }]}
                                            placeholder={t('forum.optionPlaceholder', { number: index + 1 })}
                                            placeholderTextColor={isDark ? '#64748B' : '#CBD5E1'}
                                            textAlignVertical="center"
                                            value={opt}
                                            onChangeText={(text) => {
                                                const newOptions = [...pollOptions];
                                                newOptions[index] = text;
                                                setPollOptions(newOptions);
                                            }}
                                        />
                                        {pollOptions.length > 2 && (
                                            <TouchableOpacity
                                                style={{ padding: 10, marginLeft: 5 }}
                                                onPress={() => {
                                                    const newOptions = pollOptions.filter((_, i) => i !== index);
                                                    setPollOptions(newOptions);
                                                }}
                                            >
                                                <IconSymbol name="trash.fill" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                                {pollOptions.length < 5 && (
                                    <TouchableOpacity
                                        style={{ marginTop: 10, alignSelf: 'flex-start', paddingVertical: 5 }}
                                        onPress={() => setPollOptions([...pollOptions, ''])}
                                    >
                                        <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 15 }}>
                                            {i18n.language.startsWith('en') ? '+ Add Option' : '+ Yeni Seçenek Ekle'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.formSection}>
                                <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('forum.pollDuration')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer} keyboardShouldPersistTaps="handled">
                                    {[
                                        { value: 24, label: i18n.language.startsWith('en') ? '1 Day' : '1 Gün' },
                                        { value: 72, label: i18n.language.startsWith('en') ? '3 Days' : '3 Gün' },
                                        { value: 168, label: i18n.language.startsWith('en') ? '7 Days' : '7 Gün' },
                                        { value: 0, label: i18n.language.startsWith('en') ? 'Unlimited' : 'Süresiz' },
                                    ].map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[styles.writeChip, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }, pollDurationHours === opt.value && styles.activeWriteChipPink]}
                                            onPress={() => setPollDurationHours(opt.value)}
                                        >
                                            <Text style={[styles.writeChipText, isDark && { color: '#CBD5E1' }, pollDurationHours === opt.value && styles.activeWriteChipPinkText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                            </>
                        )}
                        <View style={styles.formSection}>
                            <TouchableOpacity
                                style={[styles.anonToggle, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E', borderWidth: 1 }]}
                                onPress={() => setIsAnonymous(!isAnonymous)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.anonCheckbox, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }, isAnonymous && styles.anonCheckboxActive]}>
                                    {isAnonymous && <IconSymbol name="checkmark" size={14} color="#fff" />}
                                </View>
                                <View>
                                    <Text style={[styles.anonLabel, isDark && { color: '#FFFFFF' }]}>{t('forum.shareAnonymously')}</Text>
                                    <Text style={[styles.anonSubtext, isDark && { color: '#94A3B8' }]}>{t('forum.anonymousDesc')}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                        </KeyboardAwareScrollView>
                        </Animated.View>
                    </View>

            </Modal>
            <Modal
                visible={isDetailModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                transparent={true}
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => setIsDetailModalVisible(false)}
                onShow={() => {
                    if (shouldFocusReply) {
                        setTimeout(() => replyInputRef.current?.focus(), 150);
                    }
                }}
            >
                <View style={[styles.modalContainer, { paddingTop: insets.top }, isDark && { backgroundColor: '#000000' }]}>
                    <View style={[styles.modalHeader, isDark && { backgroundColor: '#000000', borderBottomWidth: 0 }]}>
                        <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => setIsDetailModalVisible(false)} style={styles.modalHeaderButton}>
                                <IconSymbol name="chevron.down" size={24} color={isDark ? "#94A3B8" : "#64748B"} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>{t('forum.postDetails')}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                    </View>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={0}
                    >
                        <View style={styles.modalBody}>
                            <ScrollView
                                ref={commentsScrollRef}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                onContentSizeChange={() => {
                                    if (isKeyboardVisible) {
                                        commentsScrollRef.current?.scrollToEnd({ animated: true });
                                    }
                                }}
                            >
                            {selectedPost && (
                                <View style={[styles.detailPostContainer, isDark && { backgroundColor: '#000000', borderBottomColor: '#1F2937' }]}>
                                    <View style={styles.postCardHeader}>
                                        <View style={styles.postAuthorInfo}>
                                             {(() => {
                                                 const isDetailAnon = Boolean((selectedPost as any).isAnonymous || (selectedPost as any).anonymous || selectedPost.authorName?.toLowerCase() === 'anonim' || selectedPost.authorName?.toLowerCase() === 'anonymous');
                                                 const detailAuthorColor = isDetailAnon ? '#64748B' : (selectedPost.authorId === user?.id
                                                     ? (isDark ? '#60A5FA' : '#2563EB')
                                                     : getUserAvatarColor(selectedPost.authorId || (selectedPost as any).author?.id || selectedPost.authorName, selectedPost.authorName, isDetailAnon));
                                                 return (
                                                     <>
                                                         <LinearGradient
                                                             colors={[detailAuthorColor, detailAuthorColor + '80']}
                                                             style={styles.avatar}
                                                         >
                                                             <IconSymbol name="person.fill" size={24} color="#fff" />
                                                         </LinearGradient>
                                                         <View style={{ flex: 1 }}>
                                                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                 <Text style={[styles.authorName, { color: detailAuthorColor }]}>
                                                                     ~ {isDetailAnon
                                                                         ? (selectedPost.authorId === user?.id
                                                                             ? (i18n.language.startsWith('en') ? 'You (Anonymous)' : 'Siz (Anonim)')
                                                                             : t('forum.anonymous', { defaultValue: i18n.language.startsWith('en') ? 'Anonymous' : 'Anonim' }))
                                                                         : selectedPost.authorId === user?.id
                                                                         ? (i18n.language.startsWith('en') ? 'You' : 'Siz')
                                                                         : (selectedPost.authorName || t('forum.anonymous', { defaultValue: 'Anonim' }))}
                                                                 </Text>
                                                                 <View style={[styles.roleBadge, { backgroundColor: getTagColor(selectedPost.authorUserType) + '10', borderColor: getTagColor(selectedPost.authorUserType) + '20' }]}>
                                                                     {getRoleInfo(selectedPost.authorUserType).icon ? (
                                                                         <IconSymbol name={getRoleInfo(selectedPost.authorUserType).icon as any} size={10} color={getTagColor(selectedPost.authorUserType)} />
                                                                     ) : (
                                                                         <View style={[styles.roleDot, { backgroundColor: getTagColor(selectedPost.authorUserType) }]} />
                                                                     )}
                                                                     <Text style={[styles.roleText, { color: getTagColor(selectedPost.authorUserType) }]}>
                                                                         {getRoleInfo(selectedPost.authorUserType).name}
                                                                     </Text>
                                                                 </View>
                                                             </View>
                                                             <Text style={[styles.timeText, isDark && { color: '#94A3B8' }]}>{formatTime(selectedPost.createdAt)}</Text>
                                                         </View>
                                                         {(selectedPost.authorId === user?.id || (selectedPost as any).author?.id === user?.id) ? (
                                                             <TouchableOpacity
                                                                 style={{ alignSelf: 'center', marginLeft: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4, backgroundColor: '#EF4444' }}
                                                                 onPress={() => handleDeletePost(selectedPost.id)}
                                                             >
                                                                 <IconSymbol name="trash.fill" size={14} color="#FFFFFF" />
                                                                 <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                                                             </TouchableOpacity>
                                                         ) : (
                                                             <TouchableOpacity
                                                                 style={{ alignSelf: 'center', marginLeft: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4, backgroundColor: '#EF4444' }}
                                                                 onPress={() => handleReport(selectedPost.id)}
                                                             >
                                                                 <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#FFFFFF" />
                                                                 <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{t('common.report', { defaultValue: 'Bildir' })}</Text>
                                                             </TouchableOpacity>
                                                         )}
                                                     </>
                                                 );
                                             })()}
                                        </View>
                                    </View>
                                    <Text style={[styles.detailContentText, isDark && { color: '#F1F5F9' }]}>
                                        {translatedPosts[selectedPost.id]?.isTranslated ? translatedPosts[selectedPost.id].text : selectedPost.content}
                                    </Text>
                                    {selectedPost.content && selectedPost.content.trim().length > 3 && (
                                        <TouchableOpacity
                                            onPress={() => handleToggleTranslation(selectedPost.id, selectedPost.content)}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, marginBottom: 8, alignSelf: 'flex-start' }}
                                            activeOpacity={0.7}
                                        >
                                            {translatedPosts[selectedPost.id]?.loading ? (
                                                <ActivityIndicator size="small" color="#3B82F6" />
                                            ) : (
                                                <>
                                                    <IconSymbol name="globe" size={14} color="#3B82F6" />
                                                    <Text style={{ fontSize: 13, color: '#3B82F6', fontWeight: '700' }}>
                                                        {translatedPosts[selectedPost.id]?.isTranslated
                                                            ? (i18n.language.startsWith('en') ? 'See Original' : 'Orijinalini Gör')
                                                            : 'Translate to English'}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    {(() => {
                                        const isPoll = (selectedPost.postType as any) === PostType.POLL || (selectedPost.postType as any) === 'POLL' || String(selectedPost.postType)?.toUpperCase() === 'POLL';
                                        const pollOpts = selectedPost.pollOptions || (selectedPost as any).options || (selectedPost as any).poll_options;
                                        if (!isPoll || !pollOpts || pollOpts.length === 0) return null;

                                        const ended = isPollEnded(selectedPost.pollEndsAt);
                                        const countdown = getPollCountdown(selectedPost.pollEndsAt);
                                        const totalVotes = pollOpts.reduce((sum: number, opt: any) => sum + getPollVoteCount(opt), 0);

                                        return (
                                            <View style={[styles.renderedPollContainer, { marginTop: 15, marginBottom: 5 }]}>
                                                {pollOpts.map((option: any, optIdx: number) => {
                                                    const userVotedId = votedPolls[selectedPost.id] || (selectedPost as any).votedOptionId || (selectedPost as any).voted_option_id || (selectedPost as any).userVotedOptionId;
                                                    const isOptionVoted = userVotedId
                                                        ? Boolean(option.id && String(option.id) === String(userVotedId))
                                                        : Boolean(option.isVoted || option.voted || option.is_voted || option.selected);
                                                    const optText = option.text || option.optionText || option.title || '';
                                                    const optVotes = getPollVoteCount(option);
                                                    const optPercent = totalVotes > 0 ? ((optVotes / totalVotes) * 100) : 0;
                                                    return (
                                                    <TouchableOpacity
                                                        key={option.id || `opt-${optIdx}`}
                                                        style={[
                                                            styles.renderedPollOption,
                                                            isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' },
                                                            ended && { opacity: 0.6 },
                                                            isOptionVoted && (isDark ? { backgroundColor: '#064E3B', borderWidth: 1.5, borderColor: '#10B981' } : { backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#10B981' })
                                                        ]}
                                                        onPress={() => !ended && handlePollVote(selectedPost.id, option.id)}
                                                        activeOpacity={ended ? 1 : 0.7}
                                                        disabled={ended}
                                                    >
                                                        <View style={[styles.pollProgressFill, Math.round(optPercent) >= 100 ? { right: 0 } : { width: `${optPercent}%` }, { backgroundColor: isOptionVoted ? '#10B98140' : getTagColor(selectedPost.authorUserType) + '40' }]} />
                                                        <View style={styles.pollOptionTextRow}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                {isOptionVoted && <IconSymbol name="checkmark.circle.fill" size={16} color={isDark ? "#34D399" : "#059669"} />}
                                                                <Text style={[styles.renderedPollOptionText, isDark && { color: '#F8FAFC' }, isOptionVoted && { color: isDark ? '#34D399' : '#059669', fontWeight: '800' }]}>{optText}</Text>
                                                            </View>
                                                            <Text style={[styles.pollPercentText, isDark && { color: '#CBD5E1' }, isOptionVoted && { color: isDark ? '#34D399' : '#059669', fontWeight: '800' }]}>{Math.round(optPercent)}%</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                    );
                                                })}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                    <Text style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#94A3B8', fontWeight: '600' }}>
                                                        {i18n.language.startsWith('en')
                                                            ? `Total vote: ${totalVotes}`
                                                            : `Toplam oy: ${totalVotes}`}
                                                    </Text>
                                                    {countdown && (
                                                        <View style={[styles.pollCountdownBadge, ended && styles.pollEndedBadge, { marginTop: 0 }]}>
                                                            <IconSymbol name={ended ? "checkmark.circle.fill" : "clock.fill"} size={11} color={ended ? "#EF4444" : "#F59E0B"} />
                                                            <Text style={[styles.pollCountdownText, ended && styles.pollEndedText]}>{countdown}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })()}
                                    {selectedPost.imageUrl && (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailImageWrapper}>
                                            {selectedPost.imageUrl.split(',').map((url: string, index: number) => (
                                                <Image
                                                    key={index}
                                                    source={{ uri: resolveImageUrl(url.trim()) }}
                                                    style={[styles.detailImage, { marginRight: 10, width: selectedPost.imageUrl.includes(',') ? 300 : '100%' }]}
                                                />
                                            ))}
                                        </ScrollView>
                                    )}
                                    <View style={[styles.detailFooter, { justifyContent: 'space-between' }]}>
                                        <View style={styles.interactionGroup}>
                                            <TouchableOpacity style={styles.interactionPill} onPress={() => toggleLike(selectedPost.id)}>
                                                <IconSymbol name={selectedPost.isLiked ? "heart.fill" : "heart"} size={20} color={selectedPost.isLiked ? "#EF4444" : (isDark ? "#CBD5E1" : "#64748B")} />
                                                <Text style={[styles.interactionCount, selectedPost.isLiked && { color: "#EF4444" }, isDark && { color: "#CBD5E1" }]}>
                                                    {selectedPost.likeCount > 0 ? selectedPost.likeCount : '0'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.interactionPill}>
                                                <IconSymbol name="bubble.left" size={20} color={isDark ? "#CBD5E1" : "#64748B"} />
                                                <Text style={[styles.interactionCount, isDark && { color: "#CBD5E1" }]}>
                                                    {selectedPost.replyCount > 0 ? selectedPost.replyCount : '0'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                            <View style={[styles.commentsSection, { flex: 1, paddingTop: 16 }, isDark && { backgroundColor: '#000000' }]}>
                                <Text style={[styles.commentsTitle, isDark && { color: '#FFFFFF' }]}>{t('forum.comments')}</Text>
                                {replies.length > 0 ? (
                                    replies.map(reply => {
                                        const renderRightActions = (progress: any, dragX: any, swipeable?: any) => {
                                            if (reply.authorId === user?.id) {
                                                return (
                                                    <TouchableOpacity onPress={() => { swipeable?.close(); handleDeletePost(reply.id); }} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                                                        <IconSymbol name="trash.fill" size={20} color="#FFF" />
                                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                                                    </TouchableOpacity>
                                                );
                                            }
                                            return (
                                                <TouchableOpacity onPress={() => { swipeable?.close(); handleReport(reply.id); }} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                                                    <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FFF" />
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.report', { defaultValue: 'Bildir' })}</Text>
                                                </TouchableOpacity>
                                            );
                                        };
                                        return (
                                        <View key={reply.id} style={{ marginBottom: 20 }}>
                                            <Swipeable renderRightActions={renderRightActions}>
                                                <View style={{ backgroundColor: isDark ? '#000000' : '#FFF', paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: isDark ? '#27272A' : '#F1F5F9' }}>
                                                    <View style={styles.replyHeader}>
                                                        <View style={[styles.replyAvatar, { backgroundColor: getUserAvatarColor(reply.authorId || reply.authorName, reply.authorName) }]}>
                                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                                                                {(reply.authorName || '?').charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                <Text style={[styles.replyAuthor, reply.authorId === user?.id && { color: isDark ? '#60A5FA' : '#2563EB' }, reply.authorId !== user?.id && isDark && { color: '#FFFFFF' }]}>
                                                                     ~ {reply.authorId === user?.id
                                                                        ? (i18n.language.startsWith('en') ? 'You' : 'Siz')
                                                                        : (reply.authorName || 'Anonim')}
                                                                </Text>
                                                            </View>
                                                            <Text style={[styles.replyTime, isDark && { color: '#94A3B8' }]}>{formatTime(reply.createdAt)}</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={[styles.replyContent, isDark && { color: '#CBD5E1' }]}>{reply.content}</Text>
                                                </View>
                                            </Swipeable>
                                        </View>
                                        );
                                    })
                                ) : (
                                    <EmptyState
                                        icon="bubble.left.and.bubble.right"
                                        title={t('forum.noComments')}
                                        subtitle={t('forum.firstComment')}
                                        color={isDark ? "#94A3B8" : "#64748B"}
                                        compact={true}
                                        style={{ marginTop: 40 }}
                                    />
                                )}
                            </View>
                        </ScrollView>
                    </View>
                    <View style={[styles.commentInputArea, { paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 12) }, isDark && { backgroundColor: '#000000', borderTopColor: '#1F2937' }]}>
                        <TextInput
                            ref={replyInputRef}
                            style={[styles.commentInput, { maxHeight: 120 }, isDark && { backgroundColor: '#18181B', color: '#FFFFFF' }]}
                            placeholder={t('forum.addComment', { defaultValue: i18n.language.startsWith('en') ? 'Add a comment...' : 'Bir yorum ekle...' })}
                            placeholderTextColor="#94A3B8"
                            multiline
                            scrollEnabled={true}
                            value={newReplyContent}
                            onChangeText={setNewReplyContent}
                            onFocus={() => {
                                commentsScrollRef.current?.scrollToEnd({ animated: true });
                                setTimeout(() => commentsScrollRef.current?.scrollToEnd({ animated: true }), 100);
                                setTimeout(() => commentsScrollRef.current?.scrollToEnd({ animated: true }), 300);
                            }}
                        />
                        <TouchableOpacity
                            style={[styles.sendCommentBtn, (!newReplyContent.trim() || isSendingReply) && { opacity: 0.5 }]}
                            onPress={handleSendReply}
                        >
                            {isSendingReply ? (
                                <ActivityIndicator size="small" color={editingReplyId ? "#10B981" : "#3B82F6"} />
                            ) : (
                                <IconSymbol name={editingReplyId ? "checkmark" : "paperplane.fill"} size={20} color={editingReplyId ? "#10B981" : "#3B82F6"} />
                            )}
                        </TouchableOpacity>
                    </View>
                    </KeyboardAvoidingView>

                    {/* Rendered as a plain overlay (not a second <Modal>) because this needs to
                        appear while the post-detail modal above is already open — iOS can
                        silently fail to present a second stacked native Modal on top of a
                        first one, regardless of presentationStyle, which is what caused the
                        delete confirmation to never actually appear on screen. */}
                    {deleteConfirmState.visible && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
                            <View style={[{ width: '85%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' }, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
                                <View style={[{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }, isDark && { backgroundColor: '#451A1A' }]}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#EF4444" />
                                </View>
                                <Text style={[{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' }, isDark && { color: '#FFFFFF' }]}>Sil</Text>
                                <Text style={[{ fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 }, isDark && { color: '#CBD5E1' }]}>Silmek istediğinize emin misiniz?</Text>
                                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                    <TouchableOpacity onPress={() => setDeleteConfirmState({ visible: false, id: null })} style={[{ flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 16 }, isDark && { backgroundColor: '#1C1C1E' }]}>
                                        <Text style={[{ color: '#475569', fontSize: 16, fontWeight: '700', textAlign: 'center' }, isDark && { color: '#94A3B8' }]}>İptal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => {
                                        const id = deleteConfirmState.id;
                                        setDeleteConfirmState({ visible: false, id: null });
                                        if (id) performDelete(id);
                                    }} style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 16 }}>
                                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Sil</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                    {/* Same fix as deleteConfirmState above, for the "Report" button that also
                        lives inside this detail modal. handleReport() can also be triggered
                        from the main feed (outside this modal) — that path keeps using the
                        separate sibling <Modal> further below, which works fine there since
                        no other modal is already open in that context. */}
                    {reportConfirmState.visible && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
                            <View style={[{ width: '85%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' }, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
                                <View style={[{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }, isDark && { backgroundColor: '#451A03' }]}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#F59E0B" />
                                </View>
                                <Text style={[{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' }, isDark && { color: '#FFFFFF' }]}>{t('common.report', { defaultValue: 'Bildir' })}</Text>
                                <Text style={[{ fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 }, isDark && { color: '#CBD5E1' }]}>Bu gönderiyi şikayet etmek istediğinize emin misiniz?</Text>
                                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                    <TouchableOpacity onPress={() => setReportConfirmState({ visible: false, id: null })} style={[{ flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 16 }, isDark && { backgroundColor: '#1C1C1E' }]}>
                                        <Text style={[{ color: '#475569', fontSize: 16, fontWeight: '700', textAlign: 'center' }, isDark && { color: '#94A3B8' }]}>İptal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => {
                                        const id = reportConfirmState.id;
                                        setReportConfirmState({ visible: false, id: null });
                                        if (id) performReport(id);
                                    }} style={{ flex: 1, backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 16 }}>
                                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{t('common.report', { defaultValue: 'Bildir' })}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
            <Modal
                visible={isAdModalVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setIsAdModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={[styles.modalContainer, isDark && { backgroundColor: '#000000' }]}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }, isDark && { backgroundColor: '#000000', borderBottomColor: '#1C1C1E' }]}>
                        <View style={{ flex: 1.2, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => setIsAdModalVisible(false)} style={styles.modalHeaderButton}>
                                <Text style={[styles.cancelText, isDark && { color: '#94A3B8' }]}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>{t('forum.placeAd')}</Text>
                        </View>
                        <View style={{ flex: 1.2, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <TouchableOpacity
                                onPress={() => setIsAdModalVisible(false)}
                                style={[styles.publishButton, (!adTitle.trim() || !adPrice.trim()) && styles.publishButtonDisabled]}
                                disabled={!adTitle.trim() || !adPrice.trim()}
                            >
                                <Text style={[styles.publishText, (!adTitle.trim() || !adPrice.trim()) && { color: '#94A3B8' }]}>{t('common.publish')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={[styles.modalBody, isDark && { backgroundColor: '#000000' }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>ADA SEÇİMİ</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 }}>
                                {islands.map(island => (
                                    <TouchableOpacity
                                        key={island}
                                        style={[styles.chip, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }, selectedIsland === island && styles.activeChip]}
                                        onPress={() => setSelectedIsland(island)}
                                    >
                                        <Text style={[styles.chipText, isDark && { color: '#CBD5E1' }, selectedIsland === island && styles.activeChipText]}>{t('places.' + island, { defaultValue: island })}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>İLAN BAŞLIĞI</Text>
                            <TextInput
                                style={[styles.adTitleInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                                placeholder="Ne satıyorsun veya arıyorsun?"
                                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                                value={adTitle}
                                onChangeText={setAdTitle}
                            />
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>KATEGORİ</Text>
                            <View style={styles.adCategoryRow}>
                                {adCategories.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.adCatItem, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }, adCategory === cat.label && styles.activeAdCat]}
                                        onPress={() => setAdCategory(cat.label)}
                                    >
                                        <MaterialCommunityIcons
                                            name={cat.icon as any}
                                            size={20}
                                            color={adCategory === cat.label ? '#fff' : (isDark ? '#94A3B8' : '#64748B')}
                                        />
                                        <Text style={[styles.adCatText, isDark && { color: '#CBD5E1' }, adCategory === cat.label && styles.activeAdCatText]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>FİYAT (₺)</Text>
                            <TextInput
                                style={[styles.adTitleInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                                placeholder="0.00"
                                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                                keyboardType="numeric"
                                value={adPrice}
                                onChangeText={setAdPrice}
                            />
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>AÇIKLAMA</Text>
                            <TextInput
                                style={[styles.adTitleInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }, { height: 120, textAlignVertical: 'top' }]}
                                placeholder="Ürün veya hizmet detaylarını yaz..."
                                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                                multiline
                                value={adDesc}
                                onChangeText={setAdDesc}
                            />
                        </View>
                        <TouchableOpacity style={[styles.addPhotoBtn, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]}>
                            <IconSymbol name="camera.fill" size={24} color={isDark ? "#94A3B8" : "#64748B"} />
                            <Text style={[styles.addPhotoText, isDark && { color: '#94A3B8' }]}>{t('forum.addPhotoSimple')}</Text>
                        </TouchableOpacity>
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
                message={t('auth.loginToPost', { defaultValue: 'Paylaşım yapmak için giriş yapmalısınız.' })}
            />
            <VerifyPhoneModal
                visible={showVerifyPhoneModal}
                onClose={() => setShowVerifyPhoneModal(false)}
                initialPhone={user?.phone}
                onVerified={(updatedUser) => {
                    updateProfile(updatedUser);
                    setShowVerifyPhoneModal(false);
                    // Phone is now verified server-side — finish the post they were already
                    // trying to publish instead of making them retype it from scratch. The
                    // typed content/poll/images are still sitting in state since closing the
                    // write modal earlier didn't reset the form, only hid it.
                    setTimeout(() => handleCreatePost(), 400);
                }}
            />

            <Modal
                visible={isInviteModalVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                navigationBarTranslucent={true}
                onRequestClose={() => setIsInviteModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => setIsInviteModalVisible(false)}
                    />
                    <View style={[{ width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', zIndex: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 }, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
                        <View style={[{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }, isDark && { backgroundColor: '#064E3B' }]}>
                            <IconSymbol name="person.2.fill" size={32} color={isDark ? "#34D399" : "#059669"} />
                        </View>
                        <Text style={[{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' }, isDark && { color: '#FFFFFF' }]}>
                            {i18n.language.startsWith('en') ? 'Invite Friends' : 'Arkadaşlarını Davet Et'}
                        </Text>
                        <Text style={[{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 }, isDark && { color: '#CBD5E1' }]}>
                            {i18n.language.startsWith('en')
                                ? 'People you invite earn the Islander badge.'
                                : 'Davet ettiğin kişiler Adalı rozeti kazanır.'}
                        </Text>

                        <TextInput
                            style={[{
                                width: '100%',
                                backgroundColor: '#F8FAFC',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                borderRadius: 14,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                fontSize: 14,
                                color: '#1E293B',
                                textAlign: 'center',
                                marginBottom: 20
                            }, isDark && { backgroundColor: '#18181B', borderColor: '#2C2C2E', color: '#FFFFFF' }]}
                            placeholder={i18n.language.startsWith('en') ? 'Email address (e.g. adali@email.com)' : 'E-posta adresi (örn. adali@email.com)'}
                            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                            value={inviteContactInput}
                            onChangeText={setInviteContactInput}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                onPress={() => { setInviteContactInput(''); setIsInviteModalVisible(false); }}
                                disabled={isInvitingInForum}
                                style={[{ flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }]}
                            >
                                <Text style={[{ color: '#475569', fontSize: 15, fontWeight: '700', textAlign: 'center' }, isDark && { color: '#94A3B8' }]}>
                                    {i18n.language.startsWith('en') ? 'Cancel' : 'İptal'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={performInviteShare}
                                disabled={isInvitingInForum}
                                style={{ flex: 1, backgroundColor: '#059669', paddingVertical: 14, borderRadius: 16, opacity: isInvitingInForum ? 0.7 : 1, alignItems: 'center', justifyContent: 'center' }}
                            >
                                {isInvitingInForum ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
                                        {i18n.language.startsWith('en') ? 'Invite' : 'Davet Et'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Rules Modal */}
            <Modal visible={isRulesModalVisible} statusBarTranslucent navigationBarTranslucent animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsRulesModalVisible(false)}>
                <View style={[{ flex: 1, backgroundColor: '#F8FAFC' }, isDark && { backgroundColor: '#000000' }]}>
                    <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }, isDark && { backgroundColor: '#000000', borderBottomColor: '#1C1C1E' }]}>
                        <TouchableOpacity onPress={() => setIsRulesModalVisible(false)} style={styles.modalHeaderButton}>
                            <IconSymbol name="xmark" size={24} color={isDark ? "#94A3B8" : "#64748B"} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{t('common.communityRules', { defaultValue: i18n.language.startsWith('en') ? 'Community Guidelines' : 'Topluluk Kuralları' })}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <ScrollView style={{ flex: 1, padding: 20 }}>
                        <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                            {i18n.language.startsWith('en') ? (
                                <>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>1. Respect & Courtesy</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Always be respectful and polite to community members. Insults, profanity, hate speech, or discriminatory language are strictly prohibited. Individuals are responsible for their own posts. AdaPlus is not responsible for any grievances that may occur.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>2. Spam & Advertising</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Posting irrelevant, repetitive messages or unauthorized commercial advertising is prohibited. Please only share relevant topics.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>3. Privacy & Personal Data</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Do not share your own or others&apos; personal contact information (phone number, full address, etc.) in public areas.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>4. Off-topic Posts</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Please make sure your posts are relevant to the islands or matters concerning the community.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>5. Moderation</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22 }}>Posts that do not comply with community guidelines may be removed by administrators. Users with repeated violations may be banned from the platform.</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>1. Saygı ve Nezaket</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Topluluk üyelerine karşı her zaman saygılı ve nazik olun. Hakaret, küfür, nefret söylemi veya ayrımcı ifadeler kesinlikle yasaktır. Bireyler kendi paylaşımlarından sorumludur, oluşabilecek herhangi bir mağduriyetten AdaPlus sorumlu değildir.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>2. Spam ve Reklam</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Konuyla ilgisiz, sürekli tekrarlanan iletiler veya izinsiz ticari reklam yapmak yasaktır. Lütfen sadece ilgili konuları paylaşın.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>3. Gizlilik ve Kişisel Veriler</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Başkalarının veya kendinizin özel iletişim bilgilerini (telefon numarası, açık adres vb.) genel alanlarda paylaşmayın.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>4. Konu Dışı Paylaşımlar</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Paylaşımlarınızın Adalar ile veya topluluğu ilgilendiren konularla alakalı olmasına özen gösterin.</Text>

                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>5. Moderasyon</Text>
                                    <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22 }}>Topluluk kurallarına uymayan içerikler yöneticiler tarafından kaldırılabilir. Kural ihlali yapan kullanıcılar platformdan uzaklaştırılabilir.</Text>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Swipe Onboarding Modal */}
            <Modal
                visible={isSwipeOnboardingVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                navigationBarTranslucent={true}
                onRequestClose={dismissSwipeOnboarding}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={[{ width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }, isDark && { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#2C2C2E' }]}>

                        {/* Icon */}
                        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <IconSymbol name="hand.point.left.fill" size={32} color="#3B82F6" />
                        </View>

                        <Text style={[{ fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 }, isDark && { color: '#F8FAFC' }]}>
                            {i18n.language.startsWith('en') ? 'Swipe for Actions' : 'Gönderileri Sola Kaydırın'}
                        </Text>

                        <Text style={[{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 }, isDark && { color: '#94A3B8' }]}>
                            {i18n.language.startsWith('en')
                                ? 'Swipe any post to the left to quickly access delete and report actions.'
                                : 'Gönderilere sola kaydırma hareketi yaparak silme veya bildirme işlemlerini kolayca gerçekleştirebilirsiniz.'}
                        </Text>

                        {/* Interactive Swipe Preview Card with real continuous animation */}
                        <View style={[{ width: '100%', height: 68, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', justifyContent: 'center' }, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]}>
                            {/* Action Buttons Revealed underneath */}
                            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', height: '100%' }}>
                                <View style={{ backgroundColor: '#EF4444', height: '100%', width: 44, justifyContent: 'center', alignItems: 'center' }}>
                                    <IconSymbol name="trash.fill" size={16} color="#FFF" />
                                </View>
                                <View style={{ backgroundColor: '#F59E0B', height: '100%', width: 44, justifyContent: 'center', alignItems: 'center' }}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FFF" />
                                </View>
                            </View>

                            {/* Sliding Front Card */}
                            <Animated.View style={[{ width: '100%', height: '100%', backgroundColor: '#FFFFFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ translateX: onboardingSwipeAnim }] }, isDark && { backgroundColor: '#1E1E24' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#3B82F620', justifyContent: 'center', alignItems: 'center' }}>
                                        <IconSymbol name="person.fill" size={18} color="#3B82F6" />
                                    </View>
                                    <View>
                                        <Text style={[{ fontSize: 13, fontWeight: '700', color: '#1E293B' }, isDark && { color: '#F8FAFC' }]}>
                                            {i18n.language.startsWith('en') ? 'Example Post' : 'Örnek Gönderi'}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                                            {i18n.language.startsWith('en') ? 'Swipe left ←' : 'Sola kaydırın ←'}
                                        </Text>
                                    </View>
                                </View>
                                <IconSymbol name="hand.point.left.fill" size={20} color="#3B82F6" />
                            </Animated.View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            onPress={dismissSwipeOnboarding}
                            style={{ width: '100%', backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 16, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                                {i18n.language.startsWith('en') ? 'Got It!' : 'Anladım'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Top-Level Transparent Confirm Modals */}
            {/* overFullScreen: this can be opened while the post-detail modal is already open
                (e.g. deleting a comment from within it) — without it, iOS can silently fail
                to present a second stacked Modal on top of the first one. */}

            {/* Same overFullScreen fix as the delete-confirm modal above — Report can also be
                triggered from within the already-open post-detail modal. */}
            <Modal transparent visible={reportConfirmState.visible} animationType="fade" statusBarTranslucent={true} navigationBarTranslucent={true} presentationStyle="overFullScreen" onRequestClose={() => setReportConfirmState({ visible: false, id: null })}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[{ width: '85%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' }, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
                        <View style={[{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }, isDark && { backgroundColor: '#451A03' }]}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#F59E0B" />
                        </View>
                        <Text style={[{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' }, isDark && { color: '#FFFFFF' }]}>{t('common.report', { defaultValue: 'Bildir' })}</Text>
                        <Text style={[{ fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 }, isDark && { color: '#CBD5E1' }]}>Bu gönderiyi şikayet etmek istediğinize emin misiniz?</Text>
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity onPress={() => setReportConfirmState({ visible: false, id: null })} style={[{ flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 16 }, isDark && { backgroundColor: '#1C1C1E' }]}>
                                <Text style={[{ color: '#475569', fontSize: 16, fontWeight: '700', textAlign: 'center' }, isDark && { color: '#94A3B8' }]}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                                const id = reportConfirmState.id;
                                setReportConfirmState({ visible: false, id: null });
                                if (id) performReport(id);
                            }} style={{ flex: 1, backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 16 }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{t('common.report', { defaultValue: 'Bildir' })}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(20),
        paddingBottom: vs(4),
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    backButton: {
        width: s(44),
        height: s(44),
        borderRadius: s(12),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: s(16),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: vs(4) },
        shadowOpacity: 0.04,
        shadowRadius: s(10),
        elevation: 2,
    },
    headerTitles: {
        flex: 1,
    },
    headerTitle: {
        fontSize: ms(26),
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    tabsWrapper: {
        paddingTop: vs(4),
        paddingBottom: vs(8),
        backgroundColor: 'transparent',
    },
    tabsContainer: {
        paddingHorizontal: s(20),
        paddingRight: s(40),
        gap: s(12),
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        paddingHorizontal: s(16),
        paddingVertical: vs(8),
        borderRadius: s(12),
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: s(4),
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activeTabItem: {
        backgroundColor: '#1E293B',
        borderColor: '#1E293B',
        shadowOpacity: 0.1,
    },
    tabLabel: {
        fontSize: ms(12),
        fontWeight: '700',
        color: '#475569',
    },
    activeTabLabel: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingTop: vs(2),
        paddingBottom: vs(100),
        paddingHorizontal: s(10),
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: ms(16),
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: vs(12),
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: ms(13),
        color: '#CBD5E1',
        marginTop: vs(4),
        textAlign: 'center',
    },
    postWrapper: {
        width: '100%',
        paddingHorizontal: s(4),
        marginVertical: vs(4),
    },
    bubbleContainer: {
        backgroundColor: '#FFFFFF',
        padding: s(16),
        width: '100%',
        borderRadius: s(16),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    bubbleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: vs(4),
    },
    bubbleFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: vs(6),
        gap: s(12),
    },
    chatTime: {
        fontSize: ms(10),
        color: '#94A3B8',
        fontWeight: '500',
    },
    chatInteraction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginRight: s(16),
    },
    bubbleImageWrapper: {
        borderRadius: s(8),
        overflow: 'hidden',
        marginTop: vs(8),
        marginBottom: vs(4),
        height: vs(180),
        width: '100%',
        backgroundColor: '#F1F5F9',
    },
    postAuthorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(8),
    },
    avatar: {
        width: s(36),
        height: s(36),
        borderRadius: s(8),
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorName: {
        fontSize: ms(14),
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    myPostBadge: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        borderWidth: 1,
        paddingHorizontal: s(6),
        paddingVertical: vs(1),
        borderRadius: s(6),
        alignItems: 'center',
        justifyContent: 'center',
    },
    myPostBadgeText: {
        fontSize: ms(10),
        fontWeight: '800',
        color: '#2563EB',
    },
    timeText: {
        fontSize: ms(11),
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: vs(1),
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(8),
        paddingVertical: vs(3),
        borderRadius: s(10),
        borderWidth: 1,
        gap: s(4),
    },
    roleDot: {
        width: s(4),
        height: s(4),
        borderRadius: s(2),
    },
    roleText: {
        fontSize: ms(9),
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    postCardBody: {
        marginBottom: vs(8),
    },
    contentText: {
        fontSize: ms(14),
        lineHeight: ms(22),
        color: '#334155',
        fontWeight: '500',
    },
    imageWrapper: {
        marginTop: vs(8),
        borderRadius: s(8),
        overflow: 'hidden',
        height: vs(140),
        backgroundColor: '#F1F5F9',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    postCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: vs(12),
        marginTop: vs(4),
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    interactionGroup: {
        flexDirection: 'row',
        gap: s(6),
    },
    interactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(6),
        gap: s(6),
    },
    interactionCount: {
        fontSize: ms(12),
        fontWeight: '700',
        color: '#475569',
    },
    reportIconButton: {
        width: s(32),
        height: s(32),
        borderRadius: s(10),
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        position: 'absolute',
        right: s(20),
        bottom: vs(20),
        width: s(64),
        height: s(64),
        borderRadius: s(20),
        backgroundColor: '#FFFFFF',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: vs(6) },
        shadowOpacity: 0.25,
        shadowRadius: s(12),
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: s(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    renderedPollContainer: {
        marginTop: vs(16),
        gap: vs(12),
    },
    renderedPollOption: {
        height: vs(52),
        borderRadius: s(12),
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
        justifyContent: 'center',
    },
    pollProgressFill: {
        ...StyleSheet.absoluteFillObject,
    },
    pollOptionTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: s(16),
        alignItems: 'center',
    },
    renderedPollOptionText: {
        fontSize: ms(15),
        fontWeight: '700',
        color: '#1A1A1A',
    },
    pollPercentText: {
        fontSize: ms(13),
        fontWeight: '800',
        color: '#64748B',
    },
    totalVotesText: {
        fontSize: ms(13),
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: vs(6),
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(20),
        paddingVertical: vs(16),
    },
    modalHeaderButton: {
        paddingVertical: vs(8),
    },
    cancelText: {
        fontSize: ms(13),
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    modalTitle: {
        fontSize: ms(15),
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: 1.2,
    },
    publishButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: s(16),
        paddingVertical: vs(10),
        borderRadius: s(12),
    },
    publishButtonDisabled: {
        backgroundColor: '#E2E8F0',
    },
    publishText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: ms(13),
    },
    modalBody: {
        flex: 1,
    },
    inputSection: {
        marginBottom: vs(32),
    },
    inputLabel: {
        fontSize: ms(12),
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 2,
        marginBottom: vs(10),
    },
    chipContainer: {
        gap: s(10),
        paddingHorizontal: s(20),
    },
    chip: {
        paddingHorizontal: s(18),
        paddingVertical: vs(10),
        borderRadius: s(12),
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeChip: {
        backgroundColor: '#1E293B',
        borderColor: '#1E293B',
    },
    chipText: {
        fontSize: ms(14),
        fontWeight: '700',
        color: '#64748B',
    },
    activeChipText: {
        color: '#FFFFFF',
    },
    adTitleInput: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: s(14),
        padding: s(18),
        fontSize: ms(16),
        color: '#1A1A1A',
        fontWeight: '600',
        textAlign: 'left',
    },
    adCategoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: s(12),
    },
    adCatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: s(14),
        paddingVertical: vs(12),
        borderRadius: s(12),
        gap: s(8),
        borderWidth: 1,
        borderColor: '#F8FAFC',
    },
    activeAdCat: {
        backgroundColor: '#F0F9FF',
        borderColor: '#3B82F6',
        borderWidth: 1,
    },
    adCatText: {
        fontSize: ms(14),
        fontWeight: '700',
        color: '#64748B',
    },
    activeAdCatText: {
        color: '#3B82F6',
    },
    addPhotoBtn: {
        marginTop: vs(10),
        marginBottom: vs(60),
        height: vs(140),
        borderRadius: s(28),
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s(10),
    },
    addPhotoText: {
        fontSize: ms(15),
        fontWeight: '800',
        color: '#64748B',
    },
    detailPostContainer: {
        paddingTop: vs(16),
        paddingBottom: vs(8),
        paddingHorizontal: s(20),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F7F9FC',
    },
    postCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(12),
    },
    detailContentText: {
        fontSize: ms(16),
        lineHeight: ms(26),
        color: '#2D3748',
        fontWeight: '500',
        marginVertical: vs(16),
        textAlign: 'left',
    },
    detailImageWrapper: {
        borderRadius: s(16),
        overflow: 'hidden',
        height: vs(300),
        backgroundColor: '#F1F5F9',
        marginBottom: vs(20),
    },
    detailImage: {
        width: '100%',
        height: '100%',
    },
    detailFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: vs(12),
    },
    commentsSection: {
        paddingTop: vs(8),
        paddingBottom: vs(16),
        paddingHorizontal: s(20),
        backgroundColor: '#FFFFFF',
    },
    commentsTitle: {
        fontSize: ms(18),
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: vs(16),
    },
    emptyComments: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(60),
    },
    emptyCommentsText: {
        fontSize: ms(15),
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: vs(16),
    },
    commentInputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(24),
        paddingVertical: vs(16),
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F7F9FC',
        gap: s(16),
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: s(16),
        paddingHorizontal: s(20),
        paddingVertical: vs(12),
        fontSize: ms(15),
        color: '#1A1A1A',
        fontWeight: '500',
    },
    sendCommentBtn: {
        width: s(48),
        height: s(48),
        alignItems: 'center',
        justifyContent: 'center',
    },
    replyItem: {
        marginBottom: vs(20),
        paddingLeft: s(4),
        borderLeftWidth: 2,
        borderLeftColor: '#F1F5F9',
    },
    replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vs(6),
    },
    replyAvatar: {
        width: s(20),
        height: s(20),
        borderRadius: s(6),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: s(8),
    },
    replyAuthor: {
        fontSize: ms(13),
        fontWeight: '700',
        color: '#1A1A1A',
        marginRight: s(8),
    },
    replyTime: {
        fontSize: ms(11),
        color: '#94A3B8',
    },
    replyContent: {
        fontSize: ms(14),
        lineHeight: ms(20),
        color: '#475569',
        marginLeft: s(28),
    },
    premiumPublishBtn: {
        backgroundColor: '#CBD5E1',
        paddingHorizontal: s(20),
        paddingVertical: vs(10),
        borderRadius: s(12),
    },
    activePremiumPublishBtn: {
        backgroundColor: '#10B981',
    },
    premiumPublishText: {
        color: '#FFFFFF',
        fontSize: ms(15),
        fontWeight: '800',
    },
    disabledBtn: {
        opacity: 0.3,
    },
    formSection: {
        marginBottom: vs(20),
        paddingHorizontal: s(20),
    },
    premiumTextInput: {
        fontSize: ms(18),
        lineHeight: ms(28),
        color: '#1A1A1A',
        fontWeight: '500',
        minHeight: vs(120),
        backgroundColor: '#F8FAFC',
        borderRadius: s(14),
        padding: s(20),
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    writeOptionsDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: vs(16),
    },
    writeChip: {
        paddingHorizontal: s(16),
        paddingVertical: vs(10),
        borderRadius: s(10),
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activeWriteChip: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    activeWriteChipPink: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    writeChipText: {
        fontSize: ms(13),
        fontWeight: '700',
        color: '#64748B',
    },
    activeWriteChipText: {
        color: '#FFFFFF',
    },
    activeWriteChipPinkText: {
        color: '#FFFFFF',
    },
    writeToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(24),
        paddingVertical: vs(12),
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
        gap: s(24),
    },
    toolbarIcon: {
        width: s(40),
        height: s(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    charCount: {
        fontSize: ms(13),
        fontWeight: '700',
        color: '#94A3B8',
    },
    imagePreviewContainer: {
        width: s(100),
        height: s(100),
        borderRadius: s(14),
        overflow: 'hidden',
        marginBottom: vs(10),
        marginTop: 0,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: vs(10),
        right: s(10),
        backgroundColor: '#fff',
        borderRadius: s(8),
    },
    anonToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
        backgroundColor: '#F8FAFC',
        padding: s(16),
        borderRadius: s(14),
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    anonCheckbox: {
        width: s(24),
        height: s(24),
        borderRadius: s(8),
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    anonCheckboxActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    anonLabel: {
        fontSize: ms(15),
        fontWeight: '700',
        color: '#1A1A1A',
    },
    anonSubtext: {
        fontSize: ms(12),
        color: '#64748B',
        marginTop: vs(1),
    },
    headerRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(8),
    },
    islandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(8),
        paddingVertical: vs(4),
        borderRadius: s(10),
        gap: s(4),
    },
    islandBadgeText: {
        fontSize: ms(12),
        fontWeight: '800',
        color: '#64748B',
    },
    emptyStateButton: {
        marginHorizontal: s(60),
        marginTop: vs(-20),
        borderRadius: s(14),
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: vs(4) },
        shadowOpacity: 0.2,
        shadowRadius: s(8),
    },
    emptyStateButtonGradient: {
        paddingVertical: vs(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateButtonText: {
        color: '#fff',
        fontSize: ms(14),
        fontWeight: '800',
        letterSpacing: 1,
    },
    pollCountdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        paddingHorizontal: s(10),
        paddingVertical: vs(4),
        borderRadius: s(12),
        gap: s(5),
        marginTop: vs(6),
    },
    pollEndedBadge: {
        backgroundColor: 'transparent',
        borderColor: '#EF4444',
    },
    pollCountdownText: {
        fontSize: ms(12),
        fontWeight: '800',
        color: '#F59E0B',
    },
    pollEndedText: {
        color: '#EF4444',
    },
});
