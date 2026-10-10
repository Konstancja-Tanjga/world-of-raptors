import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NiepoprawnaKopia, odczytajKopie } from './kopia';
import { ZMIENIONO_NIEZNANE } from './obserwacje';

const T = '2026-10-09T08:00:00.000Z';

test('a v1 file (a bare checklist) imports as v2', async () => {
  const kopia = await odczytajKopie(JSON.stringify({ kaniuk: { data: '2026-10-01' } }));
  assert.deepEqual(kopia, { checklista: { kaniuk: { widziany: true, data: '2026-10-01', zmieniono: ZMIENIONO_NIEZNANE } } });
});

test('a v2 file moves its checklist forward and keeps progress', async () => {
  const kopia = await odczytajKopie(
    JSON.stringify({ wersja: 2, checklista: { rybolow: {} }, postep: { 'metoda/01-osiem-grup': '2026-09-01' } }),
  );
  assert.deepEqual(kopia.checklista, { rybolow: { widziany: true, zmieniono: ZMIENIONO_NIEZNANE } });
  assert.deepEqual(kopia.postep, { 'metoda/01-osiem-grup': '2026-09-01' });
});

test('a v3 file keeps unticked species as they were', async () => {
  const checklista = {
    kaniuk: { widziany: false, data: '2026-10-01', zmieniono: T },
    rybolow: { widziany: true, zmieniono: T },
  };
  const kopia = await odczytajKopie(JSON.stringify({ wersja: 3, checklista, postep: {} }));
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

test('a v2-shaped checklist in an older file keeps its unticked species', async () => {
  const checklista = { kaniuk: { widziany: false, data: '2026-10-01', zmieniono: T } };
  assert.deepEqual((await odczytajKopie(JSON.stringify(checklista))).checklista, checklista);
  assert.deepEqual((await odczytajKopie(JSON.stringify({ wersja: 2, checklista, postep: {} }))).checklista, checklista);
});

test('a file from a newer version of the course says so', async () => {
  await assert.rejects(odczytajKopie(JSON.stringify({ wersja: 4, checklista: {} })), /nowszej wersji/);
});
