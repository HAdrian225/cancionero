import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H_INSET, MONO_FONT, hapticLight, hapticSelect } from '../theme';
import { TAB_STRINGS, formatTabGrid } from '../utils/songs';
import { getBottomInsetPadding } from './Screen';
import { Button, IconButton } from './UI';

const DEFAULT_COLS = 8;
const MAX_COLS = 16;
const MIN_COLS = 4;

const FRET_PAD = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12'];
const TECH_PAD = ['h', 'p', '/', '\\', 'b', '~', 'x'];

function makeEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

export function TabBuilderModal({ c, visible, initialInst = 'Guitarra', onClose, onInsert }) {
  const insets = useSafeAreaInsets();
  const safeInit = TAB_STRINGS[initialInst] ? initialInst : 'Guitarra';
  const [inst, setInst] = useState(safeInit);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [label, setLabel] = useState('Punteo');
  const [grid, setGrid] = useState(() => makeEmptyGrid(TAB_STRINGS[safeInit].length, DEFAULT_COLS));
  const [sel, setSel] = useState({ r: 0, c: 0 });

  useEffect(() => {
    if (!visible) return;
    const target = TAB_STRINGS[initialInst] ? initialInst : 'Guitarra';
    setInst(target);
    setCols(DEFAULT_COLS);
    setLabel('Punteo');
    setGrid(makeEmptyGrid(TAB_STRINGS[target].length, DEFAULT_COLS));
    setSel({ r: 0, c: 0 });
  }, [visible, initialInst]);

  const strings = TAB_STRINGS[inst] || TAB_STRINGS.Guitarra;
  const preview = useMemo(() => formatTabGrid(strings, grid, label), [strings, grid, label]);

  if (!visible) return null;

  const switchInst = (nextInst) => {
    hapticSelect();
    setInst(nextInst);
    setGrid(makeEmptyGrid(TAB_STRINGS[nextInst].length, cols));
    setSel({ r: 0, c: 0 });
  };

  const changeCols = (delta) => {
    const nextCols = Math.max(MIN_COLS, Math.min(MAX_COLS, cols + delta));
    if (nextCols === cols) return;
    hapticSelect();
    setCols(nextCols);
    setGrid((prev) =>
      prev.map((row) =>
        nextCols > row.length
          ? [...row, ...Array.from({ length: nextCols - row.length }, () => '')]
          : row.slice(0, nextCols)
      )
    );
    setSel((prev) => ({ r: prev.r, c: Math.min(prev.c, nextCols - 1) }));
  };

  const setCell = (value, append = false) => {
    hapticSelect();
    setGrid((prev) =>
      prev.map((row, rIdx) =>
        rIdx !== sel.r
          ? row
          : row.map((cell, cIdx) => {
              if (cIdx !== sel.c) return cell;
              if (!append) return value;
              return (cell + value).slice(0, 6);
            })
      )
    );
  };

  const handleFretTap = (val) => {
    const cur = grid[sel.r]?.[sel.c] || '';
    if (/[hp\/\\b~]$/.test(cur)) {
      setCell(val, true);
      return;
    }
    // Permite armar trastes de 2 dígitos como 11, 13, 14, 15..24 tocando dos números seguidos.
    if (/^[12]$/.test(cur) && /^\d$/.test(val) && Number(cur + val) <= 24) {
      setCell(val, true);
      return;
    }
    setCell(val, false);
  };

  const handleTechTap = (sym) => {
    if (sym === 'x') {
      setCell('x', false);
      return;
    }
    const cur = grid[sel.r]?.[sel.c] || '';
    if (!cur || cur === 'x' || /[hp\/\\b~]$/.test(cur)) {
      return;
    }
    setCell(sym, true);
  };

  const handleInsert = () => {
    hapticLight();
    onInsert(preview);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surface,
              borderColor: c.line,
              paddingBottom: getBottomInsetPadding(insets.bottom, 16),
              paddingLeft: Platform.OS === 'web' ? H_INSET : insets.left + H_INSET,
              paddingRight: Platform.OS === 'web' ? H_INSET : insets.right + H_INSET,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.line }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: c.fg }]}>Armar tablatura</Text>
              <Text style={[styles.subtitle, { color: c.sub }]}>
                Tocá una cuerda y elegí el traste. Formato clásico LaCuerda / CifraClub.
              </Text>
            </View>
            <IconButton
              c={c}
              name="close"
              size={20}
              accessibilityLabel="Cerrar editor de tablatura"
              onPress={onClose}
            />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Selector de instrumento */}
            <View style={[styles.seg, { backgroundColor: c.surfaceAlt }]}>
              {Object.keys(TAB_STRINGS).map((item) => {
                const active = inst === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => switchInst(item)}
                    style={[styles.segItem, active && { backgroundColor: c.accent }]}
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

            {/* Etiqueta opcional + cantidad de pasos */}
            <View style={styles.metaRow}>
              <TextInput
                style={[
                  styles.labelInput,
                  { backgroundColor: c.surfaceAlt, color: c.fg, borderColor: c.line },
                ]}
                value={label}
                onChangeText={setLabel}
                placeholder="Etiqueta (ej: Intro, Solo)"
                placeholderTextColor={c.sub}
              />
              <View style={styles.colControls}>
                <Pressable
                  disabled={cols <= MIN_COLS}
                  onPress={() => changeCols(-2)}
                  style={[
                    styles.colBtn,
                    { backgroundColor: c.surfaceAlt },
                    cols <= MIN_COLS && styles.disabled,
                  ]}
                >
                  <Text style={[styles.colBtnText, { color: c.fg }]}>−2</Text>
                </Pressable>
                <Text style={[styles.colCount, { color: c.sub }]}>{cols}t</Text>
                <Pressable
                  disabled={cols >= MAX_COLS}
                  onPress={() => changeCols(2)}
                  style={[
                    styles.colBtn,
                    { backgroundColor: c.surfaceAlt },
                    cols >= MAX_COLS && styles.disabled,
                  ]}
                >
                  <Text style={[styles.colBtnText, { color: c.fg }]}>+2</Text>
                </Pressable>
              </View>
            </View>

            {/* Grilla interactiva de cuerdas (aguda arriba -> grave abajo) */}
            <View style={[styles.gridCard, { backgroundColor: c.surfaceAlt, borderColor: c.line }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.gridInner}>
                  {strings.map((str, rIdx) => (
                    <View key={`${str}-${rIdx}`} style={styles.stringRow}>
                      <Text style={[styles.stringName, { color: c.chord, fontFamily: MONO_FONT }]}>
                        {str}|
                      </Text>
                      {Array.from({ length: cols }, (_, cIdx) => {
                        const val = grid[rIdx]?.[cIdx] || '';
                        const active = sel.r === rIdx && sel.c === cIdx;
                        return (
                          <Pressable
                            key={cIdx}
                            onPress={() => {
                              hapticSelect();
                              setSel({ r: rIdx, c: cIdx });
                            }}
                            style={[
                              styles.cell,
                              {
                                backgroundColor: active
                                  ? c.accent
                                  : val
                                    ? c.surface
                                    : 'transparent',
                                borderColor: active ? c.accent : c.line,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.cellText,
                                {
                                  fontFamily: MONO_FONT,
                                  color: active ? c.onAccent : val ? c.fg : c.sub,
                                },
                              ]}
                            >
                              {val || '—'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Teclado rápido de trastes y técnicas */}
            <View style={styles.padWrap}>
              <View style={styles.padRow}>
                {FRET_PAD.map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => handleFretTap(num)}
                    style={({ pressed }) => [
                      styles.padKey,
                      { backgroundColor: c.surfaceAlt },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.padKeyText, { color: c.fg }]}>{num}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.techRow}>
                {TECH_PAD.map((sym) => (
                  <Pressable
                    key={sym}
                    onPress={() => handleTechTap(sym)}
                    style={({ pressed }) => [
                      styles.techKey,
                      { backgroundColor: c.accentSoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.techKeyText, { color: c.accent }]}>{sym}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setCell('', false)}
                  style={({ pressed }) => [
                    styles.clearKey,
                    { backgroundColor: c.dangerSoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.clearKeyText, { color: c.danger }]}>Borrar</Text>
                </Pressable>
              </View>
            </View>

            {/* Vista previa exacta de cómo quedará en la canción */}
            <View style={[styles.previewBox, { backgroundColor: c.bg, borderColor: c.line }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text style={[styles.previewText, { color: c.fg, fontFamily: MONO_FONT }]}>
                  {preview}
                </Text>
              </ScrollView>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: c.line }]}>
            <Button
              c={c}
              icon="add-circle-outline"
              label="Insertar tablatura en la canción"
              onPress={handleInsert}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    maxHeight: '92%',
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 12,
  },
  seg: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  segItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: {
    fontSize: 12.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labelInput: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  colControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colBtn: {
    width: 38,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  colCount: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 26,
    textAlign: 'center',
  },
  gridCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  gridInner: {
    gap: 5,
  },
  stringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stringName: {
    width: 24,
    fontSize: 14,
    fontWeight: '700',
  },
  cell: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '700',
  },
  padWrap: {
    gap: 8,
  },
  padRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  padKey: {
    width: '14.6%',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyText: {
    fontSize: 15,
    fontWeight: '700',
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  techKey: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techKeyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  clearKey: {
    flex: 1,
    minWidth: 70,
    height: 38,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearKeyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  previewText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.35,
  },
});
