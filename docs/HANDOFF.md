# Science Digest: handoff for the next phase

**Give this whole file to a new chat.** It is self-contained and replaces the earlier
"Science Digest — Build Brief". Written 2026-11-12, at the end of the build sessions.

The code is the source of truth. If anything here disagrees with the repository, the repository
wins and this file needs correcting.

- Repository: `github.com/Yash-Raj11/sciencedigest`, on the owner's Mac at `~/Game/sciencedigest`
- Live site: deployed on Vercel from `main` (project `sciencedigest-a4ms`)
- Owner: Yash. Wants plain language, questions asked when something is unclear rather than
  guessed, and test output as proof rather than "it should work".

---

## 1. What this is

A phone-first app that turns open clinical research papers into 2–5 minute reads. Each read
ends with an interactive simulator and a protocol the reader can add to a daily tracker, the
**Life Game**. The tracker shows how much of what you took on is in place today, with each item
**weighted by how strong its evidence is**. A cat companion reacts to what you tick. Instagram
carousels, generated from the same checked facts and approved by hand, are the marketing.

Free to start; membership later adds more papers and more depth inside papers you already track.
Health science first, broader later.

The interactive part is the product; the text is what justifies it.

---

## 2. Where it stands

### Done and verified

| Piece | State | Proof |
|---|---|---|
| Database: 4 migrations, row level security on every table | Built | 177 of 177 database tests; 14 of 14 deliberately broken rules caught |
| Scoring in TypeScript and SQL, kept identical | Built | 80-assertion parity test |
| Store, offline queue, anonymous sign-in on first tap | Built | Unit tests |
| Screens: Today, Library, read page, Me, Membership | Built | 40-step browser walkthrough, dark and light |
| Cat companion, own-picture option | Built | Unit tests on moods; browser test |
| Three habit widget types (tick off, daily target, count), tiles that open into a full view | Built | Database and browser tests |
| Day-complete moment | Built | Browser test (shows once a day) |
| Three papers with simulators + a generic simulator for new papers | Built | Content build passes gate and lint |
| Content pipeline: gate, lint, licence and retraction checks | Built | Unit tests |
| Pipeline commands (`npm run paper -- fetch / extract / draft / approve`) | Written | **Never run live** |
| Instagram review queue (`/admin/queue`, local only) | Built | Browser and API tests |
| Installable to the home screen, opens offline | Built | Manifest and service worker served |
| Documents: `CLAUDE.md`, `docs/MANUAL.md`, `ARCHITECTURE.md`, `data-model.md`, `BUILD-LOG.md` | Written | — |

Totals at handoff: 108 unit tests, 177 database assertions, 14 of 14 mutations caught. Outputs
are in `docs/evidence/`. All of this ran against a **local** Postgres and a headless browser.

### Deployment state (checked on the owner's Mac)

- The app was committed and pushed (`45aa11f`). Vercel then added and merged a "Web Analytics"
  change on GitHub (`<Analytics />` in `app/layout.tsx`). **The Mac is 2 commits behind.**
- The Mac has uncommitted: `package.json` / `package-lock.json` (the same analytics package) and
  `docs/ARCHITECTURE.md`. A `git pull` merges cleanly; there is no conflict.
- `.env.local` has the Supabase URL and anon key. Whether the same two values are set in Vercel,
  whether `supabase db push --include-seed` has been run, and whether anonymous sign-in is on in
  the Supabase dashboard **have not been confirmed**.

### Not built

Home-screen widgets on phones; the native app wrapper; payments; CAPTCHA token on sign-in;
Instagram slide images (the 12 carousel Studio files are not in the repository); reads loaded on
demand; incremental sync. Phases below.

---

## 3. Stack

Next.js 16 (App Router; differs from older versions, read `node_modules/next/dist/docs/` before
using an API from memory), React 19, Tailwind 4, TypeScript, Zustand 5, Supabase (Postgres,
anonymous auth, row level security), zod, vitest, pgTAP, Vercel hosting. Fonts are pinned npm
packages (Archivo, Newsreader), never fetched from a CDN.

---

## 4. Architecture in brief

Full version with diagrams and a traced example: `docs/ARCHITECTURE.md`.

