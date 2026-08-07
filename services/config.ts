if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[config] EXPO_PUBLIC_API_URL is not set. API calls will fail.');
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Races the fetch against an independent timer instead of relying solely on
    // AbortController — some RN/Expo fetch implementations don't reliably reject the
    // fetch promise when the signal aborts, which would otherwise let a stalled
    // connection hang forever with nothing to ever resolve or reject it.
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timed out'));
      }, FETCH_TIMEOUT_MS);
    });

    try {
      const newInit: RequestInit = {
        ...init,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...(init?.headers || {})
        },
        signal: controller.signal
      };

      const response = await Promise.race([fetch(input, newInit), timeoutPromise]);
      clearTimeout(timeoutId);

      // Retry on transient 5xx server gateway errors
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const method = (init?.method || 'GET').toUpperCase();
      const msg = err.message?.toLowerCase() || '';
      const isAbortOrNetworkErr = err.name === 'AbortError' || msg.includes('network') || msg.includes('fetch') || msg.includes('timed out');

      if (attempt < MAX_RETRIES && (method === 'GET' || isAbortOrNetworkErr)) {
        await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }

  throw lastError || new Error('Network request failed');
};

/**
 * Drop-in replacement for fetch() that automatically calls handleUnauthorized()
 * on 401 so any expired-token response triggers a silent logout across the app.
 */
export const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const { handleUnauthorized } = await import('../context/AuthContext');

  const response = await fetchWithTimeout(input, init);
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
  const firstUrl = url.includes(',') ? url.split(',')[0].trim() : url;
  if (firstUrl.startsWith('https://')) return firstUrl;
  if (firstUrl.startsWith('/')) return `${API_BASE_URL}${firstUrl}`;
  try {
    const apiBase = new URL(API_BASE_URL);
    const imgUrl = new URL(firstUrl);
    imgUrl.hostname = apiBase.hostname;
    imgUrl.port = apiBase.port;
    imgUrl.protocol = apiBase.protocol;
    return imgUrl.toString();
  } catch {
    return url;
  }
};
