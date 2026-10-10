import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ekstremaPlywow,
  godzina,
  minuty,
  naMadryt,
  najlepsze,
  NiepelnaPrognoza,
  oknaMiejsca,
  prognozaZOdpowiedzi,
  zMinut,
  type Prognoza,
} from './planer';

const DNI = ['2026-10-11', '2026-10-12', '2026-10-13'];

/** UTC minutes of a Madrid summer-time wall clock (UTC+2), as in October before the clock change. */
const lato = (czas: string) => minuty(czas) - 120;

type Pogoda = Partial<{ wiatr: number; kierunek: number; opad: number }>;

/**
 * A forecast for three days, in UTC as the page asks for it: a tide with high
 * water at 15:45 Madrid time on the first day (period 12 h 25 min, `zakres`
 * metres from low to high), calm dry weather, sunrise 08:26 and sunset 19:53
 * Madrid time; `pogoda` overrides any hour (given its UTC time).
 */
function prognoza(zakres = 2.3, pogoda: (czas: string) => Pogoda = () => ({})): Prognoza {
  const start = lato('2026-10-11T00:00');
  const szczyt = lato('2026-10-11T15:45');
  const czas: string[] = [];
  const poziom: number[] = [];
  for (let m = start; m < start + 3 * 1440; m += 15) {
    czas.push(zMinut(m));
    poziom.push(+((zakres / 2) * Math.cos((2 * Math.PI * (m - szczyt)) / 745)).toFixed(2));
  }
  const godziny = Array.from({ length: 72 }, (_, i) => zMinut(start + i * 60));
  return {
    plywy: { czas, poziom },
    godzinowa: {
      czas: godziny,
      wiatr: godziny.map((c) => pogoda(c).wiatr ?? 10),
      kierunek: godziny.map((c) => pogoda(c).kierunek ?? 270),
      opad: godziny.map((c) => pogoda(c).opad ?? 0),
    },
    dni: { data: DNI, wschod: DNI.map((d) => `${d}T06:26`), zachod: DNI.map((d) => `${d}T17:53`) },
  };
}

const RANO = lato('2026-10-11T07:00');

test('high and low waters are found at the turning points', () => {
  const e = ekstremaPlywow(['a', 'b', 'c', 'd', 'e', 'f', 'g'], [0, 1, 1, 0, -1, -0.5, -0.8]);
  assert.deepEqual(
    e.map((x) => [x.czas, x.rodzaj]),
    [
      ['b', 'przyplyw'],
      ['e', 'odplyw'],
      ['f', 'przyplyw'],
    ],
  );
});

test('the Marismas window is the rising tide: three hours before high water to one after, on Madrid time', () => {
  const [o] = oknaMiejsca('marismas-barbate', prognoza(), RANO);
  assert.equal(o.data, '2026-10-11');
  assert.equal(godzina(o.przyplyw!), '15:45');
  assert.equal(godzina(o.od), '12:45');
  assert.equal(godzina(o.do), '16:45');
});

test('a high water at night or too early in the morning gives no window', () => {
  const okna = oknaMiejsca('marismas-barbate', prognoza(), lato('2026-10-11T00:00'));
  assert.ok(okna.length > 0);
  // Every window leads to a high water at least an hour and a half after the light (08:56).
  assert.ok(okna.every((o) => minuty(o.przyplyw!) - minuty(`${o.data}T08:56`) >= 90));
});

test('windows already over are dropped and one under way starts now', () => {
  const okna = oknaMiejsca('marismas-barbate', prognoza(), lato('2026-10-11T14:00'));
  assert.equal(okna[0].data, '2026-10-11');
  assert.equal(godzina(okna[0].od), '14:00');
  const pozniej = oknaMiejsca('marismas-barbate', prognoza(), lato('2026-10-11T16:00'));
  assert.notEqual(pozniej[0].data, '2026-10-11');
});

test('a big tide scores higher than a small one', () => {
  const [duzy] = oknaMiejsca('marismas-barbate', prognoza(2.3), RANO);
  const [maly] = oknaMiejsca('marismas-barbate', prognoza(0.8), RANO);
  assert.ok(duzy.ocena > maly.ocena);
  assert.ok(duzy.powody.some((p) => p.startsWith('Duży pływ')));
  assert.ok(maly.powody.some((p) => p.startsWith('Mały pływ')));
});

test('rain and a gale take points off; a Levante adds them', () => {
  const [spokojnie] = oknaMiejsca('marismas-barbate', prognoza(), RANO);
  const [deszcz] = oknaMiejsca('marismas-barbate', prognoza(2.3, () => ({ opad: 1 })), RANO);
  const [wichura] = oknaMiejsca('marismas-barbate', prognoza(2.3, () => ({ wiatr: 50 })), RANO);
  const [lewant] = oknaMiejsca('marismas-barbate', prognoza(2.3, () => ({ wiatr: 20, kierunek: 90 })), RANO);
  assert.ok(deszcz.ocena < spokojnie.ocena);
  assert.ok(wichura.ocena < spokojnie.ocena);
  assert.ok(lewant.ocena > spokojnie.ocena);
});

