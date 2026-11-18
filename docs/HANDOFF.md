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
| Pipeline commands (`npm run paper -- fetch / extract / draft / approve`) | `fetch` and `extract` run live 2026-11-14; `draft` never run live | BUILD-LOG 2026-11-14 (three turmeric benchmarks, one context study) |
| Extract model: Gemini 4 Hydrogen, Gemini API free tier, through the openai-compatible adapter (per-stage thinking level, 429/503 retry); Groq and Ollama are fallbacks | **Adopted for extract** 2026-11-14; editorial not benchmarked (2E) | BUILD-LOG 2026-11-14; `lib/ai/provider.test.ts` |
| Extract: the six fact kinds, one value per passage, a second "conditions & confounds" pass writing `coverage`; the gate refuses a p-value filed as background | Built | Turmeric round 3: 35/42 strict, 41 with equivalents, 0 wrong numbers; `lib/pipeline/coverage.test.ts` |
| Coverage checklist per paper in `/admin/queue` (drafts included; ticked only by gated facts) | Built. The four existing papers show the pass items as "not found" (hand-made extractions) | API checked on the dev server 2026-11-14 |
| Gate: `crossover` design (crossover named + randomisation, negation refused); rct negation guard; spreads (sd, ci95, range, iqr) never converted; measure `mean` | Built | `lib/pipeline/crossover.test.ts`, `lib/models/spread.test.ts` |
| First context study `caffeine-saliva-half-life` (Wildgrube 2025): crossover, n = 12, grade low; half-life mean 5.15 h, sd 1.21; arm D excluded (`excluded.json`) | Gated, cited by no read yet | `npm run content:build` report |
| Personal-simulator plan (`docs/SIMULATORS.md`): layers, kinds, fact library, spreads, four design notes | Written; nothing of it built beyond the decay kind | — |
| Instagram review queue (`/admin/queue`, local only) | Built | Browser and API tests |
| Installable to the home screen, opens offline | Built | Manifest and service worker served |
| Live site on real data (Phase 8): Supabase connected, anonymous sign-in behind Cloudflare Turnstile (invisible), real 404s | **Live, gate passed 2026-11-13** | `docs/evidence/phase8-gate.txt` |
| Amounts saved by one upsert (`set_step_amount`); no 409 | Live | `docs/evidence/pre3-live-409.txt` |
| A write the server keeps refusing is set aside (held list), never lost; retried by itself and from Me | Built | 162 unit tests, browser test |
| `/privacy` (a draft the owner still has to review; not seen by a lawyer) | Live | HTTP and browser tests |
| Three project skills: `science-content`, `db-change`, `phase-handoff` (`.claude/skills/`) | Written 2026-11-13 | — |
| Phase 9, 2A: reads in three layers (mechanism, protocol, audit) with a glossary; H9–H11 in the lint. The three starter papers still build in the old shape through a temporary allowlist, removed in 2E | Built, no reader-visible change yet | `docs/evidence/phase9-2a-rules-broken.txt` (19 of 19) |
| Phase 9, 2B: context sources. A read may cite another gated study (`content/context/`) and owner-reviewed background concepts (`content/concepts/`); neither can back a step or a weight; retraction check covers context | Built; `content/concepts/` holds one reviewed concept (`glucagon-like-peptide`); `content/context/` is empty | `docs/evidence/phase9-2b-gate.txt` (20 of 20) |
| Phase 9, 2C: figures drawn in code (10 primitives, one mechanism figure per paper; solid = measured, dashed = proposed), figure guard in eslint | Built; shown in the interim article layout | `docs/evidence/phase9-2c-rules-broken.txt` (16), `phase9-2c-browser-rules-broken.txt` (5), `docs/evidence/figures/` |
| Phase 9, 2D: the read rebuilt (hook, mechanism, number card, protocol, receipts), the feed of whole posts at `/library`, one interactive figure (turmeric's readings grid), motion tokens for toggles | Built; round 2 of the review done 2026-11-14 (next row) | `docs/evidence/article-redesign/` (before/after, dark/light), `phase9-2d-search-the-build.txt` (0 matches), `tests/browser/article-redesign.spec.ts` |
| Phase 9, 2D round 2: the feed is the home page (`/`), the tracker is `/today`, `/library` answers 308; the Life Game slot on top of the feed; "Start on: Feed / Life Game" (Me, kept on the device); larger hooks; figure kinds (`lib/content/figure-kinds.ts`, `components/figures/kinds/Decay.tsx`, `lib/models/decay.ts`) and rule H12 | Built. **The decay kind is drawn by no read yet**: caffeine has no gated half-life | `docs/evidence/article-redesign/round2/`, `lib/pipeline/figure-spec.test.ts`, `scripts/decay-kind.test.ts`, `tests/http/members-content.test.ts` |
| Fourth paper `turmeric-pepper-breakfast` (free, three layers, hand-written: no model run, so it does not count toward the Phase 10 gate) | Approved; on the hosted database and on `main`/Vercel (`80e1caa`) | BUILD-LOG 2026-11-13 and 2026-11-14 |
| Simulators drawn by kind, live: caffeine decay (half-life from the context study `caffeine-saliva-half-life`), steps association-curve | Live on `main` | `docs/evidence/simulators/`, `tests/browser/simulators.spec.ts` |
| Readability pass 1–7 (owner, 2026-11-14): tokens + contrast table (all ≥ 4.5:1), orange once per screen, plain-language lint rules, finding cards, source line (who · design · how long) + grade words/3-bar meter/tap for why (no weight on any screen), feed card at a glance with "What's inside" deep links, hosted seed, figure plans (SIMULATORS.md j) | Built 1–6; 7 is plans only. ⏸ waiting on the owner | `docs/evidence/readability/` (contrast.md, plain-rules-broken.txt, hosted-seed.txt, feed/read/card screenshots dark + light), `scripts/visual-system.test.ts`, `lib/pipeline/plain.test.ts`, `lib/evidence-words.test.ts`, `scripts/glance.test.ts`, `tests/browser/readability.spec.ts`, `tests/browser/source-line.spec.ts` |
| Owner's list of 2026-11-15: themes Dark / Light / Bedtime (tokens by meaning, `--signal-evidence-*`; orange = this paper's finding; ≤ 3 orange items per 390 px screen; habits monochrome; weights only in "How scoring works"); question headlines with the finding beneath (lint `headline`); members' card = question + finding + one sentence + figure (amendment A widened); sketch rule (`lib/content/sketch.ts`); three concepts written, not approved; rulings R1–R7 in FIGURE-DESIGN.md | Built and live on `main`. Concepts since approved; budget since raised to 10 (next rows). Hosted seed: see deployment state | `docs/evidence/themes/` (contrast.md, screenshots, gates-item1…5.txt, concept-references.txt), `scripts/visual-system.test.ts`, `tests/browser/readability.spec.ts`, `lib/pipeline/headline.test.ts`, `lib/content/sketch.test.ts`, `lib/pipeline/sketch-lint.test.ts`, `tests/http/members-content.test.ts` |
| Figures of FIGURE-DESIGN.md, data figures (2026-11-15): steps 3A (audit) + 3B, HIIT 4B "the order flips" (members, `protocolFigure` slot), turmeric 2A "from the tongue to the blood" | Built and live on `main`. The four sketches followed (next row) | `docs/evidence/figures-v2/`, `scripts/order-flips.test.ts`, `scripts/tongue-to-blood.test.ts` |
| Owner's design pass 2026-11-18: `unslop-ui` skill (`.claude/skills/unslop-ui/`); premium palette (light: warm paper page, white cards, warm ink; dark: deep soft black, layered greys); orange measured marks in figures; receipts card (tinted header, tiles, numbered receipts); source dots and glossary underline orange with pastel, exempt from the budget; caffeine time slider; orange budget 10 per screen (was 3) | Built and live on `main` (`92610a6`). Earlier orange swaps parked, unmerged, on `wip/colour-figures` (`981b7cf`) | `docs/evidence/premium/`, `docs/evidence/themes/contrast.md` (regenerated), `scripts/visual-system.test.ts`, `scripts/decay-kind.test.ts`, `tests/browser/readability.spec.ts`, `tests/browser/simulators.spec.ts` |
| The four sketches of FIGURE-DESIGN.md (2026-11-18): caffeine 1A parking spot (replaces lock-and-key) and 1B hidden tiredness day (under the simulator; the feed card), turmeric 2B first half hour (protocol layer; the feed card; five-readings moved to the receipts), HIIT 4A two piles. `"sketch:<id>"` references, Sketch primitive the only dotted line | Built; departures from the spec listed in BUILD-LOG 2026-11-18 for the owner. Hosted seed not pushed | `docs/evidence/sketches/` (gates.txt, breaks.txt 8 of 8, screenshots), `scripts/two-piles.test.ts`, `parking-spot.test.ts`, `first-half-hour.test.ts`, `hidden-tiredness.test.ts` |
| The draft stage proposes the figure kind and the simulator inputs: code lists the kinds the gated facts (and the owner-approved library) can feed, the prompt carries that menu and a guide per kind, the lint still checks the spec | Built; not yet run against the model | `lib/pipeline/propose.ts`, `lib/pipeline/propose.test.ts`, `docs/evidence/propose/` (breaks 9 of 9) |
| Reader inputs stored on the device only (2026-11-19): what a reader types or picks in a simulator (caffeine, steps, turmeric switches and meal, HIIT routine) comes back on a reopened read; `sd.sim.<slug>.<simulator>` in localStorage, checked in and out (dropped, never clamped); "Clear my numbers" by the simulator and on Me; a privacy line | Built; never synced, no change to `supabase/`, scoring or the store | `lib/reader-inputs.ts`, `lib/reader-inputs.test.ts`, `tests/browser/reader-inputs.spec.ts`, `docs/evidence/reader-inputs/` |
| Documents: `CLAUDE.md`, `docs/MANUAL.md`, `ARCHITECTURE.md`, `data-model.md`, `BUILD-LOG.md` | Written | — |

