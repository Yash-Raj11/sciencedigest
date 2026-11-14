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
- [ ] 2D. Rebuild `components/read/Article.tsx` (hook, mechanism, pull-number, protocol,
      receipts, members' extras); search-the-build check; walkthrough extended; before/after
      screenshots in `docs/evidence/article-redesign/`.
- [ ] ⏸ Stop with the screenshot paths for design review.
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
