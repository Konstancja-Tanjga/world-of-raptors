-- "Moje miejsca" (wor:miejsca:v1, src/lib/mojeMiejsca.ts): observation places
-- a signed-in person adds from her phone's location. Synced like the other
-- stores (20261009120000_konta.sql): the newer change on the device wins,
-- synced_at is the server's time pulls page by, and a removed place stays as
-- a row with deleted_at so the removal reaches other devices.

create table public.places (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id text not null check (place_id ~ '^[a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m integer check (accuracy_m >= 0),
  first_visit date not null,
  note text check (char_length(note) <= 2000),
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, place_id)
);

create trigger ostatni_zapis_wygrywa before insert or update on public.places
  for each row execute function private.ostatni_zapis_wygrywa();

-- The app allows 500 places not removed; removed ones stay as rows and count
-- too, so this leaves room for about 500 removals on top of a full set.
create trigger limit_wierszy before insert on public.places
  for each row execute function private.limit_wierszy('1000', 'place_id');

create index places_pobieranie on public.places (user_id, synced_at);

alter table public.places enable row level security;

create policy "own rows: read" on public.places for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own rows: add" on public.places for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own rows: change" on public.places for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- As for the other tables: no delete policy (removals are soft; deleting the
-- account removes the rows through on delete cascade).
grant select, insert, update on public.places to authenticated;
