-- compute_adherence and compute_streak on a hand-worked example.
-- The same example is traced step by step in the operating manual, section
-- "How the score works". If you change a number here, change it there.
--
-- "Today" is Thursday 2026-11-12. Its ISO week starts Monday 2026-11-09.

begin;
select plan(20);

-- Historical dates are needed, so the date-window guard is switched off for
-- this transaction only. It is back on the moment the transaction rolls back.
alter table public.step_checkins disable trigger step_checkins_guard;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'tracker@example.test'),
  ('00000000-0000-4000-a000-000000000003', 'stranger@example.test');

insert into public.papers (id, slug, title, doi, category, teaser, published_at) values
  ('10000000-0000-4000-a000-000000000001', 'paper-one', 'Paper one', '10.0000/one', 'movement', 'Teaser', now()),
  ('10000000-0000-4000-a000-000000000002', 'paper-two', 'Paper two', '10.0000/two', 'body-composition', 'Teaser', now());

insert into public.protocol_steps
  (id, paper_id, position, label, kind, evidence_grade, source_estimate, target_per_week, counts_step_id,
   condition_key, condition_value, applies_when)
values
  -- Paper one
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 1, 'S1 daily action, low',
   'action', 'low', 'estimate', null, null, null, null, null),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 2, 'S2 daily action, ungraded',
   'action', 'none', null, null, null, null, null, null),
  ('20000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 3, 'S3 session log',
   'action', 'none', null, null, null, null, null, null),
  ('20000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001', 4, 'S4 three sessions this week, low',
   'weekly_target', 'low', 'estimate', 3, '20000000-0000-4000-a000-000000000003', null, null, null),
  -- Paper two
  ('20000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000002', 1, 'S5 eight weeks in, high',
   'condition', 'high', 'estimate', null, null, 'block_weeks_gte', '{"weeks": 8}', null),
  ('20000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000002', 2, 'S6 cycling track only, moderate',
   'action', 'moderate', 'estimate', null, null, null, null, '{"modality": "cycling"}'),
  ('20000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000002', 3, 'S7 modality is running, low',
   'condition', 'low', 'estimate', null, null, 'modality_is', '{"modality": "running"}', null);

-- An everyday habit
insert into public.protocol_steps (id, owner_id, position, label) values
  ('30000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 1, 'Drink 3 L water');

insert into public.equipped_protocols (user_id, paper_id, last_active_on) values
  ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', '2026-11-12'),
  ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000002', '2026-11-12');

-- Block started 56 days before today: exactly eight weeks.
insert into public.user_program_state (user_id, paper_id, block_started_at, choices) values
  ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000002', '2026-09-17', '{"modality": "running"}');

insert into public.step_checkins (user_id, step_id, local_date) values
  ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', '2026-11-12'),
  ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000003', '2026-11-08'), -- Sunday, last week
  ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000003', '2026-11-09'), -- Monday
  ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000003', '2026-11-11'), -- Wednesday
  ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001', '2026-11-12');

-- last_active_on is moved by the tick trigger; pin it back for the fixture.
update public.equipped_protocols set last_active_on = '2026-11-12'
where user_id = '00000000-0000-4000-a000-000000000001';

-- As the user themselves, through row level security --------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

create temp table result_today on commit drop as
  select public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-12') as r;

-- Earned: S1 0.4 + S5 1.0 + S7 0.4 = 1.8
-- Possible: S1 0.4 + S2 0 + S3 0 + S4 0.4 + S5 1.0 + S7 0.4 = 2.2 (S6 does not apply to a runner)
select is((select r -> 'earned' from result_today), to_jsonb(1.8), 'earned weight is 1.8');
select is((select r -> 'possible' from result_today), to_jsonb(2.2), 'possible weight is 2.2');
select is((select r -> 'pct' from result_today), to_jsonb(82), '1.8 of 2.2 rounds to 82%');

select is(
  (select r -> 'per_paper' -> '10000000-0000-4000-a000-000000000001' from result_today),
  '{"pct": 50, "earned": 0.4, "possible": 0.8}'::jsonb,
  'paper one: 0.4 of 0.8 = 50%'
);
select is(
  (select r -> 'per_paper' -> '10000000-0000-4000-a000-000000000002' from result_today),
  '{"pct": 100, "earned": 1.4, "possible": 1.4}'::jsonb,
  'paper two: 1.4 of 1.4 = 100% (the cycling-only step is not counted against a runner)'
);

select is(
  (select r -> 'satisfied' from result_today),
  '{
    "20000000-0000-4000-a000-000000000001": true,
    "20000000-0000-4000-a000-000000000002": false,
    "20000000-0000-4000-a000-000000000003": false,
    "20000000-0000-4000-a000-000000000004": false,
    "20000000-0000-4000-a000-000000000005": true,
    "20000000-0000-4000-a000-000000000007": true,
    "30000000-0000-4000-a000-000000000001": true
  }'::jsonb,
  'the weekly target is unmet at 2 of 3 (Sunday''s session belongs to last week)'
);

