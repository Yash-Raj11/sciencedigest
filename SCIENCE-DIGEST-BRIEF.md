# Science Digest — Build Brief

**Handoff document.** Everything needed to continue building without the prior conversation.
Last updated 2026-11-12.

---

## 1. What this is

A platform that turns clinical research papers into five-minute reads, each paired with an
interactive widget. Readers "equip" protocols from papers into a persistent dashboard and tick
off daily actions; the dashboard shows an **evidence-weighted adherence** score. Open-corpus
first, freemium later, with Instagram carousels as organic distribution.

The interactive widget is the product. The text summary is the thing that justifies it.

**Niche:** health science to start, broadening later.

---

## 2. Current status

| Component | State |
|---|---|
| Anti-slop heuristics (H1–H8) | Finalised, in §4 below |
| Content pipeline design | Finalised, §8 |
| Data model | Specified, §6 — **migration in progress** |
| Carousel generator + Studio | **Built and verified**, §9 |
| Scoring function | Specified §7, not yet written |
| Zustand store | Specified §10, not yet written |
| Dashboard / article UI | Mockups only |

**Immediate next step:** finish the Supabase migration and get the ten pgTAP contract tests
green (§11, Phase 3). Nothing downstream should be written until that gate passes.

---

## 3. Stack

- **Front end:** Next.js (App Router), TailwindCSS, TypeScript
- **Back end:** Supabase — Postgres, Auth (anonymous sign-ins enabled), Row Level Security
- **State:** Zustand (not React Context — see §10)
- **Carousel rendering:** Satori + sharp, fonts from pinned `@fontsource` packages
- **Testing:** pgTAP for schema and RLS, vitest for pure functions
- **Extraction model:** a strong API model. See §5 on why this is not run locally.

---

## 4. Content contract — the anti-slop heuristics

These are non-negotiable. Most are enforced in code, not prose; §8 says where each one lives.

### H1 — Banned vocabulary
Never: *biohack, superfood, miracle, game-changer, secret, holy grail, boost, skyrocket,
shatter, destroy, turbocharge, supercharge, science proves, proven to, life-changing, insane,
transform your, optimize your*.
Use precise biological verbs: *modulate, regulate, support, upregulate, attenuate, mitigate,
correlate*.

### H2 — Authoritative hook, curiosity gap through specificity
Lead with the counter-intuitive statistic or the named mechanism. Not *"this secret biohack
will skyrocket your energy"* but *"why coffee before 9:30am is followed by a 2pm crash — the
adenosine mechanism"*.

**Amendment, 2026-11-12:** H2's original example used a bare relative percentage, which H5
forbids. H5 wins. Any percentage in a headline is either absolute or explicitly marked relative.

### H3 — Causality firewall
Match verbs to study design.
- **Observational:** never *causes, cures, prevents, lowers*. Use *associated with, correlates
  with, individuals who did X were observed to*.
- **RCT:** causal verbs permitted **only for the exact population studied**. Not "resistance
  training builds bone density" but "resistance training increased bone density in
  post-menopausal women".

The licensed population is rendered as its own slide / panel, not a footnote.

### H4 — The rodent trap
Never translate in-vitro or animal findings into human protocols. Species is a required field
on every extraction. Non-human studies must carry: *"Mechanistic proof-of-concept only. Has not
been directly validated in human clinical trials."*

### H5 — Statistical vs clinical reality
- Never a relative risk without its absolute counterpart.
- Never treat statistical significance as magnitude. Always report the raw effect size, and
  report what the **lower bound** of the confidence interval actually means.

### H6 — Epistemic humility and flaw extraction
Never present one study as settled. Extract and **prominently display** at least one
methodological limitation — self-reported recall, industry funding, dropout rate, healthy-user
bias, unexplained heterogeneity. Doubt builds trust.

### H7 — Widget metrics are grounded
No arbitrary health points. Every gamified number traces to a measured endpoint or biomarker
from the paper.

### H8 — Adherence reality check
- Never a "biological score" from checkboxes. Ticking a box means an action was taken, not that
  a biological change occurred.
- The global metric is **Evidence-Weighted Adherence**.
- Weights: high-certainty RCT ×1.0, moderate ×0.7, low ×0.4, unverified ×0.
  (Moderate ×0.7 is a working value — H8 as written specifies only 1.0 / 0.4 / 0.)
- The scoring rule is itself the teaching mechanism. On the dashboard a lean-mass protocol
  graded High outweighs a fat-loss protocol graded Low — the inverse of how fitness content
  ranks them, and correct.

