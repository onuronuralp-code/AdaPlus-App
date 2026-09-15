import { API_BASE_URL, fetchWithTimeout } from './config';

export interface ServiceProviderDto {
  id: string | number;
  fullName?: string;
  name?: string;
  title?: string;
  phone?: string;
  whatsapp?: string;
  island?: string;
  category?: string;
  categoryLabel?: string;
  offeredServices?: string;
  description?: string;
  experienceNotes?: string;
  experienceYears?: number;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  isVerified?: boolean;
  status?: string;
}

const LIST_ENDPOINTS = [
  `${API_BASE_URL}/api/v1/service-providers`,
  `${API_BASE_URL}/api/v1/provider-applications/approved`,
];

const extractList = (body: unknown): ServiceProviderDto[] => {
  if (Array.isArray(body)) return body as ServiceProviderDto[];
  if (!body || typeof body !== 'object') return [];

  const record = body as Record<string, unknown>;
  const candidates = [record.content, record.data, record.items, record.providers];
  const list = candidates.find(Array.isArray);
  return (list ?? []) as ServiceProviderDto[];
};

export async function fetchServiceProviders(): Promise<ServiceProviderDto[]> {
  let lastError: Error | null = null;

  for (const endpoint of LIST_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint);
      if (response.ok) return extractList(await response.json());

      lastError = new Error(`Service providers API returned ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Service providers could not be loaded');
      break;
    }
  }

  throw lastError ?? new Error('Service providers could not be loaded');
}