Totals on 2026-11-19 (after reader inputs): 734 unit, 15 HTTP and 103 browser tests
(`docs/evidence/reader-inputs/gates.txt`, copied to `unit-tests.txt`, `http-tests.txt`,
`browser-tests.txt`); database not re-run (no SQL touched).
Totals on 2026-11-18 (after the draft-stage menu of figure kinds): 700 unit tests
(`docs/evidence/propose/gates.txt`; 688 after the sketches,
`docs/evidence/unit-tests.txt`); 15 HTTP tests (`http-tests.txt`) and 93 browser tests
(`browser-tests.txt`); 191 database assertions per pass and 16 of 16 mutations (unchanged and
not re-run: no SQL touched since 2026-11-14).
Outputs are in `docs/evidence/`.

### Deployment state (2026-11-19, after reader inputs)

- `main` is at the reader-inputs handoff commit. Vercel deployed `2cceeaf` about 75 s after the
  push: every read, `/`, `/me`, `/privacy` and `/today` return 200, a missing paper 404, and the
  visitor-only check passed (stored answers come back, an out-of-range one is dropped, no request
  carries an answer, no page error): `docs/evidence/reader-inputs/live-check.txt`.
- Hosted database: unchanged. No migration pending; **the hosted seed is still behind `main`**
  (the sketches; this item changed no content). The real push still waits on the owner's second
  "go" (MANUAL 3.3; the published count should be 4).

