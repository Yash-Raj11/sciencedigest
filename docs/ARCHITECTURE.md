# Science Digest: architecture

The system as built on 2026-11-12. For *how to change things* see `docs/MANUAL.md`; for every
column and constraint see `docs/data-model.md`; for the rules that must stay true see `CLAUDE.md`.
This document is the map that connects them.

---

## 1. The shape in one picture

```
                        ┌──────────────────────── YOUR MAC ONLY ───────────────────────┐
  Europe PMC ──fetch──▶ │ content/papers/<slug>/                                         │
  (open papers)         │   source.txt ─extract─▶ extraction.json ─draft─▶ editorial.json │
  Retraction Watch ───▶ │        (AI model)    GATE (code)      (AI model)    LINT (code) │
  (nightly CSV)         │                                         approve (you)          │
                        │   npm run content:build                                        │
                        │     ├─▶ lib/content/generated.ts   (free reads, steps, meta)   │
                        │     ├─▶ content/generated/*.json   (members' reads, IG decks)  │
                        │     └─▶ supabase/seed.sql          (same content, for the DB)  │
                        │   /admin/queue  ── you approve each Instagram deck             │
                        └────────────────────────────────────────────────────────────────┘
                                         │ git push
                                         ▼
  ┌──────────── PHONE / BROWSER ────────────┐         ┌────────────── SUPABASE ───────────────┐
  │ Next.js app (installable, offline)      │         │ Postgres + row level security         │
  │  screens ─▶ useGame / useProtocol       │         │  papers            (world-readable)   │
  │              │                          │  sync   │  paper_content     (free OR member)   │
  │              ▼                          │◀──────▶ │  protocol_steps    (paper + habits)   │
  │  Zustand store  (ids + dates only)      │  queue  │  step_checkins     (THE tick table)   │
  │   └─ localStorage "sd-store-v1"         │         │  step_amounts      (glasses, pages)   │
  │  score() runs here for instant feedback │         │  compute_adherence() = same score     │
  └─────────────────────────────────────────┘         └───────────────────────────────────────┘
```

Three rules hold the shape together:

1. **Content is written once; what a person did is recorded as ticks; every number is derived.**
   Nothing stores a score, a percentage or a streak.
2. **The device stores ids and dates, never labels, weights or estimates.** A correction to a
   paper reaches every user on their next visit.
3. **The same scoring rule exists twice** (TypeScript for instant feedback, SQL so the client
   cannot lie) and a generated test proves they agree.

---

## 2. Layers

| Layer | Lives in | Knows about | Must not know about |
|---|---|---|---|
| Screens | `app/`, `components/` | React, the store hooks | Supabase, how scores are computed |
| Per-paper widgets | `components/papers/<slug>/` | `useProtocol()`, shared primitives | the store, Supabase, percentages (lint-enforced) |
| View models | `lib/store/game.ts`, `lib/protocol/useProtocol.ts` | store + content + `score()` | the network |
| Store | `lib/store/index.ts`, `reduce.ts` | `Data`, `Write` | content labels, weights |
| Sync | `lib/store/sync.ts`, `lib/supabase/remote.ts` | Supabase, the queue | screens |
| Pure logic | `lib/score.ts`, `dates.ts`, `evidence.ts`, `progress.ts`, `conflicts.ts`, `companion/mood.ts`, `pipeline/*` | nothing outside itself | React, Next, Supabase |
| Database | `supabase/migrations/` | its own tables | the app |

The pure-logic row is what a future native app would reuse unchanged.

---

## 3. State management

### 3.1 What the device holds

One Zustand store (`lib/store/index.ts`), persisted to `localStorage` under `sd-store-v1`.

```ts
data: {
  equipped: { paperId, since }[]                    // protocols in play
  ticks:    { "2026-11-12": ["step-id", ...] }      // by LOCAL date
  amounts:  { "2026-11-12": { "habit-id": 7 } }     // target/count habits only
  program:  { [paperId]: { blockStartedAt, choices } }
  habits:   { id, label, position, retired, kind, unit, target }[]
}
queue:   Write[]                                   // not yet on the server
sync:    { status: local|idle|syncing|offline|error, lastError, lastSyncedAt }
session: { userId, anonymous, email, tier }
```

