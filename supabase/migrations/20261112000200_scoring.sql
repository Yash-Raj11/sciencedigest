-- Science Digest: scoring, mirrored from lib/score.ts.
--
-- Scores are derived, never stored. This file is the server's copy of the rule
-- so a client cannot report a number it did not earn. The generated parity
-- test (supabase/tests/database/90_parity.generated.test.sql) asserts that
-- this function and lib/score.ts return the same JSON for the same data.

-- Integer rounding shared by every percentage. Half rounds up. Written with
-- integers on both sides so TypeScript and Postgres cannot drift on a float.
create function private.pct(numerator bigint, denominator bigint)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when denominator is null or denominator = 0 then 0
    else ((200 * coalesce(numerator, 0) + denominator) / (2 * denominator))::integer
  end
$$;

create function public.compute_adherence(p_user uuid, p_date date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with equipped as (
    select
      e.paper_id,
      (p_date - e.last_active_on) > 7 as dormant,
      coalesce(ups.choices, '{}'::jsonb) as choices,
      ups.block_started_at
    from public.equipped_protocols e
    join public.papers p on p.id = e.paper_id and p.withdrawn_at is null
    left join public.user_program_state ups
      on ups.user_id = e.user_id and ups.paper_id = e.paper_id
    where e.user_id = p_user
      and e.unequipped_at is null
  ),
  in_play as (
    -- Steps of active papers that apply to this user's choices...
    select
      s.id, s.paper_id, s.kind, s.evidence_grade, s.target_per_week, s.counts_step_id,
      s.condition_key, s.condition_value, eq.choices, eq.block_started_at
    from public.protocol_steps s
    join equipped eq on eq.paper_id = s.paper_id
    where not eq.dormant
      and s.retired_at is null
      and (s.applies_when is null or eq.choices @> s.applies_when)
    union all
    -- ...plus the user's own everyday habits.
    select
      s.id, null::uuid, s.kind, s.evidence_grade, null::smallint, null::uuid,
      null::text, null::jsonb, '{}'::jsonb, null::date
    from public.protocol_steps s
    where s.owner_id = p_user
      and s.retired_at is null
  ),
  judged as (
    select
      ip.id,
      ip.paper_id,
      (public.evidence_weight(ip.evidence_grade) * 10)::bigint as tenths,
      case ip.kind
        when 'action' then exists (
          select 1 from public.step_checkins c
          where c.user_id = p_user and c.step_id = ip.id and c.local_date = p_date
        )
        when 'weekly_target' then (
          select count(*) from public.step_checkins c
          where c.user_id = p_user
            and c.step_id = ip.counts_step_id
            and c.local_date between date_trunc('week', p_date::timestamp)::date and p_date
        ) >= ip.target_per_week
        when 'condition' then
          case ip.condition_key
            when 'block_weeks_gte' then
              ip.block_started_at is not null
              and (p_date - ip.block_started_at) >= (ip.condition_value ->> 'weeks')::integer * 7
            when 'modality_is' then
              ip.choices ? 'modality'
              and (ip.choices ->> 'modality') = (ip.condition_value ->> 'modality')
            else false
          end
      end as satisfied,
      -- A "daily box" is an action that no weekly target counts. Session logs
      -- that feed a weekly target are not expected every day.
      ip.kind = 'action' and not exists (
        select 1 from public.protocol_steps t
        where t.kind = 'weekly_target'
          and t.counts_step_id = ip.id
          and t.retired_at is null
      ) as daily_box
    from in_play ip
  ),
  per_paper as (
    select
      eq.paper_id,
      coalesce(sum(j.tenths) filter (where j.satisfied), 0) as earned_tenths,
      coalesce(sum(j.tenths), 0) as possible_tenths
    from equipped eq
    left join judged j on j.paper_id = eq.paper_id
    where not eq.dormant
    group by eq.paper_id
  ),
  totals as (
    select
      coalesce(sum(tenths) filter (where satisfied), 0) as earned_tenths,
      coalesce(sum(tenths), 0) as possible_tenths,
      count(*) filter (where daily_box and satisfied) as boxes_done,
      count(*) filter (where daily_box) as boxes_total
    from judged
  )
  select jsonb_build_object(
    'pct', private.pct(t.earned_tenths::bigint, t.possible_tenths::bigint),
    'earned', t.earned_tenths / 10.0,
    'possible', t.possible_tenths / 10.0,
    'per_paper', coalesce((
      select jsonb_object_agg(pp.paper_id, jsonb_build_object(
        'pct', private.pct(pp.earned_tenths::bigint, pp.possible_tenths::bigint),
        'earned', pp.earned_tenths / 10.0,
        'possible', pp.possible_tenths / 10.0
      ))
      from per_paper pp
    ), '{}'::jsonb),
    'dormant', coalesce((
      select jsonb_agg(eq.paper_id order by eq.paper_id) from equipped eq where eq.dormant
    ), '[]'::jsonb),
    'satisfied', coalesce((
      select jsonb_object_agg(j.id, j.satisfied) from judged j
    ), '{}'::jsonb),
    'consistency', jsonb_build_object(
      'pct', private.pct(t.boxes_done, t.boxes_total),
      'done', t.boxes_done,
      'total', t.boxes_total
    )
  )
  from totals t
$$;

-- Consecutive days with at least one tick. If today has no tick yet the streak
-- is counted up to yesterday, so it does not read zero every morning.
create function public.compute_streak(p_user uuid, p_date date)
returns integer
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  cursor_day date := p_date;
  streak integer := 0;
begin
  if not exists (
    select 1 from public.step_checkins where user_id = p_user and local_date = cursor_day
  ) then
    cursor_day := cursor_day - 1;
  end if;

  while exists (
    select 1 from public.step_checkins where user_id = p_user and local_date = cursor_day
  ) loop
    streak := streak + 1;
    cursor_day := cursor_day - 1;
  end loop;

  return streak;
end
$$;

revoke all on function private.pct(bigint, bigint) from public;
grant execute on function private.pct(bigint, bigint) to anon, authenticated;

revoke all on function public.compute_adherence(uuid, date) from public, anon;
grant execute on function public.compute_adherence(uuid, date) to authenticated, service_role;

revoke all on function public.compute_streak(uuid, date) from public, anon;
grant execute on function public.compute_streak(uuid, date) to authenticated, service_role;
