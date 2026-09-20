import { describe, expect, it } from 'vitest';
import { blockers, check, hourInWindow, metresBetween, sortByState, stateOf } from './engine';
import type { Note, World } from './types';

/*
  Движок проверяется целиком отсюда: он чистый, устройство ему не нужно.
  Мир задаётся руками, включая дырки в нём, — отказ в геопозиции и отсутствие
  погоды проверяются так же, как ясное небо.
*/

const noon = Date.UTC(2026, 8, 20, 12, 0);

const world = (over: Partial<World> = {}): World => ({
  at: noon,
  hour: 15,
  weekday: 0,
  sky: 'clear',
  tempC: 21,
  sunrise: Date.UTC(2026, 8, 20, 4, 0),
  sunset: Date.UTC(2026, 8, 20, 16, 0),
  here: { lat: 39.9334, lon: 32.8597 }, // Анкара
  ...over,
});

const note = (needs: Note['needs'], over: Partial<Note> = {}): Note => ({
  id: 'n1',
  text: 'проверочная заметка',
  created: 0,
  needs,
  ...over,
});

describe('расстояние', () => {
  it('между Анкарой и Уфой около 2375 км', () => {
    const m = metresBetween({ lat: 39.9334, lon: 32.8597 }, { lat: 54.7351, lon: 55.9587 });
    expect(m / 1000).toBeGreaterThan(2350);
    expect(m / 1000).toBeLessThan(2400);
  });

  it('до самой себя — ноль', () => {
    const p = { lat: 39.9334, lon: 32.8597 };
    expect(metresBetween(p, p)).toBe(0);
  });

  it('симметрично', () => {
    const a = { lat: 41.0, lon: 29.0 };
    const b = { lat: 40.0, lon: 28.0 };
    expect(metresBetween(a, b)).toBeCloseTo(metresBetween(b, a), 6);
  });
});

describe('окно часов', () => {
  it('обычное окно не включает правую границу', () => {
    expect(hourInWindow(9, 9, 18)).toBe(true);
    expect(hourInWindow(17, 9, 18)).toBe(true);
    expect(hourInWindow(18, 9, 18)).toBe(false);
    expect(hourInWindow(8, 9, 18)).toBe(false);
  });

  it('окно через полночь берёт обе стороны суток', () => {
    expect(hourInWindow(23, 22, 6)).toBe(true);
    expect(hourInWindow(3, 22, 6)).toBe(true);
    expect(hourInWindow(21, 22, 6)).toBe(false);
    expect(hourInWindow(6, 22, 6)).toBe(false);
  });

  it('окно в один час — ровно этот час', () => {
    expect(hourInWindow(7, 7, 7)).toBe(true);
    expect(hourInWindow(8, 7, 7)).toBe(false);
  });
});

describe('небо', () => {
  it('совпало — да, не совпало — нет', () => {
    expect(check({ kind: 'sky', is: 'rain' }, world({ sky: 'rain' }))).toBe('yes');
    expect(check({ kind: 'sky', is: 'rain' }, world({ sky: 'clear' }))).toBe('no');
  });

  it('без погоды — не знаю, а не «нет»', () => {
    expect(check({ kind: 'sky', is: 'rain' }, world({ sky: undefined }))).toBe('unknown');
  });
});

describe('температура', () => {
  it('держит обе границы', () => {
    const warm = { kind: 'temp', min: 15, max: 28 } as const;
    expect(check(warm, world({ tempC: 21 }))).toBe('yes');
    expect(check(warm, world({ tempC: 14 }))).toBe('no');
    expect(check(warm, world({ tempC: 29 }))).toBe('no');
  });

  it('границы входят в интервал', () => {
    const warm = { kind: 'temp', min: 15, max: 28 } as const;
    expect(check(warm, world({ tempC: 15 }))).toBe('yes');
    expect(check(warm, world({ tempC: 28 }))).toBe('yes');
  });

  it('одна граница работает без второй', () => {
    expect(check({ kind: 'temp', min: 0 }, world({ tempC: -5 }))).toBe('no');
    expect(check({ kind: 'temp', max: 0 }, world({ tempC: -5 }))).toBe('yes');
  });

  it('ноль градусов — это значение, а не пропуск', () => {
    expect(check({ kind: 'temp', min: 0 }, world({ tempC: 0 }))).toBe('yes');
    expect(check({ kind: 'temp', min: 1 }, world({ tempC: 0 }))).toBe('no');
  });

  it('без градусника — не знаю', () => {
    expect(check({ kind: 'temp', min: 15 }, world({ tempC: undefined }))).toBe('unknown');
  });
});

