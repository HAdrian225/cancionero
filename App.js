import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Share,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { INSTRUMENTS } from './chords';
import {
  InstallPromptModal,
  detectWebInstallEnvironment,
} from './src/components/InstallPromptModal';
import { PdfGuideModal } from './src/components/PdfGuideModal';
import { ActionSheetModal, RenameModal } from './src/components/UI';
import { EditSongScreen } from './src/screens/EditSongScreen';
import { GroupScreen } from './src/screens/GroupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ImportScreen } from './src/screens/ImportScreen';
import { PasteScreen } from './src/screens/PasteScreen';
import { SaveScreen } from './src/screens/SaveScreen';
import { SongScreen } from './src/screens/SongScreen';
import { DARK, LIGHT, hapticSuccess } from './src/theme';
import {
  SAMPLE,
  extractChords,
  isTabLine,
  mergeBackupGroups,
  nextName,
  normalize,
  parseBackupPayload,
  safe,
  uid,
} from './src/utils/songs';
import { isChordLine } from './transpose';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const BLOCKED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'application/zip'];
const PWA_PROMPT_KEY = 'pwaPrompt';
const PWA_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

async function readPickedAssetText(asset) {
  if (asset.file && typeof asset.file.text === 'function') {
    return asset.file.text();
  }
  let response;
  try {
    response = await fetch(asset.uri);
  } catch {
    response = await fetch(encodeURI(asset.uri));
  }
  return response.text();
}

