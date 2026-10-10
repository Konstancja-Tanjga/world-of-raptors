import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ekstremaPlywow,
  godzina,
  minuty,
  najlepsze,
  oknaMiejsca,
  prognozaZOdpowiedzi,
  terazWHiszpanii,
  zMinut,
  type Prognoza,
} from './planer';

const DNI = ['2026-10-11', '2026-10-12', '2026-10-13'];

/**
 * A forecast for three days: a tide with high water at 15:45 on the first
 * day (period 12 h 25 min, `zakres` metres from low to high), calm dry
 * weather, sunrise 08:26 and sunset 19:53; `pogoda` overrides any hour.
 */
function prognoza(zakres = 2.3, pogoda: (czas: string) => Partial<{ wiatr: number; kierunek: number; opad: number }> = () => ({})): Prognoza {
  const start = minuty('2026-10-11T00:00');
  const szczyt = minuty('2026-10-11T15:45');
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
    dni: { data: DNI, wschod: DNI.map((d) => `${d}T08:26`), zachod: DNI.map((d) => `${d}T19:53`) },
  };
}

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

test('the Marismas window is the rising tide: three hours before high water to one after', () => {
  const [o] = oknaMiejsca('marismas-barbate', prognoza(), '2026-10-11T07:00');
  assert.equal(o.data, '2026-10-11');
  assert.equal(godzina(o.przyplyw!), '15:45');
  assert.equal(godzina(o.od), '12:45');
  assert.equal(godzina(o.do), '16:45');
});

test('a high water at night or too early in the morning gives no window', () => {
  const okna = oknaMiejsca('marismas-barbate', prognoza(), '2026-10-11T00:00');
  // The night high waters (around 03:30 and 04:15) never make a window.
  assert.ok(okna.every((o) => minuty(o.przyplyw!) - minuty(`${o.data}T08:56`) >= 90));
});

test('windows already over are dropped and one under way starts now', () => {
  const okna = oknaMiejsca('marismas-barbate', prognoza(), '2026-10-11T14:00');
  assert.equal(okna[0].data, '2026-10-11');
  assert.equal(godzina(okna[0].od), '14:00');
  const pozniej = oknaMiejsca('marismas-barbate', prognoza(), '2026-10-11T16:00');
  assert.notEqual(pozniej[0].data, '2026-10-11');
});

test('a big tide scores higher than a small one', () => {
  const [duzy] = oknaMiejsca('marismas-barbate', prognoza(2.3), '2026-10-11T07:00');
  const [maly] = oknaMiejsca('marismas-barbate', prognoza(0.8), '2026-10-11T07:00');
  assert.ok(duzy.ocena > maly.ocena);
  assert.ok(duzy.powody.some((p) => p.startsWith('Duży pływ')));
  assert.ok(maly.powody.some((p) => p.startsWith('Mały pływ')));
});

test('rain and a gale take points off; a Levante adds them', () => {
  const [spokojnie] = oknaMiejsca('marismas-barbate', prognoza(), '2026-10-11T07:00');
  const [deszcz] = oknaMiejsca('marismas-barbate', prognoza(2.3, () => ({ opad: 1 })), '2026-10-11T07:00');
  const [wichura] = oknaMiejsca('marismas-barbate', prognoza(2.3, () => ({ wiatr: 50 })), '2026-10-11T07:00');
  const [lewant] = oknaMiejsca('marismas-barbate', prognoza(2.3, () => ({ wiatr: 20, kierunek: 90 })), '2026-10-11T07:00');
  assert.ok(deszcz.ocena < spokojnie.ocena);
  assert.ok(wichura.ocena < spokojnie.ocena);
  assert.ok(lewant.ocena > spokojnie.ocena);
});

test('La Janda has one window a day, late morning to mid-afternoon, and rain ranks a day last', () => {
  const p = prognoza(2.3, (c) => (c.startsWith('2026-10-12') ? { opad: 1 } : {}));
  const okna = oknaMiejsca('la-janda', p, '2026-10-11T07:00');
  assert.deepEqual(
    okna.map((o) => [o.data, godzina(o.od), godzina(o.do)]),
    DNI.map((d) => [d, '11:00', '16:30']),
  );
  assert.equal(najlepsze(okna, 3).at(-1)!.data, '2026-10-12');
});

test('the best windows come first, and on a tie the earlier one', () => {
  const okna = oknaMiejsca('la-janda', prognoza(), '2026-10-11T07:00');
  assert.deepEqual(
    najlepsze(okna, 2).map((o) => o.data),
    ['2026-10-11', '2026-10-12'],
  );
});

test('responses without the expected fields are refused', () => {
  assert.equal(prognozaZOdpowiedzi({}, null), null);
  assert.equal(prognozaZOdpowiedzi({ hourly: { time: [] } }, null), null);
  const pogoda = {
    hourly: { time: [], wind_speed_10m: [], wind_direction_10m: [], precipitation: [] },
    daily: { time: [], sunrise: [], sunset: [] },
  };
  assert.ok(prognozaZOdpowiedzi(pogoda, null));
  assert.equal(prognozaZOdpowiedzi(pogoda, { error: true }), null);
});

test('now in Spain is the wall-clock time in Madrid', () => {
  // 12:00 UTC in October is 14:00 in Madrid (summer time).
  assert.equal(terazWHiszpanii(new Date('2026-10-11T12:00:00Z')), '2026-10-11T14:00');
});
