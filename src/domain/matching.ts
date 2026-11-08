import { durationPhrase, skyKey, skyPhrase, weatherWord } from './moment';
import { gentleStep } from './guess';
import type { Energy, Idea, Kind, Moment } from './types';

/**
 * The whole recommendation engine: a handful of readable rules, each adding or
 * removing points from a neutral score. Same inputs, same result, no model.
 * The "How it works" sheet describes these rules, so keep the two in step.
 */

export const NEUTRAL_SCORE = 40;
export const REACH_SCORE = 60;
export const REACH_COUNT = 3;

export type Tone = 'good' | 'neutral' | 'poor';

export interface Signal {
  key: 'sky' | 'hour' | 'time' | 'energy' | 'patience';
  tone: Tone;
  points: number;
  text: string;
}

export interface Match {
  idea: Idea;
  score: number;
  signals: Signal[];
  /** The whole idea doesn't fit, but its first step does. */
  usesStep: boolean;
  resting: boolean;
  why: string;
}

const ENERGY_RANK: Record<Energy, number> = { low: 0, medium: 1, high: 2 };
const DAY = 86_400_000;

export const isShrunk = (idea: Idea) => idea.shrink > 0;
export const effectiveMinutes = (idea: Idea) => (isShrunk(idea) ? 5 : idea.minutes);
export const effectiveEnergy = (idea: Idea): Energy => (isShrunk(idea) ? 'low' : idea.energy);
export const currentStep = (idea: Idea) => (isShrunk(idea) ? gentleStep(idea.kind, idea.shrink) : idea.step);
export const currentStepMinutes = (idea: Idea) => (isShrunk(idea) ? 5 : idea.stepMinutes);

export function isResting(idea: Idea, moment: Moment, now: number): boolean {
  if (idea.restUntil !== undefined && idea.restUntil > now) return true;
  return idea.restSky !== undefined && idea.restSky === skyKey(moment);
}

function skySignal(idea: Idea, m: Moment): Signal | null {
  const wanted = idea.skies.includes(m.weather);
  const isOut = idea.place === 'outdoors';
  if (wanted) return { key: 'sky', tone: 'good', points: 22, text: `Made for ${m.weather === 'clear' ? 'clear skies' : m.weather === 'cloudy' ? 'grey skies' : m.weather === 'rain' ? 'rainy days' : 'snow'}.` };
  const wantsOtherSky = idea.skies.length > 0;
  if (isOut) {
    if (wantsOtherSky && (m.weather === 'clear' || m.weather === 'cloudy'))
      return { key: 'sky', tone: 'neutral', points: -6, text: 'This sky isn’t its favourite.' };
    if (m.weather === 'clear') return { key: 'sky', tone: 'good', points: 14, text: 'It’s nice out.' };
    if (m.weather === 'cloudy') return { key: 'sky', tone: 'neutral', points: 4, text: 'Grey, but dry enough to go out.' };
    return { key: 'sky', tone: 'poor', points: m.weather === 'rain' ? -30 : -24, text: m.weather === 'rain' ? 'Better on a dry day.' : 'Better once the snow clears.' };
  }
  if (idea.place === 'indoors' && (m.weather === 'rain' || m.weather === 'snow'))
    return { key: 'sky', tone: 'good', points: 8, text: 'A good day to stay in.' };
  if (wantsOtherSky) return { key: 'sky', tone: 'neutral', points: -6, text: 'This sky isn’t its favourite.' };
  return null;
}

function temperatureSignal(idea: Idea, m: Moment): Signal | null {
  if (idea.place !== 'outdoors' || m.tempC === undefined || idea.skies.includes(m.weather)) return null;
  if (m.tempC < 0) return { key: 'sky', tone: 'poor', points: -14, text: `It’s ${Math.round(m.tempC)}° outside.` };
  if (m.tempC > 34) return { key: 'sky', tone: 'poor', points: -14, text: `It’s ${Math.round(m.tempC)}° outside.` };
  return null;
}

function hourSignal(idea: Idea, m: Moment): Signal | null {
  if (idea.times.includes(m.time)) return { key: 'hour', tone: 'good', points: 14, text: `${m.time[0].toUpperCase()}${m.time.slice(1)}s suit it.` };
  if (idea.place === 'outdoors' && m.time === 'night') return { key: 'hour', tone: 'poor', points: -20, text: 'It needs daylight.' };
  if (idea.times.length > 0) return { key: 'hour', tone: 'neutral', points: -10, text: `Better in the ${idea.times[0]}.` };
  return null;
}

