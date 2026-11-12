-- set_step_amount(): an amount write is one upsert on step_amounts' real key.
-- Two writes for the same habit and day never conflict, the second wins, the
-- tick follows, and every guard on a direct write still applies.

begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'owner@example.test'),
  ('00000000-0000-4000-a000-000000000003', 'stranger@example.test');

select is(
  (select prosecdef from pg_proc where oid = 'public.set_step_amount(uuid, date, integer)'::regprocedure),
  false, 'set_step_amount runs as the caller (SECURITY INVOKER), so row level security applies');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

insert into public.protocol_steps (id, owner_id, position, label, habit_kind, unit, daily_target) values
  ('31000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 1, 'Water', 'target', 'glasses', 3),
  ('31000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 2, 'Walk', 'check', null, null);

select lives_ok(
  $$ select public.set_step_amount('31000000-0000-4000-a000-000000000001', current_date, 1) $$,
  'the first amount of the day is accepted');

select lives_ok(
  $$ select public.set_step_amount('31000000-0000-4000-a000-000000000001', current_date, 2) $$,
  'a second amount for the same habit and day is accepted (no duplicate key)');

select is(
  (select array_agg(amount) from public.step_amounts where step_id = '31000000-0000-4000-a000-000000000001'),
  array[2], 'one row for the habit and day, holding the latest amount');

select is(
  (select count(*)::int from public.step_checkins where step_id = '31000000-0000-4000-a000-000000000001'),
  0, 'below the target (2 of 3) there is no tick');

select lives_ok(
  $$ select public.set_step_amount('31000000-0000-4000-a000-000000000001', current_date, 3) $$,
  'reaching the target is accepted');
select is(
  (select count(*)::int from public.step_checkins where step_id = '31000000-0000-4000-a000-000000000001'),
  1, 'reaching the target through the upsert adds the tick');

-- A replay: the same write sent again (sent once, then the reply was lost).
select lives_ok(
  $$ select public.set_step_amount('31000000-0000-4000-a000-000000000001', current_date, 3) $$,
  'sending the same amount again is harmless');
select is(
  (select count(*)::int from public.step_amounts where step_id = '31000000-0000-4000-a000-000000000001'),
  1, 'a replay leaves one row');

select throws_ok(
  $$ select public.set_step_amount('31000000-0000-4000-a000-000000000002', current_date, 1) $$,
  '23514', null, 'the guard still applies: a tick-off habit takes no amount');

select throws_ok(
  $$ insert into public.step_amounts (user_id, step_id, local_date, amount)
     values ('00000000-0000-4000-a000-000000000001', '31000000-0000-4000-a000-000000000001', current_date, 1)
     on conflict (user_id, step_id, local_date) do update
     set user_id = excluded.user_id, step_id = excluded.step_id, local_date = excluded.local_date, amount = excluded.amount $$,
  '42501', null, 'the update grant stays narrow: an upsert that sets the key columns is refused');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$ select public.set_step_amount('31000000-0000-4000-a000-000000000001', current_date, 0) $$,
  '42501', null, 'a user cannot set an amount on another user''s habit');

reset role;
select is(
  (select array_agg(amount) from public.step_amounts where step_id = '31000000-0000-4000-a000-000000000001'),
  array[3], 'the owner''s amount is untouched by the stranger');

set local role anon;
set local request.jwt.claims to '';
select throws_ok(
  $$ select public.set_step_amount('31000000-0000-4000-a000-000000000001', current_date, 1) $$,
  '42501', null, 'a visitor who is not signed in cannot call it');

select * from finish();
rollback;
