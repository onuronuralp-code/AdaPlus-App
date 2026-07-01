import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
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
import { EmptyState } from '@/components/EmptyState';
import { resolveImageUrl } from '@/services/config';

export default function ForumScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn, user } = useAuth();

    const [posts, setPosts] = useState<PostDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isWriteModalVisible, setIsWriteModalVisible] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostType, setNewPostType] = useState('discussion');
    const [userRole, setUserRole] = useState<'visitor' | 'islander'>('visitor');
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [replies, setReplies] = useState<PostDto[]>([]);
    const [isAdModalVisible, setIsAdModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [newReplyContent, setNewReplyContent] = useState('');
    const [pollDurationHours, setPollDurationHours] = useState(24);

    // Ad Fields
    const [adTitle, setAdTitle] = useState('');
    const [adPrice, setAdPrice] = useState('');
    const [adDesc, setAdDesc] = useState('');
    const [adCategory, setAdCategory] = useState('eşya');
    const [selectedIsland, setSelectedIsland] = useState('Büyükada');

    const islands = ['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada'];

    const adCategories = [
        { id: 'item', label: 'Eşya', icon: 'package-variant-closed' },
        { id: 'estate', label: 'Emlak', icon: 'home-city-outline' },
        { id: 'service', label: 'Hizmet', icon: 'hammer-wrench' },
        { id: 'other', label: 'Diğer', icon: 'dots-horizontal-circle-outline' },
    ];

    const openPostDetails = async (post: PostDto) => {
        setSelectedPost(post);
        setIsDetailModalVisible(true);
        setReplies([]); // Clear old replies
        const data = await forumApi.fetchReplies(post.id);
        setReplies(data);
    };

    const handlePollVote = async (postId: string, optionId: string) => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        try {
            const updatedPost = await forumApi.voteOnPoll(postId, optionId);
            if (updatedPost) {
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
            const request: Partial<forumApi.CreatePostRequest> = {
                content: newReplyContent.trim(),
                postType: PostType.DISCUSSION,
                island: selectedPost.island,
                anonymous: false
            };

            const reply = await forumApi.postReply(selectedPost.id, request);
            if (reply) {
                setReplies([...replies, reply]);
                setNewReplyContent('');
                // Update main posts list to reflect new comment count
                setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, replyCount: p.replyCount + 1 } : p));
            }
        } catch (error: any) {
            Alert.alert('Yanıt Gönderilemedi', error?.message || 'Bir hata oluştu.');
        }
    };

    const roles = [
        { id: 'visitor', label: t('forum.role.visitor', { defaultValue: i18n.language.startsWith('en') ? 'Visitor' : 'Ziyaretçi' }), color: '#3B82F6' },
        { id: 'islander', label: t('forum.role.islander', { defaultValue: i18n.language.startsWith('en') ? 'Islander' : 'Adalı' }), color: '#F59E0B' },
    ];

    const postTypes = [
        { id: 'discussion', label: t('forum.type.discussion', { defaultValue: i18n.language.startsWith('en') ? 'Discussion' : 'Tartışma' }) },
        { id: 'poll', label: t('forum.type.poll', { defaultValue: i18n.language.startsWith('en') ? 'Poll' : 'Oylama' }) },
        { id: 'complaint', label: t('forum.type.complaint', { defaultValue: i18n.language.startsWith('en') ? 'Complaint' : 'Şikayet' }) },
        { id: 'info', label: t('forum.type.info', { defaultValue: i18n.language.startsWith('en') ? 'Info' : 'Bilgi' }) },
    ];

    const tabs = [
        { id: 'all', icon: 'square.grid.2x2.fill', label: t('forum.tabs.all', { defaultValue: i18n.language.startsWith('en') ? 'All' : 'Tümü' }) },
        { id: 'liked', icon: 'heart.fill', label: t('forum.tabs.liked', { defaultValue: i18n.language.startsWith('en') ? 'Liked' : 'Beğenilenler' }) },
        { id: 'polls', icon: 'chart.bar.fill', label: t('forum.tabs.polls', { defaultValue: i18n.language.startsWith('en') ? 'Polls' : 'Oylamalar' }) },
        { id: 'hot', icon: 'flame.fill', label: t('forum.tabs.hot', { defaultValue: i18n.language.startsWith('en') ? 'Hot' : 'Popüler' }) },
    ] as const;

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
            case UserType.RESIDENT:
            case UserType.ISLAND_RESIDENT: return '#F59E0B';
            default: return '#3B82F6';
        }
    };

    const formatTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { 
                addSuffix: true, 
                locale: i18n.language.startsWith('tr') ? tr : enUS 
            });
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

    const MIN_POST_LENGTH = 10;
    const trimmedPostContent = newPostContent.trim();
    const postContentTooShort = newPostType !== 'poll' && trimmedPostContent.length > 0 && trimmedPostContent.length < MIN_POST_LENGTH;
    const isPublishActive = (
      newPostType === 'poll'
        ? (pollQuestion.trim().length >= MIN_POST_LENGTH && pollOptions.filter(o => o.trim()).length >= 2)
        : trimmedPostContent.length >= MIN_POST_LENGTH
    ) && !isUploading;

    const isWriteFormDirty = newPostContent.trim().length > 0 || pollQuestion.trim().length > 0 || !!selectedImage;

    const resetWriteForm = () => {
        setNewPostContent('');
        setPollQuestion('');
        setPollOptions(['', '']);
        setSelectedImage(null);
        setIsWriteModalVisible(false);
    };

    const handleCloseWriteModal = () => {
        if (isWriteFormDirty) {
            Alert.alert(
                t('common.unsavedChanges', { defaultValue: 'Değişiklikler Kaydedilmedi' }),
                t('common.unsavedChangesMsg', { defaultValue: 'Girilen bilgiler kaybolacak. Devam etmek istiyor musunuz?' }),
                [
                    { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                    { text: t('common.closeAnyway', { defaultValue: 'Evet, Kapat' }), style: 'destructive', onPress: resetWriteForm },
                ]
            );
        } else {
            resetWriteForm();
        }
    };

    const handleCreatePost = async () => {
        const content = newPostType === 'poll' ? pollQuestion.trim() : trimmedPostContent;
        if (!content || content.length < MIN_POST_LENGTH) return;

        setIsUploading(true);
        let imageUrl = undefined;
        if (selectedImage) {
            imageUrl = await mediaApi.uploadImage(selectedImage) || undefined;
        }

        const request: forumApi.CreatePostRequest = {
            content,
            postType: newPostType.toUpperCase() as PostType,
            island: getIslandEnum(selectedIsland),
            anonymous: isAnonymous,
            pollOptions: newPostType === 'poll' ? pollOptions.filter(opt => opt.trim() !== '') : undefined,
            imageUrl: imageUrl,
            pollDurationHours: newPostType === 'poll' ? pollDurationHours : undefined,
        };

        try {
            const createdPost = await forumApi.createPost(request);
            setPosts([createdPost, ...posts]);
            setNewPostContent('');
            setNewPostType('discussion');
            setPollQuestion('');
            setPollOptions(['', '']);
            setPollDurationHours(24);
            setIsAnonymous(false);
            setIsWriteModalVisible(false);
        } catch (error: any) {
            Alert.alert('Gönderi Oluşturulamadı', error?.message || 'Bir hata oluştu.');
        } finally {
            setIsUploading(false);
        }
    };
    const handleDeletePost = (postId: string) => {
        Alert.alert(
            t('forum.deletePostTitle', { defaultValue: 'Gönderiyi Sil' }),
            t('forum.deletePostConfirm', { defaultValue: 'Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' }),
            [
                { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                { 
                    text: t('common.delete', { defaultValue: 'Sil' }), 
                    style: 'destructive',
                    onPress: async () => {
                        const success = await forumApi.deletePost(postId);
                        if (success) {
                            if (selectedPost?.id === postId) {
                                setIsDetailModalVisible(false);
                                setSelectedPost(null);
                            }
                            loadPosts(false);
                        } else {
                            Alert.alert("Hata", "Gönderi silinirken bir sorun oluştu.");
                        }
                    }
                }
            ]
        );
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
        Alert.alert(
            t('forum.reportTitle', { defaultValue: 'Gönderiyi Bildir' }),
            t('forum.reportDesc', { defaultValue: 'Bu gönderiyi şikayet etmek istediğinize emin misiniz?' }),
            [
                { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                { text: t('common.report', { defaultValue: 'Bildir' }), style: 'destructive', onPress: async () => {
                    const success = await forumApi.reportPost(id, "User reported via mobile app");
                    if (success) {
                        Alert.alert(t('common.success', { defaultValue: 'Başarılı' }), t('forum.reportSuccess', { defaultValue: 'Şikayetiniz alındı. Teşekkürler.' }));
                    }
                }}
            ]
        );
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
        const roleName = (item.authorUserType === UserType.RESIDENT || item.authorUserType === UserType.ISLAND_RESIDENT) 
            ? t('forum.role.islander', { defaultValue: 'Islander' }) 
            : (item.authorUserType === UserType.ADMIN ? 'Admin' : t('forum.role.visitor', { defaultValue: 'Visitor' }));

        return (
            <View style={styles.postWrapper}>
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
                            {item.authorId === user?.id && (
                                <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={{ padding: 4, marginLeft: 8 }}>
                                    <IconSymbol name="trash.fill" size={16} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.postCardBody}>
                        <Text style={styles.contentText}>{item.content}</Text>
                        {item.postType === PostType.POLL && item.pollOptions && (
                            <View style={styles.renderedPollContainer}>
                                {(() => {
                                    const ended = isPollEnded(item.pollEndsAt);
                                    const countdown = getPollCountdown(item.pollEndsAt);
                                    return (
                                        <>
                                            {item.pollOptions!.map((option) => (
                                                <TouchableOpacity
                                                    key={option.id}
                                                    style={[styles.renderedPollOption, ended && { opacity: 0.6 }]}
                                                    onPress={() => !ended && handlePollVote(item.id, option.id)}
                                                    activeOpacity={ended ? 1 : 0.7}
                                                    disabled={ended}
                                                >
                                                    <View style={[styles.pollProgressFill, { width: `${option.percentage}%`, backgroundColor: tagColor + '15' }]} />
                                                    <View style={styles.pollOptionTextRow}>
                                                        <Text style={styles.renderedPollOptionText}>{option.text}</Text>
                                                        <Text style={styles.pollPercentText}>{Math.round(option.percentage)}%</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
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
                        {item.imageUrl && (
                            <View style={styles.bubbleImageWrapper}>
                                <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.postImage} />
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
                                    color={item.isLiked || item.likeCount > 0 ? "#EF4444" : "#94A3B8"}
                                />
                                <Text style={[styles.interactionCount, (item.isLiked || item.likeCount > 0) && { color: "#EF4444" }]}>
                                    {item.likeCount > 0 ? item.likeCount : ''}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.chatInteraction}
                                onPress={() => {
                                    if (!isLoggedIn) {
                                        router.push('/login');
                                    } else {
                                        openPostDetails(item);
                                    }
                                }}
                            >
                                <IconSymbol name="bubble.left" size={14} color="#94A3B8" />
                                <Text style={styles.interactionCount}>
                                    {item.replyCount > 0 ? `${item.replyCount} • Cevap Ver` : 'Cevap Ver'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.chatTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>{t('common.community', { defaultValue: i18n.language.startsWith('en') ? 'Community' : 'Topluluk' })}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>
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
                                    size={14} 
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
                    if (activeTab === 'liked') return post.isLiked;
                    return true;
                })}
                renderItem={renderPost}
                keyExtractor={item => item.id}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
                contentContainerStyle={[
                    styles.listContent, 
                    posts.filter(post => {
                        if (activeTab === 'polls') return post.postType === PostType.POLL;
                        if (activeTab === 'liked') return post.isLiked;
                        return true;
                    }).length === 0 && { flexGrow: 1, justifyContent: 'center', paddingBottom: 0 }
                ]}
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={!isLoading ? (
                    <EmptyState 
                        icon="bubble.left.and.bubble.right" 
                        title={t('forum.emptyTitle', { defaultValue: i18n.language.startsWith('en') ? 'No Posts Yet' : 'Henüz Gönderi Yok' })}
                        subtitle={t('forum.emptySubtitle', { defaultValue: i18n.language.startsWith('en') ? 'Would you like to send the first message to the community? Share something now!' : 'Topluluğa ilk mesajı sen göndermek ister misin? Hemen bir paylaşım yap!' })}
                        color="#10B981"
                        style={{ marginTop: -140 }}
                    />
                ) : null}
            />
            <TouchableOpacity 
                style={[styles.fab, { bottom: 20 }]} 
                onPress={() => {
                    if (!isLoggedIn) {
                        router.push('/login');
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
            <Modal
                visible={isWriteModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleCloseWriteModal}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { paddingTop: 16 }]}>
                        <TouchableOpacity onPress={handleCloseWriteModal} style={styles.modalHeaderButton}>
                            <IconSymbol name="xmark" size={24} color="#64748B" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center', marginLeft: 55 }}>
                            <Text style={styles.modalTitle}>{t('forum.createPost', { defaultValue: i18n.language.startsWith('tr') ? 'YENİ GÖNDERİ' : 'NEW POST' })}</Text>
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
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>{t('forum.islandSelection', { defaultValue: i18n.language.startsWith('en') ? 'SELECT ISLAND (LOCATION)' : 'ADANIZI SEÇİN (LOKASYON)' })}</Text>
                            <View style={styles.adCategoryRow}>
                                {islands.map(island => (
                                    <TouchableOpacity 
                                        key={island} 
                                        style={[styles.adCatItem, selectedIsland === island && styles.activeAdCat]}
                                        onPress={() => setSelectedIsland(island)}
                                    >
                                        <Text style={[styles.adCatText, selectedIsland === island && styles.activeAdCatText]}>{island}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>{t('forum.postType', { defaultValue: i18n.language.startsWith('en') ? 'POST TYPE' : 'GÖNDERİ TİPİ' })}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer}>
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
                            <Text style={styles.inputLabel}>{newPostType === 'poll' ? t('forum.pollTitle', { defaultValue: i18n.language.startsWith('en') ? 'POLL TITLE' : 'ANKET BAŞLIĞI' }) : t('forum.yourMessage', { defaultValue: i18n.language.startsWith('en') ? 'YOUR MESSAGE' : 'MESAJINIZ' })}</Text>
                            <TextInput
                                style={[styles.premiumTextInput, newPostType === 'poll' && { minHeight: 60, padding: 16 }]}
                                placeholder={newPostType === 'poll' ? t('forum.pollPlaceholder', { defaultValue: i18n.language.startsWith('en') ? 'Write your poll question here...' : 'Oylama sorunuzu buraya yazın...' }) : t('forum.whatsOnYourMind', { defaultValue: i18n.language.startsWith('tr') ? 'Neler anlatmak istersin?' : 'What would you like to share?' })}
                                placeholderTextColor="#CBD5E1"
                                multiline={newPostType !== 'poll'}
                                value={newPostType === 'poll' ? pollQuestion : newPostContent}
                                onChangeText={newPostType === 'poll' ? setPollQuestion : setNewPostContent}
                                textAlignVertical="top"
                            />
                            {postContentTooShort && (
                                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>
                                    En az {MIN_POST_LENGTH} karakter gerekli ({trimmedPostContent.length}/{MIN_POST_LENGTH})
                                </Text>
                            )}
                            {newPostType !== 'poll' && trimmedPostContent.length >= MIN_POST_LENGTH && (
                                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                                    {trimmedPostContent.length} karakter
                                </Text>
                            )}
                        </View>
                        {newPostType !== 'poll' && (
                            <View style={styles.formSection}>
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
                                    <TouchableOpacity 
                                        style={[styles.addPhotoBtn, { marginTop: -10, marginBottom: 10, height: 100, borderRadius: 20 }]}
                                        onPress={pickImage}
                                    >
                                        <IconSymbol name="photo.fill" size={28} color="#94A3B8" />
                                        <Text style={[styles.addPhotoText, { color: '#94A3B8', fontSize: 14 }]}>{t('forum.addPhoto', { defaultValue: i18n.language.startsWith('tr') ? 'Fotoğraf Ekle (Opsiyonel)' : 'Add Photo (Optional)' })}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        {newPostType === 'poll' && (
                            <>
                            <View style={styles.formSection}>
                                <Text style={styles.inputLabel}>{t('forum.options', { defaultValue: i18n.language.startsWith('en') ? 'OPTIONS' : 'SEÇENEKLER' })}</Text>
                                {pollOptions.map((opt, index) => (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        <TextInput
                                            style={[styles.premiumTextInput, { flex: 1, minHeight: 50, padding: 15, fontSize: 16 }]}
                                            placeholder={t('forum.optionPlaceholder', { defaultValue: i18n.language.startsWith('en') ? `Option ${index + 1}` : `Seçenek ${index + 1}` })}
                                            placeholderTextColor="#CBD5E1"
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
                                <Text style={styles.inputLabel}>{t('forum.pollDuration', { defaultValue: i18n.language.startsWith('en') ? 'POLL DURATION' : 'ANKET SÜRESİ' })}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer}>
                                    {[
                                        { value: 1, label: '1 Saat' },
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
                                    <Text style={styles.anonLabel}>{t('forum.shareAnonymously', { defaultValue: i18n.language.startsWith('tr') ? 'Anonim Olarak Paylaş' : 'Share Anonymously' })}</Text>
                                    <Text style={styles.anonSubtext}>{t('forum.anonymousDesc', { defaultValue: i18n.language.startsWith('tr') ? 'İsminiz ve profiliniz gizlenecektir.' : 'Your name and profile will be hidden.' })}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
            <Modal
                visible={isDetailModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsDetailModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => setIsDetailModalVisible(false)} style={styles.modalHeaderButton}>
                                <IconSymbol name="chevron.down" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{t('forum.postDetails', { defaultValue: i18n.language.startsWith('en') ? 'POST DETAILS' : 'GÖNDERİ DETAYI' })}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                    </View>
                    <ScrollView style={styles.modalBody}>
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
                                                            if (type === UserType.RESIDENT || type === UserType.ISLAND_RESIDENT) return t('forum.role.islander', { defaultValue: 'Islander' });
                                                            if (type === UserType.ADMIN) return 'Admin';
                                                            return t('forum.role.visitor', { defaultValue: 'Visitor' });
                                                        })()}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.timeText}>{formatTime(selectedPost.createdAt)}</Text>
                                        </View>
                                        {selectedPost.authorId === user?.id && (
                                            <TouchableOpacity onPress={() => handleDeletePost(selectedPost.id)} style={{ padding: 8 }}>
                                                <IconSymbol name="trash.fill" size={20} color="#EF4444" />
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
                                                    {selectedPost.pollOptions.map((option: any) => (
                                                        <TouchableOpacity
                                                            key={option.id}
                                                            style={[styles.renderedPollOption, ended && { opacity: 0.6 }]}
                                                            onPress={() => !ended && handlePollVote(selectedPost.id, option.id)}
                                                            activeOpacity={ended ? 1 : 0.7}
                                                            disabled={ended}
                                                        >
                                                            <View style={[styles.pollProgressFill, { width: `${option.percentage}%`, backgroundColor: getTagColor(selectedPost.authorUserType) + '15' }]} />
                                                            <View style={styles.pollOptionTextRow}>
                                                                <Text style={styles.renderedPollOptionText}>{option.text}</Text>
                                                                <Text style={styles.pollPercentText}>{Math.round(option.percentage)}%</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    ))}
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
                                    <View style={styles.detailImageWrapper}>
                                        <Image source={{ uri: resolveImageUrl(selectedPost.imageUrl) }} style={styles.detailImage} />
                                    </View>
                                )}
                                <View style={[styles.detailFooter, { justifyContent: 'space-between' }]}>
                                    <View style={styles.interactionGroup}>
                                        <TouchableOpacity style={[styles.interactionPill, (selectedPost.isLiked || selectedPost.likeCount > 0) && { backgroundColor: getTagColor(selectedPost.authorUserType) + '15' }]} onPress={() => toggleLike(selectedPost.id)}>
                                            <IconSymbol name={selectedPost.isLiked ? "heart.fill" : "heart"} size={20} color={(selectedPost.isLiked || selectedPost.likeCount > 0) ? getTagColor(selectedPost.authorUserType) : "#64748B"} />
                                            <Text style={[styles.interactionCount, (selectedPost.isLiked || selectedPost.likeCount > 0) && { color: getTagColor(selectedPost.authorUserType) }]}>
                                                {selectedPost.likeCount > 0 ? `${selectedPost.likeCount} Beğeni` : 'Beğen'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.interactionPill}>
                                            <IconSymbol name="bubble.left.fill" size={20} color="#64748B" />
                                            <Text style={styles.interactionCount}>
                                                {selectedPost.replyCount > 0 ? `${selectedPost.replyCount} Yanıt` : 'Cevap Ver'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.reportIconButton}
                                        onPress={() => handleReport(selectedPost.id)}
                                    >
                                        <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        <View style={styles.commentsSection}>
                            <Text style={styles.commentsTitle}>{t('forum.comments', { defaultValue: i18n.language.startsWith('en') ? 'Comments' : 'Yorumlar' })}</Text>
                            {replies.length > 0 ? (
                                replies.map(reply => (
                                    <View key={reply.id} style={styles.replyItem}>
                                        <View style={styles.replyHeader}>
                                            <View style={[styles.replyAvatar, { backgroundColor: getTagColor(reply.authorUserType) }]}>
                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                                                    {(reply.authorName || '?').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={styles.replyAuthor}>{reply.authorName || 'Anonim'}</Text>
                                            <Text style={styles.replyTime}>{formatTime(reply.createdAt)}</Text>
                                        </View>
                                        <Text style={styles.replyContent}>{reply.content}</Text>
                                    </View>
                                ))
                            ) : (
                                <EmptyState 
                                    icon="bubble.left.and.bubble.right" 
                                    title={t('forum.noComments', { defaultValue: i18n.language.startsWith('en') ? 'No Comments Yet' : 'Henüz Yorum Yok' })}
                                    subtitle={t('forum.firstComment', { defaultValue: i18n.language.startsWith('en') ? 'Be the first to comment and join the discussion!' : 'İlk yorumu sen yaparak tartışmaya katıl!' })}
                                    color="#10B981"
                                    compact={true}
                                />
                            )}
                        </View>
                    </ScrollView>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <View style={[styles.commentInputArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder={t('forum.addComment', { defaultValue: i18n.language.startsWith('en') ? 'Add a comment...' : 'Bir yorum ekle...' })}
                                placeholderTextColor="#94A3B8"
                                multiline
                                value={newReplyContent}
                                onChangeText={setNewReplyContent}
                            />
                            <TouchableOpacity 
                                style={[styles.sendCommentBtn, !newReplyContent.trim() && { opacity: 0.5 }]} 
                                onPress={handleSendReply}
                                disabled={!newReplyContent.trim()}
                            >
                                <IconSymbol name="paperplane.fill" size={20} color="#3B82F6" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
            <Modal
                visible={isAdModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsAdModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1.2, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => setIsAdModalVisible(false)} style={styles.modalHeaderButton}>
                                <Text style={styles.cancelText}>{t('common.cancel', { defaultValue: i18n.language.startsWith('en') ? 'CANCEL' : 'İPTAL' })}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{t('forum.placeAd', { defaultValue: i18n.language.startsWith('en') ? 'PLACE AD' : 'İLAN VER' })}</Text>
                        </View>
                        <View style={{ flex: 1.2, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <TouchableOpacity 
                                onPress={() => setIsAdModalVisible(false)} 
                                style={[styles.publishButton, (!adTitle.trim() || !adPrice.trim()) && styles.publishButtonDisabled]}
                                disabled={!adTitle.trim() || !adPrice.trim()}
                            >
                                <Text style={styles.publishText}>{t('common.publish', { defaultValue: i18n.language.startsWith('en') ? 'PUBLISH' : 'YAYINLA' })}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>ADA SEÇİMİ</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                                {islands.map(island => (
                                    <TouchableOpacity 
                                        key={island} 
                                        style={[styles.chip, selectedIsland === island && styles.activeChip]}
                                        onPress={() => setSelectedIsland(island)}
                                    >
                                        <Text style={[styles.chipText, selectedIsland === island && styles.activeChipText]}>{island}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
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
                            <Text style={styles.addPhotoText}>{t('forum.addPhotoSimple', { defaultValue: i18n.language.startsWith('tr') ? 'Fotoğraf Ekle' : 'Add Photo' })}</Text>
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
        </View>
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
        paddingHorizontal: 20,
        paddingBottom: 8,
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 16,
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
    headerTitles: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.8,
    },
    tabsWrapper: {
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: 'transparent',
    },
    tabsContainer: {
        paddingHorizontal: 20,
        gap: 10,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
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
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    activeTabLabel: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingTop: 8,
        paddingBottom: 100,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
        textAlign: 'center',
    },
    postWrapper: {
        width: '100%',
    },
    bubbleContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        width: '100%',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E2E8F0',
    },
    bubbleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    bubbleFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        gap: 12,
    },
    chatTime: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },
    chatInteraction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginRight: 8,
    },
    bubbleImageWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        marginBottom: 4,
    },
    postAuthorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    timeText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 1,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
    },
    roleDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    roleText: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    postCardBody: {
        marginBottom: 8,
    },
    contentText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#334155',
        fontWeight: '500',
    },
    imageWrapper: {
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
        height: 140,
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
        paddingTop: 12,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    interactionGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    interactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    interactionCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    reportIconButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
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
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    renderedPollContainer: {
        marginTop: 16,
        gap: 12,
    },
    renderedPollOption: {
        height: 52,
        borderRadius: 16,
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
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    renderedPollOptionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    pollPercentText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748B',
    },
    totalVotesText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: 6,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    modalHeaderButton: {
        paddingVertical: 8,
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    modalTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: 1.2,
    },
    publishButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
    },
    publishButtonDisabled: {
        backgroundColor: '#F1F5F9',
    },
    publishText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 13,
    },
    modalBody: {
        flex: 1,
    },
    inputSection: {
        marginBottom: 32,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 2,
        marginBottom: 16,
    },
    chipContainer: {
        gap: 10,
        paddingHorizontal: 20,
    },
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeChip: {
        backgroundColor: '#1E293B',
        borderColor: '#1E293B',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    activeChipText: {
        color: '#FFFFFF',
    },
    adTitleInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 18,
        fontSize: 16,
        color: '#1A1A1A',
        fontWeight: '600',
    },
    adCategoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    adCatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 8,
    },
    activeAdCat: {
        backgroundColor: '#1E293B',
    },
    adCatText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    activeAdCatText: {
        color: '#fff',
    },
    addPhotoBtn: {
        marginTop: 10,
        marginBottom: 60,
        height: 140,
        borderRadius: 28,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    addPhotoText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#64748B',
    },
    detailPostContainer: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F7F9FC',
    },
    postCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailContentText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#2D3748',
        fontWeight: '500',
        marginVertical: 16,
        textAlign: 'left',
    },
    detailImageWrapper: {
        borderRadius: 24,
        overflow: 'hidden',
        height: 300,
        backgroundColor: '#F1F5F9',
        marginBottom: 20,
    },
    detailImage: {
        width: '100%',
        height: '100%',
    },
    detailFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
    },
    commentsSection: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: 16,
    },
    emptyComments: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyCommentsText: {
        fontSize: 15,
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: 16,
    },
    commentInputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F7F9FC',
        gap: 16,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1A1A1A',
        fontWeight: '500',
    },
    sendCommentBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    replyItem: {
        marginBottom: 20,
        paddingLeft: 4,
        borderLeftWidth: 2,
        borderLeftColor: '#F1F5F9',
    },
    replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    replyAvatar: {
        width: 20,
        height: 20,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    replyAuthor: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
        marginRight: 8,
    },
    replyTime: {
        fontSize: 11,
        color: '#94A3B8',
    },
    replyContent: {
        fontSize: 14,
        lineHeight: 20,
        color: '#475569',
        marginLeft: 28,
    },
    premiumPublishBtn: {
        backgroundColor: '#CBD5E1',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
    },
    activePremiumPublishBtn: {
        backgroundColor: '#3B82F6',
    },
    premiumPublishText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    disabledBtn: {
        opacity: 0.3,
    },
    formSection: {
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    premiumTextInput: {
        fontSize: 18,
        lineHeight: 28,
        color: '#1A1A1A',
        fontWeight: '500',
        minHeight: 120,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    writeOptionsDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12,
        marginBottom: 32,
    },
    writeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
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
        fontSize: 13,
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
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
        gap: 24,
    },
    toolbarIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    charCount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
    },
    imagePreviewContainer: {
        width: '100%',
        height: 200,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 10,
        marginTop: -10,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    anonToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    anonCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
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
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    anonSubtext: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 1,
    },
    headerRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    islandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    islandBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
    },
    emptyStateButton: {
        marginHorizontal: 60,
        marginTop: -20,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    emptyStateButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    pollCountdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#FEF9C3',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 5,
        marginTop: 6,
    },
    pollEndedBadge: {
        backgroundColor: '#FEF2F2',
    },
    pollCountdownText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#F59E0B',
    },
    pollEndedText: {
        color: '#EF4444',
    },
});
