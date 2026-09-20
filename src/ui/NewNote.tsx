import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Condition, World } from '../core/types';
import { phrase } from './words';
import { c, gap, mono, t } from './theme';

/*
  Новая заметка.

  Условия выбираются готовыми фишками, а не собираются из полей. Полноценный
  редактор («температура от … до …», карта с булавкой) здесь был бы честнее
  по возможностям и хуже по делу: записка пишется на ходу, и если запись идеи
  стоит трёх экранов настроек, её не запишут вовсе. Шесть видов условий
  покрыты двенадцатью фишками.
*/

type Chip = { label: string; make: (world: World) => Condition | undefined };

const CHIPS: Chip[] = [
  { label: 'rain', make: () => ({ kind: 'sky', is: 'rain' }) },
  { label: 'clear sky', make: () => ({ kind: 'sky', is: 'clear' }) },
  { label: 'snow', make: () => ({ kind: 'sky', is: 'snow' }) },
  { label: 'daylight', make: () => ({ kind: 'light', is: 'day' }) },
  { label: 'dark out', make: () => ({ kind: 'light', is: 'night' }) },
  { label: 'warm', make: () => ({ kind: 'temp', min: 20 }) },
  { label: 'cold', make: () => ({ kind: 'temp', max: 5 }) },
  { label: 'morning', make: () => ({ kind: 'hours', from: 6, to: 12 }) },
  { label: 'evening', make: () => ({ kind: 'hours', from: 18, to: 23 }) },
  { label: 'weekday', make: () => ({ kind: 'weekday', days: [1, 2, 3, 4, 5] }) },
  { label: 'weekend', make: () => ({ kind: 'weekday', days: [0, 6] }) },
  {
    // Единственная фишка, которой нужен мир: точку берём ту, где человек
    // сейчас. Без геопозиции фишка выключена — привязывать заметку не к чему.
    label: 'here',
    make: (w) =>
      w.here ? { kind: 'place', ...w.here, within: 500, label: 'here' } : undefined,
  },
];

export function NewNote({
  open,
  world,
  onClose,
  onAdd,
}: {
  open: boolean;
  world: World;
  onClose: () => void;
  onAdd: (text: string, needs: Condition[]) => void;
}) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<number[]>([]);

  const close = () => {
    setText('');
    setPicked([]);
    onClose();
  };

  const add = () => {
    const body = text.trim();
    if (!body) return;
    const needs = picked
      .map((i) => CHIPS[i].make(world))
      .filter((cond): cond is Condition => cond !== undefined);
    onAdd(body, needs);
    close();
  };

  const chosen = picked
    .map((i) => CHIPS[i].make(world))
    .filter((cond): cond is Condition => cond !== undefined);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={s.backdrop} onPress={close}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.label}>the idea</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Something you keep meaning to do"
              placeholderTextColor={c.asleepInk}
              style={s.input}
              multiline
              autoFocus
            />

            <Text style={[s.label, s.gapTop]}>it needs</Text>
            <View style={s.chips}>
              {CHIPS.map((chip, i) => {
                const on = picked.includes(i);
                const can = chip.make(world) !== undefined;
                return (
                  <Pressable
                    key={chip.label}
                    disabled={!can}
                    onPress={() =>
                      setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
                    }
                    style={[s.chip, on && s.chipOn, !can && s.chipOff]}
                  >
                    <Text style={[s.chipLabel, on && s.chipLabelOn, !can && s.chipLabelOff]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.preview}>
              {chosen.length === 0
                ? 'No conditions: it will be ready straight away.'
                : `Ready when there is ${chosen.map(phrase).join(' and ')}.`}
            </Text>

            <View style={s.buttons}>
              <Pressable
                onPress={add}
                disabled={!text.trim()}
                style={({ pressed }) => [
                  s.button,
                  s.primary,
                  !text.trim() && s.disabled,
                  pressed && s.pressed,
                ]}
              >
                <Text style={s.primaryLabel}>Pin it up</Text>
              </Pressable>
              <Pressable onPress={close} style={({ pressed }) => [s.button, pressed && s.pressed]}>
                <Text style={s.buttonLabel}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bg,
    borderTopColor: c.line,
    borderTopWidth: 1,
    padding: gap(3),
    maxHeight: '90%',
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontFamily: mono,
    fontSize: t.tiny,
    color: c.dim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: gap(1.5),
  },
  gapTop: { marginTop: gap(4) },
  input: {
    color: c.paper,
    fontSize: t.title,
    lineHeight: t.title * 1.2,
    minHeight: gap(9),
    padding: 0,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: gap(1) },
  chip: {
    paddingVertical: gap(1),
    paddingHorizontal: gap(1.75),
    borderRadius: 2,
    borderWidth: 1,
    borderColor: c.asleepEdge,
  },
  chipOn: { backgroundColor: c.paper, borderColor: c.paper },
  chipOff: { opacity: 0.35 },
  chipLabel: { color: c.dim, fontSize: t.small },
  chipLabelOn: { color: c.ink },
  chipLabelOff: { color: c.asleepInk },
  preview: { color: c.hot, fontSize: t.small, marginTop: gap(2.5), lineHeight: t.small * 1.5 },
  buttons: { flexDirection: 'row', gap: gap(1.5), marginTop: gap(3) },
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
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