Kept 400 days back; older ticks and amounts are pruned when saved. Version 2 of the saved shape
(adds `amounts` and habit kinds) migrates version 1 in place, losing nothing.

Kept **outside** the store, deliberately, because they are per-device conveniences:
theme choice (`sd-theme`), the companion picture (`sd-avatar`), and "day-complete already
shown today" (`sd-day-complete`).

### 3.2 One way in: `dispatch(write)`

Every user action becomes one `Write`, and `applyWrite(data, write)` in `reduce.ts` is a pure
function that returns the next `data`:

| `op` | Produced by |
|---|---|
| `tick` / `untick` | tapping a box |
| `amount` | `+1` on a target/count widget (carries `needed`, so replay never needs a lookup) |
| `equip` / `unequip` | "Add to Life Game" |
| `program` | track choices, block start date |
| `habit_add` / `habit_update` | adding, renaming, retiring a habit |

`dispatch` applies the write locally (the screen updates at once) and appends it to `queue`.
`enqueue` collapses writes that supersede each other: six taps on the water widget while offline
leave **one** `amount` write, carrying 6.

### 3.3 Reading: two hooks

- **`useGame()`** (`lib/store/game.ts`) builds everything Today needs in one memoised pass:
  the score, streak, week strip, habits, amounts, protocol views, conflicts and the weighted-bar
  segments. It recomputes only when `data` or the local date changes.
- **`useProtocol(slug)`** narrows that to one paper for its widget: rows, `progress.pct`,
  `locked`, choices and the actions it may call. Widgets get everything from here, which is why
  the lint can forbid them from importing the store at all.

The local date comes from `useToday()`, a `useSyncExternalStore` clock that re-checks every 30 s
and on returning to the tab, so a phone left open overnight rolls to the new day.

### 3.4 Sync (`lib/store/sync.ts`)

```
tap ─▶ dispatch ─▶ applyWrite (screen updates) ─▶ queue ─▶ 400 ms debounce ─▶ flush()
                                                                               │
          ┌────────────────────────────────────────────────────────────────────┘
          ▼
  ensureUser()            first write ever: signInAnonymously() → a real auth.uid()
                          (with a Turnstile token as captchaToken when a site key is set)
  send writes oldest-first through remote.ts
     ├─ accepted        → remove from queue
     ├─ refused forever → drop, record lastError        (e.g. step retired)
     └─ network failure → stop; retry at 2 s, 4 s … max 60 s; or on the "online" event
  pull()                  server copy of the last 400 days
  reconcile(server, queue) replay still-unsent writes on top → new local data
```

**Demo mode** (`isDemo`, no Supabase variables): `flush` empties the queue and the device copy
is the only copy. Everything else behaves the same.

**Signing up** links an email to the anonymous user (`linkEmail`). Same user id, same rows:
there is nothing to merge.

### 3.5 Trace: one glass of water, end to end

A target habit "Drink 3 L of water", 12 glasses, currently 11 logged today.

| # | Where | What happens |
|---|---|---|
| 1 | `HabitTiles.tsx` | Tap `+ 1 glasses` → `setAmount(id, 12)` |
| 2 | `store/index.ts` | Looks up the habit, `neededFor` = 12, dispatches `{op:"amount", amount:12, needed:12}` |
| 3 | `reduce.ts` | Sets `amounts[today][id] = 12`; since 12 ≥ 12, also applies `{op:"tick"}` |
| 4 | `useGame()` | Recomputes: consistency 1 of 3 → 2 of 3 |
| 5 | `Companion.tsx` | `moodOf({done:2,total:3})` = `lively`; the cat hops once |
| 6 | `sync.ts` | 400 ms later, `remote.ts` upserts `step_amounts (…, amount 12)` |
| 7 | Postgres | `amount_guard` checks owner, kind, date window; `amount_sync_tick` inserts the `step_checkins` row |
| 8 | `pull` + `reconcile` | Server copy now has the amount **and** the tick; matches the device |

Tap `− 1` and the same path runs in reverse: 11 < 12, so step 3 unticks and step 7 deletes the
check-in row.

---

## 4. Scoring

### 4.1 The rule

`score()` in `lib/score.ts`, mirrored by `compute_adherence(p_user, p_date)` in SQL.

