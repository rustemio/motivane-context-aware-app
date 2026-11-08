import { describe, expect, it } from 'vitest';
import { guessDraft } from './guess';
import { layoutHanging } from './layout';
import { currentStep, matchIdea, rankIdeas, vaneHeading, withinReach, REACH_SCORE } from './matching';
import { PRESETS } from './moment';
import { reducer, initialState, newIdea } from './state';
import { seedIdeas } from './seeds';
import type { Idea, Moment } from './types';

const NOW = Date.UTC(2026, 9, 31, 18);

function idea(over: Partial<Idea> = {}): Idea {
  return {
    id: 'x', title: 'Test idea', kind: 'make', place: 'anywhere', skies: [], times: [],
    minutes: 15, energy: 'low', step: 'Start.', stepMinutes: 5, shrink: 0, sample: false,
    createdAt: NOW, steps: [], ...over,
  };
}

const moment = (over: Partial<Moment> = {}): Moment => ({ weather: 'rain', time: 'evening', minutes: 30, energy: 'low', ...over });
const titlesFor = (id: string) => {
  const preset = PRESETS.find((p) => p.id === id)!;
  return withinReach(rankIdeas(seedIdeas(NOW), preset.moment, NOW)).map((m) => m.idea.id);
};

describe('explanations', () => {
  it('says why in plain language', () => {
    const m = matchIdea(idea({ place: 'indoors', skies: ['rain'], times: ['evening'] }), moment(), NOW);
    expect(m.why).toBe('Good for a rainy evening. Takes about 15 minutes.');
  });

  it('says when only the first step fits', () => {
    const m = matchIdea(idea({ minutes: 120 }), moment({ minutes: 15 }), NOW);
    expect(m.usesStep).toBe(true);
    expect(m.why).toContain('The first step takes about 5 minutes.');
  });

  it('names what holds an outdoor idea back in the rain', () => {
    const m = matchIdea(idea({ place: 'outdoors' }), moment(), NOW);
    expect(m.why).toContain('Better on a dry day.');
  });
});

