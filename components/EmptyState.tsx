import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';

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
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <View style={[styles.container, compact && styles.compactContainer, style]}>
            <View style={[
                styles.iconContainer, 
                { backgroundColor: isDark ? color + '25' : color + '10' },
                compact && styles.compactIconContainer
            ]}>
                <IconSymbol name={icon as any} size={compact ? 24 : 40} color={isDark ? '#CBD5E1' : color} />
            </View>
            <Text style={[styles.title, compact && styles.compactTitle, isDark && { color: '#F8FAFC' }]}>{title}</Text>
            <Text style={[styles.subtitle, compact && styles.compactSubtitle, isDark && { color: '#CBD5E1' }]}>{subtitle}</Text>
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
        paddingTop: 30,
        paddingBottom: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        
    },
    compactIconContainer: {
        width: 54,
        height: 54,
        borderRadius: 27,
        marginBottom: 10,
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
