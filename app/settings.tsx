import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/authApi';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/notificationService';

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { isLoggedIn, logout } = useAuth();
    
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [defaultIsland, setDefaultIsland] = useState('Büyükada');
    const ISLANDS = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];

    // Edit Account states
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editPassword, setEditPassword] = useState('');

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
        Alert.alert(
            t('profile.deleteAccountTitle', { defaultValue: 'Hesabını Sil' }),
            t('profile.deleteAccountConfirm', { defaultValue: 'Hesabınızı silmek istediğinize emin misiniz? Tüm verileriniz kalıcı olarak silinecektir.' }),
            [
                { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                { 
                    text: t('profile.deleteAccount', { defaultValue: 'Hesabı Sil' }), 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await authApi.deleteAccount();
                            logout();
                            router.replace('/');
                        } catch (e) {
                            Alert.alert(t('common.error', { defaultValue: 'Hata' }), t('common.deleteFailed', { defaultValue: 'Silme işlemi başarısız.' }));
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
                <Text style={styles.headerTitle}>{t('common.settings', { defaultValue: 'Ayarlar' })}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Language Selection Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('common.chooseLanguage', { defaultValue: 'Dil Seçimi' })}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                i18n.language.startsWith('tr') && styles.activeLangButton
                            ]} 
                            onPress={() => i18n.changeLanguage('tr')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                i18n.language.startsWith('tr') && styles.activeLangButtonText
                            ]}>Türkçe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.langButton, 
                                i18n.language.startsWith('en') && styles.activeLangButton
                            ]} 
                            onPress={() => i18n.changeLanguage('en')}
                        >
                            <Text style={[
                                styles.langButtonText,
                                i18n.language.startsWith('en') && styles.activeLangButtonText
                            ]}>English</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Default Island Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('common.defaultIsland', { defaultValue: 'Varsayılan Ada' })}</Text>
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
                        <Text style={styles.rowText}>{t('profile.notifications', { defaultValue: 'Bildirimler' })}</Text>
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
                        {isEditingAccount && (
                            <View style={styles.editForm}>
                                <TextInput style={styles.input} placeholder={t('profile.name', { defaultValue: 'Ad Soyad' })} placeholderTextColor="#94A3B8" value={editName} onChangeText={setEditName} />
                                <TextInput style={styles.input} placeholder={t('profile.email', { defaultValue: 'E-mail' })} placeholderTextColor="#94A3B8" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
                                <TextInput style={styles.input} placeholder={t('profile.phone', { defaultValue: 'Telefon No' })} placeholderTextColor="#94A3B8" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
                                <TextInput style={styles.input} placeholder={t('profile.newPassword', { defaultValue: 'Yeni Şifre' })} placeholderTextColor="#94A3B8" value={editPassword} onChangeText={setEditPassword} secureTextEntry />
                                <TouchableOpacity style={styles.saveButton} onPress={() => setIsEditingAccount(false)}>
                                    <Text style={styles.saveButtonText}>{t('common.save', { defaultValue: 'Kaydet' })}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity style={[styles.editButton, { marginBottom: 12 }]} onPress={() => setIsEditingAccount(!isEditingAccount)} activeOpacity={0.8}>
                            <IconSymbol name="pencil" size={18} color="#475569" />
                            <Text style={styles.editButtonText}>{t('profile.editAccount', { defaultValue: 'Hesabı Düzenle' })}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.8}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FFFFFF" />
                            <Text style={styles.deleteButtonText}>{t('profile.deleteAccount', { defaultValue: 'Hesabı Sil' })}</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    langButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
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
        fontSize: 16,
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
});