- Each step carries a weight from its evidence grade: high **1.0**, moderate **0.7**, low **0.4**,
  none **0**. Sums are done in tenths (10, 7, 4, 0) so neither side can round differently.
- `pct = earned ÷ possible`, rounded half-up.
- A protocol untouched for more than **7 days** is dormant and leaves the sum entirely.
- **Consistency** is the second number: daily tick boxes done ÷ daily tick boxes, every box
  worth 1, everyday habits included. Session logs that a weekly target counts are not daily boxes.
- **Streak**: consecutive days, ending today or yesterday, with at least one tick.

How a step is satisfied: `action` = ticked today; `weekly_target` = its counted step ticked
≥ N times since Monday; `condition` = `block_weeks_gte` or `modality_is` against `program`.

### 4.2 Worked example (output of the real function)

Today is Thursday 2026-11-12. Three papers equipped, one habit.

| Step | Paper | Kind | Grade | Weight | State today |
|---|---|---|---|---|---|
| A | P1 | action | high | 1.0 | ticked |
| B | P1 | action | moderate | 0.7 | not ticked |
| C | P2 | action | low | 0.4 | ticked |
| LOG | P2 | action (session log) | none | 0 | logged Mon and Wed |
| W | P2 | weekly_target: LOG ≥ 3 | low | 0.4 | 2 of 3 |
| H | habit | action | none | 0 | ticked |
| Z | P3 | action | high | 1.0 | P3 last active 2026-11-01 |

```
P3: 11 days since last activity > 7          → dormant, Z leaves the sum
possible = A 1.0 + B 0.7 + C 0.4 + W 0.4     = 2.5
earned   = A 1.0 + C 0.4                     = 1.4
pct      = 14 / 25 tenths                    = 56 %
  P1 = 10 / 17 = 58.8 → 59 %      P2 = 4 / 8 = 50 %
consistency: daily boxes A, B, C, H (LOG is a log, W is derived) → 3 of 4 = 75 %
streak: ticks on 12, 11, 10, 9 November                          → 4 days
```

`score()` returned exactly `pct 56, earned 1.4, possible 2.5, P1 59, P2 50, dormant [P3],
consistency 3 of 4 (75)`, streak 4. The habit H moved consistency and the streak but not the
56 %: that is the "two numbers, one currency" decision.

### 4.3 Why this stays honest

- `npm run parity:gen` writes 40 random scenarios into
  `supabase/tests/database/90_parity.generated.test.sql`; Postgres must return what TypeScript
  returns for all of them (80 assertions).
- Amounts never enter scoring. A trigger turns "amount ≥ target" into an ordinary tick, so adding
  the three widget types changed neither `score()` nor `compute_adherence()`.
- The companion's mood reads only today's boxes and the streak; a unit test fails if any of its
  lines mentions health.

---

## 5. Content and gating

### 5.1 Where a read comes from

| Paper tier | Public part (title, teaser, protocol) | Full read | Members' extras |
|---|---|---|---|
| free | bundled in `generated.ts`, pre-rendered | bundled, in the page HTML | `paper_feature_content`, RLS |
| premium | bundled, pre-rendered (SEO, Instagram links) | `paper_content`, **RLS decides** | `paper_feature_content`, RLS |

`lib/content/gated.ts` returns `ok | locked | error`. "Locked" is simply RLS returning no row.
The members' read is **not** in the public HTML or JavaScript (checked by searching the build for
a sentence that only that read contains: zero matches). In demo mode a dev-only route,
`/api/demo/gated/[slug]`, stands in for the database and answers 404 once Supabase is set.

### 5.2 The pipeline

| Stage | Command / file | Model? | Refuses when |
|---|---|---|---|
| 0 Ingest | `paper -- fetch` → `europepmc.ts`, `license.ts`, `retractions.ts` | no | licence not CC-BY / CC-BY-SA / CC0; DOI retracted |
| 1 Extract | `paper -- extract` → `lib/ai/provider.ts`, `prompts.ts` | yes | — |
| 2 Gate | `gate.ts`, `grade.ts` | no | a quote is not in `source.txt`; a number is not in its quote |
| 3 Draft | `paper -- draft` | yes, **sees only the validated facts** | — |
| 4 Lint | `lint.ts` | no | banned words, causal verbs without RCT, relative without absolute, orphan numbers, no limitation |
| 5 Approve | `paper -- approve` (you) | no | stage 2 or 4 fails |
| Build | `content:build` → `assemble.ts` | no | a *published* paper fails (drafts are reported only) |

