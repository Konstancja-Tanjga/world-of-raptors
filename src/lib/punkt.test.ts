import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { bladSzacunku, czasPrzelotu, ocena, rozklad, type PtakPunktu, type Sesja } from './punkt';
import { STYL_LOTU } from './sylwetki';

const { sesje } = JSON.parse(readFileSync(new URL('../../content/punkt-obserwacyjny.json', import.meta.url), 'utf8')) as {
  sesje: Record<string, Omit<Sesja, 'id'>>;
};
const ptaki = (s: Sesja): Record<string, PtakPunktu> =>
  Object.fromEntries(s.opcje.map((id) => [id, { id, pl: id, rozpietosc: 150, styl: STYL_LOTU[id] ?? 'szybuje' }]));

test('every session sends exactly its birds, and each flock gets across before the end', () => {
  for (const [id, s] of Object.entries(sesje)) {
    const sesja = { id, ...s } as Sesja;
    for (const ziarno of [1, 2, 3]) {
      const p = rozklad(sesja, ptaki(sesja), ziarno);
      for (const g of sesja.gatunki) {
        assert.equal(p.filter((x) => x.gatunek === g.id).reduce((n, x) => n + x.ptaki.length, 0), g.ile, `${id}: ${g.id}`);
      }
      for (const x of p) assert.ok(x.start + czasPrzelotu(x) <= sesja.czas + 1e-9, `${id}: stado ${x.n} nie zdąży przelecieć`);
      assert.deepEqual(p.map((x) => x.n), p.map((_, i) => i));
    }
  }
});

test('the same seed gives the same session', () => {
  const [id, s] = Object.entries(sesje)[0];
  const sesja = { id, ...s } as Sesja;
  assert.deepEqual(rozklad(sesja, ptaki(sesja), 7), rozklad(sesja, ptaki(sesja), 7));
});

test('a count is scored by flock: right, taken for another species, or missed', () => {
  const flock = (n: number, gatunek: string, ile: number) => ({ n, gatunek, start: 0, y: 0, skala: 0, predkosc: 0, kat: 0, ptaki: Array.from({ length: ile }, () => ({ dx: 0, dy: 0, faza: 0 })) });
  const wynik = ocena([flock(0, 'trzmielojad', 10), flock(1, 'trzmielojad', 4), flock(2, 'kania-czarna', 1)], { 0: 'trzmielojad', 1: 'myszolow' });
  assert.equal(wynik.wszystkie, 15);
  assert.equal(wynik.dobrze, 10);
  assert.equal(wynik.przeoczone, 1);
  assert.deepEqual(wynik.wiersze.find((w) => w.gatunek === 'myszolow'), { gatunek: 'myszolow', przelecialo: 0, dobrze: 0, mylnie: 4 });
  assert.equal(bladSzacunku(100, 80), 20);
});
