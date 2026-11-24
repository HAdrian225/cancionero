import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H_INSET, hapticSelect } from '../theme';
import { getBottomInsetPadding } from './Screen';
import { Button, IconButton } from './UI';

const FALLBACK_SEMITONES = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

export function KeyPickerModal({ c, visible, options, currentN, onSelectN, onClose }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const activeMod = ((currentN % 12) + 12) % 12;
  const items = options
    ? options
    : FALLBACK_SEMITONES.map((semitones) => ({
        label: semitones === 0 ? 'Orig' : `${semitones > 0 ? '+' : ''}${semitones}`,
        rawDelta: ((semitones % 12) + 12) % 12,
        semitones,
        isOriginal: semitones === 0,
      }));

  const originalLabel = options?.find((o) => o.isOriginal)?.label;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surface,
              borderColor: c.line,
              paddingBottom: getBottomInsetPadding(insets.bottom, 22),
              paddingLeft: Platform.OS === 'web' ? H_INSET : insets.left + H_INSET,
              paddingRight: Platform.OS === 'web' ? H_INSET : insets.right + H_INSET,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.line }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: c.fg }]}>Elegir tono</Text>
              <Text style={[styles.subtitle, { color: c.sub }]}>
                {originalLabel
                  ? `Tono original: ${originalLabel} · Tocá el tono al que querés pasar`
                  : 'Elegí la transposición en semitonos'}
              </Text>
            </View>
            <IconButton
              c={c}
              name="close"
              size={20}
              accessibilityLabel="Cerrar selector de tono"
              onPress={onClose}
            />
          </View>

          <View style={styles.grid}>
            {items.map((item) => {
              const active = item.rawDelta === activeMod;
              const deltaText = item.isOriginal
                ? 'Orig'
                : `${item.semitones > 0 ? '+' : ''}${item.semitones}`;

              return (
                <Pressable
                  key={item.rawDelta}
                  accessibilityRole="button"
                  accessibilityLabel={`Cambiar a tono ${item.label}`}
                  onPress={() => {
                    hapticSelect();
                    onSelectN(item.semitones);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      backgroundColor: active
                        ? c.accent
                        : item.isOriginal
                          ? c.accentSoft
                          : c.surfaceAlt,
                      borderColor: active
                        ? c.accent
                        : item.isOriginal
                          ? c.accent
                          : 'transparent',
                    },
                    pressed && styles.cellPressed,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cellKey,
                      { color: active ? c.onAccent : item.isOriginal ? c.accent : c.fg },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cellMeta,
                      {
                        color: active ? c.onAccent : item.isOriginal ? c.accent : c.sub,
                        opacity: active ? 0.85 : 1,
                      },
                    ]}
                  >
                    {deltaText}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {currentN !== 0 ? (
            <Button
              c={c}
              variant="secondary"
              icon="refresh-outline"
              label={
                originalLabel
                  ? `Volver al tono original (${originalLabel})`
                  : 'Volver al tono original'
              }
              onPress={() => {
                onSelectN(0);
                onClose();
              }}
              style={styles.resetBtn}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  cell: {
    width: '23.2%',
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  cellKey: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cellMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  resetBtn: {
    marginTop: 14,
  },
});
