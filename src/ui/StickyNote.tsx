import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { Note, State, World } from '../core/types';
import { blockers } from '../core/engine';
import { phrase } from './words';
import { c, gap, mono, t } from './theme';

/*
  Одна бумажка на доске.

  Она всё время еле заметно дышит: наклон и сдвиг ходят по своему кругу,
  период у каждой заметки свой. Это тот же приём, что у кольца кадров на
  creativeoglu.com, — периоды берутся несоизмеримыми, и бумажки не
  выстраиваются в общий такт, сколько на них ни смотри.
*/

/** Устойчивое число 0—1 из строки: одна и та же заметка всегда висит одинаково. */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function StickyNote({
  note,
  state,
  world,
  onPress,
}: {
  note: Note;
  state: State;
  world: World;
  onPress: () => void;
}) {
  const seed = hash01(note.id);
  const drift = useSharedValue(0);

  useEffect(() => {
    // 7—12 секунд на полный ход: медленнее, чем взгляд, и быстрее, чем скука.
    const period = 7000 + seed * 5000;
    drift.value = 0;
    drift.value = withRepeat(
      withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, seed]);

  // Созревшая бумажка ходит заметнее спящей: движение — тоже способ сказать,
  // что она просит внимания.
  const swing = state === 'ripe' ? 1 : 0.35;
  const tilt = (seed - 0.5) * 5;

  const float = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [-4 * swing, 4 * swing]) },
      { rotate: `${tilt + interpolate(drift.value, [0, 1], [-0.7, 0.7]) * swing}deg` },
    ],
  }));

  const held = blockers(note, world);
  const ripe = state === 'ripe';

  return (
    <Animated.View style={float}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          ripe
            ? `${note.text}. Ready now.`
            : `${note.text}. Waiting for ${held.map((h) => phrase(h.c)).join(', ')}.`
        }
        style={({ pressed }) => [
          s.card,
          ripe ? s.ripe : state === 'unsure' ? s.unsure : s.asleep,
          pressed && s.pressed,
        ]}
      >
        <Text style={[s.text, ripe ? s.textRipe : state === 'unsure' ? s.textUnsure : s.textAsleep]}>
          {note.text}
        </Text>

        {ripe ? (
          <View style={s.foot}>
            <View style={s.dot} />
            <Text style={s.now}>now</Text>
          </View>
        ) : (
          <Text style={[s.waiting, state === 'unsure' && s.waitingUnsure]} numberOfLines={2}>
            {held.map((h) => phrase(h.c)).join('  ·  ')}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 2,
    padding: gap(2),
    minHeight: gap(14),
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  ripe: {
    backgroundColor: c.paper,
    borderColor: c.paper,
  },
  asleep: {
    backgroundColor: c.asleep,
    borderColor: c.asleepEdge,
  },
  unsure: {
    backgroundColor: c.asleep,
    borderColor: c.unsureEdge,
    borderStyle: 'dashed',
  },
  pressed: { opacity: 0.7 },
  text: { fontSize: t.note, lineHeight: t.note * 1.25, marginBottom: gap(1.5) },
  textRipe: { color: c.ink },
  textAsleep: { color: c.asleepInk },
  textUnsure: { color: c.unsureInk },
  foot: { flexDirection: 'row', alignItems: 'center', gap: gap(0.75) },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.hot },
  now: { fontFamily: mono, fontSize: t.tiny, color: c.ink, letterSpacing: 1 },
  waiting: { fontFamily: mono, fontSize: t.tiny, color: c.dim, lineHeight: t.tiny * 1.5 },
  waitingUnsure: { color: c.unsureInk },
});
