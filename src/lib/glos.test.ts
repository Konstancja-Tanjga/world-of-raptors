import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  dopisz,
  dopiszProbki,
  INNE_NAZWY,
  NIEZNANE_MODELOWI,
  nowyBufor,
  PROG_MIEJSCA,
  PROG_PEWNOSCI,
  rozwin,
  wKursie,
  wygladz,
  wykryte,
  type Wynik,
} from './glos';

const wynik = (index: number, confidence: number, geoscore = 1): Wynik => ({
  index,
  scientificName: `Gatunek ${index}`,
  commonNameI18n: `ptak ${index}`,
  confidence,
  geoscore,
});
const cisza = (...indeksy: number[]) => indeksy.map((i) => wynik(i, 0.01));

test('a lone moderate window sinks among quiet ones, a strong one still shows', () => {
  const [umiarkowany] = wygladz([[wynik(0, 0.6)], cisza(0), cisza(0), cisza(0), cisza(0)]);
  const [mocny] = wygladz([[wynik(0, 0.9)], cisza(0), cisza(0), cisza(0), cisza(0)]);
  assert.ok(umiarkowany.confidence < PROG_PEWNOSCI, `0.6: ${umiarkowany.confidence}`);
  assert.ok(mocny.confidence >= PROG_PEWNOSCI, `0.9: ${mocny.confidence}`);
});

test('right after the start, windows not yet heard count as silence', () => {
  const [w] = wygladz([[wynik(0, 0.6)]]);
  assert.ok(w.confidence < PROG_PEWNOSCI, `first window: ${w.confidence}`);
  assert.deepEqual(wygladz([]), []);
});

test('a call heard in two windows of five stays above the threshold', () => {
  const [w] = wygladz([[wynik(0, 0.9)], cisza(0), [wynik(0, 0.9)], cisza(0), cisza(0)]);
  assert.ok(w.confidence >= PROG_PEWNOSCI, `call: ${w.confidence}`);
});

test('smoothing never goes above the loudest window', () => {
  const [w] = wygladz([[wynik(0, 0.6)], [wynik(0, 0.95)], [wynik(0, 0.4)]]);
  assert.ok(w.confidence <= 0.95);
});

test("only the last windows count, and the chance here comes from the latest one", () => {
  const stare = [wynik(0, 0.99, 0.9)];
  const [w] = wygladz([stare, ...Array(5).fill([wynik(0, 0.01, 0.01)])]);
  assert.ok(w.confidence < 0.02);
  assert.equal(w.geoscore, 0.01);
});

test('the thresholds include their own value; without a location the chance here is ignored', () => {
  const wyniki = [wynik(0, PROG_PEWNOSCI - 0.001), wynik(1, PROG_PEWNOSCI, PROG_MIEJSCA), wynik(2, 0.8, 0), wynik(3, 0.5, 0.04)];
  assert.deepEqual(
    wykryte(wyniki, { zMiejscem: false }).map((w) => w.index),
    [2, 3, 1],
  );
  assert.deepEqual(
    wykryte(wyniki, { zMiejscem: true }).map((w) => w.index),
    [1],
  );
  assert.equal(wykryte([1, 2, 3, 4, 5, 6, 7].map((i) => wynik(i, 0.9)), { zMiejscem: false }).length, 5);
});

test('the session list keeps each species once, with its best confidence and the latest time', () => {
  const pusta: [] = [];
  let lista = dopisz(pusta, [wynik(1, 0.4), wynik(0, 0.9)], 1000);
  assert.deepEqual(
    lista.map((u) => u.lat),
    ['Gatunek 0', 'Gatunek 1'],
    'heard at once: the surer first',
  );
  const przed = structuredClone(lista);
  lista = dopisz(lista, [wynik(1, 0.5)], 2000);
  assert.deepEqual(lista, [
    { lat: 'Gatunek 1', pl: 'ptak 1', pewnosc: 0.5, ostatnio: 2000 },
    { lat: 'Gatunek 0', pl: 'ptak 0', pewnosc: 0.9, ostatnio: 1000 },
  ]);
  assert.deepEqual(przed, [
    { lat: 'Gatunek 0', pl: 'ptak 0', pewnosc: 0.9, ostatnio: 1000 },
    { lat: 'Gatunek 1', pl: 'ptak 1', pewnosc: 0.4, ostatnio: 1000 },
  ]);
});

test('the ring unrolls oldest sample first, wherever writing stopped', () => {
  for (const ile of [0, 3, 4, 6]) {
    const b = nowyBufor(4);
    const dane = Float32Array.from({ length: ile }, (_, i) => i + 1);
    dopiszProbki(b, dane);
    const oczekiwane = [0, 0, 0, 0, ...dane].slice(-4);
    assert.deepEqual([...rozwin(b)], oczekiwane, `${ile} samples written`);
  }
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

test("every atlas and marsh species is in the model's labels, mapped, or listed as unknown to it", () => {
  const plik = new URL('../../public/birdnet/6ab67ac/models/birdnet/labels/en_us.txt', import.meta.url);
  const etykiety = new Set(readFileSync(plik, 'utf8').split('\n').map((l) => l.split('_')[0]));
  const zmapowane = new Set(Object.values(INNE_NAZWY));
  for (const klucz of Object.keys(INNE_NAZWY)) assert.ok(etykiety.has(klucz), `${klucz} is not a label`);
  for (const lat of NIEZNANE_MODELOWI) assert.ok(!etykiety.has(lat), `${lat} is in the model after all`);
  const czytaj = (sciezka: string) => JSON.parse(readFileSync(new URL(sciezka, import.meta.url), 'utf8'));
  const ptaki: { lat: string }[] = [...czytaj('../../content/gatunki.json').gatunki, ...czytaj('../../content/ptaki-mokradel.json').ptaki];
  for (const { lat } of ptaki) {
    assert.ok(etykiety.has(lat) || zmapowane.has(lat) || NIEZNANE_MODELOWI.includes(lat), `${lat}: not in the model, map or list it`);
  }
});
