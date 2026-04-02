const API_BASE_URL = "http://localhost:8080";

export type LivePositionResponse = {
  tripId: string;
  chosen?: {
    mmsi?: string;
    name?: string;
    lat: number;
    lon: number;
    speedKnots?: number;
    courseDeg?: number;
    positionTimeUtc?: string;
    staleSeconds?: number;
  };
  confidence?: number;
  method?: string;
  candidateCount?: number;
};

export const fetchTripLivePosition = async (
  tripId: string,
): Promise<LivePositionResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/trips/${encodeURIComponent(tripId)}/live-position`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch live position: ${response.status}`);
  }

  return response.json();
};
