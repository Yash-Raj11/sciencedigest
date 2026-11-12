-- LOCAL TEST RUNS ONLY. Never applied to a real Supabase project.
--
-- `npm run db:test:local` loads this after supabase/seed.sql in its "seeded"
-- pass, so the test files run beside data that looks like production: the real
-- starter papers AND other people's accounts, ticks and habits. A test that
-- assumes a table holds only its own fixtures fails here instead of on the
-- hosted project.
--
-- It is not listed in supabase/config.toml (db.seed.sql_paths is only
-- ./seed.sql), so `supabase db push --include-seed` and `supabase db reset`
-- never load it. scripts/seed-safety.test.ts fails if that ever changes, or if
-- seed.sql itself starts writing user data.
--
-- Ids start with e0/e1 so they cannot collide with any test fixture
-- (00000000-, 10000000-, 20000000-, 30000000-, b0000000-).

-- Two people: one anonymous free user (like a first visit from the live site)
-- and one member who signed up with an email.
insert into auth.users (id, email, is_anonymous) values
  ('e0000000-0000-4000-a000-000000000001', null, true),
  ('e0000000-0000-4000-a000-000000000002', 'member@background.test', false);

-- Profiles come from the on_auth_user_created trigger; only the tier is set here.
update public.user_profiles set subscription_tier = 'premium'
where id = 'e0000000-0000-4000-a000-000000000002';

-- What each of them has added to their Life Game (seed paper ids).
insert into public.equipped_protocols (user_id, paper_id) values
  ('e0000000-0000-4000-a000-000000000001', '2f0cc739-d18b-5ca3-9981-5971623614e9'),  -- caffeine
  ('e0000000-0000-4000-a000-000000000001', '58929ab5-72ec-5a41-941b-be5f29965932'),  -- steps
  ('e0000000-0000-4000-a000-000000000002', '8d1309b7-9fbb-592d-93ae-8ff9a08e6ef6'),  -- HIIT (premium)
  ('e0000000-0000-4000-a000-000000000002', '2f0cc739-d18b-5ca3-9981-5971623614e9');  -- caffeine

insert into public.user_program_state (user_id, paper_id, block_started_at, choices) values
  ('e0000000-0000-4000-a000-000000000002', '8d1309b7-9fbb-592d-93ae-8ff9a08e6ef6',
   (now() at time zone 'utc')::date - 20, '{"lean": "on", "modality": "cycling"}');

-- Everyday habits: a daily target (water) and a tick-off habit.
insert into public.protocol_steps (id, owner_id, position, label, habit_kind, unit, daily_target) values
  ('e1000000-0000-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000001', 1, 'Drink water', 'target', 'glasses', 8),
  ('e1000000-0000-4000-a000-000000000002', 'e0000000-0000-4000-a000-000000000002', 1, 'Stretch', 'check', null, null);

-- Ticks for today and yesterday (UTC), inside the guard's accepted window. They
-- go through the real step_checkins guard, so they are ticks the app could send.
insert into public.step_checkins (user_id, step_id, local_date) values
  ('e0000000-0000-4000-a000-000000000001', '4c89568a-c91b-58ce-b9af-7a0f80d6331c', (now() at time zone 'utc')::date),
  ('e0000000-0000-4000-a000-000000000001', '4c89568a-c91b-58ce-b9af-7a0f80d6331c', (now() at time zone 'utc')::date - 1),
  ('e0000000-0000-4000-a000-000000000001', 'cd120d77-53a2-59fd-8bef-41a28b033ee7', (now() at time zone 'utc')::date),
  ('e0000000-0000-4000-a000-000000000002', 'ddec1584-9010-5941-9b37-b5718ec6521d', (now() at time zone 'utc')::date),
  ('e0000000-0000-4000-a000-000000000002', '4c89568a-c91b-58ce-b9af-7a0f80d6331c', (now() at time zone 'utc')::date),
  ('e0000000-0000-4000-a000-000000000002', 'e1000000-0000-4000-a000-000000000002', (now() at time zone 'utc')::date);

-- An amount that reaches its target: the amount_sync_tick trigger adds the tick.
insert into public.step_amounts (user_id, step_id, local_date, amount) values
  ('e0000000-0000-4000-a000-000000000001', 'e1000000-0000-4000-a000-000000000001', (now() at time zone 'utc')::date, 8);
