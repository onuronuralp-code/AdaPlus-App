import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/services/authApi';
import { useTranslation } from 'react-i18next';
import { KVKKModal } from '@/components/KVKKModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ISLANDS = ['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada', 'Adalı değilim'];

const isEmailPattern = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
const isPhonePattern = (val: string) => /^\+?[0-9]{7,15}$/.test(val.trim().replace(/[\s\-()]/g, ''));

export default function SignUpScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; contact?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ name?: boolean; contact?: boolean; password?: boolean }>({});
    const [kvkkVisible, setKvkkVisible] = useState(false);

    // Optional fields
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [selectedIsland, setSelectedIsland] = useState<string | null>(null);
    const [islandOpen, setIslandOpen] = useState(false);

    const dayRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);

    // ── Validators ────────────────────────────────────────────────────────────

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
        const nameError = validateName(name);
        const contactError = validateContact(contact);
        const passwordError = validatePassword(password);
        setTouched({ name: true, contact: true, password: true });
        setErrors({ name: nameError, contact: contactError, password: passwordError });
        if (nameError || contactError || passwordError) return;
        setKvkkVisible(true);
    };

    const handleSignupAfterKVKK = async () => {
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
                            style={{ position: 'absolute', width: Dimensions.get('window').width, height: '100%' }}
                            resizeMode="cover"
                        />
                        <LinearGradient 
                            colors={['rgba(0, 0, 0, 0.1)', '#0f172a']} 
                            style={[{ position: 'absolute', width: Dimensions.get('window').width, height: '100%' }]}
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

                        <View style={[styles.branding, { paddingTop: insets.top - 10, paddingBottom: 20 }]}>
                            <View style={styles.logoCircle}>
                                <IconSymbol name="person.fill" size={36} color="#fff" />
                            </View>
                            <Text style={styles.welcomeTitle}>{t('auth.signupTitle')}</Text>
                            <Text style={styles.welcomeSubtitle}>{t('auth.signupSubtitle')}</Text>
                        </View>
                    </View>

                    <View style={styles.cardContainer}>
                        <ScrollView
                            style={styles.formScroll}
                            contentContainerStyle={[styles.formContainer, { paddingBottom: insets.bottom + 12 }]}
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
                                        placeholder={(!name && errors.name) ? errors.name : t('auth.namePlaceholder')}
                                        placeholderTextColor={(!name && errors.name) ? "#EF4444" : "#94A3B8"}
                                        value={name}
                                        onChangeText={handleNameChange}
                                        onBlur={handleNameBlur}
                                        autoCapitalize="words"
                                    />
                                </View>
                                {(errors.name && name.length > 0) ? <Text style={styles.errorText}>{errors.name}</Text> : null}
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
                                        style={styles.input}
                                        placeholder={(!contact && errors.contact) ? errors.contact : "ornek@email.com veya +90 555 000 00 00"}
                                        placeholderTextColor={(!contact && errors.contact) ? "#EF4444" : "#94A3B8"}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={contact}
                                        onChangeText={handleContactChange}
                                        onBlur={handleContactBlur}
                                    />
                                </View>
                                {(errors.contact && contact.length > 0) ? <Text style={styles.errorText}>{errors.contact}</Text> : null}
                            </View>

                            {/* Şifre */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.passwordLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="lock.fill" size={18} color={errors.password ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder={(!password && errors.password) ? errors.password : t('auth.passwordPlaceholder')}
                                        placeholderTextColor={(!password && errors.password) ? "#EF4444" : "#94A3B8"}
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={handlePasswordChange}
                                        onBlur={handlePasswordBlur}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                                        <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                {(errors.password && password.length > 0) ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                            </View>

                            {/* Doğum Tarihi (isteğe bağlı) */}
                            <View style={[styles.inputGroup, { marginBottom: 12 }]}>
                                <Text style={styles.inputLabel}>DOĞUM TARİHİ <Text style={styles.optionalTag}>(İsteğe Bağlı)</Text></Text>
                                <View style={styles.dateRow}>
                                    <View style={[styles.dateCell, styles.dateCellShort]}>
                                        <TextInput
                                            style={styles.dateCellInput}
                                            placeholder="AA"
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            value={birthMonth}
                                            onChangeText={val => {
                                                const digits = val.replace(/\D/g, '');
                                                setBirthMonth(digits);
                                                if (digits.length === 2) dayRef.current?.focus();
                                            }}
                                        />
                                    </View>
                                    <Text style={styles.dateSep}>/</Text>
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
        height: SCREEN_HEIGHT * 0.36,
        paddingHorizontal: 30,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 16,
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
        paddingTop: 16,
    },
    formContainer: {
        flexGrow: 1,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#415A77',
        marginBottom: 8,
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
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputWrapperFocused: {
        borderColor: '#3B82F6',
        borderWidth: 1.5,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 13,
        color: '#0D1B2A',
        fontWeight: '500',
    },
    // Date of birth
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateCell: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    dateCellShort: {
        width: 64,
    },
    dateCellInput: {
        fontSize: 13,
        color: '#0D1B2A',
        fontWeight: '500',
        textAlign: 'center',
    },
    dateSep: {
        fontSize: 18,
        color: '#94A3B8',
        fontWeight: '600',
    },
    // Island dropdown
    dropdownList: {
        marginTop: 4,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    dropdownItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dropdownItemSelected: {
        backgroundColor: '#EFF6FF',
    },
    dropdownItemText: {
        fontSize: 13,
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
        borderRadius: 16,
        paddingVertical: 14,
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
        fontSize: 15,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
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
