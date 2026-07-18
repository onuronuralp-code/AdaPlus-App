import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';
import { useTranslation } from 'react-i18next';
import { KVKKModal } from '@/components/KVKKModal';
import { s, vs, ms, SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/scale';

const ISLANDS = ['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada', 'Adalı değilim'];

const isEmailPattern = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
const isPhonePattern = (val: string) => /^\+?[0-9]{7,15}$/.test(val.trim().replace(/[\s\-()]/g, ''));

export default function SignUpScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();

    const [name, setName] = useState('');
    const [contact, setContact] = useState('');

    useEffect(() => {
        if (!inviteToken) return;
        authApi.getInviteEmail(inviteToken).then(email => {
            if (email) setContact(email);
        });
    }, [inviteToken]);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; contact?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ name?: boolean; contact?: boolean; password?: boolean }>({});
    const [focusedField, setFocusedField] = useState('');
    const [kvkkVisible, setKvkkVisible] = useState(false);

    // Optional fields
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
    const [islandOpen, setIslandOpen] = useState(false);

    const dayRef = useRef<TextInput>(null);
    const monthRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);

    // ── Validators ────────────────────────────────────────────────────────────

    useFocusEffect(
        useCallback(() => {
            setErrors({});
            setTouched({});
        }, [])
    );

    const validateName = (val: string): string | undefined => {
        const trimmed = val.trim();
        if (!trimmed) return t('auth.errors.nameRequired');
        if (!/^[a-zA-ZğüşöçıİĞÜŞÖÇ\s]+$/.test(trimmed)) return t('auth.errors.nameInvalid');
        if (trimmed.split(/\s+/).length < 2) return t('auth.errors.nameShort');
        return undefined;
    };

    const validateContact = (val: string): string | undefined => {
        const trimmed = val.trim();
        if (!trimmed) return 'E-posta veya telefon numarası gereklidir';
        if (isEmailPattern(trimmed) || isPhonePattern(trimmed)) return undefined;
        return 'Geçerli bir e-posta adresi veya telefon numarası girin';
    };

    const validatePassword = (val: string): string | undefined => {
        if (!val) return t('auth.errors.passwordRequired');
        if (val.length < 8) return t('auth.errors.passwordMin');
        return undefined;
    };

    // ── Change handlers ───────────────────────────────────────────────────────

    const handleNameChange = (val: string) => {
        setName(val);
        if (touched.name) setErrors(prev => ({ ...prev, name: validateName(val) }));
    };

    const handleContactChange = (val: string) => {
        setContact(val);
        if (touched.contact) setErrors(prev => ({ ...prev, contact: validateContact(val) }));
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        if (touched.password) setErrors(prev => ({ ...prev, password: validatePassword(val) }));
    };

    // ── Blur handlers ─────────────────────────────────────────────────────────

    const handleNameBlur = () => {
        setTouched(prev => ({ ...prev, name: true }));
        setErrors(prev => ({ ...prev, name: validateName(name) }));
    };

    const handleContactBlur = () => {
        setTouched(prev => ({ ...prev, contact: true }));
        setErrors(prev => ({ ...prev, contact: validateContact(contact) }));
    };

    const handlePasswordBlur = () => {
        setTouched(prev => ({ ...prev, password: true }));
        setErrors(prev => ({ ...prev, password: validatePassword(password) }));
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (loading) return;
        const nameError = validateName(name);
        const contactError = validateContact(contact);
        const passwordError = validatePassword(password);
        setTouched({ name: true, contact: true, password: true });
        setErrors({ name: nameError, contact: contactError, password: passwordError });
        if (nameError || contactError || passwordError) return;
        setKvkkVisible(true);
    };

    const handleSignupAfterKVKK = async () => {
        if (loading) return;
        setKvkkVisible(false);
        setLoading(true);
        try {
            const birthDate =
                birthDay && birthMonth && birthYear
                    ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
                    : undefined;
            await authApi.signup(
                name.trim(),
                contact.trim(),
                password,
                true,
                true,
                birthDate,
                selectedIsland ?? undefined,
                inviteToken ?? undefined,
            );
            const contactType = isPhonePattern(contact.trim()) ? 'phone' : 'email';
            router.push({ pathname: '/verify', params: { contact: contact.trim(), type: contactType } });
        } catch (error: any) {
            Alert.alert('Kayıt Hatası', error.message || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setIslandOpen(false); }} accessible={false}>
                <View style={styles.container}>
                    <View style={styles.headerBackground}>
                        <Image
                            source={require('@/assets/images/sunset.jpg')}
                            style={{ position: 'absolute', width: SCREEN_WIDTH, height: '100%' }}
                            resizeMode="cover"
                        />
                        <LinearGradient 
                            colors={['rgba(0, 0, 0, 0.1)', '#0f172a']} 
                            style={[{ position: 'absolute', width: SCREEN_WIDTH, height: '100%' }]}
                        />
                        <TouchableOpacity
                            style={[styles.backButton, { top: insets.top + vs(10) }]}
                            onPress={() => {
                                if (router.canGoBack()) router.back();
                                else router.replace('/login');
                            }}
                        >
                            <IconSymbol name="chevron.left" size={ms(24)} color="#fff" />
                        </TouchableOpacity>

                        <View style={[styles.branding, { paddingTop: insets.top - vs(10), paddingBottom: vs(20) }]}>
                            <View style={styles.logoCircle}>
                                <IconSymbol name="person.fill" size={ms(36)} color="#fff" />
                            </View>
                            <Text style={styles.welcomeTitle}>{t('auth.signupTitle')}</Text>
                            <Text style={styles.welcomeSubtitle}>{t('auth.signupSubtitle')}</Text>
                        </View>
                    </View>

                    <View style={styles.cardContainer}>
                        {!!inviteToken && (
                            <View style={{ backgroundColor: '#ECFDF5', borderRadius: s(12), marginHorizontal: s(20), marginTop: vs(16), marginBottom: vs(-8), padding: s(12), flexDirection: 'row', alignItems: 'center', gap: s(8), borderWidth: 1, borderColor: '#6EE7B7' }}>
                                <IconSymbol name="checkmark.seal.fill" size={ms(18)} color="#059669" />
                                <Text style={{ color: '#065F46', fontSize: ms(13), fontWeight: '600', flex: 1 }}>
                                    Ada sakini olarak davet edildiniz! Hesabınız adalı statüsüyle oluşturulacak.
                                </Text>
                            </View>
                        )}
                        <ScrollView
                            style={styles.formScroll}
                            contentContainerStyle={[styles.formContainer, { paddingBottom: insets.bottom + vs(12) }]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        >
                            {/* İsim */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.nameLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.name ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="person.fill" size={18} color={errors.name ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={(errors.name && focusedField !== 'name') ? errors.name : t('auth.namePlaceholder')}
                                        placeholderTextColor={(errors.name && focusedField !== 'name') ? "#EF4444" : "#94A3B8"}
                                        value={(errors.name && focusedField !== 'name') ? '' : name}
                                        onChangeText={handleNameChange}
                                        onFocus={() => setFocusedField('name')}
                                        onBlur={() => {
                                            setFocusedField('');
                                            handleNameBlur();
                                        }}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            {/* E-posta ya da Telefon */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>E-POSTA ADRESİ YA DA TELEFON NUMARASI</Text>
                                <View style={[styles.inputWrapper, errors.contact ? styles.inputWrapperError : null]}>
                                    <IconSymbol
                                        name={isPhonePattern(contact) ? 'phone.fill' : 'envelope.fill'}
                                        size={18}
                                        color={errors.contact ? '#EF4444' : '#94A3B8'}
                                    />
                                    <TextInput
                                        style={[styles.input, { textAlign: 'center' }]}
                                        placeholder={(errors.contact && focusedField !== 'contact') ? errors.contact : "ornek@email.com veya 0555 000 00 00"}
                                        placeholderTextColor={(errors.contact && focusedField !== 'contact') ? "#EF4444" : "#94A3B8"}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={(errors.contact && focusedField !== 'contact') ? '' : contact}
                                        onChangeText={handleContactChange}
                                        onFocus={() => setFocusedField('contact')}
                                        onBlur={() => {
                                            setFocusedField('');
                                            handleContactBlur();
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Şifre */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.passwordLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="lock.fill" size={18} color={errors.password ? '#EF4444' : '#94A3B8'} />
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
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Doğum Tarihi (isteğe bağlı) */}
                            <View style={[styles.inputGroup, { marginBottom: 12 }]}>
                                <Text style={styles.inputLabel}>DOĞUM TARİHİ <Text style={styles.optionalTag}>(İsteğe Bağlı)</Text></Text>
                                <View style={styles.dateRow}>
                                    <View style={[styles.dateCell, styles.dateCellShort]}>
                                        <TextInput
                                            ref={dayRef}
                                            style={styles.dateCellInput}
                                            placeholder="GG"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            value={birthDay}
                                            onChangeText={val => {
                                                const digits = val.replace(/\D/g, '');
                                                setBirthDay(digits);
                                                if (digits.length === 2) monthRef.current?.focus();
                                            }}
                                        />
                                    </View>
                                    <Text style={styles.dateSep}>/</Text>
                                    <View style={[styles.dateCell, styles.dateCellShort]}>
                                        <TextInput
                                            ref={monthRef}
                                            style={styles.dateCellInput}
                                            placeholder="AA"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            value={birthMonth}
                                            onChangeText={val => {
                                                const digits = val.replace(/\D/g, '');
                                                setBirthMonth(digits);
                                                if (digits.length === 2) yearRef.current?.focus();
                                            }}
                                        />
                                    </View>
                                    <Text style={styles.dateSep}>/</Text>
                                    <View style={[styles.dateCell, { flex: 1 }]}>
                                        <TextInput
                                            ref={yearRef}
                                            style={styles.dateCellInput}
                                            placeholder="YYYY"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            value={birthYear}
                                            onChangeText={val => setBirthYear(val.replace(/\D/g, ''))}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Yaşadığın Ada (isteğe bağlı) */}
                            <View style={[styles.inputGroup, { marginBottom: islandOpen ? 8 + ISLANDS.length * 40 : 12, zIndex: 10 }]}>
                                <Text style={styles.inputLabel}>YAŞADIĞIN ADA <Text style={styles.optionalTag}>(İsteğe Bağlı)</Text></Text>
                                <TouchableOpacity
                                    style={[styles.inputWrapper, islandOpen && styles.inputWrapperFocused]}
                                    onPress={() => setIslandOpen(o => !o)}
                                    activeOpacity={0.8}
                                >
                                    <IconSymbol name="mappin.and.ellipse" size={18} color="#94A3B8" />
                                    <Text style={[styles.input, { flex: 1, paddingTop: 0, paddingBottom: 0, color: selectedIsland ? '#0D1B2A' : '#94A3B8' }]}>
                                        {selectedIsland ?? 'Ada seçiniz'}
                                    </Text>
                                    <IconSymbol
                                        name={islandOpen ? "chevron.up" : "chevron.down"}
                                        size={16}
                                        color="#94A3B8"
                                    />
                                </TouchableOpacity>
                                {islandOpen && (
                                    <View style={styles.dropdownList}>
                                        {ISLANDS.map((island, idx) => (
                                            <TouchableOpacity
                                                key={island}
                                                style={[
                                                    styles.dropdownItem,
                                                    idx < ISLANDS.length - 1 && styles.dropdownItemBorder,
                                                    selectedIsland === island && styles.dropdownItemSelected,
                                                ]}
                                                onPress={() => { setSelectedIsland(island); setIslandOpen(false); }}
                                            >
                                                <Text style={[styles.dropdownItemText, selectedIsland === island && styles.dropdownItemTextSelected]}>
                                                    {island}
                                                </Text>
                                                {selectedIsland === island && (
                                                    <IconSymbol name="checkmark" size={14} color="#3B82F6" />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
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
                                        <IconSymbol name="globe" size={16} color="#94A3B8" />
                                        <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>Google</Text>
                                    </View>
                                    <View style={styles.comingSoonBadge}>
                                        <Text style={styles.comingSoonText}>Yakında</Text>
                                    </View>
                                </View>
                                <View style={styles.socialButtonWrapper}>
                                    <View style={[styles.socialButton, styles.socialButtonDisabled]}>
                                        <IconSymbol name="apple.logo" size={16} color="#94A3B8" />
                                        <Text style={[styles.socialButtonText, styles.socialButtonTextDisabled]}>Apple</Text>
                                    </View>
                                    <View style={styles.comingSoonBadge}>
                                        <Text style={styles.comingSoonText}>Yakında</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
                                <TouchableOpacity onPress={() => router.replace('/login')}>
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
        height: SCREEN_HEIGHT * 0.36,
        paddingHorizontal: s(30),
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: s(20),
        zIndex: 10,
        width: s(44),
        height: s(44),
        borderRadius: s(12),
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    branding: {
        alignItems: 'center',
    },
    logoCircle: {
        width: s(72),
        height: s(72),
        borderRadius: s(36),
        marginBottom: vs(16),
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: vs(10) },
        shadowOpacity: 0.3,
        shadowRadius: s(20),
    },
    welcomeTitle: {
        fontSize: ms(20),
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: vs(8),
    },
    welcomeSubtitle: {
        fontSize: ms(11),
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: ms(16),
        paddingHorizontal: s(20),
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: vs(-20),
        borderTopLeftRadius: s(24),
        borderTopRightRadius: s(24),
        overflow: 'hidden',
    },
    formScroll: {
        flex: 1,
        paddingHorizontal: s(20),
        paddingTop: vs(16),
    },
    formContainer: {
        flexGrow: 1,
    },
    inputGroup: {
        marginBottom: vs(8),
    },
    inputLabel: {
        fontSize: ms(9),
        fontWeight: '800',
        color: '#415A77',
        marginBottom: vs(8),
        letterSpacing: 0.5,
    },
    optionalTag: {
        fontWeight: '500',
        color: '#94A3B8',
        letterSpacing: 0,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: s(12),
        paddingHorizontal: s(16),
        paddingVertical: vs(10),
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputWrapperFocused: {
        borderColor: '#3B82F6',
        borderWidth: 1.5,
    },
    input: {
        flex: 1,
        marginLeft: s(12),
        fontSize: ms(13),
        color: '#0D1B2A',
        fontWeight: '500',
    },
    // Date of birth
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
    },
    dateCell: {
        backgroundColor: '#F8FAFC',
        borderRadius: s(12),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: vs(6),
        paddingHorizontal: s(12),
    },
    dateCellShort: {
        width: s(64),
    },
    dateCellInput: {
        fontSize: ms(13),
        color: '#0D1B2A',
        fontWeight: '500',
        textAlign: 'center',
    },
    dateSep: {
        fontSize: ms(18),
        color: '#94A3B8',
        fontWeight: '600',
    },
    // Island dropdown
    dropdownList: {
        marginTop: vs(4),
        backgroundColor: '#fff',
        borderRadius: s(12),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: vs(4) },
        shadowOpacity: 0.08,
        shadowRadius: s(12),
        elevation: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(16),
        paddingVertical: vs(10),
    },
    dropdownItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dropdownItemSelected: {
        backgroundColor: '#EFF6FF',
    },
    dropdownItemText: {
        fontSize: ms(13),
        color: '#1E293B',
        fontWeight: '500',
    },
    dropdownItemTextSelected: {
        color: '#3B82F6',
        fontWeight: '700',
    },
    // Buttons
    primaryButton: {
        backgroundColor: '#3B82F6',
        borderRadius: s(12),
        paddingVertical: vs(14),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: vs(10),
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: vs(8) },
        shadowOpacity: 0.25,
        shadowRadius: s(15),
        elevation: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: ms(15),
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: vs(12),
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        marginHorizontal: s(16),
        fontSize: ms(12),
        fontWeight: '700',
        color: '#94A3B8',
    },
    socialGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: s(16),
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
        borderRadius: s(12),
        paddingVertical: vs(10),
    },
    socialButtonDisabled: {
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
        opacity: 0.6,
    },
    socialButtonText: {
        marginLeft: s(8),
        fontSize: ms(14),
        fontWeight: '700',
        color: '#1E293B',
    },
    socialButtonTextDisabled: {
        color: '#94A3B8',
    },
    comingSoonBadge: {
        position: 'absolute',
        top: vs(-8),
        right: s(-4),
        backgroundColor: '#F59E0B',
        borderRadius: s(8),
        paddingHorizontal: s(6),
        paddingVertical: vs(2),
    },
    comingSoonText: {
        fontSize: ms(9),
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: vs(20),
    },
    footerText: {
        fontSize: ms(14),
        color: '#94A3B8',
    },
    loginText: {
        fontSize: ms(14),
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    inputWrapperError: {
        borderColor: '#EF4444',
        borderWidth: 1.5,
    },
    errorText: {
        color: '#EF4444',
        fontSize: ms(12),
        fontWeight: '600',
        marginTop: vs(4),
        marginLeft: s(4),
    },
});