```
Mac only:  paper → fetch → extract (model) → GATE (code) → draft (model, sees facts only)
           → LINT (code) → approve (owner) → content:build → generated files + seed.sql
Phone:     screens → useGame / useProtocol → Zustand store (ids + dates) → queue → sync
Supabase:  papers (public) · paper_content (RLS) · protocol_steps · step_checkins (THE tick
           table) · step_amounts · compute_adherence() mirrors score()
```

**State on the device** (`lib/store/index.ts`, saved as `sd-store-v1`):

```ts
data: {
  equipped: { paperId, since }[]
  ticks:    { "2026-11-12": ["step-id"] }          // by LOCAL date
  amounts:  { "2026-11-12": { "habit-id": 7 } }    // target/count habits
  program:  { [paperId]: { blockStartedAt, choices } }
  habits:   { id, label, position, retired, kind, unit, target }[]
}
queue: Write[]     // ops: tick, untick, amount, equip, unequip, program, habit_add, habit_update
```

Everything a user does is one `Write` through `dispatch()` → pure `applyWrite()` → queue →
`sync.ts` (oldest first, retry 2 s doubling to 60 s, then pull and replay unsent writes).

**Scoring** (`lib/score.ts` = `compute_adherence()` in SQL): weights high 1.0, moderate 0.7,
low 0.4, none 0, summed in tenths. Protocols untouched for over 7 days leave the sum. Second
number: **consistency**, daily boxes done ÷ daily boxes, every box equal, habits included.
Streak: consecutive days with a tick, counted to yesterday if today has none yet.
**An amount never enters scoring**: a trigger turns "amount ≥ target" into an ordinary tick.

---

## 5. Content rules (non-negotiable; most are enforced in code)

| | Rule | Enforced in |
|---|---|---|
| H1 | No hype words: biohack, superfood, miracle, game-changer, secret, holy grail, boost, skyrocket, shatter, destroy, turbocharge, supercharge, science proves, proven to, life-changing, insane, transform your, optimize your | `lib/pipeline/lint.ts` |
| H2 | Open with the counter-intuitive number or the named mechanism. Any percentage in a headline is absolute or marked relative | prompt + lint |
| H3 | Observational studies never get causal verbs. Trials get them only for the population studied, shown in its own panel | lint |
| H4 | Animal and cell studies never become human protocols; species is a required field | gate |
| H5 | No relative figure without the absolute one; always the effect size and what the weak end of the 95% range means | lint |
| H6 | At least one limitation, shown prominently | lint |
| H7 | Every number in a widget traces to a fact in the paper | build fails on bare numbers |
| H8 | No score claims to measure the body. A tick means an action was taken | scoring design, companion test |

Licences accepted: **CC-BY, CC-BY-SA, CC0 only.** Every extracted fact carries a verbatim quote
that must be found in the paper, or the extraction is rejected.

---

## 6. Decisions already made: do not reopen without the owner

1. **Open source means open corpus and open code, not local models.** Use a strong API model
   behind `lib/ai/provider.ts`.
2. **`papers` is world-readable, members' rows included**; only `paper_content` and
   `paper_feature_content` are gated. Premium is decided by row level security, never by
   hiding something in the browser.
3. **Anonymous sign-in from the first tap.** Signing up links an email to the same user.
4. **Ticks reference step ids.** Steps are retired, never deleted; a step's `key` is never renamed.
5. **Scores are derived, never stored.** No `score`, `points` or `streak` column, ever.
6. **The device stores what the user did and nothing else.**
7. **No second points currency.** No XP, coins or bonus points. Two numbers: evidence-weighted
   adherence (paper steps only) and consistency (every box), plus the streak.
8. **Tracking is free for good.** A lapsed member keeps ticking, streak and history.
9. **Nothing posts to Instagram by itself.** The pipeline stops at the approval queue.
10. **One codebase, phone-first**; native shell later for the stores and home-screen widgets.
11. **The companion follows what was ticked, never health.** No sick or dying state; lowest is
    asleep. A test fails if its wording mentions health.
12. **The companion picture stays on the device** (256 px, browser storage, never uploaded).
13. **A habit's kind and target are fixed once made**, so old days keep their meaning.
14. **Per-paper widgets are visual only.** The lint forbids them from importing the store,
    Supabase or any percentage maths.
