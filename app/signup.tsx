import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SignUpScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <LinearGradient 
                colors={['#0D1B2A', '#1B263B']} 
                style={styles.headerBackground}
            >
                <TouchableOpacity 
                    style={[styles.backButton, { top: insets.top + 10 }]} 
                    onPress={() => router.back()}
                >
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={[styles.branding, { paddingTop: insets.top + 60 }]}>
                    <View style={styles.logoCircle}>
                        <IconSymbol name="plus" size={40} color="#3B82F6" />
                    </View>
                    <Text style={styles.welcomeTitle}>Topluluğa Hoş Geldin</Text>
                    <Text style={styles.welcomeSubtitle}>Adanın en büyük topluluğuna katılarak maceranı paylaşmaya başla.</Text>
                </View>
            </LinearGradient>

            <View style={styles.cardContainer}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>İSİM SOYİSİM</Text>
                        <View style={styles.inputWrapper}>
                            <IconSymbol name="person.fill" size={18} color="#94A3B8" />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Örn: Ahmet Yılmaz"
                                placeholderTextColor="#94A3B8"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>E-POSTA ADRESİ</Text>
                        <View style={styles.inputWrapper}>
                            <IconSymbol name="envelope.fill" size={18} color="#94A3B8" />
                            <TextInput 
                                style={styles.input} 
                                placeholder="ahmet@example.com"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.primaryButton} 
                        onPress={() => router.replace('/(tabs)/explore/island/forum')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Devam Et</Text>
                        <IconSymbol name="chevron.right" size={18} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>VEYA</Text>
                        <View style={styles.line} />
                    </View>

                    <View style={styles.socialGrid}>
                        <TouchableOpacity style={styles.socialButton}>
                            <IconSymbol name="globe" size={20} color="#000" />
                            <Text style={styles.socialButtonText}>Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialButton}>
                            <IconSymbol name="apple.logo" size={20} color="#000" />
                            <Text style={styles.socialButtonText}>Apple</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Zaten bir hesabın var mı? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.loginText}>Giriş Yap</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerBackground: {
        height: SCREEN_HEIGHT * 0.358,
        paddingHorizontal: 30,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    branding: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: -40,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 30,
        paddingTop: 40,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#415A77',
        marginBottom: 8,
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#0D1B2A',
        fontWeight: '500',
    },
    primaryButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        marginRight: 8,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    socialGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 14,
    },
    socialButtonText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        color: '#94A3B8',
    },
    loginText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
});
