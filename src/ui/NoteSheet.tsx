import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Note, World } from '../core/types';
import { check, stateOf } from '../core/engine';
import { phrase, verdictWord } from './words';
import { c, gap, mono, t } from './theme';

/*
  Карточка заметки.

  Здесь видно не только «рано» или «пора», а каждое условие по отдельности и
  что про него сейчас известно. Это главное окно приложения: оно объясняет
  решение, а не объявляет его. «Не знаю» стоит наравне с «нет» и своим словом,
  чтобы человек понимал, что выключенная геопозиция — это не «условие не
  выполнено», а «спросить было не у кого».
*/

export function NoteSheet({
  note,
  world,
  onClose,
  onDone,
  onDelete,
}: {
  note: Note | undefined;
  world: World;
  onClose: () => void;
  onDone: (n: Note) => void;
  onDelete: (n: Note) => void;
}) {
  if (!note) return null;
  const state = stateOf(note, world);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close">
        {/* Нажатие по самой карточке не должно закрывать её. */}
        <Pressable style={s.sheet} onPress={() => {}}>
          <ScrollView>
            <Text style={s.head}>
              {state === 'ripe' ? 'Ready now' : state === 'unsure' ? 'Not sure' : 'Waiting'}
            </Text>
            <Text style={s.text}>{note.text}</Text>

            {note.needs.length === 0 ? (
              <Text style={s.none}>No conditions. This one is always ready.</Text>
            ) : (
              <View style={s.list}>
                <Text style={s.label}>needs</Text>
                {note.needs.map((cond, i) => {
                  const v = check(cond, world);
                  return (
                    <View key={i} style={s.row}>
                      <View
                        style={[
                          s.mark,
                          v === 'yes' && s.markYes,
                          v === 'unknown' && s.markUnknown,
                        ]}
                      />
                      <Text style={[s.cond, v === 'yes' && s.condYes]}>{phrase(cond)}</Text>
                      <Text style={s.verdict}>{verdictWord(v)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={s.buttons}>
              <Pressable onPress={() => onDone(note)} style={({ pressed }) => [s.button, s.primary, pressed && s.pressed]}>
                <Text style={s.primaryLabel}>Done with it</Text>
              </Pressable>
              <Pressable onPress={() => onDelete(note)} style={({ pressed }) => [s.button, pressed && s.pressed]}>
                <Text style={s.buttonLabel}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: gap(2.5),
  },
  sheet: {
    backgroundColor: c.bg,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 2,
    padding: gap(3),
    maxHeight: '80%',
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  head: { fontFamily: mono, fontSize: t.tiny, color: c.hot, letterSpacing: 2, textTransform: 'uppercase' },
  text: { color: c.paper, fontSize: t.title, lineHeight: t.title * 1.2, marginTop: gap(1.5) },
  none: { color: c.dim, fontSize: t.small, marginTop: gap(3) },
  list: { marginTop: gap(4) },
  label: {
    fontFamily: mono,
    fontSize: t.tiny,
    color: c.dim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: gap(1.5),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: gap(1.5),
    paddingVertical: gap(1.25),
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  mark: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.asleepEdge },
  markYes: { backgroundColor: c.hot },
  markUnknown: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.unsureEdge },
  cond: { flex: 1, color: c.dim, fontSize: t.body },
  condYes: { color: c.paper },
  verdict: { fontFamily: mono, fontSize: t.tiny, color: c.dim },
  buttons: { flexDirection: 'row', gap: gap(1.5), marginTop: gap(4) },
  button: {
    paddingVertical: gap(1.5),
    paddingHorizontal: gap(2.5),
    borderRadius: 2,
    borderWidth: 1,
    borderColor: c.asleepEdge,
  },
  primary: { backgroundColor: c.paper, borderColor: c.paper },
  primaryLabel: { color: c.ink, fontSize: t.small },
  buttonLabel: { color: c.dim, fontSize: t.small },
  pressed: { opacity: 0.7 },
});
