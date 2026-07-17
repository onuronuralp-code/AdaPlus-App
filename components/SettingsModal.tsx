import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onDeleteAccount: () => void;
    isLoggedIn?: boolean;
}

export default function SettingsModal({ visible, onClose, onDeleteAccount, isLoggedIn = false }: SettingsModalProps) {
    const { t, i18n } = useTranslation();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <IconSymbol name="gearshape.fill" size={28} color="#64748B" />
                    </View>
                    <Text style={styles.title}>{t('common.settings', { defaultValue: 'Ayarlar' })}</Text>

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

                    {/* Notifications Section */}
                    {isLoggedIn && (
                        <View style={styles.section}>
                            <View style={styles.row}>
                                <Text style={styles.rowText}>{t('profile.notifications', { defaultValue: 'Bildirimler' })}</Text>
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={setNotificationsEnabled}
                                    trackColor={{ false: '#CBD5E1', true: '#D1FAE5' }}
                                    thumbColor={notificationsEnabled ? '#10B981' : '#94A3B8'}
                                />
                            </View>
                        </View>
                    )}

                    {/* Account Section */}
                    {isLoggedIn && (
                        <View style={styles.section}>
                            <TouchableOpacity style={styles.deleteButton} onPress={onDeleteAccount} activeOpacity={0.8}>
                                <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#EF4444" />
                                <Text style={styles.deleteButtonText}>{t('profile.deleteAccount', { defaultValue: 'Hesabı Sil' })}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.closeButtonText}>{t('common.close', { defaultValue: 'Kapat' })}</Text>
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
        padding: 24,
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
        borderRadius: 32,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 20,
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
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    activeLangButton: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    langButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    activeLangButtonText: {
        color: '#059669',
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
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '700',
    },
    closeButton: {
        width: '100%',
        backgroundColor: '#64748B',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});
