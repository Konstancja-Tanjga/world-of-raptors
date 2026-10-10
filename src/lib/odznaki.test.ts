import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checklistaV1doV2, przelaczObserwacje, type Checklista } from './obserwacje';
import type { GrupaListyMiejsca } from './types';
import { NASZYWKI, stanNieba, zdobyteWStanie, type StrukturaNieba } from './odznaki';

const T = '2026-10-09T08:00:00.000Z';
const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);

/** The Marismas list as B6 has it: 8 raptors, the ibis, 5 herons, 14 waders, 4 gulls and terns, the kingfisher, 9 passerines. */
const MARISMAS: { id: GrupaListyMiejsca; gatunki: string[] }[] = [
  { id: 'drapiezniki', gatunki: ids('drapieznik', 8) },
  { id: 'ibisy', gatunki: ['ibis-grzywiasty'] },
  { id: 'czaple', gatunki: ids('czapla', 5) },
  { id: 'siewkowe', gatunki: ids('siewka', 14) },
  { id: 'mewy-i-rybitwy', gatunki: ids('mewa', 4) },
  { id: 'inne-niewroblowe', gatunki: ['zimorodek'] },
  { id: 'wroblowe', gatunki: ids('wroblowy', 9) },
];
const WSZYSTKIE = MARISMAS.flatMap((g) => g.gatunki);

const struktura: StrukturaNieba = {
  moduly: [],
  // A raptor outside the Marismas list, to show it does not count there.
  gatunki: [{ id: 'bielik', pl: 'Bielik', dzienny: true, zdjecia: [], lekcje: [] }],
  osiemGrup: [],
  marismas: MARISMAS,
};

const widziane = (lista: string[]): Checklista =>
  checklistaV1doV2(Object.fromEntries(lista.map((id) => [id, { data: '2026-10-09' }])));

const naszywki = (lista: Checklista) => stanNieba(struktura, {}, {}, lista).naszywki;
const zdobyta = (lista: Checklista, id: string) => naszywki(lista)[id].zdobyta;

test('the seven Marismas patches exist with their stored ids', () => {
  const idy = NASZYWKI.map((n) => n.id);
  for (const id of ['marismas-pierwsza', 'marismas-dziesiatka', 'pol-marismas', 'komplet-marismas', 'drapiezniki-marismas', 'lachy-przy-odplywie', 'ibis-grzywiasty']) {
    assert.ok(idy.includes(id), id);
  }
});

test('nothing is earned from an empty checklist', () => {
  const n = naszywki({});
  for (const id of ['marismas-pierwsza', 'komplet-marismas', 'ibis-grzywiasty']) assert.equal(n[id].zdobyta, false);
  assert.deepEqual(n['komplet-marismas'].postep, [0, 42]);
});

test('the counting patches are earned at 1, 10, 21 and 42 species', () => {
  const progi: [string, number][] = [
    ['marismas-pierwsza', 1],
    ['marismas-dziesiatka', 10],
    ['pol-marismas', 21],
    ['komplet-marismas', 42],
  ];
  for (const [id, prog] of progi) {
    assert.equal(zdobyta(widziane(WSZYSTKIE.slice(0, prog - 1)), id), false, `${id} at ${prog - 1}`);
    assert.equal(zdobyta(widziane(WSZYSTKIE.slice(0, prog)), id), true, `${id} at ${prog}`);
    assert.deepEqual(naszywki(widziane(WSZYSTKIE.slice(0, prog)))[id].postep, [prog, prog]);
  }
});

test('"Drapieżniki Marismas" asks for all eight raptors of the list', () => {
  const drapiezniki = MARISMAS[0].gatunki;
  assert.equal(zdobyta(widziane(drapiezniki.slice(0, 7)), 'drapiezniki-marismas'), false);
  assert.equal(zdobyta(widziane(drapiezniki), 'drapiezniki-marismas'), true);
});

