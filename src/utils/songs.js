import { isChord, isChordLine, parseLine, transposeChordLine } from '../../transpose';

export const chordPro = (t) =>
  t
    .split('\n')
    .map((l) => {
      const p = parseLine(l);
      return (p.chords ? p.chords + '\n' : '') + p.lyrics;
    })
    .join('\n');

export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const safe = (s, d) => {
  try {
    return JSON.parse(s) ?? d;
  } catch {
    return d;
  }
};

// No repite nombres tras borrar
export const nextName = (vs) =>
  'v' + (Math.max(0, ...vs.map((v) => +(v.name.match(/^v(\d+)$/) || [])[1] || 0)) + 1);

export const SAMPLE = [
  {
    id: 's1',
    title: 'Cumpleaños feliz',
    versions: [
      {
        id: 's1a',
        name: 'v1',
        body: chordPro(
          '[C]Cumpleaños fe[G]liz, cumpleaños fe[C]liz\nTe de[C7]seamos todos, cumpleaños fe[F]liz\nQue los cum[C]plas fe[G]liz, que los cum[C]plas feliz'
        ),
      },
    ],
  },
];

// Texto crudo (archivo .txt/.cho o texto pegado) -> { title, body } con acordes arriba de la letra.
export function normalize(raw, fallbackTitle = '') {
  let title = typeof fallbackTitle === 'string' ? fallbackTitle : '';
  const text = typeof raw === 'string' ? raw : '';
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .flatMap((l) => {
      const d = l.match(/^\s*\{\s*(\w+)\s*:?\s*(.*?)\}\s*$/);
      if (!d) return [l];
      if (/^(title|t)$/i.test(d[1])) title = d[2] || title;
      return /^(c|comment|ci)$/i.test(d[1]) ? [d[2]] : [];
    });
  let body = lines.join('\n').trim();
  const inline = body.match(/\[[^\]]+\]/g) || [];
  if (inline.some((t) => isChord(t.slice(1, -1)))) body = chordPro(body);
  return {
    title: title.replace(/\s*[-|]\s*(Cifra Club|La ?Cuerda).*$/i, '').trim(),
    body,
  };
}

export function extractChords(body, semitones = 0) {
  const lines = body.split('\n');
  return [
    ...new Set(
      lines
        .filter((l) => !isTabLine(l) && isChordLine(l))
        .flatMap((l) => transposeChordLine(l, semitones).trim().split(/\s+/))
        .filter(isChord)
    ),
  ];
}

// Búsqueda rápida del primer acorde (evita recorrer toda la canción en listas de 300+ temas).
export function getFirstChord(body) {
  if (typeof body !== 'string') return null;
  for (const line of body.split('\n')) {
    if (!isTabLine(line) && isChordLine(line)) {
      const chord = line.trim().split(/\s+/).find(isChord);
      if (chord) return chord;
    }
  }
  return null;
}

export function getFirstLyricSnippet(body) {
  const line = body
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !isTabLine(l) && !isChordLine(l));
  return line || '';
}

// Líneas de índice o separadores con una serie de guiones seguidos (nunca borra tablaturas).
const INDEX_DASHES_RE = /-{3,}|_{3,}|─{3,}|—{2,}/;
const STANDALONE_NUMBER_RE = /^\s*(\d{1,4})\s*[.)\-º°]?\s*$/;

export function isIndexLine(line) {
  return typeof line === 'string' && !isTabLine(line) && INDEX_DASHES_RE.test(line);
}

export function hasMusicContent(body) {
  return body.split('\n').some((l) => isTabLine(l) || isChordLine(l));
}

