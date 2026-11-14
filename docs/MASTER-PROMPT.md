# Master prompt

The owner's instructions for the current run of work, saved on 2026-11-13 so that a session with
no chat history can continue. Read this file and `docs/PROGRESS.md` (the checklist, with what is
done). **The Amendments section at the end changes parts of the prompt; where they disagree,
the amendment wins.** The prompt itself is kept word for word below, checked against the
owner's original file with `diff` on 2026-11-13 (no differences).

---

## The prompt, verbatim

```text
You are continuing Science Digest. Work through Phase 8 close-out, skills setup, Phase 9
(9A–9E), Phase 10 and Phase 11, in that order, then stop. Do not start Phase 12.

FIRST, EVERY SESSION
Read CLAUDE.md, docs/ARCHITECTURE.md, docs/HANDOFF.md and the latest docs/BUILD-LOG.md
entries. If docs/PROGRESS.md exists, read it and continue from the first unchecked item. If
it does not, create it with every numbered item in this prompt as a checklist, commit it, and
start at Step 0. The repository is the source of truth. If this prompt disagrees with it,
stop and tell me which is wrong instead of guessing.

HOW TO WORK
- ⏸ means stop and wait for my reply. At each stop, report in plain language, briefly: what
  changed, the evidence (raw output), and exactly what you need from me.
- Auto mode is on. Without asking, you may edit code, tests and docs inside the repository,
  run local commands, commit and push. ASK FIRST before:
  - writing to the hosted Supabase project, or changing Vercel settings;
  - adding a dependency;
  - downloading or building anything from the internet;
  - touching anything outside the repository;
  - changing table shapes, the meaning of scoring, or anything involving stored user history.
- Evidence, not claims:
  - Every new rule gets a test. Show it failing once with the rule broken, then passing.
  - Before calling any sub-phase done, run:
    npm run lint && npm run typecheck && npm test && npm run build
    plus npm run test:browser and npm run test:http when screens or routes changed.
  - For any SQL change, also run npm run db:test:local (both passes, seeded and unseeded)
    and npm run db:mutation. Load the db-change skill first.
  - Paste real output. Never write "should work".
- Never edit generated files: lib/content/generated.ts, content/generated/,
  supabase/seed.sql, 90_parity.generated.test.sql. Never edit a migration that is already
  live; add a new dated one.
- Per-paper widgets and figures stay visual only (the widget guard).
- Write a dated BUILD-LOG entry for each decision, with the reason. Commit at the end of each
  sub-phase with a clear message, push, tick the item in docs/PROGRESS.md, and commit that
  too.
- Vercel deploys from main. After pushing anything a reader can see, wait for the deploy and
  check the live site (curl for status codes; Playwright for screens).
- If the context gets long, run /phase-handoff (Step 1) and tell me to start a fresh session
  with the Resume prompt.

STEP 0: PHASE 8 CLOSE-OUT
I have created the Turnstile widget (Invisible), added NEXT_PUBLIC_TURNSTILE_SITE_KEY in
Vercel and redeployed, then switched on CAPTCHA in Supabase. If anything in the repository or
on the live site says otherwise, stop and tell me.
Prove the gate on the LIVE site with Playwright, using two fresh browser contexts:
  a. The first tap in context A signs in anonymously with CAPTCHA on, and the tick reaches
     the server. Show it with a read-only count query through supabase db query --remote (no
     ids in the output). Me shows "Everything is saved".
  b. Context B, signed in with its own token, cannot read A's step_checkins rows (REST GET
     returns only B's rows).
  c. As a free user, /papers/hiit-body-composition shows the members' read locked, and
     paper_content returns no row for it.
  d. curl -sI the live /papers/does-not-exist returns 404 (already passed; show it again).
These checks create two anonymous test users on production. List them by creation time only
(no ids), and ask me at the stop whether to delete them.
Update the "Where it stands" section of docs/HANDOFF.md and mark Phase 8 done.
⏸ Stop with the gate results.

STEP 1: SKILLS
Create three project skills in .claude/skills/<name>/SKILL.md. Each has YAML frontmatter
(name, description), and the description says exactly when the skill applies.
1. science-content
   Applies when: editing content/papers/**, content/context/**, content/concepts/**,
   lib/pipeline/prompts.ts, carousel text, or any wording a reader sees.
   Contents:
   - H1–H8 copied word for word from CLAUDE.md, and H9–H11 plus amended H7 from Step 2A.
   - The three-layer editorial shape.
   - The workflow: edit the source JSON, run content:build, read the lint report, fix the
     content and never the rule.
   - Two short good/bad examples: the caffeine "placeholder key in the sleepiness lock"
     model, and an observational finding phrased without causal verbs.
2. db-change
   Applies when: editing supabase/migrations/**, supabase/tests/**, lib/score.ts,
   lib/evidence.ts, or anything that calls the database.
   Contents:
   - New dated migrations only. seed.sql is generated; never edit it.
   - Every test must hold whatever data exists: the seeded pass and background users,
     production included.
   - A mutation for every new rule.
   - Scoring changes go in TypeScript and SQL together, then npm run parity:gen.
   - Hosted changes: supabase db push --remote --dry-run --include-seed first, then ask
     before the real push.
   - The hosted test procedure: install pgTAP with supabase db query --remote, the owner
     runs the psql wrapper in their own Terminal, then drop pgTAP and show it's gone.
3. phase-handoff
   Applies when: the owner types /phase-handoff, or at the end of each phase.
   Contents:
   - Update docs/PROGRESS.md, the "Where it stands" section of docs/HANDOFF.md,
     docs/evidence/ and BUILD-LOG.
   - Then print a ready-to-paste Resume prompt that names the next unchecked item.
Keep CLAUDE.md as the always-on contract: keep the rules table, and add one line per skill
saying when to load it. Show CLAUDE.md's line count before and after; it should not grow by
more than about 10 lines.
If Anthropic's frontend-design skill is already available in this Claude Code, use it in 9C,
9D and 11. It is subordinate to this repository's ten colour tokens and fonts. Do not install
it or anything else without asking.
No stop here. Commit and continue.

STEP 2: PHASE 9, READABLE READS
Goal: reads that are easy to follow, with illustrations, without loosening any rule.

2A. Rules H9–H11 in code. Add these to CLAUDE.md and enforce them in lib/pipeline/lint.ts:
  H9  Feynman layer. Never use a technical term without immediately saying what it
      physically does in plain English. Give the mental model first, then the name of the
      pathway.
  H10 Progressive disclosure. Every read has three separate layers:
      - mechanism: why it happens;
      - protocol: what the data supports;
      - audit: design, sample size, raw effect size, the mandatory limitation.
      No caveats inside the mechanism layer. The audit stays visible without a tap (H6).
  H11 Voice. Short sentences, active voice, no academic throat-clearing.
  H7 (amended) Every number shown to a reader traces to a gated fact, from the paper or from
      a gated context source (2B). The UI says which.
  Checks, each with a failing fixture:
  (1) Schema: editorial.json has layers {mechanism, protocol, audit} and glossary
      [{term, plain}]. zod rejects the old flat shape for published papers; drafts in the
      old shape are reported, not built.
  (2) Jargon list in lib/pipeline/jargon.ts: adenosine, receptor, antagonist, upregulate,
      downregulate, attenuate, modulate, AMPK, mTOR, cortisol, circadian, REM, hypertrophy,
      VO2max, insulin sensitivity, all-cause mortality, hazard ratio, confidence interval,
      meta-analysis, cohort, randomized.
      Lint fails if a listed term appears in mechanism or protocol text before its glossary
      entry, or if a glossary entry's plain text itself uses a listed term.
  (3) Caveat leakage: lint fails if mechanism text contains limitation, confound,
      self-reported, "p =", "p<", 95%, CI, sample size, dropout or funded.
  (4) Throat-clearing phrases fail lint: "it is worth noting", "it should be noted",
      "it is important to note", "interestingly", "notably", "the authors observed that",
      "the results suggest that it may".
  (5) Sentences: fail over 30 words, warn over 22, report the average per layer. Write your
      own sentence splitter (no new dependency), tested on "e.g.", "et al.", "vs." and
      decimals.
  (6) Passive voice: warn only. Log why in BUILD-LOG.
  (7) Word budget, one constant: mechanism ≤ 350, protocol ≤ 150, audit ≤ 250. These are
      working values.
  The three current papers will fail the new schema. Keep them building through a temporary
  allowlist in content-build. A test must fail if the allowlist still exists after 2E.

2B. Context sources (parallel studies and background knowledge). Neither kind ever becomes a
  protocol step or changes an evidence weight. git diff --stat must show no change to
  lib/score.ts, lib/evidence.ts or supabase/migrations. If one would be needed, stop and ask.
  - Parallel studies, which may carry numbers:
    - content/context/<slug>/ holds source.txt and extraction.json, made through
      fetch → extract → GATE with role "context": the same licence rule (CC-BY, CC-BY-SA,
      CC0), retraction check and verbatim-quote rule. No editorial.json, no protocol.
    - A read may cite {source, fact}. The gate fails on a missing fact or an ungated source.
    - Each context study gets its own grade from grade.ts and an "Another study" chip.
    - npm run retractions covers content/context/ (with a test).
  - Background concepts, which may carry no numbers:
    - content/concepts/<slug>.json: {term, plain, model, reference {doi|isbn, title},
      reviewed_by_owner: false}.
    - Any digit fails lint.
    - content:build refuses a published read that uses an unreviewed concept. Only I
      approve, through a new command, npm run paper -- approve-concept <slug>.
  - Every context item shows a source line: "From the paper", "From another study: <cite>,
    <grade>", or "Background". The audit lists every context source with its DOI.
  - Before coding, check whether premium reads can carry this data in the paper_content
    JSON without a migration.
  ⏸ Stop with the 2B gate: a missing context fact fails, a digit in a concept fails, an
  unreviewed concept blocks the build, a retracted context DOI is withdrawn, scoring files
  are untouched. Include what you found about paper_content.

2C. Illustrations, drawn in code as React SVG. No image files, no AI-generated pictures, no
  chart library.
  - components/figures/primitives/: Arrow, Label, Bracket, Timeline, DoseCurve, BarPair,
    Gauge, LockKey, Cell, Flow. Only the ten colour tokens, so dark and light both work.
  - Per-paper figures go in components/papers/<slug>/figures/, registered in registry.tsx.
    A layer references one as {figure, caption, alt}. The build fails on an unknown figure.
  - Extend the widget guard to figures:
    - no store or Supabase imports;
    - no numeric literals outside geometry props (x, y, width, height, r, d, viewBox,
      strokeWidth, transform and similar). Any number a reader sees arrives as a prop bound
      to a gated fact id.
    Add failing fixtures for both.
  - Every figure has <title> and <desc>, and lint fails on empty alt text. At most one
    entrance animation, and none under prefers-reduced-motion (tested). Each figure fits
    360 px wide.
  - Build one mechanism figure per starter paper, using only that paper's extraction.json:
    - caffeine and adenosine, as the lock and placeholder key;
    - steps and mortality as an association only: no arrow from steps to lifespan;
    - interval training as a comparison of what was measured.
  Save screenshots at 390 px, dark and light, to docs/evidence/figures/.

2D. The article page. Rebuild components/read/Article.tsx at 390 px, in this order:
  1. The H2 hook, with reading time.
  2. Mechanism: short paragraphs, the figure after the first paragraph, and glossary terms
     underlined. Tapping a term opens the existing Sheet with the plain text, the concept
     picture and its source line.
  3. One pull-number card: the key gated number, its absolute form and its source line.
  4. Protocol: the tested parameters, the H3 "who this was tested in" panel, the simulator,
     then "Add to Life Game".
  5. "Receipts", always visible: design, n, raw effect size, what the weak end of the 95%
     range means, and the limitation in bold. A "Full receipts" expander holds the rest,
     including every context source with its DOI and grade.
  6. Members' extras, as today.
  Typography: line length 60–68 characters, line height at least 1.6, one idea per
  paragraph, at most 3 sentences per paragraph (lint warning). Newsreader for body, Archivo
  for labels.
  Keep: tap a dot for the source passage, RLS gating, and nothing members-only in the public
  HTML. Re-run the search-the-build check and show zero matches.
  Extend the browser walkthrough: glossary sheet, Full receipts, figure render, reduced
  motion. Save before and after screenshots, dark and light, to
  docs/evidence/article-redesign/.
  ⏸ Stop and send me the screenshot paths so I can review the design before you rewrite
  the content.

2E. Rewrite the starter papers and the draft prompt.
  - Rewrite the three editorial.json files into the three layers under H1–H11, using only
    facts already in each extraction.json.
  - Where background is needed, add concept files (reviewed_by_owner: false) and list them
    for me.
  - Do not add a parallel study. If one would help, propose its DOI and say why.
  - Update lib/pipeline/prompts.ts so the draft stage writes the three-layer shape, follows
    H9–H11, and cites context facts only by id. Add a test showing a fake old-shape model
    response refused.
  - Delete the allowlist and show its guard test passing.
  - Give me a before/after table per paper: words per layer, average and longest sentence,
    and jargon terms with their glossary entries.
  ⏸ Stop. I will review the concepts (approving them with approve-concept) and read all
  three reads on my phone. Do not mark Phase 9 done until I approve.

STEP 3: PHASE 10, FIRST LIVE PIPELINE RUN
3A. Run npm run retractions once (the first real clone of Retraction Watch) and show the
  count.
  Then search Europe PMC for 3 candidate papers:
  - licence verified through the API as CC-BY, CC-BY-SA or CC0; not retracted; in humans;
    preferably a randomized trial or meta-analysis;
  - on a broad, everyday topic for the free tier, unless I say otherwise.
  For each, give the title, DOI, design, n, licence and one sentence on why it would make a
  good read.
  ⏸ Stop. I pick one and say whether it is free or members-only.
3B. Run fetch, extract and draft on my pick.
  - Each break on first contact with Europe PMC or the model API gets a regression test
    built from the real response, trimmed and saved as a fixture.
  - If the read needs a parallel study, run it through fetch with role context.
  - Never loosen a rule. When the gate or lint refuses something, fix the JSON and show the
    refusal and the fix side by side.
  - Build its figure in 2C's style, plus any concept files it needs.
  ⏸ Stop. I read the draft against the paper and approve concepts and the read. Then run
  approve and content:build, release, and check the live page.

STEP 4: PHASE 11, INSTAGRAM CAROUSELS WITH THEIR OWN ART
4A. ⏸ Ask me where my 12 carousel Studio files are (lib/carousel/*, SlideRenderer.tsx, the
  export route, verify-parity.mts and the rest). Copy them in; never recreate them.
4B. Build a new deck shape from the same gated facts: at most 10 slides, 1080×1350, in this
  order:
  1. Hook: the H2 number or mechanism.
  2. Feynman picture: the metaphor as one bold image.
  3. Finding: absolute numbers (H5).
  4. Who it was tested in (H3).
  5. What was tested (the protocol).
  6. Receipts: design, n and the limitation (H6).
  7. Final slide pointing to the paper's interactive widget on the web app.
  Art kit in lib/carousel/art/: poster-style, separate from the article figures, drawn in
  code. Big shapes, one idea per slide, at most 25 words of text per slide. Every number is
  bound to a fact id.
  Satori rules:
  - display:flex on every element with children;
  - inline styles only;
  - .woff fonts, not .woff2;
  - the linter fails closed on unverified glyphs (≤ and ✓ render as boxes).
  Check whether this Satori version renders inline <svg>. If it doesn't, use data URIs.
  Show a test render either way.
  Run H1–H11 lint on carousel text. Add a fixture that puts a caveat on the hook slide and
  show it failing.
  The export route must be local-only like /admin/queue, or require a secret. Test that it
  refuses without that check.
  Gate: verify-parity.mts passes, and one deck per published paper exports to PNGs with no
  missing glyphs, saved in docs/evidence/carousel/.
  ⏸ Stop. I approve decks in /admin/queue. Nothing posts by itself.

FINISH
Run /phase-handoff. Then stop and list what Phase 12 needs from me:
- live site or bundled copy;
- whether widget taps wait for the app to open;
- Apple and Google developer accounts.
```