describe('свет', () => {
  const day = { kind: 'light', is: 'day' } as const;
  const night = { kind: 'light', is: 'night' } as const;

  it('полдень между восходом и закатом — день', () => {
    expect(check(day, world())).toBe('yes');
    expect(check(night, world())).toBe('no');
  });

  it('после заката — ночь', () => {
    const late = world({ at: Date.UTC(2026, 8, 20, 20, 0) });
    expect(check(day, late)).toBe('no');
    expect(check(night, late)).toBe('yes');
  });

  it('момент заката уже ночь, момент восхода уже день', () => {
    expect(check(day, world({ at: Date.UTC(2026, 8, 20, 16, 0) }))).toBe('no');
    expect(check(day, world({ at: Date.UTC(2026, 8, 20, 4, 0) }))).toBe('yes');
  });

  it('без восхода и заката — не знаю', () => {
    expect(check(day, world({ sunrise: undefined }))).toBe('unknown');
    expect(check(day, world({ sunset: undefined }))).toBe('unknown');
  });
});

describe('день недели', () => {
  it('будни и выходные', () => {
    const weekend = { kind: 'weekday', days: [0, 6] } as const;
    expect(check(weekend, world({ weekday: 0 }))).toBe('yes');
    expect(check(weekend, world({ weekday: 3 }))).toBe('no');
  });

  it('пустой список не выполняется никогда', () => {
    expect(check({ kind: 'weekday', days: [] }, world())).toBe('no');
  });
});

describe('место', () => {
  const home = { kind: 'place', lat: 39.9334, lon: 32.8597, within: 500, label: 'дом' } as const;

  it('внутри радиуса — да', () => {
    expect(check(home, world())).toBe('yes');
  });

  it('за радиусом — нет', () => {
    expect(check(home, world({ here: { lat: 54.7351, lon: 55.9587 } }))).toBe('no');
  });

  it('без геопозиции — не знаю, заметка не врёт', () => {
    expect(check(home, world({ here: undefined }))).toBe('unknown');
  });
});

describe('состояние заметки', () => {
  it('все условия сошлись — созрела', () => {
    const n = note([
      { kind: 'sky', is: 'clear' },
      { kind: 'hours', from: 9, to: 18 },
    ]);
    expect(stateOf(n, world())).toBe('ripe');
  });

  it('заметка без условий созрела всегда', () => {
    expect(stateOf(note([]), world({ sky: undefined, here: undefined }))).toBe('ripe');
  });

  it('одно «нет» — ждёт', () => {
    const n = note([
      { kind: 'sky', is: 'clear' },
      { kind: 'hours', from: 22, to: 23 },
    ]);
    expect(stateOf(n, world())).toBe('waiting');
  });

  it('«нет» весомее «не знаю»', () => {
    const n = note([
      { kind: 'place', lat: 0, lon: 0, within: 100, label: 'нигде' },
      { kind: 'hours', from: 22, to: 23 },
    ]);
    expect(stateOf(n, world({ here: undefined }))).toBe('waiting');
  });

  it('всё возможное сошлось, но чего-то не знаем — не уверена', () => {
    const n = note([
      { kind: 'hours', from: 9, to: 18 },
      { kind: 'sky', is: 'rain' },
    ]);
    expect(stateOf(n, world({ sky: undefined }))).toBe('unsure');
  });
});

describe('что держит заметку', () => {
  it('возвращает только невыполненные условия, с их вердиктом', () => {
    const n = note([
      { kind: 'hours', from: 9, to: 18 },
      { kind: 'sky', is: 'rain' },
      { kind: 'place', lat: 0, lon: 0, within: 100, label: 'нигде' },
    ]);
    const held = blockers(n, world({ here: undefined }));
    expect(held.map((h) => h.c.kind)).toEqual(['sky', 'place']);
    expect(held.map((h) => h.verdict)).toEqual(['no', 'unknown']);
  });

  it('у созревшей заметки список пуст', () => {
    expect(blockers(note([{ kind: 'sky', is: 'clear' }]), world())).toEqual([]);
  });
});

describe('разбор облака', () => {
  it('раскладывает по состояниям и выбрасывает вычеркнутые', () => {
    const notes: Note[] = [
      note([{ kind: 'sky', is: 'clear' }], { id: 'ripe' }),
      note([{ kind: 'sky', is: 'rain' }], { id: 'waiting' }),
      note([{ kind: 'sky', is: 'rain' }], { id: 'unsure' }),
      note([], { id: 'done', doneAt: 1 }),
    ];
    // Небо известно всем, кроме последней проверки: считаем два мира отдельно.
    const withSky = sortByState(notes.slice(0, 2), world());
    expect(withSky.ripe.map((n) => n.id)).toEqual(['ripe']);
    expect(withSky.waiting.map((n) => n.id)).toEqual(['waiting']);

    const noSky = sortByState([notes[2]], world({ sky: undefined }));
    expect(noSky.unsure.map((n) => n.id)).toEqual(['unsure']);

    const all = sortByState(notes, world());
    expect(all.ripe.concat(all.waiting, all.unsure).map((n) => n.id)).not.toContain('done');
  });
});
