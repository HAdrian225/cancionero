import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { isChord, isChordLine, parseLine, transposeChord, transposeChordLine } from './transpose';

// Muestras en ChordPro, convertidas al mismo formato que las canciones importadas (acordes arriba de la letra).
const chordPro = (t) => t.split('\n').map((l) => { const p = parseLine(l); return p.chords + '\n' + p.lyrics; }).join('\n');
const SAMPLES = [
  { id: 'm1', title: 'Cumpleaños feliz', body: chordPro('[C]Cumpleaños fe[G]liz, cumpleaños fe[C]liz\nTe de[C7]seamos todos, cumpleaños fe[F]liz\nQue los cum[C]plas fe[G]liz, que los cum[C]plas feliz') },
];
const SITES = { CifraClub: 'https://www.cifraclub.com/', LaCuerda: 'https://acordes.lacuerda.net/' };
// Corre dentro de la página: toma el <pre> más largo (donde ambos sitios ponen letra + acordes).
const EXTRACT = `(function(){var p=[].slice.call(document.querySelectorAll('pre')).sort(function(a,b){return b.innerText.length-a.innerText.length})[0];
window.ReactNativeWebView.postMessage(JSON.stringify({title:document.title,text:p?p.innerText:''}));})();true;`;

export default function App() {
  const [songs, setSongs] = useState([]);
  const [song, setSong] = useState(null);
  const [n, setN] = useState(0);
  const [importing, setImporting] = useState(false);
  const [url, setUrl] = useState(SITES.CifraClub);
  const web = useRef();

  useEffect(() => {
    AsyncStorage.getItem('songs').then((v) => setSongs(v ? JSON.parse(v) : SAMPLES));
  }, []);
  const save = (list) => { setSongs(list); AsyncStorage.setItem('songs', JSON.stringify(list)); };

  const onMessage = (e) => {
    const { title, text } = JSON.parse(e.nativeEvent.data);
    if (!text.split('\n').some(isChordLine))
      return Alert.alert('No encontré acordes', 'Abrí primero una canción del sitio y volvé a tocar Importar.');
    const clean = title.replace(/\s*[-|]\s*(Cifra Club|La ?Cuerda).*$/i, '').trim() || 'Sin título';
    save([...songs, { id: String(Date.now()), title: clean, body: text }]);
    setImporting(false);
  };

  const askDelete = (item) =>
    Alert.alert('Borrar canción', item.title, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => save(songs.filter((x) => x.id !== item.id)) },
    ]);

  if (importing)
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.top}>
          <Pressable onPress={() => setImporting(false)}><Text style={s.back}>‹ Cancelar</Text></Pressable>
          {Object.entries(SITES).map(([name, u]) => (
            <Pressable key={name} onPress={() => setUrl(u)}><Text style={s.back}>{name}</Text></Pressable>
          ))}
        </View>
        <WebView ref={web} source={{ uri: url }} onMessage={onMessage} style={{ flex: 1 }} />
        <View style={s.bar}><Btn label="Importar esta canción" onPress={() => web.current.injectJavaScript(EXTRACT)} /></View>
      </SafeAreaView>
    );

  if (!song)
    return (
      <SafeAreaView style={s.screen}>
        <Text style={s.h1}>Cancionero</Text>
        <FlatList
          data={songs}
          keyExtractor={(x) => x.id}
          ListEmptyComponent={<Text style={s.meta}>Sin canciones. Tocá “Importar”.</Text>}
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => { setSong(item); setN(0); }} onLongPress={() => askDelete(item)}>
              <Text style={s.rowTitle}>{item.title}</Text>
            </Pressable>
          )}
        />
        <View style={s.bar}><Btn label="Importar de LaCuerda / CifraClub" onPress={() => setImporting(true)} /></View>
      </SafeAreaView>
    );

  const lines = song.body.split('\n');
  const first = lines.find(isChordLine)?.trim().split(/\s+/).find(isChord);
  return (
    <SafeAreaView style={s.screen}>
      <Pressable onPress={() => setSong(null)}><Text style={s.back}>‹ Canciones</Text></Pressable>
      <Text style={s.h1}>{song.title}</Text>
      <Text style={s.meta}>
        {first ? `Primer acorde: ${transposeChord(first, n)}   ` : ''}({n > 0 ? '+' : ''}{n})
      </Text>
      <ScrollView style={{ marginTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {lines.map((l, i) => isChordLine(l)
              ? <Text key={i} style={s.chords}>{transposeChordLine(l, n)}</Text>
              : <Text key={i} style={s.lyrics}>{l || ' '}</Text>)}
          </View>
        </ScrollView>
      </ScrollView>
      <View style={s.bar}>
        <Btn label="−" onPress={() => setN(n - 1)} />
        <Btn label="Original" onPress={() => setN(0)} />
        <Btn label="+" onPress={() => setN(n + 1)} />
      </View>
    </SafeAreaView>
  );
}

const Btn = ({ label, onPress }) => (
  <Pressable style={s.btn} onPress={onPress}><Text style={s.btnText}>{label}</Text></Pressable>
);

const mono = { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 13, lineHeight: 18 };
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 28, paddingTop: (StatusBar.currentHeight || 50) + 8, paddingBottom: 24 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  rowTitle: { fontSize: 16 },
  meta: { fontSize: 14, color: '#666' },
  back: { fontSize: 16, color: '#007aff', marginBottom: 8 },
  chords: { ...mono, color: '#d9480f', fontWeight: '700' },
  lyrics: { ...mono, color: '#111' },
  bar: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  btn: { flex: 1, backgroundColor: '#007aff', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
