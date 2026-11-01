import assert from 'node:assert/strict';
import { test } from 'node:test';
import { katPionowy } from './scena';

/** The horizontal angle (degrees) a vertical angle gives on a canvas of these proportions. */
const katPoziomy = (pionowy: number, proporcje: number) =>
  (2 * Math.atan(Math.tan((pionowy * Math.PI) / 360) * proporcje) * 180) / Math.PI;

test('at 16:9 and wider the camera keeps the angle the scenes were placed for', () => {
  assert.equal(katPionowy(16 / 9), 32);
  assert.equal(katPionowy(21 / 9), 32);
});

test('on a narrower canvas the horizontal angle stays as at 16:9, so the wings still fit across', () => {
  const szeroko = katPoziomy(32, 16 / 9);
  for (const proporcje of [4 / 3, 1, 3 / 4]) {
    assert.ok(Math.abs(katPoziomy(katPionowy(proporcje), proporcje) - szeroko) < 1e-9, `at ${proporcje}`);
    assert.ok(katPionowy(proporcje) > 32);
  }
});
