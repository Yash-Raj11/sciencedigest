-- Science Digest: core schema, access rules and write guards.
--
-- Conventions (see docs/data-model.md):
--   * Every table has row level security on.
--   * Policies call (select auth.uid()) so Postgres evaluates it once per
--     statement instead of once per row.
--   * Privileges are revoked and re-granted explicitly per table. Supabase's
--     default is "grant all to anon and authenticated", and row level security
--     cannot restrict individual columns, so the grants below are part of the
--     security model, not decoration.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Enums and the single source of evidence weights
-- ---------------------------------------------------------------------------

create type public.subscription_tier as enum ('free', 'premium');
create type public.evidence_grade as enum ('high', 'moderate', 'low', 'none');
create type public.step_kind as enum ('action', 'weekly_target', 'condition');

-- The only place these numbers live in the database. lib/evidence.ts mirrors
-- them and the parity test fails if the two disagree.
create function public.evidence_weight(grade public.evidence_grade)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case grade
    when 'high' then 1.0
    when 'moderate' then 0.7
    when 'low' then 0.4
    else 0.0
  end::numeric
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  subscription_tier public.subscription_tier not null default 'free',
  stripe_customer_id text unique,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.features (
  key text primary key,
  label text not null,
  min_tier public.subscription_tier not null default 'premium'
);

create table public.papers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  doi text not null unique,
  category text not null,
  teaser text not null,
  access_tier public.subscription_tier not null default 'free',
  published_at timestamptz,
  -- Set by withdraw_paper() when the source is retracted after publication.
  withdrawn_at timestamptz,
  withdrawn_reason text,
  created_at timestamptz not null default now()
);

create table public.paper_content (
  paper_id uuid primary key references public.papers (id) on delete cascade,
  content_json jsonb not null,
  updated_at timestamptz not null default now()
);

-- One table for every tickable or derived step.
--   paper_id set, owner_id null  -> a step from a paper (content)
--   paper_id null, owner_id set  -> an everyday habit the user typed themselves
-- An everyday habit can never carry an evidence grade: steps_everyday_shape
-- makes that inexpressible, so no policy mistake can give it weight.
create table public.protocol_steps (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.papers (id),
  owner_id uuid references auth.users (id) on delete cascade,
  position smallint not null,
  label text not null check (char_length(label) between 1 and 120),
  detail text,
  kind public.step_kind not null default 'action',
  evidence_grade public.evidence_grade not null default 'none',
  source_estimate text,
  target_per_week smallint check (target_per_week between 1 and 7),
  counts_step_id uuid references public.protocol_steps (id),
  condition_key text check (condition_key in ('block_weeks_gte', 'modality_is')),
  condition_value jsonb,
  -- When set, the step only counts for users whose choices for this paper
  -- contain every key/value here, e.g. {"modality": "cycling"}.
  applies_when jsonb check (applies_when is null or jsonb_typeof(applies_when) = 'object'),
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint steps_paper_position_key unique (paper_id, position) deferrable initially deferred,
  constraint steps_paper_xor_owner check ((paper_id is null) <> (owner_id is null)),
  constraint steps_weekly_target_shape check (
    kind <> 'weekly_target' or (target_per_week is not null and counts_step_id is not null)
  ),
  constraint steps_condition_shape check (
    kind <> 'condition' or (condition_key is not null and condition_value is not null)
  ),
  constraint steps_grade_needs_source check (source_estimate is not null or evidence_grade = 'none'),
  constraint steps_everyday_shape check (
    owner_id is null
    or (
      kind = 'action'
      and evidence_grade = 'none'
      and source_estimate is null
      and applies_when is null
      and counts_step_id is null
    )
  )
);

create index protocol_steps_paper_idx on public.protocol_steps (paper_id) where paper_id is not null;
create index protocol_steps_owner_idx on public.protocol_steps (owner_id) where owner_id is not null;
create index protocol_steps_counts_idx on public.protocol_steps (counts_step_id) where counts_step_id is not null;

