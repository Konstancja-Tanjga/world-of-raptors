import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OPIS_STYLU, pikowanie } from './lot';
import { STYL_LOTU } from './sylwetki';

test('a tucked falcon dives at about 300 km/h and needs hundreds of metres to get there', () => {
  const p = pikowanie(1);
  assert.ok(p.kmh > 280 && p.kmh < 340, `${p.kmh}`);
  assert.ok(p.wysokosc90 > 400 && p.wysokosc90 < 900, `${p.wysokosc90}`);
  assert.ok(pikowanie(0).kmh < 70);
  assert.ok(pikowanie(0.5).kmh > pikowanie(0.4).kmh);
});

test('every flight style a species has is described', () => {
  for (const styl of new Set(Object.values(STYL_LOTU))) assert.ok(styl && OPIS_STYLU[styl]?.opis);
});
