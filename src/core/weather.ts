import type { Sky } from './types';

/*
  Погода берётся у Open-Meteo.

  Не у OpenWeatherMap, хотя в первом плане проекта стоял он: любому ключу в
  этом приложении пришлось бы уехать в браузерный бандл, откуда его видно
  всем. Open-Meteo работает без ключа и отдаёт заголовки CORS, так что
  веб-версию можно выложить по ссылке и ничего не прятать. Заодно он сразу
  даёт восход и закат — без них условие «пока светло» считать нечем.
*/

const API = 'https://api.open-meteo.com/v1/forecast';

/**
 * Код погоды WMO в одно из четырёх слов приложения.
 *
 * Сетка грубая нарочно. Заметка ждёт «дождя», а не «умеренной мороси с
 * перерывами»: человек, записавший «дописать сценарий под дождь», имел в виду
 * ровно это. Гроза считается дождём, туман — облаками.
 */
export function skyFromCode(code: number): Sky {
  if (code <= 1) return 'clear'; // ясно и почти ясно
  if (code <= 3 || code === 45 || code === 48) return 'cloud'; // облачно, туман
  if (code >= 71 && code <= 77) return 'snow';
  if (code === 85 || code === 86) return 'snow';
  return 'rain'; // морось, дождь, ливни, грозы
}

/**
 * Местное время без часового пояса («2026-09-20T06:53») в миллисекунды.
 * Open-Meteo отдаёт время в поясе точки, а не устройства, и смещение кладёт
 * отдельным полем. Разбирать такую строку как местную для телефона нельзя:
 * с телефоном в другом поясе восход уехал бы на часы.
 */
export function localToMs(local: string, utcOffsetSeconds: number): number {
  return Date.parse(`${local}Z`) - utcOffsetSeconds * 1000;
}

export type Weather = {
  sky: Sky;
  tempC: number;
  sunrise: number;
  sunset: number;
};

/** Погода в точке. Бросает, если сеть или служба ответили не так, как обещано. */
export async function fetchWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<Weather> {
  const url =
    `${API}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=1`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo ответил ${res.status}`);
  const data = await res.json();

  const code = data?.current?.weather_code;
  const temp = data?.current?.temperature_2m;
  const sunrise = data?.daily?.sunrise?.[0];
  const sunset = data?.daily?.sunset?.[0];
  const offset = data?.utc_offset_seconds;

  if (typeof code !== 'number' || typeof temp !== 'number') {
    throw new Error('Open-Meteo не прислал погоду');
  }
  if (typeof sunrise !== 'string' || typeof sunset !== 'string' || typeof offset !== 'number') {
    throw new Error('Open-Meteo не прислал восход и закат');
  }

  return {
    sky: skyFromCode(code),
    tempC: temp,
    sunrise: localToMs(sunrise, offset),
    sunset: localToMs(sunset, offset),
  };
}
