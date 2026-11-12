-- Three kinds of everyday habit, and the amounts that two of them record.
--
--   check   tick it off                       (what every habit was until now)
--   target  reach a daily number              "read 20 pages"
--   count   log each one, no target           "glasses of water"
--
-- The rule that keeps scoring untouched: A TICK STILL MEANS "DONE FOR THE DAY".
-- An amount is detail kept beside the tick. When the amount reaches the target
-- (or reaches 1 for a count), the database adds the tick; when it falls below,
-- the database removes it. compute_adherence() and compute_streak() never read
-- amounts, so nothing about scoring, parity or history changes.
--
-- A habit's kind is fixed when it is made. Changing it later would change what
-- every old amount means, so there is no UPDATE grant on these columns.

alter table public.protocol_steps
  add column habit_kind text not null default 'check',
  add column unit text,
  add column daily_target integer,
  add constraint steps_habit_kind_known check (habit_kind in ('check', 'target', 'count')),
  add constraint steps_unit_short check (unit is null or char_length(unit) between 1 and 20),
  add constraint steps_habit_shape check (
       (habit_kind = 'check'  and unit is null     and daily_target is null)
    or (habit_kind = 'target' and unit is not null and daily_target is not null and daily_target between 1 and 100000)
    or (habit_kind = 'count'  and unit is not null and daily_target is null)
  ),
  -- Only a user's own habit can be a target or a count. Paper steps stay plain.
  add constraint steps_amounts_are_habits_only check (owner_id is not null or habit_kind = 'check');

grant insert (habit_kind, unit, daily_target) on public.protocol_steps to authenticated;

create table public.step_amounts (
  user_id uuid not null references auth.users (id) on delete cascade,
  step_id uuid not null references public.protocol_steps (id),
  local_date date not null,
  amount integer not null check (amount between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, step_id, local_date)
);

alter table public.step_amounts enable row level security;

create policy "amounts: read own" on public.step_amounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "amounts: insert own" on public.step_amounts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "amounts: update own" on public.step_amounts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.step_amounts from anon, authenticated;
grant select, insert on public.step_amounts to authenticated;
grant update (amount, updated_at) on public.step_amounts to authenticated;

-- An amount may only be logged on your own, live, target-or-count habit,
-- inside the same date window that ticks accept.
create function private.amount_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  step record;
  today_utc date := (now() at time zone 'utc')::date;
begin
  select owner_id, habit_kind, retired_at into step
  from public.protocol_steps where id = new.step_id;

  if not found then
    raise exception 'step % does not exist', new.step_id using errcode = 'foreign_key_violation';
  end if;
  if step.owner_id is null or step.owner_id <> new.user_id then
    raise exception 'amounts can only be logged on your own habit' using errcode = 'insufficient_privilege';
  end if;
  if step.habit_kind = 'check' then
    raise exception 'step % is a tick-off habit and takes no amount', new.step_id using errcode = 'check_violation';
  end if;
  if step.retired_at is not null then
    raise exception 'step % is retired', new.step_id using errcode = 'check_violation';
  end if;
  if new.local_date > today_utc + 1 or new.local_date < today_utc - 7 then
    raise exception 'local_date % is outside the accepted window', new.local_date using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end
$$;

create trigger step_amounts_guard
  before insert or update on public.step_amounts
  for each row execute function private.amount_guard();

-- Keeps the tick in step with the amount. This is the only link between the two.
create function private.amount_sync_tick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  needed integer;
begin
  select coalesce(daily_target, 1) into needed
  from public.protocol_steps where id = new.step_id;

  if new.amount >= needed then
    insert into public.step_checkins (user_id, step_id, local_date)
    values (new.user_id, new.step_id, new.local_date)
    on conflict do nothing;
  else
    delete from public.step_checkins
    where user_id = new.user_id and step_id = new.step_id and local_date = new.local_date;
  end if;
  return new;
end
$$;

create trigger step_amounts_sync_tick
  after insert or update on public.step_amounts
  for each row execute function private.amount_sync_tick();
