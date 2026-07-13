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

const MOCK_LISTINGS: ListingDto[] = Array.from({ length: 20 }).map((_, index) => ({
  id: `list${index + 1}`,
  title: `Test İlanı ${index + 1}`,
  description: `Bu ${index + 1}. ilan açıklaması. Scroll (kaydırma) testini kontrol etmek için otomatik oluşturuldu. Adalar genelindeki genel ilanlar listesi.`,
  category: index % 3 === 0 ? ListingCategory.KIRALIK : index % 3 === 1 ? ListingCategory.SATILIK : ListingCategory.KAYIP,
  island: Island.BUYUKADA,
  price: index * 50,
  priceLabel: "TL",
  active: true,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * index).toISOString(),
  updatedAt: new Date().toISOString()
}));

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
      if (data.content.length > 0) return data.content;
      return MOCK_LISTINGS.filter(item => !category || item.category === category);
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
    
    // MOCK BEHAVIOR: Instead of calling the backend, we dynamically create a mock listing
    // and unshift it to the top of our MOCK_LISTINGS array for testing purposes.
    const newMockListing: ListingDto = {
      id: `list_new_${Date.now()}`,
      title: request.title,
      description: request.description,
      category: request.category as ListingCategory,
      island: request.island as Island,
      price: request.price,
      priceLabel: "TL",
      active: request.active ?? true,
      imageUrl: request.imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    MOCK_LISTINGS.unshift(newMockListing);
    return newMockListing;

  } catch (error) {
    console.error("Failed to create listing:", error);
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
