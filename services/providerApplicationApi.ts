import { API_BASE_URL, fetchWithTimeout } from "./config";
import { Island } from "./forumApi";
import { getToken } from "@/utils/tokenStorage";

export enum ServiceCategory {
  REPAIR = "REPAIR",
  PAINTING = "PAINTING",
  LOCKSMITH = "LOCKSMITH",
  CLEANING = "CLEANING",
  GARDEN = "GARDEN",
  TRANSPORT = "TRANSPORT",
  TUTORING = "TUTORING",
  PET = "PET",
  OTHER = "OTHER",
}

export type ProviderApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ServiceProviderApplicationDto {
  id: string;
  fullName: string;
  phone: string;
  island: Island;
  category: ServiceCategory;
  offeredServices: string;
  experienceNotes?: string;
  status: ProviderApplicationStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface CreateServiceProviderApplicationRequest {
  fullName: string;
  phone: string;
  island: Island;
  category: ServiceCategory;
  offeredServices: string;
  experienceNotes?: string;
}

const PROVIDER_APPLICATIONS_BASE = `${API_BASE_URL}/api/v1/provider-applications`;

export const submitProviderApplication = async (
  request: CreateServiceProviderApplicationRequest,
): Promise<ServiceProviderApplicationDto> => {
  const token = getToken();
  if (!token) {
    throw new Error("You must be logged in to apply as a service provider.");
  }
  const response = await fetchWithTimeout(PROVIDER_APPLICATIONS_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `API Error: ${response.status}`);
  }
  return await response.json();
};

export const getMyProviderApplications = async (): Promise<ServiceProviderApplicationDto[]> => {
  const token = getToken();
  if (!token) return [];
  const response = await fetchWithTimeout(`${PROVIDER_APPLICATIONS_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  return await response.json();
};
