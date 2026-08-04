import { API_BASE_URL, fetchWithTimeout } from './config';

export interface AppVersionInfo {
  minimumVersion: string;
  latestVersion: string;
}

export async function fetchAppVersion(): Promise<AppVersionInfo> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/app/version`);
  if (!response.ok) throw new Error('Version check failed');
  return response.json();
}

/** Returns true if `current` is strictly less than `minimum` (semantic versioning). */
export function requiresUpdate(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [mMaj, mMin, mPat] = parse(minimum);
  if (cMaj !== mMaj) return cMaj < mMaj;
  if (cMin !== mMin) return cMin < mMin;
  return cPat < mPat;
}
