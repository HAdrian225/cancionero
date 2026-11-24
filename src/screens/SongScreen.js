import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { INSTRUMENTS, voicing } from '../../chords';
import { isChord, isChordLine, transposeChordLine } from '../../transpose';
import { ChordDiagram } from '../components/ChordDiagram';
import { KeyPickerModal } from '../components/KeyPickerModal';
import { Screen } from '../components/Screen';
import { BackButton, Button, HeaderBar, IconButton } from '../components/UI';
import { H_INSET, MONO_FONT, hapticLight, hapticSelect } from '../theme';
import { buildKeyOptions, extractChords } from '../utils/songs';

const MIN_FS = 11;
const MAX_FS = 22;

export function SongScreen({
  c,
  group,
  version,
  backLabel,
  onBack,
  onMenu,
  n,
  onChangeN,
  tools,
  onToggleTools,
  inst,
  onPickInst,
  chord,
  onSelectChord,
  fs,
  onChangeFs,
}) {
  const [keyPickerOpen, setKeyPickerOpen] = useState(false);

  const lines = useMemo(() => version.body.split('\n'), [version.body]);
  const originalFirstChord = useMemo(() => extractChords(version.body, 0)[0] || null, [version.body]);
  const keyOptions = useMemo(() => buildKeyOptions(originalFirstChord), [originalFirstChord]);
  const allChords = useMemo(() => extractChords(version.body, n), [version.body, n]);
  const firstChord = allChords[0];
  const diagram = chord ? voicing(chord, inst) : null;

  const activeMod = ((n % 12) + 12) % 12;
  const currentKeyLabel =
    keyOptions?.find((o) => o.rawDelta === activeMod)?.label || firstChord || null;

  const monoStyle = useMemo(
    () => ({
      fontFamily: MONO_FONT,
      fontSize: fs,
      lineHeight: Math.round(fs * 1.48),
    }),
    [fs]
  );

  const semitoneText =
    n === 0 ? 'Original' : `${n > 0 ? '+' : ''}${n} ${Math.abs(n) === 1 ? 'semitono' : 'semitonos'}`;

  const openKeyPicker = () => {
    hapticLight();
    setKeyPickerOpen(true);
  };

  return (
    <Screen c={c} noHorizontalInset>
      {/* Header con truncado seguro: Back, Acordes y Menú jamás se solapan */}
      <HeaderBar
        style={styles.padded}
        left={<BackButton c={c} label={backLabel} onPress={onBack} />}
        right={
          <>
            <Button
              c={c}
              compact
              variant={tools ? 'primary' : 'secondary'}
              icon={tools ? 'close' : 'musical-notes-outline'}
              label={tools ? 'Cerrar' : 'Acordes'}
              onPress={onToggleTools}
            />
            <IconButton
              c={c}
              name="ellipsis-horizontal"
              size={20}
              accessibilityLabel="Opciones de la canción"
              onPress={onMenu}
            />
          </>
        }
      />

      {/* Encabezado editorial: título real de la canción arriba, versión descriptiva y tono tocable */}
      <View style={[styles.titleSection, styles.padded, { borderBottomColor: c.line }]}>
        <Text numberOfLines={2} style={[styles.songTitle, { color: c.fg }]}>
          {group.title}
        </Text>
        <View style={styles.metaStrip}>
          <View style={[styles.pill, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[styles.pillText, { color: c.sub }]}>{version.name}</Text>
          </View>

          {currentKeyLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tono actual ${currentKeyLabel}. Tocá para cambiar tono`}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={openKeyPicker}
              style={({ pressed }) => [
                styles.pill,
                styles.keyPill,
                { backgroundColor: c.accentSoft },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.pillText, { color: c.chord, fontWeight: '700' }]}>
                Tono {currentKeyLabel}
              </Text>
              <Ionicons name="chevron-down" size={13} color={c.chord} />
            </Pressable>
          ) : null}

          <View
            style={[
              styles.pill,
              { backgroundColor: n !== 0 ? c.accentSoft : c.surfaceAlt },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                {
                  color: n !== 0 ? c.accent : c.sub,
                  fontWeight: n !== 0 ? '700' : '500',
                },
              ]}
            >
              {semitoneText}
            </Text>
          </View>
        </View>
      </View>

      {/* Letra + acordes: scroll horizontal con sangría de 22 pt en ambos extremos (anti-templado) */}
      <ScrollView
        style={styles.sheetScroll}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.sheetVerticalContent}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sheetHorizontalContent}
        >
          <View>
            {lines.map((line, i) =>
              isChordLine(line) ? (
                <Text
                  key={i}
                  style={[monoStyle, styles.chordLine, { color: c.chord }]}
                >
                  {transposeChordLine(line, n)
                    .split(/(\s+)/)
                    .map((tok, j) =>
                      isChord(tok) ? (
                        <Text
                          key={j}
                          onPress={() => {
                            hapticSelect();
                            onSelectChord(tok);
                            if (!tools) onToggleTools();
                          }}
                        >
                          {tok}
                        </Text>
                      ) : (
                        tok
                      )
                    )}
                </Text>
              ) : (
                <Text key={i} style={[monoStyle, { color: c.fg }]}>
                  {line || ' '}
                </Text>
              )
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Panel de Acordes y Tamaño de letra: columnas acotadas sin solapamiento */}
      {tools ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: c.surface,
              borderColor: c.line,
              marginHorizontal: H_INSET,
            },
          ]}
        >
          <View style={[styles.seg, { backgroundColor: c.surfaceAlt }]}>
            {Object.keys(INSTRUMENTS).map((item) => {
              const active = inst === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => {
                    hapticSelect();
                    onPickInst(item);
                  }}
                  style={[
                    styles.segItem,
                    active && { backgroundColor: c.accent },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={[
                      styles.segText,
                      { color: active ? c.onAccent : c.fg, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {allChords.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {allChords.map((a) => {
                const active = chord === a;
                return (
                  <Pressable
                    key={a}
                    onPress={() => {
                      hapticSelect();
                      onSelectChord(a);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? c.accent : c.surfaceAlt,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? c.onAccent : c.chord },
                      ]}
                    >
                      {a}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={[styles.diagramRow, { borderTopColor: c.line }]}>
            <View style={styles.diagramLeft}>
              {chord ? (
                diagram ? (
                  <ChordDiagram v={diagram} ns={INSTRUMENTS[inst].tuning.length} c={c} />
                ) : (
                  <Text style={[styles.diagramHint, { color: c.sub }]}>
                    Sin digitación para {chord} en {inst.toLowerCase()}.
                  </Text>
                )
              ) : (
                <Text style={[styles.diagramHint, { color: c.sub }]}>
                  Tocá un acorde arriba o en la letra para ver su forma en {inst.toLowerCase()}.
                </Text>
              )}
            </View>

            <View style={[styles.diagramDivider, { backgroundColor: c.line }]} />

            <View style={styles.diagramRight}>
              {chord ? (
                <Text numberOfLines={1} style={[styles.chordHeading, { color: c.chord }]}>
                  {chord}
                </Text>
              ) : null}
              <Text style={[styles.fontLabel, { color: c.sub }]}>Letra · {fs}pt</Text>
              <View style={styles.fontControls}>
                <Pressable
                  disabled={fs <= MIN_FS}
                  accessibilityLabel="Achicar letra"
                  onPress={() => {
                    hapticSelect();
                    onChangeFs(Math.max(MIN_FS, fs - 1));
                  }}
                  style={({ pressed }) => [
                    styles.sizeBtn,
                    { backgroundColor: c.surfaceAlt },
                    fs <= MIN_FS && styles.disabled,
                    pressed && fs > MIN_FS && styles.pressed,
                  ]}
                >
                  <Text style={[styles.sizeBtnText, { color: c.fg }]}>A−</Text>
                </Pressable>
                <Pressable
                  disabled={fs >= MAX_FS}
                  accessibilityLabel="Agrandar letra"
                  onPress={() => {
                    hapticSelect();
                    onChangeFs(Math.min(MAX_FS, fs + 1));
                  }}
                  style={({ pressed }) => [
                    styles.sizeBtn,
                    { backgroundColor: c.surfaceAlt },
                    fs >= MAX_FS && styles.disabled,
                    pressed && fs < MAX_FS && styles.pressed,
                  ]}
                >
                  <Text style={[styles.sizeBtnText, { color: c.fg }]}>A+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* Barra inferior: − / selector directo de tono / + */}
      <View style={[styles.transposeBar, styles.padded, { borderTopColor: c.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bajar medio tono"
          onPress={() => {
            hapticSelect();
            onChangeN(n - 1);
          }}
          style={({ pressed }) => [
            styles.stepBtn,
            { backgroundColor: c.surface, borderColor: c.line },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="remove" size={22} color={c.fg} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir tono directamente"
          onPress={openKeyPicker}
          style={({ pressed }) => [
            styles.centerBtn,
            {
              backgroundColor: n !== 0 ? c.accentSoft : c.surface,
              borderColor: n !== 0 ? c.accent : c.line,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.centerBtnText,
              { color: n !== 0 ? c.accent : c.fg },
            ]}
          >
            {currentKeyLabel
              ? n === 0
                ? `Tono ${currentKeyLabel}`
                : `Tono ${currentKeyLabel} (${n > 0 ? '+' : ''}${n})`
              : n === 0
                ? 'Elegir tono'
                : `${n > 0 ? '+' : ''}${n} semitonos`}
          </Text>
          <Ionicons
            name="chevron-up"
            size={16}
            color={n !== 0 ? c.accent : c.sub}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Subir medio tono"
          onPress={() => {
            hapticSelect();
            onChangeN(n + 1);
          }}
          style={({ pressed }) => [
            styles.stepBtn,
            { backgroundColor: c.surface, borderColor: c.line },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={22} color={c.fg} />
        </Pressable>
      </View>

      <KeyPickerModal
        c={c}
        visible={keyPickerOpen}
        options={keyOptions}
        currentN={n}
        onSelectN={onChangeN}
        onClose={() => setKeyPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: {
    paddingHorizontal: H_INSET,
  },
  titleSection: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  metaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
  },
  keyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetVerticalContent: {
    paddingTop: 14,
    paddingBottom: 28,
  },
  sheetHorizontalContent: {
    paddingHorizontal: H_INSET,
    minWidth: '100%',
  },
  chordLine: {
    fontWeight: '700',
  },
  panel: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  seg: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  segItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: {
    fontSize: 12.5,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsContent: {
    gap: 8,
    paddingVertical: 1,
  },
  chip: {
    minHeight: 44,
    minWidth: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  diagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    minHeight: 138,
  },
  diagramLeft: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
  },
  diagramHint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  diagramDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  diagramRight: {
    width: 120,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
    gap: 8,
  },
  chordHeading: {
    fontSize: 21,
    fontWeight: '700',
  },
  fontLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  fontControls: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeBtn: {
    width: 46,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  transposeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepBtn: {
    width: 60,
    height: 48,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  centerBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.35,
  },
});
