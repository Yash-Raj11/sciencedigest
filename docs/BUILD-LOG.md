# Build log

A running record of decisions and state, so a new session (human or Claude Code)
can pick up without the conversation that produced it. Newest entry last.

## Decisions confirmed by Yash, 2026-11-12

| Question | Answer |
|---|---|
| "Built for app primarily" vs the Next.js plan | **Phone-first web app.** One codebase, installable to the home screen. Scoring and tracking logic is kept free of React/Next so a store app can reuse it later. |
| Everyday habits ("drink 3 L water") vs rule H8 | **Two numbers.** Evidence-weighted adherence stays strict (an everyday habit weighs 0). A second plain *consistency* number and the streak count every tick. |
| Where to build | **Clean build, delivered as a download.** The 12 carousel files on the Mac (`~/Game/sciencedigest`) are added afterwards; the seam is `lib/pipeline/carousel-adapter.ts`. |

These settle open question 1 in the brief: there is no second points currency.
"Research-based extra" in premium means extra insight, never extra score.

## Design choices made while building (cheap to change, listed so they are findable)

- **Everyday habits live in `protocol_steps`** with `owner_id` set and `paper_id` null.
  A CHECK makes it impossible for one to carry an evidence grade.
- **`applies_when`** on a step: it only counts for users whose choices for that paper
  match (e.g. the lean-mass track of the HIIT paper). Not in the brief; added so one
  paper can carry two tracks whose grades differ.
- **`withdrawn_at`** on a paper + `withdraw_paper()`: what the nightly retraction job
  calls. Withdrawn papers lose their weight and their read is hidden.
- **Session logs are not daily boxes.** An action that feeds a weekly target is a log;
  it is not expected every day and does not count toward consistency.
- **Weights in tenths** (10/7/4/0) on both sides so TypeScript and Postgres cannot
  drift on floating point.
- **Evidence grade lookup** (`lib/pipeline/grade.ts`): a paper's own GRADE rating wins;
  otherwise RCT → moderate (low if fewer than 50 participants), observational → low,
  animal / in-vitro → none. Working values, one file.
- **Starter papers:** steps (free), caffeine (free), HIIT (premium).

## Environment notes

- No Docker in the build sandbox, so `supabase test db` could not run there. The same
  pgTAP files run against plain Postgres 16 + pgTAP through `npm run db:test:local`
  (see `supabase/tests/local/supabase_shim.sql` for what the shim recreates).
- Europe PMC, NCBI and GitLab were unreachable from the sandbox. Ingest and the
  retraction sync are written and unit-tested on their pure parts; their network
  calls have **not** been exercised. Run them once on your machine (manual, section 7).

## 2026-11-12, second session: the app, the pipeline commands, the manual

Yash re-confirmed the three decisions above and added: build straight through, proving each
gate with test output. He has the twelve carousel files, but they are **not** in
`~/Game/sciencedigest` (that folder held only the bare scaffold), so the Instagram image
renderer is still to be added.

Built this session:

- **Screens:** Today (`/`), Library, the read page (`/papers/<slug>`), Me, Membership, and the
  local-only Instagram review queue (`/admin/queue`). Installable, opens offline.
- **Three simulators,** one per starter paper, plus a generic "estimate explorer" so a new
  paper needs no code.
- **Pipeline commands:** `npm run paper -- fetch|extract|draft|approve|unpublish`,
  `npm run retractions`, the model provider (`lib/ai/provider.ts`) and the two prompts.
- **The widget guard** in `eslint.config.mjs`.
- `CLAUDE.md`, `docs/data-model.md`, `docs/MANUAL.md`.

Choices made (cheap to change):

- **Tap a dot to see the source.** Every sentence in a read that rests on the paper carries a
  dot; tapping it shows the verbatim passage. The lint already forces each sentence to name its
  facts, so this costs nothing and makes the checking visible to the reader.
- **Theme** follows the device by default; a choice on the Me tab overrides it. All colours are
  the ten tokens in `app/globals.css`.
- **The Instagram queue is files, not a database table.** Approving writes
  `content/queue/<slug>.json` with a fingerprint of the deck; a deck that changes afterwards
  reads "changed". The page and its API exist only under `npm run dev`. The seam for the image
  renderer is `content/generated/carousels.json` plus those approval files (there is no
  `carousel-adapter.ts`; the earlier note above is superseded).