test('"Łachy przy odpływie" asks for all 14 waders, and other groups do not help', () => {
  const siewkowe = MARISMAS[3].gatunki;
  const reszta = WSZYSTKIE.filter((id) => !siewkowe.includes(id));
  assert.equal(zdobyta(widziane([...siewkowe.slice(0, 13), ...reszta]), 'lachy-przy-odplywie'), false);
  assert.deepEqual(naszywki(widziane(siewkowe.slice(0, 13)))['lachy-przy-odplywie'].postep, [13, 14]);
  assert.equal(zdobyta(widziane(siewkowe), 'lachy-przy-odplywie'), true);
});

test('"Ibis grzywiasty" is earned by the ibis alone', () => {
  assert.equal(zdobyta(widziane(['ibis-grzywiasty']), 'ibis-grzywiasty'), true);
  assert.equal(zdobyta(widziane(WSZYSTKIE.filter((id) => id !== 'ibis-grzywiasty')), 'ibis-grzywiasty'), false);
});

test('species outside the Marismas list do not count towards its patches', () => {
  const n = naszywki(widziane(['bielik', 'nieznany-ptak']));
  assert.equal(n['marismas-pierwsza'].zdobyta, false);
  // ...but the raptor still counts for the atlas-wide patches.
  assert.equal(n['pierwszy-lifer'].zdobyta, true);
});

test('unticking takes a species off the Marismas count', () => {
  let lista = przelaczObserwacje({}, 'ibis-grzywiasty', '2026-10-09', T);
  assert.equal(zdobyta(lista, 'ibis-grzywiasty'), true);
  lista = przelaczObserwacje(lista, 'ibis-grzywiasty', '2026-10-09', T);
  assert.equal(zdobyta(lista, 'ibis-grzywiasty'), false);
  assert.deepEqual(naszywki(lista)['marismas-pierwsza'].postep, [0, 1]);
});

test('earned patches become stored keys', () => {
  const klucze = zdobyteWStanie(stanNieba(struktura, {}, {}, widziane(['ibis-grzywiasty'])));
  assert.ok(klucze.includes('naszywka:ibis-grzywiasty'));
  assert.ok(klucze.includes('naszywka:marismas-pierwsza'));
  assert.ok(!klucze.includes('naszywka:marismas-dziesiatka'));
});

test('an unticked raptor earns no lifer and no gold ring', () => {
  let lista = przelaczObserwacje({}, 'bielik', '2026-10-09', T);
  assert.equal(stanNieba(struktura, {}, {}, lista).gatunki.bielik.widzialam, true);
  lista = przelaczObserwacje(lista, 'bielik', '2026-10-09', T);
  const s = stanNieba(struktura, {}, {}, lista);
  assert.equal(s.gatunki.bielik.widzialam, false);
  assert.equal(s.lifery, 0);
  assert.equal(s.naszywki['pierwszy-lifer'].zdobyta, false);
});

test('a raptor on the Marismas list counts for both; a bird of marshes is not a lifer', () => {
  const obie: StrukturaNieba = {
    ...struktura,
    gatunki: [...struktura.gatunki, { id: 'kaniuk', pl: 'Kaniuk', dzienny: true, zdjecia: [], lekcje: [] }],
    marismas: [{ id: 'drapiezniki', gatunki: ['kaniuk'] }, { id: 'czaple', gatunki: ['flaming-rozowy'] }],
  };
  const kaniuk = stanNieba(obie, {}, {}, widziane(['kaniuk']));
  assert.equal(kaniuk.naszywki['pierwszy-lifer'].zdobyta, true);
  assert.equal(kaniuk.naszywki['marismas-pierwsza'].zdobyta, true);
  assert.equal(kaniuk.gatunki.kaniuk.widzialam, true);
  const flaming = stanNieba(obie, {}, {}, widziane(['flaming-rozowy']));
  assert.equal(flaming.naszywki['marismas-pierwsza'].zdobyta, true);
  assert.equal(flaming.naszywki['pierwszy-lifer'].zdobyta, false);
});
