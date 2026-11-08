import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adresGeokodowania,
  kierunek,
  miejscaZGeokodowania,
  najblizsze,
  naWiatr,
  NiepelnaOdpowiedz,
  odleglosc,
  pasujeDoZapytania,
  poraPunktu,
  propozycje,
  type PunktObserwacji,
  wspolrzedneZTekstu,
  zakresMiesiecy,
} from './punkty';

const TARIFA = { szer: 36.0129, dl: -5.6058 };
const CAZALLA = { szer: 36.03301, dl: -5.57662 };
const ALGARROBO = { szer: 36.09033, dl: -5.48395 };
const WARSZAWA = { szer: 52.2297, dl: 21.0122 };

test('odleglosc: a few kilometres along the Strait, and Warsaw to Tarifa', () => {
  assert.ok(Math.abs(odleglosc(TARIFA, CAZALLA) - 3.4) < 0.3);
  assert.equal(odleglosc(TARIFA, TARIFA), 0);
  // About 2 760 km as the crow flies.
  assert.ok(Math.abs(odleglosc(WARSZAWA, TARIFA) - 2760) < 30);
  assert.equal(odleglosc(TARIFA, ALGARROBO), odleglosc(ALGARROBO, TARIFA));
});

test('kierunek: eight compass directions in Polish', () => {
  assert.equal(kierunek(TARIFA, ALGARROBO), 'na północny wschód');
  assert.equal(kierunek(WARSZAWA, TARIFA), 'na południowy zachód');
  assert.equal(kierunek(TARIFA, { szer: 40, dl: -5.6058 }), 'na północ');
  assert.equal(kierunek(TARIFA, { szer: 36.0129, dl: -6.5 }), 'na zachód');
});

test('najblizsze: sorted by distance, each with its direction', () => {
  const punkty = [
    { id: 'algarrobo', ...ALGARROBO },
    { id: 'cazalla', ...CAZALLA },
  ];
  const wynik = najblizsze(punkty, TARIFA);
  assert.deepEqual(
    wynik.map((w) => w.punkt.id),
    ['cazalla', 'algarrobo'],
  );
  assert.ok(wynik[0].km < wynik[1].km);
  assert.equal(wynik[0].kierunek, 'na północny wschód');
});

test('naWiatr: a point chosen by that wind or by none', () => {
  assert.equal(naWiatr({ wiatr: ['lewant'] }, 'lewant'), true);
  assert.equal(naWiatr({ wiatr: ['lewant'] }, 'poniente'), false);
  assert.equal(naWiatr({ wiatr: [] }, 'poniente'), true);
  assert.equal(naWiatr({ wiatr: ['poniente'] }, null), true);
});

test('wspolrzedneZTekstu: dotted or comma decimals, in range only', () => {
  assert.deepEqual(wspolrzedneZTekstu('36.01, -5.60'), { szer: 36.01, dl: -5.6 });
  assert.deepEqual(wspolrzedneZTekstu(' 36.01 -5.60 '), { szer: 36.01, dl: -5.6 });
  assert.deepEqual(wspolrzedneZTekstu('36,01; -5,6'), { szer: 36.01, dl: -5.6 });
  assert.deepEqual(wspolrzedneZTekstu('36,01 -5,6'), { szer: 36.01, dl: -5.6 });
  assert.deepEqual(wspolrzedneZTekstu('52,-5'), { szer: 52, dl: -5 });
  assert.equal(wspolrzedneZTekstu('Tarifa'), null);
  assert.equal(wspolrzedneZTekstu('36.01'), null);
  assert.equal(wspolrzedneZTekstu('95, 10'), null);
  assert.equal(wspolrzedneZTekstu('45, 190'), null);
  assert.equal(wspolrzedneZTekstu('11000 Cádiz'), null);
});

test('adresGeokodowania: the name trimmed and encoded, answers in Polish', () => {
  const url = new URL(adresGeokodowania('  Vejer de la Frontera '));
  assert.equal(url.host, 'geocoding-api.open-meteo.com');
  assert.equal(url.searchParams.get('name'), 'Vejer de la Frontera');
  assert.equal(url.searchParams.get('language'), 'pl');
});

