import type { Condition, Sky, Verdict } from '../core/types';

/*
  Условие человеческой фразой.

  Экран нигде не показывает ни «sky: rain», ни радиус в метрах: заметка должна
  читаться как записка самому себе. Функции чистые, поэтому проверяются
  тестами, а не глазами на устройстве.
*/

const SKY: Record<Sky, string> = {
  clear: 'a clear sky',
  cloud: 'clouds',
  rain: 'rain',
  snow: 'snow',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const same = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Часы двумя цифрами: 9 → «09:00». */
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** Расстояние округлённо: метры до километра, дальше километры. */
export function distance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`;
  const km = metres / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Условие фразой, которая встаёт после «needs». */
export function phrase(c: Condition): string {
  switch (c.kind) {
    case 'sky':
      return SKY[c.is];

    case 'temp': {
      const { min, max } = c;
      if (min !== undefined && max !== undefined) return `${min}° to ${max}°`;
      if (min !== undefined) return `warmer than ${min}°`;
      if (max !== undefined) return `colder than ${max}°`;
      // Условие без обеих границ бессмысленно, но экран из-за него падать не должен.
      return 'any temperature';
    }

    case 'light':
      return c.is === 'day' ? 'daylight' : 'darkness';

    case 'hours':
      return `${hh(c.from)} to ${hh(c.to)}`;

    case 'weekday': {
      if (c.days.length === 0) return 'no day';
      if (same(c.days, WEEKDAYS)) return 'a weekday';
      if (same(c.days, WEEKEND)) return 'the weekend';
      if (c.days.length === 1) return DAY_NAMES[c.days[0]];
      return [...c.days]
        .sort()
        .map((d) => DAY_NAMES[d].slice(0, 3))
        .join(', ');
    }

    case 'place':
      return `${distance(c.within)} of ${c.label}`;
  }
}

/** Короткое слово для значка условия. */
export function verdictWord(v: Verdict): string {
  return v === 'yes' ? 'met' : v === 'no' ? 'not yet' : "can't tell";
}

/** Строка про мир: «clouds · 23° · 15:04». Неизвестное не показываем вовсе. */
export function worldLine(parts: { sky?: Sky; tempC?: number; at: number }): string {
  const bits: string[] = [];
  if (parts.sky) bits.push(SKY[parts.sky]);
  if (parts.tempC !== undefined) bits.push(`${Math.round(parts.tempC)}°`);
  bits.push(
    new Date(parts.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  );
  return bits.join('  ·  ');
}
