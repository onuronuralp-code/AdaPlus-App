import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fetchDepartures } from '../services/api';

// ... (interfaces and constants remain the same)

interface FerryRoute {
    id: string;
    departure: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    type: 'Vapur' | 'Motor';
    provider: string;
    isDirect: boolean;
    via?: string[];
}

const ISLANDS = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];
const MAINLAND = ['Kabataş', 'Bostancı', 'Kadıköy', 'Beşiktaş'];
const ALL_LOCATIONS = [...ISLANDS, ...MAINLAND];
const DEPARTURE_LOCATIONS = ['Unselected', ...ALL_LOCATIONS];
const DESTINATION_LOCATIONS = ['Unselected', ...ALL_LOCATIONS];

// Ferry data is fetched from the API

// Approximate transit times in minutes between key stops
const TRANSIT_MINUTES: Record<string, Record<string, number>> = {
    'Kınalıada': { 'Burgazada': 15, 'Heybeliada': 30, 'Büyükada': 50, 'Bostancı': 25, 'Kabataş': 80, 'Kadıköy': 65, 'Beşiktaş': 90, 'Maltepe': 60 },
    'Burgazada': { 'Kınalıada': 15, 'Heybeliada': 15, 'Büyükada': 35, 'Bostancı': 35, 'Kabataş': 90, 'Kadıköy': 70, 'Beşiktaş': 100 },
    'Heybeliada': { 'Kınalıada': 30, 'Burgazada': 15, 'Büyükada': 20, 'Bostancı': 50, 'Kabataş': 100, 'Kadıköy': 80 },
    'Büyükada': { 'Kınalıada': 50, 'Burgazada': 35, 'Heybeliada': 20, 'Bostancı': 60, 'Kabataş': 110, 'Kadıköy': 90, 'Maltepe': 45 },
    'Bostancı': { 'Kınalıada': 25, 'Burgazada': 35, 'Heybeliada': 50, 'Büyükada': 60 },
    'Kabataş': { 'Kınalıada': 80, 'Burgazada': 90, 'Heybeliada': 100, 'Büyükada': 110, 'Kadıköy': 30 },
    'Kadıköy': { 'Kınalıada': 65, 'Büyükada': 90, 'Kabataş': 30 },
    'Beşiktaş': { 'Kınalıada': 90, 'Büyükada': 110 },
    'Maltepe': { 'Kınalıada': 60, 'Büyükada': 45 },
};

const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const rh = Math.floor(total / 60) % 24;
    const rm = total % 60;
    return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
};

const getArrivalTime = (from: string, to: string, departureTime: string): string | null => {
    const mins = TRANSIT_MINUTES[from]?.[to];
    if (!mins) return null;
    return addMinutes(departureTime, mins);
};

// ... (calculateDuration remains the same)
const calculateDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let durationM = (endH * 60 + endM) - (startH * 60 + startM);
    if (durationM < 0) durationM += 24 * 60;

    const h = Math.floor(durationM / 60);
    const m = durationM % 60;

    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};

