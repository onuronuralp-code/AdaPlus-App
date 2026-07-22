import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Image, BackHandler, Modal } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
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
    const searchParams = useLocalSearchParams<{ inviteToken?: string }>();
    const inviteToken = searchParams.inviteToken;
    useEffect(() => {
        if (!inviteToken) return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => subscription.remove();
    }, [inviteToken]);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (!inviteToken) return;
        authApi.getInviteEmail(inviteToken).then(em => {
            if (em) {
                if (isEmailPattern(em) || em.includes('@')) {
                    setEmail(em);

                }
            }
        });
    }, [inviteToken]);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; email?: string; phoneNumber?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; phoneNumber?: boolean; password?: boolean }>({});
    const [focusedField, setFocusedField] = useState('');
    const [kvkkVisible, setKvkkVisible] = useState(false);

    // Optional fields
    const [birthDate, setBirthDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
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

    const validateEmail = (val: string): string | undefined => {
        if (!val.trim()) return t('auth.errors.emailRequired');
        if (isEmailPattern(val) || isPhonePattern(val)) return undefined;
        return t('auth.errors.invalidEmail', { defaultValue: 'Geçerli bir e-posta adresi veya telefon numarası girin' });
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

    const handleEmailChange = (val: string) => {
        setEmail(val);
        if (touched.email) setErrors(prev => ({ ...prev, email: validateEmail(val) }));
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

    const handleEmailBlur = () => {
        setTouched(prev => ({ ...prev, email: true }));
        setErrors(prev => ({ ...prev, email: validateEmail(email) }));
    };

    const handlePasswordBlur = () => {
        setTouched(prev => ({ ...prev, password: true }));
        setErrors(prev => ({ ...prev, password: validatePassword(password) }));
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (loading) return;
        const nameError = validateName(name);
        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);
        setTouched({ name: true, email: true, password: true });
        setErrors({ name: nameError, email: emailError, password: passwordError });
        if (nameError || emailError || passwordError) return;
        setKvkkVisible(true);
    };

    const handleSignupAfterKVKK = async () => {
        if (loading) return;
        setKvkkVisible(false);
        setLoading(true);
        try {
            const formattedBirthDate =
                birthDate ? birthDate.toISOString().split('T')[0] : undefined;
            const actualContact = email.trim();
            await authApi.signup(
                name.trim(),
                actualContact,
                password,
                true,
                true,
                formattedBirthDate,
                (selectedIsland && selectedIsland !== 'Adalı değilim') ? selectedIsland : undefined,
                inviteToken ?? undefined,
                undefined,
            );
            router.push({ pathname: '/verify', params: { contact: actualContact, type: 'email', isInvited: inviteToken ? 'true' : 'false' } });

        } catch (error: any) {
            const msg: string = error.message || 'Bir hata oluştu.';
            if (msg.includes('Telefon numaranızla giriş yapın')) {
                Alert.alert('Hesap Mevcut', msg, [
                    { text: 'Giriş Yap', onPress: () => router.replace('/login') },
                    { text: 'Tamam', style: 'cancel' },
                ]);
            } else if (msg.includes('Giriş yapın')) {
                Alert.alert('Hesap Mevcut', msg, [
                    { text: 'Giriş Yap', onPress: () => router.replace('/login') },
                    { text: 'Tamam', style: 'cancel' },
                ]);
            } else {
                Alert.alert('Kayıt Hatası', msg);
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} scrollEnabled={false} keyboardShouldPersistTaps="handled" bounces={false}>
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
                        {!inviteToken && (
                            <TouchableOpacity
                                style={[styles.backButton, { top: insets.top + vs(10) }]}
                                onPress={() => {
                                    if (router.canGoBack()) router.back();
                                    else router.replace('/login');
                                }}
                            >
                                <IconSymbol name="chevron.left" size={ms(24)} color="#fff" />
                            </TouchableOpacity>
                        )}

                        <View style={[styles.branding, { paddingTop: insets.top - vs(10), paddingBottom: vs(20) }]}>
                            <View style={styles.logoCircle}>
                                <IconSymbol name="person.fill" size={ms(36)} color="#fff" />
                            </View>
                            <Text style={styles.welcomeTitle}>{t('auth.signupTitle')}</Text>
                            <Text style={styles.welcomeSubtitle}>{t('auth.signupSubtitle')}</Text>
                        </View>
                    </View>

                    <View style={styles.cardContainer}>
                        <ScrollView
                            style={styles.formScroll}
                            contentContainerStyle={[styles.formContainer, { paddingBottom: insets.bottom + vs(12) }]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* İsim */}
                            <View style={styles.inputGroup}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={[styles.inputLabel, { marginBottom: 0 }]}>{t('auth.nameLabel')}</Text>
                                    {!!inviteToken && (
                                        <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>DAVET EDİLDİ</Text>
                                        </View>
                                    )}
                                </View>
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

                            {/* E-posta */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('auth.emailLabel')}</Text>
                                <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                                    <IconSymbol name="envelope.fill" size={18} color={errors.email ? '#EF4444' : '#94A3B8'} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={(errors.email && focusedField !== 'email') ? errors.email : t('auth.emailPlaceholder', { defaultValue: "ornek@email.com" })}
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
                                    <IconSymbol name="phone.fill" size={18} color={errors.email ? '#EF4444' : '#94A3B8'} />
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

                            {/* Yaşadığın Ada (isteğe bağlı) */}
                            <View style={[styles.inputGroup, { marginBottom: 12, zIndex: 10 }]}>
                                <Text style={styles.inputLabel}>YAŞADIĞIN ADA <Text style={styles.optionalTag}>(İsteğe Bağlı)</Text></Text>
                                <TouchableOpacity
                                    style={[styles.inputWrapper, islandOpen && styles.inputWrapperFocused]}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setIslandOpen(o => !o);
                                    }}
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

                            </View>

                            {/* Doğum Tarihi (isteğe bağlı) */}
                            <View style={[styles.inputGroup, { marginBottom: 12 }]}>
                                <Text style={styles.inputLabel}>DOĞUM TARİHİ <Text style={styles.optionalTag}>(İsteğe Bağlı)</Text></Text>
                                <TouchableOpacity 
                                    style={[styles.inputWrapper, { justifyContent: 'center' }]} 
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={{ color: birthDate ? '#1E293B' : '#94A3B8', fontSize: 16 }}>
                                        {birthDate ? birthDate.toLocaleDateString('tr-TR') : 'GG / AA / YYYY'}
                                    </Text>
                                </TouchableOpacity>
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

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
                                <TouchableOpacity onPress={() => router.replace('/login')}>
                                    <Text style={styles.loginText}>{t('auth.loginLink')}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>

            <KVKKModal
                isVisible={kvkkVisible}
                onClose={() => setKvkkVisible(false)}
                onAccept={handleSignupAfterKVKK}
            />

            {/* DatePicker Modal for iOS, or inline for Android */}
            {Platform.OS === 'ios' ? (
                <Modal visible={showDatePicker} transparent animationType="fade">
                    <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                        <TouchableOpacity style={{ backgroundColor: 'white', padding: 16 }} activeOpacity={1}>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: 16 }}>Tamam</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={birthDate || new Date()}
                                mode="date"
                                display="spinner"
                                maximumDate={new Date()}
                                onChange={(event, date) => {
                                    if (date) setBirthDate(date);
                                }}
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            ) : (
                showDatePicker && (
                    <DateTimePicker
                        value={birthDate || new Date()}
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        onChange={(event, date) => {
                            setShowDatePicker(false);
                            if (date) setBirthDate(date);
                        }}
                    />
                )
            )}

            {/* Island Selection Modal */}
            <Modal visible={islandOpen} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setIslandOpen(false)}>
                    <TouchableOpacity style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }} activeOpacity={1}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A' }}>Ada Seçiniz</Text>
                            <TouchableOpacity onPress={() => setIslandOpen(false)}>
                                <IconSymbol name="xmark" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        {['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada', 'Adalı değilim'].map((island, idx) => (
                            <TouchableOpacity
                                key={island}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: 16,
                                    borderBottomWidth: idx < 4 ? 1 : 0,
                                    borderBottomColor: '#E2E8F0',
                                }}
                                onPress={() => { setSelectedIsland(island); setIslandOpen(false); }}
                            >
                                <Text style={{ fontSize: 16, color: selectedIsland === island ? '#3B82F6' : '#1E293B', fontWeight: selectedIsland === island ? '700' : '500' }}>
                                    {island}
                                </Text>
                                {selectedIsland === island && (
                                    <IconSymbol name="checkmark" size={18} color="#3B82F6" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

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
