import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, FlatList, LayoutAnimation, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, useColorScheme, View,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { INSTRUMENTS, voicing } from './chords';
import { isChord, isChordLine, parseLine, transposeChord, transposeChordLine } from './transpose';

const LIGHT = { bg: '#fff', fg: '#111', sub: '#6b7280', line: '#e5e7eb', card: '#f3f4f6', accent: '#2563eb', chord: '#c2410c' };
const DARK = { bg: '#0b0f17', fg: '#e5e7eb', sub: '#9ca3af', line: '#1f2937', card: '#161c28', accent: '#60a5fa', chord: '#fb923c' };
const SITES = { CifraClub: 'https://www.cifraclub.com/', LaCuerda: 'https://acordes.lacuerda.net/' };
// Corre dentro de la página: toma el <pre> más largo (donde ambos sitios ponen letra + acordes).
const EXTRACT = `(function(){var p=[].slice.call(document.querySelectorAll('pre')).sort(function(a,b){return b.innerText.length-a.innerText.length})[0];
window.ReactNativeWebView.postMessage(JSON.stringify({title:document.title,text:p?p.innerText:''}));})();true;`;

const chordPro = (t) => t.split('\n').map((l) => { const p = parseLine(l); return (p.chords ? p.chords + '\n' : '') + p.lyrics; }).join('\n');
const uid = () => String(Date.now() + Math.random());
const safe = (s, d) => { try { return JSON.parse(s) ?? d; } catch { return d; } };
const nextName = (vs) => 'v' + (Math.max(0, ...vs.map((v) => +(v.name.match(/^v(\d+)$/) || [])[1] || 0)) + 1); // no repite nombres tras borrar
const SAMPLE = [{ id: 's1', title: 'Cumpleaños feliz', versions: [{ id: 's1a', name: 'v1', body: chordPro('[C]Cumpleaños fe[G]liz, cumpleaños fe[C]liz\nTe de[C7]seamos todos, cumpleaños fe[F]liz\nQue los cum[C]plas fe[G]liz, que los cum[C]plas feliz') }] }];

// Texto crudo (archivo .txt/.cho, texto pegado o página) -> { title, body } con acordes arriba de la letra.
function normalize(raw, fallbackTitle = '') {
  let title = fallbackTitle;
  const lines = raw.replace(/\r/g, '').split('\n').flatMap((l) => {
    const d = l.match(/^\s*\{\s*(\w+)\s*:?\s*(.*?)\}\s*$/);
    if (!d) return [l];
    if (/^(title|t)$/i.test(d[1])) title = d[2] || title;
    return /^(c|comment|ci)$/i.test(d[1]) ? [d[2]] : []; // los comentarios son contenido visible; el resto de directivas se ignora
  });
  let body = lines.join('\n').trim();
  const inline = body.match(/\[[^\]]+\]/g) || [];
  if (inline.some((t) => isChord(t.slice(1, -1)))) body = chordPro(body); // ChordPro: [Am] dentro de la letra ("[Intro]" no cuenta)
  return { title: title.replace(/\s*[-|]\s*(Cifra Club|La ?Cuerda).*$/i, '').trim(), body };
}

