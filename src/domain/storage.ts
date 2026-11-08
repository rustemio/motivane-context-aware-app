import { DEFAULT_MOMENT } from './moment';
import { initialState, type AppState } from './state';
import {
  ENERGIES,
  KINDS,
  PLACES,
  TIMES,
  WEATHERS,
  type Energy,
  type Idea,
  type Moment,
  type SkySource,
} from './types';

export const STORAGE_KEY = 'motivane.state';
export const BACKUP_KEY = 'motivane.unreadable-backup';
export const SCHEMA_VERSION = 1;

/** How long a live reading stays believable after a reload. Coordinates are never stored. */
const LIVE_READING_TTL = 30 * 60_000;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type LoadNotice = 'recovered' | 'unreadable' | 'unavailable' | null;

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const subset = <T extends string>(list: readonly T[], v: unknown): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => isOneOf(list, x)))] : [];

function clampMinutes(v: unknown, fallback: number): number {
  return isFiniteNumber(v) ? Math.max(1, Math.min(480, Math.round(v))) : fallback;
}

/** An idea needs an id and a title to be worth keeping. Everything else has a safe default. */
export function sanitizeIdea(raw: unknown, now: number): Idea | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.title !== 'string' || !r.title.trim()) return null;
  const minutes = clampMinutes(r.minutes, 20);
  const idea: Idea = {
    id: r.id,
    title: r.title.trim().slice(0, 140),
    kind: isOneOf(KINDS, r.kind) ? r.kind : 'make',
    place: isOneOf(PLACES, r.place) ? r.place : 'anywhere',
    skies: subset(WEATHERS, r.skies),
    times: subset(TIMES, r.times),
    minutes,
    energy: isOneOf(ENERGIES, r.energy) ? r.energy : 'medium',
    step: typeof r.step === 'string' && r.step.trim() ? r.step.trim().slice(0, 200) : 'Do the very first, smallest bit of it.',
    stepMinutes: Math.min(clampMinutes(r.stepMinutes, 5), minutes),
    shrink: isFiniteNumber(r.shrink) ? Math.max(0, Math.min(3, Math.round(r.shrink))) : 0,
    sample: r.sample === true,
    createdAt: isFiniteNumber(r.createdAt) && r.createdAt <= now ? r.createdAt : now,
    steps: Array.isArray(r.steps)
      ? r.steps.flatMap((s) => {
          const step = s as { at?: unknown; text?: unknown };
          return s && isFiniteNumber(step.at) ? [{ at: step.at, text: typeof step.text === 'string' ? step.text : '' }] : [];
        })
      : [],
  };
  if (isFiniteNumber(r.restUntil) && r.restUntil > now) idea.restUntil = r.restUntil;
  if (typeof r.restSky === 'string') idea.restSky = r.restSky;
  if (isFiniteNumber(r.doneAt)) {
    const done = r.doneIn as { weather?: unknown; time?: unknown } | undefined;
    idea.doneAt = r.doneAt;
    idea.doneIn = {
      weather: isOneOf(WEATHERS, done?.weather) ? done.weather : 'cloudy',
      time: isOneOf(TIMES, done?.time) ? done.time : 'afternoon',
    };
  }
  return idea;
}

function sanitizeMoment(raw: unknown): Moment {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const moment: Moment = {
    weather: isOneOf(WEATHERS, r.weather) ? r.weather : DEFAULT_MOMENT.weather,
    time: isOneOf(TIMES, r.time) ? r.time : DEFAULT_MOMENT.time,
    minutes: clampMinutes(r.minutes, DEFAULT_MOMENT.minutes),
    energy: isOneOf<Energy>(ENERGIES, r.energy) ? r.energy : DEFAULT_MOMENT.energy,
  };
  if (isFiniteNumber(r.tempC)) moment.tempC = r.tempC;
  return moment;
}

function sanitizeSource(raw: unknown, now: number): SkySource {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  if (r.kind === 'live' && isFiniteNumber(r.fetchedAt)) {
    // A stale reading must not keep claiming to be live.
    return now - r.fetchedAt < LIVE_READING_TTL ? { kind: 'live', fetchedAt: r.fetchedAt } : { kind: 'clock' };
  }
  if (r.kind === 'manual' || r.kind === 'clock' || r.kind === 'demo') return { kind: r.kind };
  return { kind: 'demo' };
}

export function loadState(storage: StorageLike | null, now: number): { state: AppState; notice: LoadNotice } {
  const fresh = initialState(now);
  if (!storage) return { state: fresh, notice: 'unavailable' };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: fresh, notice: 'unavailable' };
  }
  if (raw === null) return { state: fresh, notice: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not a state object');
  } catch {
    // Keep the bytes in case they can be rescued by hand. Then carry on.
    try {
      storage.setItem(BACKUP_KEY, raw);
    } catch {
      /* nothing more we can do */
    }
    return { state: fresh, notice: 'unreadable' };
  }

  // The sanitizers double as migration: whatever an older or newer save holds,
  // unknown fields are dropped and missing ones get a default.
  const data = parsed as Record<string, unknown>;
  const rawIdeas = Array.isArray(data.ideas) ? data.ideas : [];
  const seen = new Set<string>();
  const ideas = rawIdeas
    .map((i) => sanitizeIdea(i, now))
    .filter((i): i is Idea => {
      if (!i || seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });

  return {
    state: {
      ideas,
      moment: sanitizeMoment(data.moment),
      source: sanitizeSource(data.source, now),
      introSeen: data.introSeen === true,
      hint: isFiniteNumber(data.hint) ? data.hint : 2,
    },
    notice: ideas.length < rawIdeas.length || !Array.isArray(data.ideas) ? 'recovered' : null,
  };
}

/** Returns false when the browser refused to keep it (private mode, quota). */
export function saveState(storage: StorageLike | null, state: AppState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, ...state }));
    return true;
  } catch {
    return false;
  }
}

export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
