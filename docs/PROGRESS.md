# Progress

The checklist for `docs/MASTER-PROMPT.md` (the owner's prompt, word for word, plus amendments):
Phase 8 close-out, skills, Phase 9 (9A–9E, the prompt's steps 2A–2E), Phase 10, Phase 11, then
stop. Phase 12 (the native app) is not to be started.
Decisions and their reasons go in `BUILD-LOG.md`; this file is only the checklist.
⏸ = stop and wait for the owner. Continue from the first unchecked item.

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
- [ ] 2D round 3, in this order: (1) decay kind wired to caffeine once a half-life with a
      range is gated; (2) compare-bars (HIIT), association-curve (steps), grid (turmeric) moved
      onto kinds; (3) `docs/POST-RECIPE.md` + the sticky slot strip; (4) Life Game widgets made
      more interactive and visual; (5) pipeline `prompts.ts` proposing figure specs;
      (6) Related reads slot + `docs/IDEAS.md` (caffeine + L-theanine).
- [x] Owner rulings 2026-11-14 (session 10): caffeine and turmeric relabelled `crossover`
      (audit says "Randomized crossover trial"; grade unchanged, low); turmeric taste values
      re-extracted as mean ± SD; SIMULATORS.md design notes refined (no caffeine presets,
      raw vs adjusted for steps, HIIT subgroup bars secondary, no p-values in turmeric's grid).
- [ ] Simulators (owner, 2026-11-14; plan: `docs/SIMULATORS.md`). Caffeine first:
- [x] Fact library: data shape for an approved context fact + lookup (paper facts → library).
      `content/library.json`, `lib/content/fact-library.ts`; lint refuses a non-library context
      fact in a simulator. BUILD-LOG 2026-11-14 (session 10).
- [ ] Build check + fallback: no fact → publish with the card figure and queue an upgrade.
- [ ] `/admin/queue` "simulator upgrade" item type (1–3 Europe PMC candidates) + weekly batch view.
- [ ] Related reads slot under a simulator's result (published papers by tag).
- [ ] Each kind's simulator: decay (caffeine), association-curve (steps), compare-bars (HIIT),
      grid (turmeric), dose-response, step-through (none).
  - [x] decay (caffeine). Simulator drawn by kind (`simulator.spec` + `words`), library half-life,
        band at bedtime, the paper's sleep finding beside it. Screens:
        `docs/evidence/simulators/decay-{dark,light}.png`, `decay-used-{dark,light}.png`.
  - [ ] IN PROGRESS: association-curve (steps).
- [ ] The pipeline proposes the figure kind and the simulator inputs (`prompts.ts`).
- [ ] Reader inputs stored on the device only (like the theme).
- [ ] Run the coverage pass on the 4 existing papers, so their checklist rows stop showing
      "not found" (`extract` re-run into scratch; merge only the coverage facts after review).
- [ ] 2E. Rewrite the three `editorial.json` files; concept files listed; `prompts.ts` updated
      with an old-shape refusal test; allowlist deleted; before/after table per paper.
- [ ] ⏸ Stop. Owner approves concepts and reads all three. Phase 9 is not done until then.

## Step 3: Phase 10, first live pipeline run

- [ ] 3A. `npm run retractions` (first real run, show the count); 3 candidate papers from Europe PMC.
- [ ] ⏸ Stop. Owner picks one and its tier.
- [ ] 3B. fetch, extract, draft on the pick; a regression fixture for each break; figure and concepts.
- [ ] ⏸ Stop. Owner reads the draft; then approve, content:build, release, live check.

## Step 4: Phase 11, Instagram carousels with their own art

- [ ] 4A. ⏸ Ask where the 12 carousel Studio files are; copy them in, never recreate.
- [ ] 4B. New deck shape (7 slide kinds, at most 10 slides, 1080×1350); art kit in
      `lib/carousel/art/`; Satori rules and inline-svg check; H1–H11 lint with the hook-caveat
      fixture; export route local-only or secret; verify-parity; PNGs in `docs/evidence/carousel/`.
- [ ] ⏸ Stop. Owner approves decks in `/admin/queue`.

## Finish

- [ ] Run `/phase-handoff`; list what Phase 12 needs from the owner. Do not start Phase 12.
