import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';

interface LoginPromptModalProps {
    visible: boolean;
    onClose: () => void;
    onLogin: () => void;
    message?: string;
}

export default function LoginPromptModal({ visible, onClose, onLogin, message }: LoginPromptModalProps) {
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
                <View style={[styles.card, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
                    <View style={[styles.iconCircle, isDark && { backgroundColor: '#064E3B' }]}>
                        <IconSymbol name="person.fill" size={28} color={isDark ? "#34D399" : "#10B981"} />
                    </View>
                    <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>Giriş Gerekli</Text>
                    <Text style={[styles.message, isDark && { color: '#CBD5E1' }]}>
                        {message || 'Bu işlemi yapabilmek için giriş yapmalısınız.'}
                    </Text>
                    <TouchableOpacity style={styles.loginButton} onPress={onLogin} activeOpacity={0.8}>
                        <Text style={styles.loginButtonText}>Giriş Yap</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelButton, isDark && { backgroundColor: '#1C1C1E' }]} onPress={onClose} activeOpacity={0.7}>
                        <Text style={[styles.cancelButtonText, isDark && { color: '#94A3B8' }]}>İptal</Text>
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
        borderRadius: 20,
        backgroundColor: '#ECFDF5',
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
    loginButton: {
        width: '100%',
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#94A3B8',
        fontSize: 15,
        fontWeight: '600',
    },
});
