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
        .filter(isChordLine)
        .flatMap((l) => transposeChordLine(l, semitones).trim().split(/\s+/))
        .filter(isChord)
    ),
  ];
}

export function getFirstLyricSnippet(body) {
  const line = body
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !isChordLine(l));
  return line || '';
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
        .map((v, idx) => ({
          id: typeof v.id === 'string' && v.id ? v.id : uid(),
          name: typeof v.name === 'string' && v.name.trim() ? v.name.trim() : `v${idx + 1}`,
          body: v.body,
        })),
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
        versions: inc.versions.map((v) => ({ id: uid(), name: v.name, body: v.body })),
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
      });
    }
  }

  return result;
}
