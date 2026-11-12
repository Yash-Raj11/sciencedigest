-- Target and count habits: amounts are private, only on your own habit, and
-- the tick follows the amount, so scoring never has to read an amount.

begin;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'owner@example.test'),
  ('00000000-0000-4000-a000-000000000003', 'stranger@example.test');

insert into public.papers (id, slug, title, doi, category, teaser, published_at) values
  ('10000000-0000-4000-a000-000000000001', 'free-paper', 'Free paper', '10.0000/free', 'movement', 'Teaser', now());
insert into public.protocol_steps (id, paper_id, position, label, evidence_grade, source_estimate) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 1, 'Paper step', 'low', 'estimate');

select throws_ok(
  $$ update public.protocol_steps set habit_kind = 'count', unit = 'reps' where id = '20000000-0000-4000-a000-000000000001' $$,
  '23514', null, 'not even the database owner can turn a paper step into a counter (CHECK)');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.protocol_steps (id, owner_id, position, label, habit_kind, unit, daily_target) values
       ('30000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 1, 'Read', 'target', 'pages', 20),
       ('30000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 2, 'Water', 'count', 'glasses', null),
       ('30000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 3, 'Walk', 'check', null, null) $$,
  'a user can add a target habit, a count habit and a tick-off habit');

select throws_ok(
  $$ insert into public.protocol_steps (owner_id, position, label, habit_kind, unit) values
       ('00000000-0000-4000-a000-000000000001', 4, 'Target without a number', 'target', 'pages') $$,
  '23514', null, 'a target habit must have a daily target');

select throws_ok(
  $$ update public.protocol_steps set daily_target = 1 where id = '30000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'a target cannot be edited after the fact (it would rewrite what old days mean)');

select lives_ok(
  $$ insert into public.step_amounts (user_id, step_id, local_date, amount)
     values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001', current_date, 12) $$,
  'logging 12 of 20 pages is accepted');

select is(
  (select count(*)::int from public.step_checkins where step_id = '30000000-0000-4000-a000-000000000001'),
  0, 'below the target there is no tick');

update public.step_amounts set amount = 20 where step_id = '30000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from public.step_checkins where step_id = '30000000-0000-4000-a000-000000000001'),
  1, 'reaching the target adds the tick');

update public.step_amounts set amount = 25 where step_id = '30000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from public.step_checkins where step_id = '30000000-0000-4000-a000-000000000001'),
  1, 'going past the target still means one tick');

update public.step_amounts set amount = 19 where step_id = '30000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from public.step_checkins where step_id = '30000000-0000-4000-a000-000000000001'),
  0, 'dropping back below the target removes the tick');

insert into public.step_amounts (user_id, step_id, local_date, amount)
values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000002', current_date, 1);
select is(
  (select (compute_adherence('00000000-0000-4000-a000-000000000001', current_date) -> 'consistency' ->> 'done')::int),
  1, 'one glass ticks the count habit, and consistency sees it without reading amounts');

select throws_ok(
  $$ insert into public.step_amounts (user_id, step_id, local_date, amount)
     values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000003', current_date, 3) $$,
  '23514', null, 'a tick-off habit takes no amount');

select throws_ok(
  $$ insert into public.step_amounts (user_id, step_id, local_date, amount)
     values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000002', current_date - 30, 3) $$,
  '23514', null, 'an amount cannot be back-dated a month');

select throws_ok(
  $$ insert into public.step_amounts (user_id, step_id, local_date, amount)
     values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000002', current_date - 1, -4) $$,
  '23514', null, 'an amount cannot be negative');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000003", "role": "authenticated"}';

select is(
  (select count(*)::int from public.step_amounts),
  0, 'a user cannot read another user''s amounts');

select throws_ok(
  $$ insert into public.step_amounts (user_id, step_id, local_date, amount)
     values ('00000000-0000-4000-a000-000000000003', '30000000-0000-4000-a000-000000000002', current_date, 5) $$,
  '42501', null, 'a user cannot log an amount on another user''s habit');

select throws_ok(
  $$ insert into public.step_amounts (user_id, step_id, local_date, amount)
     values ('00000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000002', current_date, 5) $$,
  '42501', null, 'a user cannot log an amount in another user''s name');

select * from finish();
rollback;
