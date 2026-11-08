import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ptakiMojegoMiejsca } from './filtrMiejsca';
import type { Dziennik } from './dziennik';
import type { MojeMiejsce } from './mojeMiejsca';
import type { Checklista } from './obserwacje';

const T = '2026-11-08T08:00:00.000Z';
const laki: MojeMiejsce = { nazwa: 'Łąki pod Kampinosem', szer: 52.3, dl: 20.6, data: '2026-11-01', zmieniono: T };

test('birds seen at my place: by the checklist’s place, the log’s place name, or a log point within 1 km', () => {
  const lista: Checklista = {
    czajka: { widziany: true, miejsce: 'łąki pod kampinosem ', zmieniono: T },
    zuraw: { widziany: false, miejsce: 'Łąki pod Kampinosem', zmieniono: T },
    kos: { widziany: true, miejsce: 'Ogród', zmieniono: T },
  };
  const dziennik: Dziennik = {
    '0b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b': { gatunek: 'myszolow', data: '2026-11-08', punkt: { szer: 52.305, dl: 20.6, zrodlo: 'gps' }, zmieniono: T },
    '1b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b': { gatunek: 'dzieciol-duzy', data: '2026-11-08', miejsce: 'ŁĄKI POD KAMPINOSEM', zmieniono: T },
    '2b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b': { gatunek: 'kruk', data: '2026-11-08', punkt: { szer: 52.33, dl: 20.6, zrodlo: 'mapa' }, zmieniono: T },
    '3b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b': { gatunek: 'sroka', data: '2026-11-08', miejsce: 'Łąki pod Kampinosem', usuniety: true, zmieniono: T },
  };
  assert.deepEqual([...ptakiMojegoMiejsca(laki, lista, dziennik)].sort(), ['czajka', 'dzieciol-duzy', 'myszolow']);
});
