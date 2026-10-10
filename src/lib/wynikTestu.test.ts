import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PytanieTestu } from './types';
import { podsumuj, polecenia } from './wynikTestu';

const q = (id: string, rodzaj: PytanieTestu['rodzaj']) => ({ id, rodzaj, sciezka: rodzaj === 'wiedza' ? ('a' as const) : ('b' as const), poprawna: 0 });
const PYTANIA = [
  ...['s1', 's2', 's3', 's4', 's5'].map((id) => q(id, 'sylwetka')),
  ...['z1', 'z2', 'z3'].map((id) => q(id, 'zdjecie')),
  ...['g1', 'g2', 'g3'].map((id) => q(id, 'glos')),
  ...['w1', 'w2', 'w3', 'w4'].map((id) => q(id, 'wiedza')),
];
const odpowiedzi = (dobre: string[]) => Object.fromEntries(PYTANIA.map((p) => [p.id, dobre.includes(p.id) ? 0 : 1]));

test('counts per path and per kind; an unanswered question counts as wrong', () => {
  const p = podsumuj(PYTANIA, { ...odpowiedzi(['s1', 's2', 'z1', 'g1', 'w1']), w2: undefined as unknown as number });
  assert.deepEqual(p.razem, { dobrze: 5, z: 15 });
  assert.deepEqual(p.a, { dobrze: 1, z: 4 });
  assert.deepEqual(p.b, { dobrze: 4, z: 11 });
  assert.deepEqual(p.czesci.sylwetka, { dobrze: 2, z: 5 });
});

test('path B starts with the method while the silhouettes are not yet known', () => {
  assert.equal(polecenia(podsumuj(PYTANIA, odpowiedzi(['s1', 's2', 's3', 'z1', 'z2', 'z3', 'g1', 'g2', 'g3']))).b.modul, 'metoda');
});

test('path B goes to species once the silhouettes are known, and to the regions once species are too', () => {
  assert.equal(polecenia(podsumuj(PYTANIA, odpowiedzi(['s1', 's2', 's3', 's4', 'z1']))).b.modul, 'polska');
  assert.equal(polecenia(podsumuj(PYTANIA, odpowiedzi(['s1', 's2', 's3', 's4', 's5', 'z1', 'z2', 'g1', 'g2']))).b.modul, 'gibraltar');
});

test('path A suggests A1 unless most answers were right', () => {
  assert.match(polecenia(podsumuj(PYTANIA, odpowiedzi(['w1', 'w2']))).a.tekst, /Zacznę od A1/);
  assert.match(polecenia(podsumuj(PYTANIA, odpowiedzi(['w1', 'w2', 'w3']))).a.tekst, /znam już dobrze/);
});
