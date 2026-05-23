import { triggerNetworkError } from "./api";
import { API_BASE_URL } from "./config";
import { Island } from "./forumApi";
import { getToken } from "@/utils/tokenStorage";

export enum ListingCategory {
  SATILIK = "SATILIK",
  KIRALIK = "KIRALIK",
  HIZMET = "HIZMET",
  IS_ILANI = "IS_ILANI",
  KAYIP = "KAYIP",
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

export const fetchListings = async (
  category?: ListingCategory,
): Promise<ListingDto[]> => {
  try {
    const url = new URL(LISTING_API_BASE);
    if (category) url.searchParams.append("category", category);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();

    // Handle Spring Data Page structure if present
    if (data && data.content && Array.isArray(data.content)) {
      return data.content;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch listings:", error);
    triggerNetworkError();
    return [];
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
    const response = await fetch(LISTING_API_BASE, {
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
    triggerNetworkError();
    return null;
  }
};

export const getListing = async (id: string): Promise<ListingDto | null> => {
  try {
    const response = await fetch(`${LISTING_API_BASE}/${id}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch listing detail:", error);
    triggerNetworkError();
    return null;
  }
};

export const updateListing = async (
  id: string,
  request: SaveListingRequest,
): Promise<ListingDto | null> => {
  try {
    const token = getToken();
    const response = await fetch(`${LISTING_API_BASE}/${id}`, {
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
    triggerNetworkError();
    return null;
  }
};

export const fetchMyListings = async (): Promise<ListingDto[]> => {
  try {
    const token = getToken();
    if (!token) return [];
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me/listings`, {
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
    const response = await fetch(`${LISTING_API_BASE}/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return true;
  } catch (error) {
    console.error("Failed to delete listing:", error);
    triggerNetworkError();
    return false;
  }
};
