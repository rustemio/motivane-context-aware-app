import type { Weather } from '../domain/types';

/**
 * Open-Meteo needs no key, so there is no secret to leak. It sits behind this
 * one function; everything else only ever sees a Reading or a typed failure.
 */

export interface Reading {
  weather: Weather;
  tempC?: number;
}

export type WeatherFailure = 'denied' | 'unsupported' | 'position' | 'network';

export class WeatherError extends Error {
  constructor(public reason: WeatherFailure) {
    super(reason);
  }
}

/** WMO weather codes, as used by Open-Meteo. */
export function weatherFromCode(code: number): Weather | null {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  return null;
}

/** About a kilometre of precision is plenty for weather and shares less. */
const coarse = (v: number) => v.toFixed(2);

export async function fetchReading(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Reading> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coarse(latitude)}&longitude=${coarse(longitude)}` +
    '&current=temperature_2m,weather_code';
  let body: { current?: { temperature_2m?: unknown; weather_code?: unknown } };
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(String(res.status));
    body = await res.json();
  } catch {
    throw new WeatherError('network');
  }
  const code = body.current?.weather_code;
  const weather = typeof code === 'number' ? weatherFromCode(code) : null;
  if (!weather) throw new WeatherError('network');
  const temp = body.current?.temperature_2m;
  return { weather, tempC: typeof temp === 'number' ? temp : undefined };
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new WeatherError('unsupported'));
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => reject(new WeatherError(err.code === err.PERMISSION_DENIED ? 'denied' : 'position')),
      { timeout: 10_000, maximumAge: 10 * 60_000, enableHighAccuracy: false },
    );
  });
}

/** Only ever called from a button press. */
export async function readLocalSky(): Promise<Reading> {
  const { coords } = await currentPosition();
  return fetchReading(coords.latitude, coords.longitude);
}
