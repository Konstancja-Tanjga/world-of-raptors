-- The field log (wor:dziennik:v1, src/lib/dziennik.ts): every sighting, many
-- per species, with its day, time, count, place name and point (the phone's
-- GPS or a point picked on a map). The checklist (observations) still says
-- which species were seen; a sighting ticks it in the app.
--
-- sighting_id is the UUID the device made for the entry. Removals are soft,
-- as everywhere: deleted_at, with the entry's fields kept.

create table public.sightings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Text, not uuid: private.limit_wierszy compares keys as text.
  sighting_id text not null check (sighting_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  species_slug text not null check (species_slug ~ '^[a-z0-9-]{1,60}$'),
  observed_on date not null,
  observed_time text check (observed_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  bird_count integer check (bird_count between 1 and 100000),
  place text check (char_length(place) <= 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy_m integer check (accuracy_m between 0 and 100000),
  location_source text check (location_source in ('gps', 'mapa')),
  note text check (char_length(note) <= 2000),
  updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, sighting_id),
  -- A point is whole or absent, and says where it came from.
  check ((latitude is null) = (longitude is null)),
  check ((latitude is null) = (location_source is null)),
  check (accuracy_m is null or latitude is not null)
);

create trigger ostatni_zapis_wygrywa before insert or update on public.sightings
  for each row execute function private.ostatni_zapis_wygrywa();

-- A keen birder logs a few thousand sightings a year; the cap only keeps one
-- account from filling the database.
create trigger limit_wierszy before insert on public.sightings
  for each row execute function private.limit_wierszy('20000', 'sighting_id');

create index sightings_pobieranie on public.sightings (user_id, synced_at);

alter table public.sightings enable row level security;

create policy "own rows: read" on public.sightings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own rows: add" on public.sightings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own rows: change" on public.sightings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.sightings to authenticated;

-- The checklist now takes any bird of Europe (content/ptaki-europy.json), not
-- only the course's: about 650 species, so its cap goes from 200 to 1000.
drop trigger limit_wierszy on public.observations;
create trigger limit_wierszy before insert on public.observations
  for each row execute function private.limit_wierszy('1000', 'species_slug');
