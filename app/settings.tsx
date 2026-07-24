import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, TextInput } from 'react-native';
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
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <IconSymbol name="chevron.left" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('common.settings', { defaultValue: currentLang.startsWith('en') ? 'Settings' : 'Ayarlar' })}</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                {/* Language Selection Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('common.chooseLanguage', { defaultValue: currentLang.startsWith('en') ? 'Language Selection' : 'Dil Seçimi' })}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                currentLang.startsWith('tr') && styles.activeLangButton
                            ]} 
                            onPress={() => handleLanguageChange('tr')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                currentLang.startsWith('tr') && styles.activeLangButtonText
                            ]}>Türkçe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                currentLang.startsWith('en') && styles.activeLangButton
                            ]} 
                            onPress={() => handleLanguageChange('en')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                currentLang.startsWith('en') && styles.activeLangButtonText
                            ]}>English</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Theme Selection Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{currentLang.startsWith('en') ? 'App Theme' : 'Uygulama Teması'}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                theme === 'light' && styles.activeLangButton
                            ]} 
                            onPress={() => setTheme('light')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                theme === 'light' && styles.activeLangButtonText
                            ]}>☀️ {currentLang.startsWith('en') ? 'Light' : 'Açık Tema'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                theme === 'dark' && styles.activeLangButton
                            ]} 
                            onPress={() => setTheme('dark')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                theme === 'dark' && styles.activeLangButtonText
                            ]}>🌙 {currentLang.startsWith('en') ? 'Dark (Black)' : 'Koyu (Siyah)'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Default Island Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('common.defaultIsland', { defaultValue: currentLang.startsWith('en') ? 'Default Island' : 'Varsayılan Ada' })}</Text>
                    <View style={[styles.buttonRow, { flexWrap: 'wrap' }]}>
                        {ISLANDS.map(island => (
                            <TouchableOpacity 
                                key={island}
                                style={[
                                    styles.langButton, 
                                    defaultIsland === island && styles.activeIslandButton,
                                    { minWidth: '45%', marginBottom: 12 }
                                ]} 
                                onPress={() => handleIslandSelect(island)}
                            >
                                <Text style={[
                                    styles.langButtonText,
                                    defaultIsland === island && styles.activeIslandButtonText
                                ]}>{island}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.rowText}>{t('profile.notifications', { defaultValue: currentLang.startsWith('en') ? 'Notifications' : 'Bildirimler' })}</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleNotificationsToggle}
                            trackColor={{ false: '#CBD5E1', true: '#D1FAE5' }}
                            thumbColor={notificationsEnabled ? '#10B981' : '#94A3B8'}
                        />
                    </View>
                </View>

                {/* Account Section */}
                {isLoggedIn && (
                    <View style={[styles.section, { borderBottomWidth: 0, marginTop: 'auto' }]}>
                        {isEditingAccount ? (
                            <View style={[styles.editForm, { marginBottom: 0 }]}>
                                {/* Ad Soyad — read-only */}
                                <TextInput style={[styles.input, styles.inputReadOnly]} value={editName} editable={false} />

                                {/* E-mail — read-only */}
                                <TextInput style={[styles.input, styles.inputReadOnly]} placeholder="E-mail" placeholderTextColor="#CBD5E1" value={editEmail} editable={false} />

                                {/* Telefon — read-only if present */}
                                {(user as any)?.phone ? (
                                    <TextInput style={[styles.input, styles.inputReadOnly]} placeholderTextColor="#CBD5E1" value={(user as any).phone} editable={false} />
                                ) : null}

                                {/* Street picker */}
                                {streets.length > 0 ? (
                                    <View style={{ marginBottom: 12 }}>
                                        <TouchableOpacity
                                            style={[styles.input, styles.pickerButton]}
                                            onPress={() => setShowStreetPicker(v => !v)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={selectedStreet ? styles.pickerValueText : styles.pickerPlaceholderText}>
                                                {selectedStreet || (currentLang.startsWith('en') ? 'Select Street' : 'Cadde / Sokak Seç')}
                                            </Text>
                                            <IconSymbol name={showStreetPicker ? 'chevron.up' : 'chevron.down'} size={16} color="#94A3B8" />
                                        </TouchableOpacity>
                                        {showStreetPicker && (
                                            <View style={styles.streetList}>
                                                {streets.map(street => (
                                                    <TouchableOpacity
                                                        key={street}
                                                        style={[styles.streetItem, selectedStreet === street && styles.streetItemActive]}
                                                        onPress={() => { setSelectedStreet(street); setShowStreetPicker(false); }}
                                                    >
                                                        <Text style={[styles.streetItemText, selectedStreet === street && styles.streetItemTextActive]}>
                                                            {street}
                                                        </Text>
                                                        {selectedStreet === street && <IconSymbol name="checkmark" size={14} color="#059669" />}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                        {selectedStreet ? (
                                            <TextInput
                                                style={[styles.input, { marginTop: 8, marginBottom: 0 }]}
                                                placeholder={currentLang.startsWith('en') ? 'Building No / Flat' : 'Bina No / Daire'}
                                                placeholderTextColor="#94A3B8"
                                                value={buildingNo}
                                                onChangeText={setBuildingNo}
                                                keyboardType="default"
                                            />
                                        ) : null}
                                    </View>
                                ) : (
                                    <TextInput style={styles.input} placeholder={currentLang.startsWith('en') ? 'Address' : 'Adres'} placeholderTextColor="#94A3B8" value={buildingNo} onChangeText={setBuildingNo} multiline />
                                )}

                                {/* Yeni Şifre */}
                                <TextInput style={styles.input} placeholder={currentLang.startsWith('en') ? 'New Password' : 'Yeni Şifre'} placeholderTextColor="#94A3B8" value={editPassword} onChangeText={setEditPassword} secureTextEntry />

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
                        ) : (
                            <>
                                <TouchableOpacity style={[styles.editButton, { marginBottom: 12 }]} onPress={() => {
                                    if (!isEditingAccount) openEditForm();
                                    setIsEditingAccount(!isEditingAccount);
                                }} activeOpacity={0.8}>
                                    <IconSymbol name="pencil" size={18} color="#475569" />
                                    <Text style={styles.editButtonText}>{t('profile.editAccount', { defaultValue: currentLang.startsWith('en') ? 'Edit Account' : 'Hesabı Düzenle' })}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.8}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FFFFFF" />
                                    <Text style={styles.deleteButtonText}>{t('profile.deleteAccount', { defaultValue: currentLang.startsWith('en') ? 'Delete Account' : 'Hesabı Sil' })}</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
    activeLangButton: {
        borderColor: '#3B82F6', // Blue border
        backgroundColor: '#EFF6FF', // Light blue bg
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
    activeIslandButton: {
        borderColor: '#3B82F6', // Blue border
        backgroundColor: '#EFF6FF', // Light blue bg
    },
    activeIslandButtonText: {
        color: '#2563EB', // Blue text
        fontWeight: '700',
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
