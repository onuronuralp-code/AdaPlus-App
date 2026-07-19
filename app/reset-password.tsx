import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ResetPasswordScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();

    const [token, setToken] = useState(tokenParam || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
    const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({});

    // Token arrives via deep link after user taps the reset email — update state reactively
    useEffect(() => {
        if (tokenParam) setToken(tokenParam);
    }, [tokenParam]);

    const validatePassword = (val: string): string | undefined => {
        if (!val) return t('auth.errors.passwordRequired');
        if (val.length < 8) return t('auth.errors.passwordMin');
        return undefined;
    };

    const validateConfirmPassword = (val: string): string | undefined => {
        if (!val) return t('auth.confirmPasswordPlaceholder');
        if (val !== password) return t('auth.errors.passwordMismatch');
        return undefined;
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
        const passErr = validatePassword(password);
        const confErr = validateConfirmPassword(confirmPassword);
        setTouched({ password: true, confirmPassword: true });
        setErrors({ password: passErr, confirmPassword: confErr });
        if (passErr || confErr) return;

        if (!token) {
            Alert.alert('Bağlantı Bekleniyor', 'Lütfen e-postanızdaki şifre sıfırlama bağlantısına tıklayın.');
            return;
        }

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
        <React.Fragment>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
                <View style={styles.container}>

                    <View style={styles.headerBackground}>
                        <Image
                            source={require('@/assets/images/begonvil.jpeg')}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['rgba(0, 0, 0, 0.1)', '#0f172a']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <TouchableOpacity
                            style={[styles.backButton, { top: insets.top + 10 }]}
                            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/login'); }}
                        >
                            <IconSymbol name="chevron.left" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={[styles.branding, { paddingTop: insets.top + 20 }]}>
                            <View style={styles.logoCircle}>
                                <IconSymbol name="lock.fill" size={30} color="#F59E0B" />
                            </View>
                            <Text style={styles.welcomeTitle}>{t('auth.resetTitle')}</Text>
                            <Text style={styles.welcomeSubtitle}>{t('auth.resetSubtitle')}</Text>
                        </View>
                    </View>

                    <View style={styles.cardContainer}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>

                            {/* Email link status banner */}
                            <View style={[styles.infoBanner, token ? styles.infoBannerReady : styles.infoBannerWaiting]}>
                                <IconSymbol
                                    name={token ? 'checkmark.circle.fill' : 'envelope.fill'}
                                    size={16}
                                    color={token ? '#059669' : '#D97706'}
                                />
                                <Text style={[styles.infoBannerText, token ? styles.infoBannerTextReady : styles.infoBannerTextWaiting]}>
                                    {token
                                        ? 'Bağlantı doğrulandı. Yeni şifrenizi girin.'
                                        : 'E-postanızdaki sıfırlama bağlantısına tıklayın.'}
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.passwordLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="lock.fill" size={18} color={errors.password ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder={t('auth.passwordPlaceholder')}
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={handlePasswordChange}
                                        onBlur={() => { setTouched(p => ({ ...p, password: true })); setErrors(p => ({ ...p, password: validatePassword(password) })); }}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                                        <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.confirmPasswordLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="lock.fill" size={18} color={errors.confirmPassword ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder={t('auth.confirmPasswordPlaceholder')}
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showConfirmPassword}
                                        value={confirmPassword}
                                        onChangeText={handleConfirmPasswordChange}
                                        onBlur={() => { setTouched(p => ({ ...p, confirmPassword: true })); setErrors(p => ({ ...p, confirmPassword: validateConfirmPassword(confirmPassword) })); }}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                                        <IconSymbol name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryButton, (loading || !token) && { opacity: 0.5 }]}
                                onPress={handleSubmit}
                                activeOpacity={0.8}
                                disabled={loading || !token}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.primaryButtonText}>{t('auth.updateButton')}</Text>
                                        <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </View>
            </ScrollView>
        </React.Fragment>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerBackground: {
        height: SCREEN_HEIGHT * 0.32,
        paddingHorizontal: 30,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    branding: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
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
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
    },
    infoBannerWaiting: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FCD34D',
    },
    infoBannerReady: {
        backgroundColor: '#ECFDF5',
        borderColor: '#6EE7B7',
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    infoBannerTextWaiting: {
        color: '#92400E',
    },
    infoBannerTextReady: {
        color: '#065F46',
    },
    inputGroup: {
        marginBottom: 10,
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
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 6,
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
        borderRadius: 12,
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
