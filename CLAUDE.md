# Science Digest: rules for anyone (or any model) changing this code

Read this first. `docs/MANUAL.md` explains how to do things; this file says what must stay true.
`docs/BUILD-LOG.md` records decisions already made. `docs/data-model.md` is the database.

## What this is

Clinical papers turned into five-minute reads, each with a simulator and a protocol the reader
can add to a daily tracker ("Life Game"). The tracker shows **evidence-weighted adherence**.
The interactive part is the product; the text is what justifies it.

Stack: Next.js 16 (App Router), Tailwind 4, TypeScript, Supabase (Postgres, anonymous auth,
row level security), Zustand. Next.js 16 differs from older versions: read
`node_modules/next/dist/docs/` before using an API from memory (see `AGENTS.md`).

## Before you say a change is done

```
npm run lint && npm run typecheck && npm test && npm run build
npm run db:test        # needs Docker;  or: npm run db:test:local  (plain Postgres + pgTAP)
```

Show the output. A schema change ships with database test output; a pure function ships with
unit test output. Add a test that **fails when the rule is broken**, not only one that passes
when it is kept (`npm run db:mutation` does this for the database).

## Rules that are enforced by code. Do not weaken the code to get past them

| Rule | Where it lives |
|---|---|
| Banned hype words, causal verbs without a randomized design, relative risk without absolute, missing limitation, unsourced numbers | `lib/pipeline/lint.ts` |
| A read without the three layers; jargon with no glossary entry; a caveat in the mechanism layer; throat-clearing; a sentence over 30 words; a layer over its word budget | `lib/pipeline/editorial.ts`, `lint.ts`, `jargon.ts`, `sentences.ts` |
| A quote that is not in the paper voids the extraction; evidence grades are derived, never model-supplied | `lib/pipeline/gate.ts`, `lib/pipeline/grade.ts` |
| Only CC-BY, CC-BY-SA, CC0 papers | `lib/pipeline/license.ts` |
| A per-paper component cannot import the database, the store, or compute a percentage | `eslint.config.mjs` (the widget guard) |
| A figure holds no number of its own outside a geometry prop, no timer and no animation; solid means measured (cites a result), dashed means proposed (cites the authors' sentence); unknown figure, empty alt text | `eslint.config.mjs` (the figure guard), `lib/content/figures.ts`, `lib/pipeline/lint.ts` |
| A figure spec holds a literal number, or names an unknown kind or a fact that is not gated; a simulator rests on a fact with no range (H12) | `lib/content/figure-kinds.ts`, `lib/pipeline/lint.ts` |
| A user cannot change their own tier; cannot read another user's ticks; cannot tick a derived step | `supabase/migrations/`, tested in `supabase/tests/database/` |
| TypeScript scoring and SQL scoring return identical results | `scripts/gen-parity.mts` + `90_parity.generated.test.sql` |

## Rules that need your judgment

1. **Scores are derived, never stored.** No `score`, `points`, `streak` or `percentage` column,
   ever. Change the rule in `lib/score.ts` **and** `compute_adherence()` in SQL, then
   `npm run parity:gen`.
2. **Evidence weights live in two places only:** `lib/evidence.ts` and `evidence_weight()` in SQL.
3. **No second points currency.** No XP, coins, gems, levels or bonus points. The only numbers
   are evidence-weighted adherence, plain consistency (boxes ticked today) and the streak.
4. **No health outcome is ever inferred from ticks.** A tick records an action. Never write copy
   like "your sleep improved". Show what the study found, on the study's population.
5. **The device stores what the user did, and nothing else** (`lib/store/reduce.ts`): ids and
   dates. Labels, weights and estimates are looked up, so a correction reaches every user.
6. **Ticks reference step ids.** Steps are retired (`retired: true`), never deleted, and a
   step's `key` is never renamed: its id is derived from it.
7. **Premium is decided on the server.** Never ship members' content to the browser and hide it
   with an `if`. Gate with row level security or a database function.
8. **Tracking is always free.** A lapsed member keeps ticking, their streak and their history.
9. **Nothing posts to Instagram by itself.** The pipeline stops at `/admin/queue`, where a person
   approves each deck. Do not add auto-publishing.
10. **`lib/content/generated.ts`, `content/generated/*` and `supabase/seed.sql` are generated.**
    Edit `content/papers/<slug>/` and run `npm run content:build`.
11. **Ask before changing** the database shape, scoring meaning, or anything that touches stored
    user history. These are expensive to undo.

## Content rules H9–H12 (H1–H8: `docs/HANDOFF.md` section 5 and the `science-content` skill)

- **H9 Feynman layer.** Never use a technical term without immediately saying what it physically
  does in plain English. Give the mental model first, then the name of the pathway.
- **H10 Progressive disclosure.** Every read has three separate layers: mechanism (why it
  happens), protocol (what the data supports), audit (design, sample size, raw effect size, the
  mandatory limitation). No caveats inside the mechanism layer. The audit stays visible without
  a tap (H6).
- **H11 Voice.** Short sentences, active voice, no academic throat-clearing.
- **H12 Personal estimates.** A personal estimate is shown only as a range derived from the
  gated fact's range, labelled "Estimate from the study's numbers, not medical advice", with
  its source line. Missing fact: no simulator; never fill it from general knowledge. The fact
  may come from a gated context study (never a background concept); the range rule still applies.
- **H7 (amended).** Every number shown to a reader traces to a gated fact, from the paper or
  from a gated context source. The UI says which. A figure spec and its simulator may use a
  fact of a gated context study (owner, 2026-11-14): the chart shows "From another study:
  <cite>, <grade>" and the audit lists the study. A background concept never feeds one.

## Skills: load the one that matches before you start

- `science-content`: before editing `content/**`, `lib/pipeline/prompts.ts`, carousel text, or any wording a reader sees.
- `db-change`: before editing `supabase/**`, `lib/score.ts`, `lib/evidence.ts`, or anything that calls the database.
- `phase-handoff`: when the owner types `/phase-handoff`, and at the end of each phase.

## Style

- Opinionated, small, production-ready. No new dependency without a reason in the commit body.
- All colours come from the tokens in `app/globals.css`. Black + orange (dark), white + orange (light).
- Interface copy is plain language, sentence case, no jargon. Errors say what happened and what to do.
- Pure logic (`lib/score.ts`, `lib/dates.ts`, `lib/store/reduce.ts`, `lib/pipeline/*`) imports
  nothing from React, Next or Supabase, so a future native app can reuse it unchanged.
