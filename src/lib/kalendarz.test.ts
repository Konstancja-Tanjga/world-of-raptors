import assert from 'node:assert/strict';
import { test } from 'node:test';
import kalendarz from '../../content/kalendarz-siewkowcow.json' with { type: 'json' };
import { krokTygodnia, opisTygodnia, problemyKalendarza, stanGatunku, TYGODNIE, type KalendarzSiewkowcow } from './kalendarz';

test('the weeks run from 1 July to 31 October and read out as dates', () => {
  assert.equal(opisTygodnia(0), '1–7 lipca');
  assert.equal(opisTygodnia(4), '29 lipca – 4 sierpnia');
  assert.equal(opisTygodnia(TYGODNIE - 1), '28–31 października');
});

test('each week maps to the half-month holding its middle, in order, covering all eight', () => {
  const kroki = Array.from({ length: TYGODNIE }, (_, t) => krokTygodnia(t));
  assert.equal(kroki[0], 0);
  assert.equal(kroki.at(-1), 7);
  assert.ok(kroki.every((k, i) => i === 0 || k >= kroki[i - 1]));
  assert.deepEqual(kroki, [0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7]);
});

const g = {
  id: 'biegus-zmienny',
  szczyt: [4],
  okresy: [
    { od: 3, do: 6, kto: 'mlode' as const, szata: 'młodociana', zrodla: ['a'] },
    { od: 1, do: 4, kto: 'dorosle' as const, szata: 'godowa', zrodla: ['a'] },
  ],
};

test('a half-month shows the periods running then, adults first, and a peak only when birds are there', () => {
  assert.deepEqual(stanGatunku(g, 0), { okresy: [], szczyt: false });
  assert.deepEqual(stanGatunku(g, 4).okresy.map((o) => o.kto), ['dorosle', 'mlode']);
  assert.equal(stanGatunku(g, 4).szczyt, true);
  assert.equal(stanGatunku(g, 6).szczyt, false);
});

test('the data in content/ is sound', () => {
  assert.deepEqual(problemyKalendarza(kalendarz as KalendarzSiewkowcow), []);
});

test('bad data is reported, each problem by name', () => {
  const okres = { od: 1, do: 2, kto: 'mlode' as const, szata: 'młodociana', zrodla: ['a'] };
  const k = (g: object, kroki = 8) => ({ kroki: Array(kroki).fill('x'), obszar: '', zrodla: [{ id: 'a', opis: '', url: '' }], gatunki: [{ id: 'x', okresy: [okres], ...g }] });
  const jeden = (g: object, wzor: RegExp, kroki?: number) => {
    const b = problemyKalendarza(k(g, kroki));
    assert.equal(b.length, 1, b.join('; '));
    assert.match(b[0], wzor);
  };
  jeden({}, /kroki/, 1);
  jeden({ okresy: [] }, /brak okresów/);
  jeden({ szczyt: [9] }, /szczyt 9 poza krokami/);
  jeden({ szczyt: [5] }, /szczyt 5 poza wszystkimi okresami/);
  jeden({ okresy: [{ ...okres, od: 5, do: 2 }] }, /odwrócony/);
  jeden({ okresy: [{ ...okres, od: 1.5 }] }, /poza krokami/);
  jeden({ okresy: [{ ...okres, kto: 'stare' }] }, /kto „stare”/);
  jeden({ okresy: [{ ...okres, szata: '' }] }, /bez opisu szaty/);
  jeden({ okresy: [{ ...okres, zrodla: ['nie-ma'] }] }, /nieznane źródło/);
  jeden({ okresy: [{ ...okres, zrodla: [] }] }, /bez źródła/);
});
