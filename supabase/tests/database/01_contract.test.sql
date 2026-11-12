-- The Phase 3 gate. Ten contract tests; nothing downstream is trustworthy
-- until every line below prints "ok".
--
-- Test 8 makes two assertions (the insert succeeds, and it moves the dormancy
-- clock), so the plan is 11.

begin;
select plan(11);

-- Fixtures, created as the database owner ------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'free@example.test'),
  ('00000000-0000-4000-a000-000000000002', 'premium@example.test'),
  ('00000000-0000-4000-a000-000000000003', 'other@example.test');

update public.user_profiles
set subscription_tier = 'premium'
where id = '00000000-0000-4000-a000-000000000002';

insert into public.papers (id, slug, title, doi, category, teaser, access_tier, published_at) values
  ('10000000-0000-4000-a000-000000000001', 'free-paper', 'Free paper', '10.0000/free', 'movement', 'Free teaser', 'free', now()),
  ('10000000-0000-4000-a000-000000000002', 'premium-paper', 'Premium paper', '10.0000/premium', 'body-composition', 'Premium teaser', 'premium', now());

insert into public.paper_content (paper_id, content_json) values
  ('10000000-0000-4000-a000-000000000001', '{"body": "free read"}'),
  ('10000000-0000-4000-a000-000000000002', '{"body": "premium read"}');

insert into public.protocol_steps
  (id, paper_id, position, label, kind, evidence_grade, source_estimate, condition_key, condition_value)
values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 1,
   'A daily action', 'action', 'low', 'aRD -14.9 points', null, null),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 2,
   'Eight weeks into the block', 'condition', 'low', 'WMD -2.08 points', 'block_weeks_gte', '{"weeks": 8}');

insert into public.equipped_protocols (user_id, paper_id, last_active_on) values
  ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', (now() at time zone 'utc')::date - 5),
  ('00000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', (now() at time zone 'utc')::date - 5);

-- Yesterday's ticks: one for the free user, one for a stranger.
insert into public.step_checkins (user_id, step_id, local_date) values
  ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', (now() at time zone 'utc')::date - 1),
  ('00000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000001', (now() at time zone 'utc')::date - 1);

-- 1 and 2: a visitor who is not signed in -------------------------------------

set local role anon;
set local request.jwt.claims to '';

select results_eq(
  $$ select slug from public.papers order by slug $$,
  $$ values ('free-paper'), ('premium-paper') $$,
  '1. anon sees all rows in papers, premium included'
);

select results_eq(
  $$ select paper_id from public.paper_content $$,
  $$ values ('10000000-0000-4000-a000-000000000001'::uuid) $$,
  '2. anon sees paper_content only for free papers'
);

-- 3: a signed-in free user ----------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select results_eq(
  $$ select paper_id from public.paper_content $$,
  $$ values ('10000000-0000-4000-a000-000000000001'::uuid) $$,
  '3. a free authenticated user sees paper_content only for free papers'
);

-- 4: a premium user -----------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}';

select results_eq(
  $$ select paper_id from public.paper_content order by paper_id $$,
  $$ values ('10000000-0000-4000-a000-000000000001'::uuid), ('10000000-0000-4000-a000-000000000002'::uuid) $$,
  '4. a premium user sees all paper_content'
);

-- 5 to 8: back to the free user ------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ update public.user_profiles set subscription_tier = 'premium'
     where id = '00000000-0000-4000-a000-000000000001' $$,
  '42501',
  null,
  '5. a user cannot UPDATE their own subscription_tier (42501)'
);

-- Two ticks exist for this step. The user must see exactly their own.
select results_eq(
  $$ select user_id from public.step_checkins $$,
  $$ values ('00000000-0000-4000-a000-000000000001'::uuid) $$,
  '6. a user cannot read another user''s step_checkins'
);

select throws_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000002',
             (now() at time zone 'utc')::date) $$,
  '23514',
  null,
  '7. inserting a checkin for a condition step raises an exception'
);

select lives_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date) $$,
  '8a. inserting a checkin for an action step succeeds'
);

select is(
  (select last_active_on from public.equipped_protocols
   where user_id = '00000000-0000-4000-a000-000000000001'
     and paper_id = '10000000-0000-4000-a000-000000000001'),
  (now() at time zone 'utc')::date,
  '8b. ...and updates last_active_on (it was five days old)'
);

-- 9 and 10: rules that hold for everyone, the owner included -------------------

reset role;

select is(
  public.evidence_weight('none'),
  0.0,
  '9. evidence_weight(''none'') returns 0.0'
);

select throws_ok(
  $$ insert into public.protocol_steps (paper_id, position, label, evidence_grade, source_estimate)
     values ('10000000-0000-4000-a000-000000000001', 9, 'Graded with no source', 'high', null) $$,
  '23514',
  null,
  '10. a step with null source_estimate and grade ''high'' violates its CHECK'
);

select * from finish();
rollback;
