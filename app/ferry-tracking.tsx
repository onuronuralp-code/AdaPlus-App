import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import {
    LivePositionResponse,
    fetchTripLivePosition,
} from "../services/trackingApi";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const STOP_COORDINATES: Record<string, Coordinates> = {
  Kınalıada: { latitude: 40.9109, longitude: 29.0542 },
  Burgazada: { latitude: 40.8814, longitude: 29.0704 },
  Heybeliada: { latitude: 40.8763, longitude: 29.0938 },
  Büyükada: { latitude: 40.8747, longitude: 29.1294 },
  Bostancı: { latitude: 40.9528, longitude: 29.0946 },
  Kadıköy: { latitude: 40.9917, longitude: 29.0246 },
  Kabataş: { latitude: 41.0317, longitude: 28.9901 },
  Beşiktaş: { latitude: 41.0439, longitude: 29.0053 },
};

const getStopCoordinates = (name?: string): Coordinates | null => {
  if (!name) return null;
  return STOP_COORDINATES[name] ?? null;
};

const getInitialRegion = (
  fromCoord: Coordinates,
  toCoord: Coordinates,
): Region => {
  const latitude = (fromCoord.latitude + toCoord.latitude) / 2;
  const longitude = (fromCoord.longitude + toCoord.longitude) / 2;

  const latitudeDelta = Math.max(
    Math.abs(fromCoord.latitude - toCoord.latitude) * 2.2,
    0.04,
  );
  const longitudeDelta = Math.max(
    Math.abs(fromCoord.longitude - toCoord.longitude) * 2.2,
    0.04,
  );

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
};

const formatUpdatedText = (staleSeconds?: number) => {
  if (staleSeconds == null) return "Last updated just now";

  if (staleSeconds < 60) {
    return `Last updated ${staleSeconds} sec ago`;
  }

  const mins = Math.floor(staleSeconds / 60);
  return `Last updated ${mins} min ago`;
};

const interpolatePoint = (
  start: Coordinates,
  end: Coordinates,
  ratio: number,
): Coordinates => ({
  latitude: start.latitude + (end.latitude - start.latitude) * ratio,
  longitude: start.longitude + (end.longitude - start.longitude) * ratio,
});

export default function FerryTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId?: string;
    from?: string;
    to?: string;
    departureTime?: string;
    arrivalTime?: string;
    provider?: string;
    type?: string;
  }>();

  const tripId = params.tripId ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";
  const departureTime = params.departureTime ?? "";
  const arrivalTime = params.arrivalTime ?? "";
  const provider = params.provider ?? "";
  const type = params.type ?? "";

  const fromCoord = useMemo(() => getStopCoordinates(from), [from]);
  const toCoord = useMemo(() => getStopCoordinates(to), [to]);

  const [liveData, setLiveData] = useState<LivePositionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ferryCoordinate = useMemo<Coordinates | null>(() => {
    if (!liveData?.chosen) return null;
    return {
      latitude: liveData.chosen.lat,
      longitude: liveData.chosen.lon,
    };
  }, [liveData]);

  const initialRegion = useMemo(() => {
    if (!fromCoord || !toCoord) return null;
    return getInitialRegion(fromCoord, toCoord);
  }, [fromCoord, toCoord]);

  const loadLivePosition = useCallback(
    async (isInitial = false) => {
      if (!tripId) {
        setError("Trip information is missing.");
        setLoading(false);
        return;
      }

      if (isInitial) {
        setLoading(true);
      } else {
        setPolling(true);
      }

      try {
        setError(null);

        const result = await fetchTripLivePosition(tripId);
        setLiveData(result);

        if (!result.chosen) {
          setError("Live location is currently unavailable.");
        }
      } catch (e) {
        setError("Unable to fetch live ferry location right now.");
      } finally {
        setLoading(false);
        setPolling(false);
      }
    },
    [tripId],
  );

  useEffect(() => {
    loadLivePosition(true);
  }, [loadLivePosition]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadLivePosition(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadLivePosition]);

  if (!fromCoord || !toCoord || !initialRegion) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorTitle}>Map data unavailable</Text>
        <Text style={styles.errorText}>
          We could not find coordinates for this route yet.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Live Tracking",
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 17,
          },
        }}
      />
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsCompass
        showsScale
      >
        <Marker
          coordinate={fromCoord}
          title={from}
          description="Departure"
          pinColor="#2B7A8E"
        />
        <Marker
          coordinate={toCoord}
          title={to}
          description="Arrival"
          pinColor="#D32F2F"
        />

        <Polyline
          coordinates={[fromCoord, toCoord]}
          strokeWidth={3}
          strokeColor="#4FA3B1"
        />

        {ferryCoordinate && (
          <Marker
            coordinate={ferryCoordinate}
            title={liveData?.chosen?.name ?? "Ferry"}
            description={`${provider} • Live position`}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={liveData?.chosen?.courseDeg ?? 0}
          >
            <View style={styles.ferryMarker}>
              <Ionicons name="boat" size={18} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.topOverlay}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#222" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.routeTitle}>
            {from} → {to}
          </Text>
          <Text style={styles.routeSubtitle}>
            {departureTime} departure
            {arrivalTime ? ` • ${arrivalTime} arrival` : ""}
          </Text>
          <Text style={styles.providerText}>
            {provider}
            {type ? ` • ${type}` : ""}
          </Text>

          {loading ? (
            <View style={styles.inlineStatusRow}>
              <ActivityIndicator size="small" color="#0F6C7B" />
              <Text style={styles.statusText}>Loading live position...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorInlineText}>{error}</Text>
          ) : (
            <>
              <Text style={styles.updatedText}>
                {formatUpdatedText(liveData?.chosen?.staleSeconds)}
              </Text>
              {liveData?.confidence != null && (
                <Text style={styles.metaText}>
                  Confidence: {Math.round(liveData.confidence * 100)}%
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.bottomOverlay}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            loadLivePosition(false);
          }}
          disabled={polling}
        >
          {polling ? (
            <ActivityIndicator size="small" color="#0F6C7B" />
          ) : (
            <Ionicons name="refresh" size={18} color="#0F6C7B" />
          )}
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Alert.alert(
              "Coming soon",
              "Center-on-ferry and route fitting can be added next.",
            );
          }}
        >
          <Ionicons name="locate-outline" size={18} color="#0F6C7B" />
          <Text style={styles.secondaryButtonText}>Center</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  routeTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1E1E1E",
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: "#5D6A6F",
    marginBottom: 4,
  },
  providerText: {
    fontSize: 13,
    color: "#6F7C81",
    marginBottom: 10,
  },
  updatedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F6C7B",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7A80",
  },
  inlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    color: "#4F5D63",
    fontWeight: "500",
  },
  errorInlineText: {
    fontSize: 13,
    color: "#B00020",
    fontWeight: "600",
  },
  bottomOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "#DDE9EC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F6C7B",
  },
  primaryButton: {
    marginTop: 20,
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#0F6C7B",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#66757A",
    textAlign: "center",
  },
  ferryMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0F6C7B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
