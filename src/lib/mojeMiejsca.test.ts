import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  aktywne,
  bladMiejsca,
  isMojeMiejsca,
  kluczNazwy,
  najblizszeMoje,
  przemianujWChecklisci,
  ptakiWMiejscu,
  scalMiejsca,
  usunMiejsce,
  zapiszMiejsce,
  type DaneMiejsca,
  type MojeMiejsca,
} from './mojeMiejsca';
import type { Checklista } from './obserwacje';

const T1 = '2026-11-08T10:00:00.000Z';
const T2 = '2026-11-08T11:00:00.000Z';
const LA_JANDA: DaneMiejsca = { nazwa: '  La   Janda ', szer: 36.2193, dl: -5.7831, dokladnosc: 12.6, data: '2026-11-08', notatka: ' przy kanale ' };

test('zapiszMiejsce: tidies the name and note, rounds the accuracy', () => {
  const m = zapiszMiejsce({}, 'a1', LA_JANDA, T1);
  assert.deepEqual(m.a1, { nazwa: 'La Janda', szer: 36.2193, dl: -5.7831, dokladnosc: 13, data: '2026-11-08', notatka: 'przy kanale', zmieniono: T1 });
  assert.ok(isMojeMiejsca(m));
  const bezNotatki = zapiszMiejsce({}, 'a1', { ...LA_JANDA, notatka: '   ', dokladnosc: undefined }, T1);
  assert.equal('notatka' in bezNotatki.a1, false);
  assert.equal('dokladnosc' in bezNotatki.a1, false);
});

test('isMojeMiejsca: refuses bad ids, positions, dates and tombstones', () => {
  const dobre = zapiszMiejsce({}, 'a1', LA_JANDA, T1).a1;
  assert.equal(isMojeMiejsca({ 'Zła nazwa': dobre }), false);
  assert.equal(isMojeMiejsca({ a1: { ...dobre, szer: 91 } }), false);
  assert.equal(isMojeMiejsca({ a1: { ...dobre, data: '8.11.2026' } }), false);
  assert.equal(isMojeMiejsca({ a1: { ...dobre, usuniete: false } }), false);
  assert.equal(isMojeMiejsca([]), false);
});

test('bladMiejsca: a name is needed, once among the places not removed', () => {
  const miejsca = zapiszMiejsce({}, 'a1', LA_JANDA, T1);
  assert.equal(bladMiejsca(miejsca, { ...LA_JANDA, nazwa: '   ' }), 'Wpisz nazwę miejsca.');
  assert.equal(bladMiejsca(miejsca, { ...LA_JANDA, nazwa: 'la janda' }), 'Masz już miejsce o tej nazwie.');
  // Editing the place itself keeps its name.
  assert.equal(bladMiejsca(miejsca, LA_JANDA, 'a1'), null);
  // A removed place frees its name.
  assert.equal(bladMiejsca(usunMiejsce(miejsca, 'a1', T2), LA_JANDA), null);
  assert.match(bladMiejsca({}, { ...LA_JANDA, nazwa: 'x'.repeat(81) }) ?? '', /80 znaków/);
  assert.equal(bladMiejsca({}, { ...LA_JANDA, data: '' }), 'Wpisz datę pierwszej wizyty.');
});

test('usunMiejsce: a tombstone that keeps its fields, left out of aktywne', () => {
  const miejsca = usunMiejsce(zapiszMiejsce({}, 'a1', LA_JANDA, T1), 'a1', T2);
  assert.equal(miejsca.a1.usuniete, true);
  assert.equal(miejsca.a1.zmieniono, T2);
  assert.equal(miejsca.a1.nazwa, 'La Janda');
  assert.deepEqual(aktywne(miejsca), []);
  const puste: MojeMiejsca = {};
  assert.equal(usunMiejsce(puste, 'nie-ma', T2), puste);
});

