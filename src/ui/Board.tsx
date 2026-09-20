import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { Note, State, World } from '../core/types';
import { StickyNote } from './StickyNote';
import { gap } from './theme';

/*
  Доска.

  Заметки стоят колонками и разложены по ним по очереди, а не по высоте:
  порядок важнее ровных столбцов. Сверху то, что созрело, — иначе доска
  превращается в список дел, где главное надо искать.

  Число колонок считается от ширины окна, а не от платформы: веб-версия на
  телефоне должна выглядеть как приложение, а не как сайт.
*/

function columnsFor(width: number): number {
  if (width >= 1000) return 4;
  if (width >= 700) return 3;
  return 2;
}

export function Board({
  notes,
  stateOfNote,
  world,
  onOpen,
}: {
  notes: Note[];
  stateOfNote: (n: Note) => State;
  world: World;
  onOpen: (n: Note) => void;
}) {
  const { width } = useWindowDimensions();
  const count = columnsFor(width);

  // Раскладка по очереди, слева направо: первая заметка встаёт первой в
  // первой колонке, вторая — в следующей.
  const columns: Note[][] = Array.from({ length: count }, () => []);
  notes.forEach((n, i) => columns[i % count].push(n));

  return (
    <View style={s.board}>
      {columns.map((column, i) => (
        <View key={i} style={s.column}>
          {column.map((n) => (
            <StickyNote
              key={n.id}
              note={n}
              state={stateOfNote(n)}
              world={world}
              onPress={() => onOpen(n)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  board: { flexDirection: 'row', gap: gap(1.5) },
  column: { flex: 1, gap: gap(1.5) },
});
