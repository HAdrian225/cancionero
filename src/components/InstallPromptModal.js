import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H_INSET } from '../theme';
import { getBottomInsetPadding } from './Screen';
import { Button, IconButton } from './UI';

export function detectWebInstallEnvironment() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { isWeb: false, isStandalone: true, isIOS: false, isIOSSafari: false };
  }
  const nav = window.navigator || {};
  const ua = nav.userAgent || '';
  const isStandalone =
    Boolean(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    nav.standalone === true;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
  const isIOSSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  return { isWeb: true, isStandalone, isIOS, isIOSSafari };
}

function StepRow({ c, number, icon, text }) {
  return (
    <View style={[styles.stepRow, { backgroundColor: c.surfaceAlt }]}>
      <View style={[styles.stepNum, { backgroundColor: c.accentSoft }]}>
        <Text style={[styles.stepNumText, { color: c.accent }]}>{number}</Text>
      </View>
      <Ionicons name={icon} size={20} color={c.accent} style={styles.stepIcon} />
      <Text style={[styles.stepText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

export function InstallPromptModal({
  c,
  visible,
  canInstallNative,
  onInstallNative,
  onLater,
  onNever,
}) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const { isIOS, isIOSSafari } = detectWebInstallEnvironment();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onLater} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surface,
              borderColor: c.line,
              paddingBottom: getBottomInsetPadding(insets.bottom, 20),
              paddingLeft: H_INSET,
              paddingRight: H_INSET,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.line }]} />

          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
              <Ionicons name="phone-portrait-outline" size={24} color={c.accent} />
            </View>
            <IconButton
              c={c}
              name="close"
              size={20}
              accessibilityLabel="Cerrar aviso"
              onPress={onLater}
            />
          </View>

          <Text style={[styles.title, { color: c.fg }]}>¿Te está gustando Cancionero?</Text>
          <Text style={[styles.subtitle, { color: c.sub }]}>
            Agregala a tu pantalla de inicio para guardarla como app permanente, usarla sin internet
            y no perder tus canciones.
          </Text>

          {canInstallNative ? (
            <Button
              c={c}
              icon="download-outline"
              label="Agregar a pantalla de inicio"
              onPress={onInstallNative}
              style={styles.primaryCta}
            />
          ) : isIOS ? (
            <View style={styles.steps}>
              {isIOSSafari ? (
                <>
                  <StepRow
                    c={c}
                    number="1"
                    icon="share-outline"
                    text="Tocá el botón Compartir en la barra de abajo de Safari."
                  />
                  <StepRow
                    c={c}
                    number="2"
                    icon="add-circle-outline"
                    text="Elegí “Agregar a inicio” y tocá Agregar arriba a la derecha."
                  />
                </>
              ) : (
                <StepRow
                  c={c}
                  number="1"
                  icon="compass-outline"
                  text="Abrí este link en Safari y tocá Compartir → “Agregar a inicio”."
                />
              )}
            </View>
          ) : (
            <View style={styles.steps}>
              <StepRow
                c={c}
                number="1"
                icon="ellipsis-vertical"
                text="Tocá el menú del navegador (⋮) arriba a la derecha."
              />
              <StepRow
                c={c}
                number="2"
                icon="add-circle-outline"
                text="Elegí “Instalar app” o “Agregar a pantalla principal”."
              />
            </View>
          )}

          <View style={styles.actions}>
            {!canInstallNative ? (
              <Button c={c} label="¡Entendido!" onPress={onLater} />
            ) : (
              <Button c={c} variant="secondary" label="Ahora no" onPress={onLater} />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={onNever}
              hitSlop={10}
              style={({ pressed }) => [styles.neverBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.neverText, { color: c.sub }]}>No volver a mostrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 16,
  },
  steps: {
    gap: 10,
    marginBottom: 18,
  },
  stepRow: {
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepIcon: {
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
  },
  primaryCta: {
    marginBottom: 10,
  },
  actions: {
    gap: 6,
  },
  neverBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neverText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.65,
  },
});
