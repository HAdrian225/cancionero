import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { isChordLine } from '../../transpose';
import { Screen } from '../components/Screen';
import { TabBuilderModal } from '../components/TabBuilderModal';
import { BackButton, Button, HeaderBar } from '../components/UI';
import { MONO_FONT, hapticLight, hapticSelect } from '../theme';
import { extractChords, isTabLine } from '../utils/songs';

const SECTIONS = ['[Intro]', '[Estrofa]', '[Estribillo]', '[Puente]', '[Solo]'];

export function EditSongScreen({ c, group, version, inst, onBack, onSave }) {
  const [body, setBody] = useState(version.body);
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'
  const [selection, setSelection] = useState({ start: version.body.length, end: version.body.length });
  const [tabOpen, setTabOpen] = useState(false);

  const chords = useMemo(() => extractChords(body, 0).slice(0, 12), [body]);
  const lines = useMemo(() => body.split('\n'), [body]);
  const hasChanges = body !== version.body;

  const insertAtCursor = (snippet, surroundNewlines = false) => {
    const start = Math.max(0, Math.min(selection.start, body.length));
    const end = Math.max(start, Math.min(selection.end, body.length));
    const before = body.slice(0, start);
    const after = body.slice(end);

    let chunk = snippet;
    if (surroundNewlines) {
      const prefix = before.length > 0 && !before.endsWith('\n\n')
        ? before.endsWith('\n')
          ? '\n'
          : '\n\n'
        : '';
      const suffix = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '\n';
      chunk = `${prefix}${snippet}${suffix}`;
    }

    const next = before + chunk + after;
    const nextPos = start + chunk.length;
    setBody(next);
    setSelection({ start: nextPos, end: nextPos });
  };

  return (
    <Screen c={c} keyboardAvoiding>
      <HeaderBar
        left={<BackButton c={c} label="Cancelar" onPress={() => onBack(hasChanges)} />}
        right={
          <View style={[styles.modeSwitch, { backgroundColor: c.surfaceAlt }]}>
            {[
              { key: 'edit', label: 'Editar' },
              { key: 'preview', label: 'Vista previa' },
            ].map((item) => {
              const active = mode === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    hapticSelect();
                    if (item.key === 'preview') Keyboard.dismiss();
                    setMode(item.key);
                  }}
                  style={[styles.modePill, active && { backgroundColor: c.accent }]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      { color: active ? c.onAccent : c.fg, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
      />

      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={[styles.title, { color: c.fg }]}>
          {group.title}
        </Text>
        <View style={[styles.verBadge, { backgroundColor: c.surfaceAlt }]}>
          <Text style={[styles.verText, { color: c.sub }]}>{version.name}</Text>
        </View>
      </View>

      {mode === 'edit' ? (
        <>
          {/* Barra rápida: + Tablatura, secciones y acordes de la canción */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.toolbarScroll}
            contentContainerStyle={styles.toolbarContent}
            keyboardShouldPersistTaps="always"
          >
            <Pressable
              onPress={() => {
                hapticLight();
                Keyboard.dismiss();
                setTabOpen(true);
              }}
              style={({ pressed }) => [
                styles.toolPill,
                { backgroundColor: c.accentSoft, borderColor: c.accent },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="reorder-four-outline" size={16} color={c.accent} />
              <Text style={[styles.toolPillText, { color: c.accent, fontWeight: '700' }]}>
                + Tablatura
              </Text>
            </Pressable>

            {SECTIONS.map((sec) => (
              <Pressable
                key={sec}
                onPress={() => {
                  hapticSelect();
                  insertAtCursor(sec, true);
                }}
                style={({ pressed }) => [
                  styles.toolPill,
                  { backgroundColor: c.surfaceAlt, borderColor: c.line },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.toolPillText, { color: c.fg }]}>{sec}</Text>
              </Pressable>
            ))}

            {chords.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => {
                  hapticSelect();
                  insertAtCursor(`${ch}  `, false);
                }}
                style={({ pressed }) => [
                  styles.toolPill,
                  { backgroundColor: c.surface, borderColor: c.line },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.toolPillText, { color: c.chord, fontWeight: '700' }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            style={[
              styles.editor,
              {
                backgroundColor: c.surface,
                borderColor: c.line,
                color: c.fg,
                fontFamily: MONO_FONT,
              },
            ]}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            textAlignVertical="top"
            value={body}
            selection={selection}
            onChangeText={setBody}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder="Escribí o editá la letra, acordes y tablaturas..."
            placeholderTextColor={c.sub}
          />
        </>
      ) : (
        <View style={[styles.previewCard, { backgroundColor: c.surface, borderColor: c.line }]}>
          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.previewV}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {lines.map((line, i) => {
                  if (isTabLine(line)) {
                    return (
                      <Text
                        key={i}
                        style={[
                          styles.previewLine,
                          styles.tabLine,
                          {
                            fontFamily: MONO_FONT,
                            color: c.fg,
                            backgroundColor: c.surfaceAlt,
                            borderLeftColor: c.accent,
                          },
                        ]}
                      >
                        {line}
                      </Text>
                    );
                  }
                  if (isChordLine(line)) {
                    return (
                      <Text
                        key={i}
                        style={[
                          styles.previewLine,
                          { fontFamily: MONO_FONT, color: c.chord, fontWeight: '700' },
                        ]}
                      >
                        {line}
                      </Text>
                    );
                  }
                  return (
                    <Text
                      key={i}
                      style={[styles.previewLine, { fontFamily: MONO_FONT, color: c.fg }]}
                    >
                      {line || ' '}
                    </Text>
                  );
                })}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: c.line }]}>
        <Button
          c={c}
          icon="checkmark"
          label="Guardar cambios"
          disabled={!body.trim()}
          onPress={() => {
            Keyboard.dismiss();
            onSave(body.replace(/\r/g, '').trimEnd());
          }}
        />
      </View>

      <TabBuilderModal
        c={c}
        visible={tabOpen}
        initialInst={inst}
        onClose={() => setTabOpen(false)}
        onInsert={(tabBlock) => insertAtCursor(tabBlock, true)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  modePill: {
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    fontSize: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
  },
  verText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  toolbarScroll: {
    flexGrow: 0,
    marginBottom: 10,
  },
  toolbarContent: {
    gap: 8,
    paddingVertical: 2,
  },
  toolPill: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  editor: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
  },
  previewCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  previewV: {
    paddingVertical: 14,
  },
  previewLine: {
    fontSize: 13,
    lineHeight: 20,
  },
  tabLine: {
    paddingHorizontal: 8,
    borderLeftWidth: 2,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
