import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator, Keyboard } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { authApi, UserProfile } from '@/services/authApi';

interface VerifyEmailModalProps {
    visible: boolean;
    onClose: () => void;
    onVerified: (updatedUser: UserProfile) => void;
    initialEmail?: string;
}

export default function VerifyEmailModal({ visible, onClose, onVerified, initialEmail }: VerifyEmailModalProps) {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState(initialEmail || '');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setStep('email');
        setCode('');
        setError('');
        setLoading(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSendOtp = async () => {
        if (!email.trim()) {
            setError(t('emailVerify.emailRequired', { defaultValue: 'Lütfen e-posta adresinizi girin.' }));
            return;
        }
        setError('');
        setLoading(true);
        try {
            await authApi.sendEmailOtp(email.trim());
            setStep('code');
        } catch (e: any) {
            setError(e?.message || t('emailVerify.sendFailed', { defaultValue: 'Kod gönderilemedi. Lütfen tekrar deneyin.' }));
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.trim().length !== 6) {
            setError(t('emailVerify.codeRequired', { defaultValue: 'Lütfen 6 haneli kodu girin.' }));
            return;
        }
        Keyboard.dismiss();
        setError('');
        setLoading(true);
        try {
            const updated = await authApi.verifyEmail(email.trim(), code.trim());
            reset();
            onVerified(updated);
        } catch (e: any) {
            setError(e?.message || t('emailVerify.verifyFailed', { defaultValue: 'Doğrulama başarısız. Lütfen tekrar deneyin.' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.card, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
                    <View style={[styles.iconCircle, isDark && { backgroundColor: '#064E3B' }]}>
                        <IconSymbol name="envelope.fill" size={28} color={isDark ? "#34D399" : "#10B981"} />
                    </View>
                    <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>
                        {t('emailVerify.title', { defaultValue: 'E-posta Doğrulama' })}
                    </Text>
                    <Text style={[styles.message, isDark && { color: '#CBD5E1' }]}>
                        {step === 'email'
                            ? t('emailVerify.emailSubtitle', { defaultValue: 'Hesabınıza eklemek istediğiniz e-posta adresini doğrulayın.' })
                            : t('emailVerify.codeSubtitle', { defaultValue: 'E-postanıza gönderilen 6 haneli kodu girin.' })}
                    </Text>

                    {step === 'email' ? (
                        <TextInput
                            style={[styles.input, isDark && { backgroundColor: '#1C1C1E', color: '#FFFFFF', borderColor: '#2C2C2E' }]}
                            placeholder={t('emailVerify.emailPlaceholder', { defaultValue: 'ornek@email.com' })}
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                            autoFocus
                        />
                    ) : (
                        <TextInput
                            style={[styles.input, isDark && { backgroundColor: '#1C1C1E', color: '#FFFFFF', borderColor: '#2C2C2E' }]}
                            placeholder="000000"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            keyboardType="number-pad"
                            maxLength={6}
                            value={code}
                            onChangeText={setCode}
                            autoFocus
                        />
                    )}

                    {!!error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                        onPress={step === 'email' ? handleSendOtp : handleVerify}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {step === 'email'
                                    ? t('emailVerify.sendCode', { defaultValue: 'Kodu Gönder' })
                                    : t('emailVerify.verify', { defaultValue: 'Doğrula' })}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {step === 'code' && (
                        <TouchableOpacity style={{ marginTop: 4 }} onPress={() => { setStep('email'); setCode(''); setError(''); }}>
                            <Text style={[styles.linkText, isDark && { color: '#94A3B8' }]}>
                                {t('emailVerify.changeEmail', { defaultValue: 'E-postayı değiştir' })}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.cancelButton, isDark && { backgroundColor: '#1C1C1E' }]} onPress={handleClose} activeOpacity={0.7}>
                        <Text style={[styles.cancelButtonText, isDark && { color: '#94A3B8' }]}>
                            {t('common.cancel', { defaultValue: 'İptal' })}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    card: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0D1B2A',
        marginBottom: 8,
        textAlign: 'center',
        fontWeight: '600',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 4,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    linkText: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 8,
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    cancelButtonText: {
        color: '#94A3B8',
        fontSize: 15,
        fontWeight: '600',
    },
});
