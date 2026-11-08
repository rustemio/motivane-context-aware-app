export const KINDS = ['wander', 'make', 'learn', 'tend'] as const;
export const WEATHERS = ['clear', 'cloudy', 'rain', 'snow'] as const;
export const TIMES = ['morning', 'afternoon', 'evening', 'night'] as const;
export const PLACES = ['outdoors', 'indoors', 'anywhere'] as const;
export const ENERGIES = ['low', 'medium', 'high'] as const;
export const MINUTE_OPTIONS = [5, 15, 30, 60, 120] as const;

export type Kind = (typeof KINDS)[number];
export type Weather = (typeof WEATHERS)[number];
export type TimeOfDay = (typeof TIMES)[number];
export type Place = (typeof PLACES)[number];
export type Energy = (typeof ENERGIES)[number];

/** The signals an idea is matched against. */
export interface Moment {
  weather: Weather;
  time: TimeOfDay;
  minutes: number;
  energy: Energy;
  /** Only known when the weather is live. */
  tempC?: number;
}

/** Where the sky in the sentence came from. Time and energy are always self-reported. */
export type SkySource =
  | { kind: 'demo' }
  | { kind: 'manual' }
  | { kind: 'clock' }
  | { kind: 'live'; fetchedAt: number };

export interface Idea {
  id: string;
  title: string;
  kind: Kind;
  place: Place;
  /** Preferred weather; empty means it doesn't care. */
  skies: Weather[];
  /** Preferred times of day; empty means it doesn't care. */
  times: TimeOfDay[];
  minutes: number;
  energy: Energy;
  /** The first small step. */
  step: string;
  stepMinutes: number;
  /** 0 is full size. 1 and up index into the gentler starts in `gentleStep`. */
  shrink: number;
  /** True for the seeded demo ideas, which "reset demo" may replace. */
  sample: boolean;
  createdAt: number;
  steps: { at: number; text: string }[];
  /** Resting until this timestamp. */
  restUntil?: number;
  /** Resting while the sky is still this one (see `skyKey`). */
  restSky?: string;
  doneAt?: number;
  doneIn?: { weather: Weather; time: TimeOfDay };
}

export type IdeaDraft = Pick<
  Idea,
  'title' | 'kind' | 'place' | 'skies' | 'times' | 'minutes' | 'energy' | 'step' | 'stepMinutes'
>;
