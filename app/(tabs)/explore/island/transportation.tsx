import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchBusDepartures } from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ISLAND_ROUTES: Record<string, string[]> = {
    '1': ['KA-1', 'KA-2'],
    '2': ['BU-1'],
    '3': ['HA-1', 'HA-3'],
    '4': ['BA-1', 'BA-2-A', 'BA-2-B', 'BA-4', 'BA-5'],
};

interface TransportationRoute {
    id: string;
    name: string;
    type: string;
    stations: string[];
    hours: string[];
}

export default function TransportationScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { islandId } = useLocalSearchParams<{ islandId: string }>();

    const [routes, setRoutes] = useState<TransportationRoute[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);

    const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const weekDays = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days: Date[] = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    useEffect(() => {
        const loadBusData = async () => {
            const id = islandId || '4'; 
            const routeCodes = ISLAND_ROUTES[id] || [];

            setLoading(true);
            try {
                const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                
                const results = await Promise.all(
                    routeCodes.map(code => fetchBusDepartures(code, undefined, dateStr))
                );

                const mappedRoutes: TransportationRoute[] = results
                    .filter(data => data.length > 0)
                    .map((data, index) => {
                        const firstStop = data[0].stop;
                        return {
                            id: data[0].routeCode,
                            name: data[0].routeName,
                            type: 'Electric Bus',
                            stations: [firstStop, '...', 'End Station'],
                            hours: data.map(d => d.time)
                        };
                    });

                setRoutes(mappedRoutes);
            } catch (error) {
                console.error("Error loading bus data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadBusData();
    }, [islandId, selectedDate]);
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
                {/* Date Picker Strip */}
                <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                        <Text style={styles.datePickerTitle}>
                            {MONTHS_EN[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                        </Text>
                        {selectedDate.toDateString() === new Date().toDateString() && (
                            <Text style={styles.todayLabel}>{t('common.today')}</Text>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {weekDays.map((day, i) => {
                            const isSelected = day.toDateString() === selectedDate.toDateString();
                            const isToday = day.toDateString() === new Date().toDateString();
                            const dayName = DAY_NAMES_SHORT[day.getDay()];
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.dayColumn}
                                    onPress={() => setSelectedDate(day)}
                                >
                                    <Text style={[
                                        styles.dayName,
                                        isWeekend && styles.weekendText,
                                        isSelected && styles.selectedDayText
                                    ]}>{dayName}</Text>
                                    <View style={[
                                        styles.dayCircle,
                                        isSelected && styles.selectedDayCircle
                                    ]}>
                                        <Text style={[
                                            styles.dayNum,
                                            isWeekend && styles.weekendText,
                                            isSelected && styles.selectedDayNum
                                        ]}>{day.getDate()}</Text>
                                    </View>
                                    {isToday && <View style={styles.todayDot} />}
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>

                <View style={styles.infoBox}>
                    <IconSymbol name="info" size={20} color="#3B82F6" />
                    <Text style={styles.infoText}>
                        {t('common.prohibitedVehicles')}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text style={styles.loadingText}>{t('common.fetchingBusSchedules')}</Text>
                    </View>
                ) : routes.length > 0 ? (
                    routes.map((route) => (
                        <View key={route.id} style={styles.routeCard}>
                            <View style={styles.routeHeader}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.routeName} numberOfLines={1} adjustsFontSizeToFit>{route.name}</Text>
                                    <Text style={styles.routeType} numberOfLines={1}>{t('common.ecoFriendlyBus')}</Text>
                                </View>
                                <View style={styles.iconCircle}>
                                    <IconSymbol name="bus.fill" size={20} color="#3B82F6" />
                                </View>
                            </View>

                            <View style={styles.hoursContainer}>
                                {(() => {
                                    const now = new Date();
                                    const dateDisplay = `${selectedDate.getDate()} ${MONTHS_EN[selectedDate.getMonth()]}`;
                                    const isSelectedToday = selectedDate.toDateString() === now.toDateString();
                                    const currentTimeVal = now.getHours() * 60 + now.getMinutes();

                                    // Find index of next trip ONLY if it's today
                                    const nextIndex = isSelectedToday ? route.hours.findIndex(hour => {
                                        const [h, m] = hour.split(':').map(Number);
                                        return (h * 60 + m) >= currentTimeVal;
                                    }) : -1;

                                    return (
                                        <>
                                            <Text style={styles.sectionHeading}>{t('common.departureHours')} ({dateDisplay})</Text>
                                            <View style={styles.hoursGrid}>
                                                {route.hours.map((hour, index) => {
                                                    const [h, m] = hour.split(':').map(Number);
                                                    const routeTimeVal = h * 60 + m;
                                                    const isPast = isSelectedToday && routeTimeVal < currentTimeVal;
                                                    const isNext = isSelectedToday && index === nextIndex;

                                                    return (
                                                        <View key={index} style={[
                                                            styles.hourBadge,
                                                            isPast && { opacity: 0.15 },
                                                            isNext && { borderColor: '#3B82F6', borderWidth: 1.5, backgroundColor: '#EFF6FF' }
                                                        ]}>
                                                            {isNext && (
                                                                <View style={styles.nextBadge}>
                                                                    <Text style={styles.nextBadgeText}>{t('common.next')}</Text>
                                                                </View>
                                                            )}
                                                            <Text style={[styles.hourText, isNext && { color: '#1D4ED8' }]}>{hour}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </>
                                    );
                                })()}
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t('common.noBusSchedules')}</Text>
                    </View>
                )}
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
        paddingBottom: 20,
        backgroundColor: 'transparent',
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
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
