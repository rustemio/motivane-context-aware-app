import type { Energy, Kind, Place, TimeOfDay, Weather } from '../domain/types';

export const KIND_LABEL: Record<Kind, string> = { wander: 'Wander', make: 'Make', learn: 'Learn', tend: 'Tend' };
export const KIND_HINT: Record<Kind, string> = {
  wander: 'going out, moving, noticing',
  make: 'projects, writing, drawing',
  learn: 'reading, listening, figuring out',
  tend: 'people, home, yourself',
};
export const ENERGY_WORD: Record<Energy, string> = { low: 'hardly any', medium: 'some', high: 'plenty of' };
export const ENERGY_LABEL: Record<Energy, string> = { low: 'Low energy', medium: 'Some energy', high: 'High energy' };
export const PLACE_LABEL: Record<Place, string> = { outdoors: 'Outdoors', indoors: 'Indoors', anywhere: 'Anywhere' };
export const WEATHER_LABEL: Record<Weather, string> = { clear: 'Clear', cloudy: 'Grey', rain: 'Rain', snow: 'Snow' };
export const TIME_LABEL: Record<TimeOfDay, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };

/** Compact, for the small print on a note: "15 min", "1½ hr" */
export function shortDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} hr`;
  if (minutes % 30 === 0) return `${Math.floor(hours)}½ hr`;
  return `${minutes} min`;
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `idea-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
