import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { hapticLight, hapticSelect } from '../theme';

const SIGNATURES = [
  { beats: 2, label: '2/4' },
  { beats: 3, label: '3/4' },
  { beats: 4, label: '4/4' },
  { beats: 6, label: '6/8' },
];

export const MIN_BPM = 40;
export const MAX_BPM = 240;

export function MetronomePanel({
  c,
  bpm,
  beats,
  playing,
  activeBeat,
  onTogglePlay,
  onChangeBpm,
  onChangeBeats,
}) {
  const tapsRef = useRef([]);

  const clampBpm = (val) => Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(val)));

  const handleTapTempo = () => {
    hapticLight();
    const now = Date.now();
    const recent = tapsRef.current.filter((t) => now - t < 2200);
    recent.push(now);
    tapsRef.current = recent.slice(-5);

    if (recent.length >= 2) {
      let sum = 0;
      for (let i = 1; i < recent.length; i++) sum += recent[i] - recent[i - 1];
      const avgMs = sum / (recent.length - 1);
      if (avgMs > 0) onChangeBpm(clampBpm(60000 / avgMs));
    }
  };

  return (
    <View style={styles.wrap}>
      {/* Luces de pulso + compás */}
      <View style={styles.topRow}>
        <View style={styles.dots}>
          {Array.from({ length: beats }, (_, i) => {
            const isLit = playing && activeBeat === i;
            const isFirst = i === 0;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  isFirst && styles.dotFirst,
                  {
                    backgroundColor: isLit
                      ? isFirst
                        ? c.accent
                        : c.chord
                      : c.surfaceAlt,
                    borderColor: isFirst ? c.accent : c.line,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={[styles.sigRow, { backgroundColor: c.surfaceAlt }]}>
          {SIGNATURES.map((sig) => {
            const active = beats === sig.beats;
            return (
              <Pressable
                key={sig.label}
                onPress={() => {
                  hapticSelect();
                  onChangeBeats(sig.beats);
                }}
                style={[styles.sigBtn, active && { backgroundColor: c.accent }]}
              >
                <Text
                  style={[
                    styles.sigText,
                    { color: active ? c.onAccent : c.fg, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {sig.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* BPM grande + controles finos */}
      <View style={styles.bpmRow}>
        <Pressable
          accessibilityLabel="Bajar 5 BPM"
          onPress={() => {
            hapticSelect();
            onChangeBpm(clampBpm(bpm - 5));
          }}
          style={({ pressed }) => [
            styles.nudgeBtn,
            { backgroundColor: c.surfaceAlt },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.nudgeText, { color: c.fg }]}>−5</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Bajar 1 BPM"
          onPress={() => {
            hapticSelect();
            onChangeBpm(clampBpm(bpm - 1));
          }}
          style={({ pressed }) => [
            styles.nudgeBtn,
            { backgroundColor: c.surfaceAlt },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.nudgeText, { color: c.fg }]}>−1</Text>
        </Pressable>

        <View style={styles.bpmReadout}>
          <Text style={[styles.bpmValue, { color: c.fg }]}>{bpm}</Text>
          <Text style={[styles.bpmUnit, { color: c.sub }]}>BPM</Text>
        </View>

        <Pressable
          accessibilityLabel="Subir 1 BPM"
          onPress={() => {
            hapticSelect();
            onChangeBpm(clampBpm(bpm + 1));
          }}
          style={({ pressed }) => [
            styles.nudgeBtn,
            { backgroundColor: c.surfaceAlt },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.nudgeText, { color: c.fg }]}>+1</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Subir 5 BPM"
          onPress={() => {
            hapticSelect();
            onChangeBpm(clampBpm(bpm + 5));
          }}
          style={({ pressed }) => [
            styles.nudgeBtn,
            { backgroundColor: c.surfaceAlt },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.nudgeText, { color: c.fg }]}>+5</Text>
        </Pressable>
      </View>

      {/* Play/Stop + Tap Tempo */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Detener metrónomo' : 'Iniciar metrónomo'}
          onPress={() => {
            hapticLight();
            onTogglePlay();
          }}
          style={({ pressed }) => [
            styles.playBtn,
            { backgroundColor: playing ? c.danger : c.accent },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name={playing ? 'stop' : 'play'} size={18} color={c.onAccent} />
          <Text style={[styles.playText, { color: c.onAccent }]}>
            {playing ? 'Detener' : 'Iniciar'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Marcar tempo tocando"
          onPress={handleTapTempo}
          style={({ pressed }) => [
            styles.tapBtn,
            { backgroundColor: c.accentSoft, borderColor: c.accent },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="hand-left-outline" size={17} color={c.accent} />
          <Text style={[styles.tapText, { color: c.accent }]}>Tap</Text>
        </Pressable>
      </View>

      {Platform.OS !== 'web' ? (
        <Text style={[styles.nativeHint, { color: c.sub }]}>
          En Expo Go pulsa con vibración y luz; en la versión web/PWA suena con audio.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  dotFirst: {
    width: 17,
    height: 17,
    borderRadius: 9,
  },
  sigRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  sigBtn: {
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigText: {
    fontSize: 12.5,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  nudgeBtn: {
    width: 46,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bpmReadout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  bpmUnit: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  playBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tapBtn: {
    width: 96,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tapText: {
    fontSize: 15,
    fontWeight: '700',
  },
  nativeHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
