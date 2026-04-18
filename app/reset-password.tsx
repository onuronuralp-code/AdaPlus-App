import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ResetPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token: initialToken } = useLocalSearchParams<{ token: string }>();
    
    const [token, setToken] = useState(initialToken || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ token?: string; password?: string; confirmPassword?: string }>({});
    const [touched, setTouched] = useState<{ token?: boolean; password?: boolean; confirmPassword?: boolean }>({});

    const validateToken = (val: string): string | undefined => {
        if (!val.trim()) return 'Sıfırlama kodu gereklidir.';
        return undefined;
    };

    const validatePassword = (val: string): string | undefined => {
        if (!val) return 'Şifre alanı boş bırakılamaz.';
        if (val.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
        return undefined;
    };

    const validateConfirmPassword = (val: string): string | undefined => {
        if (!val) return 'Şifre tekrarı gereklidir.';
        if (val !== password) return 'Şifreler eşleşmiyor.';
        return undefined;
    };

    const handleTokenChange = (val: string) => {
        setToken(val);
        if (touched.token) setErrors(prev => ({ ...prev, token: validateToken(val) }));
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        if (touched.password) setErrors(prev => ({ ...prev, password: validatePassword(val) }));
        if (touched.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: val !== confirmPassword ? 'Şifreler eşleşmiyor.' : undefined }));
    };

    const handleConfirmPasswordChange = (val: string) => {
        setConfirmPassword(val);
        if (touched.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(val) }));
    };

    const handleSubmit = async () => {
        const tokenErr = validateToken(token);
        const passErr = validatePassword(password);
        const confErr = validateConfirmPassword(confirmPassword);
        
        setTouched({ token: true, password: true, confirmPassword: true });
        setErrors({ token: tokenErr, password: passErr, confirmPassword: confErr });

        if (tokenErr || passErr || confErr) return;

        setLoading(true);
        try {
            await authApi.resetPassword(token.trim(), password);
            Alert.alert('Başarılı', 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.', [
                { text: 'Tamam', onPress: () => router.replace('/login') }
            ]);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Şifre sıfırlanamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <LinearGradient 
                colors={['#1E293B', '#0F172A']} 
                style={styles.headerBackground}
            >
                <TouchableOpacity 
                    style={[styles.backButton, { top: insets.top + 10 }]} 
                    onPress={() => router.back()}
                >
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={[styles.branding, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.logoCircle}>
                        <IconSymbol name="lock.fill" size={30} color="#F59E0B" />
                    </View>
                    <Text style={styles.welcomeTitle}>Şifreyi Yenile</Text>
                    <Text style={styles.welcomeSubtitle}>E-postandaki kodu ve yeni şifreni girerek hesabını kurtar.</Text>
                </View>
            </LinearGradient>

            <View style={styles.cardContainer}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>SIFIRLAMA KODU</Text>
                        <View style={[styles.inputWrapper, errors.token ? styles.inputWrapperError : null]}>
                            <IconSymbol name="key.fill" size={18} color={errors.token ? '#EF4444' : '#94A3B8'} />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Kodu buraya yapıştırın"
                                placeholderTextColor="#94A3B8"
                                value={token}
                                onChangeText={handleTokenChange}
                                autoCapitalize="none"
                            />
                        </View>
                        {errors.token && <Text style={styles.errorText}>{errors.token}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>YENİ ŞİFRE</Text>
                        <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                            <IconSymbol name="lock.fill" size={18} color={errors.password ? '#EF4444' : '#94A3B8'} />
                            <TextInput 
                                style={styles.input} 
                                placeholder="En az 8 karakter"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry
                                value={password}
                                onChangeText={handlePasswordChange}
                            />
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>ŞİFRE TEKRAR</Text>
                        <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputWrapperError : null]}>
                            <IconSymbol name="lock.fill" size={18} color={errors.confirmPassword ? '#EF4444' : '#94A3B8'} />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Şifreyi onayla"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={handleConfirmPasswordChange}
                            />
                        </View>
                        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>

                    <TouchableOpacity 
                        style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Text style={styles.primaryButtonText}>Şifreyi Güncelle</Text>
                                <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerBackground: {
        height: SCREEN_HEIGHT * 0.35,
        paddingHorizontal: 30,
        justifyContent: 'center',
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
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: -30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    formContainer: {
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
        letterSpacing: 1.2,
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
    inputWrapperError: {
        borderColor: '#EF4444',
        backgroundColor: '#FFF1F2',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        marginLeft: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: '#3B82F6',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 4,
    },
});
