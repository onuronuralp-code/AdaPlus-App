import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

import { fetchIslandLandmarks, Place } from '@/services/GooglePlacesService';

export default function GuidedTourScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [tourPoints, setTourPoints] = useState<Place[]>([]);
    const [activePoint, setActivePoint] = useState<string | null>(null);
    const [isNarrating, setIsNarrating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const points = await fetchIslandLandmarks();
                setTourPoints(points);
            } catch (error) {
                console.error('Failed to load tour points:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        async function startTracking() {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    distanceInterval: 10,
                },
                (location) => {
                    setUserLocation(location);
                    checkGeofence(location.coords);
                }
            );
        }

        startTracking();

        return () => {
            subscription?.remove();
            Speech.stop();
        };
    }, []);

    const checkGeofence = (coords: { latitude: number, longitude: number }) => {
        tourPoints.forEach(point => {
            const distance = getDistance(
                coords.latitude,
                coords.longitude,
                point.coordinate.latitude,
                point.coordinate.longitude
            );

            // Trigger if within 30 meters
            if (distance < 0.03 && activePoint !== point.id) {
                handleTriggerPoint(point);
            }
        });
    };

    // Haversine distance in km
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleTriggerPoint = (point: Place) => {
        setActivePoint(point.id);
        setIsNarrating(true);
        Speech.speak(point.description, {
            onDone: () => setIsNarrating(false),
            onError: () => setIsNarrating(false),
        });
    };

    const stopAudio = () => {
        Speech.stop();
        setIsNarrating(false);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                showsUserLocation
                showsMyLocationButton={false}
                initialRegion={{
                    latitude: 40.9085,
                    longitude: 29.0515,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                }}
            >
                <Polyline
                    coordinates={tourPoints.map(p => p.coordinate)}
                    strokeColor="#3B82F6"
                    strokeWidth={4}
                    lineDashPattern={[5, 10]}
                />

                {tourPoints.map((point) => (
                    <Marker
                        key={point.id}
                        coordinate={point.coordinate}
                        title={point.title}
                    >
                        <View style={[
                            styles.markerDot,
                            activePoint === point.id && styles.activeMarkerDot
                        ]} />
                    </Marker>
                ))}
            </MapView>

            {isLoading && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                    <Text style={styles.loadingText}>Loading landmarks...</Text>
                </View>
            )}

            {/* Back Button */}
            <TouchableOpacity
                style={[styles.backButton, { top: insets.top + 10 }]}
                onPress={() => router.back()}
            >
                <IconSymbol name="chevron.left" size={24} color="#000" />
            </TouchableOpacity>

            {/* Audio Feedback Overlay */}
            {isNarrating && (
                <View style={[styles.audioContainer, { bottom: insets.bottom + 100 }]}>
                    <View style={styles.audioContent}>
                        <IconSymbol name="speaker.wave.2.fill" size={24} color="#3B82F6" />
                        <Text style={styles.audioText} numberOfLines={2}>
                            Narrating: {tourPoints.find(p => p.id === activePoint)?.title}
                        </Text>
                        <TouchableOpacity onPress={stopAudio} style={styles.stopButton}>
                            <IconSymbol name="stop.fill" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Legend / Instructions */}
            <View style={[styles.infoCard, { bottom: insets.bottom + 20 }]}>
                <Text style={styles.infoTitle}>Island Audio Tour Active</Text>
                <Text style={styles.infoSubtitle}>
                    Walk along the dashed line. Audio will play automatically as you reach each landmark.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        zIndex: 10,
    },
    markerDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: '#3B82F6',
    },
    activeMarkerDot: {
        backgroundColor: '#3B82F6',
        transform: [{ scale: 1.5 }],
    },
    infoCard: {
        position: 'absolute',
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 20,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 4,
    },
    infoSubtitle: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    audioContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    audioContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    audioText: {
        marginHorizontal: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#3B82F6',
        maxWidth: width * 0.5,
    },
    stopButton: {
        padding: 4,
    },
    loadingOverlay: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        color: '#3B82F6',
    }
});
