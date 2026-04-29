import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTranslation } from 'react-i18next';
import i18n from '@/utils/i18n';

export default function ForumScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const initialPosts = [
        {
            id: '1',
            author: t('forum.post1.author', { defaultValue: i18n.language.startsWith('en') ? 'Temporary Visitor' : 'Geçici Ziyaretçi' }),
            role: t('forum.role.visitor', { defaultValue: i18n.language.startsWith('en') ? 'Visitor' : 'Ziyaretçi' }),
            tagColor: '#3B82F6', 
            time: t('forum.time.2h', { defaultValue: i18n.language.startsWith('en') ? '2 hours ago' : '2 saat önce' }),
            content: t('forum.post1.content', { defaultValue: i18n.language.startsWith('en') ? 'Is it better to take the motorboat or the ferry to Büyükada? Which one do you recommend, especially considering the weekend crowd?' : 'Büyükada\'ya gitmek için motor mu daha iyi yoksa vapur mu? Özellikle hafta sonu kalabalığını düşündüğümüzde hangisini önerirsiniz?' }),
            likes: 24,
            comments: 12,
            isLiked: false,
        },
        {
            id: '2',
            author: t('forum.post2.author', { defaultValue: i18n.language.startsWith('en') ? 'Island Resident' : 'Ada Sakini' }),
            role: t('forum.role.islander', { defaultValue: i18n.language.startsWith('en') ? 'Islander' : 'Adalı' }),
            tagColor: '#F59E0B',
            time: t('forum.time.5h', { defaultValue: i18n.language.startsWith('en') ? '5 hours ago' : '5 saat önce' }),
            content: t('forum.post2.content', { defaultValue: i18n.language.startsWith('en') ? 'We had a great time today at Madam Marta bay in Burgazada. It gets a bit windy towards the evening but the view is totally worth it.' : 'Bugün Burgazada\'da Madam Marta koyunda harika vakit geçirdik. Akşama doğru hava biraz esiyor ama manzarası her şeye değer.' }),
            likes: 156,
            comments: 8,
            isLiked: true,
            image: 'https://images.unsplash.com/photo-1549488497-66a9d5926c48?q=80&w=400&auto=format&fit=crop',
        },
        {
            id: '3',
            author: t('forum.post3.author', { defaultValue: i18n.language.startsWith('en') ? 'Adventurer' : 'Maceracı' }),
            role: t('forum.role.visitor', { defaultValue: i18n.language.startsWith('en') ? 'Visitor' : 'Ziyaretçi' }),
            tagColor: '#3B82F6',
            time: t('forum.time.1d', { defaultValue: i18n.language.startsWith('en') ? '1 day ago' : '1 gün önce' }),
            content: t('forum.post3.content', { defaultValue: i18n.language.startsWith('en') ? 'The guy playing the violin on the Heybeliada ferry is amazing again. Combined with the sunset as we approached the island, it felt like a movie scene...' : 'Heybeliada vapurunda keman çalan abi yine döktürüyor. Adaya yaklaşırken güneşin batışıyla birleşince film sahnesi gibi oldu...' }),
            likes: 128,
            comments: 41,
            isLiked: false,
        },
        {
            id: '4',
            author: t('forum.post4.author', { defaultValue: i18n.language.startsWith('en') ? 'Sea Lover' : 'Deniz Tutkunu' }),
            role: t('forum.role.islander', { defaultValue: i18n.language.startsWith('en') ? 'Islander' : 'Adalı' }),
            tagColor: '#F59E0B',
            time: t('forum.time.1d', { defaultValue: i18n.language.startsWith('en') ? '1 day ago' : '1 gün önce' }),
            content: t('forum.post4.content', { defaultValue: i18n.language.startsWith('en') ? 'Getting lost in the empty streets among historic mansions is the best activity on the island.' : 'Tarihi köşklerin arasındaki ıssız sokaklarda kaybolmak adanın en güzel aktivitesi.' }),
            likes: 67,
            comments: 2,
            isLiked: false,
        },
    ];

    const [posts, setPosts] = useState(initialPosts);
    const [isWriteModalVisible, setIsWriteModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostType, setNewPostType] = useState('discussion');
    const [userRole, setUserRole] = useState<'visitor' | 'islander'>('visitor');
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [isAdModalVisible, setIsAdModalVisible] = useState(false);

    // Ad Fields
    const [adTitle, setAdTitle] = useState('');
    const [adPrice, setAdPrice] = useState('');
    const [adDesc, setAdDesc] = useState('');
    const [adCategory, setAdCategory] = useState('eşya');
    const [selectedIsland, setSelectedIsland] = useState('Büyükada');

    const islands = ['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada', 'Sedef Adası'];

    const adCategories = [
        { id: 'item', label: 'Eşya', icon: 'package-variant-closed' },
        { id: 'estate', label: 'Emlak', icon: 'home-city-outline' },
        { id: 'service', label: 'Hizmet', icon: 'hammer-wrench' },
        { id: 'other', label: 'Diğer', icon: 'dots-horizontal-circle-outline' },
    ];

    const openPostDetails = (post: any) => {
        setSelectedPost(post);
        setIsDetailModalVisible(true);
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
        { id: 'stats', icon: 'chart.pie.fill', label: t('forum.tabs.stats', { defaultValue: i18n.language.startsWith('en') ? 'Stats' : 'Grafikler' }) },
    ] as const;

    const handleCreatePost = () => {
        if (!newPostContent.trim()) return;
        const newPost = {
            id: Date.now().toString(),
            type: newPostType,
            author: userRole === 'visitor' ? t('forum.newVisitor', { defaultValue: i18n.language.startsWith('en') ? 'New Visitor' : 'Yeni Ziyaretçi' }) : t('forum.newIslander', { defaultValue: i18n.language.startsWith('en') ? 'Island Resident' : 'Ada Sakini' }),
            role: userRole === 'visitor' ? t('forum.role.visitor', { defaultValue: i18n.language.startsWith('en') ? 'Visitor' : 'Ziyaretçi' }) : t('forum.role.islander', { defaultValue: i18n.language.startsWith('en') ? 'Islander' : 'Adalı' }),
            tagColor: userRole === 'visitor' ? '#3B82F6' : '#F59E0B',
            time: t('forum.time.now', { defaultValue: i18n.language.startsWith('en') ? 'Just now' : 'Şimdi' }),
            content: newPostType === 'poll' ? pollQuestion : newPostContent.trim(),
            pollOptions: newPostType === 'poll' ? pollOptions.filter(opt => opt.trim() !== '').map(opt => ({ text: opt, votes: 0 })) : [],
            likes: 0,
            comments: 0,
            isLiked: false,
        };
        setPosts([newPost, ...posts]);
        setNewPostContent('');
        setNewPostType('discussion');
        setPollQuestion('');
        setPollOptions(['', '']);
        setIsWriteModalVisible(false);
    };

    const toggleLike = (id: string) => {
        setPosts(posts.map(post => {
            if (post.id === id) {
                return {
                    ...post,
                    isLiked: !post.isLiked,
                    likes: post.isLiked ? post.likes - 1 : post.likes + 1
                };
            }
            return post;
        }));
    };

    const handleReport = (id: string) => {
        Alert.alert(
            t('forum.reportTitle', { defaultValue: 'Gönderiyi Bildir' }),
            t('forum.reportDesc', { defaultValue: 'Bu gönderiyi şikayet etmek istediğinize emin misiniz?' }),
            [
                { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                { text: t('common.report', { defaultValue: 'Bildir' }), style: 'destructive', onPress: () => Alert.alert(t('common.success', { defaultValue: 'Başarılı' }), t('forum.reportSuccess', { defaultValue: 'Şikayetiniz alındı. Teşekkürler.' })) }
            ]
        );
    };

    const renderPost = ({ item }: { item: typeof initialPosts[0] }) => {
        return (
            <TouchableOpacity 
                style={[styles.postCard, { shadowColor: item.tagColor }]}
                activeOpacity={0.95}
                onPress={() => openPostDetails(item)}
            >
                <View style={styles.postCardHeader}>
                    <View style={styles.postAuthorInfo}>
                        <LinearGradient 
                            colors={[item.tagColor, item.tagColor + '80']} 
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.avatar}
                        >
                            <IconSymbol name="person.fill" size={24} color="#fff" />
                        </LinearGradient>
                        <View>
                            <Text style={styles.authorName}>{item.author}</Text>
                            <Text style={styles.timeText}>{item.time}</Text>
                        </View>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: item.tagColor + '10', borderColor: item.tagColor + '20' }]}>
                        <Text style={[styles.roleText, { color: item.tagColor }]}>{item.role}</Text>
                    </View>
                </View>
                <View style={styles.postCardBody}>
                    <Text style={styles.contentText}>{item.content}</Text>
                    {item.type === 'poll' && item.pollOptions && (
                        <View style={styles.renderedPollContainer}>
                            {item.pollOptions.map((option: any, index: number) => (
                                <TouchableOpacity key={index} style={styles.renderedPollOption}>
                                    <View style={[styles.pollProgressFill, { width: '15%', backgroundColor: item.tagColor + '20' }]} />
                                    <View style={styles.pollOptionTextRow}>
                                        <Text style={styles.renderedPollOptionText}>{option.text}</Text>
                                        <Text style={styles.pollPercentText}>15%</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            <Text style={styles.totalVotesText}>124 {t('forum.votes', { defaultValue: i18n.language.startsWith('en') ? 'votes' : 'oy' })}</Text>
                        </View>
                    )}
                    {item.image && (
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: item.image }} style={styles.postImage} />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.1)']}
                                style={StyleSheet.absoluteFill}
                            />
                        </View>
                    )}
                </View>
                <View style={styles.postCardFooter}>
                    <View style={styles.interactionGroup}>
                        <TouchableOpacity 
                            style={[styles.interactionPill, item.isLiked && { backgroundColor: item.tagColor + '15' }]} 
                            onPress={() => toggleLike(item.id)}
                        >
                            <IconSymbol 
                                name={item.isLiked ? "heart.fill" : "heart"} 
                                size={20} 
                                color={item.isLiked ? item.tagColor : "#64748B"} 
                            />
                            <Text style={[styles.interactionCount, item.isLiked && { color: item.tagColor }]}>{item.likes}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.interactionPill}>
                            <IconSymbol name="bubble.left.fill" size={20} color="#64748B" />
                            <Text style={styles.interactionCount}>{item.comments}</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity 
                        style={styles.reportIconButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleReport(item.id);
                        }}
                    >
                        <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/explore')} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>{t('common.community', { defaultValue: i18n.language.startsWith('en') ? 'Community' : 'Topluluk' })}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>
            <View style={styles.tabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer} bounces={false}>
                    {tabs.map(tab => (
                        <TouchableOpacity 
                            key={tab.id}
                            style={[styles.tabButton, activeTab === tab.id && styles.activeTabButton]}
                            onPress={() => setActiveTab(tab.id)}
                            activeOpacity={0.7}
                        >
                            <IconSymbol 
                                name={tab.icon} 
                                size={14} 
                                color={activeTab === tab.id ? '#FFFFFF' : '#64748B'} 
                            />
                            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
            <TouchableOpacity 
                style={[styles.fab, { bottom: insets.bottom + 20 }]} 
                onPress={() => setIsWriteModalVisible(true)}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={['#3B82F6', '#8B5CF6', '#EF4444', '#F97316', '#FACC15', '#22C55E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <IconSymbol 
                            name="pencil" 
                            size={24} 
                            color="#fff" 
                            style={{ transform: [{ rotate: '-10deg' }, { translateX: 2 }] }}
                        />
                        <View 
                            style={{ 
                                width: 22, 
                                height: 2, 
                                backgroundColor: 'rgba(255,255,255,0.9)', 
                                borderRadius: 1.5,
                                marginTop: -1,
                                marginLeft: -2,
                             }} 
                        />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
            <Modal
                visible={isWriteModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsWriteModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsWriteModalVisible(false)} style={styles.modalHeaderButton}>
                            <IconSymbol name="xmark" size={24} color="#64748B" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={styles.modalTitle}>{t('forum.createPost', { defaultValue: 'YENİ GÖNDERİ' })}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={handleCreatePost} 
                            style={[styles.premiumPublishBtn, !(newPostType === 'poll' ? (pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) : newPostContent.trim()) && styles.disabledBtn]}
                            disabled={!(newPostType === 'poll' ? (pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) : newPostContent.trim())}
                        >
                            <Text style={styles.premiumPublishText}>{t('common.send', { defaultValue: 'Paylaş' })}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>GÖNDERİ TİPİ</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer}>
                                {postTypes.map(type => (
                                    <TouchableOpacity 
                                        key={type.id} 
                                        style={[styles.writeChip, newPostType === type.id && styles.activeWriteChip]}
                                        onPress={() => setNewPostType(type.id)}
                                    >
                                        <Text style={[styles.writeChipText, newPostType === type.id && styles.activeWriteChipText]}>{type.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>ADANIZI SEÇİN (LOKASYON)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.chipContainer}>
                                {islands.map(island => (
                                    <TouchableOpacity 
                                        key={island} 
                                        style={[styles.writeChip, selectedIsland === island && styles.activeWriteChip]}
                                        onPress={() => setSelectedIsland(island)}
                                    >
                                        <Text style={[styles.writeChipText, selectedIsland === island && styles.activeWriteChipText]}>{island}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={styles.writeOptionsDivider} />
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>{newPostType === 'poll' ? 'ANKET BAŞLIĞI' : 'MESAJINIZ'}</Text>
                            <TextInput
                                style={[styles.premiumTextInput, newPostType === 'poll' && { minHeight: 60, padding: 16 }]}
                                placeholder={newPostType === 'poll' ? 'Oylama sorunuzu buraya yazın...' : t('forum.whatsOnYourMind', { defaultValue: 'Neler anlatmak istersin?' })}
                                placeholderTextColor="#CBD5E1"
                                multiline={newPostType !== 'poll'}
                                autoFocus
                                value={newPostType === 'poll' ? pollQuestion : newPostContent}
                                onChangeText={newPostType === 'poll' ? setPollQuestion : setNewPostContent}
                                textAlignVertical="top"
                            />
                        </View>
                        {newPostType !== 'poll' && (
                            <View style={styles.formSection}>
                                <TouchableOpacity style={[styles.addPhotoBtn, { marginTop: -10, marginBottom: 10, height: 100, borderRadius: 20 }]}>
                                    <IconSymbol name="photo.fill" size={28} color="#94A3B8" />
                                    <Text style={[styles.addPhotoText, { color: '#94A3B8', fontSize: 14 }]}>Fotoğraf Ekle (Opsiyonel)</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {newPostType === 'poll' && (
                            <View style={styles.formSection}>
                                <Text style={styles.inputLabel}>SEÇENEKLER</Text>
                                {pollOptions.map((opt, index) => (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        <TextInput
                                            style={[styles.premiumTextInput, { flex: 1, minHeight: 50, padding: 15, fontSize: 16 }]}
                                            placeholder={`Seçenek ${index + 1}`}
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
                        )}
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
                                            colors={[selectedPost.tagColor, selectedPost.tagColor + '80']} 
                                            style={styles.avatar}
                                        >
                                            <IconSymbol name="person.fill" size={24} color="#fff" />
                                        </LinearGradient>
                                        <View>
                                            <Text style={styles.authorName}>{selectedPost.author}</Text>
                                            <Text style={styles.timeText}>{selectedPost.time}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.roleBadge, { backgroundColor: selectedPost.tagColor + '10', borderColor: selectedPost.tagColor + '20' }]}>
                                        <Text style={[styles.roleText, { color: selectedPost.tagColor }]}>{selectedPost.role}</Text>
                                    </View>
                                </View>
                                <Text style={styles.detailContentText}>{selectedPost.content}</Text>
                                {selectedPost.image && (
                                    <View style={styles.detailImageWrapper}>
                                        <Image source={{ uri: selectedPost.image }} style={styles.detailImage} />
                                    </View>
                                )}
                                <View style={styles.detailFooter}>
                                    <View style={styles.interactionGroup}>
                                        <TouchableOpacity style={styles.interactionPill}>
                                            <IconSymbol name="heart" size={20} color="#64748B" />
                                            <Text style={styles.interactionCount}>{selectedPost.likes}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.interactionPill}>
                                            <IconSymbol name="bubble.left.fill" size={20} color="#64748B" />
                                            <Text style={styles.interactionCount}>{selectedPost.comments}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                        style={styles.reportIconButton}
                                        onPress={() => handleReport(selectedPost.id)}
                                    >
                                        <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                                </View>
                            </View>
                        )}
                        <View style={styles.commentsSection}>
                            <Text style={styles.commentsTitle}>{t('forum.comments', { defaultValue: i18n.language.startsWith('en') ? 'Comments' : 'Yorumlar' })}</Text>
                            <View style={styles.emptyComments}>
                                <IconSymbol name="bubble.left.and.bubble.right" size={48} color="#E2E8F0" />
                                <Text style={styles.emptyCommentsText}>{t('forum.noCommentsYet', { defaultValue: i18n.language.startsWith('en') ? 'No comments yet. Be the first to reply!' : 'Henüz yorum yok. İlk sen yaz!' })}</Text>
                            </View>
                        </View>
                    </ScrollView>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <View style={[styles.commentInputArea, { paddingBottom: insets.bottom + 10 }]}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder={t('forum.addComment', { defaultValue: i18n.language.startsWith('en') ? 'Add a comment...' : 'Bir yorum ekle...' })}
                                placeholderTextColor="#94A3B8"
                                multiline
                            />
                            <TouchableOpacity style={styles.sendCommentBtn}>
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
                            <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FBFBFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#FBFBFA',
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
        color: '#1A1A1A',
        letterSpacing: -0.8,
    },
    tabsWrapper: {
        paddingVertical: 12,
        backgroundColor: '#FBFBFA',
    },
    tabsContainer: {
        paddingHorizontal: 20,
        gap: 12,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    activeTabButton: {
        backgroundColor: '#1A1A1A',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 120,
    },
    postCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 20,
        marginBottom: 20,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    postCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    postAuthorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorName: {
        fontSize: 17,
        fontWeight: '900',
        color: '#1A1A1A',
        letterSpacing: -0.4,
    },
    timeText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    postCardBody: {
        marginBottom: 16,
    },
    contentText: {
        fontSize: 17,
        lineHeight: 28,
        color: '#2D3748',
        fontWeight: '500',
    },
    imageWrapper: {
        marginTop: 16,
        borderRadius: 24,
        overflow: 'hidden',
        height: 260,
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
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F7F9FC',
    },
    interactionGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    interactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        gap: 8,
    },
    interactionCount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    reportIconButton: {
        width: 44,
        height: 44,
        borderRadius: 18,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
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
        paddingHorizontal: 24,
        paddingVertical: 24,
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
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
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
        backgroundColor: '#F59E0B',
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
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F7F9FC',
    },
    detailContentText: {
        fontSize: 18,
        lineHeight: 30,
        color: '#2D3748',
        fontWeight: '500',
        marginVertical: 20,
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
        padding: 24,
        backgroundColor: '#FFFFFF',
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: 24,
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
    premiumPublishBtn: {
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
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
        backgroundColor: '#1A1A1A',
        borderColor: '#1A1A1A',
    },
    writeChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    activeWriteChipText: {
        color: '#FFFFFF',
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
});