### Enforcement tiers
A heuristic that lives only in a prompt is a wish. Target: 70%+ in the first two tiers.

| Tier | Mechanism | Examples |
|---|---|---|
| **Schema** | The violation cannot be expressed | H4 species enum; H5 required CI field; H7 metric must reference an extracted outcome |
| **Lint** | Deterministic code, blocks publish | H1 banned terms; H3 causal verbs; H6 limitation count; H5 superlative-near-p-value |
| **Prompt** | Instruction only, unverifiable | H2 "counter-intuitive"; tone |

---

## 5. Decisions already made — do not relitigate

Each of these was argued through. A fresh model will tend to suggest the rejected option.

**"Open source" means open corpus and open code, not local models.** Structured clinical
extraction is the hardest step in the pipeline and the one where a weaker model produces exactly
the slop the product exists to avoid. At ~10 papers/week the API spend is single-digit dollars a
month. Put the model behind `lib/ai/provider.ts` so swapping is a one-file change, and pay for
the good one.

**Licence filtering is an allowlist, not "is it in the PMC OA subset".** That subset contains
CC-BY-NC and CC-BY-ND. NC bars the paid tier; ND bars derivative works, which a summary arguably
is. Accept only **CC-BY, CC-BY-SA, CC0**. Facts and mechanisms aren't copyrightable regardless,
but that argument should not be load-bearing on a revenue product.

**Content gating is a split table.** `papers` is world-readable including premium rows — teaser,
title, DOI, category — so SEO and the Instagram funnel work. Only `paper_content` is gated.

**Anonymous Supabase auth from the first tap, not localStorage.** Every visitor gets a real
`auth.uid()` the moment they tick a box, so rows exist from day zero and RLS is uniform.
"Sign up" becomes linking an email to the existing user: no merge logic, no clock-skew dedupe,
no losing a week of streak when someone signs up on a second device.
**Enable Anonymous sign-ins in the Supabase dashboard, and CAPTCHA protection alongside it** —
anonymous sign-up without CAPTCHA is an open faucet into the auth table.

**Steps are normalised rows with UUIDs, not slugs inside `content_json`.** Enables
"what % of users abandon at step 3" across the corpus, and editing a paper never orphans history.

**Ticks record against step IDs, never protocol IDs.** Steps are shared between protocols — one
tick must credit all of them, counted once.

**Per-paper widget components are committed per paper; shared state logic is not.** The visual
treatment lives in `components/papers/<slug>/Widget.tsx`. Auth bootstrap, persistence, the
percentage math and the step-UUID contract live in `lib/protocol/useProtocol.ts` and
`components/protocol/primitives.tsx`. Enforce with ESLint `no-restricted-imports` scoped to
`components/papers/**`: a generated widget may not import `@supabase/*` and may not compute a
percentage. Without that guard, 200 papers means 200 subtly divergent sync bugs.

**Zustand, not Context.** Context re-renders every consumer on any change; a dashboard with a
dozen trackers would repaint on every tap. The sync layer also needs to read state from outside
React.

**Scores are derived, never stored.** A pure `score()` function, mirrored in SQL so the client
cannot lie, with a parity test asserting the two agree. Changing the weighting rule then
recalculates all history instead of freezing it wrong.

**Premium is two-dimensional.** Not "free papers vs premium papers". Every paper's basic widget
and simulator are free. Premium adds **extra papers** *and* **extra capability inside widgets
the user already has** — deeper regimen analysis, research-derived takeaways with direct
implementation. Consequence: premium output must be **computed server-side behind a tier check**.
Hiding it client-side with a `tier === 'premium'` render guard is readable in devtools in ten
seconds.

**Tracking is always free, so a cancelling subscriber never loses their streak or history.**
Analyses stop rendering, premium papers re-lock, ticking continues.

**Daily actions and programme conditions are different things.** Only genuine daily choices are
tickable. "Third session this week" is derived by counting this week's ticks. "Inside an 8-week
block" is derived from a `block_started_at` date set once. Derived steps have no checkbox and
cannot be gamed by tapping.

**Adherence denominator: everything equipped, with 7-day dormancy.** A protocol untouched for
7 days leaves the denominator until deliberately re-equipped. Strict-always punishes people into
quitting; attempted-only makes the number meaningless.

**Instagram automation stops at a "ready to post" queue.** The two-step container API would work,
but an unreviewed fabricated health claim going out at 3am ends an account whose entire pitch is
rigour. The 60-second audit is worth more than the four seconds of tapping it saves.

