import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { authApi } from '@/services/authApi';

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
        'Gezi Caddesi', 'Takımağa Caddesi', 'Yalı Caddesi',
        'Cami Sokak', 'Gökbağ Sokak', 'Çarşı Caddesi',
    ],
    KINALIADA: [
        'Kınalıada Caddesi', 'Alsancak Caddesi', 'Başarılı Sokak',
        'Akagündüz Caddesi', 'Teşrifatçı Sokak', 'Köşk Sokak',
    ],
};

export default function EditAccountScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { user, updateProfile } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isEn = i18n.language.startsWith('en');

    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
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
    const activeIslandKey = userIsland ?? ISLAND_KEY_MAP['Büyükada'] ?? '';
    const streets = ISLAND_STREETS[activeIslandKey] ?? [];

    useEffect(() => {
        if (user) {
            setEditName(user.fullName ?? '');
            setEditEmail(user.email ?? '');
            const existingAddress = (user as any)?.address ?? '';
            const islandStreets = userIsland ? (ISLAND_STREETS[userIsland] ?? []) : Object.values(ISLAND_STREETS).flat();
            const matchedStreet = islandStreets.find(s => existingAddress.startsWith(s));
            if (matchedStreet) {
                setSelectedStreet(matchedStreet);
                setBuildingNo(existingAddress.slice(matchedStreet.length).replace(/^[\s,]+/, ''));
            } else {
                setSelectedStreet('');
                setBuildingNo(existingAddress);
            }
        }
    }, [user]);

    const handleSave = async () => {
        if (!editName.trim()) {
            Alert.alert(isEn ? 'Error' : 'Hata', isEn ? 'Full Name is required.' : 'Ad Soyad zorunludur.');
            return;
        }

        if (editPassword.trim()) {
            if (!currentPassword.trim()) {
                Alert.alert(
                    isEn ? 'Error' : 'Hata',
                    isEn ? 'Please enter your current password to set a new password.' : 'Yeni şifre belirlemek için lütfen mevcut şifrenizi girin.'
                );
                return;
            }

            setIsSaving(true);
            try {
                const pwdResult = await authApi.changePassword(currentPassword.trim(), editPassword.trim());
                if (!pwdResult.success) {
                    Alert.alert(
                        isEn ? 'Error' : 'Hata',
                        pwdResult.message || (isEn ? 'Current password is incorrect.' : 'Mevcut şifreniz hatalı.')
                    );
                    setIsSaving(false);
                    return;
                }
            } catch {
                Alert.alert(
                    isEn ? 'Error' : 'Hata',
                    isEn ? 'Failed to update password.' : 'Şifre güncellenemedi.'
                );
                setIsSaving(false);
                return;
            }
        }

        const address = selectedStreet
            ? `${selectedStreet}${buildingNo.trim() ? ' ' + buildingNo.trim() : ''}`
            : buildingNo.trim();
        setIsSaving(true);
        try {
            const updated = await authApi.updateProfile(editName.trim(), address);
            if (!updated) {
                Alert.alert(isEn ? 'Error' : 'Hata', isEn ? 'Failed to save profile.' : 'Profil kaydedilemedi.');
                return;
            }
            await updateProfile(updated as any);
            Alert.alert(
                isEn ? 'Success' : 'Başarılı',
                isEn ? 'Account details updated successfully.' : 'Hesap bilgileriniz başarıyla güncellendi.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#000000' }]} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={[styles.header, isDark && { borderBottomColor: '#1C1C1E' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <IconSymbol name="chevron.left" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>
                    {t('profile.editAccount', { defaultValue: isEn ? 'Edit Account' : 'Hesabı Düzenle' })}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E', borderWidth: 1 }]}>
                    
                    {/* Ad Soyad — read-only */}
                    <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{isEn ? 'Full Name' : 'Ad Soyad'}</Text>
                    <TextInput style={[styles.input, isDark && styles.darkInput, styles.inputReadOnly, isDark && styles.darkInputReadOnly]} value={editName} editable={false} />

                    {/* E-mail — read-only */}
                    <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>E-mail</Text>
                    <TextInput style={[styles.input, isDark && styles.darkInput, styles.inputReadOnly, isDark && styles.darkInputReadOnly]} placeholder="E-mail" placeholderTextColor={isDark ? '#64748B' : '#CBD5E1'} value={editEmail} editable={false} />

                    {/* Telefon — read-only if present */}
                    {(user as any)?.phone ? (
                        <>
                            <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{isEn ? 'Phone' : 'Telefon'}</Text>
                            <TextInput style={[styles.input, isDark && styles.darkInput, styles.inputReadOnly, isDark && styles.darkInputReadOnly]} placeholderTextColor={isDark ? '#64748B' : '#CBD5E1'} value={(user as any).phone} editable={false} />
                        </>
                    ) : null}

                    {/* Address Section */}
                    <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{isEn ? 'Address' : 'Adres'}</Text>
                    {streets.length > 0 ? (
                        <View style={{ marginBottom: 12 }}>
                            <TouchableOpacity
                                style={[styles.input, isDark && styles.darkInput, styles.pickerButton]}
                                onPress={() => setShowStreetPicker(v => !v)}
                                activeOpacity={0.8}
                            >
                                <Text style={selectedStreet ? [styles.pickerValueText, isDark && { color: '#FFFFFF' }] : styles.pickerPlaceholderText}>
                                    {selectedStreet || (isEn ? 'Select Street' : 'Cadde / Sokak Seç')}
                                </Text>
                                <IconSymbol name={showStreetPicker ? 'chevron.up' : 'chevron.down'} size={16} color="#94A3B8" />
                            </TouchableOpacity>
                            {showStreetPicker && (
                                <View style={[styles.streetList, isDark && styles.darkStreetList, { maxHeight: 160 }]}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 160 }}>
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
                                    placeholder={isEn ? 'Building No / Flat' : 'Bina No / Daire'}
                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                    value={buildingNo}
                                    onChangeText={setBuildingNo}
                                    keyboardType="default"
                                />
                            ) : null}
                        </View>
                    ) : (
                        <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder={isEn ? 'Address' : 'Adres'} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={buildingNo} onChangeText={setBuildingNo} />
                    )}

                    {/* Mevcut Şifre */}
                    <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }, { marginTop: 8 }]}>{isEn ? 'Current Password' : 'Mevcut Şifre'}</Text>
                    <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder={isEn ? 'Current Password' : 'Mevcut Şifre'} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />

                    {/* Yeni Şifre */}
                    <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{isEn ? 'New Password' : 'Yeni Şifre'}</Text>
                    <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder={isEn ? 'New Password' : 'Yeni Şifre'} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={editPassword} onChangeText={setEditPassword} secureTextEntry />

                    {/* Save Button */}
                    <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.6 }]} disabled={isSaving} onPress={handleSave}>
                        {isSaving ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>{isEn ? 'Save' : 'Kaydet'}</Text>
                        )}
                    </TouchableOpacity>

                </View>
            </ScrollView>
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
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    content: {
        flex: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 6,
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
        marginBottom: 14,
    },
    darkInput: {
        backgroundColor: '#1E1B4B',
        borderColor: '#2E2A68',
        color: '#FFFFFF',
    },
    inputReadOnly: {
        backgroundColor: '#F1F5F9',
        color: '#94A3B8',
    },
    darkInputReadOnly: {
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        color: '#64748B',
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
    darkStreetList: {
        backgroundColor: '#18181B',
        borderColor: '#27272A',
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
    darkStreetItemActive: {
        backgroundColor: '#064E3B',
    },
    streetItemText: {
        fontSize: 14,
        color: '#334155',
    },
    streetItemTextActive: {
        color: '#059669',
        fontWeight: '600',
    },
    saveButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#3B82F6',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
