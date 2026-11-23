import assert from 'node:assert';
import { voicing, parseChord, INSTRUMENTS } from './chords.js';

const show = (n, i) => voicing(n, i)?.frets.map((f) => (f < 0 ? 'x' : f)).join('');
const cases = [['C', 'Guitarra', 'x32010'], ['Am', 'Guitarra', 'x02210'], ['G', 'Ukelele', '0232'], ['C', 'Ukelele', '0003'], ['Em', 'Guitarra', '022000'], ['D', 'Guitarra', 'xx0232']];
for (const [n, i, want] of cases) console.log(i, n, show(n, i), show(n, i) === want ? 'ok' : `(esperado ${want})`);

// Invariante: todo acorde de todo instrumento sale con digitación, y solo suena notas del acorde.
for (const inst of Object.keys(INSTRUMENTS))
  for (const root of ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])
    for (const q of ['', 'm', '7', 'maj7', 'm7', 'sus4', 'dim', 'aug']) {
      const v = voicing(root + q, inst), c = parseChord(root + q);
      assert.ok(v, `${inst} ${root + q} sin digitación`);
      v.frets.forEach((f, s) => f >= 0 && assert.ok(c.tones.includes((INSTRUMENTS[inst].tuning[s] + f) % 12), `${inst} ${root + q} nota ajena`));
    }
assert.equal(parseChord('Am7/G').bass, 7);
assert.equal(parseChord('Xyz'), null);
console.log('chords ok');
