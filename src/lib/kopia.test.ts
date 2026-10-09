import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NiepoprawnaKopia, odczytajKopie } from './kopia';

const T = '2026-10-09T08:00:00.000Z';

test('a v1 file (a bare checklist) imports as v2', async () => {
  const kopia = await odczytajKopie(JSON.stringify({ kaniuk: { data: '2026-10-01' } }), T);
  assert.deepEqual(kopia, { checklista: { kaniuk: { widziany: true, data: '2026-10-01', zmieniono: T } } });
});

test('a v2 file moves its checklist forward and keeps progress', async () => {
  const kopia = await odczytajKopie(
    JSON.stringify({ wersja: 2, checklista: { rybolow: {} }, postep: { 'metoda/01-osiem-grup': '2026-09-01' } }),
    T,
  );
  assert.deepEqual(kopia.checklista, { rybolow: { widziany: true, zmieniono: T } });
  assert.deepEqual(kopia.postep, { 'metoda/01-osiem-grup': '2026-09-01' });
});

test('a v3 file keeps unticked species as they were', async () => {
  const checklista = {
    kaniuk: { widziany: false, data: '2026-10-01', zmieniono: T },
    rybolow: { widziany: true, zmieniono: T },
  };
  const kopia = await odczytajKopie(JSON.stringify({ wersja: 3, checklista, postep: {} }), '2030-01-01T00:00:00.000Z');
  assert.deepEqual(kopia.checklista, checklista);
});

test('a v3 file with a v1-shaped checklist is refused', async () => {
  await assert.rejects(
    odczytajKopie(JSON.stringify({ wersja: 3, checklista: { kaniuk: {} }, postep: {} })),
    NiepoprawnaKopia,
  );
});

test('a file that is not a backup is refused before anything is written', async () => {
  await assert.rejects(odczytajKopie('nie json'), NiepoprawnaKopia);
  await assert.rejects(odczytajKopie(JSON.stringify([1, 2])), NiepoprawnaKopia);
  await assert.rejects(odczytajKopie(JSON.stringify({ wersja: 2, checklista: { kaniuk: 'tak' } })), NiepoprawnaKopia);
});
