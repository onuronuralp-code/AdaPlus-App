import { API_BASE_URL, fetchWithTimeout } from './config';

export interface PopupDto {
  id: string;
  title: string;
  body?: string;
  imageUrl: string;
  actionUrl?: string;
  actionLabel?: string;
  active: boolean;
  createdAt: string;
}

// Public endpoint, no auth required. 204 (no active popup) and any error both
// resolve to null so a missing/unreachable popup never blocks app usage.
export const fetchActivePopup = async (): Promise<PopupDto | null> => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/popups/active`);
    if (response.status === 204 || !response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};
