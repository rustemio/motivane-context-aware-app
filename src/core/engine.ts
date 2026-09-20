import type { Condition, Note, State, Verdict, World } from './types';

/*
  Движок: сверяет условия заметки со снимком мира.

  Здесь нет ни сети, ни хранилища, ни React — только чистые функции от
  (условие, мир). Поэтому движок проверяется тестами целиком и без
  устройства: подставляешь мир, читаешь ответ. Всё, что умеет ошибаться
  по-настоящему — погода, геопозиция, разрешения, — живёт снаружи и сюда
  приходит уже собранным в World.
*/

/** Радиус Земли, метры. Для расстояний в пределах города сферы хватает с запасом. */
const EARTH = 6_371_000;

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Расстояние между двумя точками по поверхности, метры. Формула гаверсинуса.
 * На городских расстояниях ошибка от того, что Земля не шар, — метры.
 */
export function metresBetween(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Попадает ли час в окно. Окно, где начало больше конца, читается через
 * полночь: 22→6 — это ночь, а не пустота.
 */
export function hourInWindow(hour: number, from: number, to: number): boolean {
  if (from === to) return hour === from;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

/** Ответ на одно условие. */
export function check(c: Condition, w: World): Verdict {
  switch (c.kind) {
    case 'sky':
      return w.sky === undefined ? 'unknown' : w.sky === c.is ? 'yes' : 'no';

    case 'temp': {
      if (w.tempC === undefined) return 'unknown';
      if (c.min !== undefined && w.tempC < c.min) return 'no';
      if (c.max !== undefined && w.tempC > c.max) return 'no';
      return 'yes';
    }

    case 'light': {
      // Светло — это между восходом и закатом, а не «с 8 до 20». В Анкаре и
      // в Уфе одни и те же часы дают разный свет, и зимой разница в час с лишним.
      if (w.sunrise === undefined || w.sunset === undefined) return 'unknown';
      const day = w.at >= w.sunrise && w.at < w.sunset;
      return (c.is === 'day') === day ? 'yes' : 'no';
    }

    case 'hours':
      return hourInWindow(w.hour, c.from, c.to) ? 'yes' : 'no';

    case 'weekday':
      return c.days.includes(w.weekday) ? 'yes' : 'no';

    case 'place': {
      if (!w.here) return 'unknown';
      return metresBetween(w.here, c) <= c.within ? 'yes' : 'no';
    }
  }
}

/**
 * Что стало с заметкой.
 *
 * «Нет» весомее «не знаю»: если одно условие точно не выполнено, заметке рано,
 * и неважно, что ещё мы не смогли проверить. Заметка без условий созрела
 * всегда — это обычная запись в список дел, и запрещать её незачем.
 */
export function stateOf(note: Note, w: World): State {
  let unsure = false;
  for (const c of note.needs) {
    const v = check(c, w);
    if (v === 'no') return 'waiting';
    if (v === 'unknown') unsure = true;
  }
  return unsure ? 'unsure' : 'ripe';
}

/** Условия, которые держат заметку: не выполнены или непроверяемы. */
export function blockers(note: Note, w: World): { c: Condition; verdict: Verdict }[] {
  return note.needs
    .map((c) => ({ c, verdict: check(c, w) }))
    .filter(({ verdict }) => verdict !== 'yes');
}

/**
 * Заметки, разобранные по состоянию. Вычеркнутые сюда не попадают: облако
 * показывает то, что ещё ждёт своего часа.
 */
export function sortByState(notes: Note[], w: World): Record<State, Note[]> {
  const out: Record<State, Note[]> = { ripe: [], unsure: [], waiting: [] };
  for (const n of notes) {
    if (n.doneAt !== undefined) continue;
    out[stateOf(n, w)].push(n);
  }
  return out;
}