---

## Amendments

Each is the owner's instruction, given in chat after the prompt. Reasons and evidence are in
`docs/BUILD-LOG.md` under the same dates.

### 2026-11-13: Step 0-pre, three items to do before Step 0 (all done)

- **PRE-1. A write that can never succeed must not block the queue forever.** After commit
  4aee19f, a 409, `42883`, `42P01` or `PGRST2xx` stayed at the head of the queue and was retried
  without end. Rule approved by the owner: after 3 "wait for a fix" answers in a row from the
  server about the same write, it moves to a held list saved on the device, with every queued
  write about the same habit or paper, and the queue goes on. Held writes keep their order and
  are retried when the app opens, when the tab regains focus, after every successful sync, once
  an hour, and from "Try again" on Me, which also shows how many are waiting and why. The saved
  state went from version 2 to 3, with a test that a version-2 store loads with nothing lost.
  Storing the server's error code and a time beside a held write is allowed, as a narrow
  exception to decision 6 (it is diagnostic data about a write, not data about the user).
  Writes refused on their merits from the queue stay out of scope (dropped and reported, as before).
- **PRE-2. A privacy page** at `/privacy` (Cloudflare requires one for Invisible mode): what the
  device stores, what Supabase stores, Vercel Web Analytics, Cloudflare Turnstile with a link to
  its Privacy Addendum, a line on IP addresses that says where one is actually kept, and a
  contact address for questions and deletion requests. Linked from Me and the bottom of
  `/upgrade`. It is a draft for the owner to review; the "draft, not reviewed by a lawyer" note
  stays in the source.
