if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[config] EXPO_PUBLIC_API_URL is not set. API calls will fail.');
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const FETCH_TIMEOUT_MS = 15_000;

export const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
};

/**
 * Drop-in replacement for fetch() that automatically calls handleUnauthorized()
 * on 401 so any expired-token response triggers a silent logout across the app.
 */
export const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const { handleUnauthorized } = await import('../context/AuthContext');
  const response = await fetch(input, init);
  if (response.status === 401) {
    handleUnauthorized();
  }
  return response;
};

/**
 * Opens a URL only if its scheme is in the allowed list.
 * Prevents API-supplied URLs from triggering tel:, sms:, file://, or
 * other unexpected native URI handlers (OWASP A03 – Injection).
 */
const ALLOWED_URL_SCHEMES = ['http:', 'https:', 'instagram:'];
export const safeOpenUrl = async (url: string | null | undefined): Promise<void> => {
  if (!url) return;
  try {
    const { protocol } = new URL(url);
    if (!ALLOWED_URL_SCHEMES.includes(protocol)) {
      console.warn(`[safeOpenUrl] Blocked disallowed scheme: ${protocol}`);
      return;
    }
    const { Linking } = await import('react-native');
    await Linking.openURL(url);
  } catch {
    console.warn('[safeOpenUrl] Invalid URL:', url);
  }
};

/**
 * Resolves a stored image URL to a fully qualified URL for display.
 * - HTTPS (S3, CDN, Unsplash): returned unchanged
 * - Relative path (new format, e.g. /api/v1/media/uuid.jpg): prepend API_BASE_URL
 * - Legacy absolute HTTP URL: rewrite host to current API server (handles IP/port changes)
 */
export const resolveImageUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  try {
    const apiBase = new URL(API_BASE_URL);
    const imgUrl = new URL(url);
    imgUrl.hostname = apiBase.hostname;
    imgUrl.port = apiBase.port;
    imgUrl.protocol = apiBase.protocol;
    return imgUrl.toString();
  } catch {
    return url;
  }
};
