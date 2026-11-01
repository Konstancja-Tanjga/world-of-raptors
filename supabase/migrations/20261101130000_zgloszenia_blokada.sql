-- The daily limit of "Zgłoś poprawkę" (20261101120000_zgloszenia.sql) counted
-- the account's rows without a lock, so notes sent at the same moment could
-- not see each other and all got through. A transaction lock per account makes
-- them wait for one another: each count sees the rows committed before it.

create or replace function private.limit_zgloszen()
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
  perform pg_advisory_xact_lock(hashtextextended('feedback_log:' || new.user_id::text, 0));
  delete from public.feedback_log where user_id = new.user_id and created_at < now() - interval '1 day';
  select count(*) into ile from public.feedback_log where user_id = new.user_id;
  if ile >= 10 then
    raise exception 'feedback limit reached (10 a day)' using errcode = '54000';
  end if;
  return new;
end;
$$;