15. **Simulator planners that use the reader's own numbers** are labelled as the reader's
    arithmetic, never as findings.

---

## 7. Next phases, in order

Each phase ends with a gate. Do not start the next until it passes and the output has been shown.

### Phase 8: make the live site real (first, small)

1. On the Mac: `git pull`, commit the 3 leftover files, push.
2. Confirm in Vercel: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
   (the code accepts the anon key or `..._PUBLISHABLE_KEY`). Redeploy.
3. `supabase db push --remote --dry-run --include-seed`; turn on **Allow anonymous sign-ins**
   in the dashboard.
   *Note:* on Supabase CLI 3.x, leaving out `--remote` targets the local Docker database, not
   the hosted project. On 2026-11-12 the dry run showed the hosted project
   (`takhienzcshgkytbvaii`) already up to date: all four migrations and the seed applied.
4. Run the database tests **against the linked project**, not only locally. `supabase test db
   --remote` needs Docker on CLI 3.1.0. Without Docker: install pgTAP for the run
   (`create extension if not exists pgtap with schema extensions`), run the test files through
   `psql` (password typed at its prompt), then `drop extension pgtap`. **Never point
   `npm run db:test:local` at a Supabase database**: its shim creates, and its cleanup drops,
   the `anon`, `authenticated` and `service_role` roles. Done 2026-11-12: 177 of 177.
5. Turn on CAPTCHA (Cloudflare Turnstile is free) and pass the token in `ensureUser()` in
   `lib/store/sync.ts`; the line is marked.
6. Make unknown paper addresses return a real 404 status (they show the not-found page today
   but do not report 404). Remove the unused `@fontsource/newsreader` and
   `@fontsource/ibm-plex-mono` packages.

**Gate:** on the live site, Me shows "Everything is saved" (not "Demo mode"); a tick appears as a
row in `step_checkins`; a second browser cannot read it; the members' read stays locked for a
free user; all database tests green against the live schema.

### Phase 9: first live run of the paper pipeline

1. `npm run retractions` once (first real clone of the Retraction Watch data).
2. Pick one CC-BY paper; run `fetch`, `extract`, `draft`. Fix whatever breaks on first contact
   with Europe PMC and the model API (all of it has unit tests, none of it has run live).
3. Owner reads the draft against the paper and approves. Then `content:build` and release.

**Gate:** a fourth paper is live, went through every stage, and the gate or lint refused at
least one thing along the way that was then fixed in the JSON, not by loosening a rule.

### Phase 10: Instagram slide images

The owner has the 12 carousel Studio files (`lib/carousel/*`, `SlideRenderer.tsx`, export
route, `verify-parity.mts`, etc.). Copy them in, then map `content/generated/carousels.json` to
their deck format. Keep their rules: Satori needs `display: flex` on every element with children
and inline styles only; fonts must be `.woff`, not `.woff2`; `≤` and `✓` render as boxes, so the
linter fails closed on unverified characters; 1080×1350, at most 10 slides. Put the export
route behind a check so it is not a free image-rendering service on the internet.

**Gate:** `verify-parity.mts` passes; an approved deck exports to PNGs with no missing glyphs.

### Phase 11: native app and home-screen widgets

The owner wants Today's widgets on the Android and iPhone home screen, small and opening into
the full view, like the in-app tiles.

1. Wrap the app with **Capacitor** (`android/` and `ios/` folders). The app loads the deployed
   site or a bundled build; decide which (bundled works offline from first launch but needs a
   store release for every change; remote updates instantly).
2. **The widget data contract.** The app writes one small snapshot whenever the store changes,
   to storage the widget can read (Android: SharedPreferences; iOS: an App Group). Proposed:
   ```json
   { "date": "2026-11-12", "mood": "lively", "streak": 4,
     "consistency": { "done": 2, "total": 3 },
     "tiles": [{ "id": "…", "label": "Drink 3 L of water", "kind": "target",
                 "amount": 7, "target": 12, "unit": "glasses", "done": false }] }
   ```
   Labels go in the snapshot because a widget cannot look them up; it is a display cache, never
   a source of truth, and is rewritten on every change.
