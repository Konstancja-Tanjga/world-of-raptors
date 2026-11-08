import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checklistaPoWpisie,
  isDziennik,
  nazwaWPoblizu,
  odmiana,
  oczyscWpis,
  punktSlownie,
  usunWpis,
  uzyteMiejsca,
  wpisy,
  zapiszWpis,
  type Dziennik,
} from './dziennik';
import type { Checklista } from './obserwacje';

const T = '2026-11-08T08:00:00.000Z';
const T2 = '2026-11-08T09:00:00.000Z';
const A = '0b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';
const B = '1b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';
const C = '2b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';

const czajka = { gatunek: 'czajka', data: '2026-11-08', godzina: '07:40', miejsce: 'Łąki pod Kampinosem' };

test('an entry is saved trimmed, with empty texts dropped and the accuracy in whole metres', () => {
  const d = zapiszWpis({}, A, { ...czajka, notatka: '  ', liczba: 12.4, punkt: { szer: 52.3, dl: 20.6, zrodlo: 'gps', dokladnosc: 8.7 } }, T);
  assert.deepEqual(d[A], {
    gatunek: 'czajka',
    data: '2026-11-08',
    godzina: '07:40',
    miejsce: 'Łąki pod Kampinosem',
    liczba: 12,
    punkt: { szer: 52.3, dl: 20.6, zrodlo: 'gps', dokladnosc: 9 },
    zmieniono: T,
  });
  assert.ok(isDziennik(d));
});

test('texts are cut to the server limits and counts kept within them', () => {
  const w = oczyscWpis({ gatunek: 'czajka', data: '2026-11-08', miejsce: 'x'.repeat(300), notatka: 'y'.repeat(3000), liczba: 0 });
  assert.equal(w.miejsce?.length, 200);
  assert.equal(w.notatka?.length, 2000);
  assert.equal(w.liczba, 1);
});

test('the store check refuses malformed entries and ids', () => {
  const dobry = { gatunek: 'czajka', data: '2026-11-08', zmieniono: T };
  assert.ok(isDziennik({ [A]: dobry }));
  assert.ok(!isDziennik({ 'nie-uuid': dobry }));
  assert.ok(!isDziennik({ [A]: { ...dobry, gatunek: 'Czajka' } }));
  assert.ok(!isDziennik({ [A]: { ...dobry, data: '8.11.2026' } }));
  assert.ok(!isDziennik({ [A]: { ...dobry, godzina: '25:00' } }));
  assert.ok(!isDziennik({ [A]: { ...dobry, liczba: 2.5 } }));
  assert.ok(!isDziennik({ [A]: { ...dobry, punkt: { szer: 95, dl: 0, zrodlo: 'gps' } } }));
  assert.ok(!isDziennik({ [A]: { ...dobry, punkt: { szer: 52, dl: 21, zrodlo: 'ip' } } }));
  assert.ok(!isDziennik({ [A]: { ...dobry, usuniety: false } }));
  assert.ok(!isDziennik([]));
});

test('removing keeps a tombstone; saving the same id again brings the entry back', () => {
  let d = zapiszWpis({}, A, czajka, T);
  d = usunWpis(d, A, T2);
  assert.equal(d[A].usuniety, true);
  assert.equal(d[A].zmieniono, T2);
  assert.deepEqual(wpisy(d), []);
  d = zapiszWpis(d, A, czajka, T2);
  assert.equal(d[A].usuniety, undefined);
  assert.deepEqual(usunWpis({}, A, T), {}, 'removing an unknown id changes nothing');
});

test('entries are listed latest first, by day then time, an entry without a time last in its day', () => {
  let d: Dziennik = {};
  d = zapiszWpis(d, A, { gatunek: 'czajka', data: '2026-11-07', godzina: '16:00' }, T);
  d = zapiszWpis(d, B, { gatunek: 'zuraw', data: '2026-11-08' }, T);
  d = zapiszWpis(d, C, { gatunek: 'czajka', data: '2026-11-08', godzina: '07:40' }, T);
  assert.deepEqual(wpisy(d).map(([id]) => id), [C, B, A]);
  assert.deepEqual(wpisy(d, 'czajka').map(([id]) => id), [C, A]);
});

