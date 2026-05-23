import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { sendChatMessage } from '@/services/guideApi';
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
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isLoggedIn } = useAuth();
    const isTr = i18n.language.startsWith('tr');

    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: isTr
                ? 'Merhaba! 👋 Ben Ada Plus asistanın. Sana en doğru bilgileri verebilmem için öncelikle şu an hangi adada olduğunu öğrenebilir miyim?'
                : "Hello! 👋 I'm your Ada Plus assistant. To give you the most accurate information, may I first know which island you are currently on?",
            isBot: true,
        },
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
                        {isTr ? 'Ada AI Rehberine Hoş Geldin' : 'Welcome to Ada AI Guide'}
                    </Text>
                    <Text style={styles.authGateSubtitle}>
                        {isTr
                            ? 'Kişisel rehberinize erişmek ve sorularınızı kaydetmek için giriş yapmanız gerekiyor.'
                            : 'You need to log in to access your personal guide and save your questions.'}
                    </Text>
                    <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
                        <Text style={styles.loginButtonText}>{isTr ? 'Giriş Yap' : 'Log In'}</Text>
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
            const reply = await sendChatMessage(
                isTr ? `${island} hakkında bilgi vermek istiyorum.` : `I'm on ${island}.`,
                ISLAND_SLUG[island]
            );
            setMessages(prev => prev.map(m =>
                m.id === thinkingId ? { ...m, text: reply } : m
            ));
        } catch {
            setMessages(prev => prev.map(m =>
                m.id === thinkingId
                    ? { ...m, text: isTr ? 'Bir hata oluştu, tekrar dene.' : 'Something went wrong, please try again.' }
                    : m
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
            const reply = await sendChatMessage(text, selectedIsland ? ISLAND_SLUG[selectedIsland] : undefined);
            setMessages(prev => prev.map(m =>
                m.id === thinkingId ? { ...m, text: reply } : m
            ));
        } catch (e: any) {
            setMessages(prev => prev.map(m =>
                m.id === thinkingId ? { ...m, text: e?.message || (isTr ? 'Bir hata oluştu.' : 'Something went wrong.') } : m
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
                                ) : (
                                    <Text style={[styles.messageText, msg.isBot ? styles.botText : styles.userText]}>
                                        {msg.text}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}

                    {showIslandChips && (
                        <View style={styles.suggestionsContainer}>
                            {ISLANDS.map(island => (
                                <SuggestionChip key={island} text={island} onPress={() => handleIslandSelect(island)} />
                            ))}
                        </View>
                    )}

                    {showQuickSuggestions && (
                        <View style={styles.suggestionsContainer}>
                            <SuggestionChip
                                text={isTr ? '📍 Gezilecek Yerler' : '📍 Sightseeing'}
                                onPress={() => { setPrompt(isTr ? 'Gezilecek yerleri listeler misin?' : 'What are the must-see places?'); }}
                            />
                            <SuggestionChip
                                text={isTr ? '☕ Kafeler' : '☕ Cafes'}
                                onPress={() => { setPrompt(isTr ? 'En iyi kafeleri önerir misin?' : 'Can you recommend the best cafes?'); }}
                            />
                            <SuggestionChip
                                text={isTr ? '🏖️ Plajlar' : '🏖️ Beaches'}
                                onPress={() => { setPrompt(isTr ? 'Plajlar hakkında bilgi verir misin?' : 'Tell me about the beaches.'); }}
                            />
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
                    <View style={styles.inputBox}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={isTr ? 'Ada AI\'a sor...' : 'Ask Ada AI...'}
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

function SuggestionChip({ text, onPress }: { text: string; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.suggestionChip} onPress={onPress}>
            <Text style={styles.suggestionText}>{text}</Text>
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
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, flex: 1 },
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
    suggestionText: { fontSize: 12, fontWeight: '700', color: '#EC4899', textAlign: 'center' },
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
    loginButton: { backgroundColor: '#0F172A', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
    loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