describe('rules', () => {
  it('is deterministic', () => {
    const run = () => rankIdeas(seedIdeas(NOW), moment(), NOW).map((m) => [m.idea.id, m.score]);
    expect(run()).toEqual(run());
  });

  it('prefers an outdoor idea on a clear day over a rainy one', () => {
    const walk = idea({ place: 'outdoors' });
    expect(matchIdea(walk, moment({ weather: 'clear', time: 'afternoon' }), NOW).score)
      .toBeGreaterThan(matchIdea(walk, moment({ weather: 'rain', time: 'afternoon' }), NOW).score);
  });

  it('lets an idea that asks for snow be outdoors in the snow', () => {
    const snow = idea({ place: 'outdoors', skies: ['snow'] });
    expect(matchIdea(snow, moment({ weather: 'snow', time: 'morning' }), NOW).score).toBeGreaterThanOrEqual(REACH_SCORE);
  });

  it('marks down outdoor plans in extreme live temperatures only', () => {
    const walk = idea({ place: 'outdoors' });
    const mild = matchIdea(walk, moment({ weather: 'clear', time: 'afternoon', tempC: 18 }), NOW).score;
    const bitter = matchIdea(walk, moment({ weather: 'clear', time: 'afternoon', tempC: -6 }), NOW).score;
    expect(bitter).toBeLessThan(mild);
  });

  it('never leaves the 0 to 100 range', () => {
    const extremes = [
      idea({ place: 'outdoors', energy: 'high', minutes: 400, stepMinutes: 200, times: ['morning'] }),
      idea({ skies: ['rain'], times: ['evening'], createdAt: NOW - 400 * 86_400_000 }),
    ];
    for (const i of extremes) {
      const { score } = matchIdea(i, moment({ minutes: 5 }), NOW);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('breaks ties by age, so the order never flickers', () => {
    const older = idea({ id: 'b', createdAt: NOW - 1000 });
    const newer = idea({ id: 'a', createdAt: NOW });
    expect(rankIdeas([newer, older], moment(), NOW).map((m) => m.idea.id)).toEqual(['b', 'a']);
  });

  it('shrinking an idea really changes how it matches', () => {
    const big = idea({ minutes: 120, energy: 'high', stepMinutes: 30 });
    const m = moment({ minutes: 5 });
    const before = matchIdea(big, m, NOW);
    const after = matchIdea({ ...big, shrink: 1 }, m, NOW);
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.usesStep).toBe(false);
    expect(currentStep({ ...big, shrink: 1 })).not.toBe(big.step);
  });
});

describe('within reach', () => {
  it('shows at most three, all above the bar', () => {
    for (const p of PRESETS) {
      const reach = withinReach(rankIdeas(seedIdeas(NOW), p.moment, NOW));
      expect(reach.length).toBeLessThanOrEqual(3);
      reach.forEach((m) => expect(m.score).toBeGreaterThanOrEqual(REACH_SCORE));
    }
  });

  it('gives each demo sky three ideas, so the demo always has something to show', () => {
    for (const p of PRESETS) expect(titlesFor(p.id), p.id).toHaveLength(3);
  });

  it('changes visibly between demo skies', () => {
    const rainy = titlesFor('rainy-evening');
    const sunny = titlesFor('sunny-afternoon');
    expect(rainy).toContain('sample-novel');
    expect(sunny).toContain('sample-bridge');
    expect(rainy.filter((id) => sunny.includes(id))).toEqual([]);
  });

  it('brings the snow idea down only in snow', () => {
    expect(titlesFor('snow-morning')).toContain('sample-snow');
    expect(titlesFor('sunny-afternoon')).not.toContain('sample-snow');
  });

  it('is empty rather than dishonest when nothing fits', () => {
    const outdoors = idea({ place: 'outdoors', times: ['morning'], energy: 'high', minutes: 200, stepMinutes: 60 });
    expect(withinReach(rankIdeas([outdoors], moment({ minutes: 5 }), NOW))).toEqual([]);
  });

  it('skips resting and finished ideas', () => {
    const good: Partial<Idea> = { place: 'indoors', skies: ['rain'], times: ['evening'] };
    const ideas = [
      idea({ id: 'resting', ...good, restUntil: NOW + 1000 }),
      idea({ id: 'done', ...good, doneAt: NOW - 1 }),
      idea({ id: 'free', ...good }),
    ];
    expect(withinReach(rankIdeas(ideas, moment(), NOW)).map((m) => m.idea.id)).toEqual(['free']);
  });
});

describe('the vane', () => {
  it('points at what is within reach', () => {
    const reach = rankIdeas([idea({ kind: 'learn', skies: ['rain'] })], moment(), NOW);
    expect(vaneHeading(reach)).toEqual({ angle: 180, kind: 'learn' });
  });

  it('still points somewhere when kinds cancel out', () => {
    const reach = rankIdeas([idea({ id: 'a', kind: 'wander' }), idea({ id: 'b', kind: 'learn' })], moment(), NOW);
    const heading = vaneHeading(reach);
    expect(heading.kind).not.toBeNull();
    expect(Number.isFinite(heading.angle)).toBe(true);
  });
});

describe('guessing from a title', () => {
  it('reads kind, place and sky', () => {
    expect(guessDraft('Photograph the old bridge')).toMatchObject({ kind: 'wander', place: 'outdoors', skies: ['clear'] });
    expect(guessDraft('Read a chapter')).toMatchObject({ kind: 'learn', energy: 'low' });
    expect(guessDraft('Call my sister')).toMatchObject({ kind: 'tend' });
  });

  it('reads explicit durations and time words', () => {
    expect(guessDraft('Write for 10 minutes').minutes).toBe(10);
    expect(guessDraft('Paint for 2 hours').minutes).toBe(120);
    expect(guessDraft('Watch the sunset').times).toEqual(['evening']);
  });

  it('does not match inside other words', () => {
    expect(guessDraft('Reorganise the spreadsheet').kind).toBe('make');
  });

  it('never gives a first step longer than the idea', () => {
    const d = guessDraft('Tiny poem, 1 min');
    expect(d.stepMinutes).toBeLessThanOrEqual(d.minutes);
  });
});

describe('the action loop', () => {
  const base = () => reducer(initialState(NOW), { type: 'add', idea: newIdea(guessDraft('My own idea'), NOW, 'mine') });

  it('records the weather an idea was finished in', () => {
    const next = reducer(base(), { type: 'finish', id: 'mine', now: NOW });
    const mine = next.ideas.find((i) => i.id === 'mine')!;
    expect(mine.doneAt).toBe(NOW);
    expect(mine.doneIn).toEqual({ weather: 'rain', time: 'evening' });
    expect(reducer(next, { type: 'unfinish', id: 'mine' }).ideas.find((i) => i.id === 'mine')!.doneAt).toBeUndefined();
  });

  it('rests until the sky changes, and stays awake when it comes back', () => {
    let s = reducer(base(), { type: 'rest-sky', id: 'mine' });
    const mine = () => s.ideas.find((i) => i.id === 'mine')!;
    expect(matchIdea(mine(), s.moment, NOW).resting).toBe(true);
    // Only energy changed: same sky, still resting.
    s = reducer(s, { type: 'moment', moment: { ...s.moment, energy: 'high' } });
    expect(matchIdea(mine(), s.moment, NOW).resting).toBe(true);
    const original = s.moment;
    s = reducer(s, { type: 'moment', moment: { ...original, weather: 'clear' } });
    expect(matchIdea(mine(), s.moment, NOW).resting).toBe(false);
    s = reducer(s, { type: 'moment', moment: original });
    expect(matchIdea(mine(), s.moment, NOW).resting).toBe(false);
  });

  it('wakes on its own after a timed rest', () => {
    const s = reducer(base(), { type: 'rest-until', id: 'mine', until: NOW + 1000 });
    const mine = s.ideas.find((i) => i.id === 'mine')!;
    expect(matchIdea(mine, s.moment, NOW).resting).toBe(true);
    expect(matchIdea(mine, s.moment, NOW + 2000).resting).toBe(false);
  });

  it('logs a small step and adopts the next one', () => {
    const s = reducer(base(), { type: 'log-step', id: 'mine', now: NOW, next: 'Write one line.' });
    const mine = s.ideas.find((i) => i.id === 'mine')!;
    expect(mine.steps).toHaveLength(1);
    expect(mine.step).toBe('Write one line.');
    expect(mine.doneAt).toBeUndefined();
  });

  it('cycles shrinking and returns to the original step', () => {
    let s = base();
    for (let i = 0; i < 3; i++) s = reducer(s, { type: 'shrink', id: 'mine' });
    expect(s.ideas.find((i) => i.id === 'mine')!.shrink).toBe(3);
    s = reducer(s, { type: 'shrink', id: 'mine' });
    expect(s.ideas.find((i) => i.id === 'mine')!.shrink).toBe(0);
  });

  it('reset-demo restores samples and leaves personal ideas alone', () => {
    let s = base();
    s = reducer(s, { type: 'remove', id: 'sample-novel' });
    s = reducer(s, { type: 'finish', id: 'sample-soup', now: NOW });
    s = reducer(s, { type: 'finish', id: 'mine', now: NOW });
    s = reducer(s, { type: 'reset-demo', now: NOW });
    expect(s.ideas.find((i) => i.id === 'sample-novel')).toBeDefined();
    expect(s.ideas.find((i) => i.id === 'sample-soup')!.doneAt).toBeUndefined();
    expect(s.ideas.find((i) => i.id === 'mine')!.doneAt).toBe(NOW);
    expect(new Set(s.ideas.map((i) => i.id)).size).toBe(s.ideas.length);
  });

  it('remove-samples leaves only personal ideas', () => {
    expect(reducer(base(), { type: 'remove-samples' }).ideas.map((i) => i.id)).toEqual(['mine']);
  });
});

describe('hanging layout', () => {
  const ranked = rankIdeas(seedIdeas(NOW), PRESETS[0].moment, NOW);
  const reach = withinReach(ranked);

  it('hangs what is within reach lowest', () => {
    const { positions } = layoutHanging(ranked, reach, 1440, 700, 1000);
    const reachIds = new Set(reach.map((m) => m.idea.id));
    const lowestTucked = Math.max(...ranked.filter((m) => !reachIds.has(m.idea.id)).map((m) => positions.get(m.idea.id)!.y));
    reach.forEach((m) => expect(positions.get(m.idea.id)!.y).toBeGreaterThan(lowestTucked));
  });

  it('positions every idea, and counts the ones that spill over', () => {
    for (const [w, h] of [[1440, 1000], [1280, 720], [375, 812]]) {
      const { positions, overflow } = layoutHanging(ranked, reach, w, 500, h);
      expect(positions.size).toBe(ranked.length);
      const hidden = [...positions.values()].filter((p) => p.size === 'hidden').length;
      expect(hidden).toBe(overflow);
    }
  });

  it('keeps notes on screen at phone width', () => {
    const { positions } = layoutHanging(ranked, reach, 375, 500, 812);
    for (const p of positions.values()) {
      if (p.size === 'hidden') continue;
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(375);
    }
  });
});
