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

test('najlepsze: a score exactly 0.25 below the top goes to the rest, thirds included', () => {
  // Gołąb and one colour: the buzzard is a neighbouring size (0.5 + 1/3), the vulture a far one (0 + 1/3).
  const w = dopasuj([SEP, MYSZOLOW], { wielkosc: 'golab', kolory: ['brazowy'] }, SKALA);
  const sep = w.find((d) => d.gatunek.id === 'sep-plowy')!;
  assert.equal(sep.wielkosc, 'nie');
  assert.deepEqual(
    najlepsze(w).reszta.map((d) => d.gatunek.id),
    ['sep-plowy'],
  );
});

test('dopasuj: colours ticked and unticked again count as skipped', () => {
  const w = dopasuj(WSZYSTKIE, { kolory: [] }, SKALA);
  assert.equal(w.length, 3);
  assert.ok(w.every((d) => d.wynik === 1 && d.kolory === undefined));
});

test('dopasuj: the largest and smallest sizes have one neighbour each', () => {
  const duzy = dopasuj(WSZYSTKIE, { wielkosc: 'bocian' }, SKALA);
  assert.deepEqual(
    duzy.map((d) => [d.gatunek.id, d.wielkosc]),
    [
      ['sep-plowy', 'pasuje'],
      ['myszolow', 'blisko'],
    ],
  );
  const maly = dopasuj(WSZYSTKIE, { wielkosc: 'wrobel' }, SKALA);
  assert.deepEqual(
    maly.map((d) => [d.gatunek.id, d.wielkosc]),
    [['pustulka', 'blisko']],
  );
});

test('dopasuj: a size band includes its lower edge, a species its whole range', () => {
  const na = (dlugosc_cm: [number, number]): CechyRozpoznania => ({ ...PUSTULKA, id: dlugosc_cm.join('-'), dlugosc_cm });
  // Gołąb runs to 40, wrona from 40.
  const [doGranicy] = dopasuj([na([35, 40])], { wielkosc: 'wrona' }, SKALA);
  assert.equal(doGranicy.wielkosc, 'pasuje');
  const [odGranicy] = dopasuj([na([40, 45])], { wielkosc: 'golab' }, SKALA);
  assert.equal(odGranicy.wielkosc, 'blisko');
});

test('dopasuj: an unknown size is a skipped step; the night keeps owls', () => {
  assert.deepEqual(dopasuj(WSZYSTKIE, { wielkosc: 'nie-ma' }, SKALA), dopasuj(WSZYSTKIE, {}, SKALA));
  const SOWA: CechyRozpoznania = { ...PUSTULKA, id: 'puszczyk', zachowania: ['noc', 'slup'] };
  assert.deepEqual(
    dopasuj([...WSZYSTKIE, SOWA], { rodzaj: 'noc' }, SKALA).map((d) => d.gatunek.id),
    ['puszczyk'],
  );
});
