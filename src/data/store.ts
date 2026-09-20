import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note } from '../core/types';
import { seed } from './seed';

/*
  Хранилище: заметки лежат одним ключом в AsyncStorage.

  Базы здесь нет нарочно. Заметок у человека десятки, а не тысячи, весь список
  всё равно читается целиком на каждый пересчёт облака, и SQLite добавил бы
  схему, миграции и разный код для телефона и браузера. AsyncStorage на
  телефоне — нативное хранилище, в браузере — localStorage, и это один и тот
  же вызов.
*/

const KEY = 'motivane.notes.v1';

/** Разбор того, что лежит на диске. Чужое или битое не роняет приложение. */
function parse(raw: string | null): Note[] | undefined {
  if (!raw) return undefined;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return undefined;
    return data.filter(
      (n): n is Note =>
        n && typeof n.id === 'string' && typeof n.text === 'string' && Array.isArray(n.needs),
    );
  } catch {
    // Испорченный ключ — это не повод показать пустой экран с ошибкой.
    // Заметки вернутся из засева, а старое значение перезапишется при
    // первом же сохранении.
    return undefined;
  }
}

/** Заметки с диска. Первый запуск отдаёт засев, чтобы облако не было пустым. */
export async function load(): Promise<Note[]> {
  const notes = parse(await AsyncStorage.getItem(KEY));
  if (notes) return notes;
  await save(seed);
  return seed;
}

export async function save(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(notes));
}

/** Стереть всё и вернуться к засеву: кнопка для демонстрации. */
export async function reset(): Promise<Note[]> {
  await save(seed);
  return seed;
}

/** Идентификатор заметки. Случайности хватает: список живёт на одном устройстве. */
export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
