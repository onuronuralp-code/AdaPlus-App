import * as Location from 'expo-location';
import React from 'react';
import { Dimensions, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { IconSymbol } from './ui/icon-symbol';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface Review {
    id: string;
    user: string;
    rating: number;
    comment: string;
    date: string;
}

interface PlaceDetailModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    description: string;
    coordinate: {
        latitude: number;
        longitude: number;
    };
    reviews?: Review[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function PlaceDetailModal({ visible, onClose, title, description, coordinate, reviews = [] }: PlaceDetailModalProps) {
    const [userLocation, setUserLocation] = React.useState<Location.LocationObject | null>(null);
    const [routeInfo, setRouteInfo] = React.useState<{ distance: number, duration: number } | null>(null);
    const [showDirections, setShowDirections] = React.useState(false);
    const mapRef = React.useRef<MapView>(null);

    React.useEffect(() => {
        if (visible) {
            (async () => {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const location = await Location.getCurrentPositionAsync({});
                setUserLocation(location);
            })();
        } else {
            setShowDirections(false);
            setRouteInfo(null);
        }
    }, [visible]);

    const handleGetDirections = () => {
        setShowDirections(true);
        if (userLocation && mapRef.current) {
            mapRef.current.fitToCoordinates([
                { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude },
                coordinate
            ], {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    };
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerIndicator} />
                        <View style={styles.headerRow}>
                            <Text style={styles.title} numberOfLines={1}>{title}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <IconSymbol name="xmark" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Map Section */}
                        <View style={styles.mapContainer}>
                            <MapView
                                ref={mapRef}
                                style={styles.map}
                                provider={PROVIDER_GOOGLE}
                                initialRegion={{
                                    ...coordinate,
                                    latitudeDelta: 0.005,
                                    longitudeDelta: 0.005,
                                }}
                                scrollEnabled={true}
                                zoomEnabled={true}
                                pitchEnabled={true}
                                rotateEnabled={true}
                                showsUserLocation={true}
                                showsMyLocationButton={true}
                            >
                                <Marker coordinate={coordinate}>
                                    <View style={styles.markerContainer}>
                                        <View style={styles.markerDot} />
                                    </View>
                                </Marker>

                                {showDirections && userLocation && GOOGLE_MAPS_API_KEY && (
                                    <MapViewDirections
                                        origin={{
                                            latitude: userLocation.coords.latitude,
                                            longitude: userLocation.coords.longitude
                                        }}
                                        destination={coordinate}
                                        apikey={GOOGLE_MAPS_API_KEY}
                                        strokeWidth={4}
                                        strokeColor="#3B82F6"
                                        mode="WALKING"
                                        onReady={(result) => {
                                            setRouteInfo({
                                                distance: result.distance,
                                                duration: result.duration
                                            });
                                        }}
                                    />
                                )}
                            </MapView>
                            <View style={styles.mapOverlay}>
                                {routeInfo && (
                                    <View style={styles.etaBadge}>
                                        <IconSymbol name="figure.walk" size={14} color="#fff" />
                                        <Text style={styles.etaText}>
                                            {Math.round(routeInfo.duration)} min ({routeInfo.distance.toFixed(1)} km)
                                        </Text>
                                    </View>
                                )}
                                {!showDirections ? (
                                    <TouchableOpacity
                                        style={styles.expandMapButton}
                                        onPress={handleGetDirections}
                                    >
                                        <IconSymbol name="arrow.triangle.turn.up.right.circle.fill" size={16} color="#3B82F6" />
                                        <Text style={styles.expandMapText}>Show Directions</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.expandMapButton}
                                        onPress={() => {
                                            const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
                                            const latLng = `${coordinate.latitude},${coordinate.longitude}`;
                                            const url = Platform.select({
                                                ios: `${scheme}${title}@${latLng}`,
                                                android: `${scheme}${latLng}(${title})`
                                            });
                                            if (url) Linking.openURL(url);
                                        }}
                                    >
                                        <IconSymbol name="map.fill" size={16} color="#3B82F6" />
                                        <Text style={styles.expandMapText}>Open in Native Maps</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About</Text>
                            <Text style={styles.description}>{description}</Text>
                        </View>

                        {/* Reviews Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>User Reviews</Text>
                                <View style={styles.ratingBadge}>
                                    <IconSymbol name="star.fill" size={14} color="#EAB308" />
                                    <Text style={styles.ratingText}>4.8</Text>
                                </View>
                            </View>

                            {reviews.length > 0 ? (
                                reviews.map((review) => (
                                    <View key={review.id} style={styles.reviewCard}>
                                        <View style={styles.reviewHeader}>
                                            <Text style={styles.reviewUser}>{review.user}</Text>
                                            <Text style={styles.reviewDate}>{review.date}</Text>
                                        </View>
                                        <View style={styles.starRow}>
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <IconSymbol
                                                    key={s}
                                                    name="star.fill"
                                                    size={12}
                                                    color={s <= review.rating ? "#EAB308" : "#CBD5E1"}
                                                />
                                            ))}
                                        </View>
                                        <Text style={styles.reviewComment}>{review.comment}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noReviews}>No reviews yet for this location.</Text>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SCREEN_HEIGHT * 0.85,
        width: '100%',
    },
    header: {
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        flex: 1,
        marginRight: 16,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    mapContainer: {
        height: 200,
        width: '100%',
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    expandMapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    expandMapText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3B82F6',
        marginLeft: 6,
    },
    markerContainer: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3B82F6',
        borderWidth: 2,
        borderColor: '#fff',
    },
    stopButton: {
        padding: 4,
    },
    etaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 8,
        alignSelf: 'flex-end',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    etaText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    section: {
        padding: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 24,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF9C3',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#854D0E',
        marginLeft: 4,
    },
    reviewCard: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    reviewUser: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    reviewDate: {
        fontSize: 12,
        color: '#94A3B8',
    },
    starRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    reviewComment: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    noReviews: {
        fontSize: 14,
        color: '#94A3B8',
        fontStyle: 'italic',
    }
});