test('miejscaZGeokodowania: places with their region and country, none, or a refusal', () => {
  const odp = {
    results: [
      { name: 'Tarifa', latitude: 36.01, longitude: -5.6, admin1: 'Andaluzja', country: 'Hiszpania' },
      { name: 'Hiszpania', latitude: 40, longitude: -4, country: 'Hiszpania' },
    ],
  };
  assert.deepEqual(miejscaZGeokodowania(odp), [
    { nazwa: 'Tarifa', opis: 'Andaluzja, Hiszpania', szer: 36.01, dl: -5.6 },
    { nazwa: 'Hiszpania', opis: '', szer: 40, dl: -4 },
  ]);
  assert.deepEqual(miejscaZGeokodowania({ generationtime_ms: 0.4 }), []);
  assert.throws(() => miejscaZGeokodowania(null), NiepelnaOdpowiedz);
  assert.throws(() => miejscaZGeokodowania({ results: 'x' }), NiepelnaOdpowiedz);
  assert.throws(() => miejscaZGeokodowania({ results: [{ name: 'X' }] }), NiepelnaOdpowiedz);
  assert.throws(() => miejscaZGeokodowania({ results: [null] }), NiepelnaOdpowiedz);
  // An error, or an answer that is not geocoding's at all (a captive portal), is not "no such place".
  assert.throws(() => miejscaZGeokodowania({ error: true, reason: 'Parameter name is required' }), NiepelnaOdpowiedz);
  assert.throws(() => miejscaZGeokodowania({ status: 'ok' }), NiepelnaOdpowiedz);
});

test('zakresMiesiecy: runs in Roman numerals, across the new year too', () => {
  assert.equal(zakresMiesiecy([2, 3, 4, 5, 7, 8, 9, 10, 11]), 'II–V, VII–XI');
  assert.equal(zakresMiesiecy([12, 1, 2]), 'XII–II');
  assert.equal(zakresMiesiecy([9]), 'IX');
  assert.equal(zakresMiesiecy([3, 4, 9]), 'III–IV, IX');
  assert.equal(zakresMiesiecy([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), 'cały rok');
});

const punkt = (id: string, w: { szer: number; dl: number }, miesiace: number[], szczyt: number[], zmiany: Partial<PunktObserwacji> = {}): PunktObserwacji => ({
  id,
  nazwa: `Punkt ${id}`,
  okolica: 'okolice-tarify',
  rodzaj: 'przelot',
  opis: '',
  dojazd: '',
  wiatr: [],
  miesiace,
  szczyt,
  pora_dnia: '',
  gatunki: [],
  lekcja: 'gibraltar/04-gdzie-i-kiedy',
  zrodla: [],
  ...w,
  ...zmiany,
});

test('a month is a point’s peak, in season, or out of it', () => {
  const p = punkt('a', TARIFA, [2, 3, 8, 9, 10], [9]);
  assert.deepEqual([9, 3, 6].map((m) => poraPunktu(p, m)), ['szczyt', 'sezon', 'poza']);
});

test('the search finds every typed word in name, area, description or birds, without diacritics', () => {
  const p = punkt('bolonia', TARIFA, [9], [9], { nazwa: 'Obserwatorium Puerto de Bolonia', opis: 'Przełęcz nad zatoką.', inne_ptaki: 'bociany' });
  const ptaki = ['sęp płowy', 'kania czarna'];
  assert.ok(pasujeDoZapytania(p, 'bolonia', ptaki));
  assert.ok(pasujeDoZapytania(p, 'sep plowy', ptaki), 'a bird, typed without Polish letters');
  assert.ok(pasujeDoZapytania(p, 'tarify kania', ptaki), 'an area and a bird, in any order');
  assert.ok(pasujeDoZapytania(p, 'przelecz', ptaki), 'a word of the description');
  assert.ok(pasujeDoZapytania(p, '  ', ptaki), 'an empty search keeps every point');
  assert.ok(!pasujeDoZapytania(p, 'bolonia orlik', ptaki), 'every word must be found');
});

test('suggestions skip points out of season and favour a peak a little farther away', () => {
  const blisko = punkt('blisko', CAZALLA, [3, 4, 9], [3]); // about 3 km, in season in September
  const szczyt = punkt('szczyt', { szer: 36.04, dl: -5.6 }, [9], [9]); // about 3 km too, at its peak
  const poza = punkt('poza', TARIFA, [3, 4], [3]);
  const daleko = punkt('daleko', ALGARROBO, [9], [9]);
  const wynik = propozycje([blisko, szczyt, poza, daleko], TARIFA, 9);
  assert.deepEqual(wynik.map((o) => o.punkt.id), ['szczyt', 'blisko', 'daleko']);
  assert.deepEqual(wynik.map((o) => o.pora), ['szczyt', 'sezon', 'szczyt']);
  assert.deepEqual(propozycje([blisko, poza], TARIFA, 6), [], 'nothing in season, nothing suggested');
  assert.equal(propozycje([blisko, szczyt, daleko], TARIFA, 9, 2).length, 2);
});