-- Daily boxes: S1 (ticked), S2 (not), the habit (ticked). S3 feeds a weekly target, so it is not a daily box.
select is(
  (select r -> 'consistency' from result_today),
  '{"pct": 67, "done": 2, "total": 3}'::jsonb,
  'consistency is 2 of 3 daily boxes = 67%'
);

select is((select r -> 'dormant' from result_today), '[]'::jsonb, 'nothing is dormant');

-- Third session of the week
insert into public.step_checkins (user_id, step_id, local_date) values
  ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000003', '2026-11-12');

select is(
  public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-12') -> 'pct',
  to_jsonb(100),
  'a third session this week satisfies the weekly target: 2.2 of 2.2 = 100%'
);

-- One day earlier the block is 55 days old, one short of eight weeks
select is(
  public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-11')
    -> 'satisfied' -> '20000000-0000-4000-a000-000000000005',
  to_jsonb(false),
  'the eight-week condition is unmet at 55 days'
);

-- Dormancy boundary: 7 days idle is still active, 8 is dormant
update public.equipped_protocols set last_active_on = '2026-11-05'
where paper_id = '10000000-0000-4000-a000-000000000002';

select is(
  public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-12') -> 'dormant',
  '[]'::jsonb,
  'a protocol idle for exactly 7 days is still counted'
);

update public.equipped_protocols set last_active_on = '2026-11-04'
where paper_id = '10000000-0000-4000-a000-000000000002';

select is(
  public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-12') -> 'dormant',
  '["10000000-0000-4000-a000-000000000002"]'::jsonb,
  'a protocol idle for 8 days goes dormant'
);

select is(
  public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-12') -> 'possible',
  to_jsonb(0.8),
  'a dormant protocol leaves the denominator: only paper one''s 0.8 remains'
);

-- Un-equipping removes a protocol entirely
update public.equipped_protocols set unequipped_at = now()
where paper_id = '10000000-0000-4000-a000-000000000001';

select is(
  public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-12') -> 'possible',
  to_jsonb(0),
  'with one protocol dormant and the other un-equipped, nothing is possible and pct is 0, not an error'
);

-- Streak: ticks exist on Nov 8, 9, 11 and 12
select is(public.compute_streak('00000000-0000-4000-a000-000000000001', '2026-11-12'), 2, 'streak on the 12th is 2 (the 10th was missed)');
select is(public.compute_streak('00000000-0000-4000-a000-000000000001', '2026-11-13'), 2, 'no tick yet on the 13th: the streak still reads 2');
select is(public.compute_streak('00000000-0000-4000-a000-000000000001', '2026-11-14'), 0, 'two empty days: the streak is 0');
select is(public.compute_streak('00000000-0000-4000-a000-000000000001', '2026-11-10'), 2, 'on the 10th (no tick) the streak is the 9th and 8th');

-- A stranger asking for someone else's score gets nothing, because the
-- function runs with the caller's rights and row level security hides the rows.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000003", "role": "authenticated"}';

select is(
  public.compute_adherence('00000000-0000-4000-a000-000000000001', '2026-11-12'),
  '{"pct": 0, "earned": 0, "possible": 0, "per_paper": {}, "dormant": [], "satisfied": {},
    "consistency": {"pct": 0, "done": 0, "total": 0}}'::jsonb,
  'a stranger cannot compute another user''s adherence'
);

select is(
  public.compute_streak('00000000-0000-4000-a000-000000000001', '2026-11-12'),
  0,
  'a stranger cannot read another user''s streak'
);

select * from finish();
rollback;
