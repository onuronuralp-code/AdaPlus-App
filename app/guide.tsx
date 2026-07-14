import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { sendChatMessageStream } from '@/services/guideApi';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Keyboard,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Message = { id: string; text: string; isBot: boolean };

const ISLANDS = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];

const ISLAND_SLUG: Record<string, string> = {
    'Kınalıada': 'kinaliada',
    'Burgazada': 'burgazada',
    'Heybeliada': 'heybeliada',
    'Büyükada': 'buyukada',
};

export default function GuideScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn } = useAuth();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: t('guide.welcomeMessage'), isBot: true },
    ]);

    const keyboardShift = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (Platform.OS === 'android') return;
        const show = Keyboard.addListener('keyboardWillShow', (e) => {
            Animated.timing(keyboardShift, {
                toValue: -(e.endCoordinates.height - insets.bottom),
                duration: e.duration,
                easing: Easing.bezier(0.33, 0.66, 0.66, 1),
                useNativeDriver: true,
            }).start();
        });
        const hide = Keyboard.addListener('keyboardWillHide', (e) => {
            Animated.timing(keyboardShift, {
                toValue: 0,
                duration: e.duration,
                easing: Easing.bezier(0.33, 0.66, 0.66, 1),
                useNativeDriver: true,
            }).start();
        });
        return () => { show.remove(); hide.remove(); };
    }, [insets.bottom]);

    // ── Auth gate ─────────────────────────────────────────────────────────────

    if (!isLoggedIn) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('common.adaAI')}</Text>
                </View>
                <View style={styles.authGate}>
                    <View style={styles.authGateIcon}>
                        <IconSymbol name="sparkles" size={36} color="#EC4899" />
                    </View>
                    <Text style={styles.authGateTitle}>
                        {t('guide.title')}
                    </Text>
                    <Text style={styles.authGateSubtitle}>
                        {t('guide.authSubtitle')}
                    </Text>
                    <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
                        <Text style={styles.loginButtonText}>{t('common.login')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Island selection ──────────────────────────────────────────────────────

    const handleIslandSelect = async (island: string) => {
        setSelectedIsland(island);
        const userMsg: Message = { id: Date.now().toString(), text: island, isBot: false };
        const thinkingId = (Date.now() + 1).toString();
        const thinkingMsg: Message = { id: thinkingId, text: '...', isBot: true };
        setMessages(prev => [...prev, userMsg, thinkingMsg]);
        scrollRef.current?.scrollToEnd({ animated: true });

        setIsLoading(true);
        try {
            await sendChatMessageStream(
                t('guide.islandContext', { island }),
                ISLAND_SLUG[island],
                (chunk) => {
                    setMessages(prev => prev.map(m => {
                        if (m.id !== thinkingId) return m;
                        return { ...m, text: m.text === '...' ? chunk : m.text + chunk };
                    }));
                    scrollRef.current?.scrollToEnd({ animated: false });
                },
            );
        } catch (e: any) {
            console.error('[Guide] island stream error:', e);
            const msg = e?.message === 'daily_limit_reached'
                ? t('guide.dailyLimitReached')
                : t('guide.errorRetry');
            setMessages(prev => prev.map(m =>
                m.id === thinkingId ? { ...m, text: msg } : m
            ));
        } finally {
            setIsLoading(false);
            scrollRef.current?.scrollToEnd({ animated: true });
        }
    };

    // ── Send message ──────────────────────────────────────────────────────────

    const handleSend = async () => {
        const text = prompt.trim();
        if (!text || isLoading) return;
        setPrompt('');
        Keyboard.dismiss();

        const userMsg: Message = { id: Date.now().toString(), text, isBot: false };
        const thinkingId = (Date.now() + 1).toString();
        const thinkingMsg: Message = { id: thinkingId, text: '...', isBot: true };
        setMessages(prev => [...prev, userMsg, thinkingMsg]);
        scrollRef.current?.scrollToEnd({ animated: true });

        setIsLoading(true);
        try {
            await sendChatMessageStream(
                text,
                selectedIsland ? ISLAND_SLUG[selectedIsland] : undefined,
                (chunk) => {
                    setMessages(prev => prev.map(m => {
                        if (m.id !== thinkingId) return m;
                        return { ...m, text: m.text === '...' ? chunk : m.text + chunk };
                    }));
                    scrollRef.current?.scrollToEnd({ animated: false });
                },
            );
        } catch (e: any) {
            console.error('[Guide] Send stream error:', e);
            const msg = e?.message === 'daily_limit_reached'
                ? t('guide.dailyLimitReached')
                : (e?.message || t('guide.errorGeneric'));
            setMessages(prev => prev.map(m =>
                m.id === thinkingId ? { ...m, text: msg } : m
            ));
        } finally {
            setIsLoading(false);
            scrollRef.current?.scrollToEnd({ animated: true });
        }
    };

    const showIslandChips = messages.length === 1;
    const showQuickSuggestions = !showIslandChips && messages.length > 1;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('common.adaAI')}</Text>
                {selectedIsland && (
                    <View style={styles.islandBadge}>
                        <Text style={styles.islandBadgeText}>{selectedIsland}</Text>
                    </View>
                )}
            </View>

            <Animated.View style={{ flex: 1, transform: [{ translateY: keyboardShift }] }}>
                <ScrollView
                    ref={scrollRef}
                    style={styles.content}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    overScrollMode="never"
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((msg) => (
                        <View key={msg.id} style={[styles.messageRow, msg.isBot ? styles.botRow : styles.userRow]}>
                            {msg.isBot && (
                                <View style={styles.botAvatar}>
                                    <IconSymbol name="sparkles" size={16} color="#fff" />
                                </View>
                            )}
                            <View style={[styles.bubble, msg.isBot ? styles.botBubble : styles.userBubble]}>
                                {msg.text === '...' ? (
                                    <ActivityIndicator size="small" color="#EC4899" />
                                ) : msg.isBot ? (
                                    <MarkdownText text={msg.text} style={[styles.messageText, styles.botText]} />
                                ) : (
                                    <Text style={[styles.messageText, styles.userText]}>
                                        {msg.text}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}

                    {showIslandChips && (
                        <View style={styles.suggestionsContainer}>
                            {ISLANDS.map(island => (
                                <SuggestionChip key={island} text={island} disabled={isLoading} onPress={() => handleIslandSelect(island)} />
                            ))}
                        </View>
                    )}

                    {showQuickSuggestions && (
                        <View style={styles.suggestionsContainer}>
                            <SuggestionChip
                                text={t('guide.chip.sightseeing')}
                                disabled={isLoading}
                                onPress={() => { setPrompt(t('guide.prompt.sightseeing')); }}
                            />
                            <SuggestionChip
                                text={t('guide.chip.cafes')}
                                disabled={isLoading}
                                onPress={() => { setPrompt(t('guide.prompt.cafes')); }}
                            />
                            <SuggestionChip
                                text={t('guide.chip.beaches')}
                                disabled={isLoading}
                                onPress={() => { setPrompt(t('guide.prompt.beaches')); }}
                            />
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
                    <View style={styles.inputBox}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={t('guide.placeholder')}
                            placeholderTextColor="#94A3B8"
                            value={prompt}
                            onChangeText={setPrompt}
                            multiline
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (!prompt.trim() || isLoading) && styles.sendButtonDisabled]}
                            disabled={!prompt.trim() || isLoading}
                            onPress={handleSend}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <IconSymbol name="paperplane.fill" size={20} color={prompt.trim() ? '#fff' : '#94A3B8'} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

function parseBoldSegments(text: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    while (remaining.length > 0) {
        const s = remaining.indexOf('**');
        if (s === -1) { nodes.push(remaining); break; }
        if (s > 0) nodes.push(remaining.slice(0, s));
        const e = remaining.indexOf('**', s + 2);
        if (e === -1) { nodes.push(remaining); break; }
        nodes.push(<Text key={key++} style={{ fontWeight: '700', color: '#0F172A' }}>{remaining.slice(s + 2, e)}</Text>);
        remaining = remaining.slice(e + 2);
    }
    return nodes;
}

function MarkdownText({ text, style }: { text: string; style?: object | object[] }) {
    const lines = text.split('\n');
    return (
        <View>
            {lines.map((line, i) => {
                if (line.trim() === '') return <View key={i} style={{ height: 4 }} />;
                const isBullet = line.startsWith('- ');
                const content = isBullet ? line.slice(2) : line;
                if (isBullet) {
                    return (
                        <View key={i} style={mdStyles.bulletRow}>
                            <Text style={[style, mdStyles.bullet]}>•</Text>
                            <Text style={[style, mdStyles.bulletText]}>{parseBoldSegments(content)}</Text>
                        </View>
                    );
                }
                return <Text key={i} style={style}>{parseBoldSegments(content)}</Text>;
            })}
        </View>
    );
}

const mdStyles = StyleSheet.create({
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
    bullet: { marginRight: 8, lineHeight: 22 },
    bulletText: { flex: 1, lineHeight: 22 },
});

function SuggestionChip({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
    return (
        <TouchableOpacity
            style={[styles.suggestionChip, disabled && styles.suggestionChipDisabled]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <Text style={[styles.suggestionText, disabled && styles.suggestionTextDisabled]}>{text}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 8,
        backgroundColor: '#F8FAFC',
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
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, flex: 1 },
    islandBadge: {
        backgroundColor: '#FDF2F8',
        borderWidth: 1,
        borderColor: '#EC4899',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    islandBadgeText: { fontSize: 12, fontWeight: '700', color: '#EC4899' },
    content: { flex: 1, backgroundColor: '#F8FAFC' },
    messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    userRow: { justifyContent: 'flex-end' },
    botAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, minHeight: 44, justifyContent: 'center' },
    botBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
    userBubble: { backgroundColor: '#0F172A', borderBottomRightRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 22 },
    botText: { color: '#334155' },
    userText: { color: '#fff' },
    suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 42, paddingRight: 16 },
    suggestionChip: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestionChipDisabled: {
        borderColor: '#CBD5E1',
        backgroundColor: '#F8FAFC',
    },
    suggestionText: { fontSize: 12, fontWeight: '700', color: '#EC4899', textAlign: 'center' },
    suggestionTextDisabled: { color: '#94A3B8' },
    inputContainer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F1F5F9',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    textInput: { flex: 1, maxHeight: 120, minHeight: 40, fontSize: 16, color: '#0F172A', paddingTop: 10, paddingBottom: 10 },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        marginBottom: 2,
    },
    sendButtonDisabled: { backgroundColor: '#E2E8F0' },

    // Auth gate
    authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    authGateIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FDF2F8',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    authGateTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 12 },
    authGateSubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    loginButton: { backgroundColor: '#EC4899', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
    loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
