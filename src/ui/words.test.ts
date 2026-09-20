import { describe, expect, it } from 'vitest';
import { distance, phrase, worldLine } from './words';

describe('расстояние словами', () => {
  it('метры округляются до полусотни', () => {
    expect(distance(300)).toBe('300 m');
    expect(distance(320)).toBe('300 m');
    expect(distance(980)).toBe('1000 m');
  });

  it('от километра считает в километрах', () => {
    expect(distance(3000)).toBe('3.0 km');
    expect(distance(1500)).toBe('1.5 km');
    expect(distance(12000)).toBe('12 km');
  });
});

describe('условие фразой', () => {
  it('небо', () => {
    expect(phrase({ kind: 'sky', is: 'rain' })).toBe('rain');
    expect(phrase({ kind: 'sky', is: 'clear' })).toBe('a clear sky');
  });

  it('температура с одной границей и с двумя', () => {
    expect(phrase({ kind: 'temp', min: 24 })).toBe('warmer than 24°');
    expect(phrase({ kind: 'temp', max: 0 })).toBe('colder than 0°');
    expect(phrase({ kind: 'temp', min: 15, max: 28 })).toBe('15° to 28°');
  });

  it('температура без границ не роняет экран', () => {
    expect(phrase({ kind: 'temp' })).toBe('any temperature');
  });

  it('свет', () => {
    expect(phrase({ kind: 'light', is: 'day' })).toBe('daylight');
    expect(phrase({ kind: 'light', is: 'night' })).toBe('darkness');
  });

  it('часы с ведущим нулём', () => {
    expect(phrase({ kind: 'hours', from: 9, to: 18 })).toBe('09:00 to 18:00');
    expect(phrase({ kind: 'hours', from: 22, to: 6 })).toBe('22:00 to 06:00');
  });

  it('будни и выходные узнаются по составу', () => {
    expect(phrase({ kind: 'weekday', days: [1, 2, 3, 4, 5] })).toBe('a weekday');
    expect(phrase({ kind: 'weekday', days: [5, 4, 3, 2, 1] })).toBe('a weekday');
    expect(phrase({ kind: 'weekday', days: [0, 6] })).toBe('the weekend');
  });

  it('один день называется целиком, несколько — сокращениями', () => {
    expect(phrase({ kind: 'weekday', days: [3] })).toBe('Wednesday');
    expect(phrase({ kind: 'weekday', days: [1, 3] })).toBe('Mon, Wed');
  });

  it('место — расстояние и название', () => {
    expect(phrase({ kind: 'place', lat: 0, lon: 0, within: 3000, label: 'Ankara' })).toBe(
      '3.0 km of Ankara',
    );
  });
});

describe('строка про мир', () => {
  const at = new Date(2026, 8, 20, 15, 4).getTime();

  it('собирает известное', () => {
    expect(worldLine({ sky: 'cloud', tempC: 23.3, at })).toBe('clouds  ·  23°  ·  15:04');
  });

  it('неизвестное пропускает, время остаётся всегда', () => {
    expect(worldLine({ at })).toBe('15:04');
    expect(worldLine({ tempC: -3.6, at })).toBe('-4°  ·  15:04');
  });
});
