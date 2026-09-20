import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { World } from '../core/types';
import { fetchWeather } from '../core/weather';

/*
  Сборка снимка мира.

  Всё, что умеет отказать, собрано здесь: разрешения, геопозиция, сеть. Наружу
  уходит World, в котором неизвестное поле просто отсутствует, — и движок
  дальше сам решит, что об этом сказать. Внутри движка нет ни одного try.
*/

/** Часы и день недели берём с устройства: человек живёт по своим часам. */
const clock = () => {
  const now = new Date();
  return { at: now.getTime(), hour: now.getHours(), weekday: now.getDay() };
};

/**
 * Запасная точка, если в геопозиции отказали.
 *
 * Без неё отказ гасил бы и погоду — координат нет, спрашивать не о чем, — и
 * демонстрация превращалась бы в список серых карточек. С запасной точкой
 * видно, как всё работает, а условие «я в Анкаре» честно отвечает «не знаю»:
 * где человек на самом деле, приложение по-прежнему не знает.
 */
export const FALLBACK = { lat: 39.9334, lon: 32.8597, label: 'Ankara' };

export type Source = 'locating' | 'device' | 'denied';

export type WorldState = {
  world: World;
  /** Откуда взялись координаты для погоды. */
  source: Source;
  /** Погода не пришла: нет сети или служба молчит. */
  weatherFailed: boolean;
  /** Спросить разрешение заново и обновить всё. */
  refresh: () => void;
};

export function useWorld(): WorldState {
  const [world, setWorld] = useState<World>(() => clock());
  const [source, setSource] = useState<Source>('locating');
  const [weatherFailed, setWeatherFailed] = useState(false);
  const [tick, setTick] = useState(0);

  // Отменяем запрос погоды, если экран ушёл или начался новый: иначе ответ
  // старого запроса мог бы перетереть свежий снимок.
  const abort = useRef<AbortController | undefined>(undefined);

  const collect = useCallback(async () => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;

    let here: { lat: number; lon: number } | undefined;
    let from: Source = 'denied';

    setSource('locating');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        from = 'device';
      }
    } catch {
      // Отказ, выключенная служба, таймаут — для нас это одно и то же: места
      // нет. Разбираться, почему именно, приложению незачем.
    }

    if (ac.signal.aborted) return;
    setSource(from);

    // Погоду спрашиваем по настоящей точке, а при её отсутствии — по запасной.
    // В снимок мира при этом уходит только настоящая: условие про место
    // должно отвечать «не знаю», а не про Анкару.
    const at = here ?? FALLBACK;
    try {
      const w = await fetchWeather(at.lat, at.lon, ac.signal);
      if (ac.signal.aborted) return;
      setWeatherFailed(false);
      setWorld({ ...clock(), ...w, here });
    } catch {
      if (ac.signal.aborted) return;
      setWeatherFailed(true);
      setWorld({ ...clock(), here });
    }
  }, []);

  useEffect(() => {
    void collect();
  }, [collect, tick]);

  // Часы идут сами: заметка, которая ждёт восемнадцати ноль-ноль, должна
  // загореться без нажатий. Погоду при этом не дёргаем — только время.
  useEffect(() => {
    const id = setInterval(() => setWorld((w) => ({ ...w, ...clock() })), 30_000);
    return () => clearInterval(id);
  }, []);

  // Погода меняется медленно: десяти минут достаточно, а Open-Meteo и сам
  // считает текущие условия раз в четверть часа.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => abort.current?.abort(), []);

  return {
    world,
    source,
    weatherFailed,
    refresh: () => setTick((t) => t + 1),
  };
}
