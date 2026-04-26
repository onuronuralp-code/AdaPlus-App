import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const ANONYMOUS_POSTS = [
    {
        id: '1',
        author: 'Geçici Ziyaretçi',
        role: 'Turist',
        tagColor: '#3B82F6', 
        time: '2 saat önce',
        content: 'Büyükada\'ya gitmek için motor mu daha iyi yoksa vapur mu? Özellikle hafta sonu kalabalığını düşündüğümüzde hangisini önerirsiniz?',
        likes: 24,
        comments: 12,
        isLiked: false,
    },
    {
        id: '2',
        author: 'Ada Sakini',
        role: 'Lokal',
        tagColor: '#F59E0B',
        time: '5 saat önce',
        content: 'Bugün Burgazada\'da Madam Marta koyunda harika vakit geçirdik. Akşama doğru hava biraz esiyor ama manzarası her şeye değer.',
        likes: 156,
        comments: 8,
        isLiked: true,
        image: 'https://images.unsplash.com/photo-1549488497-66a9d5926c48?q=80&w=400&auto=format&fit=crop',
    },
    {
        id: '3',
        author: 'Maceracı',
        role: 'Turist',
        tagColor: '#10B981',
        time: '1 gün önce',
        content: 'Heybeliada vapurunda keman çalan abi yine döktürüyor. Adaya yaklaşırken güneşin batışıyla birleşince film sahnesi gibi oldu...',
        likes: 128,
        comments: 41,
        isLiked: false,
    },
    {
        id: '4',
        author: 'Deniz Tutkunu',
        role: 'Lokal',
        tagColor: '#EC4899',
        time: '1 gün önce',
        content: 'Tarihi köşklerin arasındaki ıssız sokaklarda kaybolmak adanın en güzel aktivitesi.',
        likes: 67,
        comments: 2,
        isLiked: false,
    },
];

export default function ForumScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [posts, setPosts] = useState(ANONYMOUS_POSTS);
    const [isWriteModalVisible, setIsWriteModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');

    const handleCreatePost = () => {
        if (!newPostContent.trim()) return;
        const newPost = {
            id: Date.now().toString(),
            author: 'Yeni Ziyaretçi',
            role: 'Ziyaretçi',
            tagColor: '#8B5CF6',
            time: 'Şimdi',
            content: newPostContent.trim(),
            likes: 0,
            comments: 0,
            isLiked: false,
        };
        setPosts([newPost, ...posts]);
        setNewPostContent('');
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

    const renderPost = ({ item }: { item: typeof ANONYMOUS_POSTS[0] }) => {
        return (
            <View style={[styles.postCard, { borderColor: item.tagColor + '40', shadowColor: item.tagColor }]}>
                {/* Neon Top Edge Line */}
                <View style={[styles.neonEdge, { backgroundColor: item.tagColor }]} />
                
                <View style={styles.postHeader}>
                    <LinearGradient 
                        colors={[item.tagColor, item.tagColor + '90']} 
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.avatar}
                    >
                        <IconSymbol name="person.fill" size={22} color="#fff" />
                    </LinearGradient>
                    
                    <View style={styles.headerText}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.authorName}>{item.author}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: item.tagColor + '18', borderColor: item.tagColor + '40' }]}>
                                <Text style={[styles.roleText, { color: item.tagColor }]}>{item.role}</Text>
                            </View>
                        </View>
                        <Text style={styles.timeText}>{item.time}</Text>
                    </View>

                    <TouchableOpacity style={styles.moreBtn}>
                        <IconSymbol name="ellipsis" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.contentText}>{item.content}</Text>

                {item.image && (
                    <View style={styles.imageWrapper}>
                        <Image source={{ uri: item.image }} style={styles.postImage} />
                    </View>
                )}

                <View style={styles.interactionRow}>
                    <TouchableOpacity 
                        style={[styles.actionPill, item.isLiked && styles.actionPillLiked]} 
                        onPress={() => toggleLike(item.id)}
                        activeOpacity={0.6}
                    >
                        <IconSymbol 
                            name={item.isLiked ? "heart.fill" : "heart"} 
                            size={18} 
                            color={item.isLiked ? "#EC4899" : "#94A3B8"} 
                        />
                        <Text style={[styles.actionCount, item.isLiked && { color: "#EC4899", fontWeight: '800' }]}>
                            {item.likes}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionPill}>
                        <IconSymbol name="bubble.left.fill" size={18} color="#94A3B8" />
                        <Text style={styles.actionCount}>{item.comments}</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity style={styles.shareBtn}>
                        <IconSymbol name="square.and.arrow.up" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </View>
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
                    <Text style={styles.headerTitle}>Topluluk</Text>
                </View>
                <View style={styles.statusDot} />
            </View>

            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />

            <TouchableOpacity 
                style={[styles.writeButton, { bottom: insets.bottom + 20 }]} 
                activeOpacity={0.9}
                onPress={() => setIsWriteModalVisible(true)}
            >
                <LinearGradient
                    colors={['#00D2FF', '#3a7bd5']}
                    style={styles.writeButtonGradient}
                >
                    <IconSymbol name="plus" size={28} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            <Modal
                visible={isWriteModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsWriteModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsWriteModalVisible(false)} style={styles.modalHeaderButton}>
                            <Text style={styles.cancelText}>DISCONNECT</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>BROADCAST</Text>
                        <TouchableOpacity 
                            onPress={handleCreatePost} 
                            style={[styles.publishButton, !newPostContent.trim() && styles.publishButtonDisabled]}
                            disabled={!newPostContent.trim()}
                        >
                            <Text style={styles.publishText}>SEND_DATA</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalBody}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="TRANSMIT_THOUGHTS..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            autoFocus
                            value={newPostContent}
                            onChangeText={setNewPostContent}
                            textAlignVertical="top"
                        />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 24,
        backgroundColor: '#F8FAFC',
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    headerTitles: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 10,
        color: '#3B82F6',
        fontWeight: '700',
        letterSpacing: 1.5,
        marginTop: 4,
        opacity: 0.8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 5,
    },
    listContent: {
        padding: 16,
        paddingBottom: 120,
    },
    postCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
    },
    neonEdge: {
        height: 3,
        width: '100%',
        opacity: 0.8,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerText: {
        flex: 1,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: -0.2,
    },
    timeText: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    roleText: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    moreBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#334155',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
    },
    imageWrapper: {
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    postImage: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
    },
    interactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 8,
        backgroundColor: '#F8FAFC',
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionPillLiked: {
        backgroundColor: '#FDF2F8',
        borderColor: '#FCE7F3',
    },
    actionCount: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    shareBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    writeButton: {
        position: 'absolute',
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        zIndex: 999,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    writeButtonGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalHeaderButton: {
        paddingVertical: 8,
    },
    cancelText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '800',
        letterSpacing: 1,
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 2,
    },
    publishButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    publishButtonDisabled: {
        backgroundColor: '#E2E8F0',
    },
    publishText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1,
    },
    modalBody: {
        flex: 1,
        padding: 20,
    },
    textInput: {
        fontSize: 18,
        color: '#1E293B',
        minHeight: 150,
        lineHeight: 28,
    },
});