**No fabricated health outcomes, ever.** Checkbox data cannot tell someone their sleep improved.
Show adherence and consistency, and alongside it what the study predicted, with its effect size
and timeframe, labelled as the study's finding on *its* population.

---

## 6. Data model

### Enums
- `subscription_tier`: `free | premium`
- `evidence_grade`: `high | moderate | low | none`
- `step_kind`: `action | weekly_target | condition`

### `evidence_weight(grade)`
One SQL function: high 1.0, moderate 0.7, low 0.4, none 0.0. Nothing else hardcodes these.

### Tables

**`user_profiles`**
`id uuid PK references auth.users(id) on delete cascade` — the same id, **not** a separate
`auth_id`; this removes a join from every RLS policy, which runs per row.
Plus `subscription_tier`, `stripe_customer_id`, `timezone text not null default 'UTC'`,
`created_at`.
Column grants: `revoke update on user_profiles from authenticated;`
`grant update (timezone) on user_profiles to authenticated;` — RLS cannot do column-level
control, and without this a user promotes themselves to premium.

**`features`** — `key text PK` (`regimen_analysis`, `key_takeaways`…), `label`,
`min_tier subscription_tier not null default 'premium'`.

**`papers`** — `id, slug unique, title, doi unique, category, teaser,
access_tier subscription_tier default 'free', published_at, created_at`. World-readable.

**`paper_content`** — `paper_id PK, content_json jsonb, updated_at`.
Readable when the paper is free OR the viewer is premium.

**`protocol_steps`** — `id, paper_id, position, label, detail,`
`kind step_kind default 'action', evidence_grade default 'none', source_estimate text,`
`target_per_week smallint, counts_step_id uuid, condition_key text, condition_value jsonb,`
`retired_at timestamptz`, `unique (paper_id, position) deferrable initially deferred`.
CHECKs: `weekly_target` requires `target_per_week` + `counts_step_id`; `condition` requires
`condition_key` + `condition_value`; `source_estimate is null` implies grade `none`.
**Steps are retired, never deleted** — historical ticks reference them.

**`equipped_protocols`** — `user_id, paper_id, equipped_at, last_active_on date, unequipped_at`,
PK `(user_id, paper_id)`. Dormant when `current_date - last_active_on > 7`.

**`user_program_state`** — `user_id, paper_id, block_started_at date, choices jsonb, updated_at`,
PK `(user_id, paper_id)`. What `condition` steps evaluate against.

**`step_checkins`** — `user_id, step_id, local_date date, created_at`,
PK `(user_id, step_id, local_date)`. **The single write path for daily progress.** A trigger
rejects inserts where the step's kind is not `action`; another updates `last_active_on`.

**`retractions`** — `doi PK, retraction_nature, retraction_date, reason, synced_at`.

### RLS conventions
Enable on every table. In every policy write `(select auth.uid())`, not bare `auth.uid()`, so
Postgres caches it as an initplan rather than re-evaluating per row.

### Derived, never stored
Per-paper completion, daily adherence, and streak are all views or functions over
`step_checkins` + `protocol_steps` + `equipped_protocols` + `user_program_state`.

---

## 7. Scoring

```ts
score(input: {
  today: string;                      // user's LOCAL date — never UTC
  equipped: { paperId: string; lastActiveOn: string | null }[];
  steps: Step[];                      // retired excluded
  checkins: { stepId: string; localDate: string }[];
  programState: Record<string, { blockStartedAt: string | null; choices: Record<string,string> }>;
  dormancyDays?: number;              // default 7
}): {
  pct: number; earned: number; possible: number;
  perPaper: Record<string, { pct: number; earned: number; possible: number }>;
  dormant: string[];
  satisfied: Record<string, boolean>;
}
```

**Step satisfaction**
- `action` — a checkin row exists for (user, step, today)
- `weekly_target` — checkins for `counts_step_id` in the current ISO week ≥ `target_per_week`
- `condition` — `condition_key` evaluated against programme state:
  - `block_weeks_gte` → `(current_date - block_started_at) >= weeks * 7`
  - `modality_is` → `choices->>'modality' = condition_value->>'modality'`

Grade `none` contributes 0 to both numerator and denominator. Dormant papers are excluded
entirely. ISO weeks start Monday. Pure function, no imports from supabase/react/next, mirrored
in SQL as `compute_adherence(p_user uuid, p_date date)`.

**Protocol conflicts are real and must be surfaced.** Two protocols from the same paper can
contradict — one says run, one says cycle, and a single session cannot be both. With a dozen
protocols equipped this happens constantly. Detect over the equipped set and warn; it is a check,
not stored state.

