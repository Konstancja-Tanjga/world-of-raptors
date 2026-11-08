import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  KATEGORIE,
  liczebnosc,
  najwyzszaKategoria,
  NIE_LICZE,
  ocena,
  odpowiedziKlucza,
  poziom,
  problemySesji,
  rewiry,
  zgodnoscRewiru,
  type Kategoria,
  type Notatka,
  type Odpowiedz,
  type SesjaKarty,
} from './rewiry';

const notatka = (id: string, gatunek: string, kategoria: Kategoria, rewir: string | null): Notatka => ({
  id,
  gatunek,
  punkt: 1,
  data: '25 IV',
  godzina: '10:00',
  opis: 'opis',
  x: 5,
  y: 5,
  klucz: { kategoria, rewir, wyjasnienie: 'bo tak' },
});

// Two lesser spotted eagle territories (one certain, one probable), a buzzard, and a passing bird.
const NOTATKI = [
  notatka('1', 'orlik-krzykliwy', 'P', 'o1'),
  notatka('2', 'orlik-krzykliwy', 'tB', 'o2'),
  notatka('3', 'orlik-krzykliwy', 'B', 'o2'),
  notatka('4', 'orlik-krzykliwy', NIE_LICZE, null),
  notatka('5', 'myszolow', 'B', 'm1'),
  notatka('6', 'orlik-krzykliwy', 'B', 'o1'),
];

test('categories run from traces to a nest with young, the first three probable', () => {
  assert.deepEqual(
    KATEGORIE.map((k) => k.kod),
    ['T', 'B', 'tB', 'P', 'F', 'ON', 'ONB', 'ONtB', 'ONP', 'ONi', 'ONe', 'ONy'],
  );
  assert.equal(poziom('tB'), 'prawdopodobne');
  assert.equal(poziom('P'), 'pewne');
  assert.equal(poziom('ON'), 'pewne');
});

test('a territory is counted by its highest category', () => {
  assert.equal(najwyzszaKategoria(['B', 'P', 'tB']), 'P');
  assert.equal(najwyzszaKategoria(['B', 'tB']), 'tB');
  assert.equal(najwyzszaKategoria(['ONB', 'F']), 'ONB');
  assert.equal(najwyzszaKategoria([]), null);
});

test('the key adds up to territories, and the count is a range from certain to all', () => {
  const r = rewiry(NOTATKI, odpowiedziKlucza(NOTATKI));
  assert.deepEqual(
    r.map((x) => [x.id, x.kategoria, x.notatki]),
    [
      ['o1', 'P', ['1', '6']],
      ['o2', 'tB', ['2', '3']],
      ['m1', 'B', ['5']],
    ],
  );
  assert.deepEqual(liczebnosc(r, 'orlik-krzykliwy'), { min: 1, max: 2 });
  assert.deepEqual(liczebnosc(r, 'myszolow'), { min: 0, max: 1 });
  assert.deepEqual(liczebnosc(r), { min: 1, max: 3 });
  assert.deepEqual(liczebnosc([], 'bielik'), { min: 0, max: 0 });
});

test('a sheet that matches the key scores full marks', () => {
  const o = ocena(NOTATKI, odpowiedziKlucza(NOTATKI));
  assert.deepEqual(o.kategorie, { dobrze: 6, wszystkie: 6 });
  assert.equal(o.polaczone, 0);
  assert.equal(o.rozdzielone, 0);
  for (const g of o.gatunki) assert.deepEqual(g.twoja, g.klucz);
});

test('two males taken for a pair raise the lower bound, and one territory written twice raises the upper', () => {
  const odp: Odpowiedz[] = [
    { kategoria: 'P', rewir: 'a' },
    { kategoria: 'P', rewir: 'b' }, // tB read as a pair
    { kategoria: 'B', rewir: 'c' }, // the same territory as note 2, written as a new one
    { kategoria: NIE_LICZE, rewir: null },
    { kategoria: 'B', rewir: 'd' },
    { kategoria: 'B', rewir: 'a' },
  ];
  const o = ocena(NOTATKI, odp);
  assert.equal(o.kategorie.dobrze, 5);
  assert.equal(o.rozdzielone, 1);
  assert.equal(o.polaczone, 0);
  const orlik = o.gatunki.find((g) => g.gatunek === 'orlik-krzykliwy')!;
  assert.deepEqual(orlik.twoja, { min: 2, max: 3 });
  assert.deepEqual(orlik.klucz, { min: 1, max: 2 });
});

