import type { TimeOfDay, Weather } from './types';

/**
 * The sky is data rather than CSS classes: every time and weather combination
 * resolves to one flat palette, with ink colours chosen by measured contrast.
 * The values land in registered CSS properties, so they transition smoothly.
 */

export interface Palette {
  sky1: string;
  sky2: string;
  sky3: string;
  cloud: string;
  cloudBack: string;
  cloudInk: string;
  onSky: string;
  thread: string;
  body: string;
  ground: string;
  groundBack: string;
}

const LIGHT_INK = '#FFF8EA';
const DARK_INK = '#1E1A33';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const bestInk = (bg: string) => (contrast(bg, LIGHT_INK) >= contrast(bg, DARK_INK) ? LIGHT_INK : DARK_INK);

const BASE: Record<TimeOfDay, { sky: [string, string, string]; ground: string; groundBack: string }> = {
  morning: { sky: ['#A8D8E8', '#F6D7BE', '#F8B38F'], ground: '#2B2547', groundBack: '#5C4A70' },
  afternoon: { sky: ['#2A6FDB', '#4F97EE', '#92C8F4'], ground: '#17294D', groundBack: '#274A7C' },
  evening: { sky: ['#2B2A6E', '#7A3A85', '#EC7B50'], ground: '#17122F', groundBack: '#3A2150' },
  night: { sky: ['#0B0F2E', '#131A47', '#232C66'], ground: '#070920', groundBack: '#111638' },
};

/** Cloud colours are chosen by hand: mixing paper with grey looked dirty. */
const CLOUD: Record<TimeOfDay, Record<Weather, [string, string]>> = {
  morning: { clear: ['#FFF6E8', '#F5E4D6'], cloudy: ['#E8E6E3', '#D2D2D4'], rain: ['#C9CFDA', '#AEB6C5'], snow: ['#F6F8FC', '#DEE5F0'] },
  afternoon: { clear: ['#FFF8EA', '#DCE9F7'], cloudy: ['#DDE2E8', '#BFC8D3'], rain: ['#B4BDCC', '#98A3B6'], snow: ['#F4F7FC', '#D5E0EE'] },
  evening: { clear: ['#F9D9C9', '#D9A0A8'], cloudy: ['#6C6484', '#544D6E'], rain: ['#3C4166', '#2E3254'], snow: ['#C8C5DF', '#A5A2C6'] },
  night: { clear: ['#2C3272', '#20255A'], cloudy: ['#2F3358', '#232644'], rain: ['#262B4C', '#1B1F3A'], snow: ['#4A5288', '#383F70'] },
};

const WEATHER_TINT: Record<Weather, { to: string; amount: number }> = {
  clear: { to: '#000000', amount: 0 },
  cloudy: { to: '#7E8999', amount: 0.48 },
  rain: { to: '#39445C', amount: 0.62 },
  snow: { to: '#B7C5DA', amount: 0.52 },
};

export function paletteFor(time: TimeOfDay, weather: Weather): Palette {
  const base = BASE[time];
  const tint = WEATHER_TINT[weather];
  const [sky1, sky2, sky3] = base.sky.map((c) => mix(c, tint.to, tint.amount)) as [string, string, string];
  // The horizon keeps a little of its colour even in rain: the warm band is the point.
  const horizon = weather === 'rain' && time === 'evening' ? '#8E4C62' : sky3;
  const [cloud, cloudBack] = CLOUD[time][weather];
  const onSky = bestInk(sky2);
  return {
    sky1,
    sky2,
    sky3: horizon,
    cloud,
    cloudBack,
    cloudInk: bestInk(cloud),
    onSky,
    thread: onSky === LIGHT_INK ? 'rgb(255 248 234 / .62)' : 'rgb(30 26 51 / .55)',
    body: mix(sky1, '#000000', 0.15),
    ground: base.ground,
    groundBack: base.groundBack,
  };
}