export default function App() {
  const sys = useColorScheme();
  const [pref, setPref] = useState(null); // null = seguir al sistema
  const c = (pref ?? sys) === 'dark' ? DARK : LIGHT;
  const s = styles(c);

  const [groups, setGroups] = useState([]);
  const [view, setView] = useState('home'); // home | group | song | import | web | paste | save
  const [gid, setGid] = useState(null);
  const [vid, setVid] = useState(null);
  const [target, setTarget] = useState(null); // grupo al que se agrega lo importado (null = por nombre)
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [prompt, setPrompt] = useState(null); // { label, value, onOk }
  const [n, setN] = useState(0);
  const [tools, setTools] = useState(false);
  const [inst, setInst] = useState('Guitarra');
  const [chord, setChord] = useState(null);
  const [fs, setFs] = useState(13);
  const [url, setUrl] = useState(SITES.CifraClub);
  const web = useRef();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.multiGet(['groups', 'songs', 'theme', 'inst']).then(([[, g], [, old], [, t], [, i]]) => {
      // Migración: versión anterior guardaba canciones sueltas en 'songs'.
      const oldList = safe(old, null);
      const list = safe(g, null) ?? (oldList ? oldList.map((x) => ({ id: x.id, title: x.title, versions: [{ id: uid(), name: 'v1', body: x.body }] })) : SAMPLE);
      setGroups(list);
      if (!g) AsyncStorage.setItem('groups', JSON.stringify(list)); // persiste la migración (ids estables)
      if (t) setPref(t);
      if (i && INSTRUMENTS[i]) setInst(i);
    });
  }, []);
  useEffect(() => { // transición corta al cambiar de pantalla (< 400 ms)
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [view]);

  const save = (list) => { setGroups(list); AsyncStorage.setItem('groups', JSON.stringify(list)); };
  const go = (v) => setView(v);
  const toggleTheme = () => { const next = (pref ?? sys) === 'dark' ? 'light' : 'dark'; setPref(next); AsyncStorage.setItem('theme', next); };
  const toggleTools = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); setTools(!tools); };
  const pickInst = (i) => { setInst(i); AsyncStorage.setItem('inst', i); };

  const group = groups.find((g) => g.id === gid);
  const version = group?.versions.find((v) => v.id === vid);
  const rename = (label, value, onOk) => setPrompt({ label, value, onOk });
  const renameGroup = (g) => rename('Nombre de la canción', g.title, (t) => save(groups.map((x) => (x.id === g.id ? { ...x, title: t } : x))));
  const renameVersion = (g, v) => rename('Nombre de la versión', v.name, (t) =>
    save(groups.map((x) => (x.id === g.id ? { ...x, versions: x.versions.map((y) => (y.id === v.id ? { ...y, name: t } : y)) } : x))));
  const actions = (title, onRename, onDelete) =>
    Alert.alert(title, undefined, [{ text: 'Renombrar', onPress: onRename }, { text: 'Borrar', style: 'destructive', onPress: onDelete }, { text: 'Cancelar', style: 'cancel' }]);

  const startImport = (t = null) => { setTarget(t); go('import'); };
  const finishDraft = (raw, fallback) => {
    const d = normalize(raw, fallback);
    if (!d.body.split('\n').some(isChordLine)) return Alert.alert('No encontré acordes', 'El texto no parece tener acordes. Revisá el archivo o abrí una canción completa.');
    setDraft({ title: d.title, body: d.body }); go('save');
  };
  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0];
    if (/\.pdf$/i.test(a.name)) return Alert.alert('PDF no soportado', 'Por ahora solo archivos de texto (.txt, .cho, .pro, .crd).');
    try { finishDraft(await (await fetch(a.uri)).text(), a.name.replace(/\.[^.]+$/, '')); }
    catch { Alert.alert('No pude leer el archivo'); }
  };
  const onWeb = (e) => { const m = JSON.parse(e.nativeEvent.data); finishDraft(m.text, m.title); };

  const name = draft.title.trim();
  const existing = target ? groups.find((g) => g.id === target) : groups.find((g) => g.title.toLowerCase() === name.toLowerCase());
  const commitDraft = () => {
    const body = draft.body;
    if (existing) {
      const v = { id: uid(), name: nextName(existing.versions), body };
      save(groups.map((g) => (g === existing ? { ...g, versions: [...g.versions, v] } : g)));
      setGid(existing.id);
    } else {
      const g = { id: uid(), title: name || 'Sin título', versions: [{ id: uid(), name: 'v1', body }] };
      save([...groups, g]); setGid(g.id);
    }
    go('group');
  };

  const Back = ({ to, label }) => <Btn s={s} flat label={`‹ ${label}`} onPress={() => go(to)} />;
  let body;

  if (view === 'home')
    body = (
      <>
        <View style={s.head}><Text style={s.h1}>Cancionero</Text>
          <Btn s={s} flat label={c === DARK ? '☀️' : '🌙'} onPress={toggleTheme} /></View>
        <FlatList data={groups} keyExtractor={(g) => g.id}
          ListEmptyComponent={<Text style={s.sub}>Sin canciones. Tocá “Importar”.</Text>}
          renderItem={({ item: g }) => (
            <Pressable style={s.row}
              onPress={() => { setGid(g.id); if (g.versions.length === 1) { setVid(g.versions[0].id); setN(0); setChord(null); go('song'); } else go('group'); }}
              onLongPress={() => actions(g.title, () => renameGroup(g), () => save(groups.filter((x) => x.id !== g.id)))}>
              <Text style={s.rowTitle}>{g.title}</Text>
              <Text style={s.sub}>{g.versions.length} {g.versions.length === 1 ? 'versión' : 'versiones'}</Text>
            </Pressable>)} />
        <Btn s={s} label="+ Importar canción" onPress={() => startImport()} />
      </>
    );

  if (view === 'group' && group)
    body = (
      <>
        <Back to="home" label="Canciones" />
        <View style={s.head}><Text style={s.h1}>{group.title}</Text><Btn s={s} flat label="✎" onPress={() => renameGroup(group)} /></View>
        <FlatList data={group.versions} keyExtractor={(v) => v.id}
          renderItem={({ item: v }) => (
            <Pressable style={s.row} onPress={() => { setVid(v.id); setN(0); setChord(null); go('song'); }}
              onLongPress={() => actions(v.name, () => renameVersion(group, v), () => {
                const left = group.versions.filter((x) => x.id !== v.id);
                if (left.length) save(groups.map((g) => (g === group ? { ...g, versions: left } : g)));
                else { save(groups.filter((g) => g !== group)); go('home'); }
              })}>
              <Text style={s.rowTitle}>{v.name}</Text><Text style={s.sub}>mantené apretado para renombrar</Text>
            </Pressable>)} />
        <Btn s={s} label="+ Agregar versión" onPress={() => startImport(group.id)} />
      </>
    );

  if (view === 'song' && version) {
    const lines = version.body.split('\n');
    const all = [...new Set(lines.filter(isChordLine).flatMap((l) => transposeChordLine(l, n).trim().split(/\s+/)).filter(isChord))];
    const first = all[0];
    const mono = { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: fs, lineHeight: fs * 1.45 };
    const v = chord && voicing(chord, inst);
    body = (
      <>
        <View style={s.head}><Back to="group" label={group.title} />
          <Btn s={s} flat label={tools ? 'Cerrar ✕' : 'Herramientas'} onPress={toggleTools} /></View>
        <Pressable onLongPress={() => renameVersion(group, version)}><Text style={s.h1}>{version.name}</Text></Pressable>
        <Text style={s.sub}>{first ? `Tono: ${first}  ·  ` : ''}{n > 0 ? '+' : ''}{n} semitonos</Text>
        <ScrollView style={{ marginTop: 12, flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}><View>
            {lines.map((l, i) => isChordLine(l)
              ? <Text key={i} style={[mono, { color: c.chord, fontWeight: '700' }]}>
                  {transposeChordLine(l, n).split(/(\s+)/).map((t, j) => isChord(t) ? <Text key={j} onPress={() => { setChord(t); if (!tools) toggleTools(); }}>{t}</Text> : t)}
                </Text>
              : <Text key={i} style={[mono, { color: c.fg }]}>{l || ' '}</Text>)}
          </View></ScrollView>
        </ScrollView>
        {tools && (
          <View style={s.panel}>
            <View style={s.seg}>{Object.keys(INSTRUMENTS).map((i) => (
              <Pressable key={i} style={[s.segItem, inst === i && { backgroundColor: c.accent }]} onPress={() => pickInst(i)}>
                <Text style={{ color: inst === i ? '#fff' : c.fg, fontSize: 13 }}>{i}</Text></Pressable>))}</View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10, flexGrow: 0 }}>
              {all.map((a) => (
                <Pressable key={a} style={[s.chip, chord === a && { backgroundColor: c.accent }]} onPress={() => setChord(a)}>
                  <Text style={{ color: chord === a ? '#fff' : c.chord, fontWeight: '700' }}>{a}</Text></Pressable>))}
            </ScrollView>
            <View style={s.diagramRow}>
              {chord ? (v ? <Diagram v={v} ns={INSTRUMENTS[inst].tuning.length} c={c} /> : <Text style={s.sub}>Sin digitación para {chord}</Text>)
                : <Text style={s.sub}>Tocá un acorde para ver su forma en {inst.toLowerCase()}.</Text>}
              <View style={{ alignItems: 'center' }}>
                {chord && <Text style={[s.h1, { color: c.chord }]}>{chord}</Text>}
                <Text style={s.sub}>Tamaño de letra</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn s={s} small label="A−" onPress={() => setFs(Math.max(10, fs - 1))} />
                  <Btn s={s} small label="A+" onPress={() => setFs(Math.min(22, fs + 1))} />
                </View>
              </View>
            </View>
          </View>
        )}
        <View style={s.bar}>
          <Btn s={s} label="−" onPress={() => setN(n - 1)} />
          <Btn s={s} label="Original" onPress={() => setN(0)} />
          <Btn s={s} label="+" onPress={() => setN(n + 1)} />
        </View>
      </>
    );
  }

  if (view === 'import')
    body = (
      <>
        <Back to={target ? 'group' : 'home'} label="Volver" />
        <Text style={s.h1}>Importar</Text>
        <Text style={s.sub}>Elegí de dónde traer la canción. Queda guardada en el teléfono.</Text>
        <View style={{ gap: 12, marginTop: 20 }}>
          <Btn s={s} label="📄  Archivo del teléfono (.txt, .cho)" onPress={pickFile} />
          <Btn s={s} label="📋  Pegar texto copiado" onPress={() => { setDraft({ title: '', body: '' }); go('paste'); }} />
          <Btn s={s} label="🌐  Buscar en CifraClub / LaCuerda" onPress={() => go('web')} />
        </View>
      </>
    );

  if (view === 'paste')
    body = (
      <>
        <Back to="import" label="Importar" />
        <Text style={s.h1}>Pegar texto</Text>
        <TextInput style={[s.input, { flex: 1, textAlignVertical: 'top', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12 }]} multiline autoFocus
          placeholder="Pegá acá la letra con acordes" placeholderTextColor={c.sub} value={draft.body} onChangeText={(t) => setDraft({ ...draft, body: t })} />
        <Btn s={s} label="Siguiente" onPress={() => finishDraft(draft.body, draft.title)} />
      </>
    );

  if (view === 'web')
    body = (
      <>
        <View style={s.head}>
          <Back to="import" label="Volver" />
          {Object.entries(SITES).map(([k, u]) => <Btn key={k} s={s} flat label={k} onPress={() => setUrl(u)} />)}
        </View>
        <WebView ref={web} source={{ uri: url }} onMessage={onWeb} style={{ flex: 1 }} />
        <Btn s={s} label="Guardar esta canción" onPress={() => web.current.injectJavaScript(EXTRACT)} />
      </>
    );

  if (view === 'save')
    body = (
      <>
        <Back to="import" label="Cancelar" />
        <Text style={s.h1}>Guardar canción</Text>
        <Text style={s.sub}>Nombre de la canción</Text>
        <TextInput style={s.input} value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} placeholder="Ej: Cumpleaños feliz" placeholderTextColor={c.sub} />
        <Text style={[s.sub, { marginVertical: 12 }]}>
          {existing ? `Se agregará como ${nextName(existing.versions)} dentro de “${existing.title}”.` : 'Se creará una canción nueva con la versión v1.'}
        </Text>
        <Btn s={s} label="Guardar" onPress={commitDraft} />
      </>
    );

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle={c === DARK ? 'light-content' : 'dark-content'} />
      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{body}</Animated.View>
      <Modal visible={!!prompt} transparent animationType="fade" onRequestClose={() => setPrompt(null)}>
        <View style={s.modalBg}><View style={s.modal}>
          <Text style={s.sub}>{prompt?.label}</Text>
          <TextInput style={s.input} autoFocus value={prompt?.value} onChangeText={(t) => setPrompt({ ...prompt, value: t })} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn s={s} flat label="Cancelar" onPress={() => setPrompt(null)} />
            <Btn s={s} label="Guardar" onPress={() => { if (prompt.value.trim()) prompt.onOk(prompt.value.trim()); setPrompt(null); }} />
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

