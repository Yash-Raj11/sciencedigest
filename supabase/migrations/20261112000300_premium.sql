-- Science Digest: premium capabilities inside widgets the user already has.
--
-- Premium is two-dimensional: extra papers (gated by paper_content) and extra
-- capability inside free widgets (gated here). Both are decided on the server.
-- A `tier === 'premium'` check in the browser hides nothing: anything shipped
-- to a free user's device is readable in developer tools.

insert into public.features (key, label, min_tier) values
  ('regimen_analysis', 'Regimen analysis: your last eight weeks against the protocol', 'premium'),
  ('key_takeaways', 'Implementation notes drawn from the paper', 'premium');

create function private.has_feature(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.features f
    where f.key = p_key
      and (f.min_tier = 'free' or private.is_premium())
  )
$$;

-- Written content that belongs to a feature, e.g. implementation notes.
create table public.paper_feature_content (
  paper_id uuid not null references public.papers (id) on delete cascade,
  feature_key text not null references public.features (key),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (paper_id, feature_key)
);

alter table public.paper_feature_content enable row level security;

create policy "feature content: viewers whose tier unlocks the feature"
  on public.paper_feature_content
  for select to anon, authenticated
  using ((select private.has_feature(feature_key)));

revoke all on public.paper_feature_content from anon, authenticated;
grant select on public.paper_feature_content to anon, authenticated;

-- Computed from the caller's own ticks. It reports what they did, week by
-- week, against what the protocol asks for. It never reports a health outcome:
-- ticks cannot tell anyone that their body changed.
create function public.regimen_analysis(p_paper uuid, p_date date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result jsonb;
begin
  if uid is null or not private.has_feature('regimen_analysis') then
    return jsonb_build_object('locked', true);
  end if;

  with state as (
    select
      coalesce((
        select ups.choices from public.user_program_state ups
        where ups.user_id = uid and ups.paper_id = p_paper
      ), '{}'::jsonb) as choices,
      (
        select ups.block_started_at from public.user_program_state ups
        where ups.user_id = uid and ups.paper_id = p_paper
      ) as block_started_at
  ),
  targets as (
    select s.counts_step_id, max(s.target_per_week) as target
    from public.protocol_steps s, state
    where s.paper_id = p_paper
      and s.kind = 'weekly_target'
      and s.retired_at is null
      and (s.applies_when is null or state.choices @> s.applies_when)
    group by s.counts_step_id
  ),
  weeks as (
    select (date_trunc('week', p_date::timestamp)::date - 7 * g)::date as week_start
    from generate_series(0, 7) as g
  ),
  tallied as (
    select
      w.week_start,
      (
        select count(*)
        from public.step_checkins c
        join targets t on t.counts_step_id = c.step_id
        where c.user_id = uid
          and c.local_date between w.week_start and least(w.week_start + 6, p_date)
      ) as sessions,
      (select max(t.target) from targets t) as target
    from weeks w
  )
  select jsonb_build_object(
    'locked', false,
    'weeks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'week_start', t.week_start,
          'sessions', t.sessions,
          'target', t.target,
          'met', t.target is not null and t.sessions >= t.target
        )
        order by t.week_start
      )
      from tallied t
    ), '[]'::jsonb),
    'weeks_met', (select count(*) from tallied t where t.target is not null and t.sessions >= t.target),
    'block', jsonb_build_object(
      'started_on', (select block_started_at from state),
      'days_elapsed', (select p_date - block_started_at from state)
    )
  ) into result;

  return result;
end
$$;

revoke all on function private.has_feature(text) from public;
grant execute on function private.has_feature(text) to anon, authenticated, service_role;
grant usage on schema private to service_role;
grant execute on function private.is_premium() to service_role;
grant execute on function private.pct(bigint, bigint) to service_role;

revoke all on function public.regimen_analysis(uuid, date) from public, anon;
grant execute on function public.regimen_analysis(uuid, date) to authenticated, service_role;
