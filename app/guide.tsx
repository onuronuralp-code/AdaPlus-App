import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, KeyboardAvoidingView, Easing, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function GuideScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [prompt, setPrompt] = useState('');
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

        return () => {
            show.remove();
            hide.remove();
        };
    }, [insets.bottom]);

    const [messages, setMessages] = useState([
        { 
            id: '1', 
            text: i18n.language.startsWith('tr') 
                ? "Merhaba! 👋 Ben Ada Plus asistanın. Sana en doğru bilgileri verebilmem için öncelikle şu an hangi adada olduğunu öğrenebilir miyim?" 
                : "Hello! 👋 I'm your Ada Plus assistant. To give you the most accurate information, may I first know which island you are currently on?", 
            isBot: true 
        }
    ]);

    const handleIslandSelect = (island: string) => {
        const userMsg = { id: Date.now().toString(), text: island, isBot: false };
        const botMsg = { 
            id: (Date.now() + 1).toString(), 
            text: i18n.language.startsWith('tr')
                ? `${island} harika bir seçim! 🏝️ Sana nasıl yardımcı olabilirim? Gezilecek yerler, yemek seçenekleri veya ulaşım hakkında bilgi verebilirim.`
                : `${island} is a great choice! 🏝️ How can I help you? I can provide information about landmarks, dining options, or transportation.`, 
            isBot: true 
        };
        setMessages([...messages, userMsg, botMsg]);
    };

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

            <Animated.View style={{ flex: 1, transform: [{ translateY: keyboardShift }] }}>
                <ScrollView 
                    style={styles.content} 
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.map((msg) => (
                        <View key={msg.id} style={[styles.messageRow, msg.isBot ? styles.botRow : styles.userRow]}>
                            {msg.isBot && (
                                <View style={styles.botAvatar}>
                                    <IconSymbol name="sparkles" size={16} color="#fff" />
                                </View>
                            )}
                            <View style={[styles.bubble, msg.isBot ? styles.botBubble : styles.userBubble]}>
                                <Text style={[styles.messageText, msg.isBot ? styles.botText : styles.userText]}>
                                    {msg.text}
                                </Text>
                            </View>
                        </View>
                    ))}
                    
                    {messages.length === 1 && (
                        <View style={styles.suggestionsContainer}>
                            <SuggestionChip text="Kınalıada" onPress={() => handleIslandSelect("Kınalıada")} />
                            <SuggestionChip text="Burgazada" onPress={() => handleIslandSelect("Burgazada")} />
                            <SuggestionChip text="Heybeliada" onPress={() => handleIslandSelect("Heybeliada")} />
                            <SuggestionChip text="Büyükada" onPress={() => handleIslandSelect("Büyükada")} />
                        </View>
                    )}

                    {messages.length > 1 && (
                        <View style={styles.suggestionsContainer}>
                            <SuggestionChip text={i18n.language.startsWith('tr') ? "📍 Gezilecek Yerler" : "📍 Sightseeing"} onPress={() => setPrompt(i18n.language.startsWith('tr') ? "Gezilecek yerleri listeler misin?" : "Can you list landmarks?")} />
                            <SuggestionChip text={i18n.language.startsWith('tr') ? "🚢 Vapur Saatleri" : "🚢 Ferry Times"} onPress={() => setPrompt(i18n.language.startsWith('tr') ? "Vapur saatlerini öğrenmek istiyorum." : "I want to know ferry times.")} />
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8, backgroundColor: '#fff' }]}>
                    <View style={styles.inputBox}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={i18n.language.startsWith('tr') ? "Ada AI'a sor..." : "Ask Ada AI..."}
                            placeholderTextColor="#94A3B8"
                            value={prompt}
                            onChangeText={setPrompt}
                            multiline
                        />
                        <TouchableOpacity 
                            style={[styles.sendButton, !prompt.trim() && styles.sendButtonDisabled]}
                            disabled={!prompt.trim()}
                        >
                            <IconSymbol name="paperplane.fill" size={20} color={prompt.trim() ? "#fff" : "#94A3B8"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

function SuggestionChip({ text, onPress }: { text: string, onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.suggestionChip} onPress={onPress}>
            <Text style={styles.suggestionText}>{text}</Text>
        </TouchableOpacity>
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
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    content: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'flex-end',
    },
    botRow: {
        justifyContent: 'flex-start',
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    botAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    botBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    userBubble: {
        backgroundColor: '#0F172A',
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    botText: {
        color: '#334155',
    },
    userText: {
        color: '#fff',
    },
    suggestionsContainer: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 10,
        paddingLeft: 42,
        paddingRight: 16,
    },
    suggestionChip: {
        flex: 1, // Equal width for all chips
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    suggestionText: {
        fontSize: 9, // Slightly smaller to ensure "Heybeliada" fits in equal width
        fontWeight: '800',
        color: '#EC4899',
        textAlign: 'center',
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F1F5F9',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    textInput: {
        flex: 1,
        maxHeight: 120,
        minHeight: 40,
        fontSize: 16,
        color: '#0F172A',
        paddingTop: 10,
        paddingBottom: 10,
    },
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
    sendButtonDisabled: {
        backgroundColor: '#E2E8F0',
    }
});