- **PRE-3. A live check of the 409 fix.** Done by the owner by hand in an incognito window, with
  a read-only count query as the evidence (`docs/evidence/pre3-live-409.txt`).

### 2026-11-13: the held-writes rule, changed

If a held write is replayed and the server refuses it on its merits (the same codes that count
as a permanent refusal outside the held list), it is dropped, the refusal is shown on Me as for
a queued write, and the writes held behind it are released. Only "wait for a fix" codes keep a
write held.

### 2026-11-13: what a browser may do on the live site (corrected the same day)

Cloudflare Turnstile runs only at a visitor's first write, the anonymous sign-in, and it refuses
an automated browser there (error 600010). So, on the LIVE site:

- **Playwright may load pages as a visitor who has not tapped anything:** screens, screenshots,
  status codes, page content, the search-the-build check.
- **Anything that needs a signed-in user** uses the owner's manual incognito run, or the
  server-side method of `scripts/gate-rls-live.mts` (the owner runs it with the key in their
  own Terminal).
- **Never work around the CAPTCHA.**

Local builds may use Playwright for everything, as before. (An earlier wording of this amendment
said no automated browser on the live site at all; that was wider than the owner meant.)

This replaces "Prove the gate on the LIVE site with Playwright, using two fresh browser
contexts" in Step 0, whose checks all needed a signed-in user:

