-- "Zgłoś poprawkę": a signed-in person sends a note about the course, which
-- the server route (src/app/zgloszenie/route.ts) mails to the owner. The note
-- itself is never stored. This table only records who sent one and when, so
-- each account can send at most 10 a day and nobody can flood the owner's
-- inbox. Rows older than a day count for nothing and are cleared as new ones
-- arrive.

create table public.feedback_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index feedback_log_user_created on public.feedback_log (user_id, created_at);

-- Security definer, so it can clear the account's old rows, which no policy
-- lets the account delete itself (a delete policy would let it reset its own
-- limit). It writes only the account in the request's session: user_id and
-- created_at are set here, whatever the request sent.
create function private.limit_zgloszen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ile int;
begin
  new.user_id := auth.uid();
  new.created_at := now();
  delete from public.feedback_log where user_id = new.user_id and created_at < now() - interval '1 day';
  select count(*) into ile from public.feedback_log where user_id = new.user_id;
  if ile >= 10 then
    raise exception 'feedback limit reached (10 a day)' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger limit_zgloszen before insert on public.feedback_log
  for each row execute function private.limit_zgloszen();

-- Adding a row is all an account can do: it cannot read, change or delete
-- them, and signed-out visitors have no policy at all.
alter table public.feedback_log enable row level security;

create policy "own rows: add" on public.feedback_log for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant insert on public.feedback_log to authenticated;
