import assert from 'node:assert';
import { transposeChord as t, parseLine } from './transpose.js';

assert.equal(t('C', 2), 'D');
assert.equal(t('Am7', 3), 'Cm7');
assert.equal(t('B', 1), 'C');
assert.equal(t('C', -1), 'B');
assert.equal(t('Bb/D', 2), 'C/E');
assert.equal(t('F#m', 1), 'Gm');
assert.equal(t('Gsus4', 12), 'Gsus4');
assert.equal(t('Dm', -3), 'Bm');
assert.deepEqual(parseLine('Hola [Am]mundo', 2), { chords: '     Bm', lyrics: 'Hola mundo' });
console.log('ok');

import { isChordLine, transposeChordLine } from './transpose.js';
assert.ok(isChordLine('  Am   F    C/E  G'));
assert.ok(!isChordLine('Dame tu mano'));
assert.ok(!isChordLine(''));
assert.equal(transposeChordLine('Am   F   G', 2), 'Bm   G   A');
assert.equal(transposeChordLine('C   D   E', 1), 'C#  D#  F');
assert.equal(transposeChordLine('C#  D', -1), 'C   C#');
console.log('ok2');
assert.ok(isChordLine('[Intro] C  G  Am'));
assert.ok(isChordLine('Am  N.C.  G'));
assert.ok(isChordLine('A7/13  E7/9'));
assert.ok(!isChordLine('Final'));
console.log('ok3');
