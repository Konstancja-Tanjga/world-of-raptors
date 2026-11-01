import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blokDziesieciu, liczebnosc, losZZiarna, ocenSzacunek, RUNDY_STADA, rysujStado } from './stado';

test('one seed always draws the same flock', () => {
  assert.deepEqual(rysujStado(50, losZZiarna(7)), rysujStado(50, losZZiarna(7)));
  assert.notDeepEqual(rysujStado(50, losZZiarna(7)), rysujStado(50, losZZiarna(8)));
});

test('every round draws as many birds as it asks for, inside the shore, none on top of another', () => {
  for (let runda = 0; runda < RUNDY_STADA.length; runda++) {
    for (const ziarno of [1, 42, 999]) {
      const los = losZZiarna(ziarno);
      const ile = liczebnosc(runda, los);
      const [od, doIlu] = RUNDY_STADA[runda];
      assert.ok(ile >= od && ile <= doIlu);
      const ptaki = rysujStado(ile, los);
      assert.equal(ptaki.length, ile);
      for (const p of ptaki) assert.ok(p.x > 0 && p.x < 1 && p.y > 0.35 && p.y < 1);
      for (let i = 0; i < 60; i++) {
        for (let j = i + 1; j < ptaki.length; j++) {
          const [a, b] = [ptaki[i], ptaki[j]];
          assert.ok(Math.hypot((a.x - b.x) * 1.6, a.y - b.y) >= (a.r + b.r) * 1.1);
        }
      }
    }
  }
});

test('the largest round always draws the full flock it promised', () => {
  const [od] = RUNDY_STADA[2];
  for (let ziarno = 1; ziarno <= 200; ziarno++) {
    const los = losZZiarna(ziarno * 7919);
    const ile = liczebnosc(2, los);
    const ptaki = rysujStado(ile, los);
    assert.equal(ptaki.length, ile, `seed ${ziarno}`);
    assert.ok(ptaki.length >= od);
  }
});

test('the block shown is ten birds of the flock', () => {
  const ptaki = rysujStado(60, losZZiarna(3));
  const blok = blokDziesieciu(ptaki);
  assert.equal(new Set(blok).size, 10);
  assert.ok(blok.every((i) => i >= 0 && i < ptaki.length));
  assert.deepEqual(blokDziesieciu([]), []);
});

test('an estimate within a fifth hits, and a miss says which way', () => {
  assert.deepEqual(ocenSzacunek(100, 100), { blad: 0, trafiony: true, kierunek: 'dokladnie' });
  assert.equal(ocenSzacunek(80, 100).trafiony, true);
  assert.equal(ocenSzacunek(70, 100).kierunek, 'za-malo');
  assert.equal(ocenSzacunek(70, 100).trafiony, false);
  assert.equal(ocenSzacunek(130, 100).kierunek, 'za-duzo');
});
