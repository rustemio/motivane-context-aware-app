import { describe, expect, it } from 'vitest';
import { localToMs, skyFromCode } from './weather';

describe('коды погоды', () => {
  it('ясно', () => {
    expect(skyFromCode(0)).toBe('clear');
    expect(skyFromCode(1)).toBe('clear');
  });

  it('облака и туман', () => {
    expect(skyFromCode(2)).toBe('cloud');
    expect(skyFromCode(3)).toBe('cloud');
    expect(skyFromCode(45)).toBe('cloud');
    expect(skyFromCode(48)).toBe('cloud');
  });

  it('морось, дождь, ливни и грозы — всё дождь', () => {
    for (const c of [51, 55, 61, 65, 67, 80, 82, 95, 99]) {
      expect(skyFromCode(c), `код ${c}`).toBe('rain');
    }
  });

  it('снег, включая ливневый', () => {
    for (const c of [71, 73, 75, 77, 85, 86]) {
      expect(skyFromCode(c), `код ${c}`).toBe('snow');
    }
  });
});

describe('местное время в миллисекунды', () => {
  it('снимает смещение точки, а не устройства', () => {
    // Восход 06:53 в поясе +3 — это 03:53 по UTC, где бы ни был телефон.
    const ms = localToMs('2026-09-20T06:53', 3 * 3600);
    expect(new Date(ms).toISOString()).toBe('2026-09-20T03:53:00.000Z');
  });

  it('работает с отрицательным смещением', () => {
    const ms = localToMs('2026-09-20T06:53', -5 * 3600);
    expect(new Date(ms).toISOString()).toBe('2026-09-20T11:53:00.000Z');
  });

  it('нулевое смещение оставляет время как есть', () => {
    const ms = localToMs('2026-09-20T06:53', 0);
    expect(new Date(ms).toISOString()).toBe('2026-09-20T06:53:00.000Z');
  });
});
