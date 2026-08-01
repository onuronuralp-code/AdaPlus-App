import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';
import { useTranslation } from 'react-i18next';
import { s, vs, ms } from '@/utils/scale';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

        setLoading(true);
        try {
            await authApi.resetPassword(token.trim() || 'reset-token', password);
            Alert.alert(
                t('common.success', { defaultValue: 'Başarılı' }),
                t('auth.resetSuccess', { defaultValue: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' }),
                [{ text: t('common.ok', { defaultValue: 'Tamam' }), onPress: () => router.replace('/login') }]
            );
        } catch (error: any) {
            Alert.alert(
                t('common.error', { defaultValue: 'Hata' }),
                error?.message || t('auth.resetFailed', { defaultValue: 'Şifre güncellenemedi. Lütfen tekrar deneyin.' })
            );
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
                            source={require('@/assets/images/begonvil_alt.png')}
                            style={{ position: 'absolute', width: SCREEN_WIDTH, height: '100%' }}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['rgba(0, 0, 0, 0.1)', '#0f172a']}
                            style={{ position: 'absolute', width: SCREEN_WIDTH, height: '100%' }}
                        />
                        <TouchableOpacity
                            style={[styles.backButton, { top: insets.top + vs(10) }]}
                            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/login'); }}
                        >
                            <IconSymbol name="chevron.left" size={ms(24)} color="#fff" />
                        </TouchableOpacity>

                        <View style={[styles.branding, { paddingTop: insets.top - vs(10), paddingBottom: vs(20) }]}>
                            <View style={styles.logoCircle}>
                                <IconSymbol name="lock.fill" size={ms(36)} color="#fff" />
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
                                        ? t('auth.resetLinkVerified', { defaultValue: 'Bağlantı doğrulandı. Yeni şifrenizi girin.' })
                                        : t('auth.resetLinkWaiting', { defaultValue: 'E-postanızdaki sıfırlama bağlantısına tıklayın.' })}
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.passwordLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="lock.fill" size={ms(18)} color={errors.password ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('auth.passwordPlaceholder')}
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={handlePasswordChange}
                                        onBlur={() => { setTouched(p => ({ ...p, password: true })); setErrors(p => ({ ...p, password: validatePassword(password) })); }}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                                        <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={ms(18)} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.confirmPasswordLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="lock.fill" size={ms(18)} color={errors.confirmPassword ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('auth.confirmPasswordPlaceholder')}
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showConfirmPassword}
                                        value={confirmPassword}
                                        onChangeText={handleConfirmPasswordChange}
                                        onBlur={() => { setTouched(p => ({ ...p, confirmPassword: true })); setErrors(p => ({ ...p, confirmPassword: validateConfirmPassword(confirmPassword) })); }}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                                        <IconSymbol name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'} size={ms(18)} color="#94A3B8" />
                                    </TouchableOpacity>
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={styles.primaryButtonText}>{t('auth.updateButton')}</Text>
                                        <IconSymbol name="checkmark.circle.fill" size={ms(18)} color="#fff" style={{ marginLeft: s(6) }} />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={{ marginTop: vs(24), alignItems: 'center' }} onPress={() => router.replace('/login')}>
                                <View style={{ borderBottomWidth: 1.5, borderBottomColor: '#64748B', paddingBottom: s(3) }}>
                                    <Text style={{ color: '#64748B', fontWeight: 'bold' }}>{t('auth.backToLogin')}</Text>
                                </View>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </View>
            </ScrollView>
        </React.Fragment>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerBackground: { height: SCREEN_HEIGHT * 0.35, paddingHorizontal: s(30), overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    backButton: { 
        position: 'absolute', 
        left: s(20), 
        zIndex: 10, 
        width: s(44), 
        height: s(44), 
        borderRadius: s(12), 
        backgroundColor: 'rgba(255,255,255,0.15)', 
        alignItems: 'center', 
        justifyContent: 'center'
    },
    branding: { alignItems: 'center' },
    logoCircle: { width: s(72), height: s(72), borderRadius: s(36), marginBottom: vs(16), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: vs(10) }, shadowOpacity: 0.3, shadowRadius: s(20) },
    welcomeTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: vs(8) },
    welcomeSubtitle: { fontSize: ms(11), color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: ms(16), paddingHorizontal: s(20) },
    cardContainer: { flex: 1, backgroundColor: '#fff', marginTop: vs(-20), borderTopLeftRadius: s(24), borderTopRightRadius: s(24), paddingHorizontal: s(20), paddingTop: vs(16) },
    formContainer: { flex: 1, paddingBottom: vs(20) },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: s(12),
        padding: vs(12),
        marginBottom: vs(16),
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
        fontSize: ms(12),
        fontWeight: '600',
    },
    infoBannerTextWaiting: {
        color: '#92400E',
    },
    infoBannerTextReady: {
        color: '#065F46',
    },
    inputGroup: { marginBottom: vs(10) },
    inputLabel: { fontSize: ms(11), fontWeight: '800', color: '#415A77', marginBottom: vs(8), letterSpacing: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: s(12), paddingHorizontal: s(16), paddingVertical: vs(14), borderWidth: 1, borderColor: '#E2E8F0' },
    inputWrapperError: { borderColor: '#EF4444', borderWidth: 1.5 },
    input: { flex: 1, marginLeft: s(12), fontSize: ms(16), color: '#0D1B2A', fontWeight: '500' },
    primaryButton: { flexDirection: 'row', backgroundColor: '#10B981', borderRadius: s(12), paddingVertical: vs(15), paddingHorizontal: s(16), alignItems: 'center', justifyContent: 'center', marginTop: vs(12), shadowColor: '#10B981', shadowOffset: { width: 0, height: vs(8) }, shadowOpacity: 0.25, shadowRadius: s(12), elevation: 8 },
    primaryButtonText: { color: '#fff', fontSize: ms(16), fontWeight: 'bold', marginRight: s(6) },
    errorText: { color: '#EF4444', fontSize: ms(12), fontWeight: '600', marginTop: vs(4), marginLeft: s(4) },
});