Retracted after publishing: `npm run retractions` runs the DOI join backwards over every live
paper and calls `withdraw_paper()`, which hides the read and drops its steps to weight 0.
Because scores are derived, everyone's history recalculates on its own.

Instagram decks come out of the same build and are approved by hand at `/admin/queue`
(local-only; 404 on the deployed site). An approval file records a fingerprint of the deck, so a
deck whose wording changes drops back to "changed".

---

## 6. Database

Four migrations, applied in order:

| Migration | Adds |
|---|---|
| `20261112000100_core` | enums, `evidence_weight()`, 9 tables, RLS on all, column grants, tick guards, `withdraw_paper()` |
| `20261112000200_scoring` | `compute_adherence()`, `compute_streak()` |
| `20261112000300_premium` | `has_feature()`, `paper_feature_content`, `regimen_analysis()` |
| `20261113000100_habit_kinds` | `habit_kind / unit / daily_target`, `step_amounts`, amount guard, amount→tick trigger |

Every tick goes through `step_checkins`, guarded so that only a live `action` step, on your own
habit or an equipped paper, within a week back / a day ahead, can be ticked. A user can update
only `timezone` on their own profile, so promoting oneself to premium fails with `42501`.

Full tables and constraints: `docs/data-model.md`.

---

## 7. Screens

| Route | File | Purpose |
|---|---|---|
| `/` | `components/game/Dashboard.tsx` | Today: companion, score card, habit tiles, protocol tiles, day-complete moment |
| `/library` | `app/library/page.tsx` | Every paper with its evidence pips |
| `/papers/[slug]` | `components/read/Article.tsx` | The read (tap a dot for the source passage), simulator, protocol, members' extras |
| `/me` | `components/me/Settings.tsx` | Theme, companion picture, account and sync, membership, how scoring works |
| `/upgrade` | `app/upgrade/page.tsx` | What membership adds (payments not on) |
| `/admin/queue` | `components/admin/QueueBoard.tsx` | Instagram review, local only |