// Limpia líneas de índice con guiones y separa un .txt con múltiples canciones
// cuando detecta un número solo en su propio renglón.
export function parseMultiImport(raw, fallbackTitle = '') {
  const text = typeof raw === 'string' ? raw.replace(/\r/g, '') : '';
  const allLines = text.split('\n');

  let removedIndexLines = 0;
  const cleanLines = [];
  for (const line of allLines) {
    if (isIndexLine(line)) {
      removedIndexLines += 1;
    } else {
      cleanLines.push(line);
    }
  }

  // Detecta si hay renglones que contienen únicamente un número (ej. "1", "23", "145.").
  const markerIndices = [];
  for (let i = 0; i < cleanLines.length; i++) {
    const m = cleanLines[i].match(STANDALONE_NUMBER_RE);
    if (m) markerIndices.push({ index: i, number: m[1] });
  }

  if (markerIndices.length >= 2) {
    const songs = [];
    for (let k = 0; k < markerIndices.length; k++) {
      const start = markerIndices[k].index + 1;
      const end = k + 1 < markerIndices.length ? markerIndices[k + 1].index : cleanLines.length;
      const num = markerIndices[k].number;

      const chunkLines = cleanLines.slice(start, end);
      let firstNonEmpty = chunkLines.findIndex((l) => l.trim().length > 0);
      if (firstNonEmpty < 0) continue;

      const trimmedChunk = chunkLines.slice(firstNonEmpty);
      const firstLine = trimmedChunk[0].trim();

      let title = `Tema ${num}`;
      let bodyLines = trimmedChunk;

      // Si la primera línea tras el número NO es acordes ni tablatura ni directiva ChordPro,
      // y parece un título (<= 95 caracteres), la usamos como título de la canción.
      const isDirective = /^\s*\{.*\}\s*$/.test(firstLine);
      const firstHasInlineChords = (firstLine.match(/\[[^\]]+\]/g) || []).some((t) =>
        isChord(t.slice(1, -1))
      );
      if (
        !isDirective &&
        !firstHasInlineChords &&
        !isTabLine(firstLine) &&
        !isChordLine(firstLine) &&
        firstLine.length <= 95 &&
        trimmedChunk.length > 1
      ) {
        title = firstLine.replace(/^\d+\s*[.)\-–—]\s*/, '').trim() || `Tema ${num}`;
        bodyLines = trimmedChunk.slice(1);
      }

      const normalized = normalize(bodyLines.join('\n'), title);
      if (!normalized.body || !hasMusicContent(normalized.body)) continue;

      songs.push({
        id: uid(),
        number: num,
        title: normalized.title || `Tema ${num}`,
        body: normalized.body,
      });
    }

    if (songs.length >= 2) {
      return { songs, removedIndexLines };
    }
  }

  // Fallback de 1 sola canción (usa el texto ya limpio de guiones de índice).
  const single = normalize(cleanLines.join('\n'), fallbackTitle);
  if (!single.body || !hasMusicContent(single.body)) {
    return { songs: [], removedIndexLines };
  }
  return {
    songs: [{ id: uid(), number: null, title: single.title, body: single.body }],
    removedIndexLines,
  };
}