3. **Taps from the widget.** Android widgets and iOS 17+ widgets (App Intents) can have buttons.
   A tap appends a `Write` to a shared pending list; the app drains it into the normal queue
   when it next runs. **Owner decision needed:** is "your widget tap reaches the server the next
   time you open the app" acceptable, or must the widget sync on its own (it would then need the
   user's session token in shared storage)?
4. Android widget in Kotlin (Glance); iOS widget in Swift (WidgetKit). iPhone needs Xcode and,
   for anything beyond the owner's own phone, a paid Apple developer account.
5. Native code cannot be compiled from a cloud session. Write it, then the owner builds in
   Android Studio / Xcode and reports errors back.

**Gate:** on a real Android phone, a widget shows today's count, `+1` changes it, and the app
shows the same number after opening. Then the same on iPhone.

### Phase 12: payments

Stripe Checkout; a server route (Vercel function) verifies Stripe's webhook signature and sets
`user_profiles.subscription_tier` using the **service role key** (server only). The browser can
never set the tier: database test 5 already proves an update from the user fails with `42501`.
Decide the real members' feature list (the `features` table has two placeholders,
`regimen_analysis` and `key_takeaways`). Cancelling stops members' content; tracking continues.

**Gate:** a test-mode payment unlocks the members' read on a second device; a test-mode
cancellation locks it again and the streak is untouched.

### Phase 13: scale (only when needed)

- **Reads on demand.** Free reads are bundled into the app download (~15–20 KB each). Past
  roughly 50 papers, load each read with its page instead.
- **Incremental sync.** `pull()` re-reads 400 days on every open; fetch only rows changed since
  the last sync.
- Revisit the 7-day dormancy window and the moderate weight (0.7 is a working value) against
  real usage. Each lives in one constant on each side; change both and run `npm run parity:gen`.

### Backlog (owner has not asked for these yet)

A short check after each read, drawn from the paper's facts; a bespoke simulator for each new
paper; streak protection ("rest day") rules; sharing a finished day as an image.

---

## 8. How to work in this repository

- Read `CLAUDE.md` first. It lists the rules the code enforces and the ones that need judgment.
- Before calling anything done: `npm run lint && npm run typecheck && npm test && npm run build`,
  plus the database tests for any schema change. Show the output.
- For every new rule, add a test that **fails when the rule is broken**; `npm run db:mutation`
  does this for the database.
- Changing scoring or weights means changing TypeScript **and** SQL, then `npm run parity:gen`.
- Never edit a migration that is already live; add a new dated one.
- Never edit generated files (`lib/content/generated.ts`, `content/generated/`,
  `supabase/seed.sql`, `90_parity.generated.test.sql`); edit `content/papers/<slug>/` and run
  `npm run content:build`.
- Ask the owner before changing table shapes, the scoring meaning, or anything touching stored
  user history.
- The owner's Mac can be linked to a session; files there are at `~/Game/sciencedigest`.

---

## 9. Open questions for the owner

1. Phase 11 step 3: may a widget tap wait until the app is opened to reach the server?
2. Phase 11 step 1: should the native app load the live site, or a bundled copy?
3. What exactly does membership include? This decides what the server-side gated functions return.
4. Should the companion picture follow the user across devices? That means uploading and
   hosting user images (Supabase Storage), which was deliberately avoided.

---

## 10. Reference

Starter papers, all CC BY 4.0:

- Inoue K, et al. *JAMA Netw Open.* 2023;6(3):e235174. doi:10.1001/jamanetworkopen.2023.5174
  (step-count days and mortality; observational)
- Weibel J, et al. *Sci Rep.* 2021;11(1):4668. doi:10.1038/s41598-021-84088-x
  (daytime caffeine and sleep; randomized, in daily caffeine users)
- Khodadadi F, Bagheri R, Negaresh R, et al. *J Clin Med.* 2023;12(6):2291.
  doi:10.3390/jcm12062291 (interval training and body composition; meta-analysis of 36 trials;
  members-only in the app). The earlier brief named the wrong authors for this paper.

Repository documents: `CLAUDE.md` (rules), `docs/ARCHITECTURE.md` (system map),
`docs/MANUAL.md` (how-to and glossary), `docs/data-model.md` (database), `docs/BUILD-LOG.md`
(decision history), `docs/evidence/` (latest test outputs).
