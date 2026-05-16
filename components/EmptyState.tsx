import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface EmptyStateProps {
    icon: string;
    title: string;
    subtitle: string;
    style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, style }) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.iconCircle}>
                <IconSymbol name={icon as any} size={42} color="#94A3B8" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#F8FAFC',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
    },
});
