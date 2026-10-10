-- Accounts: a signed-in person's lesson progress, checklist, flashcards and
-- earned achievements, mirrored from the browser stores (src/lib/*.ts). The
-- browser stays the first copy (local-first); these tables let it sync
-- between devices.
--
-- Every synced row carries two times:
--   updated_at  when the change was made, on the device. It decides conflicts:
--               the newer change wins, even if it reaches the server later
--               (an edit made offline in the field).
--   synced_at   when the server stored the row. Devices pull the rows whose
--               synced_at is after their last pull, which does not depend on
--               the devices' clocks agreeing.
-- deleted_at marks a row removed on some device (an unticked lesson, an
-- unchecked species), so that a removal syncs like any other change.
--
-- The merge rules live here, in triggers, so a client can upsert blindly and
-- an old or replayed write can never undo a newer one.

create schema if not exists private;

-- Last write wins, by the time of the change on the device. A device clock
-- running ahead is capped at five minutes past the server's, so a wrong clock
-- cannot make a row impossible to change.
create function private.ostatni_zapis_wygrywa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := least(new.updated_at, now() + interval '5 minutes');
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null; -- an older change: keep the stored row
  end if;
  new.synced_at := now();
  return new;
end;
$$;

-- Earned stays earned: the earlier date wins and "shown" is never taken back,
-- as when a backup is loaded (wczytajZKopii in src/lib/zdobyte.ts).
create function private.zdobyte_zostaje()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.awarded_on := least(old.awarded_on, new.awarded_on);
    new.shown := old.shown or new.shown;
  end if;
  new.synced_at := now();
  return new;
end;
$$;

-- Finished lessons (wor:postep:v1). lesson_id is "<module slug>/<lesson slug>",
-- as kluczLekcji() in src/lib/postep.ts writes it.
create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,60}/[a-z0-9-]{1,60}$'),
  completed_on date,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, lesson_id),
  check (deleted_at is not null or completed_on is not null)
);

-- The checklist (wor:checklista:v1): one observation per species, as in the app.
create table public.observations (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  species_slug text not null check (species_slug ~ '^[a-z0-9-]{1,60}$'),
  observed_on date,
  place text check (char_length(place) <= 200),
  note text check (char_length(note) <= 2000),
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, species_slug)
);

-- Flashcard schedules (wor:fiszki:v1). card_id is "<species>/<kind>"; card is
-- the stored FSRS card (ZapisFiszki in src/lib/fiszki.ts), validated by the
-- app before use, as any stored copy is.
create table public.flashcards (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id text not null check (card_id ~ '^[a-z0-9-]{1,60}/[a-z0-9-]{1,20}$'),
  card jsonb not null check (jsonb_typeof(card) = 'object' and pg_column_size(card) <= 2000),
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, card_id)
);

-- Earned achievements (wor:odznaki:v1): the date each was first earned and
-- whether its moment has been shown, so it plays once per account. "start"
-- marks that the first evaluation has run. Never deleted.
create table public.user_badges (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  badge_id text not null check (badge_id ~ '^((gwiazdozbior|mistrz|naszywka):[a-z0-9-]{1,60}|start)$'),
  awarded_on date not null,
  shown boolean not null default false,
  synced_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create trigger ostatni_zapis_wygrywa before insert or update on public.lesson_progress
  for each row execute function private.ostatni_zapis_wygrywa();
create trigger ostatni_zapis_wygrywa before insert or update on public.observations
  for each row execute function private.ostatni_zapis_wygrywa();
create trigger ostatni_zapis_wygrywa before insert or update on public.flashcards
  for each row execute function private.ostatni_zapis_wygrywa();
create trigger zdobyte_zostaje before insert or update on public.user_badges
  for each row execute function private.zdobyte_zostaje();

-- Pulls ask for one person's rows changed since a time.
create index lesson_progress_pobieranie on public.lesson_progress (user_id, synced_at);
create index observations_pobieranie on public.observations (user_id, synced_at);
create index flashcards_pobieranie on public.flashcards (user_id, synced_at);
create index user_badges_pobieranie on public.user_badges (user_id, synced_at);

-- Row level security: a signed-in person reads and writes only their own rows;
-- signed-out visitors (anon) have no policy and so see nothing.
alter table public.lesson_progress enable row level security;
alter table public.observations enable row level security;
alter table public.flashcards enable row level security;
alter table public.user_badges enable row level security;

create policy "own rows: read" on public.lesson_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own rows: add" on public.lesson_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own rows: change" on public.lesson_progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows: read" on public.observations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own rows: add" on public.observations for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own rows: change" on public.observations for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows: read" on public.flashcards for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own rows: add" on public.flashcards for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own rows: change" on public.flashcards for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows: read" on public.user_badges for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own rows: add" on public.user_badges for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own rows: change" on public.user_badges for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- No delete policies: removals are soft (deleted_at), and deleting the
-- account removes every row through the foreign keys' on delete cascade.
