import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Condition, Note } from './src/core/types';
import { sortByState, stateOf } from './src/core/engine';
import { load, newId, save } from './src/data/store';
import { useWorld } from './src/world/useWorld';
import { Board } from './src/ui/Board';
import { NewNote } from './src/ui/NewNote';
import { NoteSheet } from './src/ui/NoteSheet';
import { worldLine } from './src/ui/words';
import { c, gap, mono, t } from './src/ui/theme';

/*
  Сборка приложения.

  Порядок на доске задаётся здесь, а не в движке: сначала созревшие, потом
  те, про которые чего-то не знаем, потом ждущие. Внутри каждой группы новые
  сверху. Порядок пересчитывается на каждом изменении мира, поэтому заметка
  переезжает наверх сама, когда наступает её время, — нажимать ничего не надо.
*/

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** «Three ideas are ready», «One idea is ready». */
export function headline(ripe: number, total: number): string {
  if (total === 0) return 'The board is empty';
  if (ripe === 0) return 'Nothing is ready yet';
  const count = ripe <= 10 ? WORDS[ripe] : String(ripe);
  return `${count} ${ripe === 1 ? 'idea is' : 'ideas are'} ready`;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>();
  const [open, setOpen] = useState<Note>();
  const [composing, setComposing] = useState(false);
  const { world, source, weatherFailed, refresh } = useWorld();

  useEffect(() => {
    void load().then(setNotes);
  }, []);

  // Единственное место, где заметки уходят на диск: любое изменение проходит
  // через него, и разойтись экрану с хранилищем негде.
  const commit = useCallback((next: Note[]) => {
    setNotes(next);
    void save(next);
  }, []);

  const sorted = useMemo(() => {
    if (!notes) return undefined;
    const byState = sortByState(notes, world);
    const newest = (a: Note, b: Note) => b.created - a.created;
    return [
      ...byState.ripe.sort(newest),
      ...byState.unsure.sort(newest),
      ...byState.waiting.sort(newest),
    ];
  }, [notes, world]);

  const ripe = useMemo(() => (notes ? sortByState(notes, world).ripe.length : 0), [notes, world]);

  const add = (text: string, needs: Condition[]) => {
    if (!notes) return;
    commit([{ id: newId(), text, created: Date.now(), needs }, ...notes]);
  };

  const finish = (n: Note) => {
    if (!notes) return;
    commit(notes.map((x) => (x.id === n.id ? { ...x, doneAt: Date.now() } : x)));
    setOpen(undefined);
  };

  const remove = (n: Note) => {
    if (!notes) return;
    commit(notes.filter((x) => x.id !== n.id));
    setOpen(undefined);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={s.page}>
          <Text style={s.brand}>MotiVane</Text>
          <Text style={s.headline}>{headline(ripe, sorted?.length ?? 0)}</Text>

          <View style={s.status}>
            <Text style={s.world}>{worldLine(world)}</Text>
            {source === 'locating' && <Text style={s.note}>finding you…</Text>}
            {source === 'device' && <Text style={s.note}>your location</Text>}
            {source === 'denied' && (
              <Pressable onPress={refresh} accessibilityRole="button">
                <Text style={s.action}>location off · weather from Ankara · tap to retry</Text>
              </Pressable>
            )}
            {weatherFailed && <Text style={s.note}>no weather right now</Text>}
          </View>

          {!sorted ? (
            <ActivityIndicator color={c.dim} style={s.loading} />
          ) : (
            <Board
              notes={sorted}
              stateOfNote={(n) => stateOf(n, world)}
              world={world}
              onOpen={setOpen}
            />
          )}
        </ScrollView>

        <Pressable
          onPress={() => setComposing(true)}
          style={({ pressed }) => [s.add, pressed && s.pressed]}
          accessibilityLabel="New idea"
        >
          <Text style={s.addLabel}>+</Text>
        </Pressable>

        <NoteSheet
          note={open}
          world={world}
          onClose={() => setOpen(undefined)}
          onDone={finish}
          onDelete={remove}
        />
        <NewNote open={composing} world={world} onClose={() => setComposing(false)} onAdd={add} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  page: {
    padding: gap(2.5),
    paddingBottom: gap(12),
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    fontFamily: mono,
    fontSize: t.tiny,
    color: c.hot,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headline: { color: c.paper, fontSize: t.title, lineHeight: t.title * 1.2, marginTop: gap(1.5) },
  status: { marginTop: gap(1), marginBottom: gap(4), gap: gap(0.5) },
  world: { fontFamily: mono, fontSize: t.small, color: c.dim },
  note: { fontFamily: mono, fontSize: t.tiny, color: c.asleepInk },
  action: { fontFamily: mono, fontSize: t.tiny, color: c.hot },
  loading: { marginTop: gap(6) },
  add: {
    position: 'absolute',
    right: gap(3),
    bottom: gap(4),
    width: gap(7),
    height: gap(7),
    borderRadius: gap(3.5),
    backgroundColor: c.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { color: c.ink, fontSize: 30, lineHeight: 34 },
  pressed: { opacity: 0.7 },
});