---

## 8. Content pipeline

Slop happens when model output is graded only by vibes or by another model. Four of six stages
are deterministic code and the model is trapped between them.

| # | Stage | Model? | Output |
|---|---|---|---|
| 0 | Ingest & eligibility | No | Licensed, non-retracted candidates |
| 1 | Extraction | Cheap model, temp 0 | Strict JSON with source spans |
| 2 | **The gate** | No | Validated JSON, or rejection |
| 3 | Editorial | Strong model | 5-min read, protocol steps, carousel |
| 4 | **The lint** | No | Pass, or rejection |
| 5 | Human audit | You | Publish |

**Stage 0.** Europe PMC REST for OA full text; licence allowlist; retraction screening.
Do **not** hit an API per paper for retractions. Crossref acquired the Retraction Watch database
in Sept 2023 and publishes it as a CSV in a git repo, updated each working day, CC0:
`git clone https://gitlab.com/crossref/retraction-watch-data`. Nightly cron pulls it into the
`retractions` table; ingestion does a local DOI join. Then **run the join backwards across all
live papers nightly** to catch papers retracted *after* you published a read about them. That
one cron job is the single biggest trust differentiator over every AI summary account.

**Stage 1.** Two non-negotiable schema rules:
- `"not_reported"` is a legal value for every field. Models hallucinate hardest when a required
  field has no answer in the source. Make absence expressible and absence gets reported.
- Every extracted leaf is `{ value, span }` where span is a character-offset pair into the
  source. **If the model cannot point at where it read a number, the field is void.**
  Mechanically checkable, and the highest-leverage anti-hallucination device available.

Absent by design: no `evidence_tier`, no `causal_language_permitted`, no "key takeaway". Never
ask a model to grade the study it just read — it flatters. Those derive in Stage 2 from `design`
via a lookup table.

**Stage 2.** Schema validation (zod) → span verification (`source.slice(...span)` must contain
the value; failure rejects the extraction rather than blind-retrying) → derive `evidence_tier`
and `causal_language_permitted` → run heuristics.

**Stage 3 — the editorial model never sees the paper.** It receives only the validated JSON.
It therefore *cannot* reuse the authors' prose, which solves plagiarism at the architecture
level rather than with a scan afterwards, and cannot smuggle in an unextracted claim. Keep
Copyleaks as a spot check, not as the control.

**Stage 4.** Banned terms; causal verbs when not licensed; species in headline when non-human;
relative risk without absolute; 7-gram shingle overlap against the source abstract; every
sentence must reference a JSON field id — orphan claims fail.

---

## 9. Carousel generator + Studio — already built and verified

Twelve files exist. **Do not rewrite these.**

```
lib/carousel/tokens.ts        design tokens, canvas, font faces, IG limits
lib/carousel/schema.ts        zod deck contract + parseDeck()
lib/carousel/lint.ts          the heuristics linter, isomorphic
lib/carousel/lint.test.ts     17 vitest cases, all passing
lib/carousel/sample-deck.ts   the reference deck
components/carousel/SlideRenderer.tsx   THE single renderer
components/carousel/CarouselStudio.tsx  the admin dashboard
app/admin/carousel/page.tsx
app/api/carousel/export/route.ts        satori + sharp + zip
scripts/generate-carousel.mts           thin CLI
scripts/sync-fonts.mjs                  @fontsource → public/fonts
scripts/verify-parity.mts               regression test
```

**Key facts a new session needs:**

- **Satori accepts React elements.** `SlideRenderer.tsx` is the *only* slide renderer: the Studio
  mounts it as DOM for preview, the export route and CLI pass it to `satori()`. Verified
  byte-identical across all 8 slides against the original implementation. `verify-parity.mts` is
  the regression test — keep it.
- Satori implements a **subset** of CSS. Every element with children needs `display: flex`;
  inline styles only; no CSS variables, no pseudo-elements, no transforms. Violating this renders
  correctly in Chrome and silently wrong in the PNG.
- **Fonts: `.woff`, not `.woff2`.** Satori supports TTF/OTF/WOFF only; `@fontsource` ships woff2
  by default. Pinned npm packages, copied to `public/fonts` at postinstall — no CDN fetch at
  render time.
- **Glyph coverage is a build gate.** `≤` and `✓` are absent from the Archivo Latin subset and
  render as tofu boxes with no error; the PNG exports clean. The linter fails closed on any
  character outside a verified set.
