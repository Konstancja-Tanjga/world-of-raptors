/**
 * The accounts migration on a real Postgres (PGlite, in-process, no Docker),
 * with a stub of the parts of Supabase it relies on: auth.users, auth.uid()
 * read from the request's JWT claim, and the anon and authenticated roles.
 * Covers the merge rules the triggers enforce, the data limits, row level
 * security between two people, and deleting an account.
 */
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { before, describe, it } from 'node:test';

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const MIGRACJE = path.join(import.meta.dirname, '..', 'migrations');

let db: PGlite;

/** Runs one statement as a signed-in person (`kto`) or as a signed-out visitor (null). */
async function jako<T = Record<string, unknown>>(kto: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${kto ?? ''}', false);`);
  await db.exec(`set role ${kto ? 'authenticated' : 'anon'}`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

const lekcja = (kto: string, id: string, data: string | null, kiedy: string, usunieta: string | null = null) =>
  jako(
    kto,
    `insert into public.lesson_progress (lesson_id, completed_on, updated_at, deleted_at) values ($1, $2, $3, $4)
     on conflict (user_id, lesson_id) do update
       set completed_on = excluded.completed_on, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
    [id, data, kiedy, usunieta],
  );

const odznaka = (kto: string, id: string, data: string, pokazana: boolean) =>
  jako(
    kto,
    `insert into public.user_badges (badge_id, awarded_on, shown) values ($1, $2, $3)
     on conflict (user_id, badge_id) do update set awarded_on = excluded.awarded_on, shown = excluded.shown`,
    [id, data, pokazana],
  );

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    insert into auth.users values ('${A}'), ('${B}');
  `);
  for (const plik of readdirSync(MIGRACJE).filter((p) => p.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(MIGRACJE, plik), 'utf8'));
  }
  // Supabase grants these to both roles on public tables; RLS decides the rest.
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  `);
});

describe('merge rules', () => {
  it('a stale write from an offline device does not undo a newer change', async () => {
    await lekcja(A, 'anatomia/01-wzrok', '2026-10-01', '2026-10-01T10:00:00Z');
    await lekcja(A, 'anatomia/01-wzrok', null, '2026-10-02T10:00:00Z', '2026-10-02T10:00:00Z');
    await lekcja(A, 'anatomia/01-wzrok', '2026-10-01', '2026-10-01T12:00:00Z');
    const [w] = await jako<{ deleted_at: string | null }>(A, `select deleted_at from public.lesson_progress where lesson_id = 'anatomia/01-wzrok'`);
    assert.notEqual(w.deleted_at, null);
  });

  it('caps a device clock running ahead, so a row stays changeable', async () => {
    await lekcja(A, 'anatomia/02-szpony-stopy-dziob', '2026-10-01', '2099-01-01T00:00:00Z');
    const [w] = await jako<{ ok: boolean }>(
      A,
      `select updated_at < now() + interval '6 minutes' as ok from public.lesson_progress where lesson_id = 'anatomia/02-szpony-stopy-dziob'`,
    );
    assert.equal(w.ok, true);
  });

  it('keeps the earliest date of an achievement, and "shown" once shown', async () => {
    await odznaka(A, 'gwiazdozbior:anatomia', '2026-10-05', true);
    await odznaka(A, 'gwiazdozbior:anatomia', '2026-10-07', false);
    let [w] = await jako<{ d: string; shown: boolean }>(A, `select awarded_on::text as d, shown from public.user_badges where badge_id = 'gwiazdozbior:anatomia'`);
    assert.deepEqual(w, { d: '2026-10-05', shown: true });
    await odznaka(A, 'gwiazdozbior:anatomia', '2026-10-01', false);
    [w] = await jako<{ d: string; shown: boolean }>(A, `select awarded_on::text as d, shown from public.user_badges where badge_id = 'gwiazdozbior:anatomia'`);
    assert.deepEqual(w, { d: '2026-10-01', shown: true });
  });
});

describe('data limits', () => {
  it('rejects malformed keys and values', async () => {
    await assert.rejects(lekcja(A, 'Zły klucz', '2026-10-01', '2026-10-01T10:00:00Z'));
    await assert.rejects(lekcja(A, 'anatomia/03-skrzydla-i-lot', null, '2026-10-01T10:00:00Z'));
    await assert.rejects(odznaka(A, 'cokolwiek', '2026-10-01', true));
    await assert.rejects(odznaka(A, 'nieznana:x', '2026-10-01', true));
    await assert.rejects(jako(A, `insert into public.flashcards (card_id, card, updated_at) values ('kania-ruda/lot', '[1]', now())`),);
    await assert.rejects(jako(A, `insert into public.observations (species_slug, note, updated_at) values ('kaniuk', repeat('x', 2001), now())`),);
  });

  it('accepts the shapes the app stores', async () => {
    await odznaka(A, 'start', '2026-10-01', true);
    await jako(A, `insert into public.flashcards (card_id, card, updated_at) values ('kania-ruda/lot', '{"due":"2026-10-10T00:00:00Z"}', now())`);
    await jako(A, `insert into public.observations (species_slug, observed_on, place, updated_at) values ('kania-ruda', '2026-10-01', 'Tarifa', now())`);
  });
});

describe('row level security', () => {
  it('lets nobody else read, change, add or delete my rows', async () => {
    assert.equal((await jako(B, `select * from public.lesson_progress`)).length, 0);
    assert.equal((await jako(B, `update public.lesson_progress set deleted_at = now() returning 1`)).length, 0);
    await assert.rejects(jako(B, `insert into public.observations (user_id, species_slug, updated_at) values ('${A}', 'kaniuk', now())`),);
    assert.equal((await jako(B, `delete from public.lesson_progress returning 1`)).length, 0);
    assert.notEqual((await jako(A, `select * from public.lesson_progress`)).length, 0);
  });

  it('gives a signed-out visitor nothing', async () => {
    assert.equal((await jako(null, `select * from public.lesson_progress`)).length, 0);
    await assert.rejects(jako(null, `insert into public.observations (species_slug, updated_at) values ('kaniuk', now())`));
  });
});

describe('per-account limits', () => {
  it('stops new rows at the cap but still lets the account change its own', async () => {
    await jako(
      B,
      `insert into public.flashcards (card_id, card, updated_at)
       select 'gatunek-' || i || '/lot', '{}'::jsonb, now() from generate_series(1, 1000) i`,
    );
    await assert.rejects(
      jako(B, `insert into public.flashcards (card_id, card, updated_at) values ('jeszcze-jeden/lot', '{}', now())`),
      /account limit/,
    );
    await jako(
      B,
      `insert into public.flashcards (card_id, card, updated_at) values ('gatunek-1/lot', '{"zmiana":1}', now() + interval '1 second')
       on conflict (user_id, card_id) do update set card = excluded.card, updated_at = excluded.updated_at`,
    );
    const [w] = await jako<{ card: { zmiana?: number } }>(B, `select card from public.flashcards where card_id = 'gatunek-1/lot'`);
    assert.equal(w.card.zmiana, 1);
  });

  it("counts each account separately", async () => {
    await jako(A, `insert into public.flashcards (card_id, card, updated_at) values ('kaniuk/lot', '{}', now())`);
  });
});

describe('deleting an account', () => {
  it('deletes every row of it', async () => {
    await db.exec(`delete from auth.users where id = '${A}'`);
    await db.exec(`delete from auth.users where id = '${B}'`);
    const [w] = (
      await db.query<{ n: number }>(
        `select ((select count(*) from public.lesson_progress) + (select count(*) from public.observations)
               + (select count(*) from public.flashcards) + (select count(*) from public.user_badges))::int as n`,
      )
    ).rows;
    assert.equal(w.n, 0);
  });
});