test('aktywne: sorted by name, Polish order', () => {
  let m: MojeMiejsca = {};
  for (const [id, nazwa] of [['a', 'Żuławy'], ['b', 'Biebrza'], ['c', 'Łąki pod lasem']] as const) {
    m = zapiszMiejsce(m, id, { ...LA_JANDA, nazwa }, T1);
  }
  assert.deepEqual(
    aktywne(m).map(([, x]) => x.nazwa),
    ['Biebrza', 'Łąki pod lasem', 'Żuławy'],
  );
});

test('scalMiejsca: the newer change wins entry by entry', () => {
  const tutaj = zapiszMiejsce(zapiszMiejsce({}, 'a1', LA_JANDA, T2), 'b1', { ...LA_JANDA, nazwa: 'Barbate' }, T1);
  const zPliku = zapiszMiejsce(zapiszMiejsce({}, 'a1', { ...LA_JANDA, nazwa: 'Stara nazwa' }, T1), 'b1', { ...LA_JANDA, nazwa: 'Barbate, salinas' }, T2);
  const wynik = scalMiejsca(tutaj, { ...zPliku, c1: zapiszMiejsce({}, 'c1', { ...LA_JANDA, nazwa: 'Bolonia' }, T1).c1 });
  assert.equal(wynik.a1.nazwa, 'La Janda');
  assert.equal(wynik.b1.nazwa, 'Barbate, salinas');
  assert.equal(wynik.c1.nazwa, 'Bolonia');
});

const LISTA: Checklista = {
  kaniuk: { widziany: true, miejsce: 'la janda', zmieniono: T1 },
  'blotniak-zbozowy': { widziany: true, miejsce: ' La Janda ', zmieniono: T1 },
  'uszatka-blotna': { widziany: false, miejsce: 'La Janda', zmieniono: T1 },
  pustulka: { widziany: true, miejsce: 'Tarifa', zmieniono: T1 },
  myszolow: { widziany: true, zmieniono: T1 },
};

test('ptakiWMiejscu: ticked observations whose place is the name, any case or spacing', () => {
  assert.equal(kluczNazwy('  La   JANDA '), 'la janda');
  assert.deepEqual(ptakiWMiejscu(LISTA, 'La Janda').sort(), ['blotniak-zbozowy', 'kaniuk']);
  assert.deepEqual(ptakiWMiejscu(LISTA, 'Biebrza'), []);
});

test('przemianujWChecklisci: renames every observation of the place, unticked ones too', () => {
  const po = przemianujWChecklisci(LISTA, 'La Janda', 'Laguna de la Janda', T2);
  assert.equal(po.kaniuk.miejsce, 'Laguna de la Janda');
  assert.equal(po.kaniuk.zmieniono, T2);
  assert.equal(po['uszatka-blotna'].miejsce, 'Laguna de la Janda');
  assert.equal(po.pustulka, LISTA.pustulka);
  // Nothing to rename: the same object, so nothing is saved.
  assert.equal(przemianujWChecklisci(LISTA, 'Biebrza', 'Biebrza Dolna', T2), LISTA);
  assert.equal(przemianujWChecklisci(LISTA, 'La Janda', 'La Janda', T2), LISTA);
});

test('najblizszeMoje: the nearest place not removed, within the distance', () => {
  let m = zapiszMiejsce({}, 'janda', LA_JANDA, T1);
  m = zapiszMiejsce(m, 'barbate', { ...LA_JANDA, nazwa: 'Barbate', szer: 36.1729, dl: -5.8944 }, T1);
  const obokJandy = { szer: 36.225, dl: -5.78 };
  assert.equal(najblizszeMoje(m, obokJandy, 2)?.id, 'janda');
  assert.equal(najblizszeMoje(m, { szer: 52.23, dl: 21.01 }, 2), null);
  assert.equal(najblizszeMoje(usunMiejsce(m, 'janda', T2), obokJandy, 2), null);
});