test('a passing bird counted as a territory adds to the upper bound but not to the pairs judged', () => {
  const odp = odpowiedziKlucza(NOTATKI).map((x, i) => (i === 3 ? { kategoria: 'B' as const, rewir: 'nowy' } : x));
  const o = ocena(NOTATKI, odp);
  assert.equal(o.kategorie.dobrze, 5);
  assert.equal(o.polaczone, 0);
  assert.deepEqual(o.gatunki.find((g) => g.gatunek === 'orlik-krzykliwy')!.twoja, { min: 1, max: 3 });
});

test('merging two territories is counted per pair of notes', () => {
  const odp: Odpowiedz[] = NOTATKI.map((n) => ({ kategoria: n.klucz.kategoria, rewir: n.klucz.rewir === null ? null : n.gatunek }));
  const o = ocena(NOTATKI, odp);
  // Notes 1 and 6 (o1) each sit with 2 and 3 (o2): four wrong pairs.
  assert.equal(o.polaczone, 4);
  assert.equal(o.rozdzielone, 0);
});

test('each answer is judged against the reader’s own earlier territories', () => {
  const klucz = odpowiedziKlucza(NOTATKI);
  assert.equal(zgodnoscRewiru(NOTATKI, klucz, 0), 'dobrze');
  assert.equal(zgodnoscRewiru(NOTATKI, klucz, 2), 'dobrze');
  assert.equal(zgodnoscRewiru(NOTATKI, klucz, 3), null);
  // Note 3 put with note 1: two territories made one.
  assert.equal(zgodnoscRewiru(NOTATKI, [klucz[0], klucz[1], { kategoria: 'B', rewir: 'o1' }], 2), 'polaczony');
  // Note 3 made a new territory, though note 2 already stood for it.
  assert.equal(zgodnoscRewiru(NOTATKI, [klucz[0], klucz[1], { kategoria: 'B', rewir: 'nowy' }], 2), 'rozdzielony');
  // If note 2 was written off as X, a new territory for note 3 is right.
  assert.equal(zgodnoscRewiru(NOTATKI, [klucz[0], { kategoria: NIE_LICZE, rewir: null }, { kategoria: 'B', rewir: 'nowy' }], 2), 'dobrze');
  // Answers not given yet are left out.
  assert.deepEqual(rewiry(NOTATKI, [klucz[0]]).map((r) => r.id), ['o1']);
});

test('a malformed session is caught', () => {
  const sesja: SesjaKarty = { id: 's', tytul: 't', miejsce: 'm', opis: 'o', punkty: [{ x: 2, y: 2 }], teren: [], notatki: NOTATKI };
  assert.deepEqual(problemySesji(sesja), []);
  const zle: SesjaKarty = {
    ...sesja,
    notatki: [
      notatka('1', 'orlik-krzykliwy', 'P', null),
      { ...notatka('1', 'myszolow', 'Q' as Kategoria, 'o1'), punkt: 3, x: 12 },
      notatka('3', 'myszolow', NIE_LICZE, 'm1'),
      notatka('4', 'bielik', 'B', 'o1'),
      notatka('5', 'orlik-krzykliwy', 'B', 'o1'),
    ],
  };
  const bledy = problemySesji(zle).join('\n');
  for (const fragment of ['id się powtarza', 'punkt 3', 'poza powierzchnią', 'nieznana kategoria', 'X nie ma rewiru', 'ma już gatunek']) {
    assert.ok(bledy.includes(fragment), fragment);
  }
});

test('the course’s own sessions are well formed and add up to what the lesson says', () => {
  const plik = JSON.parse(readFileSync(new URL('../../content/karta-rewirow.json', import.meta.url), 'utf8')) as { sesje: Record<string, Omit<SesjaKarty, 'id'>> };
  for (const [id, s] of Object.entries(plik.sesje)) assert.deepEqual(problemySesji({ id, ...s }), [], id);
  const s = plik.sesje.pomorze;
  const r = rewiry(s.notatki, odpowiedziKlucza(s.notatki));
  // 05-cwiczenia.md gives this total in its answers.
  assert.deepEqual(liczebnosc(r), { min: 4, max: 7 });
});
