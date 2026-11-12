-- One statement that logs a target or count habit's amount for a day: an
-- upsert on step_amounts' real key, (user_id, step_id, local_date).
--
-- Why a function: PostgREST's upsert writes SET for every column it is sent,
-- key columns included, and authenticated may only UPDATE (amount, updated_at)
-- (20261113000100_habit_kinds.sql). That narrow grant is deliberate: a direct
-- update must never move an amount to another day or habit, because the tick
-- trigger would not follow it. So the browser's upsert was refused (42501), and
-- the old insert-then-update sent a 409 on every +1 after the first of the day.
--
-- SECURITY INVOKER: it runs as the caller. Row level security, the column
-- grant, amount_guard and amount_sync_tick all apply exactly as for a direct
-- insert or update. The user id is auth.uid(), never a parameter.
-- No table, grant or policy changes here. Tested in 07_set_step_amount.test.sql.

create function public.set_step_amount(p_step_id uuid, p_local_date date, p_amount integer)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.step_amounts (user_id, step_id, local_date, amount)
  values ((select auth.uid()), p_step_id, p_local_date, p_amount)
  on conflict (user_id, step_id, local_date) do update set amount = excluded.amount;
$$;

revoke all on function public.set_step_amount(uuid, date, integer) from public, anon;
grant execute on function public.set_step_amount(uuid, date, integer) to authenticated;
