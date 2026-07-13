import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

interface EmptyStateProps {
    icon: string;
    title: string;
    subtitle: string;
    color?: string;
    compact?: boolean;
    style?: any;
}

const { width } = Dimensions.get('window');

export const EmptyState: React.FC<EmptyStateProps> = ({ 
    icon, 
    title, 
    subtitle, 
    color = '#64748B',
    compact = false,
    style
}) => {
    return (
        <View style={[styles.container, compact && styles.compactContainer, style]}>
            <View style={[
                styles.iconContainer, 
                { backgroundColor: color + '10' },
                compact && styles.compactIconContainer
            ]}>
                <IconSymbol name={icon as any} size={compact ? 32 : 40} color={color} />
            </View>
            <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
            <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>{subtitle}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    compactContainer: {
        paddingTop: 80,
        paddingBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 2,
    },
    compactIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    compactTitle: {
        fontSize: 17,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
    },
    compactSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        paddingHorizontal: 20,
    }
});