- `sharp().png({ quality })` is a JPEG option, silently ignored for PNG — use `compressionLevel`.
- Instagram: 1080×1350 (4:5), max 10 slides per carousel, **every slide cropped to the aspect
  ratio of the first**, 8MB per image. The docs contradict themselves on the daily post cap
  (50 vs 100) — build against the lower number and poll `/content_publishing_limit`.
- `/admin/carousel` **has no auth yet.** `robots: noindex` is not a security control. Add a
  middleware tier check before this reaches a deployed environment — the export endpoint renders
  images on demand, which is a free CPU faucet.

**Reference paper used throughout:** Kordi M., Nikolaidis P.T., et al., *Journal of Clinical
Medicine* 2023;12(6):2291, DOI `10.3390/jcm12062291`, PMID 36983289, PMC10054577, **CC BY 4.0**.
A meta-analysis of 36 RCTs on HIIT and body composition. Useful because its GRADE grades run
inverse to the attention — body fat % is graded *low*, fat-free mass *high*, and the high-grade
result collapses under leave-one-out.

---

## 10. Store shape

Three slices: `equipped`, `ticks`, `sync`.

```
equipped:  ["paper-abc", "paper-def"]              ← IDs only
ticks:     { "2026-11-12": ["step-1", "step-4"] }  ← IDs only, by LOCAL date
queue:     [ ...writes not yet flushed to Supabase ]
```

**The store holds what the user did, and nothing else.** No labels, no definitions, no effect
sizes, no weights, no scores — those are fetched. Copying definitions into saved user state means
that the day you correct a number in a paper, every existing user keeps the old version forever
and you have no way to reach it.

Shared steps work for free because ticks key on step ID. Optimistic ticks enter the queue;
`sync.ts` drains it with retry, reconciling last-write-wins per `(step_id, local_date)`.

---

## 11. Build phases

- **Phase 0** — scaffold. `create-next-app` + `zustand @supabase/supabase-js @supabase/ssr zod`,
  dev deps `vitest tsx`, `supabase init`. ✅ done
- **Phase 1** — `CLAUDE.md` guardrail file at repo root. ✅ in progress
- **Phase 2** — `docs/data-model.md` from §6 above.
- **Phase 3** — migration + RLS + **ten pgTAP contract tests**. ← *current gate*
- **Phase 4** — `lib/score.ts` + vitest + SQL mirror + parity test.
- **Phase 5** — Zustand store + sync queue.
- **Phase 6** — dashboard, protocol cards, educational simulators.
- **Phase 7** — drop in the carousel files from §9.

### The Phase 3 gate — do not pass until all ten are green

1. anon sees all rows in `papers`, premium included (teaser and SEO must work)
2. anon sees `paper_content` only for free papers
3. a free authenticated user sees `paper_content` only for free papers
4. a premium user sees all `paper_content`
5. a user cannot UPDATE their own `subscription_tier` — expect error `42501`
6. a user cannot read another user's `step_checkins`
7. inserting a checkin for a `condition` step raises an exception
8. inserting a checkin for an `action` step succeeds and updates `last_active_on`
9. `evidence_weight('none')` returns `0.0`
10. a step with null `source_estimate` and grade `'high'` violates its CHECK

Test 1 failing means the Instagram funnel points at invisible pages. Test 5 failing means Stripe
is decorative.

---

## 12. Working expectations

- **Show evidence, don't assert correctness.** Every schema change ships with pgTAP output.
  Every pure function ships with vitest output. Negative tests matter as much as positive ones —
  prove the gate *fires* when violated, not only that it stays quiet when it isn't.
- **Opinionated, production-ready code.** No generic boilerplate, no bloated dependencies. A new
  dependency is justified in the commit body.
- **Ask rather than guess** on anything that is expensive to reverse — schema shape, scoring
  semantics, anything touching stored user history.

---

## 13. Open questions

1. **"Research-based extra points" in the premium widget — insights, or game points?** If it
   means extra insights drawn from research, fine. If it means bonus points in the game, it
   collides with H7 and H8: a second scoring currency that isn't evidence-weighted adherence is
   the arbitrary-points problem in a new hat.
2. **GRADE Moderate weight.** H8 specifies only high 1.0 / low 0.4 / none 0. Working value for
   moderate is 0.7.
3. **Dormancy window.** 7 days is a guess. Revisit against real usage; it lives in one constant.
4. **Premium feature list.** `regimen_analysis` and `key_takeaways` are placeholders in the
   `features` table. The real list drives what the server-side gated computations need to return.
