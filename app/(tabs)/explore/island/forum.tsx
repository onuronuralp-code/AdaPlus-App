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
            <View style={styles.postCard}>
                {/* Colored visual indicator on the left edge */}
                <View style={[styles.cardIndicator, { backgroundColor: item.tagColor }]} />
                
                <View style={styles.postInner}>
                    {/* Header: Avatar, Name, Role */}
                    <View style={styles.postHeader}>
                        <LinearGradient 
                            colors={[item.tagColor, item.tagColor + '80']} 
                            style={styles.avatar}
                        >
                            <IconSymbol name="person.fill" size={20} color="#fff" />
                        </LinearGradient>
                        
                        <View style={styles.headerText}>
                            <Text style={styles.authorName}>{item.author}</Text>
                            <Text style={styles.timeText}>{item.time}</Text>
                        </View>
                        
                        <View style={[styles.roleBadge, { backgroundColor: item.tagColor + '15' }]}>
                            <Text style={[styles.roleText, { color: item.tagColor }]}>{item.role}</Text>
                        </View>
                    </View>

                    {/* Content text */}
                    <Text style={styles.contentText}>{item.content}</Text>

                    {/* Optional Image */}
                    {item.image && (
                        <Image source={{ uri: item.image }} style={styles.postImage} />
                    )}

                    {/* Footer Actions */}
                    <View style={styles.interactionRow}>
                        <TouchableOpacity style={styles.actionPill}>
                            <IconSymbol name="bubble.left.fill" size={16} color="#94A3B8" />
                            <Text style={styles.actionCount}>{item.comments}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionPill, item.isLiked && styles.actionPillLiked]} 
                            onPress={() => toggleLike(item.id)}
                            activeOpacity={0.6}
                        >
                            <IconSymbol 
                                name={item.isLiked ? "heart.fill" : "heart"} 
                                size={16} 
                                color={item.isLiked ? "#EC4899" : "#94A3B8"} 
                            />
                            <Text style={[styles.actionCount, item.isLiked && { color: "#EC4899", fontWeight: 'bold' }]}>
                                {item.likes}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Clean Light Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#0F172A" />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>Topluluk</Text>
                    <Text style={styles.headerSubtitle}>Toplulukla Paylaş</Text>
                </View>
            </View>

            {/* Feed List */}
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />

            {/* Write Button */}
            <TouchableOpacity 
                style={[styles.writeButton, { bottom: insets.bottom + 20 }]} 
                activeOpacity={0.9}
                onPress={() => setIsWriteModalVisible(true)}
            >
                <IconSymbol name="plus" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Write Modal */}
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
                            <Text style={styles.cancelText}>İptal</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Yeni Gönderi</Text>
                        <TouchableOpacity 
                            onPress={handleCreatePost} 
                            style={[styles.publishButton, !newPostContent.trim() && styles.publishButtonDisabled]}
                            disabled={!newPostContent.trim()}
                        >
                            <Text style={styles.publishText}>Paylaş</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalBody}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Neler düşünüyorsun?"
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
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerTitles: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
        paddingBottom: 120, // space for FAB
    },
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 16,
        flexDirection: 'row', // to put indicator on left
        overflow: 'hidden',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    cardIndicator: {
        width: 6,
        height: '100%',
    },
    postInner: {
        flex: 1,
        padding: 16,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    authorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 2,
    },
    timeText: {
        fontSize: 12,
        color: '#94A3B8',
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    contentText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#334155',
        marginBottom: 16,
    },
    postImage: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#F1F5F9',
    },
    interactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 12,
        gap: 6,
    },
    actionPillLiked: {
        backgroundColor: '#FDF2F8',
    },
    actionCount: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    writeButton: {
        position: 'absolute',
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 999,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalHeaderButton: {
        paddingVertical: 8,
    },
    cancelText: {
        fontSize: 16,
        color: '#64748B',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    publishButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    publishButtonDisabled: {
        backgroundColor: '#CBD5E1',
    },
    publishText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    modalBody: {
        flex: 1,
        padding: 20,
    },
    textInput: {
        fontSize: 18,
        color: '#0F172A',
        minHeight: 150,
        lineHeight: 26,
    },
});
