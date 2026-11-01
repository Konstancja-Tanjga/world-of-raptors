import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dopasuj, najlepsze, wielkosci, type CechyRozpoznania } from './rozpoznawanie';

// The reference birds of content/miarka.json, out of order on purpose.
const SKALA = wielkosci([
  { id: 'wrona', pl: 'Wrona siwa', dlugosc_cm: [44, 51] },
  { id: 'wrobel', pl: 'Wróbel', dlugosc_cm: [14, 16] },
  { id: 'golab', pl: 'Gołąb miejski', dlugosc_cm: [31, 34] },
  { id: 'mewa', pl: 'Mewa srebrzysta', dlugosc_cm: [54, 60] },
  { id: 'bocian', pl: 'Bocian biały', dlugosc_cm: [100, 115] },
]);

const PUSTULKA: CechyRozpoznania = {
  id: 'pustulka',
  regiony: ['gibraltar', 'poludnie-hiszpanii', 'polska'],
  dlugosc_cm: [31, 37],
  kolory: ['rudy', 'szary', 'brazowy', 'czarny'],
  zachowania: ['zawisa', 'slup'],
};
const MYSZOLOW: CechyRozpoznania = {
  id: 'myszolow',
  regiony: ['gibraltar', 'poludnie-hiszpanii', 'polska'],
  dlugosc_cm: [48, 56],
  kolory: ['brazowy', 'bialy'],
  zachowania: ['krazy', 'zawisa', 'slup', 'ziemia'],
};
const SEP: CechyRozpoznania = {
  id: 'sep-plowy',
  regiony: ['gibraltar', 'poludnie-hiszpanii'],
  dlugosc_cm: [95, 110],
  kolory: ['plowy', 'brazowy', 'czarny', 'bialy'],
  zachowania: ['krazy', 'ziemia', 'slup'],
};
const WSZYSTKIE = [SEP, MYSZOLOW, PUSTULKA];

test('wielkosci: smallest first, each reaching halfway to its neighbours', () => {
  assert.deepEqual(
    SKALA.map((w) => w.id),
    ['wrobel', 'golab', 'wrona', 'mewa', 'bocian'],
  );
  assert.equal(SKALA[0].od, 0);
  assert.equal(SKALA[0].do, 23.75);
  assert.equal(SKALA[1].od, 23.75);
  assert.equal(SKALA[1].do, 40);
  assert.equal(SKALA[4].do, Infinity);
});

test('dopasuj: nothing answered keeps every species, in the given order', () => {
  const w = dopasuj(WSZYSTKIE, {}, SKALA);
  assert.deepEqual(
    w.map((d) => [d.gatunek.id, d.wynik]),
    [
      ['sep-plowy', 1],
      ['myszolow', 1],
      ['pustulka', 1],
    ],
  );
});

test('dopasuj: a region rules species out', () => {
  assert.deepEqual(
    dopasuj(WSZYSTKIE, { region: 'polska' }, SKALA).map((d) => d.gatunek.id),
    ['myszolow', 'pustulka'],
  );
});

test('dopasuj: the chosen size fits, a neighbouring one is close, a far one scores nothing', () => {
  const w = dopasuj(WSZYSTKIE, { wielkosc: 'golab' }, SKALA);
  assert.deepEqual(
    w.map((d) => [d.gatunek.id, d.wielkosc, d.wynik]),
    [
      ['pustulka', 'pasuje', 1],
      ['myszolow', 'blisko', 0.5],
    ],
  );
});

test('dopasuj: colours score the share shown; steps average', () => {
  const w = dopasuj(WSZYSTKIE, { kolory: ['rudy', 'szary', 'bialy'], zachowanie: 'zawisa' }, SKALA);
  const pustulka = w.find((d) => d.gatunek.id === 'pustulka')!;
  assert.deepEqual(pustulka.kolory, { trafione: 2, z: 3 });
  assert.equal(pustulka.zachowanie, 'pasuje');
  assert.equal(pustulka.wynik, (2 / 3 + 1) / 2);
  assert.equal(w[0].gatunek.id, 'pustulka');
  const sep = w.find((d) => d.gatunek.id === 'sep-plowy')!;
  assert.equal(sep.zachowanie, 'nie');
  assert.equal(sep.wynik, 1 / 3 / 2);
});

test('najlepsze: the matches near the top score first, the rest apart', () => {
  const w = dopasuj(WSZYSTKIE, { wielkosc: 'golab', zachowanie: 'zawisa' }, SKALA);
  const { najlepsze: n, reszta } = najlepsze(w);
  assert.deepEqual(
    n.map((d) => d.gatunek.id),
    ['pustulka'],
  );
  assert.deepEqual(
    reszta.map((d) => d.gatunek.id),
    ['myszolow'],
  );
  assert.deepEqual(najlepsze([]), { najlepsze: [], reszta: [] });
});

test('dopasuj: a kind of behaviour matches any behaviour of that kind', () => {
  const siedzi = dopasuj(WSZYSTKIE, { rodzaj: 'siedzi' }, SKALA);
  assert.equal(siedzi.length, 3);
  const nocA = dopasuj(WSZYSTKIE, { rodzaj: 'noc' }, SKALA);
  assert.equal(nocA.length, 0);
  // The behaviour itself, when given, wins over its kind.
  const zawisa = dopasuj(WSZYSTKIE, { rodzaj: 'lot', zachowanie: 'zawisa' }, SKALA);
  assert.deepEqual(
    zawisa.map((d) => d.gatunek.id),
    ['myszolow', 'pustulka'],
  );
});
