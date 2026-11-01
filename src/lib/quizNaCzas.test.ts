import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OPCJI, opcjePytania, punktyZaOdpowiedz, rundaQuizu, type GatunekQuizu } from './quizNaCzas';
import { losZZiarna } from './stado';

const pula: GatunekQuizu[] = [
  { id: 'biegus-zmienny', pl: 'biegus zmienny', mylona_z: ['biegus-krzywodzioby'], zdjecia: 3 },
  { id: 'biegus-krzywodzioby', pl: 'biegus krzywodzioby', mylona_z: ['biegus-zmienny'], zdjecia: 2 },
  { id: 'krwawodziob', pl: 'krwawodziób', mylona_z: ['brodziec-sniady'], zdjecia: 2 },
  { id: 'brodziec-sniady', pl: 'brodziec śniady', mylona_z: ['krwawodziob'], zdjecia: 3 },
  { id: 'czajka', pl: 'czajka', mylona_z: [], zdjecia: 2 },
  { id: 'kulon', pl: 'kulon', mylona_z: [], zdjecia: 0 },
];

test('the options are four different ids with the right one and its look-alike among them', () => {
  for (let z = 1; z < 30; z++) {
    const opcje = opcjePytania('biegus-zmienny', pula, losZZiarna(z));
    assert.equal(opcje.length, OPCJI);
    assert.equal(new Set(opcje).size, OPCJI);
    assert.ok(opcje.includes('biegus-zmienny'));
    assert.ok(opcje.includes('biegus-krzywodzioby'));
  }
});

test('a look-alike outside the pool is never offered, and a small pool offers what it has', () => {
  const z = pula.map((g) => (g.id === 'czajka' ? { ...g, mylona_z: ['nie-w-puli', 'biegus-zmienny'] } : g));
  for (let s = 1; s < 30; s++) {
    const o = opcjePytania('czajka', z, losZZiarna(s));
    assert.ok(o.every((id) => z.some((g) => g.id === id)));
    assert.ok(o.includes('biegus-zmienny'));
    assert.equal(new Set(o).size, OPCJI);
  }
  const mala = pula.slice(0, 2);
  assert.deepEqual([...opcjePytania('biegus-zmienny', mala, losZZiarna(3))].sort(), ['biegus-krzywodzioby', 'biegus-zmienny']);
});

test('a round asks each species with photos once, and never one without', () => {
  const runda = rundaQuizu(pula, losZZiarna(5));
  assert.equal(runda.length, 5);
  assert.equal(new Set(runda.map((p) => p.id)).size, 5);
  assert.ok(!runda.some((p) => p.id === 'kulon'));
  for (const p of runda) assert.ok(p.zdjecie < pula.find((g) => g.id === p.id)!.zdjecia);
});

test('a species answered wrong is drawn first more often', () => {
  let pierwszy = 0;
  for (let z = 1; z <= 300; z++) if (rundaQuizu(pula, losZZiarna(z), { czajka: 3 }, 1)[0].id === 'czajka') pierwszy++;
  // Weight 7 against 1 for each of the four others: about 7/11 of the time.
  assert.ok(pierwszy > 150, `czajka first ${pierwszy} times out of 300`);
});

test('a right answer earns 100 and up to 50 more for speed; a wrong one nothing', () => {
  assert.equal(punktyZaOdpowiedz(false, 9), 0);
  assert.equal(punktyZaOdpowiedz(true, null), 100);
  assert.equal(punktyZaOdpowiedz(true, 10), 150);
  assert.equal(punktyZaOdpowiedz(true, 5), 125);
  assert.equal(punktyZaOdpowiedz(true, 0), 100);
  assert.equal(punktyZaOdpowiedz(true, 15), 150);
  assert.equal(punktyZaOdpowiedz(true, -2), 100);
});
