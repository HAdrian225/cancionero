import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { hapticLight, hapticSelect } from '../theme';
import {
  BEAT_ACCENT,
  BEAT_CLAP,
  BEAT_MUTE,
  BEAT_NORMAL,
  MAX_BEATS,
  MAX_BPM,
  MAX_UNIT,
  MIN_BEATS,
  MIN_BPM,
  MIN_UNIT,
  clampBeats,
  clampBeatUnit,
  clampBpm,
  nextBeatType,
  normalizePattern,
} from '../utils/metronome';

const PRESETS = [
  { beats: 2, beatUnit: 4, label: '2/4' },
  { beats: 3, beatUnit: 4, label: '3/4' },
  { beats: 4, beatUnit: 4, label: '4/4' },
  { beats: 6, beatUnit: 8, label: '6/8' },
];

export function MetronomePanel({
  c,
  bpm,
  beats,
  beatUnit,
  pattern,
  playing,
  activeBeat,
  onTogglePlay,
  onChangeConfig,
}) {
  const isPreset = PRESETS.some((p) => p.beats === beats && p.beatUnit === beatUnit);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const tapsRef = useRef([]);

  const safePattern = normalizePattern(pattern, beats);

  const emit = (patch) => {
    const nextBeats = clampBeats(patch.beats ?? beats);
    const nextUnit = clampBeatUnit(patch.beatUnit ?? beatUnit);
    const nextBpm = clampBpm(patch.bpm ?? bpm);
    const nextPattern = normalizePattern(patch.pattern ?? safePattern, nextBeats);
    onChangeConfig({
      bpm: nextBpm,
      beats: nextBeats,
      beatUnit: nextUnit,
      pattern: nextPattern,
    });
  };

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
      if (avgMs > 0) {
        // Compensa por denominador para que el pulso suene exactamente al ritmo tapeado.
        const computed = (60000 / avgMs) * (4 / beatUnit);
        emit({ bpm: clampBpm(computed) });
      }
    }
  };

  const handleToggleBeat = (index) => {
    hapticSelect();
    const updated = safePattern.map((val, idx) => (idx === index ? nextBeatType(val) : val));
    emit({ pattern: updated });
  };

  const showCustomBar = customOpen;
  const customTabActive = showCustomBar || !isPreset;

  return (
    <View style={styles.wrap}>
      {/* Presets de compás + botón Custom */}
      <View style={[styles.sigRow, { backgroundColor: c.surfaceAlt }]}>
        {PRESETS.map((sig) => {
          const active = !customOpen && beats === sig.beats && beatUnit === sig.beatUnit;
          return (
            <Pressable
              key={sig.label}
              onPress={() => {
                hapticSelect();
                setCustomOpen(false);
                emit({ beats: sig.beats, beatUnit: sig.beatUnit });
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

        <Pressable
          onPress={() => {
            hapticSelect();
            setCustomOpen((prev) => !prev);
          }}
          style={[styles.sigBtn, customTabActive && { backgroundColor: c.accent }]}
        >
          <Text
            style={[
              styles.sigText,
              {
                color: customTabActive ? c.onAccent : c.fg,
                fontWeight: customTabActive ? '700' : '500',
              },
            ]}
          >
            {isPreset ? 'Custom' : `${beats}/${beatUnit}`}
          </Text>
        </Pressable>
      </View>

      {/* Selector de compás custom: numerador / denominador (ej. 2/5, 7/8, 5/4) */}
      {showCustomBar ? (
        <View style={[styles.customBar, { backgroundColor: c.surfaceAlt, borderColor: c.line }]}>
          <View style={styles.customGroup}>
            <Text style={[styles.customLabel, { color: c.sub }]}>Pulsos</Text>
            <View style={styles.stepper}>
              <Pressable
                disabled={beats <= MIN_BEATS}
                accessibilityLabel="Menos pulsos"
                onPress={() => {
                  hapticSelect();
                  emit({ beats: beats - 1 });
                }}
                style={[
                  styles.stepSmall,
                  { backgroundColor: c.surface },
                  beats <= MIN_BEATS && styles.disabled,
                ]}
              >
                <Text style={[styles.stepSmallText, { color: c.fg }]}>−</Text>
              </Pressable>
              <Text style={[styles.customVal, { color: c.fg }]}>{beats}</Text>
              <Pressable
                disabled={beats >= MAX_BEATS}
                accessibilityLabel="Más pulsos"
                onPress={() => {
                  hapticSelect();
                  emit({ beats: beats + 1 });
                }}
                style={[
                  styles.stepSmall,
                  { backgroundColor: c.surface },
                  beats >= MAX_BEATS && styles.disabled,
                ]}
              >
                <Text style={[styles.stepSmallText, { color: c.fg }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.slash, { color: c.sub }]}>/</Text>

          <View style={styles.customGroup}>
            <Text style={[styles.customLabel, { color: c.sub }]}>Figura</Text>
            <View style={styles.stepper}>
              <Pressable
                disabled={beatUnit <= MIN_UNIT}
                accessibilityLabel="Bajar denominador"
                onPress={() => {
                  hapticSelect();
                  emit({ beatUnit: beatUnit - 1 });
                }}
                style={[
                  styles.stepSmall,
                  { backgroundColor: c.surface },
                  beatUnit <= MIN_UNIT && styles.disabled,
                ]}
              >
                <Text style={[styles.stepSmallText, { color: c.fg }]}>−</Text>
              </Pressable>
              <Text style={[styles.customVal, { color: c.fg }]}>{beatUnit}</Text>
              <Pressable
                disabled={beatUnit >= MAX_UNIT}
                accessibilityLabel="Subir denominador"
                onPress={() => {
                  hapticSelect();
                  emit({ beatUnit: beatUnit + 1 });
                }}
                style={[
                  styles.stepSmall,
                  { backgroundColor: c.surface },
                  beatUnit >= MAX_UNIT && styles.disabled,
                ]}
              >
                <Text style={[styles.stepSmallText, { color: c.fg }]}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Pads interactivos por tiempo: tocá para elegir Negra / Palma / Fuerte / Silencio */}
      <View style={styles.padsWrap}>
        <View style={styles.padsGrid}>
          {safePattern.map((type, i) => {
            const isLit = playing && activeBeat === i;
            const isAccent = type === BEAT_ACCENT;
            const isClap = type === BEAT_CLAP;
            const isMute = type === BEAT_MUTE;
            const isNormal = type === BEAT_NORMAL;

            const bg = isLit
              ? c.accent
              : isAccent
                ? c.accentSoft
                : isClap
                  ? c.accentSoft
                  : isMute
                    ? 'transparent'
                    : c.surfaceAlt;

            const border = isLit
              ? c.accent
              : isAccent
                ? c.accent
                : isClap
                  ? c.chord
                  : c.line;

            const fg = isLit
              ? c.onAccent
              : isAccent
                ? c.accent
                : isClap
                  ? c.chord
                  : isMute
                    ? c.sub
                    : c.fg;

            const typeLabel = isAccent
              ? 'Fuerte'
              : isClap
                ? 'Palma'
                : isMute
                  ? 'Silencio'
                  : 'Negra';

            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Tiempo ${i + 1}: ${typeLabel}. Tocá para cambiar`}
                onPress={() => handleToggleBeat(i)}
                style={({ pressed }) => [
                  styles.beatPad,
                  {
                    backgroundColor: bg,
                    borderColor: border,
                    borderStyle: isMute ? 'dashed' : 'solid',
                  },
                  isLit && styles.beatPadLit,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.beatNum, { color: fg }]}>{i + 1}</Text>
                {isClap ? (
                  <Ionicons name="hand-left-outline" size={14} color={fg} />
                ) : isAccent ? (
                  <Ionicons name="radio-button-on" size={14} color={fg} />
                ) : isNormal ? (
                  <Ionicons name="ellipse" size={9} color={fg} />
                ) : (
                  <Text style={[styles.muteDash, { color: fg }]}>–</Text>
                )}
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.padLegend, { color: c.sub }]}>
          Tocá cada tiempo para cambiar: Negra · Palma · Fuerte · Silencio
        </Text>
      </View>

      {/* BPM grande + controles finos */}
      <View style={styles.bpmRow}>
        <Pressable
          accessibilityLabel="Bajar 5 BPM"
          onPress={() => {
            hapticSelect();
            emit({ bpm: bpm - 5 });
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
            emit({ bpm: bpm - 1 });
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
          <Text style={[styles.bpmUnit, { color: c.sub }]}>
            ♩ BPM · {beats}/{beatUnit}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Subir 1 BPM"
          onPress={() => {
            hapticSelect();
            emit({ bpm: bpm + 1 });
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
            emit({ bpm: bpm + 5 });
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
          En Expo Go pulsa con vibración y luz; en la versión web/PWA suena con audio (click y palmas).
        </Text>
      ) : null}
    </View>
  );
}

export { MIN_BPM, MAX_BPM };

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  sigRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  sigBtn: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 6,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigText: {
    fontSize: 12.5,
  },
  customBar: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  customGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  customLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSmallText: {
    fontSize: 16,
    fontWeight: '700',
  },
  customVal: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  slash: {
    fontSize: 22,
    fontWeight: '300',
    marginTop: 14,
  },
  padsWrap: {
    gap: 6,
  },
  padsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  beatPad: {
    minWidth: 44,
    height: 46,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  beatPadLit: {
    transform: [{ scale: 1.05 }],
  },
  beatNum: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  muteDash: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 14,
  },
  padLegend: {
    fontSize: 11.5,
    textAlign: 'center',
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
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  bpmUnit: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    fontSize: 11.5,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.35,
  },
});
