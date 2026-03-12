import { IconSymbol } from '@/components/ui/icon-symbol';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TRANSPORT_ROUTES = [
    {
        id: '1',
        name: 'Island Tour Route',
        type: 'Electric Bus',
        stations: ['Pier', 'Center Square', 'Pine Grove', 'Sunset Point', 'Monastery'],
        hours: [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:30', '14:30', '15:30', '16:30', '17:30', '18:30'
        ]
    },
    {
        id: '2',
        name: 'Beach Express',
        type: 'Electric Shuttle',
        stations: ['Pier', 'East Beach', 'West Beach', 'South Lagoon'],
        hours: [
            '09:15', '10:15', '11:15', '12:15',
            '14:00', '15:00', '16:00', '17:00'
        ]
    }
];

export default function TransportationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

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

                {TRANSPORT_ROUTES.map((route) => (
                    <View key={route.id} style={styles.routeCard}>
                        <View style={styles.routeHeader}>
                            <View>
                                <Text style={styles.routeName}>{route.name}</Text>
                                <Text style={styles.routeType}>{route.type}</Text>
                            </View>
                            <View style={styles.iconCircle}>
                                <IconSymbol name="bus.fill" size={20} color="#3B82F6" />
                            </View>
                        </View>

                        <View style={styles.stationsContainer}>
                            <Text style={styles.sectionHeading}>Stations</Text>
                            <View style={styles.stationsList}>
                                {route.stations.map((station, index) => (
                                    <View key={index} style={styles.stationItem}>
                                        <View style={styles.stationDot} />
                                        <Text style={styles.stationText}>{station}</Text>
                                        {index < route.stations.length - 1 && (
                                            <IconSymbol name="chevron.right" size={16} color="#CBD5E1" style={styles.stationArrow} />
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.hoursContainer}>
                            <Text style={styles.sectionHeading}>Departure Hours (From Pier)</Text>
                            <View style={styles.hoursGrid}>
                                {route.hours.map((hour, index) => (
                                    <View key={index} style={styles.hourBadge}>
                                        <Text style={styles.hourText}>{hour}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                ))}
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
        fontSize: 18,
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
    }
});
