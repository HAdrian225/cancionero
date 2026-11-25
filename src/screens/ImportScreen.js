import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { BackButton, HeaderBar } from '../components/UI';
import { hapticLight } from '../theme';

function OptionCard({ c, icon, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: c.surface,
          borderColor: c.line,
        },
        pressed && styles.optionPressed,
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: c.accentSoft }]}>
        <Ionicons name={icon} size={22} color={c.accent} />
      </View>
      <View style={styles.optionBody}>
        <Text style={[styles.optionTitle, { color: c.fg }]}>{title}</Text>
        <Text style={[styles.optionSub, { color: c.sub }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.sub} />
    </Pressable>
  );
}

export function ImportScreen({
  c,
  targetGroup,
  onBack,
  onPickFile,
  onPaste,
  onOpenYouTube,
  onOpenPdfGuide,
}) {
  return (
    <Screen c={c}>
      <HeaderBar left={<BackButton c={c} label="Volver" onPress={onBack} />} />

      <View style={styles.intro}>
        <Text style={[styles.title, { color: c.fg }]}>
          {targetGroup ? 'Agregar versión' : 'Importar canción'}
        </Text>
        <Text style={[styles.subtitle, { color: c.sub }]}>
          {targetGroup
            ? `Elegí cómo traer la nueva versión para “${targetGroup.title}”.`
            : 'Elegí cómo cargar la letra con acordes. Todo queda guardado localmente en tu celular.'}
        </Text>
      </View>

      <View style={styles.options}>
        <OptionCard
          c={c}
          icon="document-text-outline"
          title="Archivo del teléfono"
          subtitle="Uno o varios temas (.txt, .cho, .pro, .crd)"
          onPress={onPickFile}
        />
        <OptionCard
          c={c}
          icon="clipboard-outline"
          title="Pegar texto copiado"
          subtitle="Desde Notas, WhatsApp o cualquier página"
          onPress={onPaste}
        />
        <OptionCard
          c={c}
          icon="logo-youtube"
          title="Buscar desde un link de YouTube"
          subtitle="Detecta el tema y abre los acordes en 1 toque"
          onPress={onOpenYouTube}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver guía para convertir archivos PDF"
        onPress={() => {
          hapticLight();
          onOpenPdfGuide?.();
        }}
        style={({ pressed }) => [
          styles.guideCard,
          {
            backgroundColor: c.surfaceAlt,
            borderColor: c.line,
          },
          pressed && styles.optionPressed,
        ]}
      >
        <View style={[styles.guideBadge, { backgroundColor: c.surface }]}>
          <Ionicons name="help-circle-outline" size={20} color={c.accent} />
        </View>
        <View style={styles.optionBody}>
          <Text style={[styles.guideTitle, { color: c.fg }]}>
            ¿Tenés un PDF? Cómo pasarlo a texto
          </Text>
          <Text style={[styles.optionSub, { color: c.sub }]}>
            Guía rápida para iPhone y Android sin instalar nada
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.sub} />
      </Pressable>

      <View style={[styles.noteCard, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name="phone-portrait-outline" size={18} color={c.sub} />
        <Text style={[styles.noteText, { color: c.sub }]}>
          100% local y sin conexión. Admite acordes arriba de la letra y formato ChordPro [Am].
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 4,
    marginBottom: 20,
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  options: {
    gap: 12,
  },
  option: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guideCard: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guideBadge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
