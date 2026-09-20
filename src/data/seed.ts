import type { Note } from '../core/types';

/*
  Засев: девять заметок, с которыми приложение открывается в первый раз.

  Пустое облако ничего не объясняет, а объяснять приходится: условие вместо
  срока — непривычная идея. Девять заметок покрывают все шесть видов условий.
  Две первые созревают почти всегда — иначе приложение открывалось бы доской
  серых карточек, и было бы непонятно, что оно вообще делает. Остальные ждут
  своего часа, и это видно с первого взгляда.
*/

const MON_TO_FRI = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

/** Центр Анкары: к нему привязана заметка про место. */
const ANKARA = { lat: 39.9334, lon: 32.8597 };

export const seed: Note[] = [
  {
    id: 'seed-pages',
    text: 'Read ten pages, no phone',
    created: Date.UTC(2026, 2, 8),
    needs: [{ kind: 'hours', from: 7, to: 23 }],
  },
  {
    id: 'seed-reply',
    text: 'Reply to the friend you owe a message',
    created: Date.UTC(2026, 2, 9),
    needs: [{ kind: 'light', is: 'day' }],
  },
  {
    id: 'seed-rain',
    text: 'Finish the screenplay',
    created: Date.UTC(2026, 2, 1),
    needs: [{ kind: 'sky', is: 'rain' }],
  },
  {
    id: 'seed-roll',
    text: 'Shoot the film roll before it expires',
    created: Date.UTC(2026, 2, 2),
    needs: [
      { kind: 'sky', is: 'clear' },
      { kind: 'light', is: 'day' },
    ],
  },
  {
    id: 'seed-call',
    text: 'Call home, properly, not in two minutes',
    created: Date.UTC(2026, 2, 3),
    needs: [
      { kind: 'weekday', days: MON_TO_FRI },
      { kind: 'hours', from: 18, to: 22 },
    ],
  },
  {
    id: 'seed-swim',
    text: 'Swim at the lake',
    created: Date.UTC(2026, 2, 4),
    needs: [
      { kind: 'temp', min: 24 },
      { kind: 'light', is: 'day' },
    ],
  },
  {
    id: 'seed-bike',
    text: 'Fix the bike',
    created: Date.UTC(2026, 2, 5),
    needs: [
      { kind: 'place', ...ANKARA, within: 3000, label: 'Ankara' },
      { kind: 'weekday', days: WEEKEND },
    ],
  },
  {
    id: 'seed-stars',
    text: 'Go out and look at the sky',
    created: Date.UTC(2026, 2, 6),
    needs: [
      { kind: 'light', is: 'night' },
      { kind: 'sky', is: 'clear' },
    ],
  },
  {
    id: 'seed-letter',
    text: 'Write the letter you keep putting off',
    created: Date.UTC(2026, 2, 7),
    needs: [
      { kind: 'weekday', days: MON_TO_FRI },
      { kind: 'hours', from: 9, to: 18 },
    ],
  },
];
