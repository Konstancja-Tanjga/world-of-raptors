import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  kontrola,
  kontroliDoPewnosci,
  kumulatywna,
  liczbaSamcow,
  liczenie,
  losZZiarna,
  NAJMNIEJ_SAMCOW,
  NAJWIECEJ_SAMCOW,
  oszacowanie,
  rozkladWynikow,
  rozmiescSamce,
  uslyszaneChocRaz,
  wariantIleIchJest,
  WARUNKI,
  wykrywalnoscGatunku,
  zakresWynikow,
} from './wykrywalnosc';

const blisko = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('one seed always gives the same count, and a count never exceeds the males present', () => {
  assert.equal(liczenie(20, 0.5, 7), liczenie(20, 0.5, 7));
  for (let z = 1; z < 200; z++) {
    const c = liczenie(20, 0.5, z);
    assert.ok(c >= 0 && c <= 20);
  }
  assert.equal(liczenie(12, 1, 3), 12);
  assert.equal(liczenie(12, 0, 3), 0);
});

test('the guide’s example: 20 males heard with p = 0.5 average about 10, single counts spread from about 3 to 17', () => {
  const rozklad = rozkladWynikow(20, 0.5, 1000, 42);
  assert.equal(rozklad.length, 21);
  assert.equal(rozklad.reduce((s, x) => s + x, 0), 1000);
  const srednia = rozklad.reduce((s, x, k) => s + x * k, 0) / 1000;
  assert.ok(Math.abs(srednia - 10) < 0.4, `mean ${srednia}`);
  // 19 or 20 of 20 is practically impossible (exact chance about 2 in 100 000).
  assert.equal(rozklad[19] + rozklad[20], 0);
  const [od, doK] = zakresWynikow(rozklad, 0.95);
  assert.ok(od >= 5 && od <= 7, `from ${od}`);
  assert.ok(doK >= 13 && doK <= 15, `to ${doK}`);
});

test('a better listener (p = 0.9) still misses birds: the counts sit around 18, not 20', () => {
  const rozklad = rozkladWynikow(20, 0.9, 1000, 5);
  const srednia = rozklad.reduce((s, x, k) => s + x * k, 0) / 1000;
  assert.ok(Math.abs(srednia - 18) < 0.3);
  assert.ok(rozklad[20] < 200, 'a full count is the exception (about 12%)');
});

test('the range holds at least the share asked for and trims from both ends', () => {
  const r = [0, 1, 5, 20, 48, 20, 5, 1, 0];
  const [od, doK] = zakresWynikow(r, 0.9);
  const wewnatrz = r.slice(od, doK + 1).reduce((s, x) => s + x, 0);
  assert.ok(wewnatrz >= 0.9 * 100);
  assert.deepEqual([od, doK], [3, 6], "one tail of 5 fits in the 10 allowed, the other no longer does");
  assert.deepEqual(zakresWynikow([0, 0, 10, 0], 0.95), [2, 2]);
  assert.deepEqual(zakresWynikow([], 0.95), [0, 0]);
});

test('species detectability: one tawny owl heard half the time is found on half the visits, four of them on 15 visits in 16', () => {
  blisko(wykrywalnoscGatunku(0.5, 1), 0.5);
  blisko(wykrywalnoscGatunku(0.5, 4), 15 / 16);
  blisko(wykrywalnoscGatunku(0.3, 0), 0);
});

test('cumulative chance of finding a species rises with visits, as in the guide’s figure 2.3', () => {
  blisko(kumulatywna(0.3, 1), 0.3);
  blisko(kumulatywna(0.3, 2), 0.51);
  assert.ok(kumulatywna(0.2, 15) > 0.96 && kumulatywna(0.2, 15) < 0.97);
  for (let n = 1; n < 15; n++) assert.ok(kumulatywna(0.6, n + 1) > kumulatywna(0.6, n));
});

test('empty visits needed before a species can be ruled out', () => {
  // ln(0.05) / ln(0.7) = 8.4: nine empty visits for 95% certainty with D = 0.3.
  assert.equal(kontroliDoPewnosci(0.3, 0.95), 9);
  assert.equal(kontroliDoPewnosci(0.1, 0.95), 29);
  assert.equal(kontroliDoPewnosci(0.5, 0.75), 2, 'exactly reaching the target counts');
  assert.equal(kontroliDoPewnosci(0.9, 0.8), 1);
  assert.equal(kontroliDoPewnosci(1, 0.99), 1);
  assert.equal(kontroliDoPewnosci(0, 0.95), Infinity);
  for (const d of [0.05, 0.2, 0.45, 0.8]) {
    for (const k of [0.8, 0.9, 0.95, 0.99]) {
      const n = kontroliDoPewnosci(d, k);
      assert.ok(kumulatywna(d, n) >= k - 1e-12, `D=${d} K=${k}: n=${n} too few`);
      if (n > 1) assert.ok(kumulatywna(d, n - 1) < k, `D=${d} K=${k}: n=${n} one too many`);
    }
  }
});

test('the plain estimate is the mean count over p', () => {
  assert.equal(oszacowanie([5, 7, 6], 0.5), 12);
  assert.equal(oszacowanie([], 0.5), null);
});

test('males heard at least once are counted once each', () => {
  assert.equal(uslyszaneChocRaz([]), 0);
  assert.equal(
    uslyszaneChocRaz([
      [true, false, false, true],
      [true, true, false, false],
    ]),
    3,
  );
});

test('a plot has 6 to 14 males, all inside it and none on top of another', () => {
  for (let z = 1; z < 100; z++) {
    const los = losZZiarna(z);
    const n = liczbaSamcow(los);
    assert.ok(n >= NAJMNIEJ_SAMCOW && n <= NAJWIECEJ_SAMCOW);
    const samce = rozmiescSamce(n, los);
    assert.equal(samce.length, n);
    for (const s of samce) assert.ok(s.x > 0.05 && s.x < 0.95 && s.y > 0.05 && s.y < 0.95);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(Math.hypot(samce[i].x - samce[j].x, samce[i].y - samce[j].y) > 0.08);
  }
});

test('a visit decides for each male separately, and the conditions run from good to poor', () => {
  assert.equal(kontrola(9, 0.5, losZZiarna(1)).length, 9);
  const p = WARUNKI.map((w) => w.p);
  assert.deepEqual([...p].sort((a, b) => b - a), p);
});

test('the tag’s variant defaults to visits and refuses anything else', () => {
  assert.equal(wariantIleIchJest(''), 'kontrole');
  assert.equal(wariantIleIchJest('powroty'), 'powroty');
  assert.throws(() => wariantIleIchJest('trend'), /nieznany wariant/);
});
