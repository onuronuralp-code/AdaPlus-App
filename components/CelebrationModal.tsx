import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

interface CelebrationModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ visible, onClose, title = "Tebrikler!", description = "5 kişiyi davet ettin ve Adalı rozetini kazandın! Artık adanın özel alanlarına ve Ada AI'a sınırsız erişimin var." }) => {
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            scaleAnim.setValue(0.5);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.iconContainer}>
                        <Text style={{ fontSize: 40 }}>🎉</Text>
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>
                        {description}
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.buttonText}>Harika!</Text>
                    </TouchableOpacity>
                </Animated.View>
                
                <View style={[StyleSheet.absoluteFill, { elevation: 11, zIndex: 11 }]} pointerEvents="none">
                    <ConfettiCannon
                        count={150}
                        origin={{ x: width / 2, y: height }}
                        explosionSpeed={400}
                        fallSpeed={1800}
                        fadeOut={true}
                        autoStart={true}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1.5,
        backgroundColor: '#F59E0B' + '15',
        borderColor: '#F59E0B' + '30',
        gap: 5,
    },
    roleDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#F59E0B',
    },
    roleText: {
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: '#F59E0B',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    button: {
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    }
});
