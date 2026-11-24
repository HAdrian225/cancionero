import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { BackButton, Button, HeaderBar, IconButton } from '../components/UI';
import { hapticLight } from '../theme';
import { extractChords, getFirstLyricSnippet } from '../utils/songs';

export function GroupScreen({
  c,
  group,
  onBack,
  onRenameGroup,
  onDeleteGroup,
  onOpenVersion,
  onVersionMenu,
  onAddVersion,
}) {
  const versionCount =
    group.versions.length === 1 ? '1 versión' : `${group.versions.length} versiones`;

  return (
    <Screen c={c}>
      <HeaderBar
        left={<BackButton c={c} label="Canciones" onPress={onBack} />}
        right={
          <>
            <IconButton
              c={c}
              name="pencil-outline"
              size={19}
              accessibilityLabel="Renombrar canción"
              onPress={onRenameGroup}
            />
            <IconButton
              c={c}
              name="trash-outline"
              size={19}
              color={c.danger}
              accessibilityLabel="Borrar canción"
              onPress={onDeleteGroup}
            />
          </>
        }
      />

      <View style={styles.titleBlock}>
        <Text numberOfLines={2} style={[styles.title, { color: c.fg }]}>
          {group.title}
        </Text>
        <Text style={[styles.subtitle, { color: c.sub }]}>{versionCount}</Text>
      </View>

      <FlatList
        data={group.versions}
        keyExtractor={(v) => v.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: v }) => {
          const firstChord = extractChords(v.body, 0)[0];
          const snippet = getFirstLyricSnippet(v.body);

          return (
            <Pressable
              onPress={() => {
                hapticLight();
                onOpenVersion(v);
              }}
              onLongPress={() => onVersionMenu(v)}
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
                <View style={styles.cardTopRow}>
                  <Text numberOfLines={1} style={[styles.cardTitle, { color: c.fg }]}>
                    {v.name}
                  </Text>
                  {firstChord ? (
                    <View style={[styles.keyPill, { backgroundColor: c.accentSoft }]}>
                      <Text style={[styles.keyPillText, { color: c.chord }]}>
                        Tono {firstChord}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {snippet ? (
                  <Text numberOfLines={1} style={[styles.snippet, { color: c.sub }]}>
                    {snippet}
                  </Text>
                ) : null}
              </View>

              <View style={styles.cardRight}>
                <IconButton
                  c={c}
                  name="ellipsis-horizontal"
                  size={18}
                  color={c.sub}
                  surface={false}
                  accessibilityLabel={`Opciones de ${v.name}`}
                  onPress={() => onVersionMenu(v)}
                />
                <Ionicons name="chevron-forward" size={18} color={c.sub} />
              </View>
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { borderTopColor: c.line }]}>
        <Button c={c} icon="add" label="Agregar versión" onPress={onAddVersion} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    marginTop: 4,
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
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
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    flexShrink: 1,
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
  snippet: {
    fontSize: 13,
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
