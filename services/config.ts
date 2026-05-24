if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[config] EXPO_PUBLIC_API_URL is not set. API calls will fail.');
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

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
 * Rewrites a locally-stored image URL to use the current API host.
 * Handles IP address changes between dev sessions (e.g. DHCP reassignment).
 * HTTPS URLs (S3, CDN, Unsplash) are returned unchanged.
 */
export const resolveImageUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('https://')) return url;
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
