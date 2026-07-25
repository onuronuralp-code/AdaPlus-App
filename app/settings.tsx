import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { authApi, UserProfile } from '@/services/authApi';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/notificationService';

const ISLAND_STREETS: Record<string, string[]> = {
    BUYUKADA: [
        'Çankaya Caddesi', 'Maden Caddesi', '23 Nisan Caddesi', 'Yüzbaşı Şükrü Caddesi',
        'Hamidiye Caddesi', 'Nizam Caddesi', 'Atatürk Caddesi', 'Recaizade Caddesi',
        'Çınar Caddesi', 'Naliye Caddesi', 'Kadı Caddesi', 'Köybaşı Caddesi',
        'Adnan Menderes Caddesi', 'İskele Meydanı',
    ],
    HEYBELIADA: [
        'Refah Şehitleri Caddesi', 'İstasyon Caddesi', 'Ayyıldız Caddesi',
        'Baruthane Caddesi', 'Köyiçi Caddesi', 'Çam Limanı Yolu',
        'Değirmen Yolu', 'Meşelik Sokak', 'Çiçek Sokak', 'Atatürk Caddesi',
    ],
    BURGAZADA: [
        'İstasyon Caddesi', 'Cihannüma Caddesi', 'Çınar Yolu', 'Atatürk Caddesi',
        'Kumsal Yolu', 'Çiçek Sokak', 'Manastır Yolu', 'Dere Sokak',
    ],
    KINALIADA: [
        'İstasyon Caddesi', 'Çamlık Caddesi', 'Güzelyalı Caddesi', 'Plaj Yolu',
        'Adnan Menderes Caddesi', 'Manastır Yolu', 'Köyiçi Caddesi',
    ],
};

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { isLoggedIn, logout, user, updateProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    
    const [currentLang, setCurrentLang] = useState(i18n.language);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [defaultIsland, setDefaultIsland] = useState('Büyükada');
    const ISLANDS = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];

    const handleLanguageChange = async (lang: string) => {
        await i18n.changeLanguage(lang);
        await AsyncStorage.setItem('userLanguage', lang);
        setCurrentLang(lang);
    };

    // Edit Account states
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [selectedStreet, setSelectedStreet] = useState('');
    const [buildingNo, setBuildingNo] = useState('');
    const [showStreetPicker, setShowStreetPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const ISLAND_KEY_MAP: Record<string, string> = {
        'Büyükada': 'BUYUKADA', 'Heybeliada': 'HEYBELIADA',
        'Burgazada': 'BURGAZADA', 'Kınalıada': 'KINALIADA',
    };
    const userIsland = (user as any)?.island as string | undefined;
    const activeIslandKey = userIsland ?? ISLAND_KEY_MAP[defaultIsland] ?? '';
    const streets = ISLAND_STREETS[activeIslandKey] ?? [];

    const openEditForm = () => {
        setEditName(user?.fullName ?? '');
        setEditEmail(user?.email ?? '');
        const existingAddress = (user as any)?.address ?? '';
        // Try to split "Street, No" from the stored address
        const islandStreets = userIsland ? (ISLAND_STREETS[userIsland] ?? []) : Object.values(ISLAND_STREETS).flat();
        const matchedStreet = islandStreets.find(s => existingAddress.startsWith(s));
        if (matchedStreet) {
            setSelectedStreet(matchedStreet);
            setBuildingNo(existingAddress.slice(matchedStreet.length).replace(/^[\s,]+/, ''));
        } else {
            setSelectedStreet('');
            setBuildingNo(existingAddress);
        }
        setEditPassword('');
        setShowStreetPicker(false);
    };

    useEffect(() => {
        AsyncStorage.getItem('defaultIsland').then(island => {
            if (island) setDefaultIsland(island);
        });
        AsyncStorage.getItem('notificationsEnabled').then(enabled => {
            if (enabled !== null) setNotificationsEnabled(enabled === 'true');
        });
    }, []);

    const handleIslandSelect = (island: string) => {
        setDefaultIsland(island);
        AsyncStorage.setItem('defaultIsland', island);
    };

    const handleNotificationsToggle = async (val: boolean) => {
        setNotificationsEnabled(val);
        await AsyncStorage.setItem('notificationsEnabled', val.toString());
        if (val) {
            await registerForPushNotifications();
        } else {
            await unregisterPushNotifications();
        }
    };

    const handleDeleteAccount = () => {
        const isEn = i18n.language.startsWith('en');
        Alert.alert(
            t('profile.deleteAccountTitle', { defaultValue: isEn ? 'Delete Account' : 'Hesabını Sil' }),
            t('profile.deleteAccountConfirm', { defaultValue: isEn ? 'Are you sure you want to delete your account? All your data will be permanently deleted.' : 'Hesabınızı silmek istediğinize emin misiniz? Tüm verileriniz kalıcı olarak silinecektir.' }),
            [
                { text: t('common.cancel', { defaultValue: isEn ? 'Cancel' : 'İptal' }), style: 'cancel' },
                { 
                    text: t('profile.deleteAccount', { defaultValue: isEn ? 'Delete Account' : 'Hesabı Sil' }), 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            const success = await authApi.deleteAccount();
                            if (!success) {
                                Alert.alert(t('common.error', { defaultValue: isEn ? 'Error' : 'Hata' }), t('common.deleteFailed', { defaultValue: isEn ? 'Deletion failed.' : 'Silme işlemi başarısız.' }));
                                return;
                            }
                            await logout();
                            router.replace('/');
                        } catch (e) {
                            Alert.alert(t('common.error', { defaultValue: isEn ? 'Error' : 'Hata' }), t('common.deleteFailed', { defaultValue: isEn ? 'Deletion failed.' : 'Silme işlemi başarısız.' }));
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#000000' }]} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, isDark && { borderBottomColor: '#1C1C1E' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <IconSymbol name="chevron.left" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>{t('common.settings', { defaultValue: currentLang.startsWith('en') ? 'Settings' : 'Ayarlar' })}</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                {/* Language Selection Section */}
                <View style={[styles.section, isDark && { borderBottomColor: '#1C1C1E' }]}>
                    <Text style={[styles.sectionTitle, isDark && { color: '#94A3B8' }]}>{t('common.chooseLanguage', { defaultValue: currentLang.startsWith('en') ? 'Language Selection' : 'Dil Seçimi' })}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                isDark && styles.darkLangButton,
                                currentLang.startsWith('tr') && (isDark ? styles.darkActiveLangButton : styles.activeLangButton)
                            ]} 
                            onPress={() => handleLanguageChange('tr')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                isDark && { color: '#CBD5E1' },
                                currentLang.startsWith('tr') && (isDark ? styles.darkActiveLangButtonText : styles.activeLangButtonText)
                            ]}>Türkçe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                isDark && styles.darkLangButton,
                                currentLang.startsWith('en') && (isDark ? styles.darkActiveLangButton : styles.activeLangButton)
                            ]} 
                            onPress={() => handleLanguageChange('en')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                isDark && { color: '#CBD5E1' },
                                currentLang.startsWith('en') && (isDark ? styles.darkActiveLangButtonText : styles.activeLangButtonText)
                            ]}>English</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Theme Selection Section */}
                <View style={[styles.section, isDark && { borderBottomColor: '#1C1C1E' }]}>
                    <Text style={[styles.sectionTitle, isDark && { color: '#94A3B8' }]}>{currentLang.startsWith('en') ? 'App Theme' : 'Uygulama Teması'}</Text>
                    <View style={[styles.row, { marginBottom: 12 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <IconSymbol name={theme === 'dark' ? "moon.fill" : "sun.max.fill"} size={20} color={theme === 'dark' ? "#38BDF8" : "#F59E0B"} />
                            <Text style={[styles.rowText, isDark && { color: '#F8FAFC' }]}>{currentLang.startsWith('en') ? 'Dark Mode (Black)' : 'Koyu Tema (Siyah)'}</Text>
                        </View>
                        <Switch
                            value={theme === 'dark'}
                            onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
                            trackColor={{ false: '#CBD5E1', true: '#0EA5E9' }}
                            thumbColor={theme === 'dark' ? '#FFFFFF' : '#94A3B8'}
                        />
                    </View>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                isDark && styles.darkLangButton,
                                theme === 'light' && (isDark ? styles.darkActiveLangButton : styles.activeLangButton)
                            ]} 
                            onPress={() => setTheme('light')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                isDark && { color: '#CBD5E1' },
                                theme === 'light' && (isDark ? styles.darkActiveLangButtonText : styles.activeLangButtonText)
                            ]}>☀️ {currentLang.startsWith('en') ? 'Light' : 'Açık Tema'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                isDark && styles.darkLangButton,
                                theme === 'dark' && (isDark ? styles.darkActiveLangButton : styles.activeLangButton)
                            ]} 
                            onPress={() => setTheme('dark')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                isDark && { color: '#CBD5E1' },
                                theme === 'dark' && (isDark ? styles.darkActiveLangButtonText : styles.activeLangButtonText)
                            ]}>🌙 {currentLang.startsWith('en') ? 'Dark (Black)' : 'Koyu (Siyah)'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Default Island Section */}
                <View style={[styles.section, isDark && { borderBottomColor: '#1C1C1E' }]}>
                    <Text style={[styles.sectionTitle, isDark && { color: '#94A3B8' }]}>{t('common.defaultIsland', { defaultValue: currentLang.startsWith('en') ? 'Default Island' : 'Varsayılan Ada' })}</Text>
                    <View style={[styles.buttonRow, { flexWrap: 'wrap' }]}>
                        {ISLANDS.map(island => (
                            <TouchableOpacity 
                                key={island}
                                style={[
                                    styles.langButton, 
                                    isDark && styles.darkLangButton,
                                    defaultIsland === island && (isDark ? styles.darkActiveIslandButton : styles.activeIslandButton),
                                    { minWidth: '45%', marginBottom: 12 }
                                ]} 
                                onPress={() => handleIslandSelect(island)}
                            >
                                <Text style={[
                                    styles.langButtonText,
                                    isDark && { color: '#CBD5E1' },
                                    defaultIsland === island && (isDark ? styles.darkActiveIslandButtonText : styles.activeIslandButtonText)
                                ]}>{t('places.' + island, { defaultValue: island })}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={[styles.section, isDark && { borderBottomColor: '#1C1C1E' }]}>
                    <View style={styles.row}>
                        <Text style={[styles.rowText, isDark && { color: '#F8FAFC' }]}>{t('profile.notifications', { defaultValue: currentLang.startsWith('en') ? 'Notifications' : 'Bildirimler' })}</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleNotificationsToggle}
                            trackColor={{ false: '#CBD5E1', true: '#059669' }}
                            thumbColor={notificationsEnabled ? '#FFFFFF' : '#94A3B8'}
                        />
                    </View>
                </View>

                {/* Account Section */}
                {isLoggedIn && (
                    <View style={[styles.section, { borderBottomWidth: 0, marginTop: 'auto' }]}>
                        <TouchableOpacity style={[styles.editButton, isDark && styles.darkEditButton, { marginBottom: 12 }]} onPress={() => {
                            openEditForm();
                            setIsEditingAccount(true);
                        }} activeOpacity={0.8}>
                            <IconSymbol name="pencil" size={18} color={isDark ? '#94A3B8' : '#475569'} />
                            <Text style={[styles.editButtonText, isDark && { color: '#F8FAFC' }]}>{t('profile.editAccount', { defaultValue: currentLang.startsWith('en') ? 'Edit Account' : 'Hesabı Düzenle' })}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.8}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FFFFFF" />
                            <Text style={styles.deleteButtonText}>{t('profile.deleteAccount', { defaultValue: currentLang.startsWith('en') ? 'Delete Account' : 'Hesabı Sil' })}</Text>
                        </TouchableOpacity>

                        {/* Edit Account Centered Modal Popup */}
                        <Modal
                            transparent
                            visible={isEditingAccount}
                            animationType="fade"
                            statusBarTranslucent
                            onRequestClose={() => setIsEditingAccount(false)}
                        >
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
                            >
                                <TouchableOpacity
                                    style={StyleSheet.absoluteFill}
                                    activeOpacity={1}
                                    onPress={() => setIsEditingAccount(false)}
                                />
                                <View style={{ width: '100%', maxWidth: 400, backgroundColor: isDark ? '#121212' : '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: isDark ? 1 : 0, borderColor: '#2C2C2E', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }}>
                                    {/* Modal Header */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                                            {t('profile.editAccount', { defaultValue: currentLang.startsWith('en') ? 'Edit Account' : 'Hesabı Düzenle' })}
                                        </Text>
                                        <TouchableOpacity onPress={() => setIsEditingAccount(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                            <IconSymbol name="xmark.circle.fill" size={24} color={isDark ? '#64748B' : '#94A3B8'} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Ad Soyad — read-only */}
                                    <TextInput style={[styles.input, isDark && styles.darkInput, styles.inputReadOnly, isDark && styles.darkInputReadOnly]} value={editName} editable={false} />

                                    {/* E-mail — read-only */}
                                    <TextInput style={[styles.input, isDark && styles.darkInput, styles.inputReadOnly, isDark && styles.darkInputReadOnly]} placeholder="E-mail" placeholderTextColor={isDark ? '#64748B' : '#CBD5E1'} value={editEmail} editable={false} />

                                    {/* Telefon — read-only if present */}
                                    {(user as any)?.phone ? (
                                        <TextInput style={[styles.input, isDark && styles.darkInput, styles.inputReadOnly, isDark && styles.darkInputReadOnly]} placeholderTextColor={isDark ? '#64748B' : '#CBD5E1'} value={(user as any).phone} editable={false} />
                                    ) : null}

                                    {/* Street picker */}
                                    {streets.length > 0 ? (
                                        <View style={{ marginBottom: 12 }}>
                                            <TouchableOpacity
                                                style={[styles.input, isDark && styles.darkInput, styles.pickerButton]}
                                                onPress={() => setShowStreetPicker(v => !v)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={selectedStreet ? [styles.pickerValueText, isDark && { color: '#FFFFFF' }] : styles.pickerPlaceholderText}>
                                                    {selectedStreet || (currentLang.startsWith('en') ? 'Select Street' : 'Cadde / Sokak Seç')}
                                                </Text>
                                                <IconSymbol name={showStreetPicker ? 'chevron.up' : 'chevron.down'} size={16} color="#94A3B8" />
                                            </TouchableOpacity>
                                            {showStreetPicker && (
                                                <View style={[styles.streetList, isDark && styles.darkStreetList, { maxHeight: 140 }]}>
                                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 140 }}>
                                                        {streets.map(street => (
                                                            <TouchableOpacity
                                                                key={street}
                                                                style={[styles.streetItem, isDark && { borderBottomColor: '#2C2C2E' }, selectedStreet === street && (isDark ? styles.darkStreetItemActive : styles.streetItemActive)]}
                                                                onPress={() => { setSelectedStreet(street); setShowStreetPicker(false); }}
                                                            >
                                                                <Text style={[styles.streetItemText, isDark && { color: '#E2E8F0' }, selectedStreet === street && styles.streetItemTextActive]}>
                                                                    {street}
                                                                </Text>
                                                                {selectedStreet === street && <IconSymbol name="checkmark" size={14} color="#059669" />}
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                            {selectedStreet ? (
                                                <TextInput
                                                    style={[styles.input, isDark && styles.darkInput, { marginTop: 8, marginBottom: 0 }]}
                                                    placeholder={currentLang.startsWith('en') ? 'Building No / Flat' : 'Bina No / Daire'}
                                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                                    value={buildingNo}
                                                    onChangeText={setBuildingNo}
                                                    keyboardType="default"
                                                />
                                            ) : null}
                                        </View>
                                    ) : (
                                        <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder={currentLang.startsWith('en') ? 'Address' : 'Adres'} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={buildingNo} onChangeText={setBuildingNo} />
                                    )}

                                    {/* Yeni Şifre */}
                                    <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder={currentLang.startsWith('en') ? 'New Password' : 'Yeni Şifre'} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={editPassword} onChangeText={setEditPassword} secureTextEntry />

                                    {/* Save Button */}
                                    <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.6 }]} disabled={isSaving} onPress={async () => {
                                        if (!editName.trim()) {
                                            Alert.alert(currentLang.startsWith('en') ? 'Error' : 'Hata', currentLang.startsWith('en') ? 'Full Name is required.' : 'Ad Soyad zorunludur.');
                                            return;
                                        }
                                        const address = selectedStreet
                                            ? `${selectedStreet}${buildingNo.trim() ? ' ' + buildingNo.trim() : ''}`
                                            : buildingNo.trim();
                                        setIsSaving(true);
                                        try {
                                            const updated = await authApi.updateProfile(editName.trim(), address);
                                            if (!updated) {
                                                Alert.alert(currentLang.startsWith('en') ? 'Error' : 'Hata', currentLang.startsWith('en') ? 'Failed to save.' : 'Kaydedilemedi.');
                                                return;
                                            }
                                            await updateProfile(updated as any);
                                            setIsEditingAccount(false);
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}>
                                        <Text style={styles.saveButtonText}>{isSaving ? '...' : (currentLang.startsWith('en') ? 'Save' : 'Kaydet')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </KeyboardAvoidingView>
                        </Modal>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    section: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    langButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    darkLangButton: {
        borderColor: '#2C2C2E',
        backgroundColor: '#1C1C1E',
    },
    activeLangButton: {
        borderColor: '#3B82F6', // Blue border
        backgroundColor: '#EFF6FF', // Light blue bg
    },
    darkActiveLangButton: {
        borderColor: '#3B82F6',
        backgroundColor: '#1E3A8A',
    },
    langButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    activeLangButtonText: {
        color: '#2563EB', // Blue text
        fontWeight: '700',
    },
    darkActiveLangButtonText: {
        color: '#93C5FD',
        fontWeight: '700',
    },
    activeIslandButton: {
        borderColor: '#3B82F6', // Blue border
        backgroundColor: '#EFF6FF', // Light blue bg
    },
    darkActiveIslandButton: {
        borderColor: '#3B82F6',
        backgroundColor: '#1E3A8A',
    },
    activeIslandButtonText: {
        color: '#2563EB', // Blue text
        fontWeight: '700',
    },
    darkActiveIslandButtonText: {
        color: '#93C5FD',
        fontWeight: '700',
    },
    darkEditButton: {
        backgroundColor: '#1C1C1E',
        borderColor: '#2C2C2E',
    },
    darkEditForm: {
        backgroundColor: '#1C1C1E',
        borderColor: '#2C2C2E',
    },
    darkInput: {
        backgroundColor: '#121212',
        color: '#FFFFFF',
        borderColor: '#2C2C2E',
    },
    darkInputReadOnly: {
        backgroundColor: '#27272A',
        color: '#71717A',
    },
    darkStreetList: {
        backgroundColor: '#121212',
        borderColor: '#2C2C2E',
    },
    darkStreetItemActive: {
        backgroundColor: '#064E3B',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    rowText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    editButtonText: {
        color: '#475569',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#DC2626',
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    editForm: {
        width: '100%',
        marginBottom: 20,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    input: {
        width: '100%',
        height: 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    saveButton: {
        width: '100%',
        height: 48,
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    inputReadOnly: {
        backgroundColor: '#F1F5F9',
        color: '#94A3B8',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    pickerPlaceholderText: {
        fontSize: 15,
        color: '#94A3B8',
    },
    pickerValueText: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500',
    },
    streetList: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        marginTop: 4,
        overflow: 'hidden',
    },
    streetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    streetItemActive: {
        backgroundColor: '#F0FDF4',
    },
    streetItemText: {
        fontSize: 14,
        color: '#334155',
    },
    streetItemTextActive: {
        color: '#059669',
        fontWeight: '600',
    },
});
