import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, EmptyState, HeaderBar, IconButton } from '../components/UI';
import { hapticLight } from '../theme';
import { getFirstChord } from '../utils/songs';

export function HomeScreen({
  c,
  groups,
  loading = false,
  isDark,
  onToggleTheme,
  onOpenAppMenu,
  onOpenGroup,
  onOpenSongDirect,
  onGroupMenu,
  onImport,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.title.toLowerCase().includes(q));
  }, [groups, query]);

  const countLabel = loading
    ? 'Cargando...'
    : groups.length === 1
      ? '1 canción guardada'
      : `${groups.length} canciones guardadas`;

  return (
    <Screen c={c}>
      <HeaderBar
        style={styles.topHeader}
        left={
          <View>
            <Text style={[styles.title, { color: c.fg }]}>Cancionero</Text>
            <Text style={[styles.subtitle, { color: c.sub }]}>{countLabel}</Text>
          </View>
        }
        right={
          <>
            <IconButton
              c={c}
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              onPress={onToggleTheme}
            />
            <IconButton
              c={c}
              name="ellipsis-horizontal"
              accessibilityLabel="Respaldo y opciones de la app"
              onPress={onOpenAppMenu}
            />
          </>
        }
      />

      {groups.length > 0 ? (
        <View
          style={[
            styles.searchBox,
            { backgroundColor: c.surfaceAlt, borderColor: c.line },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={c.sub} />
          <TextInput
            style={[styles.searchInput, { color: c.fg }]}
            placeholder="Buscar canción..."
            placeholderTextColor={c.sub}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 ? (
            <Pressable
              hitSlop={10}
              accessibilityLabel="Borrar búsqueda"
              onPress={() => setQuery('')}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color={c.sub} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        style={styles.list}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={7}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : groups.length === 0 ? (
            <EmptyState
              c={c}
              icon="musical-notes-outline"
              title="Tu cancionero está vacío"
              subtitle="Importá una canción desde un archivo de texto o pegando la letra con acordes."
            />
          ) : (
            <EmptyState
              c={c}
              icon="search-outline"
              title="Sin resultados"
              subtitle={`No encontramos canciones que coincidan con “${query.trim()}”.`}
              actionLabel="Limpiar búsqueda"
              onAction={() => setQuery('')}
            />
          )
        }
        renderItem={({ item: g }) => {
          const firstChord = g.versions[0] ? getFirstChord(g.versions[0].body) : null;
          const versionText =
            g.versions.length === 1 ? '1 versión' : `${g.versions.length} versiones`;

          return (
            <Pressable
              onPress={() => {
                hapticLight();
                if (g.versions.length === 1) onOpenSongDirect(g, g.versions[0]);
                else onOpenGroup(g);
              }}
              onLongPress={() => onGroupMenu(g)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: c.line,
                },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardMain}>
                <Text numberOfLines={2} style={[styles.cardTitle, { color: c.fg }]}>
                  {g.title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: c.sub }]}>{versionText}</Text>
                  {firstChord ? (
                    <View style={[styles.keyPill, { backgroundColor: c.accentSoft }]}>
                      <Text style={[styles.keyPillText, { color: c.chord }]}>{firstChord}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.cardRight}>
                <IconButton
                  c={c}
                  name="ellipsis-horizontal"
                  size={18}
                  color={c.sub}
                  surface={false}
                  accessibilityLabel={`Opciones de ${g.title}`}
                  onPress={() => onGroupMenu(g)}
                />
                <Ionicons name="chevron-forward" size={18} color={c.sub} />
              </View>
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: c.line }]}>
        <Button c={c} icon="add" label="Importar canción" onPress={onImport} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchBox: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 12,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
  },
  keyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  keyPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