**Widgets.** Every tile on Today opens a bottom sheet (`components/shell/Sheet.tsx`, a native
`<dialog>`). Habit tiles come in three kinds: *check* (full view: 42-day grid), *target* (week
bars against a dashed target line), *count* (today's count, pips, compared with yesterday).
Paper protocol tiles open the paper's own widget. Full views read history already on the device:
opening one makes no request.

**Simulators.** `components/papers/registry.tsx` maps a simulator kind to a component. Each
starter paper has its own; any new paper falls back to `_generic/` (the "estimate explorer").
All plot rows go through `components/sim/IntervalPlot.tsx`, and every number they draw is a fact
from the paper. The real-life planners (build a session; walking minutes from your own step
counts) are labelled as the reader's arithmetic, not findings.

**Theme.** Ten colour tokens at the top of `app/globals.css`, defined for light (white + orange)
and dark (black + orange). A script in `<head>` sets the theme before first paint.

**Installable and offline.** `app/manifest.ts` plus `public/sw.js`: pages network-first,
build files cached.

---

## 8. File structure

```
sciencedigest/
├── CLAUDE.md                     rules that must stay true (read by Claude Code)
├── README.md                     commands and starter-paper citations
├── .env.example                  every setting, with where to find it
├── eslint.config.mjs             includes THE WIDGET GUARD for components/papers/**
├── app/                          routes (Next.js App Router)
│   ├── layout.tsx                theme boot script, StoreBoot, TabBar
│   ├── globals.css               the ten colour tokens, fonts, the few animations
│   ├── manifest.ts               home-screen install
│   ├── page.tsx                  /            → Dashboard
│   ├── library/  me/  upgrade/  papers/[slug]/  admin/queue/
│   └── api/
│       ├── admin/queue/route.ts          local-only approvals
│       └── demo/gated/[slug]/route.ts    demo-mode stand-in for members' content
├── components/
│   ├── game/                     Today: Dashboard, Companion, HabitTiles, DayComplete, LifeBar
│   ├── papers/
│   │   ├── registry.tsx          slug/kind → component
│   │   ├── _generic/             fallback Simulator + Widget for any new paper
│   │   └── <slug>/               Simulator.tsx, Widget.tsx (visual only; lint-guarded)
│   ├── protocol/primitives.tsx   tick rows, ring, grade chip, choice picker, ProtocolPanel
│   ├── read/                     Article, MemberExtras
│   ├── sim/IntervalPlot.tsx      shared estimate-with-range plot
│   ├── shell/                    StoreBoot, TabBar, Sheet
│   ├── me/Settings.tsx
│   └── admin/QueueBoard.tsx
├── lib/
│   ├── score.ts                  ★ the scoring rule (pure)          + score.test.ts
│   ├── evidence.ts               ★ weights 1.0 / 0.7 / 0.4 / 0
│   ├── dates.ts  progress.ts  conflicts.ts  theme.ts
│   ├── store/
│   │   ├── reduce.ts             ★ Data, Write, applyWrite, enqueue, reconcile (pure) + tests
│   │   ├── index.ts              the Zustand store, persistence, actions
│   │   ├── sync.ts               queue flush, anonymous sign-in, retry
│   │   └── game.ts               useGame(), useToday()
│   ├── protocol/useProtocol.ts   what a widget is allowed to see
│   ├── supabase/                 client.ts (isDemo), remote.ts (writes + pull)
│   ├── companion/                mood.ts (+ tests), avatar.ts (on-device picture)
│   ├── content/                  index.ts, types.ts, gated.ts, generated.ts (GENERATED)
│   ├── pipeline/                 gate, lint, grade, license, retractions, europepmc,
│   │                             extraction, editorial, assemble, markup, format, prompts (+ tests)
│   ├── ai/provider.ts            the one file that knows the model
│   └── demo/regimen.ts           demo-mode stand-in for regimen_analysis()
├── content/
│   ├── papers/<slug>/            source.txt, extraction.json, editorial.json  ← edit these
│   ├── generated/                gated.json, carousels.json                  (GENERATED)
│   └── queue/                    Instagram approval records (commit them)
├── scripts/
│   ├── paper.mts                 fetch | extract | draft | approve | unpublish
│   ├── content-build.mts         gate + lint every paper, write generated files
│   ├── retractions-sync.mts      nightly backward retraction check
│   ├── gen-parity.mts            writes the TS-vs-SQL parity test
│   ├── db-test-local.sh          pgTAP without Docker
│   └── db-mutation-test.sh       break each rule, confirm a test fails
├── supabase/
│   ├── config.toml               anonymous sign-ins on
│   ├── migrations/               4 files, §6
│   ├── seed.sql                  (GENERATED) starter papers
│   └── tests/database/           01–06 + 90_parity.generated
├── public/                       sw.js, icons/
└── docs/
    ├── ARCHITECTURE.md           this file
    ├── MANUAL.md                 how to run, change, add papers, deploy; glossary
    ├── data-model.md             every table and constraint
    ├── BUILD-LOG.md              decisions and why
    └── evidence/                 latest test outputs
```

★ = changing it changes what every user's history means. Change TypeScript and SQL together,
then `npm run parity:gen`.

---

## 9. Verification at the time of writing

| Check | Result | Output |
|---|---|---|
| Unit tests (score, store, companion, pipeline) | 108 of 108 | `docs/evidence/unit-tests.txt` |
| Database tests (7 files) | 177 of 177 | `docs/evidence/database-tests.txt` |
| Mutation tests | 14 of 14 broken rules caught | `docs/evidence/mutation-tests.txt` |
| Browser walkthrough, dark and light | 40 of 40 | run during the build session |
| Lint (including the widget guard), typecheck, production build | clean | — |

Run against a local Postgres and a headless browser, **not** against the live Supabase project.

---

## 10. Not built

| Missing | What it needs |
|---|---|
| Home-screen widgets (Android, iPhone) | A native wrapper (Capacitor) first; a website cannot place them |
| Payments | Stripe and a server route that sets `subscription_tier` |
| Instagram slide images | The 12 carousel Studio files, which are not in the repository |
| Reads loaded on demand | Free reads are bundled (~15–20 KB each); move to per-page loading past ~50 papers |
| Incremental sync | `pull()` re-reads 400 days on each open; fetch only changes at scale |
