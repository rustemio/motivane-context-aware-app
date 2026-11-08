import { describe, expect, it, vi } from 'vitest';
import { fetchReading, weatherFromCode, WeatherError } from '../adapters/weather';
import { guessDraft } from './guess';
import { contrast, paletteFor } from './palette';
import { initialState, newIdea, reducer } from './state';
import { BACKUP_KEY, loadState, sanitizeIdea, saveState, STORAGE_KEY, type StorageLike } from './storage';
import { TIMES, WEATHERS } from './types';

const NOW = Date.UTC(2026, 9, 31, 18);

function memory(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

describe('persistence', () => {
  it('round-trips ideas and context', () => {
    const store = memory();
    let state = reducer(initialState(NOW), { type: 'add', idea: newIdea(guessDraft('Paint the door'), NOW, 'mine') });
    state = reducer(state, { type: 'moment', moment: { weather: 'snow', time: 'night', minutes: 5, energy: 'high' }, source: { kind: 'manual' } });
    state = reducer(state, { type: 'intro-done' });
    expect(saveState(store, state)).toBe(true);
    const loaded = loadState(store, NOW);
    expect(loaded.notice).toBeNull();
    expect(loaded.state).toEqual(state);
  });

  it('seeds a first visit with no notice', () => {
    const { state, notice } = loadState(memory(), NOW);
    expect(notice).toBeNull();
    expect(state.ideas.length).toBeGreaterThan(5);
    expect(state.introSeen).toBe(false);
    expect(state.source.kind).toBe('demo');
  });

  it('starts fresh and backs up data that cannot be parsed', () => {
    const store = memory({ [STORAGE_KEY]: '{oops' });
    const { state, notice } = loadState(store, NOW);
    expect(notice).toBe('unreadable');
    expect(state.ideas.length).toBeGreaterThan(0);
    expect(store.data[BACKUP_KEY]).toBe('{oops');
  });

  it('treats valid JSON of the wrong shape as unreadable', () => {
    for (const bad of ['[]', 'null', '7', '"text"']) {
      expect(loadState(memory({ [STORAGE_KEY]: bad }), NOW).notice).toBe('unreadable');
    }
  });

  it('keeps good ideas and reports when bad ones are dropped', () => {
    const store = memory({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        ideas: [{ id: 'ok', title: 'Keep me' }, { id: 'no-title' }, null, 'junk', { id: 'ok', title: 'Duplicate' }],
      }),
    });
    const { state, notice } = loadState(store, NOW);
    expect(notice).toBe('recovered');
    expect(state.ideas.map((i) => i.title)).toEqual(['Keep me']);
  });

  it('fills in fields an older save never had', () => {
    const store = memory({ [STORAGE_KEY]: JSON.stringify({ version: 0, ideas: [{ id: 'old', title: 'From before', minutes: 30 }] }) });
    const { state, notice } = loadState(store, NOW);
    expect(notice).toBeNull();
    expect(state.ideas[0]).toMatchObject({ title: 'From before', kind: 'make', place: 'anywhere', energy: 'medium', skies: [], steps: [], shrink: 0, sample: false });
    expect(state.moment.weather).toBeDefined();
  });

  it('cleans invalid values rather than trusting them', () => {
    const idea = sanitizeIdea({ id: 'a', title: '  Hi  ', kind: 'dance', energy: 11, minutes: -9, stepMinutes: 900, skies: ['rain', 'lava', 'rain'], createdAt: NOW + 99999, restUntil: NOW - 5 }, NOW)!;
    expect(idea).toMatchObject({ title: 'Hi', kind: 'make', energy: 'medium', minutes: 1, stepMinutes: 1, skies: ['rain'], createdAt: NOW });
    expect(idea.restUntil).toBeUndefined();
  });

  it('does not let an old reading keep claiming to be live', () => {
    const store = memory({ [STORAGE_KEY]: JSON.stringify({ ideas: [], source: { kind: 'live', fetchedAt: NOW - 3_600_000 } }) });
    expect(loadState(store, NOW).state.source.kind).toBe('clock');
  });

  it('survives storage that throws', () => {
    const hostile: StorageLike = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => {},
    };
    expect(loadState(hostile, NOW).notice).toBe('unavailable');
    expect(loadState(null, NOW).notice).toBe('unavailable');
    expect(saveState(hostile, initialState(NOW))).toBe(false);
  });
});

describe('weather adapter', () => {
  it('maps WMO codes', () => {
    expect([0, 3, 61, 73, 95, 200].map(weatherFromCode)).toEqual(['clear', 'cloudy', 'rain', 'snow', 'rain', 'rain']);
    expect(weatherFromCode(22)).toBeNull();
  });

  it('rounds coordinates before sending them', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ current: { weather_code: 61, temperature_2m: 9.4 } })));
    await expect(fetchReading(39.92077, 32.85411, fetchImpl as unknown as typeof fetch)).resolves.toEqual({ weather: 'rain', tempC: 9.4 });
    const calls = fetchImpl.mock.calls as unknown as [string][];
    expect(calls[0][0]).toContain('latitude=39.92&longitude=32.85');
  });

  it('fails with a typed error on bad responses', async () => {
    const bad = [
      async () => new Response('nope', { status: 500 }),
      async () => new Response('{}'),
      async () => { throw new TypeError('offline'); },
    ];
    for (const fetchImpl of bad) {
      await expect(fetchReading(1, 1, fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(WeatherError);
    }
  });
});

describe('sky palettes', () => {
  it('keeps text readable in every sky', () => {
    for (const time of TIMES) {
      for (const weather of WEATHERS) {
        const p = paletteFor(time, weather);
        expect(contrast(p.cloud, p.cloudInk), `${weather} ${time} cloud`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.sky2, p.onSky), `${weather} ${time} sky`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
