# Progress

The checklist for `docs/MASTER-PROMPT.md` (the owner's prompt, word for word, plus amendments):
Phase 8 close-out, skills, Phase 9 (9A–9E, the prompt's steps 2A–2E), Phase 10, Phase 11, then
stop. Phase 12 (the native app) is not to be started.
Decisions and their reasons go in `BUILD-LOG.md`; this file is only the checklist.
⏸ = stop and wait for the owner. Continue from the first unchecked item.
`[-]` = deferred by the owner (2026-11-21: "Defer, run Finish"), not done; not a next item.
The deferred items are gathered in HANDOFF section 7, "Deferred from Phase 9".

## Step 0-pre (before Step 0)

- [x] CAPTCHA (Turnstile, invisible) live. Done before this list (8ba0643, b9b087e); not redone.
- [x] The `step_amounts` 409. Done before this list (4aee19f, migration `20261114000100`); not redone.
- [x] PRE-1. A write that can never succeed no longer blocks the queue (held list, version 3 of
      the saved state). Rule approved by the owner 2026-11-13. BUILD-LOG 2026-11-13.
- [x] PRE-2. `/privacy` (a draft for the owner; not reviewed by a lawyer), linked from Me and
      `/upgrade`. Live 200 check: see the commit that ticks this file.
- [x] PRE-3. Live check of the 409 fix: owner's manual run + read-only count, one row.
      `docs/evidence/pre3-live-409.txt`. Re-test with dbee0e3 live: server 5, screen 5.

## Step 0: Phase 8 close-out (changed by the owner 2026-11-13: no browser on the live site)

- [x] (a) A real visitor signs in with CAPTCHA and the write reaches the server: the owner's manual
      run and the read-only count (amount 5 on screen and on the server).
- [x] (b) User B cannot read or forge user A's `step_checkins`: `scripts/gate-rls-live.mts`, run by
      the owner, all PASS.
- [x] (c) A free user gets no `paper_content` row for `hiit-body-composition`: same run, PASS.
- [x] Both test users deleted (script, and a separate read-only count: 0 left).
- [x] (d) `curl -sI` the live `/papers/does-not-exist`: `HTTP/2 404`.
- [x] "Where it stands" in `docs/HANDOFF.md` updated; Phase 8 marked done.
- [x] ⏸ Stopped with the gate results; the owner re-ran the tightened script (all PASS). Evidence:
      `docs/evidence/phase8-gate.txt`.
- [x] HANDOFF section 7 renumbered to the master prompt's phases; `docs/MASTER-PROMPT.md` saved;
      Resume prompt added to HANDOFF section 8.
- [x] Master prompt copy checked against the owner's original with `diff` (identical); the
      live-site browser amendment corrected; HANDOFF Phase 9 and 10 reduced to pointers.
- [x] ⏸ **Stopped at the owner's instruction. Step 1 starts in a fresh session** (Resume prompt:
      `docs/HANDOFF.md`, section 8). Fresh session started 2026-11-13.

## Step 1: skills (no stop)

- [x] `.claude/skills/science-content/SKILL.md`
- [x] `.claude/skills/db-change/SKILL.md`
- [x] `.claude/skills/phase-handoff/SKILL.md`
- [x] CLAUDE.md: one line per skill; line count before and after (about +10 at most). 68 → 74.
- [x] Note whether Anthropic's frontend-design skill is available (use in 2C, 2D, 4; do not install).
      Not available in this Claude Code; nothing installed (BUILD-LOG 2026-11-13).

## Step 2: Phase 9, readable reads

- [x] 2A. H9–H11 and amended H7 in CLAUDE.md and `lib/pipeline/lint.ts`: (1) layered schema +
      glossary, (2) jargon list, (3) caveat leakage, (4) throat-clearing, (5) sentence length
      and own splitter, (6) passive voice warning, (7) word budget. Each with a failing fixture.
      Temporary allowlist for the three papers, with a test that fails if it outlives 2E.
      Done: 224 unit tests; 19 of 19 deliberate breaks caught
      (`docs/evidence/phase9-2a-rules-broken.txt`). The reading of
      "before its glossary entry": owner kept rule (a), dropped (b), 2026-11-14 (BUILD-LOG).
- [x] 2B. Context sources: parallel studies (`content/context/`, gated, graded, retraction check)
      and background concepts (`content/concepts/`, no digits, owner approval command). Source
      lines. Check `paper_content` JSON first. No change to scoring files or migrations.
      Done: 272 unit, 6 HTTP, 6 browser tests; 20 of 20 deliberate breaks caught. Gate:
      `docs/evidence/phase9-2b-gate.txt`.
- [x] ⏸ Stop with the 2B gate. (Owner gave the go-ahead for 2C on 2026-11-13.)
- [x] 2C. Figures as React SVG: ten primitives, widget guard extended (two failing fixtures),
      title/desc/alt, reduced motion, 360 px; one mechanism figure per starter paper;
      screenshots in `docs/evidence/figures/`.
- [x] Off-list (owner's request, 2026-11-13): release `turmeric-pepper-breakfast`. Hosted seed
      written (papers 4, steps 30); `isTimestamp` rule + test; on `main` as `80e1caa`, live 200
      on 2026-11-14. Hand-written, so it does not count toward the Phase 10 gate.
- [x] 2D. Rebuild `components/read/Article.tsx` (hook, mechanism, pull-number, protocol,
      receipts, members' extras); search-the-build check; walkthrough extended; before/after
      screenshots in `docs/evidence/article-redesign/`. With the owner's amendments of
      2026-11-14: A the feed (at `/library`), B one interactive figure (turmeric's grid),
      C motion tokens for toggles. BUILD-LOG 2026-11-14.
- [x] ⏸ Stop with the screenshot paths for design review. Answered 2026-11-14 (round 2).
- [x] 2D round 2 (owner's answers, 2026-11-14): G1 members-number test, hosted seed level,
      impeccable binary untracked, plain passage panel; G2 feed at `/`, tracker at `/today`,
      `/library` 308, Life Game slot, "Start on"; G3 larger hooks; G4 figure kinds, the decay
      kind, H12. Caffeine has no gated half-life, so its read was not wired to the decay kind.
- [x] ⏸ Stopped here 2026-11-14. Round-2 screenshot verdict: **superseded** (owner,
      2026-11-14: the design is judged live with /impeccable after the simulators). Closed. Answered: a context fact may feed a figure
      spec and its simulator (`2a0926c`); the half-life source search is its own item below.
- [x] H7/H12 rule change (owner, 2026-11-14): a gated context study may feed a figure spec and
      its simulator; a concept never. `2a0926c`. Grzegorzewski 2021 refused at the gate (BUILD-LOG).
- [x] Find a context study for caffeine's half-life. Owner picked Wildgrube 2025
      (doi:10.1016/j.ijpx.2025.100442); gated as `caffeine-saliva-half-life`, design crossover
      (new design type), grade low; arm D excluded. BUILD-LOG 2026-11-14.
- [x] Note: AI_API_KEY is missing from .env.local, so the extract stage can't run.
      Added by the owner; Gemini 4 Hydrogen adopted for extract (BUILD-LOG 2026-11-14).
- [-] 2D round 3, in this order: (1) decay kind wired to caffeine once a half-life with a
      range is gated; (2) compare-bars (HIIT), association-curve (steps), grid (turmeric) moved
      onto kinds; (3) `docs/POST-RECIPE.md` + the sticky slot strip; (4) Life Game widgets made
      more interactive and visual; (5) pipeline `prompts.ts` proposing figure specs;
      (6) Related reads slot + `docs/IDEAS.md` (caffeine + L-theanine).
      **Deferred 2026-11-21.** Done: (1) decay on caffeine; (2) steps only (association-curve);
      (5) `lib/pipeline/propose.ts`. Not built: compare-bars and grid kinds, (3), (4), (6).
- [x] Owner rulings 2026-11-14 (session 10): caffeine and turmeric relabelled `crossover`
      (audit says "Randomized crossover trial"; grade unchanged, low); turmeric taste values
      re-extracted as mean ± SD; SIMULATORS.md design notes refined (no caffeine presets,
      raw vs adjusted for steps, HIIT subgroup bars secondary, no p-values in turmeric's grid).
- [-] Simulators (owner, 2026-11-14; plan: `docs/SIMULATORS.md`). Caffeine first:
      **Deferred 2026-11-21** with its open sub-items below; decay and association-curve are live.
- [x] Fact library: data shape for an approved context fact + lookup (paper facts → library).
      `content/library.json`, `lib/content/fact-library.ts`; lint refuses a non-library context
      fact in a simulator. BUILD-LOG 2026-11-14 (session 10).
- [-] Build check + fallback: no fact → publish with the card figure and queue an upgrade.
      Deferred. The lint refuses a non-library context fact; no fallback or queue item exists.
- [-] `/admin/queue` "simulator upgrade" item type (1–3 Europe PMC candidates) + weekly batch view.
      Deferred. Not built.
- [-] Related reads slot under a simulator's result (published papers by tag). Deferred. Not built.
- [-] Each kind's simulator: decay (caffeine), association-curve (steps), compare-bars (HIIT),
      grid (turmeric), dose-response, step-through (none). Deferred: compare-bars, grid and
      dose-response kinds not built (HIIT and turmeric keep their own figures and simulators).
  - [x] decay (caffeine). Simulator drawn by kind (`simulator.spec` + `words`), library half-life,
        band at bedtime, the paper's sleep finding beside it. Screens:
        `docs/evidence/simulators/decay-{dark,light}.png`, `decay-used-{dark,light}.png`.
  - [x] association-curve (steps). Pick 0–7 days → the group's adjusted difference as a band,
        raw labelled raw, "Who this was tested in" straight under it. Screens:
        `docs/evidence/simulators/association-curve-{dark,light}.png`, `-used-{dark,light}.png`.
  - [x] ⏸ Stop after caffeine + steps are live (owner, session 10). Answered 2026-11-14:
        the owner's readability list (below) comes next.
- [x] Readability pass (owner, 2026-11-14: research understandable to everyone). Items 1–7
      (all seven ticked below; this line ticked at the Phase 11 handoff):
  - [x] 1. Visual system as tokens (palette, pastel bands, orange once, type, contrast table).
        `docs/evidence/readability/contrast.md`; tests `scripts/visual-system.test.ts`,
        `tests/browser/readability.spec.ts`.
  - [x] 2. Plain-language lint rules (significant, p/CI/effect size, "no effect", direction words).
        `lib/pipeline/plain.test.ts`; `docs/evidence/readability/plain-rules-broken.txt` (5 of 5).
  - [x] 3. Finding cards: plain headline → one supporting line → source line (editorial `card`;
        `FindingCard`, `BandStrip`). Screens: `docs/evidence/readability/card-*.png`.
  - [x] 4. Source line (who · design · how long) + grade words, 3-bar meter, tap for why; no
        weight on any screen. `lib/evidence-words.ts`; tests `lib/evidence-words.test.ts`,
        `tests/browser/source-line.spec.ts`. Screens: `docs/evidence/readability/card-*.png`.
  - [x] 5. Feed card = the key idea at a glance; "What's inside" rows deep-link to slots.
        `lib/content/glance.ts`, editorial `glance`, glance views; tests `scripts/glance.test.ts`,
        `tests/browser/readability.spec.ts`. Screens: `docs/evidence/readability/feed-*.png`.
  - [x] 6. Hosted seed: dry run shown, pushed on the owner's "go" (one push). Hosted is up to
        date. `docs/evidence/readability/hosted-seed.txt`.
  - [x] 7. Figure plans in `docs/SIMULATORS.md` section j (concept sketch class, the pattern, caffeine,
        turmeric, steps, HIIT). Not built. Open: owner ruling on a sketch resting on a concept (j1).
  - [x] ⏸ Stop after 7 with hashes, contrast table, screenshot paths, plans; /phase-handoff.
        Answered 2026-11-15: rulings R1–R7 and the five-item list below.
- [x] Owner rulings R1–R7 on FIGURE-DESIGN.md + items 1–5 (2026-11-15):
  - [x] 1. Themes: Dark, Light, Bedtime; orange roles by meaning; budget test (≤ 3 per screen);
        Me setting; scoring explainer. `docs/evidence/themes/` (contrast.md, screenshots, gates).
  - [x] 2. Headlines: the question the paper answers, the plain finding beneath; lint rule
        `headline` (9 failing fixtures, `lib/pipeline/headline.test.ts`). BUILD-LOG 2026-11-15.
  - [x] 3. Members' card: question, finding headline, one sentence + figure; amendment A updated;
        search-the-build 0 matches (`docs/evidence/themes/gates-item3.txt`).
  - [x] 4. Sketch rule + rulings R1–R7 in the docs; `lib/content/sketch.ts`, 19 failing fixtures +
        a source guard. BUILD-LOG 2026-11-15.
  - [x] 5. Concepts adenosine, post-meal-blood-sugar, fat-free-mass written (not approved);
        references resolve (`docs/evidence/themes/concept-references.txt`).
  - [x] ⏸ Stop: hashes, contrast table, theme screenshots, 4 headlines, 3 concepts' plain text; /phase-handoff.
        Answered 2026-11-15: headlines fixed (`f52af35`), adenosine and post-meal-blood-sugar
        approved (`ceaf04c`), fat-free-mass approved; all four concepts now `reviewed_by_owner`.
        Reported 2026-11-15. Was waiting on the owner: review the 4 headlines and the 3 concepts
        (`npm run paper -- approve-concept <slug>`, the owner's command); "go" for the hosted seed
        (the seed changed: `finding.question` in `paper_content`; hosted is one seed behind).
- [x] **Next (owner, 2026-11-15): build the figures from `docs/FIGURE-DESIGN.md`**, two per paper
      (A "why it happens", B "what happens to you"), ahead of the older open items above. Data
      figures first (steps 3A in the audit layer and 3B; HIIT 4B; turmeric 2A); the sketches
      (caffeine 1A/1B, turmeric 2B, HIIT 4A) only once their concept is approved. Feed cards draw
      figure B's still view (R7). Every figure obeys the orange budget and the sketch rule.
  - [x] Owner review 2026-11-15: headline fixes + rule `direction` (`f52af35`); hosted seed pushed once.
  - [x] Steps 3A (audit) + 3B, with rulings 1–3 (descriptive kind, one-claim rule, turmeric finding,
        fat-free-mass model line). Screens: `docs/evidence/figures-v2/steps-days-per-week/`.
        Hosted seed: one push at the END of the session only (owner, 2026-11-15).
  - [x] HIIT 4B (members), in the new `protocolFigure` slot; subgroups only in the read.
        Screens: `docs/evidence/figures-v2/hiit-body-composition/`.
  - [x] HIIT 4B review: collapsed subgroups, printed ranges, no-hover-only rule (eslint + browser).
  - [x] Turmeric 2A (mechanism). Screens: `docs/evidence/figures-v2/turmeric-pepper-breakfast/`.
  - [x] Owner's design pass 2026-11-18 (not in the master prompt; BUILD-LOG 2026-11-18):
        `unslop-ui` skill (`f4274f7`); orange swaps parked on `wip/colour-figures` (`981b7cf`,
        not for main as it stood); source dots and glossary underline orange again, exempt from
        the budget; premium palette (warm paper light, deep soft black dark), orange measured
        marks in figures, receipts card redesigned, caffeine time slider, orange budget raised
        3 → 10 per screen (`92610a6`). Screens: `docs/evidence/premium/`.
  - [x] The sketches: caffeine 1A/1B, turmeric 2B, HIIT 4A (BUILD-LOG 2026-11-18; screens and
        breaks in `docs/evidence/sketches/`). Departures from the spec are listed there for the owner.
- [x] The pipeline proposes the figure kind and the simulator inputs (`prompts.ts`). Code works out
      the menu (`lib/pipeline/propose.ts`), the draft prompt carries it; 9 of 9 breaks caught
      (`docs/evidence/propose/`). Not yet run against the model (first live draft: Phase 10).
- [x] Reader inputs stored on the device only (like the theme). `2cceeaf`: caffeine, steps,
      turmeric (switches, meal) and HIIT (routine) remember on the device, `sd.sim.<slug>.<simulator>`;
      dropped, never clamped; "Clear my numbers" by the simulator and on Me; privacy line. 734 unit,
      15 HTTP, 103 browser tests; 18 breaks; live check passed (`docs/evidence/reader-inputs/`).
- [x] Run the coverage pass on the 4 existing papers, so their checklist rows stop showing
      "not found" (`extract` re-run into scratch; merge only the coverage facts after review).
      Not started. Found 2026-11-19 (BUILD-LOG): `extract` re-runs the whole first pass, and its
      coverage pass then lists the model's new fact ids, not the hand-checked ids, so merging
      means mapping every id by hand. **Owner's choice (2026-11-19): a coverage-only run** against
      the hand-checked facts, into scratch (MASTER-PROMPT amendment 2026-11-19). Tool `bd71f8f`
      (`--coverage-only`, 10 of 10 breaks). Run 2026-11-19: 71 new facts, 0 relabels, every
      scratch copy gated, dry build passes (`docs/evidence/coverage-pass/`, BUILD-LOG).
      Owner's review: "Merge all 71" (2026-11-19). Merged by replaying each saved answer onto the
      hand-checked file; checklist rows found: caffeine 7 of 9, HIIT 6, steps 6, turmeric 9
      (`docs/evidence/coverage-pass/checklist-after-merge.txt`, `gates-after-merge.txt`).
- [x] 2E. Rewrite the three `editorial.json` files; concept files listed; `prompts.ts` updated
      with an old-shape refusal test; allowlist deleted; before/after table per paper.
      Done `8bfaed2`: words per layer caffeine 169/129/227, HIIT 133/116/246, steps 124/87/230
      (`docs/evidence/phase9-2e/before-after.md`). No new concept files (only the reviewed
      adenosine and fat-free-mass are used), so none to list. Refusal: unit + end to end against
      a fake model (`scripts/draft-shape.test.ts`); guard `scripts/legacy-shape.test.ts`; each
      shown failing once (`rules-broken.txt`). Gates: 764 unit, 15 HTTP, 105 browser. The
      members' HIIT text stays old-shape on the hosted row until the seed push (BUILD-LOG).
- [x] ⏸ Stop. Owner approves concepts and reads all three. Phase 9 is not done until then.
      Owner: "Approve all three" (2026-11-19). No new concepts were written in 2E, so none to
      approve. Phase 9 done.

## Step 3: Phase 10, first live pipeline run

- [x] 3A. `npm run retractions` (first real run, show the count); 3 candidate papers from Europe PMC.
      Done 2026-11-19: 67,951 retraction records (data of 2026-11-18), none of the 4 papers or
      the context study retracted. Candidates: A salt dose and blood pressure (BMJ 2020,
      meta-analysis, 12,197; licence line also says "No commercial re-use"), B sleep extension
      and energy intake (JAMA IM 2022, RCT, 80), C early vs midday time-restricted eating
      (Nat Commun 2022, RCT, 90). `docs/evidence/phase10-3a/candidates.md`.
- [x] ⏸ Stop. Owner picks one and its tier.
      Owner, 2026-11-19: "B, sleep, free".
- [x] 3B. fetch, extract, draft on the pick; a regression fixture for each break; figure and concepts.
      Done 2026-11-19, as a draft (`publishedAt` null): `content/papers/sleep-extension-energy-intake/`.
      The gate refused 3 quotes and the lint refused 15 + 10 + 1 + 1 items. All were fixed in the
      JSON, never the rule (`docs/evidence/phase10-3b/gate-fixes.md`, `lint-fixes.md`). No code
      broke, so there is no new fixture: the out-of-room, 503 and JSON-retry stops already have
      tests. Figure `energy-ledger`, with 10 tests. No new concept. Review sheet: `draft-for-review.md`.
- [x] ⏸ Stop. Owner reads the draft; then approve, content:build, release, live check.
      Owner approved the read 2026-11-19, then gave the second "go" for the hosted seed. Hosted
      database: 5 published papers, the sleep read with its 2 steps. Released in `4be4d63`. Live
      check as a visitor: all routes 200, the read and the feed card are live
      (`docs/evidence/phase10-3b-release/`).

## Step 4: Phase 11, Instagram carousels with their own art

- [x] 4A. ⏸ Ask where the 12 carousel Studio files are; copy them in, never recreate.
      Owner, 2026-11-19: they do not exist; "Build it fresh" (MASTER-PROMPT amendment).
- [x] 4B. New deck shape (7 slide kinds, at most 10 slides, 1080×1350); art kit in
      `lib/carousel/art/`; Satori rules and inline-svg check; H1–H11 lint with the hook-caveat
      fixture; export route local-only or secret; verify-parity; PNGs in `docs/evidence/carousel/`.
      Built 2026-11-19 (BUILD-LOG): Satori 0.29 via `next/og` draws inline svg; 5 decks,
      35 slides, 0 missing glyphs; verify-parity passed; 12 of 12 breaks caught; 798 unit,
      16 HTTP, 108 browser. **Not committed: the two font packages were added without asking
      first; waiting on the owner to keep or drop them.**
- [x] 4C. Owner's rework, 2026-11-19 to 2026-11-20 (BUILD-LOG entries of those dates), all built,
      tested and exported; **none of it committed yet**:
      - Rules 8–11 and the story deck: hook → finding → why → who → receipts → cta.
      - Owner-approved common knowledge on the deck only (`content/common/`, `[common:<slug>]`).
      - The why slide's sketch on the caffeine-tolerance concept.
      - The owner's Claude Design carousel, in the site's colours.
      - Every deck in 4 looks (black or white × site or bright orange; deck-only `--deck-vivid-*` tokens).
      - The plateau chart (steps why slide).
      - A contrast gate in parity; `npm run carousel:sheet` contact sheets.
      - The `carousel-design` skill.
      - Alternate openings (`carousel.altHooks`; 3 for steps, 1 each for the others), chosen in the
        queue and saved in the approval record.
      Proof: 826 unit tests; parity 5 decks, 148 slides × 4 looks;
      `docs/evidence/carousel/` (sheet-*.png, openings-*.png, phase11/).
- [x] Off-list (owner, 2026-11-20 to 2026-11-21): the Opus trial. Claude Opus 5.5 extracted six
      CC-BY papers by hand, with no API key, so the owner could evaluate an upper bound on a
      one-shot API run: best-possible-toothbrushing, time-restricted-eating-healthy,
      sleep-restriction-sweet-foods, sugar-inflammation-markers, alternate-day-fasting-weight,
      ceramide-moisturizer-barrier. Each passed the real gate and lint, got one figure with a
      failing-rule test, a deck and a review sheet. All six approved (owner: "start publishing
      them"); 11 published papers; hosted seed pushed on the owner's go and verified (11 published,
      each new read and its steps present); committed `de4990e`, pushed; Vercel live, the four
      newest pages 200. Proof: `docs/evidence/opus-trial/` (per paper: fixes.md,
      draft-for-review.md, gate and lint runs, deck sheets, figure preview, checks.txt;
      publish-checks.txt, hosted-push.txt). BUILD-LOG 2026-11-21.
- [x] ⏸ Stop. Owner approves decks in `/admin/queue`. Answered 2026-11-21: caffeine-tolerance and
      coffee-cup-caffeine approved (`d714d80`); review-sheet decisions A–D taken and all 11 decks
      approved, each with its opening, in `content/queue/` (`3acec7d`). That commit changed
      `supabase/seed.sql` (step weights); the hosted seed is not pushed.
      Before that, the owner must:
      - Review the caffeine deck's two new entries (`npm run paper -- approve-concept caffeine-tolerance`,
        `npm run paper -- approve-common coffee-cup-caffeine`); the queue refuses that deck until then.
      - Settle the open decisions in the six Opus-trial review sheets
        (`docs/evidence/opus-trial/<slug>/draft-for-review.md`, top of each), BUILD-LOG 2026-11-21.
      Then pick each deck's look and opening, and approve.
      Done 2026-11-21: the Phase 11 work is committed (`de4990e`, owner: "commit them"), the two
      font packages kept in it with their reason in the commit body.

## Finish

- [x] Run `/phase-handoff`; list what Phase 12 needs from the owner. Do not start Phase 12.
      Done 2026-11-21 (HANDOFF section 9, items 1, 2 and 8). Gates: lint, typecheck, 918 unit,
      build and 126 browser pass; **HTTP 21 of 22, one failure** (next item).
      `docs/evidence/phase11-handoff/`.
- [x] ⏸ The search-the-build check fails (`tests/http/members-content.test.ts`, found at the
      Phase 11 handoff; first run since the Opus trial). Nine matches, four free papers:
      each members-only implementation note (`takeaways[1]`) repeats a phrase that is also in the
      free read (card support, mechanism or audit). No gated information is in the build. Owner
      to choose: rewrite the four notes so they add what the free read does not (content edit,
      then a hosted seed push), or change the check.
      Owner: "Rewrite the four notes" (2026-11-21). Each `takeaways[1]` now gives a detail from a
      gated fact the free read does not cite (provided fast-day meals; cream amount and side-effect
      severity; the settling week; table-sugar doses). The check failed before (`test-http.txt`) and
      passes after: HTTP 22 of 22, 918 unit, browser 126 of 126 (`notes-*.txt`). Hosted seed not pushed.
