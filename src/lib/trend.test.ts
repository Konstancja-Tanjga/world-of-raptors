import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  indeksy,
  klasa,
  KLASY_TRENDU,
  kolejnoscTemp,
  liczenie,
  losZZiarna,
  parametryRundy,
  RUNDY_TRENDU,
  seria,
  TEMPA,
  trendLogLiniowy,
  wynikRoku,
  zmianaCalkowita,
  zmianaRoczna,
} from './trend';

const blisko = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('an exact exponential series gives its rate back, with no error', () => {
  const t = trendLogLiniowy(Array.from({ length: 10 }, (_, i) => 50 * 0.96 ** i));
  blisko(t.mnoznik, 0.96);
  blisko(t.blad, 0);
  blisko(zmianaRoczna(t.mnoznik), -4);
  assert.equal(klasa(t), 'umiarkowany-spadek');
});

test('the slope and its standard error match a least-squares fit worked by hand', () => {
  // ln values 0, 1, 1, 2 at x = 0..3: slope 0.6, intercept 0.1, residuals −0.1, 0.3, −0.3, 0.1.
  const t = trendLogLiniowy([1, Math.E, Math.E, Math.E ** 2]);
  blisko(t.nachylenie, 0.6);
  blisko(t.wyrazWolny, 0.1);
  blisko(t.blad, Math.sqrt(0.2 / 2 / 5));
  blisko(t.dolna, Math.exp(0.6 - 1.96 * t.blad));
  blisko(t.gorna, Math.exp(0.6 + 1.96 * t.blad));
});

test('a year with nothing counted is left out, and too few years refuse', () => {
  assert.equal(trendLogLiniowy([10, 0, 9, 8]).lat, 3);
  assert.throws(() => trendLogLiniowy([10, 0, 9]));
});

test('the index does not change the trend: it only rescales the series', () => {
  const wyniki = [12, 15, 11, 14, 18, 16];
  const i = indeksy(wyniki);
  assert.equal(i[0], 1);
  blisko(i[4], 1.5);
  blisko(trendLogLiniowy(i).nachylenie, trendLogLiniowy(wyniki).nachylenie);
  blisko(trendLogLiniowy(i).blad, trendLogLiniowy(wyniki).blad);
  assert.throws(() => indeksy([0, 3, 4]));
});

test('PECBMS classes follow the confidence interval against 0.95, 1.00 and 1.05', () => {
  assert.equal(klasa({ dolna: 1.06, gorna: 1.12 }), 'silny-wzrost');
  assert.equal(klasa({ dolna: 1.02, gorna: 1.12 }), 'umiarkowany-wzrost');
  assert.equal(klasa({ dolna: 0.97, gorna: 1.03 }), 'stabilny');
  assert.equal(klasa({ dolna: 0.9, gorna: 1.03 }), 'niepewny');
  assert.equal(klasa({ dolna: 0.98, gorna: 1.08 }), 'niepewny');
  assert.equal(klasa({ dolna: 0.9, gorna: 0.99 }), 'umiarkowany-spadek');
  assert.equal(klasa({ dolna: 0.85, gorna: 0.94 }), 'silny-spadek');
  // On a threshold, the weaker class.
  assert.equal(klasa({ dolna: 1.05, gorna: 1.1 }), 'umiarkowany-wzrost');
  assert.equal(klasa({ dolna: 1, gorna: 1.04 }), 'stabilny');
  assert.equal(klasa({ dolna: 0.95, gorna: 1.01 }), 'niepewny');
  assert.equal(KLASY_TRENDU.length, 6);
});

test('the change over a series compounds the yearly change', () => {
  blisko(zmianaCalkowita(1.05, 15), (1.05 ** 14 - 1) * 100);
  // PECBMS: 5% a year doubles a population in about 15 years.
  assert.ok(zmianaCalkowita(1.05, 16) > 100 && zmianaCalkowita(1.05, 15) < 100);
});

test('a season’s result is the mean of its counts, or the largest', () => {
  assert.equal(wynikRoku([4, 7, 1], 'srednia'), 4);
  assert.equal(wynikRoku([4, 7, 1], 'najwiekszy'), 7);
  assert.throws(() => wynikRoku([], 'srednia'));
});

test('a count finds about p of the birds and never more than are there', () => {
  const los = losZZiarna(3);
  let suma = 0;
  for (let i = 0; i < 2000; i++) {
    const c = liczenie(40, 0.5, los);
    assert.ok(c >= 0 && c <= 40);
    suma += c;
  }
  blisko(suma / 2000, 20, 0.5);
  assert.equal(liczenie(30, 1, los), 30);
  assert.equal(liczenie(30, 0, los), 0);
});

test('one seed always draws the same series, and every round deals each rate once', () => {
  const p = parametryRundy(2, 0.03, losZZiarna(11));
  assert.deepEqual(seria(p, losZZiarna(5)), seria(p, losZZiarna(5)));
  assert.notDeepEqual(seria(p, losZZiarna(5)), seria(p, losZZiarna(6)));
  assert.deepEqual([...kolejnoscTemp(losZZiarna(9))].sort(), [...TEMPA].sort());
  assert.equal(TEMPA.length, RUNDY_TRENDU.length);
});

test('a series has a year for each count, counts no larger than the birds present, and the first year as told', () => {
  for (let runda = 0; runda < RUNDY_TRENDU.length; runda++) {
    const los = losZZiarna(100 + runda);
    const p = parametryRundy(runda, TEMPA[runda], los);
    const s = seria(p, los);
    assert.equal(s.lata.length, RUNDY_TRENDU[runda].lata);
    assert.equal(s.lata.at(-1), 2025);
    assert.equal(s.prawdziwe[0], p.n0);
    s.liczenia.forEach((l, t) => {
      assert.equal(l.length, 3);
      for (const c of l) assert.ok(c >= 0 && c <= s.prawdziwe[t]);
    });
  }
});

test('on long, calm series the class nearly always matches the true rate; short, restless ones are mostly uncertain', () => {
  const oczekiwane: Record<number, string> = { [-0.095]: 'silny-spadek', [-0.03]: 'umiarkowany-spadek', 0: 'stabilny', 0.03: 'umiarkowany-wzrost', 0.085: 'silny-wzrost' };
  for (const tempo of TEMPA) {
    let zgodne = 0;
    for (let z = 1; z <= 200; z++) {
      const los = losZZiarna(z * 7919);
      const s = seria(parametryRundy(0, tempo, los), los);
      if (klasa(trendLogLiniowy(s.liczenia.map((l) => wynikRoku(l, 'srednia')))) === oczekiwane[tempo]) zgodne++;
    }
    assert.ok(zgodne >= 180, `tempo ${tempo}: ${zgodne}/200`);
  }
  let niepewne = 0;
  for (let z = 1; z <= 200; z++) {
    const los = losZZiarna(z * 104729);
    const s = seria(parametryRundy(4, 0, los), los);
    if (klasa(trendLogLiniowy(s.liczenia.map((l) => wynikRoku(l, 'srednia')))) === 'niepewny') niepewne++;
  }
  assert.ok(niepewne >= 140, `${niepewne}/200`);
});