create table public.equipped_protocols (
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id),
  equipped_at timestamptz not null default now(),
  last_active_on date not null default ((now() at time zone 'utc')::date),
  unequipped_at timestamptz,
  primary key (user_id, paper_id)
);

create table public.user_program_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  paper_id uuid not null references public.papers (id),
  block_started_at date,
  choices jsonb not null default '{}'::jsonb check (jsonb_typeof(choices) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

-- The single write path for daily progress.
create table public.step_checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  step_id uuid not null references public.protocol_steps (id),
  local_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, step_id, local_date)
);

create index step_checkins_user_date_idx on public.step_checkins (user_id, local_date);
create index step_checkins_step_idx on public.step_checkins (step_id);

create table public.retractions (
  doi text primary key,
  retraction_nature text,
  retraction_date date,
  reason text,
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Security definer so a policy on another table can ask "is the caller
-- premium?" without the caller needing to read user_profiles themselves.
create function private.is_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and subscription_tier = 'premium'
  )
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- A weekly target must count an action step from the same paper.
create function private.step_shape_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  counted record;
  active_habits integer;
begin
  if new.counts_step_id is not null then
    select kind, paper_id into counted from public.protocol_steps where id = new.counts_step_id;
    if counted.kind is distinct from 'action' or counted.paper_id is distinct from new.paper_id then
      raise exception 'counts_step_id must point at an action step of the same paper'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'INSERT' and new.owner_id is not null then
    select count(*) into active_habits
    from public.protocol_steps
    where owner_id = new.owner_id and retired_at is null;
    if active_habits >= 30 then
      raise exception 'everyday habit limit reached (30 active)' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end
$$;

create trigger protocol_steps_shape_guard
  before insert or update on public.protocol_steps
  for each row execute function private.step_shape_guard();

-- Rejects ticks that are not genuine daily choices.
create function private.checkin_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  step record;
  today_utc date := (now() at time zone 'utc')::date;
begin
  select id, kind, paper_id, owner_id, retired_at into step
  from public.protocol_steps
  where id = new.step_id;

  if not found then
    raise exception 'step % does not exist', new.step_id using errcode = 'foreign_key_violation';
  end if;

  if step.kind <> 'action' then
    raise exception 'only action steps can be ticked: % is a % step and is derived from other data',
      new.step_id, step.kind using errcode = 'check_violation';
  end if;

  if step.retired_at is not null then
    raise exception 'step % is retired', new.step_id using errcode = 'check_violation';
  end if;

  -- The client sends its local calendar date. Allow a day ahead of UTC for
  -- time zones east of Greenwich and a week back for ticks queued offline.
  if new.local_date > today_utc + 1 or new.local_date < today_utc - 7 then
    raise exception 'local_date % is outside the accepted window', new.local_date
      using errcode = 'check_violation';
  end if;

  if step.owner_id is not null then
    if step.owner_id <> new.user_id then
      raise exception 'step % belongs to another user', new.step_id using errcode = 'insufficient_privilege';
    end if;
  elsif not exists (
    select 1
    from public.equipped_protocols e
    where e.user_id = new.user_id
      and e.paper_id = step.paper_id
      and e.unequipped_at is null
  ) then
    raise exception 'protocol for step % is not equipped', new.step_id using errcode = 'check_violation';
  end if;

  return new;
end
$$;

create trigger step_checkins_guard
  before insert on public.step_checkins
  for each row execute function private.checkin_guard();

-- Keeps the dormancy clock moving.
create function private.checkin_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.equipped_protocols e
  set last_active_on = greatest(e.last_active_on, new.local_date)
  from public.protocol_steps s
  where s.id = new.step_id
    and e.user_id = new.user_id
    and e.paper_id = s.paper_id;
  return new;
end
$$;

create trigger step_checkins_touch
  after insert on public.step_checkins
  for each row execute function private.checkin_touch();