// Botones de mínimo 48 pt (ley de Fitts) y con respuesta visual al tocar.
const Btn = ({ s, label, onPress, flat, small }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [flat ? s.flat : small ? s.small : s.btn, pressed && { opacity: 0.6, transform: [{ scale: 0.97 }] }]}>
    <Text style={flat ? s.flatText : s.btnText}>{label}</Text>
  </Pressable>
);

function Diagram({ v, ns, c }) {
  const W = 130, L = 22, T = 34, gw = (W - 2 * L) / (ns - 1), fh = 22;
  const x = (i) => L + i * gw;
  return (
    <Svg width={W} height={T + 5 * fh + 10}>
      {Array.from({ length: 6 }, (_, j) => <Line key={'h' + j} x1={L} x2={W - L} y1={T + j * fh} y2={T + j * fh} stroke={c.sub} strokeWidth={j === 0 && v.base === 1 ? 4 : 1} />)}
      {Array.from({ length: ns }, (_, i) => <Line key={'s' + i} x1={x(i)} x2={x(i)} y1={T} y2={T + 5 * fh} stroke={c.sub} strokeWidth={1} />)}
      {v.frets.map((f, i) => f < 0
        ? <SvgText key={i} x={x(i)} y={T - 10} fontSize={14} fill={c.sub} textAnchor="middle">×</SvgText>
        : f === 0 ? <Circle key={i} cx={x(i)} cy={T - 13} r={5} stroke={c.sub} strokeWidth={1.5} fill="none" />
        : <Circle key={i} cx={x(i)} cy={T + (f - v.base + 0.5) * fh} r={8} fill={c.accent} />)}
      {v.base > 1 && <SvgText x={2} y={T + fh * 0.7} fontSize={11} fill={c.sub}>{v.base}fr</SvgText>}
    </Svg>
  );
}

const styles = (c) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 28, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 12, paddingBottom: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 24, fontWeight: '700', color: c.fg, marginBottom: 4 },
  sub: { fontSize: 13, color: c.sub },
  row: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line, minHeight: 56 },
  rowTitle: { fontSize: 17, color: c.fg, marginBottom: 2 },
  btn: { flex: 1, minHeight: 50, backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  small: { minHeight: 40, minWidth: 48, backgroundColor: c.accent, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flat: { minHeight: 48, justifyContent: 'center', paddingRight: 8 },
  flatText: { color: c.accent, fontSize: 16 },
  bar: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  panel: { backgroundColor: c.card, borderRadius: 14, padding: 12, marginTop: 8 },
  seg: { flexDirection: 'row', backgroundColor: c.bg, borderRadius: 10, padding: 3 },
  segItem: { flex: 1, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 40, minWidth: 48, paddingHorizontal: 12, marginRight: 8, borderRadius: 10, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  diagramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 150 },
  input: { backgroundColor: c.card, color: c.fg, borderRadius: 12, padding: 14, fontSize: 16, marginTop: 8 },
  modalBg: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 28 },
  modal: { backgroundColor: c.bg, borderRadius: 16, padding: 18, gap: 10 },
});