### Deployment state (2026-11-18, after the sketches)

- `main` is at the sketches handoff commit. Vercel deployed `838430a` (the four sketches): the
  live reads return 200, a missing paper returns 404, and the page throws no errors
  (Playwright, as a visitor). `wip/colour-figures` is on GitHub, not merged or deployed; the
  owner has still to decide on it.
- Hosted database: no migration pending (`20261114000100_set_step_amount.sql` is still the
  last). **The hosted seed is behind `main`.** The dry run on the owner's "go" printed `seed.sql`
  as "hash update" (`docs/evidence/sketches/hosted-seed-dry-run.txt`). The real push needs a
  second "go". It is the three commands in MANUAL 3.3; the published count should be 4.

### Deployment state (2026-11-15)

- `main` carries the 2026-11-15 work (themes, headlines, members' card, sketch rule); Vercel
  deploys it. **The hosted seed is one behind**: `paper_content` JSON gained `finding.question`.
  Nothing reads that field from the server yet (the members' card and header come from the
  bundle), so the live site works; push the seed on the owner's "go" (MANUAL 3.3).

### Deployment state (2026-11-14)

- Live at `https://sciencedigest-a4ms.vercel.app`, deployed by Vercel from `main`. The Mac,
  GitHub and the hosted database are level (four published papers); the hosted seed was
  brought level on the owner's "go" on 2026-11-14 (4 papers, 31 steps).
- Hosted Supabase project `takhienzcshgkytbvaii`: all migrations to
  `20261114000100_set_step_amount.sql`, and the seed as of readability 6 (pushed on the owner's
  "go", 2026-11-14; dry run reports up to date: `docs/evidence/readability/hosted-seed.txt`) (applied with
  `supabase db query --remote -f supabase/seed.sql`; see MANUAL 3.3). **No hosted command
  without the owner's "go" (2026-11-14).** anonymous sign-ins on; CAPTCHA
  (Turnstile) on. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set in Vercel and `.env.local`.
- **Browsers on the live site.** Turnstile runs only at a visitor's first write (the anonymous
  sign-in) and refuses an automated browser there (error 600010). Playwright may load live
  pages as a visitor who has not tapped anything (screens, screenshots, status codes, page
  content). Anything that needs a signed-in user is done by the owner by hand in an incognito
  window, or server-side with `scripts/gate-rls-live.mts` (the owner runs it in their own
  Terminal with the service role key typed at a prompt), with read-only
  `supabase db query --remote --read-only` counts (no ids) as evidence. Never work around the
  CAPTCHA. Local builds may use Playwright for everything.
