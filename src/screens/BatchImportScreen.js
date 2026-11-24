import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { BackButton, Button, HeaderBar } from '../components/UI';
import { hapticLight, hapticSelect } from '../theme';
import { getFirstChord, getFirstLyricSnippet } from '../utils/songs';

export function BatchImportScreen({ c, songs, removedIndexLines, onBack, onCommit }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(songs.map((s) => s.id)));
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.number && String(s.number).includes(q))
    );
  }, [songs, query]);

  const allSelected = selectedIds.size === songs.length;

  const toggleAll = () => {
    hapticLight();
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(songs.map((s) => s.id)));
  };

  const toggleOne = (id) => {
    hapticSelect();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  return (
    <Screen c={c}>
      <HeaderBar
        left={<BackButton c={c} label="Cancelar" onPress={onBack} />}
        right={
          <Button
            c={c}
            compact
            variant="secondary"
            label={allSelected ? 'Desmarcar' : 'Todos'}
            onPress={toggleAll}
          />
        }
      />

      <View style={styles.intro}>
        <Text style={[styles.title, { color: c.fg }]}>
          {songs.length} canciones detectadas
        </Text>
        <Text style={[styles.subtitle, { color: c.sub }]}>
          Revisá la lista y desmarcá las que no quieras guardar.
        </Text>
      </View>

      {removedIndexLines > 0 ? (
        <View style={[styles.infoBanner, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="sparkles-outline" size={17} color={c.accent} />
          <Text style={[styles.infoText, { color: c.fg }]}>
            Se limpiaron automáticamente {removedIndexLines}{' '}
            {removedIndexLines === 1 ? 'línea de índice' : 'líneas de índice'} con guiones.
          </Text>
        </View>
      ) : null}

      <View style={[styles.searchBox, { backgroundColor: c.surfaceAlt, borderColor: c.line }]}>
        <Ionicons name="search-outline" size={18} color={c.sub} />
        <TextInput
          style={[styles.searchInput, { color: c.fg }]}
          placeholder="Filtrar por título o número..."
          placeholderTextColor={c.sub}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable hitSlop={10} onPress={() => setQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={c.sub} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={7}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const checked = selectedIds.has(item.id);
          const firstChord = getFirstChord(item.body);
          const snippet = getFirstLyricSnippet(item.body);

          return (
            <Pressable
              onPress={() => toggleOne(item.id)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: c.surface,
                  borderColor: checked ? c.accent : c.line,
                  opacity: checked ? 1 : 0.55,
                },
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={22}
                color={checked ? c.accent : c.sub}
              />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  {item.number ? (
                    <Text style={[styles.numTag, { color: c.sub }]}>#{item.number}</Text>
                  ) : null}
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: c.fg }]}>
                    {item.title}
                  </Text>
                  {firstChord ? (
                    <View style={[styles.keyPill, { backgroundColor: c.accentSoft }]}>
                      <Text style={[styles.keyText, { color: c.chord }]}>{firstChord}</Text>
                    </View>
                  ) : null}
                </View>
                {snippet ? (
                  <Text numberOfLines={1} style={[styles.snippet, { color: c.sub }]}>
                    {snippet}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: c.line }]}>
        <Button
          c={c}
          icon="checkmark"
          disabled={selectedCount === 0}
          label={
            selectedCount === 1
              ? 'Importar 1 canción'
              : `Importar ${selectedCount} canciones`
          }
          onPress={() => onCommit(songs.filter((s) => selectedIds.has(s.id)))}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 2,
    marginBottom: 12,
    gap: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
  },
  infoBanner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  searchBox: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
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
    gap: 8,
    paddingBottom: 14,
  },
  row: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowPressed: {
    opacity: 0.78,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '600',
  },
  keyPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  keyText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  snippet: {
    fontSize: 12.5,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
