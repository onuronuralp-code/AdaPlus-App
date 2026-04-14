import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Keyboard, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GuideScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [prompt, setPrompt] = useState('');
    const [keyboardHeight] = useState(new Animated.Value(0));

    useEffect(() => {
        if (Platform.OS === 'android') return;

        const show = Keyboard.addListener('keyboardWillShow', (e) => {
            Animated.timing(keyboardHeight, {
                toValue: e.endCoordinates.height,
                duration: e.duration || 250,
                useNativeDriver: false,
            }).start();
        });
        const hide = Keyboard.addListener('keyboardWillHide', (e) => {
            Animated.timing(keyboardHeight, {
                toValue: 0,
                duration: e.duration || 250,
                useNativeDriver: false,
            }).start();
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const safeAreaPadding = keyboardHeight.interpolate({
        inputRange: [0, 100],
        outputRange: [Math.max(insets.bottom, 12), 12],
        extrapolate: 'clamp'
    });

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tur Rehberi</Text>
            </View>

            <Animated.View style={{ flex: 1, paddingBottom: Platform.OS === 'ios' ? keyboardHeight : 0 }}>
                {/* Chat Content Area */}
                <ScrollView style={styles.content}>
                    
                </ScrollView>

                {/* Input Bar */}
                <Animated.View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? safeAreaPadding : Math.max(insets.bottom, 12) }]}>
                    <View style={styles.inputBox}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ask Ada AI..."
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
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
