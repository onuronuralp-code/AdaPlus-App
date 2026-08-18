import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import ErrorModal from '@/components/ErrorModal';
import { s, vs, ms, SCREEN_HEIGHT } from '@/utils/scale';
const isEmailPattern = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
const isPhonePattern = (val: string) => /^\+?[0-9]{7,15}$/.test(val.trim().replace(/[\s\-()]/g, ''));

export default function LoginScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [focusedField, setFocusedField] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
    const { login: setAuthLogin } = useAuth();
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorModalMsg, setErrorModalMsg] = useState('');

    useFocusEffect(
        useCallback(() => {
            setErrors({});
            setTouched({});
        }, [])
    );

    const validateEmail = (val: string): string | undefined => {
        const trimmed = val.trim();
        if (!trimmed) return t('auth.errors.emailRequired');
        if (isEmailPattern(trimmed) || isPhonePattern(trimmed)) return undefined;
        return t('auth.errors.invalidEmail');
    };

    const validatePassword = (val: string): string | undefined => {
        if (!val) return t('auth.errors.passwordRequired');
        if (val.length < 8) return t('auth.errors.passwordMin');
        return undefined;
    };

    const handleEmailChange = (val: string) => {
        setEmail(val);
        if (touched.email) setErrors(prev => ({ ...prev, email: validateEmail(val) }));
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        if (touched.password) setErrors(prev => ({ ...prev, password: validatePassword(val) }));
    };

    const handleEmailBlur = () => {
        setTouched(prev => ({ ...prev, email: true }));
        setErrors(prev => ({ ...prev, email: validateEmail(email) }));
    };

    const handlePasswordBlur = () => {
        setTouched(prev => ({ ...prev, password: true }));
        setErrors(prev => ({ ...prev, password: validatePassword(password) }));
    };

    const handleSubmit = async () => {
        if (loading) return;
        
        const emailError = validateEmail(email);
        setTouched(prev => ({ ...prev, email: true }));
        setErrors(prev => ({ ...prev, email: emailError }));
        if (emailError) return;
        const identifier = email.trim();

        const passwordError = validatePassword(password);
        setTouched(prev => ({ ...prev, password: true }));
        setErrors(prev => ({ ...prev, password: passwordError }));
        if (passwordError) return;

        setLoading(true);
        try {
            const response = await authApi.login(identifier, password);
            await setAuthLogin(response.user, response.token);
            router.replace('/(tabs)/explore');
        } catch (error: any) {
            let msg = error.message || 'Giriş yapılamadı.';
            if (typeof msg === 'string' && (msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('invalid'))) {
                msg = t('auth.invalidCredentials', { defaultValue: 'Geçersiz e-posta/telefon veya şifre.' });
            }
            if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('doğrulan')) {
                Alert.alert('Doğrulama Gerekli', 'E-postanız henüz doğrulanmamış.', [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Doğrula', onPress: () => router.push({ pathname: '/verify', params: { email: identifier } }) },
                ]);
            } else {
                setErrorModalMsg(msg);
                setErrorModalVisible(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPasswordSubmit = async () => {
        if (loading) return;
        const emailError = validateEmail(email);
        setTouched(prev => ({ ...prev, email: true }));
        setErrors(prev => ({ ...prev, email: emailError }));
        if (emailError) return;

        setLoading(true);
        try {
            const res = await authApi.forgotPassword(email.trim());
            if (res && ((res as any).userExists === false || (res as any).exists === false || (res as any).success === false)) {
                throw new Error(t('auth.userNotFound', { defaultValue: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' }));
            }
            // Don't navigate to /reset-password here — that screen is only reachable
            // via the emailed deep link, which carries the reset token as a param.
            setIsForgotPassword(false);
            Alert.alert(
                t('common.success', { defaultValue: 'Başarılı' }),
                t('auth.resetLinkSent', { defaultValue: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen e-postanızdaki bağlantıya tıklayın.' })
            );
        } catch (error: any) {
            let msg = error?.message || t('auth.userNotFound', { defaultValue: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
            if (typeof msg !== 'string' || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('hata')) {
                msg = t('auth.userNotFound', { defaultValue: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
            }
            setErrorModalMsg(msg);
            setErrorModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.container}>
            
            <View style={styles.headerBackground}>
                <Image
                    source={require('@/assets/images/begonvil_alt.png')}
                    style={{ position: 'absolute', left: 0, right: 0, width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
                <LinearGradient 
                    colors={['rgba(0, 0, 0, 0.1)', '#0f172a']} 
                    style={{ position: 'absolute', left: 0, right: 0, width: '100%', height: '100%' }}
                />
                <TouchableOpacity 
                    style={[styles.backButton, { top: insets.top + vs(10) }]} 
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.back();
                    }}
                >
                    <IconSymbol name="chevron.left" size={ms(24)} color="#fff" />
                </TouchableOpacity>

                <View style={[styles.branding, { paddingTop: insets.top - vs(10), paddingBottom: vs(20) }]}>
                    <View style={styles.logoCircle}>
                        <IconSymbol name={isForgotPassword ? "lock.fill" : "person.fill"} size={ms(36)} color="#fff" />
                    </View>
                    <Text style={styles.welcomeTitle}>{isForgotPassword ? t('auth.resetTitle') : t('auth.loginTitle')}</Text>
                    <Text style={styles.welcomeSubtitle}>
                        {isForgotPassword 
                            ? t('auth.resetSubtitle') 
                            : t('auth.loginSubtitle')}
                    </Text>
                </View>
            </View>

            <View style={styles.cardContainer}>
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('auth.emailLabel')}</Text>
                        <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                            <IconSymbol name="envelope.fill" size={ms(18)} color={errors.email ? '#EF4444' : '#94A3B8'} />
                            <TextInput 
                                style={styles.input} 
                                placeholder={(errors.email && focusedField !== 'email') ? errors.email : t('auth.emailPlaceholder')}
                                placeholderTextColor={(errors.email && focusedField !== 'email') ? "#EF4444" : "#94A3B8"}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={(errors.email && focusedField !== 'email') ? '' : email}
                                onChangeText={handleEmailChange}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => {
                                    setFocusedField('');
                                    handleEmailBlur();
                                }}
                            />
                        </View>
                    </View>



                    {!isForgotPassword && (
                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.inputLabel}>{t('auth.passwordLabel')}</Text>
                                <TouchableOpacity onPress={() => setIsForgotPassword(true)}>
                                    <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                                <IconSymbol name="lock.fill" size={ms(18)} color={errors.password ? '#EF4444' : '#94A3B8'} /> 
                                <TextInput 
                                    style={[styles.input, { flex: 1 }]} 
                                    placeholder={(errors.password && focusedField !== 'password') ? errors.password : t('auth.passwordPlaceholder')}
                                    placeholderTextColor={(errors.password && focusedField !== 'password') ? "#EF4444" : "#94A3B8"}
                                    secureTextEntry={!showPassword}
                                    value={(errors.password && focusedField !== 'password') ? '' : password}
                                    onChangeText={handlePasswordChange}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => {
                                        setFocusedField('');
                                        handlePasswordBlur();
                                    }}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: s(4) }}>
                                    <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={ms(18)} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
                        onPress={isForgotPassword ? handleForgotPasswordSubmit : handleSubmit}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>{isForgotPassword ? t('auth.sendCode', { defaultValue: 'Bağlantı Gönder' }) : t('auth.loginButton')}</Text>
                        )}
                    </TouchableOpacity>

                    {isForgotPassword ? (
                        <TouchableOpacity style={{ marginTop: vs(24), alignItems: 'center' }} onPress={() => setIsForgotPassword(false)}>
                            <View style={{ borderBottomWidth: 1.5, borderBottomColor: '#64748B', paddingBottom: s(3) }}>
                                <Text style={{ color: '#64748B', fontWeight: 'bold' }}>{t('auth.backToLogin')}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={styles.signupButtonOutline} 
                            onPress={() => router.replace('/signup')}
                            activeOpacity={0.7}
                            disabled={loading}
                        >
                            <Text style={styles.footerText}>
                                {t('auth.noAccount')} <Text style={styles.signupText}>{t('auth.signupLink')}</Text>
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            </View>
        </ScrollView>
        <ErrorModal 
            visible={errorModalVisible}
            onClose={() => setErrorModalVisible(false)}
            title={t('common.error', { defaultValue: 'Hata' })}
            message={errorModalMsg}
        />
        </KeyboardAvoidingView>
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
    inputGroup: { marginBottom: vs(10) },
    inputLabel: { fontSize: ms(11), fontWeight: '800', color: '#415A77', marginBottom: vs(8), letterSpacing: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: s(12), paddingHorizontal: s(16), paddingVertical: vs(14), borderWidth: 1, borderColor: '#E2E8F0' },
    input: { flex: 1, marginLeft: s(10), fontSize: ms(14), color: '#0D1B2A', fontWeight: '500' },
    forgotText: { fontSize: ms(11), fontWeight: '800', color: '#10B981', marginBottom: vs(8) },
    primaryButton: { backgroundColor: '#10B981', borderRadius: s(12), paddingVertical: vs(14), alignItems: 'center', justifyContent: 'center', marginTop: vs(10), shadowColor: '#10B981', shadowOffset: { width: 0, height: vs(8) }, shadowOpacity: 0.25, shadowRadius: s(15), elevation: 8 },
    primaryButtonText: { color: '#fff', fontSize: ms(17), fontWeight: 'bold' },
    signupButtonOutline: { marginTop: vs(16), flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: vs(14), borderRadius: s(12), borderWidth: 1.5, borderColor: '#10B981', backgroundColor: '#FFFFFF' },
    footerText: { fontSize: ms(14), color: '#64748B', fontWeight: '600' },
    signupText: { fontSize: ms(14), fontWeight: '800', color: '#10B981' },
    inputWrapperError: { borderColor: '#EF4444', borderWidth: 1.5 },
    errorText: { color: '#EF4444', fontSize: ms(12), fontWeight: '600', marginTop: vs(4), marginLeft: s(4) },
});
