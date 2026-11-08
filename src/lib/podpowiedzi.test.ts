import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dniOd,
  kiedySlownie,
  obserwacjeZEbird,
  podpowiedzi,
  pogodaZOpenMeteo,
  warunki,
  jestZaokraglony,
  zaokraglij,
  type PtakKursu,
} from './podpowiedzi';

const KAMPINOS = { szer: 52.31, dl: 20.65 };
const TARIFA = { szer: 36.01, dl: -5.6 };

// The shape eBird's data/obs/geo/recent answers in (fields trimmed to those used, plus a few it also sends).
const odpowiedz = [
  { speciesCode: 'norlap', comName: 'czajka', sciName: 'Vanellus vanellus', locId: 'L1', locName: 'Łąki Kampinos', obsDt: '2026-11-08 07:40', howMany: 40, lat: 52.3, lng: 20.6 },
  { speciesCode: 'comcra', comName: 'żuraw', sciName: 'Grus grus', locId: 'L2', locName: 'Stawy', obsDt: '2026-11-01', howMany: 3 },
  { speciesCode: 'combuz', comName: 'myszołów', sciName: 'Buteo buteo', locId: 'L1', locName: 'Łąki Kampinos', obsDt: '2026-11-07 12:00' },
  { speciesCode: 'accipi', comName: 'Accipiter sp.', sciName: 'Accipiter sp.', locName: 'X', obsDt: '2026-11-08 09:00' },
  { speciesCode: 'bad', comName: 'brak daty', sciName: 'Nemo nemo', obsDt: 'wczoraj' },
  'nie obiekt',
];

const ptaki = new Map<string, PtakKursu>([
  ['norlap', { id: 'czajka', pl: 'czajka', wKursie: true, szybujacy: false }],
  ['combuz', { id: 'myszolow', pl: 'myszołów', wKursie: true, szybujacy: true }],
  ['comcra', { id: 'zuraw', pl: 'żuraw', wKursie: false, szybujacy: false }],
]);

test('eBird records without a species, name or date are dropped; a non-list answer throws', () => {
  const o = obserwacjeZEbird(odpowiedz);
  assert.deepEqual(o.map((x) => x.speciesCode), ['norlap', 'comcra', 'combuz', 'accipi']);
  assert.equal(o[2].howMany, undefined, 'no count when eBird gives none');
  assert.throws(() => obserwacjeZEbird({ errors: [] }));
});

test('days count by local date, never below zero', () => {
  assert.equal(dniOd('2026-11-08 07:40', '2026-11-08'), 0);
  assert.equal(dniOd('2026-11-01', '2026-11-08'), 7);
  assert.equal(dniOd('2026-11-09 06:00', '2026-11-08'), 0, 'a report from a clock ahead is today');
  assert.deepEqual([0, 1, 5].map(kiedySlownie), ['dziś', 'wczoraj', '5 dni temu']);
});

test('the birds are ranked by how recently they were seen, spuhs left out, the course names kept', () => {
  const lista = podpowiedzi(obserwacjeZEbird(odpowiedz), new Set(['comcra']), '2026-11-08', ptaki);
  assert.deepEqual(lista.map((p) => p.kod), ['norlap', 'combuz', 'comcra']);
  assert.equal(lista[0].id, 'czajka');
  assert.equal(lista[0].liczba, 40);
  assert.equal(lista[2].rzadki, true);
  assert.equal(lista[2].wKursie, false);
});

test('a species reported twice keeps its latest report', () => {
  const dwa = [
    { speciesCode: 'norlap', comName: 'czajka', sciName: 'Vanellus vanellus', locName: 'Stare', obsDt: '2026-10-20' },
    { speciesCode: 'norlap', comName: 'czajka', sciName: 'Vanellus vanellus', locName: 'Nowe', obsDt: '2026-11-07' },
  ];
  const [p] = podpowiedzi(obserwacjeZEbird(dwa), new Set(), '2026-11-08', ptaki);
  assert.equal(p.miejsce, 'Nowe');
  assert.equal(p.dni, 1);
});

test('a bird the course does not know keeps eBird’s Polish name', () => {
  const [p] = podpowiedzi(
    obserwacjeZEbird([{ speciesCode: 'gyrfal', comName: 'białozór', sciName: 'Falco rusticolus', locName: 'X', obsDt: '2026-11-08' }]),
    new Set(),
    '2026-11-08',
    ptaki,
  );
  assert.equal(p.pl, 'białozór');
  assert.equal(p.id, undefined);
});

test('rain lowers the soaring raptors below a bird seen a day earlier; a calm dry noon lifts them', () => {
  const rowno = [
    { speciesCode: 'combuz', comName: 'myszołów', sciName: 'Buteo buteo', locName: 'X', obsDt: '2026-11-08' },
    { speciesCode: 'norlap', comName: 'czajka', sciName: 'Vanellus vanellus', locName: 'X', obsDt: '2026-11-07' },
  ];
  assert.match(warunki({ opad: 0.1, wiatr: 10, kierunek: 0, godzina: 12 }, KAMPINOS).uwagi.join(' '), /Pada/, 'light rain over a quarter hour counts');
  const deszcz = warunki({ opad: 2, wiatr: 10, kierunek: 0, godzina: 12 }, KAMPINOS);
  assert.ok(deszcz.mnoznik < 1);
  assert.deepEqual(podpowiedzi(obserwacjeZEbird(rowno), new Set(), '2026-11-08', ptaki, deszcz.mnoznik).map((p) => p.kod), ['norlap', 'combuz']);
  const termika = warunki({ opad: 0, wiatr: 10, kierunek: 0, godzina: 12 }, KAMPINOS);
  assert.ok(termika.mnoznik > 1);
  assert.match(termika.uwagi.join(' '), /termiki/);
});

test('the Strait wind note follows the course: Levante west to Tarifa, Poniente east, nothing far away or calm', () => {
  assert.match(warunki({ opad: 0, wiatr: 35, kierunek: 90, godzina: 12 }, TARIFA).uwagi.join(' '), /lewant/);
  assert.match(warunki({ opad: 0, wiatr: 35, kierunek: 270, godzina: 12 }, TARIFA).uwagi.join(' '), /poniente/);
  assert.doesNotMatch(warunki({ opad: 0, wiatr: 35, kierunek: 90, godzina: 12 }, KAMPINOS).uwagi.join(' '), /lewant/);
  assert.doesNotMatch(warunki({ opad: 0, wiatr: 5, kierunek: 90, godzina: 12 }, TARIFA).uwagi.join(' '), /lewant/);
});

test('Open-Meteo’s current weather is read with its local hour; a gap throws', () => {
  const p = pogodaZOpenMeteo({ current: { time: '2026-11-08T14:15', precipitation: 0, wind_speed_10m: 12.5, wind_direction_10m: 95 } });
  assert.deepEqual(p, { opad: 0, wiatr: 12.5, kierunek: 95, godzina: 14 });
  assert.throws(() => pogodaZOpenMeteo({ current: { time: '2026-11-08T14:15', precipitation: null, wind_speed_10m: 1, wind_direction_10m: 1 } }));
});

test('a point leaves the phone rounded to two decimals, about a kilometre', () => {
  assert.deepEqual(zaokraglij({ szer: 52.312345, dl: -5.606789 }), { szer: 52.31, dl: -5.61 });
  assert.ok(jestZaokraglony({ szer: 52.31, dl: -5.6 }));
  assert.ok(!jestZaokraglony({ szer: 52.311, dl: -5.6 }), 'a finer point would be a cache entry of its own');
});
