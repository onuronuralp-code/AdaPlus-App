import { triggerNetworkError } from "./api";
import { API_BASE_URL, fetchWithTimeout } from "./config";
import { Island } from "./forumApi";
import { getToken } from "@/utils/tokenStorage";

export enum ListingCategory {
  SATILIK = "SATILIK",
  KIRALIK = "KIRALIK",
  HIZMET = "HIZMET",
  IS_ILANI = "IS_ILANI",
  KAYIP = "KAYIP",
  ESYA = "ESYA",
  TASIT = "TASIT",
}

export interface ListingDto {
  id: string;
  title: string;
  description: string;
  category: ListingCategory;
  island: Island;
  price: number;
  priceLabel?: string;
  imageUrl?: string;
  contactInfo?: string;
  active: boolean;
  status?: string;
  submittedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveListingRequest {
  title: string;
  description: string;
  category: ListingCategory;
  island: Island;
  price: number;
  imageUrl?: string;
  contactInfo?: string;
  active: boolean;
}

const LISTING_API_BASE = `${API_BASE_URL}/api/v1/listings`;

const MOCK_LISTINGS: ListingDto[] = [
  {
    id: "list1",
    title: "Büyükada'da Kiralık Bisiklet",
    description: "Az kullanılmış, çok iyi durumda dağ bisikleti. Günlük veya haftalık kiralanabilir.",
    category: ListingCategory.KIRALIK,
    island: Island.BUYUKADA,
    price: 150,
    priceLabel: "TL/Gün",
    active: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "list2",
    title: "Satılık Ada Vapuru Maketi",
    description: "El yapımı, ince işçilikli vapur maketi. Ev dekorasyonu için birebir.",
    category: ListingCategory.SATILIK,
    island: Island.HEYBELIADA,
    price: 1200,
    priceLabel: "TL",
    active: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "list3",
    title: "Kayıp Kedi - Tarçın",
    description: "Burgazada iskele civarında turuncu beyaz renkli kedimiz kayboldu. Görenlerin iletişime geçmesi rica olunur.",
    category: ListingCategory.KAYIP,
    island: Island.BURGAZADA,
    price: 0,
    active: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const fetchListings = async (
  category?: ListingCategory,
): Promise<ListingDto[]> => {
  try {
    const url = new URL(LISTING_API_BASE);
    if (category) url.searchParams.append("category", category);

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();

    // Handle Spring Data Page structure if present
    if (data && data.content && Array.isArray(data.content)) {
      return data.content;
    }

    // Return mock data if empty or error
    return data && data.length > 0 ? data : MOCK_LISTINGS.filter(item => !category || item.category === category);
  } catch (error) {
    console.log("Using mock data for listings due to error:", error);
    return MOCK_LISTINGS.filter(item => !category || item.category === category);
  }
};

export const createListing = async (
  request: SaveListingRequest,
): Promise<ListingDto | null> => {
  try {
    const token = getToken();
    if (!token) {
      console.warn("No JWT token found. Aborting listing creation.");
      return null;
    }
    const response = await fetchWithTimeout(LISTING_API_BASE, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to create listing:", error);
    if (!(error instanceof Error && error.message.startsWith("API Error:"))) {
      triggerNetworkError();
    }
    return null;
  }
};

export const getListing = async (id: string): Promise<ListingDto | null> => {
  try {
    const response = await fetchWithTimeout(`${LISTING_API_BASE}/${id}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.log("Failed to fetch listing detail, trying mock data:", error);
    const mockListing = MOCK_LISTINGS.find(l => l.id === id);
    if (mockListing) return mockListing;
    return null;
  }
};

export const updateListing = async (
  id: string,
  request: SaveListingRequest,
): Promise<ListingDto | null> => {
  try {
    const token = getToken();
    const response = await fetchWithTimeout(`${LISTING_API_BASE}/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to update listing:", error);
    if (!(error instanceof Error && error.message.startsWith("API Error:"))) {
      triggerNetworkError();
    }
    return null;
  }
};

export const fetchMyListings = async (): Promise<ListingDto[]> => {
  try {
    const token = getToken();
    if (!token) return [];
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/me/listings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch my listings:', error);
    return [];
  }
};

export const deleteListing = async (id: string): Promise<boolean> => {
  try {
    const token = getToken();
    const response = await fetchWithTimeout(`${LISTING_API_BASE}/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return true;
  } catch (error) {
    console.error("Failed to delete listing:", error);
    if (!(error instanceof Error && error.message.startsWith("API Error:"))) {
      triggerNetworkError();
    }
    return false;
  }
};