// Detecta líneas de tablatura estilo LaCuerda.net / CifraClub:
// cuerdas por nota (e|...|) o número (1|...|..6|...|), repeticiones (|:, :|), técnicas (h/p/r/t/s/b/x/^/~/*/+/.).
const TAB_LINE_RE =
  /^\s*(?:[a-gA-G][#b]?|[1-6])\s*\|[:\-0-9hpHrPtTbBsS\/\\~xX^()v<>*.+=| ]{3,}\|?\s*$/;

export function isTabLine(line) {
  return typeof line === 'string' && TAB_LINE_RE.test(line) && line.includes('-');
}

// Afinación visual de arriba hacia abajo (cuerda más aguda arriba, estándar CifraClub / LaCuerda).
export const TAB_STRINGS = {
  Guitarra: ['e', 'B', 'G', 'D', 'A', 'E'],
  Bajo: ['G', 'D', 'A', 'E'],
  Ukelele: ['A', 'E', 'C', 'G'],
  Charango: ['E', 'A', 'E', 'C', 'G'],
};

// Convierte una grilla [cuerda][paso] en bloque ASCII estilo LaCuerda.net / CifraClub.
export function formatTabGrid(strings, grid, label = '') {
  const cols = grid[0]?.length || 0;
  const colWidths = Array.from({ length: cols }, (_, cIdx) => {
    let w = 1;
    for (let r = 0; r < strings.length; r++) {
      const val = (grid[r]?.[cIdx] || '').trim();
      if (val.length > w) w = val.length;
    }
    return w;
  });

  const rows = strings.map((str, rIdx) => {
    const cells = colWidths.map((w, cIdx) => {
      const val = (grid[rIdx]?.[cIdx] || '').trim();
      if (!val) return '-'.repeat(w + 2);
      const padRight = w - val.length + 1;
      return '-' + val + '-'.repeat(padRight);
    });
    return `${str}|${cells.join('')}|`;
  });

  const cleanLabel = label.trim();
  return cleanLabel ? `[${cleanLabel}]\n${rows.join('\n')}` : rows.join('\n');
}

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Genera las 12 opciones de tono directo en orden cromático (C -> B),
// respetando si la canción original es mayor/menor y su convención de bemoles/sostenidos.
export function buildKeyOptions(originalFirstChord) {
  if (typeof originalFirstChord !== 'string') return null;
  const m = originalFirstChord.match(/^([A-G][#b]?)(m(?!aj)|min|-)?/);
  if (!m) return null;

  const root = m[1];
  const suffix = m[2] ? 'm' : '';
  const useFlat = root.includes('b') || root === 'F';
  const scale = useFlat ? FLAT_NOTES : SHARP_NOTES;
  const baseIndex = Math.max(SHARP_NOTES.indexOf(root), FLAT_NOTES.indexOf(root));
  if (baseIndex < 0) return null;

  return scale.map((note, idx) => {
    const rawDelta = (idx - baseIndex + 12) % 12;
    const semitones = rawDelta > 6 ? rawDelta - 12 : rawDelta;
    return {
      label: note + suffix,
      rawDelta,
      semitones,
      isOriginal: rawDelta === 0,
    };
  });
}

const sanitizeBpm = (val) =>
  typeof val === 'number' && Number.isFinite(val) && val >= 40 && val <= 240
    ? Math.round(val)
    : undefined;
const sanitizeBeats = (val) =>
  typeof val === 'number' && Number.isFinite(val) && val >= 1 && val <= 16
    ? Math.round(val)
    : undefined;
const sanitizeBeatUnit = (val) =>
  typeof val === 'number' && Number.isFinite(val) && val >= 1 && val <= 16
    ? Math.round(val)
    : undefined;
const sanitizePattern = (val, beats) => {
  if (!Array.isArray(val)) return undefined;
  const count = beats ?? val.length;
  if (count < 1 || count > 16) return undefined;
  return Array.from({ length: count }, (_, i) => {
    const x = val[i];
    return x === 0 || x === 1 || x === 2 || x === 3 ? x : i === 0 ? 2 : 1;
  });
};

// Valida un JSON de copia de seguridad ({ groups: [...] } o array directo) y devuelve grupos limpios.
export function parseBackupPayload(rawText) {
  const parsed = safe(rawText, null);
  const candidate = Array.isArray(parsed)
    ? parsed
    : parsed && Array.isArray(parsed.groups)
      ? parsed.groups
      : null;
  if (!candidate) return null;

  const cleaned = candidate
    .filter((g) => g && typeof g.title === 'string' && Array.isArray(g.versions))
    .map((g) => ({
      id: typeof g.id === 'string' && g.id ? g.id : uid(),
      title: g.title.trim() || 'Sin título',
      versions: g.versions
        .filter((v) => v && typeof v.body === 'string' && v.body.trim().length > 0)
        .map((v, idx) => {
          const bpm = sanitizeBpm(v.bpm);
          const beats = sanitizeBeats(v.beats);
          const beatUnit = sanitizeBeatUnit(v.beatUnit);
          const pattern = sanitizePattern(v.pattern, beats);
          return {
            id: typeof v.id === 'string' && v.id ? v.id : uid(),
            name: typeof v.name === 'string' && v.name.trim() ? v.name.trim() : `v${idx + 1}`,
            body: v.body,
            ...(bpm !== undefined ? { bpm } : {}),
            ...(beats !== undefined ? { beats } : {}),
            ...(beatUnit !== undefined ? { beatUnit } : {}),
            ...(pattern !== undefined ? { pattern } : {}),
          };
        }),
    }))
    .filter((g) => g.versions.length > 0);

  return cleaned.length > 0 ? cleaned : null;
}

// Combina canciones de un respaldo con las actuales sin duplicar versiones idénticas.
export function mergeBackupGroups(currentGroups, incomingGroups) {
  const result = currentGroups.map((g) => ({ ...g, versions: [...g.versions] }));

  for (const inc of incomingGroups) {
    const match = result.find((g) => g.title.toLowerCase() === inc.title.toLowerCase());
    if (!match) {
      result.push({
        id: uid(),
        title: inc.title,
        versions: inc.versions.map((v) => ({
          id: uid(),
          name: v.name,
          body: v.body,
          ...(typeof v.bpm === 'number' ? { bpm: v.bpm } : {}),
          ...(typeof v.beats === 'number' ? { beats: v.beats } : {}),
          ...(typeof v.beatUnit === 'number' ? { beatUnit: v.beatUnit } : {}),
          ...(Array.isArray(v.pattern) ? { pattern: v.pattern } : {}),
        })),
      });
      continue;
    }

    for (const v of inc.versions) {
      const sameBody = match.versions.some((ev) => ev.body.trim() === v.body.trim());
      if (sameBody) continue;
      const nameTaken = match.versions.some((ev) => ev.name.toLowerCase() === v.name.toLowerCase());
      match.versions.push({
        id: uid(),
        name: nameTaken ? nextName(match.versions) : v.name,
        body: v.body,
        ...(typeof v.bpm === 'number' ? { bpm: v.bpm } : {}),
        ...(typeof v.beats === 'number' ? { beats: v.beats } : {}),
        ...(typeof v.beatUnit === 'number' ? { beatUnit: v.beatUnit } : {}),
        ...(Array.isArray(v.pattern) ? { pattern: v.pattern } : {}),
      });
    }
  }

  return result;
}
