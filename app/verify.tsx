import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';
import { useAuth } from '@/context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CODE_LENGTH = 6;

const maskEmail = (email: string) =>
    email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c);

const maskPhone = (phone: string) => {
    const clean = phone.replace(/[\s\-()]/g, '');
    if (clean.length <= 5) return '***';
    return clean.slice(0, 4) + '***' + clean.slice(-2);
};

export default function VerifyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { login } = useAuth();

    // Support legacy `email` param for any existing deep-links/back-compat
    const { contact: contactParam, email: emailParam, type } = useLocalSearchParams<{
        contact?: string;
        email?: string;
        type?: 'email' | 'phone';
    }>();
    const contact = (contactParam || emailParam || '').slice(0, 320);
    const isPhone = type === 'phone';

    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

    const handleChange = (text: string, index: number) => {
        if (error) setError('');

        if (text.length > 1) {
            const chars = text.slice(0, CODE_LENGTH).split('');
            const newCode = [...code];
            chars.forEach((c, i) => {
                if (index + i < CODE_LENGTH) newCode[index + i] = c;
            });
            setCode(newCode);
            const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
            inputs.current[nextIndex]?.focus();
            return;
        }

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < CODE_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length < CODE_LENGTH) {
            setError('Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.');
            return;
        }

        setLoading(true);
        try {
            const response = await authApi.verifyOtp(contact, fullCode);
            await login(response.user, response.token);
            router.replace('/(tabs)/explore');
        } catch (err: any) {
            const msg = (err.message || '').toLowerCase();
            if (msg.includes('expired')) {
                setError('Kodun süresi dolmuş. Lütfen yeni kod isteyin.');
            } else {
                setError('Girdiğiniz doğrulama kodu hatalı.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        try {
            await authApi.resendVerification(contact);
            setTimer(60);
            setCanResend(false);
            setCode(Array(CODE_LENGTH).fill(''));
            setError('');
            inputs.current[0]?.focus();
        } catch (err: any) {
            Alert.alert('Hata', err.message || 'Kod gönderilemedi.');
        }
    };

    const maskedContact = isPhone
        ? maskPhone(contact)
        : (contact ? maskEmail(contact) : '***@***.com');

    const screenTitle = isPhone ? 'SMS Doğrulama' : 'E-posta Doğrulama';
    const subtitleContact = isPhone
        ? `${maskedContact} numarasına gönderilen 6 haneli kodu giriniz.`
        : `${maskedContact} adresine gönderilen 6 haneli kodu giriniz.`;
    const infoText = isPhone
        ? 'Kısa mesajın gelmesi birkaç saniye sürebilir. Hala gelmediyse "Tekrar Gönder" seçeneğini kullanın.'
        : 'Spam veya gereksiz (junk) klasörünü de kontrol etmeyi unutmayın.';

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <LinearGradient
                colors={['#0D1B2A', '#1B263B']}
                style={styles.headerBackground}
            >
                <TouchableOpacity
                    style={[styles.backButton, { top: insets.top + 10 }]}
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.back();
                    }}
                >
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={[styles.branding, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.logoCircle}>
                        <IconSymbol
                            name={isPhone ? 'phone.fill' : 'envelope.fill'}
                            size={36}
                            color="#3B82F6"
                        />
                    </View>
                    <Text style={styles.welcomeTitle}>{screenTitle}</Text>
                    <Text style={styles.welcomeSubtitle}>
                        <Text style={styles.contactHighlight}>{maskedContact}</Text>
                        {isPhone
                            ? ' numarasına gönderilen 6 haneli kodu giriniz.'
                            : ' adresine gönderilen 6 haneli kodu giriniz.'}
                    </Text>
                </View>
            </LinearGradient>

            <View style={styles.cardContainer}>
                <View style={styles.codeRow}>
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            style={[
                                styles.codeInput,
                                digit ? styles.codeInputFilled : null,
                                error ? styles.codeInputError : null,
                            ]}
                            value={digit}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            autoFocus={index === 0}
                        />
                    ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                    style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                    onPress={handleVerify}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Text style={styles.primaryButtonText}>Doğrula</Text>
                            <IconSymbol name="chevron.right" size={18} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                    <Text style={styles.resendLabel}>Kod gelmedi mi? </Text>
                    {canResend ? (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={styles.resendActive}>Tekrar Gönder</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.resendTimer}>{timer}s sonra tekrar dene</Text>
                    )}
                </View>

                <View style={styles.infoBox}>
                    <IconSymbol name="info.circle.fill" size={18} color="#3B82F6" />
                    <Text style={styles.infoText}>{infoText}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerBackground: { height: SCREEN_HEIGHT * 0.40, paddingHorizontal: 30 },
    backButton: {
        position: 'absolute', left: 20, zIndex: 10, width: 40, height: 40,
        borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    branding: { alignItems: 'center' },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2, shadowRadius: 20,
    },
    welcomeTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
    welcomeSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
    contactHighlight: { color: '#60A5FA', fontWeight: '700' },
    cardContainer: {
        flex: 1, backgroundColor: '#fff', marginTop: -20,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 32, alignItems: 'center',
    },
    codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 12 },
    codeInput: {
        width: 48, height: 58, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC', textAlign: 'center', fontSize: 22, fontWeight: '800',
        color: '#0D1B2A',
    },
    codeInputFilled: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
    codeInputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
    primaryButton: {
        flexDirection: 'row', backgroundColor: '#3B82F6', borderRadius: 12,
        paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
        marginTop: 16, width: '100%',
        shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25, shadowRadius: 15, elevation: 8,
    },
    primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginRight: 8 },
    resendContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
    resendLabel: { fontSize: 14, color: '#94A3B8' },
    resendActive: { fontSize: 14, fontWeight: 'bold', color: '#3B82F6' },
    resendTimer: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF',
        borderRadius: 12, padding: 16, marginTop: 28, width: '100%',
    },
    infoText: { flex: 1, marginLeft: 12, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
});
