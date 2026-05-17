import { triggerNetworkError } from "@/context/NetworkContext";
import { API_BASE_URL as BASE } from "./config";
import { getToken } from "@/utils/tokenStorage";
export { triggerNetworkError };

export interface DepartureDto {
  from: string;
  to: string;
  provider: string; // "Vapur", "Motor", etc.
  via?: string[];
  time: string; // "HH:mm"
  minutesUntil: number;
}

const API_BASE_URL = `${BASE}/api/v1/travel/ferries`;

export const fetchDepartures = async (
  from: string,
  to: string,
  date?: string,
): Promise<DepartureDto[]> => {
  try {
    const queryParams = new URLSearchParams({ from, to });
    if (date) {
      queryParams.append("date", date);
    }

    // Include next day until 3 AM by default
    queryParams.append("includeNextDayUntil", "03:00");

    console.log(
      `Fetching: ${API_BASE_URL}/departures?${queryParams.toString()}`,
    );
    const response = await fetch(
      `${API_BASE_URL}/departures?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch departures:", error);
    triggerNetworkError();
    return [];
  }
};

export interface BusDepartureDto {
  routeCode: string;
  routeName: string;
  provider: string;
  island: string;
  stop: string;
  time: string;
  minutesUntil: number;
}

const BUS_API_BASE_URL = `${BASE}/api/v1/travel/buses`;

export const fetchBusDepartures = async (
  route: string,
  stop?: string,
  date?: string,
): Promise<BusDepartureDto[]> => {
  try {
    const queryParams = new URLSearchParams({ route });
    if (stop) queryParams.append("stop", stop);
    if (date) queryParams.append("date", date);

    console.log(
      `Fetching: ${BUS_API_BASE_URL}/departures?${queryParams.toString()}`,
    );
    const response = await fetch(
      `${BUS_API_BASE_URL}/departures?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch bus departures:", error);
    triggerNetworkError();
    return [];
  }
};

export interface AppActivityDto {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  organizerName: string;
  organizerContact?: string;
  eventPlace?: string;
  instagramLink?: string;
  imageUrl?: string;
}

const ACTIVITIES_API_BASE_URL = `${BASE}/api/v1/activities`;

export const fetchActivities = async (): Promise<AppActivityDto[]> => {
  try {
    const response = await fetch(ACTIVITIES_API_BASE_URL);
    if (!response.ok) throw new Error("Activities fetch error");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    triggerNetworkError();
    return [];
  }
};

export type CreateActivityRequest = Omit<AppActivityDto, "id">;

export const createActivity = async (
  request: CreateActivityRequest,
): Promise<AppActivityDto | null> => {
  try {
    // We should ideally use fetchWithAuth here if activities require authentication
    // but the file doesn't import it. We'll use a plain fetch for now.
    const token = getToken();
    if (!token) {
      console.warn("No JWT token found. Aborting activity creation.");
      return null;
    }
    const response = await fetch(ACTIVITIES_API_BASE_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Activity creation error");
    return await response.json();
  } catch (error) {
    console.error("Failed to create activity:", error);
    triggerNetworkError();
    return null;
  }
};