export function matchIdea(idea: Idea, m: Moment, now: number): Match {
  const signals: Signal[] = [];
  const add = (s: Signal | null) => s && signals.push(s);
  add(skySignal(idea, m));
  add(temperatureSignal(idea, m));
  add(hourSignal(idea, m));

  const minutes = effectiveMinutes(idea);
  const stepMinutes = currentStepMinutes(idea);
  let usesStep = false;
  if (minutes <= m.minutes) {
    signals.push({ key: 'time', tone: 'good', points: 16, text: `Fits in your ${durationPhrase(m.minutes)}.` });
  } else if (stepMinutes <= m.minutes) {
    usesStep = true;
    signals.push({ key: 'time', tone: 'neutral', points: 4, text: `Too long for today, but the first step takes ${durationPhrase(stepMinutes)}.` });
  } else {
    signals.push({ key: 'time', tone: 'poor', points: -25, text: `Even the first step needs more than ${durationPhrase(m.minutes)}.` });
  }

  const energyGap = ENERGY_RANK[effectiveEnergy(idea)] - ENERGY_RANK[m.energy];
  if (energyGap <= 0) {
    signals.push({ key: 'energy', tone: 'good', points: 10, text: 'Asks no more energy than you have.' });
  } else {
    usesStep = true;
    signals.push({
      key: 'energy',
      tone: energyGap === 1 ? 'neutral' : 'poor',
      points: energyGap === 1 ? -2 : -8,
      text: 'The whole thing wants more energy, the first step doesn’t.',
    });
  }

  const waitingDays = (now - idea.createdAt) / DAY;
  if (waitingDays > 14) signals.push({ key: 'patience', tone: 'neutral', points: Math.min(6, Math.floor(waitingDays / 14) * 2), text: 'It’s been patient.' });

  const score = Math.max(0, Math.min(100, NEUTRAL_SCORE + signals.reduce((sum, s) => sum + s.points, 0)));
  return { idea, score, signals, usesStep, resting: isResting(idea, m, now), why: explain(idea, m, signals, usesStep) };
}

/** The one or two plain sentences shown on a note. */
export function explain(idea: Idea, m: Moment, signals: Signal[], usesStep: boolean): string {
  const skyish = signals.filter((s) => s.key === 'sky' || s.key === 'hour');
  const worst = skyish.find((s) => s.tone === 'poor');
  const likesSky = skyish.some((s) => s.key === 'sky' && s.tone === 'good');
  const likesHour = skyish.some((s) => s.key === 'hour' && s.tone === 'good');
  // Credit only what actually helped: a phone call isn't good "for a sunny afternoon"
  // just because it suits afternoons.
  const first = worst
    ? worst.text
    : likesSky && likesHour
      ? `Good for ${skyPhrase(m)}.`
      : likesSky
        ? `Good for ${weatherWord(m.weather, m.time)} weather.`
        : likesHour
          ? `Good for the ${m.time}.`
          : 'Nothing about today stands in its way.';
  const second = usesStep
    ? `The first step takes about ${durationPhrase(currentStepMinutes(idea))}.`
    : `Takes about ${durationPhrase(effectiveMinutes(idea))}.`;
  return `${first} ${second}`;
}

/** Best first. Ties fall back to the oldest idea, so the order never flickers. */
export function rankIdeas(ideas: Idea[], m: Moment, now: number): Match[] {
  return ideas
    .filter((i) => i.doneAt === undefined)
    .map((i) => matchIdea(i, m, now))
    .sort(
      (a, b) =>
        Number(a.resting) - Number(b.resting) ||
        b.score - a.score ||
        a.idea.createdAt - b.idea.createdAt ||
        a.idea.id.localeCompare(b.idea.id),
    );
}

/** Up to three that genuinely fit. Fewer, or none, is an honest answer. */
export const withinReach = (ranked: Match[]) =>
  ranked.filter((r) => !r.resting && r.score >= REACH_SCORE).slice(0, REACH_COUNT);

export const KIND_ANGLE: Record<Kind, number> = { wander: 0, make: 90, learn: 180, tend: 270 };

/** Where the needle points: the score-weighted direction of what's within reach, in degrees. */
export function vaneHeading(reach: Match[]): { angle: number; kind: Kind | null } {
  if (reach.length === 0) return { angle: 0, kind: null };
  let x = 0;
  let y = 0;
  const weight: Partial<Record<Kind, number>> = {};
  for (const { idea, score } of reach) {
    const r = (KIND_ANGLE[idea.kind] * Math.PI) / 180;
    x += Math.sin(r) * score;
    y += Math.cos(r) * score;
    weight[idea.kind] = (weight[idea.kind] ?? 0) + score;
  }
  const kind = (Object.entries(weight) as [Kind, number][]).sort((a, b) => b[1] - a[1])[0][0];
  // Opposing kinds can cancel out exactly; point at the strongest instead of nowhere.
  if (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6) return { angle: KIND_ANGLE[kind], kind };
  return { angle: ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360, kind };
}
