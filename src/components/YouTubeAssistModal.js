import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import { H_INSET, hapticLight } from '../theme';
import { buildChordSearchUrls, extractYouTubeId, fetchYouTubeTitle } from '../utils/youtube';
import { getBottomInsetPadding } from './Screen';
import { Button, IconButton } from './UI';

export function YouTubeAssistModal({ c, visible, onClose, onReadyToPaste }) {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!visible) return;
    setUrl('');
    setQuery('');
    setLoading(false);
    setStatusMsg('');
  }, [visible]);

  if (!visible) return null;

  const lookupUrl = async (raw) => {
    const id = extractYouTubeId(raw);
    if (!id) {
      setStatusMsg('Pegá un link válido de YouTube (youtube.com o youtu.be).');
      return;
    }
    setLoading(true);
    setStatusMsg('');
    const res = await fetchYouTubeTitle(raw);
    setLoading(false);
    if (res.ok) {
      setQuery(res.title || res.rawTitle);
      setStatusMsg('');
    } else {
      setStatusMsg(
        'No pude leer el título automáticamente (¿sin internet?). Escribí el nombre del tema abajo.'
      );
    }
  };

  const handleUrlChange = (text) => {
    setUrl(text);
    setStatusMsg('');
    if (extractYouTubeId(text)) {
      lookupUrl(text);
    }
  };

  const openSearch = (site) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    hapticLight();
    const urls = buildChordSearchUrls(trimmed);
    const target = urls[site];
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(target).catch(() => {});
    }
  };

  const handleContinueToPaste = async () => {
    hapticLight();
    let clipboardText = '';
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        clipboardText = await navigator.clipboard.readText();
      } catch {
        // Safari/Chrome puede requerir pegado manual en PasteScreen
      }
    }
    const cleanTitle = query.trim();
    onClose();
    onReadyToPaste(cleanTitle, clipboardText);
  };

  const canSearch = query.trim().length > 0;

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
              paddingBottom: getBottomInsetPadding(insets.bottom, 18),
              paddingLeft: Platform.OS === 'web' ? H_INSET : insets.left + H_INSET,
              paddingRight: Platform.OS === 'web' ? H_INSET : insets.right + H_INSET,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.line }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: c.fg }]}>Buscar desde YouTube</Text>
              <Text style={[styles.subtitle, { color: c.sub }]}>
                Pegá el link del video, abrí los acordes en 1 toque y pegalos en Cancionero.
              </Text>
            </View>
            <IconButton
              c={c}
              name="close"
              size={20}
              accessibilityLabel="Cerrar asistente de YouTube"
              onPress={onClose}
            />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.label, { color: c.sub }]}>1. Link de YouTube</Text>
            <View style={styles.urlRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.urlInput,
                  { backgroundColor: c.surfaceAlt, borderColor: c.line, color: c.fg },
                ]}
                value={url}
                onChangeText={handleUrlChange}
                placeholder="https://youtu.be/..."
                placeholderTextColor={c.sub}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="search"
                onSubmitEditing={() => lookupUrl(url)}
              />
              {loading ? (
                <View style={[styles.lookupBtn, { backgroundColor: c.surfaceAlt }]}>
                  <ActivityIndicator size="small" color={c.accent} />
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Detectar título del video"
                  onPress={() => lookupUrl(url)}
                  style={({ pressed }) => [
                    styles.lookupBtn,
                    { backgroundColor: c.accentSoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="search-outline" size={20} color={c.accent} />
                </Pressable>
              )}
            </View>

            {statusMsg ? (
              <Text style={[styles.statusMsg, { color: c.sub }]}>{statusMsg}</Text>
            ) : null}

            <Text style={[styles.label, { color: c.sub }]}>
              2. Tema detectado (podés editarlo)
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.surfaceAlt, borderColor: c.line, color: c.fg },
              ]}
              value={query}
              onChangeText={setQuery}
              placeholder="Ej: Soda Stereo De Música Ligera"
              placeholderTextColor={c.sub}
            />

            <View style={styles.searchGrid}>
              <Pressable
                disabled={!canSearch}
                onPress={() => openSearch('lacuerda')}
                style={({ pressed }) => [
                  styles.siteBtn,
                  { backgroundColor: c.surfaceAlt, borderColor: c.line },
                  !canSearch && styles.disabled,
                  pressed && canSearch && styles.pressed,
                ]}
              >
                <Ionicons name="open-outline" size={16} color={c.accent} />
                <Text style={[styles.siteBtnText, { color: c.fg }]}>LaCuerda</Text>
              </Pressable>

              <Pressable
                disabled={!canSearch}
                onPress={() => openSearch('cifraclub')}
                style={({ pressed }) => [
                  styles.siteBtn,
                  { backgroundColor: c.surfaceAlt, borderColor: c.line },
                  !canSearch && styles.disabled,
                  pressed && canSearch && styles.pressed,
                ]}
              >
                <Ionicons name="open-outline" size={16} color={c.accent} />
                <Text style={[styles.siteBtnText, { color: c.fg }]}>CifraClub</Text>
              </Pressable>

              <Pressable
                disabled={!canSearch}
                onPress={() => openSearch('google')}
                style={({ pressed }) => [
                  styles.siteBtn,
                  { backgroundColor: c.surfaceAlt, borderColor: c.line },
                  !canSearch && styles.disabled,
                  pressed && canSearch && styles.pressed,
                ]}
              >
                <Ionicons name="search-outline" size={16} color={c.accent} />
                <Text style={[styles.siteBtnText, { color: c.fg }]}>Google</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: c.line }]}>
            <Button
              c={c}
              icon="clipboard-outline"
              label="Ya copié los acordes → Pegar"
              onPress={handleContinueToPaste}
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
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    fontSize: 15,
  },
  urlInput: {
    flex: 1,
  },
  lookupBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusMsg: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  searchGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  siteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  siteBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
