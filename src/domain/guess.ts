import type { Energy, IdeaDraft, Kind, Place, TimeOfDay, Weather } from './types';

/**
 * Capture has to stay one line, so a new idea gets sensible details from simple
 * keyword rules. Guesses are shown to the user straight away and are editable.
 */

const KIND_WORDS: [Kind, RegExp][] = [
  ['wander', /\b(walk|hike|stroll|wander|run|jog|bike|cycle|picnic|beach|park|forest|photo\w*|camera|sunset|sunrise|explore|swim|garden|outside|outdoors?)\b/i],
  ['learn', /\b(read|book|chapter|novel|learn|study|course|understand|podcast|language|documentary|research|lecture|article)\b/i],
  ['tend', /\b(call|visit|text|mum|mom|dad|grandma|grandpa|friend|sister|brother|cook|bake|soup|clean|tidy|declutter|laundry|sleep|nap|stretch|yoga|meditate|repot|plants?)\b/i],
  ['make', /\b(build|write|paint|draw|sketch|code|song|compose|design|website|knit|sew|project|blog|poem|film|craft|make)\b/i],
];

const STEPS: Record<Kind, [string, number]> = {
  wander: ['Put your shoes by the door.', 2],
  make: ['Open a blank page and write the title.', 5],
  learn: ['Find it, and read the first paragraph.', 5],
  tend: ['Do the very first, smallest bit of it.', 5],
};

const GENTLE: Record<Kind, string[]> = {
  wander: ['Step outside for five minutes. You can turn back at the corner.', 'Open a window and decide where you’d go.', 'Look it up on a map. No leaving required.'],
  make: ['Set a timer for five minutes and make something bad on purpose.', 'Write one sentence about what it would be.', 'Put what you’d need on the table. Nothing else.'],
  learn: ['Read for five minutes, then stop, even mid-sentence.', 'Find the thing and leave it open somewhere you’ll see it.', 'Write down the one question you’d like answered.'],
  tend: ['Do five minutes of it and call that a win.', 'Decide when you’d like to do it, and write that down.', 'Do the part that takes one single minute.'],
};

export const GENTLE_LEVELS = 3;
export const gentleStep = (kind: Kind, level: number) => GENTLE[kind][Math.max(0, (level - 1) % GENTLE_LEVELS)];
export const starterStep = (kind: Kind) => STEPS[kind];

function guessMinutes(title: string, kind: Kind): number {
  const hours = title.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b/i);
  if (hours) return Math.max(5, Math.min(480, Math.round(parseFloat(hours[1]) * 60)));
  const mins = title.match(/(\d+)\s*(?:m|min|mins|minutes?)\b/i);
  if (mins) return Math.max(1, Math.min(480, parseInt(mins[1], 10)));
  if (/\b(quick|quickly|short|tiny|small)\b/i.test(title)) return 10;
  if (/\b(project|build|website|finish|course|hike)\b/i.test(title)) return 90;
  return { wander: 30, make: 45, learn: 20, tend: 20 }[kind];
}

function guessEnergy(title: string, minutes: number): Energy {
  if (/\b(run|jog|hike|build|clean|declutter|swim|workout)\b/i.test(title) || minutes >= 90) return 'high';
  if (/\b(read|nap|rest|sleep|stretch|listen|podcast|call|text)\b/i.test(title) || minutes <= 10) return 'low';
  return 'medium';
}

function guessPlace(title: string, kind: Kind): Place {
  if (kind === 'wander') return 'outdoors';
  if (/\b(bake|cook|tidy|clean|declutter|laundry|desk|repot)\b/i.test(title)) return 'indoors';
  return 'anywhere';
}

function guessTimes(title: string): TimeOfDay[] {
  const t: TimeOfDay[] = [];
  if (/\b(morning|sunrise|breakfast)\b/i.test(title)) t.push('morning');
  if (/\b(afternoon|lunch)\b/i.test(title)) t.push('afternoon');
  if (/\b(evening|sunset|dinner)\b/i.test(title)) t.push('evening');
  if (/\b(night|stars?|moon|bedtime|before bed)\b/i.test(title)) t.push('night');
  return t;
}

function guessSkies(title: string, place: Place): Weather[] {
  if (/\b(rain|rainy|puddles?)\b/i.test(title)) return ['rain'];
  if (/\b(snow|snowy)\b/i.test(title)) return ['snow'];
  if (place === 'outdoors' || /\b(stars?|sunset|sunrise|sun|sunny)\b/i.test(title)) return ['clear'];
  return [];
}

export function guessDraft(rawTitle: string): IdeaDraft {
  const title = rawTitle.trim();
  const kind = KIND_WORDS.find(([, re]) => re.test(title))?.[0] ?? 'make';
  const minutes = guessMinutes(title, kind);
  const place = guessPlace(title, kind);
  const [step, stepMinutes] = STEPS[kind];
  return {
    title,
    kind,
    place,
    skies: guessSkies(title, place),
    times: guessTimes(title),
    minutes,
    energy: guessEnergy(title, minutes),
    step,
    stepMinutes: Math.min(stepMinutes, minutes),
  };
}
