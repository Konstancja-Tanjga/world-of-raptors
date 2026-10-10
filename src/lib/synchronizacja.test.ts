/**
 * Syncing against the real migrations (supabase/migrations/) on PGlite: two
 * devices of one person, each with its own stores, and a third person. The
 * server side is plain SQL run as the signed-in person, as Supabase's API
 * would, so the triggers' merge rules and row level security take part.
 */
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { before, test } from 'node:test';
import type { Fiszki, ZapisFiszki } from './fiszki';
import type { Checklista } from './obserwacje';
import {
  FISZKI,
  LEKCJE,
  OBSERWACJE,
  ODZNAKI,
  PUSTY_STAN,
  synchronizuj,
  type Polaczenie,
  type PostepZeSladami,
  type StanSynchronizacji,
  type Zdalne,
} from './synchronizacja';
import type { Zdobyte } from './zdobyte';

const JA = '00000000-0000-0000-0000-0000000000a1';
const OBCA = '00000000-0000-0000-0000-0000000000b2';
let db: PGlite;

async function jako(kto: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${kto}', false); set role authenticated;`);
  try {
    return (await db.query<Record<string, unknown>>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

/** Supabase's API for one signed-in person, as plain SQL. */
function serwer(kto: string): Zdalne {
  return {
    pobierz: (tabela, od) =>
      jako(kto, `select * from public.${tabela} ${od ? 'where synced_at > $1' : ''} order by synced_at`, od ? [od] : []),
    pobierzKlucze: (tabela, klucz, klucze) => jako(kto, `select * from public.${tabela} where ${klucz} = any($1)`, [klucze]),
    async wyslij(tabela, klucz, wiersze) {
      for (const w of wiersze) {
        const kolumny = Object.keys(w);
        const wartosci = kolumny.map((k) => (typeof w[k] === 'object' && w[k] !== null ? JSON.stringify(w[k]) : w[k]));
        const zmiany = kolumny.filter((k) => k !== klucz).map((k) => `${k} = excluded.${k}`);
        await jako(
          kto,
          `insert into public.${tabela} (${kolumny.join(', ')}) values (${kolumny.map((_, i) => `$${i + 1}`).join(', ')})
           on conflict (user_id, ${klucz}) do update set ${zmiany.join(', ')}`,
          wartosci,
        );
      }
    },
  };
}

type Urzadzenie = {
  postep: PostepZeSladami;
  checklista: Checklista;
  fiszki: Fiszki;
  odznaki: Zdobyte;
  stan: StanSynchronizacji;
};

const urzadzenie = (zmiany: Partial<Urzadzenie> = {}): Urzadzenie => ({
  postep: { postep: {}, slady: {} },
  checklista: {},
  fiszki: {},
  odznaki: {},
  stan: PUSTY_STAN,
  ...zmiany,
});

function polaczenia(u: Urzadzenie) {
  const pol = <K extends 'postep' | 'checklista' | 'fiszki' | 'odznaki'>(k: K, tabela: Polaczenie<Urzadzenie[K]>['tabela']) => ({
    tabela,
    czytaj: () => u[k],
    zapisz: (l: Urzadzenie[K]) => {
      u[k] = l;
      return true;
    },
  });
  return [pol('postep', LEKCJE), pol('checklista', OBSERWACJE), pol('fiszki', FISZKI), pol('odznaki', ODZNAKI)];
}

async function synchronizujUrzadzenie(u: Urzadzenie, kto = JA) {
  const wynik = await synchronizuj(serwer(kto), polaczenia(u), u.stan, kto);
  u.stan = wynik.stan;
  return wynik;
}

const karta = (lastReview: string): ZapisFiszki => ({
  due: '2026-10-20T08:00:00.000Z',
  stability: 3.2,
  difficulty: 5,
  elapsed_days: 0,
  scheduled_days: 3,
  learning_steps: 0,
  reps: 2,
  lapses: 0,
  state: 2,
  last_review: lastReview,
  wprowadzona: '2026-10-01',
});

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    insert into auth.users values ('${JA}'), ('${OBCA}');
  `);
  const migracje = path.join(import.meta.dirname, '..', '..', 'supabase', 'migrations');
  for (const plik of readdirSync(migracje).filter((p) => p.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(migracje, plik), 'utf8'));
  }
  await db.exec(`grant usage on schema public to anon, authenticated;`);
});

// The tests run in order and share the server, as one person's devices do.
const laptop = urzadzenie({
  postep: { postep: { 'metoda/01-sylwetka': '2026-09-01', 'metoda/02-lot': '2026-09-03' }, slady: {} },
  checklista: {
    kaniuk: { widziany: true, data: '2026-09-10', miejsce: 'La Janda', zmieniono: '2026-09-10T18:00:00.000Z' },
    rybolow: { widziany: false, data: '2026-08-02', zmieniono: '2026-09-12T09:00:00.000Z' },
  },
  fiszki: { 'kaniuk/lot': karta('2026-10-01T09:00:00.000Z') },
  odznaki: { start: { data: '2026-09-01', pokazana: true }, 'gwiazdozbior:metoda': { data: '2026-09-20', pokazana: true } },
});
const telefon = urzadzenie();

test('the first sign-in on a device adds what it holds to the account', async () => {
  const wynik = await synchronizujUrzadzenie(laptop);
  assert.equal(wynik.pierwsza, true);
  assert.deepEqual(wynik.wyslane, { lesson_progress: 2, observations: 2, flashcards: 1, user_badges: 2 });
});

test('a second device with nothing on it receives everything, unticked species included', async () => {
  const wynik = await synchronizujUrzadzenie(telefon);
  assert.deepEqual(telefon.postep.postep, laptop.postep.postep);
  assert.deepEqual(telefon.checklista, laptop.checklista);
  assert.deepEqual(telefon.fiszki, laptop.fiszki);
  assert.deepEqual(telefon.odznaki, laptop.odznaki);
  assert.deepEqual(wynik.wyslane, { lesson_progress: 0, observations: 0, flashcards: 0, user_badges: 0 });
});

test('a pass with nothing new sends nothing and changes nothing', async () => {
  const wynik = await synchronizujUrzadzenie(laptop);
  assert.deepEqual(wynik.wyslane, { lesson_progress: 0, observations: 0, flashcards: 0, user_badges: 0 });
  assert.equal(Object.values(wynik.pobrane).reduce((a, b) => a + b, 0), 0);
});

test('unticking a lesson and a species on one device unticks them on the other', async () => {
  delete telefon.postep.postep['metoda/02-lot'];
  telefon.postep.slady['metoda/02-lot'] = { t: '2026-10-05T10:00:00.000Z', usunieta: true };
  telefon.checklista.kaniuk = { ...telefon.checklista.kaniuk, widziany: false, zmieniono: '2026-10-05T10:00:00.000Z' };
  await synchronizujUrzadzenie(telefon);
  await synchronizujUrzadzenie(laptop);
  assert.equal(laptop.postep.postep['metoda/02-lot'], undefined);
  assert.equal(laptop.checklista.kaniuk.widziany, false);
  assert.equal(laptop.checklista.kaniuk.miejsce, 'La Janda', 'an untick keeps the place, so ticking again restores it');
});

test('an older change made offline loses to a newer one, on both devices and the server', async () => {
  // The laptop is offline and writes a note at 11:00; the phone writes one at 12:00 and syncs first.
  laptop.checklista.kaniuk = { ...laptop.checklista.kaniuk, widziany: true, notatka: 'laptop', zmieniono: '2026-10-06T11:00:00.000Z' };
  telefon.checklista.kaniuk = { ...telefon.checklista.kaniuk, widziany: true, notatka: 'telefon', zmieniono: '2026-10-06T12:00:00.000Z' };
  await synchronizujUrzadzenie(telefon);
  await synchronizujUrzadzenie(laptop);
  assert.equal(laptop.checklista.kaniuk.notatka, 'telefon');
  const [w] = await jako(JA, `select note from public.observations where species_slug = 'kaniuk'`);
  assert.equal(w.note, 'telefon');
});

test('a newer change made offline wins when it arrives later', async () => {
  laptop.checklista.kaniuk = { ...laptop.checklista.kaniuk, notatka: 'laptop, później', zmieniono: '2026-10-06T13:00:00.000Z' };
  await synchronizujUrzadzenie(laptop);
  await synchronizujUrzadzenie(telefon);
  assert.equal(telefon.checklista.kaniuk.notatka, 'laptop, później');
});

test('an achievement keeps its earliest date and, once shown anywhere, is not shown again', async () => {
  telefon.odznaki['naszywka:sowy'] = { data: '2026-10-07' };
  laptop.odznaki['naszywka:sowy'] = { data: '2026-10-03', pokazana: true };
  await synchronizujUrzadzenie(telefon);
  await synchronizujUrzadzenie(laptop);
  await synchronizujUrzadzenie(telefon);
  assert.deepEqual(telefon.odznaki['naszywka:sowy'], { data: '2026-10-03', pokazana: true });
  assert.deepEqual(laptop.odznaki['naszywka:sowy'], { data: '2026-10-03', pokazana: true });
});

test('a flashcard answered later on one device replaces the older schedule', async () => {
  telefon.fiszki['kaniuk/lot'] = { ...karta('2026-10-08T07:00:00.000Z'), reps: 3 };
  await synchronizujUrzadzenie(telefon);
  await synchronizujUrzadzenie(laptop);
  assert.equal(laptop.fiszki['kaniuk/lot'].reps, 3);
});

test('a row the app cannot read is skipped, and the pass goes on', async () => {
  await jako(JA, `insert into public.flashcards (card_id, card, updated_at) values ('kania-ruda/lot', '{"zepsuta": true}', now())`);
  await jako(JA, `insert into public.lesson_progress (lesson_id, completed_on, updated_at) values ('metoda/03-upierzenie-i-wiek', '2026-10-08', now())`);
  await synchronizujUrzadzenie(laptop);
  assert.equal(laptop.fiszki['kania-ruda/lot'], undefined);
  assert.equal(laptop.postep.postep['metoda/03-upierzenie-i-wiek'], '2026-10-08');
});

test("another person's account sees none of it, and a device switching accounts starts over", async () => {
  const obca = urzadzenie();
  await synchronizujUrzadzenie(obca, OBCA);
  assert.deepEqual(obca.checklista, {});
  assert.deepEqual(obca.postep.postep, {});
  const wynik = await synchronizujUrzadzenie(urzadzenie({ stan: laptop.stan, checklista: { kaniuk: laptop.checklista.kaniuk } }), OBCA);
  assert.equal(wynik.pierwsza, true);
  assert.equal(wynik.wyslane.observations, 1);
});

test('restoring an older backup here does not leave this device and the account apart', async () => {
  const ze_serwera = laptop.checklista.kaniuk;
  // The backup holds the species as it was in September, with its old change time.
  laptop.checklista.kaniuk = { widziany: true, data: '2026-09-10', miejsce: 'z kopii', zmieniono: '2026-09-10T18:00:00.000Z' };
  await synchronizujUrzadzenie(laptop);
  assert.deepEqual(laptop.checklista.kaniuk, ze_serwera, 'the server kept the newer entry, and this device takes it back');
  const wynik = await synchronizujUrzadzenie(laptop);
  assert.equal(wynik.wyslane.observations, 0);
});

test('an entry the server will never accept is skipped and reported, and the rest still syncs', async () => {
  laptop.checklista['Zly-Klucz'] = { widziany: true, zmieniono: '2026-10-09T10:00:00.000Z' };
  laptop.checklista.pustulka = { widziany: true, zmieniono: '2026-10-09T10:00:00.000Z' };
  const wynik = await synchronizujUrzadzenie(laptop);
  assert.equal(wynik.odrzucone.observations, 1);
  assert.equal(wynik.wyslane.observations, 1);
  assert.deepEqual(wynik.bledy, []);
  const nastepny = await synchronizujUrzadzenie(laptop);
  assert.equal(nastepny.wyslane.observations, 0, 'the refused entry is not sent again until it changes');
  assert.equal(nastepny.odrzucone.observations, 0);
  delete laptop.checklista['Zly-Klucz'];
});

test('a device whose clock runs fast does not send the same entry on every pass', async () => {
  laptop.checklista.sokol = { widziany: true, zmieniono: '2099-01-01T00:00:00.000Z' };
  const pierwszy = await synchronizujUrzadzenie(laptop);
  assert.equal(pierwszy.wyslane.observations, 1);
  const drugi = await synchronizujUrzadzenie(laptop);
  assert.equal(drugi.wyslane.observations, 0);
});

test('a table that cannot sync is reported, and the other tables still sync', async () => {
  const zepsuty: Zdalne = {
    ...serwer(JA),
    pobierz: (tabela, od) => (tabela === 'observations' ? Promise.reject(new TypeError('Failed to fetch')) : serwer(JA).pobierz(tabela, od)),
  };
  telefon.postep.postep['metoda/04-warunki-i-pulapki'] = '2026-10-09';
  const wynik = await synchronizuj(zepsuty, polaczenia(telefon), telefon.stan, JA);
  telefon.stan = wynik.stan;
  assert.deepEqual(wynik.bledy.map((b) => [b.tabela, b.rodzaj]), [['observations', 'siec']]);
  assert.equal(wynik.wyslane.lesson_progress, 1);
});

test('an edit made while its entry is on its way to the server is sent by the next pass', async () => {
  const zwykly = serwer(JA);
  let raz = false;
  const wolny: Zdalne = {
    ...zwykly,
    async wyslij(tabela, klucz, wiersze) {
      await zwykly.wyslij(tabela, klucz, wiersze);
      // The person adds a note while the upsert is in flight.
      if (tabela === 'observations' && !raz) {
        raz = true;
        telefon.checklista.kaniuk = { ...telefon.checklista.kaniuk, notatka: 'dopisana w trakcie', zmieniono: '2026-10-10T09:00:01.000Z' };
      }
    },
  };
  telefon.checklista.kaniuk = { ...telefon.checklista.kaniuk, notatka: 'przed', zmieniono: '2026-10-10T09:00:00.000Z' };
  telefon.stan = (await synchronizuj(wolny, polaczenia(telefon), telefon.stan, JA)).stan;
  await synchronizujUrzadzenie(telefon);
  const [w] = await jako(JA, `select note from public.observations where species_slug = 'kaniuk'`);
  assert.equal(w.note, 'dopisana w trakcie');
});

test('a device whose clock runs fast still takes a newer change from another device', async () => {
  laptop.checklista.orzel = { widziany: true, zmieniono: '2099-01-01T00:00:00.000Z' };
  await synchronizujUrzadzenie(laptop);
  // The phone, with a right clock, changes it a little later than the time the server gave the laptop's change.
  await synchronizujUrzadzenie(telefon);
  telefon.checklista.orzel = { ...telefon.checklista.orzel, notatka: 'z telefonu', zmieniono: new Date(Date.now() + 6 * 60 * 1000).toISOString() };
  await synchronizujUrzadzenie(telefon);
  await synchronizujUrzadzenie(laptop);
  assert.equal(laptop.checklista.orzel.notatka, 'z telefonu');
});
