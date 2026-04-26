import { useEffect, useState } from 'react';
import { fetchIstanbulWeather, WeatherData } from '@/services/weather';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedData: WeatherData | null = null;
let cachedAt = 0;

/**
 * Hook that provides real-time Istanbul weather data.
 * Caches for 10 minutes to avoid excessive API calls.
 */
export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Return cached data if fresh enough
      if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
        setWeather(cachedData);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchIstanbulWeather();
        if (!cancelled) {
          cachedData = data;
          cachedAt = Date.now();
          setWeather(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? 'Failed to fetch weather');
          // If we have stale cache, still show it
          if (cachedData) setWeather(cachedData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => { cancelled = true; };
  }, []);

  return { weather, loading, error };
}
