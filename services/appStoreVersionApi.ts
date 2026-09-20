const APP_STORE_LOOKUP_URL =
  'https://itunes.apple.com/lookup?bundleId=com.onurx.ADA&country=tr';

export interface AppStoreVersionInfo {
  version: string;
  trackViewUrl?: string;
}

/** Fetches the currently released iOS version from Apple's public lookup API. */
export async function fetchAppStoreVersion(): Promise<AppStoreVersionInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(APP_STORE_LOOKUP_URL, { signal: controller.signal });
    if (!response.ok) return null;

    const payload = await response.json();
    const result = payload?.results?.[0];
    if (!result?.version || typeof result.version !== 'string') return null;

    return {
      version: result.version,
      trackViewUrl: typeof result.trackViewUrl === 'string' ? result.trackViewUrl : undefined,
    };
  } catch {
    // Store availability must never prevent the app from opening.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Returns true when the first version is newer than the second. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const candidateParts = candidate.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const currentParts = current.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(candidateParts.length, currentParts.length);

  for (let index = 0; index < length; index += 1) {
    const candidatePart = candidateParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;
    if (candidatePart !== currentPart) return candidatePart > currentPart;
  }

  return false;
}