- (a) is covered by the owner's manual run plus the count query.
- (b) and (c) are done server-side by `scripts/gate-rls-live.mts`: two test users created with
  the Supabase auth admin API, REST calls with each user's own token, then both users deleted.
  The owner runs it in their own Terminal with the service role key typed at a prompt
  (`read -s SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY`); the key is never
  written to a file, committed or printed, and an assistant session never holds it. Cleanup
  deletes only the user ids the script itself created, kept in memory; never select users by
  email pattern, domain or creation time. Ask the owner before creating anything on production.
- (d) `curl -sI` for the 404, as written.

Step 0 is done: both runs of the script passed (`docs/evidence/phase8-gate.txt`).

### 2026-11-13: phase numbers

`docs/HANDOFF.md` section 7 was renumbered to match this prompt: 9 readable reads, 10 first live
pipeline run, 11 Instagram carousels, 12 native app and home-screen widgets, 13 payments,
14 scale. The prompt's "Do not start Phase 12" therefore means the native app.

### 2026-11-13: this file

The prompt is saved here so a session with no chat history can continue from this file and
`docs/PROGRESS.md`. The Resume prompt is in `docs/HANDOFF.md`, section 8.

### 2026-11-14: owner's amendments (they win where they conflict with the text above)

- **No command against the hosted Supabase project without the owner's "go"** for that command.
- **2A:** rule (b) is dropped (a listed word may open the mechanism if it has a glossary entry).
- **2D, A:** the title list becomes a feed of whole post cards (hook, reading time, mechanism
  figure, number card with source line, grade chip); a members' read shows its hook and figure
  only; no endless scroll; the card reuses the article's components.
- **2D, B:** figures may be interactive with React state and SVG only, no new dependency; the
  first view carries the point alone; every state obeys the figure rules; shapes are placed by
  calculation; motion only for measured change; 44 px targets at 360 px, keyboard, aria-live.
  One figure is interactive so far (turmeric's readings grid).
- **2D, C:** toggles get one quiet transition, 120 to 180 ms, from tokens in `app/globals.css`;
  none under reduced motion.
- **`impeccable`** (design skill, installed by the owner) is subordinate to the colour tokens
  and the two fonts.
- One ⏸ stop per session in budget mode. Details: BUILD-LOG 2026-11-14.
