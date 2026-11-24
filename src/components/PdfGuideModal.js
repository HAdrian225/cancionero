import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H_INSET, MONO_FONT, hapticLight, hapticSelect } from '../theme';
import { getBottomInsetPadding } from './Screen';
import { Button, IconButton } from './UI';

const AI_PROMPT =
  'Pasá esta canción a texto plano con los acordes arriba de la letra respetando la alineación en fuente monoespaciada. Devolvé solo la letra y los acordes, sin explicaciones.';

function detectDefaultTab() {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'iphone';
  if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')) {
    return 'android';
  }
  return 'iphone';
}

function StepItem({ c, number, text }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepDot, { backgroundColor: c.accentSoft }]}>
        <Text style={[styles.stepNum, { color: c.accent }]}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

export function PdfGuideModal({ c, visible, onClose, onGoPaste }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(detectDefaultTab);
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const handleCopyPrompt = async () => {
    hapticLight();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(AI_PROMPT);
        } else {
          const el = document.createElement('textarea');
          el.value = AI_PROMPT;
          el.style.position = 'fixed';
          el.style.opacity = '0';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          el.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fallback silencioso
      }
    }
    try {
      await Share.share({ message: AI_PROMPT });
    } catch {
      // cancelado por el usuario
    }
  };

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
              paddingBottom: getBottomInsetPadding(insets.bottom, 18),
              paddingLeft: Platform.OS === 'web' ? H_INSET : insets.left + H_INSET,
              paddingRight: Platform.OS === 'web' ? H_INSET : insets.right + H_INSET,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.line }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: c.fg }]}>Pasar un PDF a Cancionero</Text>
              <Text style={[styles.subtitle, { color: c.sub }]}>
                Para mantener la app liviana y rápida sin internet, convertí tu PDF a texto en 15 segundos.
              </Text>
            </View>
            <IconButton
              c={c}
              name="close"
              size={20}
              accessibilityLabel="Cerrar guía PDF"
              onPress={onClose}
            />
          </View>

          <View style={[styles.seg, { backgroundColor: c.surfaceAlt }]}>
            {[
              { key: 'iphone', label: 'iPhone' },
              { key: 'android', label: 'Android' },
            ].map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    hapticSelect();
                    setTab(item.key);
                  }}
                  style={[styles.segItem, active && { backgroundColor: c.accent }]}
                >
                  <Text
                    style={[
                      styles.segText,
                      { color: active ? c.onAccent : c.fg, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Método 1: Copiar y pegar directo */}
            <View style={[styles.card, { backgroundColor: c.surfaceAlt }]}>
              <View style={styles.cardHead}>
                <Ionicons name="flash-outline" size={18} color={c.accent} />
                <Text style={[styles.cardTitle, { color: c.fg }]}>
                  1. Copiar y pegar (sin internet)
                </Text>
              </View>
              {tab === 'iphone' ? (
                <View style={styles.steps}>
                  <StepItem c={c} number="1" text="Abrí el PDF desde Archivos, WhatsApp o Mail." />
                  <StepItem
                    c={c}
                    number="2"
                    text="Mantené apretado sobre el texto → Seleccionar todo → Copiar."
                  />
                  <StepItem
                    c={c}
                    number="3"
                    text="Volvé acá y tocá “Ir a Pegar texto” abajo."
                  />
                  <Text style={[styles.tip, { color: c.sub }]}>
                    Tip iPhone: aunque el PDF sea una foto escaneada, iOS te deja mantener apretado y copiar el texto directo.
                  </Text>
                </View>
              ) : (
                <View style={styles.steps}>
                  <StepItem c={c} number="1" text="Abrí el PDF con Google Drive, Archivos o Chrome." />
                  <StepItem
                    c={c}
                    number="2"
                    text="Mantené apretado el texto → Seleccionar todo → Copiar."
                  />
                  <StepItem
                    c={c}
                    number="3"
                    text="Volvé acá y tocá “Ir a Pegar texto” abajo."
                  />
                </View>
              )}
            </View>

            {/* Método 2: Convertir a .txt */}
            <View style={[styles.card, { backgroundColor: c.surfaceAlt }]}>
              <View style={styles.cardHead}>
                <Ionicons name="document-text-outline" size={18} color={c.accent} />
                <Text style={[styles.cardTitle, { color: c.fg }]}>
                  2. Convertir a archivo .txt
                </Text>
              </View>
              <Text style={[styles.cardBody, { color: c.sub }]}>
                Si preferís subir un archivo, convertí el PDF gratis a{' '}
                <Text style={{ color: c.fg, fontWeight: '600' }}>.txt</Text> en herramientas como
                CloudConvert o PDF24 y después elegilo desde “Archivo del teléfono”.
              </Text>
            </View>

            {/* Método 3: PDF escaneado o desacomodado con IA */}
            <View style={[styles.card, { backgroundColor: c.surfaceAlt }]}>
              <View style={styles.cardHead}>
                <Ionicons name="sparkles-outline" size={18} color={c.accent} />
                <Text style={[styles.cardTitle, { color: c.fg }]}>
                  3. Si el PDF es foto o se desacomodan los acordes
                </Text>
              </View>
              <Text style={[styles.cardBody, { color: c.sub }]}>
                Subí el PDF a ChatGPT o Gemini con este pedido y pegá el resultado acá:
              </Text>
              <View style={[styles.promptBox, { backgroundColor: c.surface, borderColor: c.line }]}>
                <Text selectable style={[styles.promptText, { color: c.fg, fontFamily: MONO_FONT }]}>
                  {AI_PROMPT}
                </Text>
              </View>
              <Button
                c={c}
                compact
                variant="secondary"
                icon={copied ? 'checkmark' : 'copy-outline'}
                label={
                  copied
                    ? '¡Pedido copiado!'
                    : Platform.OS === 'web'
                      ? 'Copiar pedido'
                      : 'Compartir / copiar pedido'
                }
                onPress={handleCopyPrompt}
                style={[styles.copyBtn, { backgroundColor: c.surface, borderColor: c.line }]}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: c.line }]}>
            <Button
              c={c}
              icon="clipboard-outline"
              label="Ir a Pegar texto"
              onPress={() => {
                onClose();
                onGoPaste?.();
              }}
            />
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
    maxHeight: '88%',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  seg: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 3,
    marginBottom: 12,
  },
  segItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: {
    fontSize: 14,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 14,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  cardBody: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  steps: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
  },
  tip: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  promptBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  promptText: {
    fontSize: 12,
    lineHeight: 17,
  },
  copyBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
