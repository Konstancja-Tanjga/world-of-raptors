import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dopisz, PROG_PEWNOSCI, wKursie, wygladz, wykryte, type Wynik } from './glos';

const wynik = (index: number, confidence: number, geoscore = 1): Wynik => ({
  index,
  scientificName: `Gatunek ${index}`,
  commonNameI18n: `ptak ${index}`,
  confidence,
  geoscore,
});

test('one window passes through unsmoothed', () => {
  assert.deepEqual(wygladz([[wynik(0, 0.7)]]), [wynik(0, 0.7)]);
  assert.deepEqual(wygladz([]), []);
});

test('a call heard in two windows of five stays above the threshold, a single click sinks', () => {
  const cisza = [wynik(0, 0.01), wynik(1, 0.01)];
  const okna = [
    [wynik(0, 0.9), wynik(1, 0.3)],
    cisza,
    [wynik(0, 0.9), wynik(1, 0.01)],
    cisza,
    cisza,
  ];
  const [glos, klik] = wygladz(okna).sort((a, b) => a.index - b.index);
  assert.ok(glos.confidence >= PROG_PEWNOSCI, `call: ${glos.confidence}`);
  assert.ok(klik.confidence < PROG_PEWNOSCI, `click: ${klik.confidence}`);
});

test('smoothing never goes above the loudest window', () => {
  const [w] = wygladz([[wynik(0, 0.6)], [wynik(0, 0.95)], [wynik(0, 0.4)]]);
  assert.ok(w.confidence <= 0.95 && w.confidence >= 0.4);
});

test('the threshold and, with a location, the chance of the species here decide what is shown', () => {
  const wyniki = [wynik(0, 0.2), wynik(1, 0.5, 0.01), wynik(2, 0.8, 0.4)];
  assert.deepEqual(
    wykryte(wyniki, { zMiejscem: false }).map((w) => w.index),
    [2, 1],
  );
  assert.deepEqual(
    wykryte(wyniki, { zMiejscem: true }).map((w) => w.index),
    [2],
  );
});

test('the session list keeps each species once, with its best confidence and the latest time', () => {
  let lista = dopisz([], [wynik(0, 0.9), wynik(1, 0.3)], 1000);
  lista = dopisz(lista, [wynik(0, 0.4)], 2000);
  assert.deepEqual(lista, [
    { lat: 'Gatunek 0', pl: 'ptak 0', pewnosc: 0.9, ostatnio: 2000 },
    { lat: 'Gatunek 1', pl: 'ptak 1', pewnosc: 0.3, ostatnio: 1000 },
  ]);
});

test("a heard species finds its course page by the atlas's Latin name", () => {
  const poLacinie = new Map([
    ['Strix aluco', 'puszczyk'],
    ['Aquila pennata', 'orzelek-wlochaty'],
  ]);
  assert.equal(wKursie('Strix aluco', poLacinie), 'puszczyk');
  assert.equal(wKursie('Hieraaetus pennatus', poLacinie), 'orzelek-wlochaty');
  assert.equal(wKursie('Turdus merula', poLacinie), undefined);
});
