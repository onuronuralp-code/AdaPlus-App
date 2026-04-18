import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

    const validateEmail = (val: string): string | undefined => {
        const trimmed = val.trim();
        if (!trimmed) return 'E-posta adresi boş bırakılamaz.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Geçerli bir e-posta adresi giriniz.';
        return undefined;
    };

    const validatePassword = (val: string): string | undefined => {
        if (!val) return 'Şifre alanı boş bırakılamaz.';
        if (val.length < 8) return 'Şifre en az 8 karakter olmalıdır.';
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
        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);
        setTouched({ email: true, password: true });
        setErrors({ email: emailError, password: passwordError });
        if (emailError || passwordError) return;

        if (emailError || passwordError) return;

        setLoading(true);
        try {
            const response = await authApi.login(email.trim(), password);
            // TODO: Store token in AsyncStorage
            console.log('Login successful, token:', response.token);
            router.replace('/(tabs)/explore/island/forum');
        } catch (error: any) {
            const msg = error.message || 'Giriş yapılamadı.';
            if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('doğrulan')) {
                Alert.alert('Doğrulama Gerekli', 'E-postanız henüz doğrulanmamış.', [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Doğrula', onPress: () => router.push({ pathname: '/verify', params: { email: email.trim() } }) },
                ]);
            } else {
                Alert.alert('Giriş Hatası', msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPasswordSubmit = async () => {
        const emailError = validateEmail(email);
        setTouched(prev => ({ ...prev, email: true }));
        setErrors(prev => ({ ...prev, email: emailError }));
        if (emailError) return;

        setLoading(true);
        try {
            await authApi.forgotPassword(email.trim());
            Alert.alert('E-posta Gönderildi', 'Şifre sıfırlama kodun e-posta adresine gönderildi. Kodu kullanarak şifreni yenileyebilirsin.', [
                { text: 'Şimdi Yenile', onPress: () => router.push({ pathname: '/reset-password', params: { token: '' } }) },
                { text: 'Kapat', onPress: () => setIsForgotPassword(false), style: 'cancel' }
            ]);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Bağlantı gönderilemedi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

                <View style={[styles.branding, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.logoCircle}>
                        <IconSymbol name="person.fill" size={28} color="#10B981" />
                    </View>
                    <Text style={styles.welcomeTitle}>{isForgotPassword ? "Şifre Sıfırlama" : "Tekrar Merhaba"}</Text>
                    <Text style={styles.welcomeSubtitle}>
                        {isForgotPassword 
                            ? "E-posta adresini gir, şifreni sıfırlaman için bir bağlantı gönderelim." 
                            : "Hesabına giriş yap ve toplulukta neler olup bittiğini gör."}
                    </Text>
                </View>
            </LinearGradient>

            <View style={styles.cardContainer}>
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>E-POSTA</Text>
                        <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                            <IconSymbol name="envelope.fill" size={18} color={errors.email ? '#EF4444' : '#94A3B8'} />
                            <TextInput 
                                style={styles.input} 
                                placeholder="E-posta adresini gir"
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

                    {!isForgotPassword && (
                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.inputLabel}>ŞİFRE</Text>
                                <TouchableOpacity onPress={() => setIsForgotPassword(true)}>
                                    <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                                <IconSymbol name="plus" size={18} color={errors.password ? '#EF4444' : '#94A3B8'} /> 
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="En az 8 karakter"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    onBlur={handlePasswordBlur}
                                />
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
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
                            <Text style={styles.primaryButtonText}>{isForgotPassword ? "Bağlantı Gönder" : "Giriş Yap"}</Text>
                        )}
                    </TouchableOpacity>

                    {isForgotPassword ? (
                        <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => setIsForgotPassword(false)}>
                            <Text style={{ color: '#64748B', fontWeight: 'bold' }}>Giriş Ekranına Dön</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Henüz hesabın yok mu? </Text>
                            <TouchableOpacity onPress={() => router.push('/signup')}>
                                <Text style={styles.signupText}>Hemen Katıl</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerBackground: { height: SCREEN_HEIGHT * 0.358, paddingHorizontal: 30 },
    backButton: { position: 'absolute', left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    branding: { alignItems: 'center' },
    logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
    welcomeTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
    welcomeSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
    cardContainer: { flex: 1, backgroundColor: '#fff', marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 24 },
    formContainer: { flex: 1, paddingBottom: 20 },
    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: '#415A77', marginBottom: 8, letterSpacing: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0D1B2A', fontWeight: '500' },
    forgotText: { fontSize: 11, fontWeight: '800', color: '#10B981', marginBottom: 8 },
    primaryButton: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 },
    primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 'auto' },
    footerText: { fontSize: 14, color: '#94A3B8' },
    signupText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    inputWrapperError: { borderColor: '#EF4444', borderWidth: 1.5 },
    errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', position: 'absolute', bottom: -18, left: 4 },
});
