-- Limits: anyone with a Google account can sign in, and the key checks accept
-- any well-formed key, so without a cap one account could fill the project's
-- database and break syncing for everyone. Each table gets a per-account cap
-- with room to spare over what the course can hold (60 lessons, 42 species,
-- a few cards per species, a few dozen achievements).
--
-- The trigger runs before insert, which with `on conflict do update` also
-- fires for a row that already exists, so it lets those through: an account
-- at its cap can still change its own rows.

create function private.limit_wierszy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  limit_wierszy int := tg_argv[0]::int;
  kolumna text := tg_argv[1];
  jest boolean;
  ile int;
begin
  execute format('select exists (select 1 from %I.%I where user_id = $1 and %I = $2)',
                 tg_table_schema, tg_table_name, kolumna)
    into jest using new.user_id, to_jsonb(new) ->> kolumna;
  if jest then
    return new;
  end if;
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
    into ile using new.user_id;
  if ile >= limit_wierszy then
    raise exception 'account limit reached in % (% rows)', tg_table_name, limit_wierszy
      using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger limit_wierszy before insert on public.lesson_progress
  for each row execute function private.limit_wierszy('200', 'lesson_id');
create trigger limit_wierszy before insert on public.observations
  for each row execute function private.limit_wierszy('200', 'species_slug');
create trigger limit_wierszy before insert on public.flashcards
  for each row execute function private.limit_wierszy('1000', 'card_id');
create trigger limit_wierszy before insert on public.user_badges
  for each row execute function private.limit_wierszy('300', 'badge_id');

-- Supabase grants table rights to its API roles by default; state them here
-- so the tables do not depend on the project's default privileges. Row level
-- security still decides which rows each role reaches (anon: none).
grant select, insert, update on public.lesson_progress, public.observations, public.flashcards, public.user_badges
  to authenticated;