function MainApp() {
  const sys = useColorScheme();
  const [pref, setPref] = useState(null); // null = seguir al sistema
  const isDark = (pref ?? sys) === 'dark';
  const c = isDark ? DARK : LIGHT;

  const [ready, setReady] = useState(false);
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState('home'); // home | group | song | import | paste | save
  const [gid, setGid] = useState(null);
  const [vid, setVid] = useState(null);
  const [songOrigin, setSongOrigin] = useState('home'); // 'home' | 'group'
  const [target, setTarget] = useState(null);
  const [importReturn, setImportReturn] = useState('home');
  const [draft, setDraft] = useState({ title: '', body: '', versionName: '' });
  const [prompt, setPrompt] = useState(null); // { label, value, onOk }
  const [sheet, setSheet] = useState(null); // { title, message?, actions?, cancelLabel? }
  const [pdfGuideOpen, setPdfGuideOpen] = useState(false);
  const [installPromptVisible, setInstallPromptVisible] = useState(false);
  const [deferredInstallEvent, setDeferredInstallEvent] = useState(null);
  const [n, setN] = useState(0);
  const [tools, setTools] = useState(false);
  const [inst, setInst] = useState('Guitarra');
  const [chord, setChord] = useState(null);
  const [fs, setFs] = useState(14);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.multiGet(['groups', 'songs', 'theme', 'inst'])
      .then(([[, g], [, old], [, t], [, i]]) => {
        const parsedGroups = safe(g, null);
        const parsedOld = safe(old, null);
        const validGroups = Array.isArray(parsedGroups) ? parsedGroups : null;
        const validOld = Array.isArray(parsedOld) ? parsedOld : null;

        const list =
          validGroups ??
          (validOld
            ? validOld.map((x) => ({
                id: x.id,
                title: x.title,
                versions: [{ id: uid(), name: 'v1', body: x.body }],
              }))
            : SAMPLE);

        setGroups(list);
        if (!validGroups) AsyncStorage.setItem('groups', JSON.stringify(list));
        if (t === 'light' || t === 'dark') setPref(t);
        if (i && INSTRUMENTS[i]) setInst(i);
      })
      .finally(() => setReady(true));
  }, []);

  // Sincroniza el color de la barra de Safari/Chrome con el tema activo en Web/PWA.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.style.backgroundColor = c.bg;
    document.documentElement.style.backgroundColor = c.bg;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', c.bg);
  }, [c.bg]);

  // Escucha el evento nativo de instalación en Android/Chrome y muestra el popup de bienvenida en Web.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const { isStandalone } = detectWebInstallEnvironment();
    if (isStandalone) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallEvent(e);
    };
    const onInstalled = () => {
      setDeferredInstallEvent(null);
      setInstallPromptVisible(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    let timer = null;
    AsyncStorage.getItem(PWA_PROMPT_KEY).then((val) => {
      if (val === 'never') return;
      const last = Number(val);
      if (last && Date.now() - last < PWA_SNOOZE_MS) return;
      timer = setTimeout(() => setInstallPromptVisible(true), 4000);
    });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [view, fade]);

  const notify = (title, message) => setSheet({ title, message, actions: [] });

  const save = (list) => {
    setGroups(list);
    AsyncStorage.setItem('groups', JSON.stringify(list));
  };

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setPref(next);
    AsyncStorage.setItem('theme', next);
  };

  const toggleTools = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setTools((prev) => !prev);
  };

  const pickInst = (i) => {
    setInst(i);
    AsyncStorage.setItem('inst', i);
  };

  const group = groups.find((g) => g.id === gid) || null;
  const version = group?.versions.find((v) => v.id === vid) || null;
  const targetGroup = target ? groups.find((g) => g.id === target) || null : null;

  const handleChangeN = (nextN) => {
    if (chord && version) {
      const prevChords = extractChords(version.body, n);
      const nextChords = extractChords(version.body, nextN);
      const idx = prevChords.indexOf(chord);
      setChord(idx >= 0 && idx < nextChords.length ? nextChords[idx] : null);
    }
    setN(nextN);
  };

  const openRename = (label, value, onOk) => setPrompt({ label, value, onOk });

  const renameGroup = (g) =>
    openRename('Nombre de la canción', g.title, (t) =>
      save(groups.map((x) => (x.id === g.id ? { ...x, title: t } : x)))
    );

  const renameVersion = (g, v) =>
    openRename('Nombre de la versión', v.name, (t) =>
      save(
        groups.map((x) =>
          x.id === g.id
            ? { ...x, versions: x.versions.map((y) => (y.id === v.id ? { ...y, name: t } : y)) }
            : x
        )
      )
    );

  const updateVersionBody = (g, v, nextBody) => {
    save(
      groups.map((x) =>
        x.id === g.id
          ? { ...x, versions: x.versions.map((y) => (y.id === v.id ? { ...y, body: nextBody } : y)) }
          : x
      )
    );
    setChord(null);
    hapticSuccess();
    setView('song');
  };

  const updateVersionTempo = (g, v, bpm, beats) => {
    save(
      groups.map((x) =>
        x.id === g.id
          ? {
              ...x,
              versions: x.versions.map((y) => (y.id === v.id ? { ...y, bpm, beats } : y)),
            }
          : x
      )
    );
  };

  const confirmDeleteGroup = (g) => {
    setSheet({
      title: `¿Borrar “${g.title}”?`,
      message:
        g.versions.length > 1
          ? `Se eliminarán sus ${g.versions.length} versiones de este dispositivo.`
          : 'Esta acción no se puede deshacer.',
      actions: [
        {
          label: 'Borrar canción',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => {
            save(groups.filter((x) => x.id !== g.id));
            if (gid === g.id) {
              setGid(null);
              setVid(null);
              setView('home');
            }
          },
        },
      ],
    });
  };

  const confirmDeleteVersion = (g, v) => {
    const isLast = g.versions.length <= 1;
    setSheet({
      title: isLast ? `¿Borrar “${g.title}”?` : `¿Borrar la versión “${v.name}”?`,
      message: isLast
        ? 'Es la única versión; se borrará la canción completa.'
        : 'Esta acción no se puede deshacer.',
      actions: [
        {
          label: isLast ? 'Borrar canción' : 'Borrar versión',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => {
            const left = g.versions.filter((x) => x.id !== v.id);
            if (left.length) {
              save(groups.map((x) => (x.id === g.id ? { ...x, versions: left } : x)));
              if (view === 'song' && vid === v.id) {
                setN(0);
                setChord(null);
                setTools(false);
                if (left.length === 1 && songOrigin === 'home') {
                  setVid(left[0].id);
                } else {
                  setVid(null);
                  setView('group');
                }
              }
            } else {
              save(groups.filter((x) => x.id !== g.id));
              setGid(null);
              setVid(null);
              setView('home');
            }
          },
        },
      ],
    });
  };

  const startImport = (targetId = null, returnView = 'home') => {
    setTarget(targetId);
    setImportReturn(returnView);
    setView('import');
  };

  const openGroupMenu = (g) => {
    setSheet({
      title: g.title,
      message: g.versions.length === 1 ? '1 versión' : `${g.versions.length} versiones`,
      actions: [
        { label: 'Renombrar canción', icon: 'pencil-outline', onPress: () => renameGroup(g) },
        {
          label: 'Agregar versión',
          icon: 'add-circle-outline',
          onPress: () => startImport(g.id, 'home'),
        },
        {
          label: 'Borrar canción',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => confirmDeleteGroup(g),
        },
      ],
    });
  };

  const openVersionMenu = (g, v) => {
    setSheet({
      title: v.name,
      message: g.title,
      actions: [
        {
          label: 'Editar letra / acordes',
          icon: 'create-outline',
          onPress: () => {
            setGid(g.id);
            setVid(v.id);
            setSongOrigin('group');
            setN(0);
            setChord(null);
            setTools(false);
            setView('edit');
          },
        },
        {
          label: 'Renombrar versión',
          icon: 'pencil-outline',
          onPress: () => renameVersion(g, v),
        },
        {
          label: 'Borrar versión',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => confirmDeleteVersion(g, v),
        },
      ],
    });
  };

  const openSongMenu = (g, v) => {
    const actions = [
      {
        label: 'Editar letra, acordes y tablatura',
        icon: 'create-outline',
        primary: true,
        onPress: () => setView('edit'),
      },
      { label: 'Renombrar canción', icon: 'pencil-outline', onPress: () => renameGroup(g) },
      { label: 'Renombrar versión', icon: 'text-outline', onPress: () => renameVersion(g, v) },
      {
        label: 'Agregar otra versión',
        icon: 'add-circle-outline',
        onPress: () => startImport(g.id, 'song'),
      },
    ];
    if (g.versions.length > 1) {
      actions.push({
        label: `Ver las ${g.versions.length} versiones`,
        icon: 'layers-outline',
        onPress: () => setView('group'),
      });
    }
    actions.push({
      label: g.versions.length > 1 ? 'Borrar esta versión' : 'Borrar canción',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => confirmDeleteVersion(g, v),
    });
    setSheet({ title: g.title, message: `Versión ${v.name}`, actions });
  };

  const exportBackup = async () => {
    const payload = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), groups },
      null,
      2
    );
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cancionero-respaldo-${dateStamp}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        hapticSuccess();
        notify(
          'Respaldo descargado',
          `Guardamos tus ${groups.length} canciones en cancionero-respaldo-${dateStamp}.json.`
        );
      } catch {
        notify('No pude exportar el respaldo', 'Probá nuevamente desde tu navegador.');
      }
      return;
    }

    try {
      await Share.share({
        title: `Respaldo Cancionero (${dateStamp})`,
        message: payload,
      });
    } catch {
      notify('No pude compartir el respaldo', 'Probá nuevamente en unos segundos.');
    }
  };

  const importBackup = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? 'application/json,.json' : '*/*',
        copyToCacheDirectory: true,
      });
      if (r.canceled || !r.assets?.length) return;
      const a = r.assets[0];
      if (typeof a.size === 'number' && a.size > MAX_IMPORT_BYTES * 3) {
        notify('Archivo muy grande', 'El archivo de respaldo supera los 6 MB.');
        return;
      }
      const raw = await readPickedAssetText(a);
      const incoming = parseBackupPayload(raw);
      if (!incoming) {
        notify(
          'Respaldo inválido',
          'No reconocimos canciones válidas en ese archivo .json.'
        );
        return;
      }

      const countText =
        incoming.length === 1 ? '1 canción' : `${incoming.length} canciones`;

      setSheet({
        title: `Importar ${countText}`,
        message: 'Elegí si querés sumarlas a tu cancionero actual o reemplazar todo.',
        actions: [
          {
            label: 'Sumar a mis canciones',
            icon: 'add-circle-outline',
            primary: true,
            onPress: () => {
              const merged = mergeBackupGroups(groups, incoming);
              save(merged);
              hapticSuccess();
              notify('Respaldo importado', `Tu cancionero ahora tiene ${merged.length} canciones.`);
            },
          },
          {
            label: 'Reemplazar todo',
            icon: 'refresh-outline',
            destructive: true,
            onPress: () => {
              save(incoming);
              setGid(null);
              setVid(null);
              setView('home');
              hapticSuccess();
              notify('Cancionero restaurado', `Se cargaron ${countText} desde el respaldo.`);
            },
          },
        ],
      });
    } catch {
      notify('No pude leer el respaldo', 'Revisá que sea un archivo .json exportado desde Cancionero.');
    }
  };

  const openAppMenu = () => {
    const { isWeb, isStandalone } = detectWebInstallEnvironment();
    const actions = [];
    if (isWeb && !isStandalone) {
      actions.push({
        label: 'Agregar a pantalla de inicio',
        icon: 'phone-portrait-outline',
        primary: true,
        onPress: () => setInstallPromptVisible(true),
      });
    }
    actions.push(
      {
        label: 'Exportar respaldo (.json)',
        icon: 'download-outline',
        onPress: exportBackup,
      },
      {
        label: 'Importar respaldo (.json)',
        icon: 'push-outline',
        onPress: importBackup,
      }
    );
    setSheet({
      title: 'Cancionero',
      message: 'Tus canciones se guardan en este dispositivo. Exportá un respaldo cuando quieras.',
      actions,
    });
  };

  const openSong = (g, v, origin) => {
    setGid(g.id);
    setVid(v.id);
    setSongOrigin(origin);
    setN(0);
    setChord(null);
    setTools(false);
    setView('song');
  };

  const finishDraft = (raw, fallback) => {
    const d = normalize(raw, fallback);
    if (!d.body.split('\n').some((l) => isChordLine(l) || isTabLine(l))) {
      notify(
        'No encontré acordes ni tablatura',
        'El texto no parece tener acordes ni tablatura. Revisá el archivo o pegá una canción con acordes arriba, formato [Am] o tablatura (e|---|).'
      );
      return;
    }
    const defaultVersion = targetGroup ? nextName(targetGroup.versions) : 'v1';
    setDraft({
      title: targetGroup ? targetGroup.title : d.title,
      body: d.body,
      versionName: defaultVersion,
    });
    setView('save');
  };

  const pickFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? 'text/*,.txt,.cho,.pro,.crd,.chopro' : '*/*',
        copyToCacheDirectory: true,
      });
      if (r.canceled || !r.assets?.length) return;
      const a = r.assets[0];
      const fileName = a.name || '';
      const mime = (a.mimeType || '').toLowerCase();

      if (/\.pdf$/i.test(fileName) || mime === 'application/pdf') {
        setSheet({
          title: 'PDF no soportado directamente',
          message:
            'Cancionero acepta archivos de texto (.txt, .cho, .pro, .crd) para mantenerse liviana y offline. Te mostramos cómo pasarlo en 15 segundos.',
          actions: [
            {
              label: 'Ver guía paso a paso',
              icon: 'help-circle-outline',
              primary: true,
              onPress: () => setPdfGuideOpen(true),
            },
            {
              label: 'Pegar texto copiado',
              icon: 'clipboard-outline',
              onPress: () => {
                setDraft({ title: targetGroup?.title || '', body: '', versionName: '' });
                setView('paste');
              },
            },
          ],
        });
        return;
      }
      if (BLOCKED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
        notify('Archivo no soportado', 'Elegí un archivo de texto plano (.txt, .cho, .pro, .crd).');
        return;
      }
      if (typeof a.size === 'number' && a.size > MAX_IMPORT_BYTES) {
        notify('Archivo muy grande', 'El archivo supera los 2 MB. Elegí un archivo de texto con acordes.');
        return;
      }

      const text = await readPickedAssetText(a);
      finishDraft(text, targetGroup?.title || fileName.replace(/\.[^.]+$/, ''));
    } catch {
      notify('No pude leer el archivo', 'Probá con otro archivo de texto o pegando el contenido.');
    }
  };

  const effectiveTitle = draft.title.trim() || 'Sin título';
  const existing = targetGroup
    ? targetGroup
    : groups.find((g) => g.title.toLowerCase() === effectiveTitle.toLowerCase());

  const commitDraft = () => {
    const body = draft.body;
    hapticSuccess();
    if (existing) {
      const customVersion = targetGroup ? draft.versionName?.trim() : '';
      const v = { id: uid(), name: customVersion || nextName(existing.versions), body };
      save(groups.map((g) => (g.id === existing.id ? { ...g, versions: [...g.versions, v] } : g)));
      setGid(existing.id);
      setVid(v.id);
      setTarget(null);
      setView('group');
    } else {
      const firstVersion = { id: uid(), name: 'v1', body };
      const g = { id: uid(), title: effectiveTitle, versions: [firstVersion] };
      save([...groups, g]);
      setTarget(null);
      openSong(g, firstVersion, 'home');
    }
  };

  const handleInstallNative = async () => {
    if (!deferredInstallEvent) {
      setInstallPromptVisible(false);
      return;
    }
    try {
      await deferredInstallEvent.prompt();
      await deferredInstallEvent.userChoice;
    } catch {
      // Ignora cancelación del navegador
    }
    setDeferredInstallEvent(null);
    setInstallPromptVisible(false);
    AsyncStorage.setItem(PWA_PROMPT_KEY, String(Date.now()));
  };

  const handleInstallLater = () => {
    setInstallPromptVisible(false);
    AsyncStorage.setItem(PWA_PROMPT_KEY, String(Date.now()));
  };

  const handleInstallNever = () => {
    setInstallPromptVisible(false);
    AsyncStorage.setItem(PWA_PROMPT_KEY, 'never');
  };

  let screen = null;

  if (view === 'home') {
    screen = (
      <HomeScreen
        c={c}
        groups={groups}
        loading={!ready}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAppMenu={openAppMenu}
        onOpenGroup={(g) => {
          setGid(g.id);
          setView('group');
        }}
        onOpenSongDirect={(g, v) => openSong(g, v, 'home')}
        onGroupMenu={openGroupMenu}
        onImport={() => startImport(null, 'home')}
      />
    );
  } else if (view === 'group' && group) {
    screen = (
      <GroupScreen
        c={c}
        group={group}
        onBack={() => setView('home')}
        onRenameGroup={() => renameGroup(group)}
        onDeleteGroup={() => confirmDeleteGroup(group)}
        onOpenVersion={(v) => openSong(group, v, 'group')}
        onVersionMenu={(v) => openVersionMenu(group, v)}
        onAddVersion={() => startImport(group.id, 'group')}
      />
    );
  } else if (view === 'song' && group && version) {
    const goBackToGroup = songOrigin === 'group' && group.versions.length > 1;
    screen = (
      <SongScreen
        c={c}
        group={group}
        version={version}
        backLabel={goBackToGroup ? group.title : 'Canciones'}
        onBack={() => setView(goBackToGroup ? 'group' : 'home')}
        onMenu={() => openSongMenu(group, version)}
        n={n}
        onChangeN={handleChangeN}
        tools={tools}
        onToggleTools={toggleTools}
        inst={inst}
        onPickInst={pickInst}
        chord={chord}
        onSelectChord={setChord}
        fs={fs}
        onChangeFs={setFs}
        onSaveTempo={(bpm, beats) => updateVersionTempo(group, version, bpm, beats)}
      />
    );
  } else if (view === 'edit' && group && version) {
    screen = (
      <EditSongScreen
        c={c}
        group={group}
        version={version}
        inst={inst}
        onBack={(hasChanges) => {
          if (!hasChanges) {
            setView('song');
            return;
          }
          setSheet({
            title: '¿Descartar cambios?',
            message: 'Si salís ahora se perderán las modificaciones que hiciste en esta canción.',
            actions: [
              {
                label: 'Descartar cambios',
                icon: 'trash-outline',
                destructive: true,
                onPress: () => setView('song'),
              },
            ],
          });
        }}
        onSave={(nextBody) => updateVersionBody(group, version, nextBody)}
      />
    );
  } else if (view === 'import') {
    screen = (
      <ImportScreen
        c={c}
        targetGroup={targetGroup}
        onBack={() => setView(importReturn)}
        onPickFile={pickFile}
        onPaste={() => {
          setDraft({ title: targetGroup?.title || '', body: '', versionName: '' });
          setView('paste');
        }}
        onOpenPdfGuide={() => setPdfGuideOpen(true)}
      />
    );
  } else if (view === 'paste') {
    screen = (
      <PasteScreen
        c={c}
        value={draft.body}
        onChange={(t) => setDraft((prev) => ({ ...prev, body: t }))}
        onBack={() => setView('import')}
        onContinue={() => finishDraft(draft.body, draft.title)}
      />
    );
  } else if (view === 'save') {
    screen = (
      <SaveScreen
        c={c}
        draft={draft}
        targetGroup={targetGroup}
        existing={existing}
        onChangeTitle={(t) => setDraft((prev) => ({ ...prev, title: t }))}
        onChangeVersionName={(t) => setDraft((prev) => ({ ...prev, versionName: t }))}
        onBack={() => setView('import')}
        onCommit={commitDraft}
      />
    );
  } else {
    screen = (
      <HomeScreen
        c={c}
        groups={groups}
        loading={!ready}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAppMenu={openAppMenu}
        onOpenGroup={(g) => {
          setGid(g.id);
          setView('group');
        }}
        onOpenSongDirect={(g, v) => openSong(g, v, 'home')}
        onGroupMenu={openGroupMenu}
        onImport={() => startImport(null, 'home')}
      />
    );
  }

  return (
    <View style={[styles.animatedRoot, { backgroundColor: c.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Animated.View
        style={[
          styles.animatedRoot,
          {
            backgroundColor: c.bg,
            opacity: fade,
            transform: [
              {
                translateY: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
            ],
          },
        ]}
      >
        {screen}
      </Animated.View>
      <RenameModal
        c={c}
        prompt={prompt}
        onChange={(t) => setPrompt((prev) => (prev ? { ...prev, value: t } : prev))}
        onCancel={() => setPrompt(null)}
        onConfirm={() => {
          const trimmed = prompt?.value?.trim();
          if (!trimmed) return;
          prompt.onOk(trimmed);
          setPrompt(null);
        }}
      />
      <ActionSheetModal c={c} sheet={sheet} onClose={() => setSheet(null)} />
      <PdfGuideModal
        c={c}
        visible={pdfGuideOpen}
        onClose={() => setPdfGuideOpen(false)}
        onGoPaste={() => {
          setDraft({ title: targetGroup?.title || '', body: '', versionName: '' });
          setView('paste');
        }}
      />
      <InstallPromptModal
        c={c}
        visible={installPromptVisible}
        canInstallNative={!!deferredInstallEvent}
        onInstallNative={handleInstallNative}
        onLater={handleInstallLater}
        onNever={handleInstallNever}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  animatedRoot: {
    flex: 1,
  },
});