export function FerrySchedule() {
    const { theme } = useTheme();
    // Destination (formerly selectedIsland)
    const [destination, setDestination] = useState('Unselected'); // Default to Unselected
    const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

    // Departure (formerly selectedPort)
    const [departure, setDeparture] = useState('Unselected');
    const [showDepartureDropdown, setShowDepartureDropdown] = useState(false);

    const [onlyDirect, setOnlyDirect] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<FerryRoute | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const isLight = theme === 'light';

    // Reset to default on focus
    useFocusEffect(
        useCallback(() => {
            setDestination('Unselected');
            setDeparture('Unselected');
            setSelectedDate(new Date());
            return () => { };
        }, [])
    );

    // API Integration Data
    const [ferryData, setFerryData] = useState<FerryRoute[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadIds = async () => {
            // If Unselected, don't fetch anything, showing empty list
            if (destination === 'Unselected') {
                setFerryData([]);
                return;
            }

            setLoading(true);
            try {
                // Determine valid Departments
                const validDepartures = departure === 'Unselected'
                    ? ALL_LOCATIONS
                    : [departure];

                // Determine valid Destinations
                // Note: destination 'Unselected' is handled above
                const validDestinations = [destination];

                // Generate pairs (From -> To)
                const pairs: { from: string, to: string }[] = [];

                validDepartures.forEach(from => {
                    validDestinations.forEach(to => {
                        // Exclude same location / self-loops
                        if (from !== to) {
                            pairs.push({ from, to });
                        }
                    });
                });

                // Optimization: If > 20 pairs, maybe warn or slice? 
                // For 8 locations, max 8*7 = 56 pairs. A bit heavy but acceptable for demo.

                let allRoutes: FerryRoute[] = [];

                // Build date string for API (YYYY-MM-DD), null = today
                const isToday = selectedDate.toDateString() === new Date().toDateString();
                const dateStr = isToday ? undefined : selectedDate.toISOString().split('T')[0];

                // Use Promise.all for parallel fetching
                const dataPromises = pairs.map(pair => fetchDepartures(pair.from, pair.to, dateStr));
                const results = await Promise.all(dataPromises);

                results.forEach((data, index) => {
                    // map logic...
                    const mapped = data.map(dto => ({
                        id: `${dto.from}_${dto.to}_${dto.time}_${Math.random().toString(36).substr(2, 9)}`,
                        departure: dto.from,
                        destination: dto.to,
                        departureTime: dto.time,
                        arrivalTime: "",
                        type: (dto.provider === 'Şehir Hatları' ? 'Vapur' : 'Motor') as 'Vapur' | 'Motor',
                        provider: dto.provider,
                        isDirect: !dto.via || dto.via.length === 0,
                        via: dto.via
                    }));
                    allRoutes = [...allRoutes, ...mapped];
                });

                if (allRoutes.length > 0) {
                    setFerryData(allRoutes);
                } else {
                    setFerryData([]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadIds();
    }, [destination, departure, selectedDate]);

    const groupedSections = useMemo(() => {
        // Filter logical changes
        const filtered = ferryData.filter(item => {
            // Filter Logical Changes:
            // Filter by Destination
            if (destination !== 'All') {
                if (item.destination !== destination) return false;
            }

            // Filter by Direct Only
            if (onlyDirect && !item.isDirect) return false;

            // Filter by Selected Departure (Port)
            // Handled by API mostly, but if we change filters locally on cached data:
            if (departure !== 'Unselected') {
                const port = item.departure;
                if (port !== departure) return false;
            }

            return true;
        });

        // Group by Port
        const groups: { [key: string]: FerryRoute[] } = {};

        filtered.forEach(item => {
            const port = item.departure;
            if (!groups[port]) groups[port] = [];
            groups[port].push(item);
        });

        // Sort keys and items
        const sortedKeys = Object.keys(groups).sort();

        return sortedKeys.map(port => {
            const routes = groups[port];
            routes.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

            return {
                title: `From ${port}`,
                data: [routes],
            };
        });
    }, [destination, onlyDirect, departure, ferryData]);

    const nextTripIds = useMemo(() => {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeVal = currentHours * 60 + currentMinutes;

        const ids = new Set<string>();

        // Iterate through all displayed routes to find the closest future trip FOR EACH SECTION
        groupedSections.forEach(section => {
            let closestId: string | null = null;
            let minDiff = Infinity;

            section.data[0].forEach(route => {
                const [h, m] = route.departureTime.split(':').map(Number);
                const routeTimeVal = h * 60 + m;

                if (routeTimeVal > currentTimeVal) {
                    const diff = routeTimeVal - currentTimeVal;
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestId = route.id;
                    }
                }
            });

            if (closestId) {
                ids.add(closestId);
            }
        });

        return ids;
    }, [groupedSections]);

    const renderGridItem = ({ item }: { item: FerryRoute[] }) => {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeVal = currentHours * 60 + currentMinutes;

        return (
            <View style={styles.gridContainer}>
                {item.map((route) => {
                    const isNext = nextTripIds.has(route.id);

                    // Calculate if trip is in the past
                    const [h, m] = route.departureTime.split(':').map(Number);
                    const routeTimeVal = h * 60 + m;
                    const isPast = routeTimeVal < currentTimeVal;

                    return (
                        <TouchableOpacity
                            key={route.id}
                            style={[
                                styles.timeChip,
                                isNext && { borderColor: '#2E7D32', borderWidth: 1.5, backgroundColor: '#F1FBF1' },
                                isPast && { opacity: 0.35 }
                            ]}
                            // Show modal on press
                            onPress={() => setSelectedTrip(route)}
                            activeOpacity={0.7}
                            disabled={isPast} // Optional: disable interaction for past trips
                        >
                            {isNext && (
                                <View style={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    backgroundColor: '#2E7D32',
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 10,
                                    zIndex: 1
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>NEXT</Text>
                                </View>
                            )}
                            <Text style={[styles.timeChipText, isNext && { color: '#1B5E20', fontWeight: '700' }]}>{route.departureTime}</Text>
                            {(() => {
                                const arr = getArrivalTime(route.departure, route.destination, route.departureTime);
                                return arr ? <Text style={styles.arrivalText}>→ {arr}</Text> : null;
                            })()}
                            <Text style={styles.providerText} numberOfLines={1}>{route.provider}</Text>
                        </TouchableOpacity>
                    );
                })
                }
            </View >
        )
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Ferry Schedule</Text>
            </View>

            {/* From / To / Date row */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {/* Departure Dropdown */}
                <View style={{ flex: 1, zIndex: 102 }}>
                    <Text style={styles.dropdownLabel}>From</Text>
                    <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowDepartureDropdown(!showDepartureDropdown)}
                    >
                        <Text style={styles.dropdownButtonText} numberOfLines={1}>{departure}</Text>
                        <Ionicons name={showDepartureDropdown ? "chevron-up" : "chevron-down"} size={14} color='#888' />
                    </TouchableOpacity>

                    {showDepartureDropdown && (
                        <View style={styles.dropdownList}>
                            {DEPARTURE_LOCATIONS.map(loc => (
                                <TouchableOpacity
                                    key={loc}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        setDeparture(loc);
                                        setShowDepartureDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownItemText, (departure === loc) && styles.selectedDropdownText]}>{loc}</Text>
                                    {(departure === loc) && <Ionicons name="checkmark" size={16} color="#000" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Destination Dropdown */}
                <View style={{ flex: 1, zIndex: 101 }}>
                    <Text style={styles.dropdownLabel}>To</Text>
                    <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowDestinationDropdown(!showDestinationDropdown)}
                    >
                        <Text style={styles.dropdownButtonText} numberOfLines={1}>{destination}</Text>
                        <Ionicons name={showDestinationDropdown ? "chevron-up" : "chevron-down"} size={14} color='#888' />
                    </TouchableOpacity>

                    {showDestinationDropdown && (
                        <View style={styles.dropdownList}>
                            {DESTINATION_LOCATIONS.map(loc => (
                                <TouchableOpacity
                                    key={loc}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        setDestination(loc);
                                        setShowDestinationDropdown(false);
                                    }}
                                >
                                    <Text style={[styles.dropdownItemText, (destination === loc) && styles.selectedDropdownText]}>{loc}</Text>
                                    {(destination === loc) && <Ionicons name="checkmark" size={16} color="#000" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Date picker button */}
                <View style={{ width: 70, zIndex: 100 }}>
                    <Text style={styles.dropdownLabel}>Date</Text>
                    <TouchableOpacity
                        style={[styles.dropdownButton, { paddingHorizontal: 8 }]}
                        onPress={() => setShowDatePicker(v => !v)}
                    >
                        <Ionicons name="calendar-outline" size={14} color="#555" />
                        <Text style={[styles.dropdownButtonText, { fontSize: 12 }]} numberOfLines={1}>
                            {selectedDate.toDateString() === new Date().toDateString()
                                ? 'Today'
                                : `${selectedDate.getDate()} ${selectedDate.toLocaleString('en', { month: 'short' })}`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Native Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={new Date()}
                    onChange={(_, date) => {
                        if (date) {
                            setSelectedDate(date);
                        }
                        if (Platform.OS !== 'ios') setShowDatePicker(false);
                    }}
                    style={{ marginBottom: 8, alignSelf: 'center' }}
                />
            )}

            {/* Direct filter */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, zIndex: 100 }}>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setOnlyDirect(!onlyDirect)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={onlyDirect ? "checkbox" : "square-outline"}
                        size={18}
                        color={onlyDirect ? "#000" : "#bbb"}
                    />
                    <Text style={[styles.checkboxText, onlyDirect && styles.checkboxTextActive]}>
                        Direct only
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Schedule List */}
            <SectionList
                sections={groupedSections}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderGridItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{title}</Text>
                    </View>
                )}
            />

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#000" />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                </View>
            )}

            {/* Trip Detail Modal */}
            <Modal
                visible={!!selectedTrip}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedTrip(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedTrip(null)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {selectedTrip && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>{selectedTrip.departure} → {selectedTrip.destination}</Text>
                                        <Text style={styles.modalSubtitle}>{selectedTrip.departureTime} departure</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedTrip(null)} style={styles.closeButton}>
                                        <Ionicons name="close" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalBody}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="boat-outline" size={18} color="#2B7A8E" />
                                        <Text style={styles.infoText}>{selectedTrip.type} ({selectedTrip.isDirect ? 'Direct' : 'Indirect'})</Text>
                                    </View>

                                    <View style={styles.routeContainer}>
                                        <Text style={styles.routeLabel}>Route Stops:</Text>
                                        {/* Visualization of the route */}
                                        <View style={styles.routeWrapper}>
                                            {(() => {
                                                const stops = [
                                                    selectedTrip.departure,
                                                    ...(selectedTrip.via ?? []),
                                                    selectedTrip.destination,
                                                ];
                                                const dotColors = ['#2B7A8E', ...((selectedTrip.via ?? []).map(() => '#FFA000')), '#D32F2F'];

                                                // Build cumulative times
                                                const times: string[] = [selectedTrip.departureTime];
                                                for (let i = 1; i < stops.length; i++) {
                                                    const prev = stops[i - 1];
                                                    const curr = stops[i];
                                                    const mins = TRANSIT_MINUTES[prev]?.[curr];
                                                    times.push(mins ? addMinutes(times[i - 1], mins) : '');
                                                }

                                                return stops.map((stop, i) => (
                                                    <View key={i} style={styles.routeNode}>
                                                        {i > 0 && <View style={styles.verticalLine} />}
                                                        <View style={[styles.dot, { backgroundColor: dotColors[i] }]} />
                                                        <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text style={styles.nodeText}>{stop}</Text>
                                                            {times[i] ? (
                                                                <Text style={styles.nodeTime}>{times[i]}</Text>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                ));
                                            })()}
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 60,
        backgroundColor: '#fff',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    disclaimerText: {
        fontSize: 12,
        color: '#aaa',
        marginBottom: 16,
        textAlign: 'center',
    },
    tabsWrapper: {
        paddingRight: 16,
        marginBottom: 16,
    },
    tab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
    },
    activeTab: {
        backgroundColor: '#000',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
    },
    activeTabText: {
        color: '#fff',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 2,
        marginBottom: 16,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeToggle: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 1,
        elevation: 1,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#aaa',
    },
    activeToggleText: {
        color: '#000',
        fontWeight: '700',
    },
    listContent: {
        paddingBottom: 20,
    },
    sectionHeader: {
        paddingVertical: 10,
        backgroundColor: '#fff',
        marginTop: 8,
        marginBottom: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: '#e8e8e8',
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeChip: {
        backgroundColor: '#f8f8f8',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 0.5,
        borderColor: '#e8e8e8',
        width: '48%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeChipText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 2,
    },
    arrivalText: {
        color: '#aaa',
        fontSize: 11,
        marginBottom: 2,
    },
    destinationText: {
        color: '#888',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#bbb',
        fontSize: 14,
    },
    dropdownLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#aaa',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderWidth: 0.5,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dropdownButtonText: {
        fontSize: 15,
        color: '#000',
        fontWeight: '500',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 0.5,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        paddingVertical: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f2f2f2',
    },
    dropdownItemText: {
        fontSize: 15,
        color: '#555',
    },
    selectedDropdownText: {
        color: '#000',
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'center',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkboxText: {
        fontSize: 13,
        color: '#aaa',
        fontWeight: '500',
    },
    checkboxTextActive: {
        color: '#000',
        fontWeight: '600',
    },
    providerText: {
        fontSize: 10,
        color: '#888',
        fontWeight: '500',
        marginTop: 1,
    },
    signatureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    signatureText: {
        fontSize: 10,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        fontSize: 16,
        color: '#444',
    },
    routeContainer: {
        marginTop: 8,
    },
    routeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    routeWrapper: {
        paddingLeft: 8,
    },
    routeNode: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 32, // Fixed height for alignment
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
        zIndex: 2,
    },
    verticalLine: {
        position: 'absolute',
        left: 4, // Center of dot (10px width / 2 - 1px line width)
        top: -22, // Extend up to previous node
        bottom: 5,
        width: 2,
        backgroundColor: '#ddd',
        zIndex: 1,
    },
    nodeText: {
        fontSize: 15,
        color: '#444',
    },
    nodeTime: {
        fontSize: 13,
        color: '#2B7A8E',
        fontWeight: '600',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingContainer: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#2B7A8E',
    },
});

