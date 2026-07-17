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
import { IconSymbol } from "@/components/ui/icon-symbol";

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
  Maltepe: { latitude: 40.9168, longitude: 29.1314 },
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
      if (!tripId || !/^[a-zA-Z0-9_\-]{1,128}$/.test(tripId)) {
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
          pinColor="#EA580C"
        />
        <Marker
          coordinate={toCoord}
          title={to}
          description="Arrival"
          pinColor="#0D1B2A"
        />

        <Polyline
          coordinates={[fromCoord, toCoord]}
          strokeWidth={4}
          strokeColor="#EA580C"
          lineDashPattern={[5, 5]}
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
              <ActivityIndicator size="small" color="#EA580C" />
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
            <IconSymbol name="arrow.clockwise" size={18} color="#EA580C" />
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
          <IconSymbol name="scope" size={18} color="#EA580C" />
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
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0D1B2A",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  routeSubtitle: {
    fontSize: 14,
    color: "#778DA9",
    fontWeight: "600",
    marginBottom: 4,
  },
  providerText: {
    fontSize: 13,
    color: "#778DA9",
    marginBottom: 12,
  },
  updatedText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#EA580C",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  inlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  errorInlineText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "700",
  },
  bottomOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 32,
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#EA580C",
  },
  primaryButton: {
    marginTop: 20,
    height: 54,
    paddingHorizontal: 24,
    borderRadius: 18,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0D1B2A",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#778DA9",
    textAlign: "center",
    lineHeight: 20,
  },
  ferryMarker: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