test('La Janda has one window a day, late morning to mid-afternoon, and rain ranks a day last', () => {
  const p = prognoza(2.3, (c) => (naMadryt(minuty(c)).startsWith('2026-10-12') ? { opad: 1 } : {}));
  const okna = oknaMiejsca('la-janda', p, RANO);
  assert.deepEqual(
    okna.map((o) => [o.data, godzina(o.od), godzina(o.do)]),
    DNI.map((d) => [d, '11:00', '16:30']),
  );
  assert.equal(najlepsze(okna, 3).at(-1)!.data, '2026-10-12');
});

test('the best windows come first, and on a tie the earlier one', () => {
  const okna = oknaMiejsca('la-janda', prognoza(), RANO);
  assert.deepEqual(
    najlepsze(okna, 2).map((o) => o.data),
    ['2026-10-11', '2026-10-12'],
  );
});

test('hours without a forecast count as unknown, not as calm and dry', () => {
  const p = prognoza();
  p.godzinowa.wiatr = p.godzinowa.wiatr.map(() => null);
  const [o] = oknaMiejsca('la-janda', p, RANO);
  assert.ok(o.powody.some((x) => x.startsWith('Brak prognozy')));
});

test("times are shown on Madrid's clock, across the change to winter time", () => {
  assert.equal(naMadryt(minuty('2026-10-11T12:00')), '2026-10-11T14:00');
  assert.equal(naMadryt(minuty('2026-10-26T12:00')), '2026-10-26T13:00');
  // La Janda's 11:00 is 11:00 in Spain on both sides of 25 October.
  const p: Prognoza = {
    godzinowa: { czas: ['2026-10-24T09:00', '2026-10-26T10:00'], wiatr: [5, 5], kierunek: [270, 270], opad: [0, 0] },
    dni: {
      data: ['2026-10-24', '2026-10-26'],
      wschod: ['2026-10-24T06:38', '2026-10-26T06:40'],
      zachod: ['2026-10-24T17:36', '2026-10-26T17:34'],
    },
  };
  const okna = oknaMiejsca('la-janda', p, minuty('2026-10-24T00:00'));
  assert.deepEqual(
    okna.map((o) => [o.data, godzina(o.od), godzina(o.do)]),
    [
      ['2026-10-24', '11:00', '16:30'],
      ['2026-10-26', '11:00', '16:30'],
    ],
  );
  assert.equal(okna[0].start, minuty('2026-10-24T09:00'));
  assert.equal(okna[1].start, minuty('2026-10-26T10:00'));
});

/** Open-Meteo's answers for a forecast, in their own field names. */
function odpowiedzi(p: Prognoza) {
  return {
    pogoda: {
      hourly: {
        time: p.godzinowa.czas,
        wind_speed_10m: p.godzinowa.wiatr,
        wind_direction_10m: p.godzinowa.kierunek,
        precipitation: p.godzinowa.opad,
      },
      daily: { time: p.dni.data, sunrise: p.dni.wschod, sunset: p.dni.zachod },
    },
    plywy: { minutely_15: { time: p.plywy!.czas, sea_level_height_msl: p.plywy!.poziom } },
  };
}

test('a complete pair of answers becomes a forecast', () => {
  const { pogoda, plywy } = odpowiedzi(prognoza());
  assert.ok(prognozaZOdpowiedzi(pogoda, plywy).plywy);
  assert.equal(prognozaZOdpowiedzi(pogoda, null).plywy, undefined);
});

test('missing or empty data is refused, not planned on', () => {
  const { pogoda, plywy } = odpowiedzi(prognoza());
  const h = pogoda.hourly;
  const zle: [unknown, unknown][] = [
    [{}, null],
    [{ hourly: { time: [] } }, null],
    [{ ...pogoda, daily: { time: [], sunrise: [], sunset: [] } }, null],
    [{ ...pogoda, hourly: { ...h, wind_speed_10m: h.wind_speed_10m.slice(1) } }, null],
    [{ ...pogoda, hourly: { ...h, precipitation: h.precipitation.map(() => null) } }, null],
    [pogoda, { error: true }],
    [pogoda, { minutely_15: { ...plywy.minutely_15, sea_level_height_msl: plywy.minutely_15.sea_level_height_msl.map(() => null) } }],
  ];
  for (const [p, t] of zle) assert.throws(() => prognozaZOdpowiedzi(p, t), NiepelnaPrognoza);
});
