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

## 2026-11-13, Step 0-pre: a write that cannot succeed no longer blocks the queue

**The gap left by 4aee19f.** A `23505`, `42883`, `42P01` or `PGRST2xx` kept the write at the head
of the queue and retried without end, so one bad write held every later one.

**The rule (owner approved it, with the two extra retry moments).**

1. Only an answer from the server about that one write, in that class, counts (`StuckWrite` in
   `remote.ts`). No network, a failed CAPTCHA, a sign-in problem never count.
2. After `HOLD_AFTER` = 3 such answers in a row (about six seconds with the 2 s, 4 s backoff) the
   write moves to a `held` list saved on the device. No hours threshold: holding loses nothing
   and undoes itself, so waiting longer would only keep the queue blocked longer.
3. A held write leaves the list when the server takes it, when a newer write replaces it under
   the queue's own last-write-wins rule, or (**changed by the owner later on 2026-11-13**) when
   a retry is refused on its merits: the same permanent codes as for a queued write. Then it
   is dropped, Me shows "The server did not accept a change, so it was not saved (…)", and
   the writes held behind it are released. Only "wait for a fix" codes keep a write held.
   The first version (dbee0e3) kept such a write held for ever, which blocked every later write
   for the same habit. Test: "a held write the server refuses for good is dropped and reported,
   and the writes behind it are released"; on dbee0e3 it failed with the tick never sent
   (`expected [ rename ] to deeply equal [ rename, tick ]`).
4. Order: a write about the same habit or step (any day), or the same paper, as a held write goes
   behind it on the held list, not to the server. So an older amount cannot land after a newer
   one, and a tick is never sent ahead of the held "add habit" it depends on (the server would
   refuse and drop it). The queue never holds a write related to a held one.
5. Held writes are offered again, oldest first, straight from the held list (they do not go back
   into the queue, so they cannot block it again): when the app opens, when the tab is shown
   or focused again, after every successful sync, once an hour, and on "Try again". One still
   refused keeps the writes behind it about the same thing waiting.
6. After a pull, held writes are replayed over the server's copy with the queue, so what the user
   did stays on screen. Me says how many are waiting and why, in plain words with the code,
   and "Everything is saved." becomes "Everything else is saved." while any are held.

