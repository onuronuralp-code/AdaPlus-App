import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    isDirect: boolean;
    via?: string[];
}

const ISLANDS = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];
const MAINLAND = ['Kabataş', 'Bostancı', 'Kadıköy', 'Beşiktaş'];
const ALL_LOCATIONS = [...ISLANDS, ...MAINLAND];
const DEPARTURE_LOCATIONS = ['All', ...ALL_LOCATIONS];
const DESTINATION_LOCATIONS = ['Unselected', ...ALL_LOCATIONS];

// Ferry data is fetched from the API


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
    const [departure, setDeparture] = useState('All');
    const [showDepartureDropdown, setShowDepartureDropdown] = useState(false);

    const [onlyDirect, setOnlyDirect] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<FerryRoute | null>(null);
    const isLight = theme === 'light';

    // Reset to default on focus
    useFocusEffect(
        useCallback(() => {
            setDestination('Unselected');
            setDeparture('All');
            // Optional: setOnlyDirect(false);
            return () => {
                // Optional cleanup
            };
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
                const validDepartures = departure === 'All'
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

                // Use Promise.all for parallel fetching
                const dataPromises = pairs.map(pair => fetchDepartures(pair.from, pair.to));
                const results = await Promise.all(dataPromises);

                results.forEach((data, index) => {
                    // map logic...
                    const mapped = data.map(dto => ({
                        id: `${dto.from}_${dto.to}_${dto.time}_${Math.random().toString(36).substr(2, 9)}`,
                        departure: dto.from,
                        destination: dto.to,
                        departureTime: dto.time,
                        arrivalTime: "",
                        type: (dto.provider === 'SEHIR_HATLARI' ? 'Vapur' : 'Motor') as 'Vapur' | 'Motor',
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
    }, [destination, departure]);

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
            if (departure !== 'All') {
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
                                isNext && { borderColor: '#2E7D32', borderWidth: 2, backgroundColor: '#E8F5E9' },
                                isPast && { opacity: 0.4 }
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
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>NEXT</Text>
                                </View>
                            )}
                            <Text style={[styles.timeChipText, isNext && { color: '#1B5E20' }]}>{route.departureTime}</Text>
                            <View style={styles.signatureContainer}>
                                <Ionicons
                                    name={route.isDirect ? "checkmark-circle-outline" : "git-network-outline"}
                                    size={10}
                                    color={route.isDirect ? "#2E7D32" : "#E65100"}
                                />
                                <Text style={[
                                    styles.signatureText,
                                    { color: route.isDirect ? "#2E7D32" : "#E65100" }
                                ]}>
                                    {route.isDirect ? "Direct" : "Indirect"}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        )
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <Text style={styles.headerTitle}>Ferry Schedule</Text>
            <Text style={styles.disclaimerText}>
                <Ionicons name="information-circle-outline" size={14} color="#666" /> Tap on trip hours to see full details
            </Text>

            {/* Departure Dropdown (Moved & Styled Same as Destination) */}
            <View style={{ marginBottom: 12, zIndex: 102 }}>
                <Text style={{ marginBottom: 4, color: '#2B7A8E', fontWeight: '500' }}>Departure (From):</Text>
                <TouchableOpacity
                    style={[
                        styles.dropdownButton,
                        { borderColor: '#2B7A8E', backgroundColor: '#E0F7FA' }
                    ]}
                    onPress={() => setShowDepartureDropdown(!showDepartureDropdown)}
                >
                    <Text style={[styles.dropdownButtonText, { color: '#006064' }]}>
                        {departure}
                    </Text>
                    <Ionicons name={showDepartureDropdown ? "chevron-up" : "chevron-down"} size={16} color='#006064' />
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
                                {(departure === loc) && <Ionicons name="checkmark" size={16} color="#2B7A8E" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Destination Dropdown */}
            <View style={{ marginBottom: 16, zIndex: 101 }}>
                <Text style={{ marginBottom: 4, color: '#2B7A8E', fontWeight: '500' }}>Destination (To):</Text>
                <TouchableOpacity
                    style={[
                        styles.dropdownButton,
                        { borderColor: '#2B7A8E', backgroundColor: '#E0F7FA' }
                    ]}
                    onPress={() => setShowDestinationDropdown(!showDestinationDropdown)}
                >
                    <Text style={[styles.dropdownButtonText, { color: '#006064' }]}>
                        {destination}
                    </Text>
                    <Ionicons name={showDestinationDropdown ? "chevron-up" : "chevron-down"} size={16} color='#006064' />
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
                                {(destination === loc) && <Ionicons name="checkmark" size={16} color="#2B7A8E" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Filters Row: Checkbox Only */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, zIndex: 100 }}>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setOnlyDirect(!onlyDirect)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={onlyDirect ? "checkbox" : "square-outline"}
                        size={20}
                        color={onlyDirect ? "#2B7A8E" : "#666"}
                    />
                    <Text style={[styles.checkboxText, onlyDirect && styles.checkboxTextActive]}>
                        Direct items only
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Schedule List (Grid) */}
            <SectionList
                sections={groupedSections}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderGridItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{title}</Text>
                        <Ionicons name="location-outline" size={16} color={isLight ? '#666' : '#aaa'} />
                    </View>
                )}
            />

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2B7A8E" />
                        <Text style={styles.loadingText}>Finding Ferries...</Text>
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
                                            <View style={styles.routeNode}>
                                                <View style={[styles.dot, { backgroundColor: '#2B7A8E' }]} />
                                                <Text style={styles.nodeText}>{selectedTrip.departure}</Text>
                                            </View>

                                            {/* Via Stops */}
                                            {selectedTrip.via && selectedTrip.via.map((stop, index) => (
                                                <View key={index} style={styles.routeNode}>
                                                    <View style={styles.verticalLine} />
                                                    <View style={[styles.dot, { backgroundColor: '#FFA000' }]} />
                                                    <Text style={styles.nodeText}>{stop}</Text>
                                                </View>
                                            ))}

                                            <View style={styles.routeNode}>
                                                <View style={styles.verticalLine} />
                                                <View style={[styles.dot, { backgroundColor: '#D32F2F' }]} />
                                                <Text style={styles.nodeText}>{selectedTrip.destination}</Text>
                                            </View>
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
        paddingHorizontal: 16,
        marginTop: 60,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#2B7A8E',
        textAlign: 'center',
    },
    disclaimerText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 16,
        fontStyle: 'italic',
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
        backgroundColor: '#2B7A8E',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#fff',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
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
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
    },
    activeToggleText: {
        color: '#2B7A8E',
        fontWeight: '700',
    },
    listContent: {
        paddingBottom: 20,
    },
    sectionHeader: {
        paddingVertical: 8,
        backgroundColor: 'transparent',
        marginTop: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2B7A8E',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeChip: {
        backgroundColor: '#E0F7FA',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#B2EBF2',
        width: '48%', // Wider for more content
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeChipText: {
        color: '#006064',
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 2,
    },
    arrivalText: {
        color: '#555',
        fontSize: 12,
        marginBottom: 2,
    },
    destinationText: {
        color: '#2B7A8E',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#666',
        fontStyle: 'italic',
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    dropdownButtonText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginTop: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        paddingVertical: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#666',
    },
    selectedDropdownText: {
        color: '#2B7A8E',
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
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    checkboxTextActive: {
        color: '#2B7A8E',
        fontWeight: '600',
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