test('a sighting of a species not yet seen ticks it, dated and placed by the sighting', () => {
  const po = checklistaPoWpisie({}, czajka, T);
  assert.deepEqual(po.czajka, { widziany: true, data: '2026-11-08', miejsce: 'Łąki pod Kampinosem', zmieniono: T });
});

test('an unticked species comes back with its note; its old place stays when the sighting names none', () => {
  const lista: Checklista = { czajka: { widziany: false, data: '2026-03-01', miejsce: 'Biebrza', notatka: 'tok', zmieniono: T } };
  const po = checklistaPoWpisie(lista, { gatunek: 'czajka', data: '2026-11-08' }, T2);
  assert.deepEqual(po.czajka, { widziany: true, data: '2026-11-08', miejsce: 'Biebrza', notatka: 'tok', zmieniono: T2 });
});

test('a later sighting of a seen species leaves the checklist as it was; an earlier one moves its first date back', () => {
  const lista: Checklista = { czajka: { widziany: true, data: '2026-11-01', miejsce: 'Biebrza', zmieniono: T } };
  assert.equal(checklistaPoWpisie(lista, czajka, T2), lista);
  const wczesniej = checklistaPoWpisie(lista, { ...czajka, data: '2026-10-20' }, T2);
  assert.deepEqual(wczesniej.czajka, { widziany: true, data: '2026-10-20', miejsce: 'Łąki pod Kampinosem', zmieniono: T2 });
  const bezDaty: Checklista = { czajka: { widziany: true, zmieniono: T } };
  assert.equal(checklistaPoWpisie(bezDaty, czajka, T2).czajka.data, '2026-11-08', 'a seen species without a date takes the sighting’s');
});

test('a point near an earlier named sighting is offered that name; a far one none', () => {
  let d = zapiszWpis({}, A, { ...czajka, punkt: { szer: 52.3, dl: 20.6, zrodlo: 'gps' } }, T);
  d = zapiszWpis(d, B, { gatunek: 'zuraw', data: '2026-11-08', miejsce: 'Usunięte', punkt: { szer: 52.3, dl: 20.6, zrodlo: 'mapa' } }, T);
  d = usunWpis(d, B, T2);
  assert.equal(nazwaWPoblizu(d, { szer: 52.302, dl: 20.601 }), 'Łąki pod Kampinosem', 'about 230 m away');
  assert.equal(nazwaWPoblizu(d, { szer: 52.32, dl: 20.6 }), undefined, 'about 2 km away');
});

test('place names are suggested most used first', () => {
  let d = zapiszWpis({}, A, { gatunek: 'czajka', data: '2026-11-08', miejsce: 'Biebrza' }, T);
  d = zapiszWpis(d, B, { gatunek: 'zuraw', data: '2026-11-08', miejsce: 'Kampinos' }, T);
  d = zapiszWpis(d, C, { gatunek: 'zuraw', data: '2026-11-09', miejsce: 'Kampinos' }, T);
  assert.deepEqual(uzyteMiejsca(d), ['Kampinos', 'Biebrza']);
});

test('a point reads as degrees with hemispheres', () => {
  assert.equal(punktSlownie({ szer: 36.18, dl: -5.93 }), '36.18000° N, 5.93000° W');
});

test('nouns after numbers take the Polish plural forms', () => {
  const ptak = ['ptak', 'ptaki', 'ptaków'] as const;
  assert.deepEqual([1, 2, 4, 5, 12, 14, 22, 25, 112].map((n) => odmiana(n, ptak)), ['ptak', 'ptaki', 'ptaki', 'ptaków', 'ptaków', 'ptaków', 'ptaki', 'ptaków', 'ptaków']);
});
