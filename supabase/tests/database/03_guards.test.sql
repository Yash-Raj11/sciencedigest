-- Negative tests: every rule here must fire when someone tries to break it.

begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'free@example.test'),
  ('00000000-0000-4000-a000-000000000002', 'premium@example.test'),
  ('00000000-0000-4000-a000-000000000003', 'other@example.test');

update public.user_profiles set subscription_tier = 'premium'
where id = '00000000-0000-4000-a000-000000000002';

insert into public.papers (id, slug, title, doi, category, teaser, access_tier, published_at) values
  ('10000000-0000-4000-a000-000000000001', 'free-paper', 'Free paper', '10.0000/free', 'movement', 'Teaser', 'free', now()),
  ('10000000-0000-4000-a000-000000000002', 'premium-paper', 'Premium paper', '10.0000/premium', 'body-composition', 'Teaser', 'premium', now()),
  ('10000000-0000-4000-a000-000000000003', 'draft-paper', 'Draft paper', '10.0000/draft', 'sleep', 'Teaser', 'free', null),
  ('10000000-0000-4000-a000-000000000004', 'retracted-paper', 'Retracted paper', '10.0000/RETRACTED', 'sleep', 'Teaser', 'free', now());

insert into public.paper_content (paper_id, content_json) values
  ('10000000-0000-4000-a000-000000000004', '{"body": "about to be withdrawn"}');

insert into public.protocol_steps (id, paper_id, position, label, kind, evidence_grade, source_estimate) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 1, 'Free action', 'action', 'low', 'estimate'),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002', 1, 'Premium action', 'action', 'none', null),
  ('20000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000004', 1, 'Retracted action', 'action', 'moderate', 'estimate');

insert into public.equipped_protocols (user_id, paper_id) values
  ('00000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001');

insert into public.step_checkins (user_id, step_id, local_date) values
  ('00000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000001', (now() at time zone 'utc')::date);

-- Shape rules, as the database owner -------------------------------------------

select throws_ok(
  $$ insert into public.protocol_steps (paper_id, position, label, kind)
     values ('10000000-0000-4000-a000-000000000001', 2, 'Weekly target with no target', 'weekly_target') $$,
  '23514', null,
  'a weekly_target needs target_per_week and counts_step_id'
);

select throws_ok(
  $$ insert into public.protocol_steps (paper_id, position, label, kind)
     values ('10000000-0000-4000-a000-000000000001', 2, 'Condition with no rule', 'condition') $$,
  '23514', null,
  'a condition needs condition_key and condition_value'
);

select throws_ok(
  $$ insert into public.protocol_steps (paper_id, position, label, kind, target_per_week, counts_step_id)
     values ('10000000-0000-4000-a000-000000000001', 2, 'Counts another paper', 'weekly_target', 3,
             '20000000-0000-4000-a000-000000000002') $$,
  '23514', null,
  'a weekly_target cannot count a step from another paper'
);

select throws_ok(
  $$ delete from public.protocol_steps where id = '20000000-0000-4000-a000-000000000001' $$,
  '23503', null,
  'a step with history cannot be deleted (steps are retired, never deleted)'
);

-- A rule that holds whatever other accounts exist (real users on the hosted
-- project, background users locally): no auth user is without a profile, and
-- this file's three fixture users each got one.
select results_eq(
  $$ select (select count(*) from auth.users u
              where not exists (select 1 from public.user_profiles p where p.id = u.id))::int,
            (select count(*) from public.user_profiles
              where id in ('00000000-0000-4000-a000-000000000001',
                           '00000000-0000-4000-a000-000000000002',
                           '00000000-0000-4000-a000-000000000003'))::int $$,
  $$ values (0, 3) $$,
  'every new auth user gets a profile row automatically'
);

-- A visitor who is not signed in -----------------------------------------------

set local role anon;
set local request.jwt.claims to '';

select is_empty(
  $$ select slug from public.papers where slug = 'draft-paper' $$,
  'an unpublished paper is invisible to visitors'
);

select throws_ok(
  $$ select * from public.user_profiles $$,
  '42501', null,
  'a visitor cannot read user_profiles'
);

select throws_ok(
  $$ select public.compute_adherence('00000000-0000-4000-a000-000000000003', current_date) $$,
  '42501', null,
  'a visitor cannot call compute_adherence'
);

-- The free user ----------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date) $$,
  '23514', null,
  'a step cannot be ticked before its protocol is equipped'
);

select throws_ok(
  $$ insert into public.equipped_protocols (user_id, paper_id)
     values ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000002') $$,
  '42501', null,
  'a free user cannot equip a premium paper'
);

select throws_ok(
  $$ insert into public.equipped_protocols (user_id, paper_id)
     values ('00000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001') $$,
  '42501', null,
  'a user cannot equip a protocol on someone else''s behalf'
);

select lives_ok(
  $$ insert into public.equipped_protocols (user_id, paper_id)
     values ('00000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001') $$,
  'a free user can equip a free paper'
);

select throws_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date + 2) $$,
  '23514', null,
  'a tick dated two days ahead is rejected'
);

select throws_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date - 8) $$,
  '23514', null,
  'a tick backdated more than a week is rejected'
);

select throws_ok(
  $$ insert into public.step_checkins (user_id, step_id, local_date)
     values ('00000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000001',
             (now() at time zone 'utc')::date - 1) $$,
  '42501', null,
  'a user cannot write a tick in another user''s name'
);

delete from public.step_checkins where user_id = '00000000-0000-4000-a000-000000000003';

reset role;
select is(
  (select count(*) from public.step_checkins where user_id = '00000000-0000-4000-a000-000000000003'),
  1::bigint,
  'a user''s DELETE cannot remove another user''s tick'
);
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ update public.user_profiles set stripe_customer_id = 'cus_forged'
     where id = '00000000-0000-4000-a000-000000000001' $$,
  '42501', null,
  'a user cannot write their own stripe_customer_id'
);

select lives_ok(
  $$ update public.user_profiles set timezone = 'Asia/Kolkata'
     where id = '00000000-0000-4000-a000-000000000001' $$,
  'a user can change their own timezone'
);

select throws_ok(
  $$ select * from public.retractions $$,
  '42501', null,
  'a signed-in user cannot read the retractions table'
);

select throws_ok(
  $$ select public.withdraw_paper('10.0000/retracted', 'forged') $$,
  '42501', null,
  'a signed-in user cannot withdraw a paper'
);

-- The premium user --------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.equipped_protocols (user_id, paper_id)
     values ('00000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002') $$,
  'a premium user can equip a premium paper'
);

-- Retraction: withdrawing a published paper -------------------------------------

reset role;

select is(
  public.withdraw_paper('10.0000/retracted', 'Retracted by the journal'),
  '10000000-0000-4000-a000-000000000004'::uuid,
  'withdraw_paper finds the paper by DOI, ignoring case'
);

select is(
  (select evidence_grade::text from public.protocol_steps where id = '20000000-0000-4000-a000-000000000004'),
  'none',
  'a withdrawn paper''s steps lose their evidence grade'
);

set local role anon;
set local request.jwt.claims to '';

select is_empty(
  $$ select paper_id from public.paper_content where paper_id = '10000000-0000-4000-a000-000000000004' $$,
  'a withdrawn paper''s read is hidden from everyone'
);

select * from finish();
rollback;
