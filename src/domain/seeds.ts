import type { Idea, IdeaDraft } from './types';

const DAY = 86_400_000;

type Seed = IdeaDraft & { key: string; ageDays: number };

const SEEDS: Seed[] = [
  { key: 'bridge', title: 'Photograph the old bridge in low light', kind: 'wander', place: 'outdoors', skies: ['clear'], times: ['afternoon', 'evening'], minutes: 45, energy: 'medium', step: 'Put your camera in your coat and walk to the end of the street.', stepMinutes: 5, ageDays: 19 },
  { key: 'market', title: 'Walk home the long way, through the market', kind: 'wander', place: 'outdoors', skies: ['clear', 'cloudy'], times: ['afternoon'], minutes: 30, energy: 'low', step: 'Take the first left you usually skip.', stepMinutes: 5, ageDays: 6 },
  { key: 'snow', title: 'Catch the first snow on film', kind: 'wander', place: 'outdoors', skies: ['snow'], times: [], minutes: 20, energy: 'low', step: 'Step outside and take one picture.', stepMinutes: 2, ageDays: 40 },
  { key: 'stars', title: 'Find the one constellation I can never find', kind: 'wander', place: 'anywhere', skies: ['clear'], times: ['night'], minutes: 5, energy: 'low', step: 'Open a window and look up.', stepMinutes: 1, ageDays: 11 },
  { key: 'site', title: 'Build a tiny website for my photographs', kind: 'make', place: 'indoors', skies: [], times: ['morning', 'afternoon'], minutes: 120, energy: 'high', step: 'Pick the five photos it would open with.', stepMinutes: 10, ageDays: 33 },
  { key: 'song', title: 'Write down the song stuck in my head', kind: 'make', place: 'indoors', skies: [], times: ['evening', 'night'], minutes: 45, energy: 'medium', step: 'Hum it into a voice memo, badly.', stepMinutes: 2, ageDays: 8 },
  { key: 'sketch', title: 'Sketch the view from this window', kind: 'make', place: 'indoors', skies: ['rain', 'cloudy'], times: [], minutes: 20, energy: 'low', step: 'Find a pen. Draw just the line of the rooftops.', stepMinutes: 3, ageDays: 3 },
  { key: 'novel', title: 'Start The Left Hand of Darkness', kind: 'learn', place: 'indoors', skies: ['rain', 'snow'], times: ['evening', 'night'], minutes: 25, energy: 'low', step: 'Read one page. You’re allowed to stop there.', stepMinutes: 3, ageDays: 27 },
  { key: 'tides', title: 'Finally understand how tides work', kind: 'learn', place: 'anywhere', skies: [], times: [], minutes: 15, energy: 'medium', step: 'Watch one short explainer, at any speed.', stepMinutes: 5, ageDays: 15 },
  { key: 'italian', title: 'Learn ten words of Italian before the trip', kind: 'learn', place: 'anywhere', skies: [], times: ['morning'], minutes: 15, energy: 'medium', step: 'Learn one word. Try “finalmente.”', stepMinutes: 1, ageDays: 5 },
  { key: 'grandma', title: 'Call Grandma, no agenda', kind: 'tend', place: 'anywhere', skies: [], times: ['afternoon', 'evening'], minutes: 20, energy: 'medium', step: 'Text to ask if now is a good time.', stepMinutes: 1, ageDays: 9 },
  { key: 'soup', title: 'Make soup from whatever’s in the fridge', kind: 'tend', place: 'indoors', skies: ['rain', 'snow', 'cloudy'], times: ['evening'], minutes: 40, energy: 'low', step: 'Put a pot on the stove. That’s the hard part.', stepMinutes: 2, ageDays: 2 },
  { key: 'stretch', title: 'Stretch for five minutes before bed', kind: 'tend', place: 'indoors', skies: [], times: ['night'], minutes: 5, energy: 'low', step: 'Sit on the floor. See what happens.', stepMinutes: 1, ageDays: 13 },
  { key: 'chair', title: 'Rescue the chair that became a wardrobe', kind: 'tend', place: 'indoors', skies: [], times: ['morning'], minutes: 15, energy: 'medium', step: 'Hang up one thing.', stepMinutes: 1, ageDays: 22 },
];

const FINISHED: (Seed & { doneDaysAgo: number; doneIn: NonNullable<Idea['doneIn']> })[] = [
  { key: 'pier', title: 'Take the camera down to the pier', kind: 'wander', place: 'outdoors', skies: ['clear'], times: ['afternoon'], minutes: 40, energy: 'medium', step: 'Charge the battery.', stepMinutes: 2, ageDays: 30, doneDaysAgo: 9, doneIn: { weather: 'clear', time: 'evening' } },
  { key: 'dream', title: 'Write down the lighthouse dream', kind: 'make', place: 'indoors', skies: [], times: ['morning'], minutes: 10, energy: 'low', step: 'Open a note and write the first image.', stepMinutes: 1, ageDays: 12, doneDaysAgo: 3, doneIn: { weather: 'rain', time: 'morning' } },
];

export function seedIdeas(now: number): Idea[] {
  const live: Idea[] = SEEDS.map(({ key, ageDays, ...draft }) => ({
    ...draft,
    id: `sample-${key}`,
    shrink: 0,
    sample: true,
    createdAt: now - ageDays * DAY,
    steps: [],
  }));
  const finished: Idea[] = FINISHED.map(({ key, ageDays, doneDaysAgo, doneIn, ...draft }) => ({
    ...draft,
    id: `sample-${key}`,
    shrink: 0,
    sample: true,
    createdAt: now - ageDays * DAY,
    steps: [],
    doneAt: now - doneDaysAgo * DAY,
    doneIn,
  }));
  return [...live, ...finished];
}
