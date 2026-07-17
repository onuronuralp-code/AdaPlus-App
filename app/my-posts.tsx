import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchPosts, PostDto } from '@/services/forumApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import { useAuth } from '@/context/AuthContext';

export default function MyPostsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [posts, setPosts] = useState<PostDto[]>([]);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        // Fetch all posts and filter for the current user
        fetchPosts().then(allPosts => {
            const myPosts = allPosts.filter(p => p.authorName === user.fullName);
            setPosts(myPosts);
            setLoading(false);
        });
    }, [user]);

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

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Paylaştıklarım</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : posts.length === 0 ? (
                <View style={styles.center}>
                    <IconSymbol name="doc.text.fill" size={64} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Henüz Paylaşım Yok</Text>
                    <Text style={styles.emptySubtitle}>Toplulukla fikirlerini paylaşmaya başla!</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {posts.map(post => (
                        <View key={post.id} style={styles.card}>
                            <Text style={styles.content}>{post.content}</Text>
                            <View style={styles.footer}>
                                <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
                                <View style={styles.stats}>
                                    <View style={styles.statRow}>
                                        <IconSymbol name="heart.fill" size={14} color="#EC4899" />
                                        <Text style={styles.statText}>{post.likeCount}</Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <IconSymbol name="bubble.left.and.bubble.right.fill" size={14} color="#64748B" />
                                        <Text style={styles.statText}>{post.replyCount}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
    backButton: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 120 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748B', marginTop: 16, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    content: { fontSize: 15, color: '#1E293B', lineHeight: 22, marginBottom: 12 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
    time: { fontSize: 12, color: '#94A3B8' },
    stats: { flexDirection: 'row', gap: 12 },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, fontWeight: '600', color: '#64748B' }
});
