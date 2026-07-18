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
  imageUrls?: string[];
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
  imageUrls?: string[];
  contactInfo?: string;
  active: boolean;
}

const LISTING_API_BASE = `${API_BASE_URL}/api/v1/listings`;

export const fetchListings = async (
  category?: ListingCategory,
): Promise<ListingDto[]> => {
  // MOCK DATA: Sadece ekrandaki görünümü test etmek için
  const mockData: ListingDto[] = [
    {
      id: "mock-listing-1",
      title: "Satılık Ada İçi Elektrikli Bisiklet",
      description: "Çok temiz kullanılmış, bataryası yeni değişmiş elektrikli bisiklet. Adada ulaşım için birebir.",
      category: ListingCategory.TASIT,
      island: Island.BUYUKADA,
      price: 15000,
      imageUrl: "https://images.unsplash.com/photo-1528543606781-2f6e6857f318?w=800&auto=format&fit=crop&q=80",
      imageUrls: [
        "https://images.unsplash.com/photo-1528543606781-2f6e6857f318?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1571188654261-2946bd7c1f83?w=800&auto=format&fit=crop&q=80"
      ],
      active: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "mock-listing-2",
      title: "Kayıp Golden Cinsi Köpek",
      description: "Nizam mahallesinde kaybolmuştur. Boynunda kırmızı tasması var, adı Tarçın.",
      category: ListingCategory.KAYIP,
      island: Island.BUYUKADA,
      price: 0,
      imageUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80",
      active: true,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "mock-listing-3",
      title: "Antika Ahşap Sandalye Seti",
      description: "Dedemden kalma 4 adet el oyması antika ahşap sandalye. Ev dekorasyonu için mükemmel.",
      category: ListingCategory.ESYA,
      island: Island.HEYBELIADA,
      price: 4500,
      imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&auto=format&fit=crop&q=80",
      active: true,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    }
  ];

  if (category) {
    return mockData.filter(listing => listing.category === category);
  }
  return mockData;
  /*
  try {
    const url = new URL(LISTING_API_BASE);
    if (category) url.searchParams.append("category", category);

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();

    if (data && data.content && Array.isArray(data.content)) {
      return data.content;
    } else if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch listings:", error);
    triggerNetworkError();
    return [];
  }
  */
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
        "Authorization": `Bearer ${token}`,
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
  if (id.startsWith('mock')) {
    const mocks = await fetchListings();
    return mocks.find(m => m.id === id) || null;
  }

  try {
    const response = await fetchWithTimeout(`${LISTING_API_BASE}/${id}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch listing detail:", error);
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