- **A failing draft does not stop the build.** Only a published paper that fails does.
- **A custom simulator is optional.** `components/papers/_generic/` is the fallback.

Correction to the brief: the reference paper (doi 10.3390/jcm12062291) is by **Khodadadi F,
Bagheri R, Negaresh R, et al.**, not "Kordi M., Nikolaidis P.T." as §9 of the brief says. The
citation in the app is taken from the paper's own record.

## 2026-11-12, third session: companion, three widget types, day-complete moment

Decisions (Yash): in-app first, native home-screen widgets as a later step; the companion
follows what was ticked, never health; own picture stays on the device.

- **Three habit kinds** (`check`, `target`, `count`). Migration `20261113000100_habit_kinds.sql`
  adds `protocol_steps.habit_kind/unit/daily_target` and the `step_amounts` table.
  **A tick still means "done for the day".** An amount is detail beside the tick; a database
  trigger adds or removes the tick as the amount crosses the target. Scoring never reads an
  amount, so `lib/score.ts`, `compute_adherence()` and the parity test are untouched.
  A habit's kind and target cannot be edited afterwards: that would change what old days mean.
- **Tiles that open.** Today shows each habit and protocol as a small tile; tapping opens the
  full view in a bottom sheet (`components/shell/Sheet.tsx`). History in the full view is read
  from the device, so opening one makes no request.
- **Companion** (`components/game/Companion.tsx`, `lib/companion/`). Five moods from today's
  boxes and the streak. No sick or dying state; a unit test fails if a line mentions health.
  "Use my own picture" shrinks the image to 256 px and keeps it in this browser only.