-- Called by the nightly retraction job when a published paper turns up in the
-- Retraction Watch data. The read is hidden and its steps lose their weight;
-- because scores are derived, every user's history recalculates on its own.
create function public.withdraw_paper(p_doi text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  update public.papers
  set withdrawn_at = coalesce(withdrawn_at, now()),
      withdrawn_reason = p_reason
  where lower(doi) = lower(p_doi)
  returning id into target;

  if target is null then
    return null;
  end if;

  update public.protocol_steps
  set evidence_grade = 'none'
  where paper_id = target;

  return target;
end
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.features enable row level security;
alter table public.papers enable row level security;
alter table public.paper_content enable row level security;
alter table public.protocol_steps enable row level security;
alter table public.equipped_protocols enable row level security;
alter table public.user_program_state enable row level security;
alter table public.step_checkins enable row level security;
alter table public.retractions enable row level security;

-- user_profiles: read your own row. The only column you may change is timezone
-- (see grants below); the tier is written by the Stripe webhook's service role.
create policy "profiles: read own" on public.user_profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own" on public.user_profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "features: readable by everyone" on public.features
  for select to anon, authenticated
  using (true);

-- papers: every published row is public, premium included, so teasers, search
-- engines and the Instagram funnel all land on a real page.
create policy "papers: published rows are public" on public.papers
  for select to anon, authenticated
  using (published_at is not null);

-- paper_content: the gated half of the split table.
create policy "content: free papers, or premium viewers" on public.paper_content
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.papers p
      where p.id = paper_content.paper_id
        and p.published_at is not null
        and p.withdrawn_at is null
        and (p.access_tier = 'free' or (select private.is_premium()))
    )
  );

create policy "steps: paper steps are public, habits are private" on public.protocol_steps
  for select to anon, authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "steps: add your own habit" on public.protocol_steps
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and paper_id is null);

create policy "steps: edit your own habit" on public.protocol_steps
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and paper_id is null);

create policy "equipped: read own" on public.equipped_protocols
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "equipped: equip what you may read" on public.equipped_protocols
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.papers p
      where p.id = equipped_protocols.paper_id
        and p.published_at is not null
        and p.withdrawn_at is null
        and (p.access_tier = 'free' or (select private.is_premium()))
    )
  );

-- Updating (un-equip, re-equip) stays open after a subscription lapses:
-- tracking is always free, so nobody loses a streak by cancelling.
create policy "equipped: update own" on public.equipped_protocols
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "program state: read own" on public.user_program_state
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "program state: insert own" on public.user_program_state
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "program state: update own" on public.user_program_state
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "checkins: read own" on public.step_checkins
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "checkins: insert own" on public.step_checkins
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "checkins: delete own" on public.step_checkins
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- retractions: no policies. Only the service role (which bypasses row level
-- security) reads or writes it.

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on public.papers, public.paper_content, public.protocol_steps, public.features
  to anon, authenticated;

grant select on public.user_profiles to authenticated;
grant update (timezone) on public.user_profiles to authenticated;

-- A user may create a habit and later rename, reorder or retire it. Every
-- other column keeps its default, which the table CHECK pins to "no evidence".
grant insert (id, owner_id, position, label) on public.protocol_steps to authenticated;
grant update (label, position, retired_at) on public.protocol_steps to authenticated;

grant select, insert on public.equipped_protocols to authenticated;
grant update (last_active_on, unequipped_at, equipped_at) on public.equipped_protocols to authenticated;

grant select, insert, update on public.user_program_state to authenticated;

grant select, insert, delete on public.step_checkins to authenticated;

grant usage on schema private to anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_premium() to anon, authenticated;

grant execute on function public.evidence_weight(public.evidence_grade) to anon, authenticated;

revoke all on function public.withdraw_paper(text, text) from public, anon, authenticated;
grant execute on function public.withdraw_paper(text, text) to service_role;