- The current work list is `docs/PROGRESS.md`; the instructions it follows are in
  `docs/MASTER-PROMPT.md` (the prompt word for word, then the owner's amendments).

### Not built

Home-screen widgets on phones; the native app wrapper; payments; a way for a user to delete
their own data (the privacy page gives an address to write to); Instagram slide images (the 12 carousel Studio files are not in the repository); reads loaded on
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
| H9 | Feynman layer. Never use a technical term without immediately saying what it physically does in plain English. Give the mental model first, then the name of the pathway | lint + `lib/pipeline/jargon.ts` |
| H10 | Progressive disclosure. Every read has three separate layers: mechanism (why it happens), protocol (what the data supports), audit (design, sample size, raw effect size, the mandatory limitation). No caveats inside the mechanism layer. The audit stays visible without a tap (H6) | schema (`lib/pipeline/editorial.ts`) + lint |
| H11 | Voice. Short sentences, active voice, no academic throat-clearing | lint + `lib/pipeline/sentences.ts` |

H7 was amended on 2026-11-13: every number shown to a reader traces to a gated fact, from the
paper or from a gated context source, and the UI says which.

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

### Phase 8: make the live site real (first, small). DONE 2026-11-13

**Gate passed** (`docs/evidence/phase8-gate.txt`): a real visitor signed in with CAPTCHA on and
their write reached the server; a second user cannot read or forge the first one's ticks; a free
user gets no `paper_content` row for the members' paper; an unknown paper answers 404; database
tests were green against the live schema on 2026-11-12 (177 of 177). The steps are kept below
as the record of what was done.

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

### Phase 9: readable reads

Instructions: `docs/MASTER-PROMPT.md`, Step 2 (2A to 2E). They are not repeated here.

**Gate:** the stops written in Step 2. Phase 9 is not done until the owner says so.

### Phase 10: first live run of the paper pipeline

Instructions: `docs/MASTER-PROMPT.md`, Step 3 (3A and 3B). They are not repeated here.

**Gate:** a fourth paper is live, went through every stage, and the gate or lint refused at
least one thing along the way that was then fixed in the JSON, not by loosening a rule.

### Phase 11: Instagram carousels with their own art

Full instructions: `docs/MASTER-PROMPT.md`, Step 4 (a new deck shape of seven slide kinds and a
poster-style art kit in `lib/carousel/art/`, on top of what follows).

The owner has the 12 carousel Studio files (`lib/carousel/*`, `SlideRenderer.tsx`, export
route, `verify-parity.mts`, etc.). Copy them in, then map `content/generated/carousels.json` to
their deck format. Keep their rules: Satori needs `display: flex` on every element with children
and inline styles only; fonts must be `.woff`, not `.woff2`; `≤` and `✓` render as boxes, so the
linter fails closed on unverified characters; 1080×1350, at most 10 slides. Put the export
route behind a check so it is not a free image-rendering service on the internet.

**Gate:** `verify-parity.mts` passes; one deck per published paper exports to PNGs with no missing
glyphs, saved in `docs/evidence/carousel/`. The owner approves decks in `/admin/queue`.

### Phase 12: native app and home-screen widgets

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

### Phase 13: payments

Stripe Checkout; a server route (Vercel function) verifies Stripe's webhook signature and sets
`user_profiles.subscription_tier` using the **service role key** (server only). The browser can
never set the tier: database test 5 already proves an update from the user fails with `42501`.
Decide the real members' feature list (the `features` table has two placeholders,
`regimen_analysis` and `key_takeaways`). Cancelling stops members' content; tracking continues.