- **Day-complete moment**: once a day, only when the last box is ticked while watching.
- **Simulators** gained a real-life planner each (HIIT: build a session, the evidence rows
  follow it; steps: walking minutes from the reader's own two numbers). Planner output is
  labelled as the reader's arithmetic, not a finding.
- **Home-screen widgets (Android / iPhone)** need a native wrapper; a website cannot supply
  them. Not built.

## 2026-11-12, Phase 8 (live site on the real Supabase project)

- **Hosted database was already up to date.** `supabase db push --remote --dry-run --include-seed`
  returned `upToDate: true`, no migrations and no seeds pending; `supabase migration list --remote`
  shows all four migrations. Reason it looked like it failed: on Supabase CLI 3.x, `db push`
  without `--remote` targets local Docker. The seed was checked first: it only upserts into
  `papers`, `paper_content`, `paper_feature_content` and `protocol_steps`; no user tables.
  `docs/HANDOFF.md` corrected to use `--remote`.
- **Leftover `package.json` / `package-lock.json` discarded, not committed.** They were
  byte-identical to `origin/main` (Vercel's analytics merge, `5ed9983`); `git diff origin/main`
  was empty. Restored, then `git pull --ff-only`.
- **`docs/ARCHITECTURE.md` and `docs/HANDOFF.md` committed** (`b17470e`) after a scan for
  secret-looking strings found none.
- **Stray `~/package-lock.json` moved to `~/_to_delete/`.** It was an empty npm lockfile
  (83 bytes, no packages, no `package.json` beside it). A lockfile above the repo can make
  Next.js choose the wrong workspace root. `npm run build` afterwards: no lockfile warning.
  `turbopack.root` deliberately not set.
- **Target for database tests is 177 assertions** (the figure in ARCHITECTURE.md), not 161.
- `npm audit` deferred until after the Phase 8 gate (owner's call).

## 2026-11-12, Phase 8 step 4: database tests against the hosted project

**Result: 177 of 177 on the hosted project** (`takhienzcshgkytbvaii`), 0 `not ok`, run at
21:07 local. Plans: 01 `1..11`, 02 `1..15`, 03 `1..24`, 04 `1..20`, 05 `1..11`, 06 `1..16`,
90 `1..80`. The 80 parity assertions passed, so TypeScript and SQL scoring agree on the live
database. Locally (`npm run db:test:local`): `unseeded: 7 files, 177 assertions, 0 failed` and
`seeded: 7 files, 177 assertions, 0 failed`. `npm run db:mutation`: `killed: 16, survived: 0`.

- **Why the earlier 177 passed and the first hosted run did not (172 of 177).** The 177 in
  ARCHITECTURE.md was measured on an *unseeded* plain Postgres. Five tests compared whole
  tables against their own fixtures (`select slug from public.papers` must equal exactly
  `free-paper, premium-paper`), so the three real starter papers on the hosted project made
  them fail (`have: (daytime-caffeine-sleep) want: (free-paper)`). The rules themselves held:
  an anonymous REST read of the live project returned all 3 papers, content only for the two
  free ones, `[]` for feature content, and `42501` for `step_checkins` and `user_profiles`.
- **Second hosted run: 176 of 177.** `03_guards` test 5 counted every row of `user_profiles`
  (`have: 4 want: 3`). The extra row was the owner's own anonymous account, created at 15:09
  UTC from the live site after the Vercel fix below. Same class of fault, in a table the seed
  never fills.
- **Rewritten tests** (plans unchanged, total still 177): `01_contract` 1 to 4 and `03_guards` 5
  are now rules that hold whatever data exists. The owner counts what each rule says must be
  visible (published papers; reads of papers that are published and not withdrawn) before
  switching role, and the role compares against that count; "content not belonging to a free
  paper" must be 0 for visitors and free users; "users without a profile" must be 0. Exact-row
  comparisons remain only on fixture rows (`05_premium` 5).
- **Seeded pass added to `db:test:local`.** It builds a second database with
  `supabase/seed.sql` plus `supabase/tests/local/background_users.sql` (one anonymous free user
  and one member with equipped papers, ticks, a target habit and an amount, inserted through
  the real guards). With the old tests it failed as the hosted project did
  (`seeded: 7 files, 172 assertions, 2 failed`; then `176, 1 failed` for test 5).
- **Background users can never reach the hosted project.** `config.toml` seeds only
  `./seed.sql`. `scripts/seed-safety.test.ts` (in `npm test`) fails if `seed.sql` writes to
  `auth.users`, `user_profiles`, `step_checkins`, `step_amounts`, `equipped_protocols` or
  `user_program_state`, mentions `subscription_tier`, includes another file, or if the seed
  paths change. Shown failing on a scratch copy with one `step_checkins` insert, then passing.
- **Two new mutations (16 in all).** "withdrawn reads shown to members" (the content policy
  ignores `withdrawn_at`) is caught by `01` test 4, through a new fixture: a published, premium,
  withdrawn paper with a read; and by `03` "a withdrawn paper's read is hidden from everyone".
  "new users no longer get a profile" (trigger removed) is caught by `03` test 5. Only one
  mutation is caught by the rewritten tests alone: "paper_content readable by everyone".
  `db:mutation` now prints every distinct failing test, not the first three.
- **pgTAP on the hosted project is installed only for a run and dropped afterwards**
  (`select * from pg_extension where extname = 'pgtap'` returns no rows). No migration creates
  it. `supabase test db --remote` needs Docker on CLI 3.1.0 (`DockerRunError`), so the files
  run through `psql` in the owner's Terminal; the password is typed at psql's prompt and never
  stored. Every test file is `begin ... rollback`; row counts were the same before and after.
- **Never point `db:test:local` at a Supabase database** (corrects HANDOFF.md Phase 8 step 4):
  its shim creates and its cleanup drops the `anon`, `authenticated` and `service_role` roles.
- **pgTAP for the local Postgres** (Homebrew PostgreSQL 18.4 has no pgTAP formula): built from
  the v1.3.3 release, `https://github.com/theory/pgtap/archive/refs/tags/v1.3.3.tar.gz`,
  sha256 `325ea79d0d2515bce96bce43f6823dcd3effbd6c54cb2a4d6c2384fffa3a14c7`, installed with
  `make PG_CONFIG=/opt/homebrew/bin/pg_config install` (run by the owner). Same version as the
  hosted project offers.
- **`--remote` on Supabase CLI 3.x**: `db push`, `db query`, `migration list` and `test db` all
  target local Docker unless `--remote` is given. There is no `--linked`. Writes to the hosted
  project also need `--yes`; `db query --read-only` does not.

## 2026-11-12, Phase 8: broken Supabase settings in `.env.local` and Vercel

Both had `NEXT_PUBLIC_SUPABASE_URL` ending in `/rest/v1/` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
set to the placeholder `ey...`, a space, then the real `sb_publishable_` key. Supabase answered
`{"message":"Invalid API key"}` (HTTP 401). Found while checking the live access rules by hand:
the first anonymous REST call failed, and printing the file's shape with values masked showed
both faults. Corrected by the owner in Vercel (Production) and `.env.local`, then redeployed.
Checked afterwards: URL 40 characters ending in `.supabase.co` with no path; key 46 characters
starting `sb_publishable_`; an anonymous `GET /rest/v1/papers` returned HTTP 200 with 3 rows.
Within the hour the live site created its first anonymous user.

## 2026-11-12, Phase 8 step 5: CAPTCHA (Cloudflare Turnstile) on the anonymous sign-in

- **`lib/captcha/turnstile.ts`**, no npm package: Cloudflare's script is loaded the first time a
  token is needed (`?render=explicit`), one invisible widget (`execution: "execute"`,
  `appearance: "interaction-only"`) is rendered into a hidden element, and later tokens come
  from `reset()` on the same widget, since tokens are single-use. A failed challenge, a blocked
  script or 15 s without a token resolves `undefined` instead of hanging.
- **`ensureUser()` in `lib/store/sync.ts`** asks for a token only when it is about to sign in.
  Someone with a session never sees a CAPTCHA, and demo mode never asks. With no
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` the token is `undefined` and sign-in is exactly as before.
- **Why no-key must still work:** local dev and demo mode, and the gap between deploying the
  code and the owner creating the Turnstile site. Supabase only demands a token once CAPTCHA
  protection is on in its dashboard.
- **Order of the manual steps** (MANUAL part 3.1): Turnstile site → site key in Vercel and
  redeploy → only then CAPTCHA protection in Supabase with the secret key. The other order
  locks out every new visitor until the redeploy lands. The secret key lives only in Supabase.
- **Tests:** `lib/store/sync.test.ts` (5) and `lib/captcha/turnstile.test.ts` (3). With the
  token line removed, "sends the Turnstile token as captchaToken when one is present" failed
  (`Received: []`); restored, 8 of 8 pass. Unit tests in all: 127.
- MANUAL part 3.1 also now uses `supabase db push --remote --include-seed`.

## 2026-11-12, Phase 8 step 6: real 404 for unknown papers; unused fonts removed

- **Cause:** with `cacheComponents` + `partialPrefetching`, Next.js 16.3+ answers an unlisted
  `/papers/<slug>` with the prerendered App Shell and `200` (`x-nextjs-postponed: 1`) before the
  page runs, so `notFound()` only added `noindex`. Fix, per the Next 16 docs (ISR with Cache
  Components; `ensureStatic`): `export const ensureStatic = "navigation"` on the paper page, so
  the request waits for the complete page and `notFound()` runs before the response starts.
  `dynamicParams = false` is not allowed with Cache Components.
- **Test:** `tests/http/papers-status.test.ts`, run by `npm run test:http` after `npm run build`
  (needs `next start`, so it is not in `npm test`). Before the fix: `expected 200 to be 404`
  for `/papers/does-not-exist` and a near-miss slug. After: 5 of 5 (both 404, the three papers 200).
- **`@fontsource/newsreader` and `@fontsource/ibm-plex-mono` uninstalled**: grep found no import
  (only HANDOFF.md mentions them). The variable Newsreader font (`@fontsource-variable/newsreader`)
  stays. Gate: lint, typecheck, 127 unit tests, build with no lockfile warning, test:http 5 of 5.

## 2026-11-12, Phase 8 step 5 (continued): CAPTCHA never blocks or slows the user

Owner's rules, and how each holds:

- **Token only when the first sync needs it.** Only `ensureUser()` asks for one: the first sync of
  someone with no session (400 ms after their first tap, in the background). Never on page
  load, never on the tap itself; ticks apply to the screen immediately as before.
- **Ticking always works; a failed check keeps the queue, shows "offline", retries.** With a site
  key and no token, `ensureUser()` raises `CaptchaUnavailable` without calling Supabase; a
  Supabase "captcha" refusal raises it too. `flush()` treats it like a lost connection: the
  queue is untouched, status `offline`, normal 2 s → 60 s backoff.
- **After two failed invisible checks, the visible check once, on Me.** `humanCheck` in the store
  (not saved on the device) goes to `"needed"`; Me opens a sheet "Confirm you're a person to
  back up your progress". Closing it sets `"dismissed"`: it does not reopen by itself, and a
  quiet line on Me offers it. A token from it is used once by the next sign-in.
- **No script once there is a session.** `ensureUser()` returns before any CAPTCHA code runs.
- **Tests.** Unit: 13 for CAPTCHA (132 in all). The offline rule, broken on purpose, failed the two
  `flush()` tests (`expected 'error' to be 'offline'`). The first version of that test passed
  even when broken, because Node's global `navigator` has no `onLine`; it now stubs the device
  as online. Browser (`npm run test:browser`, `tests/browser/captcha-blocked.spec.ts`):
  Turnstile blocked, three boxes ticked; checks they stay ticked, sit in the saved queue, no
  sign-in is sent, nothing covers Today (the "Today is complete" moment is the app's own), Me
  says offline with "3 waiting to send", and the sheet shows once. Broken rule: failed with
  `Received: "…Could not reach the server…"`; restored: passed.
- **New dev dependency `@playwright/test` 1.65.0**, for the browser test the owner asked for.
  Its Chromium was downloaded by the owner (`npx playwright install chromium`, ~290 MB in
  `~/Library/Caches/ms-playwright`). The test builds and serves its own copy in `.next-browser/`
  (`NEXT_DIST_DIR` in `next.config.ts`, set only by `playwright.config.ts`), because a running
  `next dev` blocks a second one and the test must not use `.env.local`'s real Supabase. Next.js
  added that folder's type paths to `tsconfig.json`; they are committed so the file stays put.

## 2026-11-12, Phase 8: the 409 on +1, and no write is ever dropped silently

**What the owner saw.** On the live site, `+1` on a target habit logged
`POST /rest/v1/step_amounts 409 (Conflict)`, `23505 … step_amounts_pkey`.

**Cause.** `remote.ts` sent an amount as a plain insert, and on `23505` followed it with an
update of `amount`. The first tap of the day inserts; every later tap, and any replay of a write
whose reply was lost, hits the existing row, so each one cost a failing request (the 409) before
the update that actually saved it. The live rows show the amounts did save. The real risk was
in `flush()`: a `23…` or `42…` error counted as "refused forever", so the write was dropped, and
the run still ended `idle`, which Me shows as "Everything is saved." `lastError` is only shown
when the status is `error`, so the drop was silent.

**Why not `.upsert()` in the browser.** Checked against local Postgres as `authenticated`: the
statement PostgREST builds for an upsert sets every column sent, the key columns too, and is
refused with `42501 permission denied for table step_amounts`, because the habit_kinds
migration grants `update (amount, updated_at)` only. That grant is deliberate (a direct update
must never move an amount to another day or habit; the tick trigger would not follow). Switching
to `.upsert()` alone would have turned every amount write into a dropped one. An upsert that
sets only `amount` is accepted.

**Decision (owner chose it, over widening the grant or a client-side update-then-insert).** New
migration `20261114000100_set_step_amount.sql`: `set_step_amount(step_id, local_date, amount)`,
one `insert … on conflict (user_id, step_id, local_date) do update set amount = excluded.amount`,
user from `auth.uid()`, `security invoker` (row level security, the column grant, the guard and
the tick trigger all still apply), execute for `authenticated` only. No table, column, grant or
policy changes; no stored history touched. `remote.ts` calls it with `db.rpc`.

**No silent drops.** `remote.ts` now never classes as "refused forever": `23505` (where it is not
already tolerated as "already saved"), or a missing function or table (`42883`, `42P01`,
`PGRST2xx`), which means the app deployed before its migration. Those keep the write queued and
retry with the normal backoff. A write refused on its merits (bad value, broken check, guard) is
still taken off the queue (or it would block everything behind it), but `flush()` ends with
status `error` and "The server did not accept a change, so it was not saved (…)" instead of
"Everything is saved."

**Order of release.** `supabase db push` first, then the app. If the app lands first, amount
writes wait in the queue (PGRST202 is retryable) until the function exists; nothing is lost.

**Tests.** Unit (`lib/supabase/remote.test.ts`, a fake database with the real key, grant and
trigger rules; `lib/store/sync.test.ts`). On the old code, 5 failed: two writes for one habit
and day gave `insert step_amounts 409`; the replay after reconcile gave two 409s; `23505` and
`PGRST202` were `RejectedWrite`; a refused write ended `idle`. After the fix they pass.
Database: `07_set_step_amount` (14 assertions; 191 per pass, unseeded and seeded). Two new
mutations, both killed: `do nothing` instead of the update (caught by "one row … holding the
latest amount") and `security definer` (caught by "runs as the caller"). 18 killed, 0 survived.
