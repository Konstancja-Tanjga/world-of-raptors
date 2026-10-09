import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checklistaV1doV2,
  checklistaZDowolnej,
  isChecklista,
  isChecklistaV1,
  jestWidziany,
  przelaczObserwacje,
  widziane,
  zmienObserwacje,
} from './obserwacje';

const T = '2026-10-09T08:00:00.000Z';
const T2 = '2026-10-10T08:00:00.000Z';

test('v1 to v2 keeps every seen species with its fields', () => {
  const v1 = { kaniuk: { data: '2026-10-01', miejsce: 'Barbate', notatka: 'na słupie' }, rybolow: {} };
  const v2 = checklistaV1doV2(v1, T);
  assert.deepEqual(v2, {
    kaniuk: { widziany: true, data: '2026-10-01', miejsce: 'Barbate', notatka: 'na słupie', zmieniono: T },
    rybolow: { widziany: true, zmieniono: T },
  });
  assert.ok(isChecklista(v2));
  assert.deepEqual(widziane(v2), ['kaniuk', 'rybolow']);
});

test('an empty v1 checklist migrates to an empty v2 one', () => {
  assert.deepEqual(checklistaV1doV2({}, T), {});
});

test('migration drops unknown fields and leaves the v1 object as it was', () => {
  const v1 = { kaniuk: { data: '2026-10-01', zbedne: 'x' } } as never;
  const kopia = structuredClone(v1);
  assert.deepEqual(checklistaV1doV2(v1, T), { kaniuk: { widziany: true, data: '2026-10-01', zmieniono: T } });
  assert.deepEqual(v1, kopia);
});

test('migrating is idempotent: v2 data passes through unchanged', () => {
  const v2 = checklistaV1doV2({ kaniuk: { data: '2026-10-01' } }, T);
  assert.equal(checklistaZDowolnej(v2, T2), v2);
});

test('damaged data is neither v1 nor v2', () => {
  for (const zle of [null, [], 'tekst', 3, { kaniuk: 'tak' }, { kaniuk: { data: 5 } }]) {
    assert.equal(isChecklistaV1(zle), false, JSON.stringify(zle));
    assert.equal(checklistaZDowolnej(zle, T), null, JSON.stringify(zle));
  }
  assert.equal(isChecklista({ kaniuk: { widziany: 'tak', zmieniono: T } }), false);
  assert.equal(isChecklista({ kaniuk: { widziany: true } }), false);
});

test('ticking dates a new species today', () => {
  const lista = przelaczObserwacje({}, 'kaniuk', '2026-10-09', T);
  assert.deepEqual(lista, { kaniuk: { widziany: true, data: '2026-10-09', zmieniono: T } });
});

test('unticking keeps the entry as a tombstone, and ticking again restores its date and note', () => {
  let lista = przelaczObserwacje({}, 'kaniuk', '2026-10-01', T);
  lista = zmienObserwacje(lista, 'kaniuk', { notatka: 'na słupie' }, T);
  lista = przelaczObserwacje(lista, 'kaniuk', '2026-10-05', T2);
  assert.equal(jestWidziany(lista, 'kaniuk'), false);
  assert.deepEqual(widziane(lista), []);
  assert.equal(lista.kaniuk.zmieniono, T2);
  lista = przelaczObserwacje(lista, 'kaniuk', '2026-10-09', T2);
  assert.deepEqual(lista.kaniuk, { widziany: true, data: '2026-10-01', notatka: 'na słupie', zmieniono: T2 });
});

test('an empty text clears its field; other fields stay', () => {
  let lista = przelaczObserwacje({}, 'kaniuk', '2026-10-01', T);
  lista = zmienObserwacje(lista, 'kaniuk', { miejsce: 'Barbate', notatka: 'x' }, T);
  lista = zmienObserwacje(lista, 'kaniuk', { notatka: '' }, T2);
  assert.deepEqual(lista.kaniuk, { widziany: true, data: '2026-10-01', miejsce: 'Barbate', zmieniono: T2 });
});

test('changing a species that is not on the list changes nothing', () => {
  assert.deepEqual(zmienObserwacje({}, 'kaniuk', { notatka: 'x' }, T), {});
});
