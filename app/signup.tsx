import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';
import { useTranslation } from 'react-i18next';
import { KVKKModal } from '@/components/KVKKModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SignUpScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>({});
    const [kvkkVisible, setKvkkVisible] = useState(false);

    const validateName = (val: string): string | undefined => {
        const trimmed = val.trim();
        if (!trimmed) return t('auth.errors.nameRequired');
        if (!/^[a-zA-ZğüşöçıİĞÜŞÖÇ\s]+$/.test(trimmed)) return t('auth.errors.nameInvalid');
        if (trimmed.split(/\s+/).length < 2) return t('auth.errors.nameShort');
        return undefined;
    };

    const validateEmail = (val: string): string | undefined => {
        const trimmed = val.trim();
        if (!trimmed) return t('auth.errors.emailRequired');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return t('auth.errors.invalidEmail');
        return undefined;
    };

    const validatePassword = (val: string): string | undefined => {
        if (!val) return t('auth.errors.passwordRequired');
        if (val.length < 8) return t('auth.errors.passwordMin');
        return undefined;
    };

    const handleNameChange = (val: string) => {
        setName(val);
        if (touched.name) setErrors(prev => ({ ...prev, name: validateName(val) }));
    };

    const handleEmailChange = (val: string) => {
        setEmail(val);
        if (touched.email) setErrors(prev => ({ ...prev, email: validateEmail(val) }));
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        if (touched.password) setErrors(prev => ({ ...prev, password: validatePassword(val) }));
    };

    const handleNameBlur = () => {
        setTouched(prev => ({ ...prev, name: true }));
        setErrors(prev => ({ ...prev, name: validateName(name) }));
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
        const nameError = validateName(name);
        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);
        setTouched({ name: true, email: true, password: true });
        setErrors({ name: nameError, email: emailError, password: passwordError });
        if (nameError || emailError || passwordError) return;

        setKvkkVisible(true);
    };

    const handleSignupAfterKVKK = async () => {
        setKvkkVisible(false);
        setLoading(true);
        try {
            // Backend expects kvkkAccepted and termsAccepted as true
            await authApi.signup(name.trim(), email.trim(), password, true, true);
            router.push({ pathname: '/verify', params: { email: email.trim() } });
        } catch (error: any) {
            Alert.alert('Kayıt Hatası', error.message || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.container}>
                    <LinearGradient
                        colors={['#0D1B2A', '#1B263B']}
                        style={styles.headerBackground}
                    >
                        <Image
                            source={require('@/assets/images/begonvil.jpeg')}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['rgba(13, 27, 42, 0.4)', '#1B263B']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <TouchableOpacity
                            style={[styles.backButton, { top: insets.top + 10 }]}
                            onPress={() => {
                                if (router.canGoBack()) router.back();
                                else router.replace('/login');
                            }}
                        >
                            <IconSymbol name="chevron.left" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={[styles.branding, { paddingTop: insets.top + 20 }]}>
                            <View style={styles.logoCircle}>
                                <IconSymbol name="person.fill" size={36} color="#fff" />
                            </View>
                            <Text style={styles.welcomeTitle}>{t('auth.signupTitle')}</Text>
                            <Text style={styles.welcomeSubtitle}>{t('auth.signupSubtitle')}</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.cardContainer}>
                        <ScrollView
                            style={styles.formScroll}
                            contentContainerStyle={[styles.formContainer, { paddingBottom: insets.bottom + 24 }]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.nameLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.name ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="person.fill" size={18} color={errors.name ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('auth.namePlaceholder')}
                                        placeholderTextColor="#94A3B8"
                                        value={name}
                                        onChangeText={handleNameChange}
                                        onBlur={handleNameBlur}
                                        autoCapitalize="words"
                                    />
                                </View>
                                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.emailLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="envelope.fill" size={18} color={errors.email ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('auth.emailPlaceholder')}
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={handleEmailChange}
                                        onBlur={handleEmailBlur}
                                    />
                                </View>
                                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
                                        onBlur={handlePasswordBlur}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                                        <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
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
                                        <Text style={styles.primaryButtonText}>{t('auth.signupButton')}</Text>
                                        <IconSymbol name="chevron.right" size={18} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <Text style={styles.dividerText}>{t('auth.orDivider')}</Text>
                                <View style={styles.line} />
                            </View>

                            <View style={styles.socialGrid}>
                                <View style={styles.socialButtonWrapper}>
                                    <View style={[styles.socialButton, styles.socialButtonDisabled]}>
                                        <IconSymbol name="globe" size={20} color="#94A3B8" />
                                        <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>Google</Text>
                                    </View>
                                    <View style={styles.comingSoonBadge}>
                                        <Text style={styles.comingSoonText}>Yakında</Text>
                                    </View>
                                </View>
                                <View style={styles.socialButtonWrapper}>
                                    <View style={[styles.socialButton, styles.socialButtonDisabled]}>
                                        <IconSymbol name="apple.logo" size={20} color="#94A3B8" />
                                        <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>Apple</Text>
                                    </View>
                                    <View style={styles.comingSoonBadge}>
                                        <Text style={styles.comingSoonText}>Yakında</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
                                <TouchableOpacity onPress={() => router.push('/login')}>
                                    <Text style={styles.loginText}>{t('auth.loginLink')}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </TouchableWithoutFeedback>

            <KVKKModal
                isVisible={kvkkVisible}
                onClose={() => setKvkkVisible(false)}
                onAccept={handleSignupAfterKVKK}
            />
        </KeyboardAvoidingView>
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
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    branding: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
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
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    formScroll: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    formContainer: {
        flexGrow: 1,
    },
    inputGroup: {
        marginBottom: 20,
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
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
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
    socialButtonWrapper: {
        flex: 1,
        position: 'relative',
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 14,
    },
    socialButtonDisabled: {
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
        opacity: 0.6,
    },
    socialButtonText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    socialButtonTextDisabled: {
        color: '#94A3B8',
    },
    comingSoonBadge: {
        position: 'absolute',
        top: -8,
        right: -4,
        backgroundColor: '#F59E0B',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    comingSoonText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
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
    inputWrapperError: {
        borderColor: '#EF4444',
        borderWidth: 1.5,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
        position: 'absolute',
        bottom: -18,
        left: 4,
    },
});