**Gate:** a test-mode payment unlocks the members' read on a second device; a test-mode
cancellation locks it again and the streak is untouched.

### Phase 14: scale (only when needed)

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

### Resume prompt (paste this to start a fresh session)

```text
Resume Science Digest. Read CLAUDE.md, docs/HANDOFF.md, docs/MASTER-PROMPT.md (including
its Amendments), docs/PROGRESS.md and the latest BUILD-LOG entries. Run git status and
git log --oneline -5. If the tree is not clean, tell me what is uncommitted before doing
anything. Then continue the master prompt from the first unchecked item in
docs/PROGRESS.md, with the same working rules and the same ⏸ stops.

Next unchecked item: Run the coverage pass on the 4 existing papers, so their checklist rows
stop showing "not found" (`extract` re-run into scratch; merge only the coverage facts after
review). Then 2E. Rewrite the three `editorial.json` files; concept files listed; `prompts.ts`
updated with an old-shape refusal test; allowlist deleted; before/after table per paper.
Waiting on the owner: how to run the coverage pass (BUILD-LOG 2026-11-19: a full `extract` gives
new model ids that must be mapped by hand; a coverage-only run against the hand-checked facts
does not); second "go" for the hosted seed push; wip/colour-figures; five-readings in the
turmeric receipts; the five FIGURE-DESIGN departures; the clear-control labels and the turmeric
meal picker's default (BUILD-LOG 2026-11-19).
```

---

## 9. Open questions for the owner

1. Phase 12 step 3: may a widget tap wait until the app is opened to reach the server?
2. Phase 12 step 1: should the native app load the live site, or a bundled copy?
3. What exactly does membership include? This decides what the server-side gated functions return.
4. Should the companion picture follow the user across devices? That means uploading and
   hosting user images (Supabase Storage), which was deliberately avoided.
5. ~~Relabel caffeine and turmeric as `crossover`?~~ Answered 2026-11-14: yes; done.
6. ~~The round-2 screenshots verdict~~ Superseded 2026-11-14: judged live with /impeccable
   after the simulators.

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
