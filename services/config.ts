if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[config] EXPO_PUBLIC_API_URL is not set. API calls will fail.');
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
