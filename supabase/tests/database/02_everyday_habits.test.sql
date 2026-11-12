-- Everyday habits ("drink 3 L water") live in protocol_steps with an owner.
-- They are private, tickable, and can never carry evidence weight.

begin;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'habit-owner@example.test'),
  ('00000000-0000-4000-a000-000000000003', 'stranger@example.test');

insert into public.papers (id, slug, title, doi, category, teaser, published_at) values
  ('10000000-0000-4000-a000-000000000001', 'free-paper', 'Free paper', '10.0000/free', 'movement', 'Teaser', now());

insert into public.protocol_steps (id, paper_id, position, label, evidence_grade, source_estimate) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 1, 'Paper step', 'low', 'estimate');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.protocol_steps (id, owner_id, position, label)
     values ('30000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 1, 'Drink 3 L water') $$,
  'a user can add an everyday habit'
);

select results_eq(
  $$ select kind::text, evidence_grade::text, source_estimate
     from public.protocol_steps where id = '30000000-0000-4000-a000-000000000001' $$,
  $$ values ('action', 'none', null::text) $$,
  'a new habit is a plain action with no evidence grade'
);

select throws_ok(
  $$ insert into public.protocol_steps (owner_id, position, label, evidence_grade, source_estimate)
     values ('00000000-0000-4000-a000-000000000001', 2, 'Self-graded habit', 'high', 'trust me') $$,
  '42501',
  null,
  'a user cannot set an evidence grade on their own habit (column privilege)'
);

select throws_ok(
  $$ insert into public.protocol_steps (owner_id, position, label)
     values ('00000000-0000-4000-a000-000000000003', 1, 'Habit for someone else') $$,
  '42501',
  null,
  'a user cannot create a habit owned by another user (row level security)'
);

select throws_ok(
  $$ insert into public.protocol_steps (paper_id, position, label)
     values ('10000000-0000-4000-a000-000000000001', 7, 'Injected paper step') $$,
  '42501',
  null,
  'a user cannot add a step to a paper'
);

update public.protocol_steps set label = 'Hijacked'
where id = '20000000-0000-4000-a000-000000000001';

select is(
  (select label from public.protocol_steps where id = '20000000-0000-4000-a000-000000000001'),
  'Paper step',
  'a user''s UPDATE cannot touch a paper step'
);

select lives_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date) $$,
  'a user can tick their own habit without equipping anything'
);

-- The stranger
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000003", "role": "authenticated"}';

select is_empty(
  $$ select id from public.protocol_steps where owner_id is not null $$,
  'another user cannot see the habit'
);

select throws_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000003', '30000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date) $$,
  '42501',
  null,
  'another user cannot tick someone else''s habit'
);

-- A visitor who is not signed in
set local role anon;
set local request.jwt.claims to '';

select throws_ok(
  $$ insert into public.protocol_steps (owner_id, position, label)
     values ('00000000-0000-4000-a000-000000000001', 3, 'Anonymous habit') $$,
  '42501',
  null,
  'a visitor who is not signed in cannot add a habit'
);

-- Back to the owner: retire, then try to tick
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ update public.protocol_steps set retired_at = now()
     where id = '30000000-0000-4000-a000-000000000001' $$,
  'a user can retire their own habit'
);

select throws_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date - 1) $$,
  '23514',
  null,
  'a retired habit cannot be ticked'
);

-- Rules that bind even the database owner
reset role;

select throws_ok(
  $$ update public.protocol_steps set evidence_grade = 'high', source_estimate = 'made up'
     where id = '30000000-0000-4000-a000-000000000001' $$,
  '23514',
  null,
  'not even the database owner can give a habit an evidence grade (CHECK)'
);

select throws_ok(
  $$ insert into public.protocol_steps (paper_id, owner_id, position, label)
     values ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 8, 'Both') $$,
  '23514',
  null,
  'a step belongs to a paper or to a user, never both'
);

insert into public.protocol_steps (owner_id, position, label)
select '00000000-0000-4000-a000-000000000003', g, 'Habit ' || g
from generate_series(1, 30) as g;

select throws_ok(
  $$ insert into public.protocol_steps (owner_id, position, label)
     values ('00000000-0000-4000-a000-000000000003', 31, 'One too many') $$,
  '23514',
  null,
  'a 31st active habit is rejected'
);

select * from finish();
rollback;
