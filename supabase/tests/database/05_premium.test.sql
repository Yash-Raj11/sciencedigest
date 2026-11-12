-- Premium capability inside a free widget is decided on the server.

begin;
select plan(11);

alter table public.step_checkins disable trigger step_checkins_guard;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'free@example.test'),
  ('00000000-0000-4000-a000-000000000002', 'premium@example.test');

update public.user_profiles set subscription_tier = 'premium'
where id = '00000000-0000-4000-a000-000000000002';

insert into public.papers (id, slug, title, doi, category, teaser, published_at) values
  ('10000000-0000-4000-a000-000000000001', 'free-paper', 'Free paper', '10.0000/free', 'movement', 'Teaser', now());

insert into public.protocol_steps
  (id, paper_id, position, label, kind, evidence_grade, source_estimate, target_per_week, counts_step_id)
values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 1, 'Session log', 'action', 'none', null, null, null),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 2, 'Three a week', 'weekly_target', 'low', 'estimate', 3,
   '20000000-0000-4000-a000-000000000001');

insert into public.paper_feature_content (paper_id, feature_key, payload) values
  ('10000000-0000-4000-a000-000000000001', 'key_takeaways', '{"notes": ["premium only"]}');

insert into public.equipped_protocols (user_id, paper_id) values
  ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001');

insert into public.user_program_state (user_id, paper_id, block_started_at) values
  ('00000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', '2026-10-01');

-- The premium user: three sessions two weeks ago, one this week.
insert into public.step_checkins (user_id, step_id, local_date) values
  ('00000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', '2026-10-26'),
  ('00000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', '2026-10-28'),
  ('00000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', '2026-10-30'),
  ('00000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', '2026-11-10'),
  -- The free user ticks too; it must not leak into anyone else's analysis.
  ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', '2026-11-10');

-- Visitor ------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims to '';

select is_empty(
  $$ select payload from public.paper_feature_content $$,
  'a visitor cannot read premium feature content'
);

select throws_ok(
  $$ select public.regimen_analysis('10000000-0000-4000-a000-000000000001', '2026-11-12') $$,
  '42501', null,
  'a visitor cannot call regimen_analysis'
);

-- Free user ----------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select is_empty(
  $$ select payload from public.paper_feature_content $$,
  'a free user cannot read premium feature content, even for a free paper'
);

select is(
  public.regimen_analysis('10000000-0000-4000-a000-000000000001', '2026-11-12'),
  '{"locked": true}'::jsonb,
  'a free user gets a locked response and no analysis'
);

-- Premium user -------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}';

-- Exact comparison on the fixture row only: other papers' feature content
-- (the seed, or real rows on the hosted project) is also visible here, correctly.
select results_eq(
  $$ select payload from public.paper_feature_content
     where paper_id = '10000000-0000-4000-a000-000000000001' and feature_key = 'key_takeaways' $$,
  $$ values ('{"notes": ["premium only"]}'::jsonb) $$,
  'a premium user reads premium feature content'
);

create temp table analysis on commit drop as
  select public.regimen_analysis('10000000-0000-4000-a000-000000000001', '2026-11-12') as r;

select is((select r -> 'locked' from analysis), to_jsonb(false), 'a premium user gets the analysis');
select is((select jsonb_array_length(r -> 'weeks') from analysis), 8, 'the analysis covers eight weeks');

select is(
  (select r -> 'weeks' -> 7 from analysis),
  '{"week_start": "2026-11-09", "sessions": 1, "target": 3, "met": false}'::jsonb,
  'this week: 1 session against a target of 3, counting only the caller''s ticks'
);

select is(
  (select r -> 'weeks' -> 5 from analysis),
  '{"week_start": "2026-10-26", "sessions": 3, "target": 3, "met": true}'::jsonb,
  'two weeks ago: 3 sessions, target met'
);

select is((select r -> 'weeks_met' from analysis), to_jsonb(1), 'one of the eight weeks met the target');

select is(
  (select r -> 'block' from analysis),
  '{"started_on": "2026-10-01", "days_elapsed": 42}'::jsonb,
  'the block is 42 days old'
);

select * from finish();
rollback;
