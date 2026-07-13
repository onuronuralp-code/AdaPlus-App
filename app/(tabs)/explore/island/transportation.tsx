import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchBusDepartures } from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function TransportationScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { islandId } = useLocalSearchParams<{ islandId: string }>();


    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('common.transportation')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.infoBox}>
                    <IconSymbol name="info" size={20} color="#3B82F6" />
                    <Text style={styles.infoText}>
                        {t('common.prohibitedVehicles')}
                    </Text>
                </View>

                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('common.noBusSchedules')}</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 26,
        fontFamily: 'Poppins_800ExtraBold',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        color: '#1E3A8A',
        fontSize: 14,
        lineHeight: 20,
    },
    routeCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    routeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    routeName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 4,
    },
    routeType: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stationsContainer: {
        marginBottom: 20,
    },
    stationsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    stationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    stationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginRight: 6,
    },
    stationText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    stationArrow: {
        marginHorizontal: 4,
    },
    hoursContainer: {},
    hoursGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    hourBadge: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        margin: 4,
    },
    hourText: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '600',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
        fontSize: 14,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#64748B',
        fontSize: 14,
        textAlign: 'center',
    },
    nextBadge: {
        position: 'absolute',
        top: -7,
        right: -7,
        backgroundColor: '#2E7D32',
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 4,
        zIndex: 1,
    },
    nextBadgeText: {
        color: '#fff',
        fontSize: 6,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    // Date Picker Styles
    datePickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    datePickerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    todayLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#3B82F6',
        textTransform: 'uppercase',
    },
    dayColumn: {
        width: 45,
        alignItems: 'center',
        paddingVertical: 4,
    },
    dayName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 4,
    },
    dayCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedDayCircle: {
        backgroundColor: '#EFF6FF',
    },
    dayNum: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },
    selectedDayNum: {
        color: '#3B82F6',
        fontWeight: '800',
    },
    selectedDayText: {
        color: '#3B82F6',
    },
    weekendText: {
        color: '#3B82F6',
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3B82F6',
        marginTop: 2,
    }
});
