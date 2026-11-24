import Ionicons from '@expo/vector-icons/Ionicons';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isChordLine } from '../../transpose';
import { Screen } from '../components/Screen';
import { BackButton, Button, HeaderBar } from '../components/UI';
import { MONO_FONT } from '../theme';
import { isTabLine, nextName } from '../utils/songs';

export function SaveScreen({
  c,
  draft,
  targetGroup,
  existing,
  onChangeTitle,
  onChangeVersionName,
  onBack,
  onCommit,
}) {
  const previewLines = draft.body.split('\n').slice(0, 8);
  const addingToTarget = !!targetGroup;
  const defaultVersionName = existing ? nextName(existing.versions) : 'v1';

  return (
    <Screen c={c} keyboardAvoiding>
      <HeaderBar left={<BackButton c={c} label="Cancelar" onPress={onBack} />} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: c.fg }]}>
          {addingToTarget ? 'Agregar versión' : 'Guardar canción'}
        </Text>

        {addingToTarget ? (
          <>
            <View style={[styles.infoCard, { backgroundColor: c.accentSoft }]}>
              <Ionicons name="layers-outline" size={18} color={c.accent} />
              <Text style={[styles.infoText, { color: c.fg }]}>
                Se agregará dentro de “{targetGroup.title}”.
              </Text>
            </View>

            <Text style={[styles.label, { color: c.sub }]}>Nombre de la versión</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.surface,
                  borderColor: c.line,
                  color: c.fg,
                },
              ]}
              value={draft.versionName ?? defaultVersionName}
              onChangeText={onChangeVersionName}
              placeholder={defaultVersionName}
              placeholderTextColor={c.sub}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                onCommit();
              }}
            />
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: c.sub }]}>Nombre de la canción</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.surface,
                  borderColor: c.line,
                  color: c.fg,
                },
              ]}
              value={draft.title}
              onChangeText={onChangeTitle}
              placeholder="Ej: Cumpleaños feliz"
              placeholderTextColor={c.sub}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                onCommit();
              }}
            />

            <View style={[styles.infoCard, { backgroundColor: c.accentSoft }]}>
              <Ionicons
                name={existing ? 'layers-outline' : 'sparkles-outline'}
                size={18}
                color={c.accent}
              />
              <Text style={[styles.infoText, { color: c.fg }]}>
                {existing
                  ? `Se agregará como ${nextName(existing.versions)} dentro de “${existing.title}”.`
                  : 'Se creará una canción nueva con la versión v1.'}
              </Text>
            </View>
          </>
        )}

        <Text style={[styles.label, { color: c.sub }]}>Vista previa detectada</Text>
        <View style={[styles.previewCard, { backgroundColor: c.surface, borderColor: c.line }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {previewLines.map((line, i) => {
                const isChordRow = !isTabLine(line) && isChordLine(line);
                return (
                  <Text
                    key={i}
                    style={[
                      styles.previewLine,
                      {
                        fontFamily: MONO_FONT,
                        color: isChordRow ? c.chord : c.fg,
                        fontWeight: isChordRow ? '700' : '400',
                      },
                    ]}
                  >
                    {line || ' '}
                  </Text>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: c.line }]}>
        <Button
          c={c}
          icon="checkmark"
          label={addingToTarget ? 'Guardar versión' : 'Guardar en el cancionero'}
          onPress={() => {
            Keyboard.dismiss();
            onCommit();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  infoCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  previewLine: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
