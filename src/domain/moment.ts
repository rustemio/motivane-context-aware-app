import type { Moment, TimeOfDay, Weather } from './types';

export const skyKey = (m: Pick<Moment, 'weather' | 'time'>) => `${m.weather}/${m.time}`;

export function timeOfDayFrom(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/** The adjective used in the sentence. A clear night can't be sunny. */
export function weatherWord(weather: Weather, time: TimeOfDay): string {
  switch (weather) {
    case 'clear':
      return time === 'morning' || time === 'afternoon' ? 'sunny' : 'clear';
    case 'cloudy':
      return 'grey';
    case 'rain':
      return 'rainy';
    case 'snow':
      return 'snowy';
  }
}

/** "a rainy evening" */
export const skyPhrase = (m: Pick<Moment, 'weather' | 'time'>) =>
  `a ${weatherWord(m.weather, m.time)} ${m.time}`;

/** "5 minutes", "an hour", "an hour and a half", "2 hours" */
export function durationPhrase(minutes: number): string {
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  if (minutes === 60) return 'an hour';
  if (minutes === 90) return 'an hour and a half';
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export interface Preset {
  id: string;
  label: string;
  moment: Moment;
}

export const PRESETS: Preset[] = [
  { id: 'rainy-evening', label: 'Rainy evening', moment: { weather: 'rain', time: 'evening', minutes: 30, energy: 'low' } },
  { id: 'sunny-afternoon', label: 'Sunny afternoon', moment: { weather: 'clear', time: 'afternoon', minutes: 60, energy: 'high' } },
  { id: 'grey-lunch', label: 'Grey lunch break', moment: { weather: 'cloudy', time: 'afternoon', minutes: 15, energy: 'medium' } },
  { id: 'snow-morning', label: 'Slow snowy morning', moment: { weather: 'snow', time: 'morning', minutes: 30, energy: 'medium' } },
  { id: 'clear-night', label: 'Five minutes, clear night', moment: { weather: 'clear', time: 'night', minutes: 5, energy: 'low' } },
];

export const DEFAULT_MOMENT = PRESETS[0].moment;

export function matchingPreset(m: Moment): Preset | undefined {
  return PRESETS.find(
    (p) =>
      p.moment.weather === m.weather &&
      p.moment.time === m.time &&
      p.moment.minutes === m.minutes &&
      p.moment.energy === m.energy,
  );
}
