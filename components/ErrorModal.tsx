import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';

interface ErrorModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
    buttonText?: string;
}

export default function ErrorModal({ visible, onClose, title, message, buttonText }: ErrorModalProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.card, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#27272A' }]}>
                    <View style={[styles.iconCircle, isDark && { backgroundColor: '#3F0F12' }]}>
                        <IconSymbol name="exclamationmark.circle.fill" size={28} color="#EF4444" />
                    </View>
                    <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>{title || 'Hata'}</Text>
                    <Text style={[styles.message, isDark && { color: '#CBD5E1' }]}>
                        {message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}
                    </Text>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.closeButtonText}>{buttonText || 'Tamam'}</Text>
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
        padding: 28,
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
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    closeButton: {
        width: '100%',
        backgroundColor: '#EF4444',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
});
