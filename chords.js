// Diagramas de acordes calculados (sin tabla a mano): busca digitaciones válidas según la afinación del instrumento.
// Notas como semitonos: C=0 ... B=11. Cuerdas de la más grave a la más aguda.
export const INSTRUMENTS = {
  Guitarra: { tuning: [4, 9, 2, 7, 11, 4], mutes: true },
  Bajo: { tuning: [4, 9, 2, 7], mutes: true, light: true },
  Ukelele: { tuning: [7, 0, 4, 9], mutes: false }, // ponytail: afinación re-entrante (sol agudo)
  Charango: { tuning: [7, 0, 4, 9, 4], mutes: false }, // ponytail: 5 órdenes, sin dobles cuerdas ni octavas
};

const ROOT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pc = (n) => (ROOT[n[0]] + (n[1] === '#' ? 1 : n[1] === 'b' ? -1 : 0) + 12) % 12;

// "Am7/G" -> { root: 9, tones: [9,0,4,7], bass: 7 }
export function parseChord(name) {
  const m = name.match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
  if (!m) return null;
  const q = m[2], root = pc(m[1]);
  let third = /^(m(?!aj)|min|-)/.test(q) || /^dim|^º|^°/.test(q) ? 3 : 4;
  if (/^sus2/.test(q)) third = 2;
  if (/^sus/.test(q) && !/^sus2/.test(q)) third = 5;
  let fifth = /dim|º|°|b5/.test(q) ? 6 : /aug|\+|#5/.test(q) ? 8 : 7;
  const tones = [0, third, fifth];
  if (/dim|º|°/.test(q) && /7/.test(q)) tones.push(9);
  else if (/maj7|7M|M7/.test(q)) tones.push(11);
  else if (/7|9/.test(q)) tones.push(10);
  if (/6/.test(q)) tones.push(9);
  if (/9/.test(q)) tones.push(2);
  return { root, tones: [...new Set(tones)].map((t) => (t + root) % 12), bass: m[3] ? pc(m[3]) : root, fifth: (fifth + root) % 12 };
}

const cache = {};
// Devuelve { frets: [-1 = no tocar, 0 = al aire, n], base } para la cuerda más grave -> aguda, o null.
export function voicing(name, inst) {
  const key = inst + name;
  if (key in cache) return cache[key];
  const c = parseChord(name), { tuning, mutes, light } = INSTRUMENTS[inst];
  if (!c) return (cache[key] = null);
  // Triadas o menos: todas las notas. Con 7ª/9ª, la quinta es opcional. Bajo: raíz + tercera.
  const need = light ? c.tones.slice(0, 2) : c.tones.length > 3 ? c.tones.filter((t) => t !== c.fifth) : c.tones;
  let best = null, bestScore = Infinity;
  for (const maxF of [4, 6]) { // primero con 4 dedos; si no hay, se relaja (charango)
  if (best) break;
  for (let base = 0; base <= 9; base++) {
    const opts = tuning.map((open) => {
      const o = mutes ? [-1] : [];
      if (base === 0) o.push(0);
      for (let f = Math.max(base, 1); f <= base + 3 + (base === 0 ? 1 : 0); f++) o.push(f);
      return o;
    });
    const cur = [];
    const walk = (i) => {
      if (i < tuning.length) { for (const f of opts[i]) { cur[i] = f; walk(i + 1); } return; }
      const idx = cur.map((f, s) => (f < 0 ? -1 : s)).filter((s) => s >= 0);
      if (idx.length < (light ? 2 : Math.min(3, tuning.length))) return;
      if (!light && cur.slice(idx[0]).some((f) => f < 0)) return; // solo se silencian las graves iniciales
      const notes = cur.map((f, s) => (f < 0 ? -1 : (tuning[s] + f) % 12));
      const sounded = notes.filter((n) => n >= 0);
      if (!sounded.every((n) => c.tones.includes(n)) || !need.every((n) => sounded.includes(n))) return;
      if (mutes && notes[idx[0]] !== c.bass) return; // la nota más grave es la raíz (o el bajo de la barra)
      const fretted = cur.map((f, s) => [f, s]).filter(([f]) => f > 0);
      const minF = Math.min(...fretted.map(([f]) => f), Infinity);
      const atMin = fretted.filter(([f]) => f === minF).map(([, s]) => s);
      let fingers = fretted.length;
      if (atMin.length > 1 && cur.slice(atMin[0], atMin[atMin.length - 1] + 1).every((f) => f >= minF)) fingers -= atMin.length - 1;
      if (fingers > maxF) return;
      const score = base * 3 + fingers * 2 + cur.filter((f) => f < 0).length * 2 + (sounded.includes(c.fifth) || c.tones.length < 4 ? 0 : 1);
      if (score < bestScore) { bestScore = score; best = { frets: [...cur], base: base === 0 ? 1 : base }; }
    };
    walk(0);
  }
  }
  return (cache[key] = best);
}
