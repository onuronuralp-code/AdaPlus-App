import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchBusDepartures } from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { islandId } = useLocalSearchParams<{ islandId: string }>();

    const [routes, setRoutes] = useState<TransportationRoute[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBusData = async () => {
            const id = islandId || '4'; // Default to Büyükada if not specified
            const routeCodes = ISLAND_ROUTES[id] || [];

            setLoading(true);
            try {
                const results = await Promise.all(
                    routeCodes.map(code => fetchBusDepartures(code))
                );

                const mappedRoutes: TransportationRoute[] = results
                    .filter(data => data.length > 0)
                    .map((data, index) => {
                        // Assuming the first stop is the main departure point for the "hours" list
                        const firstStop = data[0].stop;
                        return {
                            id: data[0].routeCode,
                            name: data[0].routeName,
                            type: 'Electric Bus',
                            stations: [firstStop, '...', 'End Station'], // We'd need a separate endpoint for full stop list
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
    }, [islandId]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transportation</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                    <IconSymbol name="info" size={20} color="#3B82F6" />
                    <Text style={styles.infoText}>
                        Motor vehicles are prohibited on the islands. Transportation is provided by eco-friendly electric buses and shuttles.
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text style={styles.loadingText}>Fetching bus schedules...</Text>
                    </View>
                ) : routes.length > 0 ? (
                    routes.map((route) => (
                        <View key={route.id} style={styles.routeCard}>
                            <View style={styles.routeHeader}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.routeName} numberOfLines={1} adjustsFontSizeToFit>{route.name}</Text>
                                    <Text style={styles.routeType} numberOfLines={1}>{route.type}</Text>
                                </View>
                                <View style={styles.iconCircle}>
                                    <IconSymbol name="bus.fill" size={20} color="#3B82F6" />
                                </View>
                            </View>

                            <View style={styles.hoursContainer}>
                                <Text style={styles.sectionHeading}>Departure Hours (From Main Station)</Text>
                                <View style={styles.hoursGrid}>
                                    {(() => {
                                        const now = new Date();
                                        const isToday = true; // Placeholder until date picker is added
                                        const currentTimeVal = now.getHours() * 60 + now.getMinutes();

                                        // Find the index of the next trip
                                        const nextIndex = route.hours.findIndex(hour => {
                                            const [h, m] = hour.split(':').map(Number);
                                            return (h * 60 + m) >= currentTimeVal;
                                        });

                                        return route.hours.map((hour, index) => {
                                            const [h, m] = hour.split(':').map(Number);
                                            const routeTimeVal = h * 60 + m;
                                            const isPast = isToday && routeTimeVal < currentTimeVal;
                                            const isNext = isToday && index === nextIndex;

                                            return (
                                                <View key={index} style={[
                                                    styles.hourBadge,
                                                    isPast && { opacity: 0.35 },
                                                    isNext && { borderColor: '#2E7D32', borderWidth: 1, backgroundColor: '#F1FBF1' }
                                                ]}>
                                                    {isNext && (
                                                        <View style={styles.nextBadge}>
                                                            <Text style={styles.nextBadgeText}>NEXT</Text>
                                                        </View>
                                                    )}
                                                    <Text style={[styles.hourText, isNext && { color: '#1B5E20' }]}>{hour}</Text>
                                                </View>
                                            );
                                        });
                                    })()}
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No bus schedules available for this island.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
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
        top: -6,
        right: -6,
        backgroundColor: '#2E7D32',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        zIndex: 1,
    },
    nextBadgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
    }
});
