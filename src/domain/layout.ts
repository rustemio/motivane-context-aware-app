import type { Match } from './matching';

/**
 * Turns a ranking into positions on the hanging paper mobile. The nearer
 * the moment, the lower the note: the best three hang within reach, and the
 * rest stay up near the cloud. Pure, so the same input always hangs the same.
 */

export type NoteSize = 'lead' | 'reach' | 'tucked' | 'hidden';

export interface Hang {
  x: number;
  y: number;
  width: number;
  rotate: number;
  size: NoteSize;
  z: number;
}

export interface LayoutResult {
  positions: Map<string, Hang>;
  /** Ideas with no room up there, which live in the List view instead. */
  overflow: number;
  minHeight: number;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A stable value in [-1, 1] for this id. */
export const jitter = (id: string, salt = 0) => ((hash(id + salt) % 2001) - 1000) / 1000;

const byAge = (a: Match, b: Match) => a.idea.createdAt - b.idea.createdAt || a.idea.id.localeCompare(b.idea.id);

export function layoutHanging(ranked: Match[], reach: Match[], width: number, height: number, viewportHeight = 900): LayoutResult {
  const positions = new Map<string, Hang>();
  const reachIds = new Set(reach.map((m) => m.idea.id));
  const others = ranked.filter((m) => !reachIds.has(m.idea.id) && !m.resting);
  const hidden = ranked.filter((m) => m.resting);
  const hideAbove = (m: Match) =>
    positions.set(m.idea.id, { x: Math.max(0, width / 2 + jitter(m.idea.id) * width * 0.3), y: -190, width: 170, rotate: 0, size: 'hidden', z: 1 });
  hidden.forEach(hideAbove);

  const narrow = width < 640;
  const pad = narrow ? 14 : 28;
  const tuckedW = narrow ? (width - pad * 2 - 12) / 2 : 172;
  const tuckedH = narrow ? 58 : 104;
  const columns = narrow ? 2 : Math.max(3, Math.floor((width - pad * 2) / (tuckedW + 18)));
  // Phones and short laptops keep one row up top, so what's within reach is on screen without scrolling.
  const single = narrow || viewportHeight < 880;
  const rows = single ? 1 : 2;
  const capacity = columns * rows;
  const shown = others.slice(0, capacity);
  others.slice(capacity).forEach(hideAbove);

  const top = narrow ? 24 : 38;
  // The better half hang in the lower row. Within a row, order is by age, so
  // notes keep their neighbours and mostly move up and down rather than swap.
  const lowerCount = single ? shown.length : Math.ceil(shown.length / 2);
  const lower = shown.slice(0, lowerCount).sort(byAge);
  const upper = shown.slice(lowerCount).sort(byAge);
  const place = (row: Match[], rowIndex: number) => {
    const available = width - pad * 2 - tuckedW;
    row.forEach((m, i) => {
      const t = row.length === 1 ? 0.5 : i / (row.length - 1);
      const stagger = rowIndex === 1 && !narrow && row.length < columns ? 0.02 : 0;
      positions.set(m.idea.id, {
        x: Math.round(pad + available * Math.min(1, t + stagger) + (narrow ? 0 : jitter(m.idea.id, 1) * 10)),
        y: Math.round(top + rowIndex * (tuckedH + (narrow ? 8 : 12)) + (m.score / 100) * 10 + jitter(m.idea.id, 2) * (narrow ? 2 : 7)),
        width: Math.round(tuckedW),
        rotate: jitter(m.idea.id, 3) * 2.2,
        size: 'tucked',
        z: 3 + rowIndex,
      });
    });
  };
  place(upper, 0);
  place(lower, upper.length ? 1 : 0);
  const usedRows = upper.length && lower.length ? 2 : lower.length ? 1 : 0;
  const reachTop = top + usedRows * (tuckedH + (narrow ? 8 : 12)) + (narrow ? 14 : single ? 26 : 34);

  let minHeight: number;
  if (narrow) {
    // Runners-up side by side, the best one lowest and widest.
    const [lead, ...rest] = reach;
    const pairW = Math.round((width - pad * 2 - 12) / 2);
    const pairH = 172;
    rest.sort((a, b) => byAge(a, b)).forEach((m, i) => {
      positions.set(m.idea.id, {
        x: rest.length === 1 ? Math.round((width - pairW) / 2) : pad + i * (pairW + 12),
        y: reachTop + (i === 0 ? 0 : 10),
        width: pairW,
        rotate: jitter(m.idea.id, 3) * 1.6,
        size: 'reach',
        z: 8,
      });
    });
    const leadY = reachTop + (rest.length ? pairH + 22 : 0);
    if (lead) positions.set(lead.idea.id, { x: pad, y: leadY, width: width - pad * 2, rotate: jitter(lead.idea.id, 3) * 0.8, size: 'lead', z: 10 });
    minHeight = leadY + (lead ? 176 : 120) + (others.length > capacity ? 44 : 0);
  } else {
    const leadW = Math.min(310, Math.max(250, width * 0.24));
    const sideW = Math.min(250, Math.max(200, width * 0.19));
    minHeight = reachTop + 205;
    const floor = Math.max(height, minHeight);
    const [lead, ...rest] = reach;
    // Leaves the lower left clear for the vane.
    const centre = width >= 1100 ? width * 0.52 : width * 0.5;
    // Room for a three-line title without slipping under the ground.
    const leadY = floor - 205;
    if (lead) positions.set(lead.idea.id, { x: Math.round(centre - leadW / 2), y: leadY, width: leadW, rotate: jitter(lead.idea.id, 3) * 1.4, size: 'lead', z: 10 });
    const gap = leadW / 2 + sideW / 2 + Math.min(44, width * 0.03);
    [...rest].sort(byAge).forEach((m, i) => {
      const side = rest.length === 1 ? -1 : i === 0 ? -1 : 1;
      positions.set(m.idea.id, {
        x: Math.round(centre + side * gap - sideW / 2),
        y: Math.round(leadY - 34 - (lead ? Math.min(14, (lead.score - m.score) * 0.6) : 0) + jitter(m.idea.id, 4) * 6),
        width: sideW,
        rotate: jitter(m.idea.id, 3) * 2,
        size: 'reach',
        z: 9,
      });
    });
  }

  return { positions, overflow: Math.max(0, others.length - capacity), minHeight };
}
