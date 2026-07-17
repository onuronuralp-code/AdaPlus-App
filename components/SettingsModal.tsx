import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/authApi';
import { getToken } from '@/utils/tokenStorage';

export const SettingsModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const { t, i18n } = useTranslation();
    const { logout } = useAuth();
    const isTr = i18n.language.startsWith('tr');

    const handleDeleteAccount = () => {
        Alert.alert(
            t('profile.deleteAccountTitle', { defaultValue: 'Hesabı Sil' }),
            t('profile.deleteAccountConfirm', { defaultValue: 'Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' }),
            [
                { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
                { 
                    text: t('common.delete', { defaultValue: 'Sil' }), 
                    style: 'destructive',
                    onPress: async () => {
                        const token = await getToken();
                        if (token) {
                            await authApi.deleteAccount(token);
                        }
                        logout();
                        onClose();
                    }
                }
            ]
        );
    };
    
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>{t('common.settings', { defaultValue: 'Ayarlar' })}</Text>
                        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: -8, top: -8, padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                            <IconSymbol name="xmark" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                                <IconSymbol name="globe" size={20} color="#3B82F6" />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A' }}>{t('common.language', { defaultValue: 'Dil (Language)' })}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 4 }}>
                            <TouchableOpacity 
                                onPress={() => !isTr && i18n.changeLanguage('tr')}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isTr ? '#FFF' : 'transparent', shadowColor: isTr ? '#000' : 'transparent', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: isTr ? 2 : 0 }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: isTr ? '700' : '500', color: isTr ? '#0F172A' : '#64748B' }}>TR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => isTr && i18n.changeLanguage('en')}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: !isTr ? '#FFF' : 'transparent', shadowColor: !isTr ? '#000' : 'transparent', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: !isTr ? 2 : 0 }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: !isTr ? '700' : '500', color: !isTr ? '#0F172A' : '#64748B' }}>EN</Text>
                            </TouchableOpacity>
                        </View>
                    </View>


                    <TouchableOpacity 
                        onPress={handleDeleteAccount}
                        style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, marginTop: 8 }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <IconSymbol name="trash.fill" size={18} color="#EF4444" />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#EF4444' }}>{t('common.deleteAccount', { defaultValue: 'Hesabı Sil' })}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};
