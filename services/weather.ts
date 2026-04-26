/**
 * Weather service using Open-Meteo API (free, no API key required).
 * Fetches real-time weather data for Istanbul.
 */

const ISTANBUL_LAT = 41.0082;
const ISTANBUL_LON = 28.9784;
const TIMEZONE = 'Europe/Istanbul';

export interface WeatherData {
  temperature: number;    // °C
  windSpeed: number;      // km/h
  sunset: string;         // HH:MM format
}

export async function fetchIstanbulWeather(): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${ISTANBUL_LAT}` +
    `&longitude=${ISTANBUL_LON}` +
    `&current=temperature_2m,wind_speed_10m` +
    `&daily=sunset` +
    `&timezone=${TIMEZONE}` +
    `&forecast_days=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract current values
  const temperature = Math.round(data.current.temperature_2m);
  const windSpeed = Math.round(data.current.wind_speed_10m);

  // Sunset comes as ISO string like "2026-04-21T19:45" — extract HH:MM
  const sunsetRaw: string = data.daily.sunset[0];
  const sunset = sunsetRaw.split('T')[1]?.slice(0, 5) ?? '19:30';

  return { temperature, windSpeed, sunset };
}
