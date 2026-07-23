import { IconSymbol } from '@/components/ui/icon-symbol';
import { s, vs, ms } from '@/utils/scale';
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
import LoginPromptModal from '@/components/LoginPromptModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmptyState } from '@/components/EmptyState';
import { resolveImageUrl } from '@/services/config';

import Swipeable from 'react-native-gesture-handler/Swipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';

const ENABLE_PHOTO_UPLOAD = true; // Feature flag for photo upload in community posts

export default function ForumScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn, user } = useAuth();

    React.useEffect(() => {
        if (!isLoggedIn || (user && user.userType !== 'ISLAND_RESIDENT' && user.userType !== 'ADMIN' && user.role !== 'ADMIN')) {
            Alert.alert(
                t('common.accessDenied', { defaultValue: 'Erişim Engellendi' }),
                t('forum.islanderOnlyDesc', { defaultValue: 'Topluluğa sadece Adalılar girebilir.' }),
                [{ text: t('common.ok', { defaultValue: 'Tamam' }), onPress: () => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(tabs)/explore');
                    }
                }}]
            );
        }
    }, [user, isLoggedIn]);

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
        if (isKeyboardVisible && isDetailModalVisible) {
            setTimeout(() => {
                commentsScrollRef.current?.scrollToEnd({ animated: true });
            }, 150);
        }
    }, [isKeyboardVisible, isDetailModalVisible]);

    useEffect(() => {
        // writeModalSlideAnim is now handled in Modal's onShow to ensure native view is ready
    }, [isWriteModalVisible]);

    useEffect(() => {
        const checkFirstVisit = async () => {
            try {
                const hasVisited = await AsyncStorage.getItem('hasVisitedCommunity');
                if (!hasVisited) {
                    setTimeout(() => {
                        setIsRulesModalVisible(true);
                    }, 500);
                    await AsyncStorage.setItem('hasVisitedCommunity', 'true');
                }
            } catch (error) {
                console.error("Error reading first visit status", error);
            }
        };
        checkFirstVisit();
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
    const [pollDurationHours, setPollDurationHours] = useState(24);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [deleteConfirmState, setDeleteConfirmState] = useState<{ visible: boolean, id: string | null }>({ visible: false, id: null });
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
        { id: 'service', label: 'Hizmet', icon: 'hammer-wrench' },
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

    const performInviteShare = async () => {
        try {
            const contact = inviteContactInput.trim();
            if (contact) {
                Alert.alert(
                    t('common.success', { defaultValue: 'Başarılı' }),
                    i18n.language.startsWith('tr') 
                        ? `${contact} adresine/numarasına davetiye gönderildi!` 
                        : `Invitation sent to ${contact}!`
                );
            } else {
                await Share.share({
                    message: t('forum.inviteMessage', { defaultValue: 'AdaPlus Topluluğuna sen de katıl! Adalıların buluşma noktası: https://adaplus.app' }),
                });
            }
            setInviteContactInput('');
            setIsInviteModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleInviteFriends = () => {
        setIsInviteModalVisible(true);
    };

    const handlePollVote = async (postId: string, optionId: string) => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        try {
            const updatedPost = await forumApi.voteOnPoll(postId, optionId);
            if (updatedPost) {
                // Ensure the voted option is marked as voted immediately
                if (updatedPost.pollOptions) {
                    updatedPost.pollOptions = updatedPost.pollOptions.map(opt => 
                        opt.id === optionId ? { ...opt, isVoted: true, voted: true } : { ...opt, isVoted: false, voted: false }
                    );
                }
                // Update main list
                setPosts(posts.map(p => p.id === postId ? updatedPost : p));
                // Update detail view if open
                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost(updatedPost);
                }
            }
        } catch (error) {
            console.error('Failed to vote:', error);
            Alert.alert('Error', 'Anket oylaması başarısız oldu.');
        }
    };

    const handleSendReply = async () => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        if (!newReplyContent.trim() || !selectedPost) return;
        
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
                    const completeReply = {
                        ...reply,
                        authorId: reply.authorId || user?.id,
                        authorName: reply.authorName || user?.fullName || 'Anonim',
                        authorUserType: reply.authorUserType || user?.userType || UserType.VISITOR
                    };
                    setReplies([...replies, completeReply]);
                    setNewReplyContent('');
                    // Update main posts list to reflect new comment count
                    setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, replyCount: p.replyCount + 1 } : p));
                }
            }
        } catch (error: any) {
            Alert.alert('Yanıt Gönderilemedi', error?.message || 'Bir hata oluştu.');
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

    const loadPosts = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const data = await (activeTab === 'hot' ? forumApi.fetchHotPosts() : forumApi.fetchPosts());
            setPosts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load posts:', error);
            setPosts([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    React.useEffect(() => {
        loadPosts();
    }, [activeTab]);

    const onRefresh = () => {
        setIsRefreshing(true);
        loadPosts(false);
    };

    const getTagColor = (userType?: UserType) => {
        switch (userType) {
            case UserType.ADMIN: return '#EF4444';
            case UserType.ISLAND_RESIDENT:
            case UserType.RESIDENT: return '#F59E0B';
            default: return '#64748B';
        }
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
                    selectionLimit: 5 - selectedImages.length,
                    quality: 0.8,
                });
                if (!result.canceled) {
                    const newImages = result.assets.map(a => a.uri);
                    setSelectedImages(prev => [...prev, ...newImages].slice(0, 5));
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
                    setSelectedImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
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
    const trimmedPostContent = newPostContent.trim();
    const postContentTooShort = newPostType !== 'poll' && trimmedPostContent.length > 0 && trimmedPostContent.length < MIN_POST_LENGTH;
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
            duration: 200,
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
                    const uploaded = await mediaApi.uploadImage(uri);
                    if (uploaded) uploadedUrls.push(uploaded);
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
                const request: forumApi.UpdatePostRequest = {
                    content,
                    imageUrl: imageUrl,
                };
                const updatedPost = await forumApi.updatePost(editingPostId, request);
                setPosts(posts.map(p => p.id === editingPostId ? updatedPost : p));
                if (selectedPost && selectedPost.id === editingPostId) {
                    setSelectedPost(updatedPost);
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
                const request: forumApi.CreatePostRequest = {
                    content,
                    postType: newPostType.toUpperCase() as PostType,
                    island: getIslandEnum(selectedIsland),
                    anonymous: isAnonymous,
                    pollOptions: newPostType === 'poll' ? pollOptions.filter(opt => opt.trim() !== '') : undefined,
                    imageUrl: imageUrl,
                    pollDurationHours: newPostType === 'poll' ? pollDurationHours : undefined,
                };

                const createdPost = await forumApi.createPost(request);
                const completePost = {
                    ...createdPost,
                    authorId: createdPost.authorId || user?.id,
                    authorName: createdPost.authorName || user?.fullName || 'Anonim',
                    authorUserType: createdPost.authorUserType || user?.userType || UserType.VISITOR
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
            Alert.alert('Gönderi Oluşturulamadı', error?.message || 'Bir hata oluştu.');
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
                    setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, replyCount: Math.max(0, p.replyCount - 1) } : p));
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
        setIsAnonymous(post.anonymous);
        
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

    const handleReport = (id: string) => {
        const performReport = async () => {
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

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [t('common.cancel', { defaultValue: 'İptal' }), t('common.report', { defaultValue: 'Bildir' })],
                    destructiveButtonIndex: 1,
                    cancelButtonIndex: 0,
                    title: t('forum.reportTitle', { defaultValue: 'Gönderiyi Bildir' }),
                    message: t('forum.reportDesc', { defaultValue: 'Bu gönderiyi şikayet etmek istediğinize emin misiniz?' })
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        performReport();
                    }
                }
            );
        } else {
            Alert.alert(
                t('forum.reportTitle', { defaultValue: 'Gönderiyi Bildir' }),
                t('forum.reportDesc', { defaultValue: 'Bu gönderiyi şikayet etmek istediğinize emin misiniz?' }),
                [
                    { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                    { text: t('common.report', { defaultValue: 'Bildir' }), style: 'destructive', onPress: performReport }
                ]
            );
        }
    };

    const isPollEnded = (pollEndsAt?: string): boolean => {
        if (!pollEndsAt) return false;
        return new Date(pollEndsAt) < new Date();
    };

    const getPollCountdown = (pollEndsAt?: string): string | null => {
        if (!pollEndsAt) return null;
        const diff = new Date(pollEndsAt).getTime() - Date.now();
        if (diff <= 0) return 'Anket Sona Erdi';
        const totalMinutes = Math.floor(diff / 60000);
        if (totalMinutes < 60) return `${totalMinutes} dk kaldı`;
        const hours = Math.floor(diff / 3600000);
        if (hours < 24) return `${hours} saat kaldı`;
        const days = Math.floor(hours / 24);
        return `${days} gün kaldı`;
    };

    const renderPost = ({ item }: { item: PostDto }) => {
        const tagColor = getTagColor(item.authorUserType);
        const authorName = item.authorName || t('forum.anonymous', { defaultValue: 'Anonim' });
        const roleName = item.authorUserType === UserType.ADMIN
            ? 'Admin'
            : (item.authorUserType === UserType.ISLAND_RESIDENT || item.authorUserType === UserType.RESIDENT)
                ? t('forum.role.islander', { defaultValue: 'Adalı' })
                : t('forum.role.visitor', { defaultValue: 'Ziyaretçi' });

        const renderRightActions = () => {
            if (item.authorId !== user?.id) return null;

            return (
                <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                    <TouchableOpacity 
                        style={{ height: '100%', backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}
                        activeOpacity={0.7}
                        onPress={() => handleDeletePost(item.id)}
                    >
                        <IconSymbol name="trash.fill" size={24} color="#FFF" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                    </TouchableOpacity>
                </View>
            );
        };

        return (
            <View style={styles.postWrapper}>
                <Swipeable renderRightActions={renderRightActions}>
                <TouchableOpacity 
                    style={[styles.bubbleContainer]}
                    activeOpacity={0.9}
                    onPress={() => {
                        if (!isLoggedIn) {
                            router.push('/login');
                        } else {
                            openPostDetails(item);
                        }
                    }}
                >
                    <View style={styles.bubbleHeader}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.authorName, { color: tagColor }]}>{authorName}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: tagColor + '10', borderColor: tagColor + '20' }]}>
                                <View style={[styles.roleDot, { backgroundColor: tagColor }]} />
                                <Text style={[styles.roleText, { color: tagColor }]}>{roleName}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.islandBadge}>
                                <IconSymbol name="mappin" size={10} color="#64748B" />
                                <Text style={styles.islandBadgeText}>
                                    {t('places.' + getIslandName(item.island), { defaultValue: getIslandName(item.island) })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.postCardBody}>
                        <Text style={styles.contentText}>{item.content}</Text>
                        {item.postType === PostType.POLL && item.pollOptions && (
                            <View style={styles.renderedPollContainer}>
                                {(() => {
                                    const ended = isPollEnded(item.pollEndsAt);
                                    const countdown = getPollCountdown(item.pollEndsAt);
                                    const totalVotes = item.pollOptions!.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
                                    return (
                                        <>
                                            {item.pollOptions!.map((option) => {
                                                const isOptionVoted = option.isVoted || option.voted;
                                                return (
                                                <TouchableOpacity
                                                    key={option.id}
                                                    style={[
                                                        styles.renderedPollOption, 
                                                        ended && { opacity: 0.6 },
                                                        isOptionVoted && { backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#10B981' }
                                                    ]}
                                                    onPress={() => !ended && handlePollVote(item.id, option.id)}
                                                    activeOpacity={ended ? 1 : 0.7}
                                                    disabled={ended}
                                                >
                                                    <View style={[styles.pollProgressFill, { width: `${option.percentage}%`, backgroundColor: isOptionVoted ? '#10B98140' : tagColor + '40' }]} />
                                                    <View style={styles.pollOptionTextRow}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            {isOptionVoted && <IconSymbol name="checkmark.circle.fill" size={16} color="#059669" />}
                                                            <Text style={[styles.renderedPollOptionText, isOptionVoted && { color: '#059669', fontWeight: '800' }]}>{option.text}</Text>
                                                        </View>
                                                        <Text style={[styles.pollPercentText, isOptionVoted && { color: '#059669', fontWeight: '800' }]}>{Math.round(option.percentage)}%</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                );
                                            })}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>
                                                    Toplam {totalVotes} oy
                                                </Text>
                                                {countdown && (
                                                    <View style={[styles.pollCountdownBadge, ended && styles.pollEndedBadge, { marginTop: 0 }]}>
                                                        <IconSymbol name={ended ? "checkmark.circle.fill" : "clock.fill"} size={11} color={ended ? "#EF4444" : "#F59E0B"} />
                                                        <Text style={[styles.pollCountdownText, ended && styles.pollEndedText]}>{countdown}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </>
                                    );
                                })()}
                            </View>
                        )}
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
                                    color={item.isLiked ? "#EF4444" : "#94A3B8"}
                                />
                                <Text style={[styles.interactionCount, item.isLiked && { color: "#EF4444" }]}>
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
                                <IconSymbol name="bubble.left" size={14} color="#94A3B8" />
                                <Text style={styles.interactionCount}>
                                    {item.replyCount > 0 ? item.replyCount : '0'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.chatTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                </TouchableOpacity>
                </Swipeable>
            </View>
        );
    };

    return (
        <SwipeNavigation leftRoute="/(tabs)/explore/island/ilanlar">
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>{t('common.community')}</Text>
                </View>
                <TouchableOpacity onPress={handleInviteFriends} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol name="person.badge.plus" size={24} color="#1E293B" />
                </TouchableOpacity>
            </View>
            {!isLoggedIn ? (
                <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center', paddingHorizontal: 20 }]}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <IconSymbol name="person.crop.circle.badge.exclamationmark" size={64} color="#CBD5E1" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 10 }}>
                        {t('profile.notLoggedInTitle', { defaultValue: i18n.language.startsWith('en') ? 'Not Logged In' : 'Giriş Yapılmadı' })}
                    </Text>
                    <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 30 }}>
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
                    <View style={styles.tabsWrapper}>
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
                                        style={[styles.tabItem, isActive && styles.activeTabItem]}
                                        onPress={() => setActiveTab(tab.id)}
                                        activeOpacity={0.7}
                                    >
                                        <IconSymbol 
                                            name={tab.icon} 
                                            size={12} 
                                            color={isActive ? '#FFFFFF' : '#475569'} 
                                        />
                                        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
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
                        style={[styles.fab, { bottom: 20 }]} 
                        onPress={() => {
                            if (!isLoggedIn) {
                                setShowLoginPrompt(true);
                                return;
                            }
                            setIsWriteModalVisible(true);
                        }}
                        activeOpacity={0.85}
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
                </>
            )}
            <Modal
                visible={isWriteModalVisible}
                animationType="fade"
                transparent={true}
                statusBarTranslucent={true}
                navigationBarTranslucent={true}
                onRequestClose={handleCloseWriteModal}
                onShow={() => {
                    writeModalSlideAnim.setValue(Dimensions.get('window').height);
                    Animated.timing(writeModalSlideAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' }}>
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill} 
                            activeOpacity={1} 
                            onPress={handleCloseWriteModal} 
                        />
                        <Animated.View style={[styles.modalContainer, { flex: 0, height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, transform: [{ translateY: writeModalSlideAnim }] }]}>
                            <View style={[styles.modalHeader, { paddingTop: 24 }]}>
                                <TouchableOpacity onPress={handleCloseWriteModal} style={styles.modalHeaderButton}>
                            <IconSymbol name="xmark" size={24} color="#64748B" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center', marginLeft: 55 }}>
                            <Text style={styles.modalTitle}>{editingPostId ? t('common.edit', { defaultValue: 'Düzenle' }) : t('forum.createPost')}</Text>
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
                    <KeyboardAwareScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={60} keyboardShouldPersistTaps="handled">
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>{t('forum.islandSelection')}</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {islands.map(island => (
                                    <TouchableOpacity 
                                        key={island} 
                                        style={[styles.writeChip, { flex: 1, alignItems: 'center', paddingHorizontal: 0 }, selectedIsland === island && styles.activeWriteChipPink]}
                                        onPress={() => setSelectedIsland(island)}
                                    >
                                        <Text style={[styles.writeChipText, { fontSize: 13 }, selectedIsland === island && styles.activeWriteChipPinkText]}>{island}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>{t('forum.postType')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer} keyboardShouldPersistTaps="handled">
                                {postTypes.map(type => (
                                    <TouchableOpacity 
                                        key={type.id} 
                                        style={[styles.writeChip, newPostType === type.id && styles.activeWriteChipPink]}
                                        onPress={() => setNewPostType(type.id)}
                                    >
                                        <Text style={[styles.writeChipText, newPostType === type.id && styles.activeWriteChipPinkText]}>{type.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={styles.writeOptionsDivider} />
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>{newPostType === 'poll' ? t('forum.pollTitle') : t('forum.yourMessage')}</Text>
                            <TextInput
                                style={[styles.premiumTextInput, newPostType === 'poll' && { minHeight: 60, height: undefined, paddingVertical: 16, paddingHorizontal: 16, textAlign: 'left', lineHeight: 20 }]}
                                placeholder={newPostType === 'poll' ? t('forum.pollPlaceholder') : t('forum.whatsOnYourMind')}
                                placeholderTextColor="#CBD5E1"
                                multiline={newPostType !== 'poll'}
                                maxLength={newPostType === 'poll' ? 200 : MAX_POST_LENGTH}
                                value={newPostType === 'poll' ? pollQuestion : newPostContent}
                                onChangeText={newPostType === 'poll' ? setPollQuestion : setNewPostContent}
                                ref={postInputRef}
                                textAlignVertical={newPostType === 'poll' ? "center" : "top"}
                            />
                            {postContentTooShort && (
                                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>
                                    En az {MIN_POST_LENGTH} karakter gerekli ({trimmedPostContent.length}/{MIN_POST_LENGTH})
                                </Text>
                            )}
                            {newPostType !== 'poll' && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                    <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '500' }}>
                                        {newPostContent.trim() ? newPostContent.trim().split(/\s+/).length : 0} kelime
                                    </Text>
                                    <Text style={{ color: newPostContent.length >= MAX_POST_LENGTH ? '#EF4444' : '#94A3B8', fontSize: 11, fontWeight: '500' }}>
                                        {newPostContent.length}/{MAX_POST_LENGTH}
                                    </Text>
                                </View>
                            )}
                        </View>
                        {newPostType !== 'poll' && ENABLE_PHOTO_UPLOAD && (
                            <View style={styles.formSection}>
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
                                        {selectedImages.length < 5 && (
                                            <TouchableOpacity 
                                                style={[styles.addPhotoBtn, { width: 100, height: 100, borderRadius: 14, marginTop: 0 }]}
                                                onPress={pickImage}
                                            >
                                                <IconSymbol name="plus" size={28} color="#94A3B8" />
                                            </TouchableOpacity>
                                        )}
                                    </ScrollView>
                                ) : (
                                    <TouchableOpacity 
                                        style={[styles.addPhotoBtn, { marginTop: -10, marginBottom: 10, height: 100, borderRadius: 14 }]}
                                        onPress={pickImage}
                                    >
                                        <IconSymbol name="photo.fill" size={28} color="#94A3B8" />
                                        <Text style={[styles.addPhotoText, { color: '#94A3B8', fontSize: 14 }]}>{t('forum.addPhoto')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        {newPostType === 'poll' && (
                            <>
                            <View style={styles.formSection}>
                                <Text style={styles.inputLabel}>{t('forum.options')}</Text>
                                {pollOptions.map((opt, index) => (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        <TextInput
                                            style={[styles.premiumTextInput, { flex: 1, minHeight: 50, height: undefined, paddingVertical: 14, paddingHorizontal: 15, fontSize: 16, textAlign: 'left', lineHeight: 20 }]}
                                            placeholder={t('forum.optionPlaceholder', { number: index + 1 })}
                                            placeholderTextColor="#CBD5E1"
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
                                        <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 15 }}>+ Yeni Seçenek Ekle</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.formSection}>
                                <Text style={styles.inputLabel}>{t('forum.pollDuration')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer} keyboardShouldPersistTaps="handled">
                                    {[
                                        { value: 24, label: '1 Gün' },
                                        { value: 72, label: '3 Gün' },
                                        { value: 168, label: '7 Gün' },
                                    ].map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[styles.writeChip, pollDurationHours === opt.value && styles.activeWriteChipPink]}
                                            onPress={() => setPollDurationHours(opt.value)}
                                        >
                                            <Text style={[styles.writeChipText, pollDurationHours === opt.value && styles.activeWriteChipPinkText]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                            </>
                        )}
                        <View style={styles.formSection}>
                            <TouchableOpacity
                                style={styles.anonToggle} 
                                onPress={() => setIsAnonymous(!isAnonymous)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.anonCheckbox, isAnonymous && styles.anonCheckboxActive]}>
                                    {isAnonymous && <IconSymbol name="checkmark" size={14} color="#fff" />}
                                </View>
                                <View>
                                    <Text style={styles.anonLabel}>{t('forum.shareAnonymously')}</Text>
                                    <Text style={styles.anonSubtext}>{t('forum.anonymousDesc')}</Text>
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
                <KeyboardAvoidingView
                    style={[styles.modalContainer, { paddingTop: insets.top }]}
                    behavior={Platform.OS === 'ios' ? 'position' : 'height'}
                    contentContainerStyle={{ flex: 1 }}
                >
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => setIsDetailModalVisible(false)} style={styles.modalHeaderButton}>
                                <IconSymbol name="chevron.down" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{t('forum.postDetails')}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                    </View>
                    <View style={styles.modalBody}>
                        {selectedPost && (
                            <View style={styles.detailPostContainer}>
                                <View style={styles.postCardHeader}>
                                    <View style={styles.postAuthorInfo}>
                                        <LinearGradient 
                                            colors={[getTagColor(selectedPost.authorUserType), getTagColor(selectedPost.authorUserType) + '80']} 
                                            style={styles.avatar}
                                        >
                                            <IconSymbol name="person.fill" size={24} color="#fff" />
                                        </LinearGradient>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={styles.authorName}>{selectedPost.authorName || t('forum.anonymous', { defaultValue: 'Anonim' })}</Text>
                                                <View style={[styles.roleBadge, { backgroundColor: getTagColor(selectedPost.authorUserType) + '10', borderColor: getTagColor(selectedPost.authorUserType) + '20' }]}>
                                                    <Text style={[styles.roleText, { color: getTagColor(selectedPost.authorUserType) }]}>
                                                        {(() => {
                                                            const type = selectedPost.authorUserType;
                                                            if (type === UserType.RESIDENT || type === UserType.ISLAND_RESIDENT) return t('forum.role.islander');
                                                            if (type === UserType.ADMIN) return 'Admin';
                                                            return t('forum.role.visitor');
                                                        })()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.timeText}>{formatTime(selectedPost.createdAt)}</Text>
                                        </View>
                                        {selectedPost.authorId !== user?.id && (
                                            <TouchableOpacity 
                                                style={[styles.reportIconButton, { alignSelf: 'center', marginLeft: 10 }]}
                                                onPress={() => handleReport(selectedPost.id)}
                                            >
                                                <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.detailContentText}>{selectedPost.content}</Text>
                                {selectedPost.postType === PostType.POLL && selectedPost.pollOptions && (
                                    <View style={[styles.renderedPollContainer, { marginTop: 15, marginBottom: 5 }]}>
                                        {(() => {
                                            const ended = isPollEnded(selectedPost.pollEndsAt);
                                            const countdown = getPollCountdown(selectedPost.pollEndsAt);
                                            return (
                                                <>
                                                    {selectedPost.pollOptions.map((option: any) => {
                                                        const isOptionVoted = option.isVoted || option.voted;
                                                        return (
                                                        <TouchableOpacity
                                                            key={option.id}
                                                            style={[
                                                                styles.renderedPollOption, 
                                                                ended && { opacity: 0.6 },
                                                                isOptionVoted && { backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#10B981' }
                                                            ]}
                                                            onPress={() => !ended && handlePollVote(selectedPost.id, option.id)}
                                                            activeOpacity={ended ? 1 : 0.7}
                                                            disabled={ended}
                                                        >
                                                            <View style={[styles.pollProgressFill, { width: `${option.percentage}%`, backgroundColor: isOptionVoted ? '#10B98140' : getTagColor(selectedPost.authorUserType) + '40' }]} />
                                                            <View style={styles.pollOptionTextRow}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                    {isOptionVoted && <IconSymbol name="checkmark.circle.fill" size={16} color="#059669" />}
                                                                    <Text style={[styles.renderedPollOptionText, isOptionVoted && { color: '#059669', fontWeight: '800' }]}>{option.text}</Text>
                                                                </View>
                                                                <Text style={[styles.pollPercentText, isOptionVoted && { color: '#059669', fontWeight: '800' }]}>{Math.round(option.percentage)}%</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                        );
                                                    })}
                                                    {countdown && (
                                                        <View style={[styles.pollCountdownBadge, ended && styles.pollEndedBadge]}>
                                                            <IconSymbol name={ended ? "checkmark.circle.fill" : "clock.fill"} size={11} color={ended ? "#EF4444" : "#F59E0B"} />
                                                            <Text style={[styles.pollCountdownText, ended && styles.pollEndedText]}>{countdown}</Text>
                                                        </View>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </View>
                                )}
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
                                            <IconSymbol name={selectedPost.isLiked ? "heart.fill" : "heart"} size={20} color={selectedPost.isLiked ? "#EF4444" : "#64748B"} />
                                            <Text style={[styles.interactionCount, selectedPost.isLiked && { color: "#EF4444" }]}>
                                                {selectedPost.likeCount > 0 ? selectedPost.likeCount : '0'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.interactionPill}>
                                            <IconSymbol name="bubble.left" size={20} color="#64748B" />
                                            <Text style={styles.interactionCount}>
                                                {selectedPost.replyCount > 0 ? selectedPost.replyCount : '0'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    {selectedPost.authorId === user?.id && (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity onPress={() => handleDeletePost(selectedPost.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 }}>
                                                <IconSymbol name="trash.fill" size={14} color="#EF4444" />
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                        <View style={[styles.commentsSection, { flex: 1, paddingBottom: 0 }]}>
                            <Text style={styles.commentsTitle}>{t('forum.comments')}</Text>
                            <ScrollView 
                                ref={commentsScrollRef}
                                showsVerticalScrollIndicator={false} 
                                contentContainerStyle={{ paddingBottom: 20 }}
                                onContentSizeChange={() => {
                                    if (isKeyboardVisible) {
                                        commentsScrollRef.current?.scrollToEnd({ animated: true });
                                    }
                                }}
                            >
                                {replies.length > 0 ? (
                                replies.map(reply => {
                                    const renderRightActions = () => {
                                        if (reply.authorId !== user?.id) return null;
                                        return (
                                            <TouchableOpacity onPress={() => handleDeletePost(reply.id)} activeOpacity={0.7} style={{ height: '100%', backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 }}>
                                                <IconSymbol name="trash.fill" size={20} color="#FFF" />
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>{t('common.delete', { defaultValue: 'Sil' })}</Text>
                                            </TouchableOpacity>
                                        );
                                    };
                                    return (
                                    <View key={reply.id} style={{ marginBottom: 20 }}>
                                        <Swipeable renderRightActions={renderRightActions}>
                                            <View style={{ backgroundColor: '#FFF', paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: '#F1F5F9' }}>
                                                <View style={styles.replyHeader}>
                                                    <View style={[styles.replyAvatar, { backgroundColor: getTagColor(reply.authorUserType) }]}>
                                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                                                            {(reply.authorName || '?').charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.replyAuthor}>{reply.authorName || 'Anonim'}</Text>
                                                        <Text style={styles.replyTime}>{formatTime(reply.createdAt)}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.replyContent}>{reply.content}</Text>
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
                                    color="#64748B"
                                    compact={true}
                                    style={{ marginTop: 40 }}
                                />
                                )}
                            </ScrollView>
                        </View>
                    </View>
                    <View style={[styles.commentInputArea, { paddingBottom: isKeyboardVisible ? 16 : Math.max(insets.bottom, 16) }]}>
                        <TextInput
                            ref={replyInputRef}
                            style={[styles.commentInput, { maxHeight: 120 }]}
                            placeholder={t('forum.addComment', { defaultValue: i18n.language.startsWith('en') ? 'Add a comment...' : 'Bir yorum ekle...' })}
                            placeholderTextColor="#94A3B8"
                            multiline
                            scrollEnabled={true}
                            value={newReplyContent}
                            onChangeText={setNewReplyContent}
                        />
                        <TouchableOpacity
                            style={[styles.sendCommentBtn, !newReplyContent.trim() && { opacity: 0.5 }]}
                            onPress={handleSendReply}
                            disabled={!newReplyContent.trim()}
                        >
                            <IconSymbol name={editingReplyId ? "checkmark" : "paperplane.fill"} size={20} color={editingReplyId ? "#10B981" : "#3B82F6"} />
                        </TouchableOpacity>
                    </View>
                    {deleteConfirmState.visible && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 9999 }]}>
                            <View style={{ width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' }}>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#EF4444" />
                                </View>
                                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' }}>Sil</Text>
                                <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>Silmek istediğinize emin misiniz?</Text>
                                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                    <TouchableOpacity onPress={() => setDeleteConfirmState({ visible: false, id: null })} style={{ flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 16 }}>
                                        <Text style={{ color: '#475569', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>İptal</Text>
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
                </KeyboardAvoidingView>
            </Modal>
            <Modal
                visible={isAdModalVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setIsAdModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
                        <View style={{ flex: 1.2, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => setIsAdModalVisible(false)} style={styles.modalHeaderButton}>
                                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{t('forum.placeAd')}</Text>
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
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>ADA SEÇİMİ</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 }}>
                                {islands.map(island => (
                                    <TouchableOpacity 
                                        key={island} 
                                        style={[styles.chip, selectedIsland === island && styles.activeChip]}
                                        onPress={() => setSelectedIsland(island)}
                                    >
                                        <Text style={[styles.chipText, selectedIsland === island && styles.activeChipText]}>{island}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>İLAN BAŞLIĞI</Text>
                            <TextInput
                                style={styles.adTitleInput}
                                placeholder="Ne satıyorsun veya arıyorsun?"
                                placeholderTextColor="#94A3B8"
                                value={adTitle}
                                onChangeText={setAdTitle}
                            />
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>KATEGORİ</Text>
                            <View style={styles.adCategoryRow}>
                                {adCategories.map(cat => (
                                    <TouchableOpacity 
                                        key={cat.id} 
                                        style={[styles.adCatItem, adCategory === cat.label && styles.activeAdCat]}
                                        onPress={() => setAdCategory(cat.label)}
                                    >
                                        <MaterialCommunityIcons 
                                            name={cat.icon as any} 
                                            size={20} 
                                            color={adCategory === cat.label ? '#fff' : '#64748B'} 
                                        />
                                        <Text style={[styles.adCatText, adCategory === cat.label && styles.activeAdCatText]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>FİYAT (₺)</Text>
                            <TextInput
                                style={styles.adTitleInput}
                                placeholder="0.00"
                                placeholderTextColor="#94A3B8"
                                keyboardType="numeric"
                                value={adPrice}
                                onChangeText={setAdPrice}
                            />
                        </View>
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>AÇIKLAMA</Text>
                            <TextInput
                                style={[styles.adTitleInput, { height: 120, textAlignVertical: 'top' }]}
                                placeholder="Ürün veya hizmet detaylarını yaz..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                value={adDesc}
                                onChangeText={setAdDesc}
                            />
                        </View>
                        <TouchableOpacity style={styles.addPhotoBtn}>
                            <IconSymbol name="camera.fill" size={24} color="#64748B" />
                            <Text style={styles.addPhotoText}>{t('forum.addPhotoSimple')}</Text>
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

            <Modal
                visible={isInviteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsInviteModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity 
                        activeOpacity={1} 
                        style={StyleSheet.absoluteFillObject} 
                        onPress={() => setIsInviteModalVisible(false)} 
                    />
                    <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', zIndex: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <IconSymbol name="person.2.fill" size={32} color="#3B82F6" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' }}>
                            Arkadaşlarını Davet Et
                        </Text>
                        <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                            AdaPlus topluluğunu arkadaşlarınla paylaşarak büyümesine katkıda bulun. Davet ettiğin kişiler Adalı statüsü kazanır!
                        </Text>

                        <TextInput
                            style={{
                                width: '100%',
                                backgroundColor: '#F8FAFC',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                borderRadius: 14,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                fontSize: 14,
                                color: '#1E293B',
                                marginBottom: 20
                            }}
                            placeholder={i18n.language.startsWith('tr') ? 'E-posta veya telefon numarası' : 'Email or phone number'}
                            placeholderTextColor="#94A3B8"
                            value={inviteContactInput}
                            onChangeText={setInviteContactInput}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity 
                                onPress={() => { setInviteContactInput(''); setIsInviteModalVisible(false); }} 
                                style={{ flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}
                            >
                                <Text style={{ color: '#475569', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={performInviteShare} 
                                style={{ flex: 1, backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 16 }}
                            >
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>Davet Et</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Rules Modal */}
            <Modal visible={isRulesModalVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsRulesModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                    <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
                        <TouchableOpacity onPress={() => setIsRulesModalVisible(false)} style={styles.modalHeaderButton}>
                            <IconSymbol name="xmark" size={24} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{t('common.communityRules', { defaultValue: 'Topluluk Kuralları' })}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <ScrollView style={{ flex: 1, padding: 20 }}>
                        <View style={{ backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>1. Saygı ve Nezaket</Text>
                            <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Topluluk üyelerine karşı her zaman saygılı ve nazik olun. Hakaret, küfür, nefret söylemi veya ayrımcı ifadeler kesinlikle yasaktır.</Text>
                            
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>2. Spam ve Reklam</Text>
                            <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>İlgisiz, tekrarlayan mesajlar atmak veya ticari amaçlı izinsiz reklam yapmak yasaktır. Lütfen sadece ilgili konuları paylaşın.</Text>
                            
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>3. Mahremiyet ve Kişisel Veriler</Text>
                            <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Kendinizin veya başkalarının kişisel iletişim bilgilerini (telefon numarası, açık adres vb.) açık alanda paylaşmayın.</Text>
                            
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>4. Konu Dışı Paylaşımlar</Text>
                            <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Lütfen adalarla veya topluluğu ilgilendiren konularla alakalı paylaşımlar yapmaya özen gösterin.</Text>
                            
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>5. Moderasyon</Text>
                            <Text style={{ fontSize: 15, color: '#475569', marginBottom: 20, lineHeight: 22 }}>Kurallara uymayan mesajlar moderatörler tarafından silinebilir ve kural ihlali yapan kullanıcıların topluluğa erişimi kısıtlanabilir.</Text>
                        </View>
                    </ScrollView>
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
        paddingBottom: vs(16),
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
        paddingTop: vs(20),
        paddingBottom: vs(16),
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
        paddingTop: vs(8),
        paddingBottom: vs(100),
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
    },
    bubbleContainer: {
        backgroundColor: '#FFFFFF',
        padding: s(16),
        width: '100%',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E2E8F0',
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
        backgroundColor: '#F0F9FF',
        borderColor: '#3B82F6',
    },
    activeWriteChipPink: {
        backgroundColor: '#F0F9FF',
        borderColor: '#3B82F6',
    },
    writeChipText: {
        fontSize: ms(13),
        fontWeight: '700',
        color: '#64748B',
    },
    activeWriteChipText: {
        color: '#3B82F6',
    },
    activeWriteChipPinkText: {
        color: '#3B82F6',
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
        backgroundColor: '#FEF9C3',
        paddingHorizontal: s(10),
        paddingVertical: vs(5),
        borderRadius: s(10),
        gap: s(5),
        marginTop: vs(6),
    },
    pollEndedBadge: {
        backgroundColor: '#FEF2F2',
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
