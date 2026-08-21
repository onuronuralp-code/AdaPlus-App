import { triggerNetworkError } from "@/context/NetworkContext";
import { API_BASE_URL as BASE, fetchWithTimeout } from "./config";
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

export interface ServiceBannerDto {
  id?: string;
  tag?: string;
  header?: string;
  subtitle?: string;
  imageUrl?: string | null;
  actionLabel?: string;
  actionUrl?: string;
  active?: boolean;
}

export const fetchServiceBanner = async (): Promise<ServiceBannerDto | null> => {
  try {
    const response = await fetchWithTimeout(`${BASE}/api/v1/services/banner`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log("Service banner API endpoint not active yet:", error);
  }
  return null;
};

import { ListingDto, SaveListingRequest } from "./listingApi";
export type AppListingDto = ListingDto;
export type CreateListingRequest = SaveListingRequest;

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
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/departures?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Failed to fetch departures:", error);
    if (!(error instanceof Error && error.message.startsWith("API Error:"))) {
      triggerNetworkError();
    }
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
    const response = await fetchWithTimeout(
      `${BUS_API_BASE_URL}/departures?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.log("Failed to fetch bus departures:", error);
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
  imageUrls?: string[];
  status?: string;
  submittedById?: string;
  rsvpCount?: number;
  userHasRsvp?: boolean;
  island?: string;
}

export interface RsvpResponse {
  going: boolean;
  rsvpCount: number;
}

const ACTIVITIES_API_BASE_URL = `${BASE}/api/v1/activities`;


const LISTINGS_API_BASE_URL = `${BASE}/api/v1/listings`;

export const fetchListings = async (): Promise<AppListingDto[]> => {
  try {
    const response = await fetchWithTimeout(LISTINGS_API_BASE_URL);
    if (!response.ok) throw new Error("Listings fetch error");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log("Failed to fetch listings:", error);
    triggerNetworkError();
    return [];
  }
};

export const getListing = async (id: string): Promise<AppListingDto | null> => {
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetchWithTimeout(`${LISTINGS_API_BASE_URL}/${id}`, { headers });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.log('Failed to fetch listing:', error);
    triggerNetworkError();
    return null;
  }
};

export const MOCK_ACTIVITIES: AppActivityDto[] = [];

export const fetchActivities = async (): Promise<AppActivityDto[]> => {
  try {
    const response = await fetchWithTimeout(ACTIVITIES_API_BASE_URL);
    if (!response.ok) throw new Error("Activities fetch error");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log("Failed to fetch activities:", error);
    return [];
  }
};

export const fetchUpcomingActivities = async (limit: number = 5): Promise<AppActivityDto[]> => {
  try {
    const response = await fetchWithTimeout(`${ACTIVITIES_API_BASE_URL}/upcoming?limit=${limit}`);
    if (!response.ok) throw new Error("Upcoming activities fetch error");
    const data = await response.json();
    return Array.isArray(data) ? data.slice(0, limit) : [];
  } catch (error) {
    console.log("Failed to fetch upcoming activities:", error);
    return [];
  }
};

export const fetchMyActivities = async (): Promise<AppActivityDto[]> => {
  try {
    const token = getToken();
    if (!token) return [];
    const response = await fetchWithTimeout(`${BASE}/api/v1/users/me/activities`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.filter(Boolean) : [];
  } catch (error) {
    console.log('Failed to fetch my activities:', error);
    return [];
  }
};


export type CreateActivityRequest = Omit<AppActivityDto, "id" | "status">;

export const getActivity = async (id: string): Promise<AppActivityDto | null> => {
  const localMock = MOCK_ACTIVITIES.find(a => a.id === id);
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetchWithTimeout(`${ACTIVITIES_API_BASE_URL}/${id}`, { headers });
    if (!response.ok) {
      if (localMock) return localMock;
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.log('Failed to fetch activity, fallback to mock if available:', error);
    if (localMock) return localMock;
    return null;
  }
};

export const toggleActivityRsvp = async (id: string): Promise<RsvpResponse | null> => {
  try {
    const token = getToken();
    if (!token) return null;
    const response = await fetchWithTimeout(`${ACTIVITIES_API_BASE_URL}/${id}/rsvp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.log('Failed to toggle RSVP:', error);
    return null;
  }
};

export const fetchMyListings = async (): Promise<AppListingDto[]> => {
  try {
    const token = getToken();
    if (!token) return [];
    const response = await fetchWithTimeout(`${LISTINGS_API_BASE_URL}/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("My listings fetch error");
    return await response.json();
  } catch (error) {
    console.log("Failed to fetch my listings:", error);
    return [];
  }
};

export const updateListing = async (id: string, request: CreateListingRequest): Promise<AppListingDto | null> => {
  try {
    const token = getToken();
    if (!token) return null;
    const response = await fetchWithTimeout(`${LISTINGS_API_BASE_URL}/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Listing update error");
    return await response.json();
  } catch (error) {
    console.log("Failed to update listing:", error);
    triggerNetworkError();
    return null;
  }
};

export const createActivity = async (
  request: CreateActivityRequest,
): Promise<AppActivityDto | null> => {
  try {
    const token = getToken();
    if (!token) {
      console.warn("No JWT token found. Aborting activity creation.");
      return null;
    }
    const response = await fetchWithTimeout(ACTIVITIES_API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Backend error:", errorText);
      throw new Error(`Activity creation error: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.log("Failed to create activity:", error);
    triggerNetworkError();
    return null;
  }
};

export const updateActivity = async (
  id: string,
  request: Partial<CreateActivityRequest>,
): Promise<AppActivityDto | null> => {
  try {
    const token = getToken();
    if (!token) return null;
    const response = await fetchWithTimeout(`${ACTIVITIES_API_BASE_URL}/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Activity update error");
    return await response.json();
  } catch (error) {
    console.log("Failed to update activity:", error);
    triggerNetworkError();
    return null;
  }
};

export const deleteActivity = async (id: string): Promise<boolean> => {
  try {
    const token = getToken();
    if (!token) return false;
    const response = await fetchWithTimeout(`${ACTIVITIES_API_BASE_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch (error) {
    console.log("Failed to delete activity:", error);
    return false;
  }
};
