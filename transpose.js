const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Transpone un acorde ("Am7", "Bb/D", "F#m") n semitonos. Mantiene bemoles si el original los usaba.
export function transposeChord(chord, n) {
  return chord.replace(/(^|\/)([A-G][#b]?)/g, (_, pre, note) => {
    const i = Math.max(SHARP.indexOf(note), FLAT.indexOf(note));
    const j = (((i + n) % 12) + 12) % 12;
    return pre + ((note.includes('b') || note === 'F' ? FLAT : SHARP)[j]);
  });
}

const CHORD = /^[A-G][#b]?(m|M|maj|min|dim|aug|sus|add|º|°|\+|-|\d|#|b|\(|\))*(\/([A-G][#b]?|\d+))?$/;
const NOISE = /^([|x\d()\-\/.:]+|\[[^\]]*\]|N\.?C\.?|(intro|solo|puente|coro|pre-?coro|estribillo|verso|estrofa|riff|final|outro|chorus|verse|bridge|pre-?chorus|interlude|instrumental|coda)\W*)$/i; // "|", "x2", etc. dentro de una línea de acordes

// ¿La línea es solo acordes? (formato "acordes arriba de la letra" de lacuerda/cifraclub)
export const isChord = (t) => CHORD.test(t);

export function isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  return toks.some((t) => CHORD.test(t)) && toks.every((t) => CHORD.test(t) || NOISE.test(t));
}

// Transpone una línea de acordes conservando la alineación con la letra.
export function transposeChordLine(line, n) {
  return line.replace(/(\S+)(\s*)/g, (_, tok, sp) => {
    const out = CHORD.test(tok) ? transposeChord(tok, n) : tok;
    const d = out.length - tok.length;
    return out + (d > 0 && sp ? ' '.repeat(Math.max(1, sp.length - d)) : sp + ' '.repeat(Math.max(0, -d)));
  });
}

// Línea ChordPro "Hola [Am]mundo" -> { chords: "     Am", lyrics: "Hola mundo" } (alineado en monoespaciada)
export function parseLine(line, n = 0) {
  let chords = '', lyrics = '';
  for (const part of line.split(/(\[[^\]]+\])/)) {
    const m = part.match(/^\[([^\]]+)\]$/);
    if (m) {
      chords = chords.padEnd(lyrics.length, ' ') + transposeChord(m[1], n) + ' ';
    } else lyrics += part;
  }
  return { chords: chords.trimEnd(), lyrics };
}
