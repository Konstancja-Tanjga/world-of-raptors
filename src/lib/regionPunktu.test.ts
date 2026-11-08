import assert from 'node:assert/strict';
import { test } from 'node:test';
import { regionPunktu } from './regionPunktu';

test('a point gives its region: the Strait first, then southern Spain, then Poland', () => {
  assert.equal(regionPunktu({ szer: 36.0129, dl: -5.6058 }), 'gibraltar', 'Tarifa');
  assert.equal(regionPunktu({ szer: 36.13, dl: -5.45 }), 'gibraltar', 'Algeciras');
  assert.equal(regionPunktu({ szer: 36.14, dl: -5.35 }), 'gibraltar', 'Gibraltar');
  assert.equal(regionPunktu({ szer: 37.39, dl: -5.98 }), 'poludnie-hiszpanii', 'Sevilla');
  assert.equal(regionPunktu({ szer: 36.72, dl: -4.42 }), 'poludnie-hiszpanii', 'Málaga');
  assert.equal(regionPunktu({ szer: 52.23, dl: 21.01 }), 'polska', 'Warszawa');
  assert.equal(regionPunktu({ szer: 54.35, dl: 18.65 }), 'polska', 'Gdańsk');
  assert.equal(regionPunktu({ szer: 40.42, dl: -3.7 }), null, 'Madrid is outside the atlas');
  assert.equal(regionPunktu({ szer: 48.86, dl: 2.35 }), null, 'Paris');
});
