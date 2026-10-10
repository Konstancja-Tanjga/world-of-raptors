import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { utworzMagazyn, type AdapterMagazynu } from './magazyn';
import { checklistaZDowolnej, isChecklista, ZMIENIONO_NIEZNANE, type Checklista } from './obserwacje';

const T = '2026-10-09T08:00:00.000Z';

// The store logs unreadable data and refused saves; keep the test output quiet.
beforeEach(() => {
  mock.restoreAll();
  mock.method(console, 'error', () => {});
  mock.method(console, 'warn', () => {});
});

/** Storage kept in a Map, standing in for localStorage. */
function pamiec(poczatek: Record<string, string> = {}): AdapterMagazynu & { dane: Map<string, string> } {
  const dane = new Map(Object.entries(poczatek));
  return {
    dane,
    czytaj: (k) => dane.get(k) ?? null,
    zapisz: (k, t) => void dane.set(k, t),
    nasluchuj: () => () => {},
  };
}

const checklista = (adapter: AdapterMagazynu) =>
  utworzMagazyn<Checklista>('wor:checklista:v2', isChecklista, {
    adapter,
    poprzednia: { klucz: 'wor:checklista:v1', migruj: checklistaZDowolnej },
  });

test('the first read moves v1 forward, saves it as v2 and leaves v1 untouched', () => {
  const v1 = JSON.stringify({ kaniuk: { data: '2026-10-01', notatka: 'na słupie' } });
  const adapter = pamiec({ 'wor:checklista:v1': v1 });
  const lista = checklista(adapter).odczytaj();
  assert.deepEqual(lista, { kaniuk: { widziany: true, data: '2026-10-01', notatka: 'na słupie', zmieniono: ZMIENIONO_NIEZNANE } });
  assert.deepEqual(JSON.parse(adapter.dane.get('wor:checklista:v2')!), lista);
  assert.equal(adapter.dane.get('wor:checklista:v1'), v1);
});

test('once v2 exists, v1 is not read again', () => {
  const adapter = pamiec({
    'wor:checklista:v1': JSON.stringify({ kaniuk: {} }),
    'wor:checklista:v2': JSON.stringify({}),
  });
  assert.deepEqual(checklista(adapter).odczytaj(), {});
});

test('with neither key the store starts empty and writes nothing', () => {
  const adapter = pamiec();
  assert.deepEqual(checklista(adapter).odczytaj(), {});
  assert.equal(adapter.dane.size, 0);
});

test('an unreadable v1 is kept under :bad, and v1 itself stays', () => {
  const adapter = pamiec({ 'wor:checklista:v1': '{nie json' });
  assert.deepEqual(checklista(adapter).odczytaj(), {});
  assert.equal(adapter.dane.get('wor:checklista:v2:bad'), '{nie json');
  assert.equal(adapter.dane.get('wor:checklista:v1'), '{nie json');
  assert.equal(adapter.dane.has('wor:checklista:v2'), false);
});

test('a refused save of the migrated copy still shows the data, and the next read migrates again', () => {
  const adapter = pamiec({ 'wor:checklista:v1': JSON.stringify({ kaniuk: {} }) });
  const zapisz = adapter.zapisz;
  adapter.zapisz = () => {
    throw new Error('QuotaExceededError');
  };
  assert.equal(checklista(adapter).odczytaj().kaniuk.widziany, true);
  adapter.zapisz = zapisz;
  assert.equal(checklista(adapter).odczytaj().kaniuk.widziany, true);
  assert.ok(adapter.dane.has('wor:checklista:v2'));
});

test('a save reports whether the storage took it', () => {
  const adapter = pamiec();
  const m = checklista(adapter);
  assert.equal(m.zapisz({ kaniuk: { widziany: true, zmieniono: T } }), true);
  adapter.zapisz = () => {
    throw new Error('blocked');
  };
  assert.equal(m.zapisz({}), false);
});

test('lesson progress keeps its key: a store without a previous version never touches other keys', () => {
  const postep = JSON.stringify({ 'metoda/01-osiem-grup': '2026-09-01' });
  const adapter = pamiec({ 'wor:postep:v1': postep });
  const m = utworzMagazyn<Record<string, string>>(
    'wor:postep:v1',
    (v): v is Record<string, string> => typeof v === 'object' && v !== null,
    { adapter },
  );
  assert.deepEqual(m.odczytaj(), { 'metoda/01-osiem-grup': '2026-09-01' });
  assert.deepEqual([...adapter.dane.keys()], ['wor:postep:v1']);
});

test('a v1 that parses but has the wrong shape is kept under :bad, and nothing is written as v2', () => {
  const adapter = pamiec({ 'wor:checklista:v1': '{"kaniuk":"tak"}' });
  assert.deepEqual(checklista(adapter).odczytaj(), {});
  assert.equal(adapter.dane.get('wor:checklista:v2:bad'), '{"kaniuk":"tak"}');
  assert.equal(adapter.dane.get('wor:checklista:v1'), '{"kaniuk":"tak"}');
  assert.equal(adapter.dane.has('wor:checklista:v2'), false);
});

test('a broken v2 goes to :bad and does not migrate v1 again; v1 stays as the copy to go back to', () => {
  const v1 = JSON.stringify({ kaniuk: {} });
  const adapter = pamiec({ 'wor:checklista:v1': v1, 'wor:checklista:v2': '{zepsute' });
  assert.deepEqual(checklista(adapter).odczytaj(), {});
  assert.equal(adapter.dane.get('wor:checklista:v2:bad'), '{zepsute');
  assert.equal(adapter.dane.get('wor:checklista:v1'), v1);
});
