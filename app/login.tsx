import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <LinearGradient 
                colors={['#1e293b', '#0f172a']} 
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
                        <IconSymbol name="person.fill" size={36} color="#10B981" />
                    </View>
                    <Text style={styles.welcomeTitle}>Tekrar Merhaba</Text>
                    <Text style={styles.welcomeSubtitle}>Hesabına giriş yap ve toplulukta neler olup bittiğini gör.</Text>
                </View>
            </LinearGradient>

            <View style={styles.cardContainer}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>E-POSTA</Text>
                        <View style={styles.inputWrapper}>
                            <IconSymbol name="envelope.fill" size={18} color="#94A3B8" />
                            <TextInput 
                                style={styles.input} 
                                placeholder="E-posta adresini gir"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.inputLabel}>ŞİFRE</Text>
                            <TouchableOpacity>
                                <Text style={styles.forgotText}>Unuttum?</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inputWrapper}>
                            <IconSymbol name="plus" size={18} color="#94A3B8" /> 
                            <TextInput 
                                style={styles.input} 
                                placeholder="********"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.primaryButton} 
                        onPress={() => router.replace('/(tabs)/explore/island/forum')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Giriş Yap</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Henüz hesabın yok mu? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup')}>
                            <Text style={styles.signupText}>Hemen Katıl</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerBackground: { height: SCREEN_HEIGHT * 0.358, paddingHorizontal: 30 },
    backButton: { position: 'absolute', left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    branding: { alignItems: 'center' },
    logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
    welcomeTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
    welcomeSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
    cardContainer: { flex: 1, backgroundColor: '#fff', marginTop: -40, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 30, paddingTop: 40 },
    scrollContent: { paddingBottom: 40 },
    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: '#415A77', marginBottom: 8, letterSpacing: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0D1B2A', fontWeight: '500' },
    forgotText: { fontSize: 11, fontWeight: '800', color: '#10B981', marginBottom: 8 },
    primaryButton: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 },
    primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { fontSize: 14, color: '#94A3B8' },
    signupText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' }
});