**Narrow exception to decision 6 / CLAUDE.md rule 5** ("the device stores what the user did and
nothing else"), allowed by the owner: beside each held write the device keeps the server's error
code and the time it was set aside. This is diagnostic data about a write, not data about the
user; it leaves the device never, and goes when the write is saved.

**Out of scope, unchanged:** a write refused on its merits from the queue (bad value, guard) is
still taken off and reported as an error.

**Saved state** goes from version 2 to 3 (`migrateSaved` in `reduce.ts`): `held` starts empty,
nothing else is touched. No database change, so no database tests were needed.

**Tests, each seen failing with its rule broken, then passing** (160 unit, 5 browser):

| Rule broken on purpose | What failed |
|---|---|
| A refused write is never set aside | "the queue unblocks…", "writes about the same habit go with it…" |
| A lost connection counts as a refusal | "a lost connection never counts…" (`expected [] to have a length of 2`) |
| The held list is not saved | "held writes are saved with the queue, so a reload cannot lose them" |
| New writes ignore the held list | 3 tests, e.g. "a newer amount … replaces the held one, so the older can never overwrite it" |
| Holding leaves related writes queued | "holding a write takes the queued writes about the same thing with it…" + 1 |
| Retry sends related writes after a refusal | "retryHeld() sends held writes oldest first…" |
| Migration forgets `held` | "version 2 loads as version 3 with nothing lost…" + the v1 test |
| No retry after a successful sync / on focus / hourly / on open | the matching test in "when held writes are tried again…" |
| Me does not show the notice | `tests/browser/held-writes.spec.ts` (`element(s) not found`) |

## 2026-11-13, Step 0-pre: the privacy page (a draft; not reviewed by a lawyer)

- `/privacy`, words in `lib/privacy.ts` so `lib/privacy.test.ts` can hold them to H1 (banned
  terms) and H11 (20 words a sentence at most, a working value until H11 is in the linter).
  Linked from Me (Account, demo mode too) and the bottom of `/upgrade`.
- Turnstile Privacy Addendum: `https://www.cloudflare.com/turnstile-privacy-policy/`, the address
  linked from `developers.cloudflare.com/turnstile/`. It answers 200 with no redirect.
- **IP address, checked before writing the line.** No table of ours has an address column and no
  code reads one. But Supabase's own `auth.sessions` keeps `ip` and `user_agent` per session
  (all 4 sessions on production had both), so the page says that instead of "we do not store it".
- Also listed, because the code does it: the time zone on the profile, and the error code kept
  beside a held write.
- Contact for questions and deletion: the address the owner gave (`PRIVACY_CONTACT`).

## 2026-11-13, Step 0-pre: live check of the 409 fix (PRE-3)

Playwright cannot do this on the live site: Cloudflare refuses the invisible check in an
automated browser (Turnstile error 600010), headless or not. That is the CAPTCHA working; it was
not worked around. The owner did the taps by hand in a fresh incognito window and reported:
"count 5 of 12 after reload, no red or 4xx rows, rpc/set_step_amount returned 204 three times".
Read-only query on production for the newest anonymous user (no ids): created 2026-11-12 18:34
UTC, **1 `step_amounts` row**, 1 distinct habit and day, amount **4**, last updated 18:53 UTC.
One row, as the fix intends, but 4 where the owner saw 5. **Settled by a re-test** with dbee0e3
live: fresh incognito window at about 00:40 IST on 13 Nov, Me said "Everything is saved", 5 of 12
after the reload. The anonymous user created at 00:40:23 IST has 1 `step_amounts` row, amount
**5**, updated seven seconds later. The server matches the screen; the 18:34 user was an earlier
session. No bug. Output in `docs/evidence/pre3-live-409.txt`.

## 2026-11-13, Phase 8 gate: passed, without a browser on the live site

- **Why not Playwright.** The gate as first written used two browser contexts on the live site.
  Cloudflare refuses automated browsers there (600010). The owner changed the method rather than
  have the CAPTCHA worked around: (a) by hand plus a read-only count; (b) and (c) server-side.
- **`scripts/gate-rls-live.mts`.** Two test users through the auth admin API, signed in with a
  one-time admin link (a password sign-in would need a CAPTCHA token), then plain REST calls
  with each user's own token, so row level security is what answers. It deletes only the ids it
  created, held in memory; it never selects users by address or time. It needs the service
  role key from the environment and prints no id, token or key. The owner runs it; an assistant
  session never holds the key.
- **Result.** All 12 lines PASS; `docs/evidence/phase8-gate.txt`. Two checks were tightened at
  the owner's request after that run (an empty answer can no longer pass "free papers only";
  the forged-tick check also counts A's ticks). The tightened version has not been run on
  production yet.
- **Phase numbers.** `HANDOFF.md` section 7 used to call the pipeline run the ninth phase and the
  native app the eleventh; the owner's master prompt inserts "readable reads" as Phase 9 and
  moves the rest one later. The owner had section 7 renumbered to match the same day:
  9 readable reads, 10 first live pipeline run, 11 Instagram carousels, 12 native app and
  widgets, 13 payments, 14 scale.
- **Second run.** The owner re-ran the script with the two tightened checks: all PASS, A still
  had 1 tick after the forged write (HTTP 403), `paper_content` answered HTTP 200 with 2 rows,
  0 not free. Both runs are in `docs/evidence/phase8-gate.txt`.
- **`docs/MASTER-PROMPT.md`.** The owner's prompt saved word for word, with every later change
  listed under "Amendments", so a session with no chat history can continue from it and
  `PROGRESS.md`. The Resume prompt is in `HANDOFF.md`, section 8.

## 2026-11-13, the master prompt copy and the live-site browser rule, corrected

- **Verbatim check.** The prompt section of `docs/MASTER-PROMPT.md` was compared with the
  owner's original file. `diff -u` showed one difference: the original has no newline after its
  last line. The words matched byte for byte (17,067 bytes; `cmp` identical once the fence's
  own line break is left out). The section was then rewritten from the original file itself.
- **Browsers on the live site.** The first wording of the amendment banned every automated
  browser there. That was wider than the owner meant: Turnstile only runs at the first write.
  Playwright may load live pages as a visitor who has not tapped anything; whatever needs a
  signed-in user goes through the owner's manual run or `scripts/gate-rls-live.mts`; the CAPTCHA
  is never worked around. HANDOFF and the Resume prompt say the same.
- **HANDOFF section 7, Phases 9 and 10** now only point to the master prompt, so there is one
  place to change the steps.

## 2026-11-13, Step 1: three project skills

- **`.claude/skills/science-content`, `db-change`, `phase-handoff`**, each with a description
  that says when to load it. `CLAUDE.md` stays the always-on contract: the rules table is
  unchanged and one line per skill was added (68 lines before, 74 after).
- **Where H1–H8 were copied from.** The master prompt says "copied word for word from
  CLAUDE.md", but `CLAUDE.md` has never listed H1–H8; it has the condensed rules table. The only
  place they are written out is `docs/HANDOFF.md`, section 5, so the skill copies that table
  word for word and says so. The prompt named the wrong file; no wording had to be guessed.
  H9–H11 and the amended H7 are copied from the master prompt, Step 2A.
- **The three-layer shape in the skill** is the one Step 2A builds (`layers.mechanism`,
  `layers.protocol`, `layers.audit`, `glossary`). The skill is corrected in the same commit as
  any later change to `lib/pipeline/editorial.ts`.
- **The hosted test "psql wrapper"** was never a file in the repository (it was typed in the
  owner's Terminal on 2026-11-12). The skill writes it out as a four-line loop over
  `supabase/tests/database/*.test.sql`.
- **Anthropic's frontend-design skill is not available in this Claude Code** (it is not in the
  session's skill list, and nothing was installed). 2C, 2D and Phase 11 are designed by hand
  against the ten colour tokens and the two fonts.
  *Corrected 2026-11-14:* true when written, but later the same day (17:43, before 2C was
  committed) the owner installed the third-party `impeccable` design skill and its four agents
  into `.claude/`. No entry recorded it. See the entry of 2026-11-14.

## 2026-11-13, Phase 9, step 2A: H9–H11 in code

No reader sees a change yet: the three papers build to byte-identical generated files
(`git status` after `npm run content:build` shows none of them changed).

- **The shape (check 1).** `lib/pipeline/editorial.ts` now has two schemas. `Editorial`
  (required for every paper): the old top-level fields plus `layers.mechanism { paragraphs,
  figure }`, `layers.protocol { paragraphs, figure }`, `layers.audit { effect, weakEnd,
  limitations, missed, more, figure }` and `glossary [{ term, plain }]`. `LegacyEditorial` is the
  old flat shape. The lint refuses the old shape ("this read is in the old flat shape …") unless
  its caller passes `allowLegacyShape`; a read with both `layers` and `sections` is refused too.
- **Nothing was loosened in the move.** The old shape's required sections became required audit
  fields: "lower-bound" is `audit.weakEnd` (same H5 check: both ends of the range, or the words
  "no … confidence interval"), "missed" is `audit.missed`, the limitations are
  `audit.limitations` (same H6 check). New: `audit.effect` must cite `primaryEstimate`, so the
  raw effect size is always in the receipts. Design and sample size are not in the editorial at
  all: the page takes them from the gate's output, so a model cannot restate them wrongly.
- **Jargon (check 2), and how "before its glossary entry" was read.** The glossary is a list
  beside the text, so "before" has no position to compare. Implemented as two rules: (a) a
  listed word in the hook, the population panel, the mechanism or the protocol with no glossary
  entry fails; (b) a listed word in the mechanism's opening sentence fails even with an entry,
  which is H9's "the mental model first, then the name". (b) is this session's reading, not
  the owner's wording: **for the owner to confirm or drop.** A glossary entry's plain text
  fails on a listed word, a number (it has no way to cite a fact; background with a source
  arrives with concepts in 2B) or a banned word. The list is the owner's 21 words, in
  `lib/pipeline/jargon.ts`, each with the written forms that count ("randomised",
  "up-regulates", "VO₂max", "non-REM"). `REM` matches capitals only.
- **Caveat leakage (check 3).** The owner's ten terms, on mechanism text and on the caption of a
  mechanism figure. Two are matched a little wider than written: "funded" also catches
  "funding", "dropout" also catches "drop-out" and "dropped out".
- **Sentences (check 5).** `lib/pipeline/sentences.ts`, no dependency. When unsure it does not
  split, so two sentences read as one count as a longer sentence: the rule errs strict. A stop
  ends a sentence only before white space and then a capital, digit, quote or bracket; never
  after `e.g. i.e. et al. vs. etc. cf. approx. ca. fig. Dr. Mr. Mrs. Ms. Prof.` or a single
  initial. Words are counted as a reader counts them ("8-hour" is one). Over 30 fails, over 22
  warns, and both run on every sentence a reader sees in a three-layer read (title, teaser,
  takeaways and carousel included), not only the layers.
- **Passive voice warns, never fails (check 6).** The check is a pattern ("was" + a participle),
  not a parser. It fires on adjectives ("was tired") and misses passives with irregular verbs
  outside its list. And a passive is sometimes the accurate sentence: "sleep was recorded" says
  what the paper says without inventing who held the electrodes. A rule that is wrong that
  often would have to be worked around, which is how rules get loosened; as a warning it is
  read by a person at the draft.
- **Word budget (check 7).** `LAYER_WORDS` in `lib/pipeline/lint.ts`: mechanism 350, protocol
  150, audit 250. Working values. A figure's caption counts toward its layer; its alt text is
  held to every rule but not counted. The population panel sits inside the protocol layer on
  the page but is not counted in the protocol's 150 (it has its own H3 job); it still counts
  toward the whole read's 1000-word limit.
- **The temporary allowlist** is `scripts/legacy-shape.ts` (its own file so a test can import
  it without running the build), used by `content-build.mts` and `paper.mts`. Guard,
  `scripts/legacy-shape.test.ts`: only the three starter slugs; each must still be in the old
  shape (rewrite one and its entry must go); and the list must be empty once the 2E line in
  `docs/PROGRESS.md` is ticked. In 2E the file and the option are deleted.
- **A draft in the old shape is reported, not built**; a published one stops the build
  (`scripts/content-build.test.ts`, which runs the real script on a scratch folder through two
  new test-only flags, `--papers <dir>` and `--report-only`).
- **Fixture.** `lib/pipeline/fixtures/layered-caffeine.json` is a three-layer read of the
  caffeine paper written only from its `extraction.json`. It is a test fixture, not the 2E
  rewrite: it has no concepts and no figure.
- **Evidence.** 19 deliberate breaks, one at a time, each caught by a named test:
  `docs/evidence/phase9-2a-rules-broken.txt`. The first run caught 18: removing the splitter's
  abbreviation rule passed, because every test case had a lower-case word after "e.g." and the
  capital-letter rule alone kept those in one piece. Three cases with a capital or a bracket
  after the stop were added; second run 19 of 19.

## 2026-11-13, Phase 9, step 2B: context sources (parallel studies and background concepts)

No reader sees a change yet except one line: the passage under a tapped dot is now headed by its
source line ("From the paper, word for word"; the same words as before for every current read).
Generated files are unchanged. `content/context/` and `content/concepts/` hold only a README.

- **Checked first: `paper_content` needs no migration.** `content_json` is `jsonb not null` with
  no check on its shape (`20261112000100_core.sql`, line 72), and row level security decides by
  `paper_id`, not by what is inside. So the build embeds everything a read cites, the other
  study's facts with their quotes, the study's citation, DOI and grade, and each concept, in
  that read's own JSON (`content.facts[...].source`, `content.context`). A members' read carries
  its context through the same gate as the rest of it. The cost is not a migration but a seed
  push when a members' read changes (a write to the hosted project: ask first).
- **How a read cites.** `[fact_id]` the paper; `[<slug>/<fact_id>]` another study, which is the
  prompt's `{source, fact}`; `[concept:<slug>]` a concept (`lib/pipeline/refs.ts`).
- **The gate with role "context"** is the same gate: same schema, licence allowlist, verbatim
  quotes, numbers inside their quotes, derived tiers. The role is recorded on the result. Nothing
  was relaxed for context, including the requirement of a limitation, so a context extraction is
  held to exactly what a paper's is. What makes it "context" is what is refused around it: an
  `editorial.json` in a context folder fails that source; `draft` and `approve` refuse
  `--role context`.
- **The citation gate lives in the lint** (rule name `context`), because that is where a read's
  references are resolved: a missing fact, a source that is not there, a source that failed the
  gate, and a withdrawn source each fail. A caller that passes no context at all gets a failure
  on every context reference, never a pass.
- **Never a step, never a weight.** A step whose `refs` or `evidenceRef` is a context reference
  fails; so does a simulator parameter, and the headline result. A limitation must still cite a
  limitation of the paper itself. H3 got one addition: a causal verb fails if any study the
  sentence cites is not randomized human evidence, whatever the read's own paper is. A test
  compares the assembled steps and grades with and without a context citation: identical.
  `git diff --stat` for `lib/score.ts`, `lib/evidence.ts` and `supabase/migrations`: no change.
- **Grades for context studies** come from `deriveTier()` in `grade.ts` (the study's design,
  species and size). The source line uses the fact's own tier when the study graded that
  outcome itself. It is shown as words ("low certainty"), never as a weight: the existing
  `GradeChip` prints "×0.4", which would be a lie beside a study that weighs nothing.
- **Concepts.** `{ term, plain, model, reference { doi | isbn, title }, reviewed_by_owner }`.
  Any digit in term, plain or model fails; so do banned words, throat-clearing, a sentence over
  30 words, and a listed technical word other than the concept's own name.
- **"Only I approve" is enforced two ways.** `approve-concept` refuses unless both ends are a
  terminal, shows the whole concept, and asks for the slug to be typed back. And it writes a
  fingerprint of the wording (`reviewed: { at, fingerprint }`): `reviewed_by_owner: true` typed
  by hand, or a concept reworded after its review, counts as unreviewed. The second part is an
  addition to the shape the owner gave, on the model of the Instagram queue's approvals.
- **Unreviewed concepts.** A draft may use one (a warning), so the owner can read the read and
  its concepts together. A published read cannot: the lint fails, so `content:build` fails; and
  `paper approve` refuses while any is unreviewed.
- **Every glossary entry now has a source** (a change to 2A's `{term, plain}`): either
  `{ term, plain, refs }`, resting on cited facts, or `{ term, concept }`, which takes the
  concept's reviewed wording. Without one there would be nothing to put on the source line.
- **Retractions.** `npm run retractions` screens published papers and context studies in one
  pass (`screenSources`). A retracted context study has no database row and no weight, so
  "withdrawn" means: `content/context/<slug>/withdrawn.json` is written, the reads citing it
  are named, exit code 1, and from then on the build fails on every citation of it. Fail closed:
  the read has to be edited by a person, because dropping the citation by itself would leave a
  sentence with nothing under it.
- **Source lines** are one pure module, `lib/content/source-line.ts`: "From the paper",
  "From another study: <short cite>, <grade>", "Background", and the list for the audit (each
  source with its DOI or ISBN). The read page uses it under a tapped dot now; the audit list is
  drawn in 2D.
- **Evidence.** 20 deliberate breaks, each caught: `docs/evidence/phase9-2b-rules-broken.txt`.
  The end-to-end tests run the real `content-build`, `retractions-sync` and `paper` scripts on
  scratch folders (`scripts/context-build.test.ts`); nothing touches the network or a database.
  `retractions-sync` got test-only flags (`--csv`, `--context`, `--papers`); with `--csv` it
  never opens a database connection.

## 2026-11-13: a fourth paper as a draft, to check Phase 9 end to end (owner's request)

`turmeric-pepper-breakfast` (PMC11016436, doi:10.1002/fsn3.3965), free tier, **not approved**:
`publishedAt` is null, so it is in no generated file and not in the app.

- **Licence and retraction first.** Europe PMC says `cc by`; 67,834 Retraction Watch records
  checked, no hit. `npm run retractions` was run for the first time on this machine (`.cache/`).
- **`extract` and `draft` were not run.** They call the model and `.env.local` has no
  `AI_API_KEY`. The extraction and the editorial were written by hand in the session and put
  through the same gate and lint by `npm run content:build`. Reason: the checks are what
  matter, and they ran unchanged.
- **The paper's text has no effect size for glucose**, only p-values and a figure. So the read
  has findings and no estimate, says so in the audit, and the simulator draws no glucose curve.
- **One background concept**, `glucagon-like-peptide`, unreviewed. Its reference (Holst 2007,
  doi:10.1152/physrev.00034.2006) was checked against the Europe PMC record. No parallel study.
- **A new simulator kind, `breakfast-meals`** (`components/papers/turmeric-pepper-breakfast/`):
  pick one of the four meals, see what the trial recorded. Reason: the generic simulator needs
  estimates with intervals and this paper has none.
- **`Article.tsx` now draws a three-layer read.** It only drew the old `sections`, so a layered
  read showed no body text at all. This is a plain interim layout (limitations in bold, never
  behind a tap; "Full receipts" behind one; a glossary with its source line); step 2D replaces
  it. No test was added for it: there is no published layered read to test against yet, and
  2D's walkthrough spec is where that belongs.
- No figure: 2C and 2D are not done.

## 2026-11-13: paper pages raised a Next.js error in dev (all four papers, not only the new one)

- **Symptom.** `next dev` showed "Route "/papers/[slug]": Next.js encountered URL data during
  prerendering or a navigation", and at times "Invariant: ... did not produce a static shell",
  on every paper page. Pages still answered 200 and `npm run build` passed.
- **Cause.** `app/papers/[slug]/page.tsx` awaited `params` at the top of the page, outside
  `<Suspense>`. With Cache Components, Next 16 checks in development that a route has something
  to show before the address is known. Nothing in `Article.tsx`, the interim three-layer layout
  or the Background card reads cookies, headers, search params, a session or the clock on the
  server; the three old papers failed the same way, and the slug was in `generateStaticParams`.
- **Fix.** The slug is read in a child component inside `<Suspense>` (the "stream" fix from
  `node_modules/next/dist/docs/.../instant.md`). `instant = false` would only have hidden it.
  `ensureStatic = "navigation"` stays, so an unknown slug still answers 404 (test:http).
- **Test.** `tests/browser/paper-routes-dev.spec.ts` starts its own `next dev`
  (`.next-browser-dev/`) and opens every published paper. It uses no `page.route()`:
  intercepting requests makes the browser fetch the page in a way that skips these dev checks,
  and the first version of the test passed with the bug present because of that.
- **Also.** Two unit tests hard-coded "3 papers" and would have failed the moment a fourth
  paper is approved; they now accept any count of three or more.
- Evidence: `docs/evidence/paper-route-dev-error.txt`.

## 2026-11-13: Phase 9 step 2C, figures

- **Ten primitives** in `components/figures/primitives/` (Arrow, Label, Bracket, Timeline,
  DoseCurve, BarPair, Gauge, LockKey, Cell, Flow) and one frame, `Figure.tsx`, that carries
  `<title>`, `<desc>` and the single entrance animation. Colours are the tokens only.
- **Measured against proposed is one rule, in one place** (`lib/content/figures.ts`): solid and
  filled means this paper measured it and must cite an estimate or a finding; dashed and
  outlined means the authors propose it and must cite the sentence where they do, never a
  result. It is checked twice: the content build refuses a mismatch in a figure's params, and
  the primitive throws rather than draw one. Reason for both: the build catches it early with a
  clear message; the primitive means no figure file can route around the build.
- **A figure's `params`** (new on `{figure, caption, alt}`) are walked like a simulator's, and
  held tighter: no bare number, no text with a digit unless it is `{ text, ref }` found word for
  word in the cited passage, no context source. `{ text, ref }` exists because the paper prints
  "p = .023" and `.023` is not a number the `{ n, ref }` check can match.
- **The list of figures** is `FIGURE_KEYS` in `lib/content/figures.ts`. The build fails on a
  figure not listed; the typecheck fails when a listed figure has no component in the registry.
- **The figure guard** (`eslint.config.mjs`): no numeric literal outside a geometry prop, no
  digit in JSX text or in a figure's own strings. The import guard now also covers
  `components/figures/`. Seven fixtures in `scripts/fixtures/figure-guard/`.
- **The old flat shape may carry one `figure`** until 2E moves it into `layers.mechanism`.
  Reason: the three starter papers are not rewritten until 2E and the owner asked to see their
  figures now.
- **One fact added to the caffeine extraction**, `adenosine_block`, quoted from the paper's
  introduction. The lock-and-key figure needs the paper to say that caffeine blocks adenosine
  receptors, and no existing fact did. It is drawn as proposed.
- **The steps figure has no arrow**, and the browser test fails if an observational paper's
  figure ever contains one.
- **Turmeric has two figures**: the doorbell in the mechanism layer (every arrow dashed; only
  the last box, lower blood glucose, is filled) and the five readings in the protocol layer (no
  curve, no y-axis). The paper is still a draft.
- **Shown now** in the interim article layout, after the first paragraph of the layer (old
  shape: of the first section). 2D places them properly.
- **Evidence.** 16 rules broken on purpose, each caught by a unit test
  (`docs/evidence/phase9-2c-rules-broken.txt`); 5 browser-visible breaks
  (`phase9-2c-browser-rules-broken.txt`), one of which only failed once the break really
  overflowed a 360 px screen. Screenshots: `docs/evidence/figures/`.
- `supabase/seed.sql` changed (generated): the members' read now carries its figure. The hosted
  database has not been touched; the live members' read shows no figure until a seed push.

## 2026-11-13: turmeric-pepper-breakfast released (owner's request)

- **Owner's decisions:** the doorbell figure keeps its last box filled (measured: lower blood
  glucose) with every arrow dashed; the concept `glucagon-like-peptide` was approved by the
  owner (commit 19fe28a).
- **`publishedAt` cannot be typed.** A hand edit had left `"publishedAt": "null"` (a string) in
  the editorial, and the build published it with a made-up date. New rule in
  `lib/pipeline/editorial.ts` (`isTimestamp`): the value is null or a full UTC timestamp, which
  is what `npm run paper -- approve` writes. Tests in `lib/pipeline/pipeline.test.ts` refuse
  `"null"`, `"13/11/2026"` and a date with no time. The bad edit was undone with
  `npm run paper -- unpublish`, then the paper was approved with `npm run paper -- approve`.
- **Flow used:** approve, `npm run content:build` (4 papers: 3 free, 1 premium), all gates, the
  seed push, commit and push, live check.
- **The documented seed push writes nothing on a seeded project.**
  `supabase db push --remote --include-seed --yes` printed "Updating seed hash" and the row
  counts did not move (papers 3, steps 21). The same generated file was then applied with
  `supabase db query --remote --yes -f supabase/seed.sql`. Counts after: papers 4, reads 4,
  steps 30, turmeric free and published 1, turmeric steps 2, the members' HIIT read carries its
  figure. The seed is upserts of reference content only; no user table is touched
  (`scripts/seed-safety.test.ts`, 11 tests). MANUAL 3.3 and the db-change skill now say this.
- **No change** to migrations, scoring or evidence weights.

## 2026-11-14, housekeeping after the status check

- **The turmeric release was not committed when the last session ended**, although its entry
  above says "commit and push, live check". The hosted database had four papers while `main` and
  Vercel had three. Committed and pushed as `80e1caa`; live check in the entry's commit.
- **Hosted writes.** The owner confirmed that the `supabase db query --remote -f supabase/seed.sql`
  run was approved. **Rule from now on: no command against the hosted project without the
  owner's "go" for that command.**
- **`impeccable`** (`.claude/skills/impeccable/`, `.claude/agents/impeccable-*.md`) was installed
  by the owner and stays, committed on its own. It is subordinate to the ten colour tokens and
  the two fonts: where its advice and `app/globals.css` disagree, the tokens win. eslint now
  ignores `.claude/**` (its scripts produced 93 warnings; lint is back to none).
  `.claude/settings.local.json` (this machine's hooks) is in `.gitignore`.
- **2A, rule (b) dropped (owner's decision).** "A listed word in the mechanism's opening sentence
  fails even with a glossary entry" was the 2A session's reading, not the owner's wording. It is
  removed from `lib/pipeline/lint.ts` with its test. Rule (a) stays: a listed word with no
  glossary entry fails. `docs/evidence/phase9-2a-rules-broken.txt` is left as the record of
  2A as built (19 breaks; the rule set now has 18 of them).

## 2026-11-14, Phase 9, step 2D: the read rebuilt, the feed, one interactive figure

Done as the master prompt writes it, plus three amendments the owner gave on 2026-11-14. Where
they conflict with the master prompt, the amendments win.

- **The read** (`components/read/Article.tsx`), in order: the hook as an H2 with the reading time;
  "Why it happens" with the figure after the first paragraph and glossary words underlined; one
  number card; "What was tested" with the "Who this was tested in" panel; the simulator; "Put it
  in your Life Game"; "The receipts" (design, participants, effect, weak end, limitations in
  bold, all without a tap); members' extras. "Full receipts" holds what summaries leave out,
  the rest of the audit, every context source and the three-terms primer (it used to be its own
  expander). The three old-shape reads use the same page: their first section stands where the
  mechanism will, until 2E.
- **Shared pieces** (`components/read/parts.tsx`): `Para`, `Pictured`, `PullNumber`, `Glossary`.
  The article and the feed card draw with the same code.
- **Glossary.** A word with an entry is a button with a dotted underline; it opens the existing
  `Sheet` with the plain text, the concept's "picture to hold in mind" and reference when it is
  background, or the paper's passage when it rests on a fact.
- **The number card** shows the headline estimate and says "an absolute difference" with its
  95% range. When the paper gives no size (caffeine, turmeric: a finding), it shows what was
  found in words instead of a number. No number is invented to fill the card.
- **Search-the-build check** is now a test, `tests/http/members-content.test.ts`: every sentence
  of the members' read and of every paper's implementation notes is searched for in
  `.next/static` and the prerendered `.html`/`.rsc`. Zero matches. It first proves it can find a
  sentence that is public.

**Amendment A: the feed.**
- *Decision for the owner to confirm:* the prompt says "the home page becomes a feed, not a
  title list". In the repository the home page (`/`) is Today, the tracker; the title list is
  `/library`. The feed replaced the title list at `/library`. Moving the tracker off `/` would
  change the installed app's start page and the tab bar, so it was not done without asking.
- A card (`components/read/Feed.tsx`) shows the hook (H2), reading time, the mechanism figure in
  its first view, the number card with its source line, and the grade chip. A card is one link
  and holds no button. Twenty at a time, with a "Show more" button; no endless scroll.
- **A members' read on the feed.** Its hook and mechanism figure had never been public. The
  content build now writes them (and nothing else: no caption, no number card) into the public
  metadata as `PaperMeta.card`, for premium papers only. This is the owner's instruction and the
  one deliberate exception to "nothing of a members' read in the browser"; the search-the-build
  test asserts the card holds exactly `hook` and `figure`.

**Amendment B: interactive figures.**
- React state and SVG only; no dependency added.
- One figure is interactive: turmeric's readings grid (`FiveReadings`). Tap or focus a dot and
  the panel under it shows the paper's own sentence with "From the paper, word for word". An
  orange dot quotes the result that flags it; any other dot quotes what the paper says of that
  meal's readings (`timepoints`; for the turmeric meal, `turmeric_none`). Each row's fact is in
  `editorial.json` (`meals[].reading`), so the build ties it to the paper.
- The first view is unchanged in meaning: two orange dots, the bracket, nothing picked.
- **Geometry by calculation.** `components/figures/scale.ts`: a reading sits where its minute
  puts it. To make every dot a 44 px target at 360 px, the row names moved above their rows
  and the figure now runs edge to edge in its card; the spacing was not bent.
  `scripts/figure-states.test.ts` asserts the spacing ratios equal the minute ratios, that the
  positions move when the fact moves, and the 44 px gap.
- **Every state.** The same test walks all 20 states: each shows a verbatim passage of a fact of
  this paper, and only a result is drawn as differing.
- **The figure guard** now also refuses timers, animation loops and SVG animation elements in a
  figure file. A state that starts on a number was already refused (it is a numeric literal
  outside a geometry prop); there is now a fixture proving it. `tabIndex` joined the allowed
  props. Three new fixtures: `good-interactive`, `bad-state-number`, `bad-ambient-motion`.
- **The entrance animation of figures is removed** (`figure-enter`): it was decorative, and
  motion is now for measured change only. No figure here shows a change over time, so none moves.
- Design notes are in each figure file only where it is interactive (FiveReadings). Proposed,
  not built: caffeine's lock (tap to swap the real key and the blank key); steps' bars (tap a
  bar for the paper's sentence and range); HIIT's three gauges (tap a row for the pooled result
  and its certainty); turmeric's doorbell (tap a step for the sentence where the authors
  propose it).

**Amendment C: quiet motion for toggles.** Tokens beside the colour tokens in `app/globals.css`:
`--motion-fast` 120 ms, `--motion` 160 ms, `--motion-slow` 180 ms, `--ease-out`. A picked
option, a switch, an opened expander, a revealed passage and the sheet settle once, with
transform and opacity only. Under `prefers-reduced-motion` the animation is `none`: the browser
test checks both.

**For the owner.** `supabase/seed.sql` changed (the turmeric figure's params). The hosted
database was **not** touched: the read is free and bundled, so the site does not depend on it.
It needs the owner's "go" to bring the hosted seed level.

