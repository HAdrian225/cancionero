import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { BackButton, Button, HeaderBar } from '../components/UI';
import { MONO_FONT } from '../theme';

export function PasteScreen({ c, value, onChange, onBack, onContinue }) {
  const hasText = value.trim().length > 0;

  return (
    <Screen c={c} keyboardAvoiding>
      <HeaderBar
        left={<BackButton c={c} label="Importar" onPress={onBack} />}
        right={
          hasText ? (
            <Button
              c={c}
              compact
              variant="ghost"
              label="Limpiar"
              onPress={() => onChange('')}
            />
          ) : null
        }
      />

      <Text style={[styles.title, { color: c.fg }]}>Pegar texto</Text>
      <Text style={[styles.subtitle, { color: c.sub }]}>
        Pegá la letra con acordes arriba o en formato [Am].
      </Text>

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
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        textAlignVertical="top"
        placeholder="Ej:&#10;C              G&#10;Cumpleaños feliz..."
        placeholderTextColor={c.sub}
        value={value}
        onChangeText={onChange}
      />

      <View style={styles.footer}>
        <Button
          c={c}
          label="Continuar"
          icon="arrow-forward"
          disabled={!hasText}
          onPress={() => {
            Keyboard.dismiss();
            onContinue();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  editor: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingTop: 12,
  },
});
