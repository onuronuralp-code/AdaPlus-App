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
  startDate: string | null;
  endDate?: string | null;
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

export const DEFAULT_ACTIVITIES: AppActivityDto[] = [
  {
    id: "act-1",
    name: "Büyükada Açık Hava Sinema Gecesi",
    description: "Yıldızların altında nostaljik açık hava sinema keyfi. Tarihi Taş Mektep bahçesinde buluşuyoruz.",
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
    island: "BUYUKADA",
    eventPlace: "Tarihi Taş Mektep Bahçesi",
    organizerName: "Ada Kültür Derneği",
    organizerContact: "0532 200 3040",
    instagramLink: "@adakultur",
    imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
    status: "APPROVED",
    rsvpCount: 14,
    userHasRsvp: false,
  },
  {
    id: "act-2",
    name: "Heybeliada Çam Limanı Doğa Yürüyüşü",
    description: "Rehber eşliğinde Değirmenburnu ve Çam Limanı parkurunda sabah yürüyüşü ve nefes egzersizleri.",
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    island: "HEYBELIADA",
    eventPlace: "Heybeliada İskele Meydanı",
    organizerName: "Adalar Doğa Sporları Kulübü",
    organizerContact: "0535 300 4050",
    instagramLink: "@adadoga",
    imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop&q=80",
    status: "APPROVED",
    rsvpCount: 22,
    userHasRsvp: false,
  },
  {
    id: "act-3",
    name: "Kınalıada Sahil Temizliği & Plaj Voleybolu",
    description: "Temiz deniz, temiz ada! Sahil temizliğinin ardından eğlenceli plaj voleybolu turnuvası.",
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
    island: "KINALIADA",
    eventPlace: "Ayazma Plajı",
    organizerName: "Ada Gönüllüleri",
    organizerContact: "0533 500 6070",
    instagramLink: "@adagonulluleri",
    imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80",
    status: "APPROVED",
    rsvpCount: 9,
    userHasRsvp: false,
  }
];

export const MOCK_ACTIVITIES: AppActivityDto[] = DEFAULT_ACTIVITIES;

export const fetchActivities = async (): Promise<AppActivityDto[]> => {
  try {
    const token = getToken();
    const response = await fetchWithTimeout(ACTIVITIES_API_BASE_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error("Activities fetch error");
    const data = await response.json();
    let activities: AppActivityDto[] = Array.isArray(data) ? data.filter(Boolean) : [];
    // Some deployments return a paginated envelope while others return a raw
    // array. Support both so approved activities are not mistaken for an empty
    // result.
    const items = data?.content ?? data?.items ?? data?.data;
    if (Array.isArray(items)) activities = items.filter(Boolean);

    // The public collection can lag behind moderation. Include the signed-in
    // user's approved activity immediately from the personal collection too.
    if (token) {
      try {
        const mineResponse = await fetchWithTimeout(`${BASE}/api/v1/users/me/activities`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (mineResponse.ok) {
          const mineData = await mineResponse.json();
          const mineItems = Array.isArray(mineData)
            ? mineData
            : (mineData?.content ?? mineData?.items ?? mineData?.data ?? []);
          if (Array.isArray(mineItems)) {
            const approvedMine = mineItems.filter((item: AppActivityDto) =>
              !item.status || String(item.status).toUpperCase() === 'APPROVED'
            );
            const byId = new Map(activities.map((item) => [item.id, item]));
            approvedMine.forEach((item: AppActivityDto) => byId.set(item.id, item));
            activities = Array.from(byId.values());
          }
        }
      } catch (error) {
        console.log('Failed to merge my activities:', error);
      }
    }

    return activities;
  } catch (error) {
    console.log("Failed to fetch activities:", error);
    return [];
  }
};

export const fetchUpcomingActivities = async (limit: number = 5): Promise<AppActivityDto[]> => {
  try {
    const token = getToken();
    const response = await fetchWithTimeout(`${ACTIVITIES_API_BASE_URL}/upcoming?limit=${limit}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error("Upcoming activities fetch error");
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, limit);
    }
    const items = data?.content ?? data?.items ?? data?.data;
    if (Array.isArray(items)) return items.filter(Boolean).slice(0, limit);
    return [];
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


export type CreateActivityRequest = Omit<AppActivityDto, "id" | "status" | "endDate"> & {
  endDate?: string | null;
};

export const getActivity = async (id: string): Promise<AppActivityDto | null> => {
  const localMock = DEFAULT_ACTIVITIES.find(a => a.id === id);
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
    console.log('Failed to fetch activity:', error);
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
      // Optional event fields must be omitted rather than sent as JSON null;
      // the API validates absent dates/contacts as optional values.
      body: JSON.stringify(request, (_key, value) => value === null ? undefined : value),
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
      body: JSON.stringify(request, (_key, value) => value === null ? undefined : value),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Backend error:", errorText);
      throw new Error(`Activity creation error: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.log("Failed to create activity:", error);
    // The event form displays a local, actionable error. A global modal here can
    // cover that message and make a failed publish look like a frozen screen.
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
      // Match the create endpoint: optional fields must be omitted instead of
      // being sent as null/empty values, which the update DTO rejects.
      body: JSON.stringify(request, (_key, value) =>
        value === null || value === '' ? undefined : value
      ),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Activity update error (${response.status}):`, errorText);
      return null;
    }

    // Some successful PUT responses do not include a body. Treat those as a
    // completed update instead of failing while trying to parse empty JSON.
    const responseText = await response.text();
    if (!responseText.trim()) return { id, ...request } as AppActivityDto;
    return JSON.parse(responseText) as AppActivityDto;
  } catch (error) {
    console.log("Failed to update activity:", error);
    // Keep the error visible in the event form instead of covering it with the
    // global network modal.
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
