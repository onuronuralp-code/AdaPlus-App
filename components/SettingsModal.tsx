import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const [defaultIsland, setDefaultIsland] = useState('Büyükada');
    const ISLANDS = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];

    useEffect(() => {
        if (visible) {
            AsyncStorage.getItem('defaultIsland').then(island => {
                if (island) setDefaultIsland(island);
            });
            AsyncStorage.getItem('notificationsEnabled').then(enabled => {
                if (enabled !== null) setNotificationsEnabled(enabled === 'true');
            });
        }
    }, [visible]);

    const handleIslandSelect = (island: string) => {
        setDefaultIsland(island);
        AsyncStorage.setItem('defaultIsland', island);
    };

    const handleNotificationsToggle = (val: boolean) => {
        setNotificationsEnabled(val);
        AsyncStorage.setItem('notificationsEnabled', val.toString());
    };

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
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 8 }} 
                        onPress={onClose} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <IconSymbol name="xmark" size={20} color="#94A3B8" />
                    </TouchableOpacity>
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
                        <View style={[styles.section, { borderBottomWidth: 0 }]}>
                            <TouchableOpacity style={[styles.editButton, { marginBottom: 12 }]} onPress={() => {}} activeOpacity={0.8}>
                                <IconSymbol name="pencil" size={18} color="#475569" />
                                <Text style={styles.editButtonText}>{t('profile.editAccount', { defaultValue: 'Hesabı Düzenle' })}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteButton} onPress={onDeleteAccount} activeOpacity={0.8}>
                                <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FFFFFF" />
                                <Text style={styles.deleteButtonText}>{t('profile.deleteAccount', { defaultValue: 'Hesabı Sil' })}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

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
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    editButtonText: {
        color: '#475569',
        fontSize: 14,
        fontWeight: '700',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#DC2626',
    },
    deleteButtonText: {
        color: '#FFFFFF',
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
