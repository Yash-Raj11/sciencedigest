# Data model

The database as built in `supabase/migrations/`. Section numbers (§) refer to the build brief.
Where this file and a migration disagree, the migration is right and this file needs fixing.

## The idea in four sentences

Papers and their protocol steps are **content**: written once, read by everyone.
What a person does is recorded as **ticks**: one row per (user, step, local date).
Every number shown to a person (score, percentage, streak) is **worked out** from those two each
time it is needed, and is never saved.
So correcting a paper, or changing the scoring rule, corrects everyone's history at once.

## Enums

| Name | Values |
|---|---|
| `subscription_tier` | `free`, `premium` |
| `evidence_grade` | `high`, `moderate`, `low`, `none` |
| `step_kind` | `action` (a tick box), `weekly_target` (counted from ticks), `condition` (true or false from the user's programme settings) |

`evidence_weight(grade)` is the only place weights live in the database: high 1.0, moderate 0.7,
low 0.4, none 0.0. `lib/evidence.ts` mirrors it; the parity test fails if they differ.

## Tables

| Table | One row is | Who can read | Who can write |
|---|---|---|---|
| `user_profiles` | a person: tier, time zone, Stripe id | themselves | themselves, **`timezone` only**; the tier only by the server |
| `features` | a members' capability (`regimen_analysis`, `key_takeaways`) | everyone | server |
| `papers` | a paper's public face: slug, title, DOI, category, teaser, tier | **everyone, members' papers included** | server |
| `paper_content` | the full read (JSON) | everyone if the paper is free; members otherwise | server |
| `paper_feature_content` | members' extras for a paper (implementation notes) | whoever's tier unlocks the feature | server |
| `protocol_steps` | one step of a protocol, **or** one everyday habit a user typed | paper steps: everyone. Habits: their owner | habits: their owner (label, order, retire) |
| `equipped_protocols` | "this person is tracking this paper" | themselves | themselves |
| `user_program_state` | a person's settings for a paper: block start date, choices | themselves | themselves |
| `step_checkins` | **a tick.** The single write path for daily progress | themselves | themselves (insert, delete) |
| `retractions` | a retraction record from Retraction Watch | server | server |

`user_profiles.id` **is** `auth.users.id` (no separate `auth_id`), which removes a join from every
access rule. Every policy writes `(select auth.uid())` so Postgres works it out once per query.

### `protocol_steps` in detail

`id, paper_id, owner_id, position, label, detail, kind, evidence_grade, source_estimate,
target_per_week, counts_step_id, condition_key, condition_value, applies_when, retired_at`

Rules the table itself enforces (a bad row cannot be saved):

- exactly one of `paper_id` / `owner_id` is set;
- a `weekly_target` has `target_per_week` and `counts_step_id` (an action step of the same paper);
- a `condition` has `condition_key` (`block_weeks_gte` or `modality_is`) and `condition_value`;
- a grade other than `none` requires a `source_estimate` (rule H7: every weight traces to the paper);
- an everyday habit is always `action`, grade `none`, no source: it **cannot** carry weight;
- at most 30 live habits per person.

Steps are **retired, never deleted**: old ticks point at them.

### Guards on `step_checkins`

A tick is refused unless the step is a live `action` step, the date is between a week ago and
tomorrow (UTC), and the step is either the user's own habit or belongs to a paper they have
equipped. A tick on a paper step moves that protocol's `last_active_on` forward.

## Additions to §6 of the brief

All additive, all nullable or defaulted, so each can be dropped without touching history.

| Addition | Why |
|---|---|
| `protocol_steps.owner_id` | Everyday habits ("drink 3 L water") live in the same table as paper steps, so there is still one write path for ticks |
| `protocol_steps.applies_when` | One paper can carry two tracks (HIIT: lean-mass and body-fat). A step only counts for users whose choices match |
| `papers.withdrawn_at`, `withdrawn_reason`, `withdraw_paper()` | What the retraction job calls. The read is hidden and the steps drop to weight 0 |
| `paper_feature_content`, `has_feature()`, `regimen_analysis()` | Premium is two-dimensional (§5): extra capability inside papers the user already has, decided on the server |
| `compute_streak()` | The streak, derived |

## Habit kinds and amounts (migration `20261113000100`)

| Kind | Meaning | Done for the day when |
|---|---|---|
| `check` | tick it off | ticked |
| `target` | reach a daily number (`daily_target`, `unit`) | amount ≥ target |
| `count` | log each one (`unit`) | amount ≥ 1 |

`step_amounts (user_id, step_id, local_date, amount)` holds the number. A trigger keeps
`step_checkins` in step with it, so **a tick still means "done for the day" and scoring never
reads an amount**. Only a user's own habit can be a target or a count; kind, unit and target
cannot be updated after creation. Tested in `06_habit_kinds`.

The app writes an amount through `set_step_amount(step_id, local_date, amount)`: one upsert
on the key `(user_id, step_id, local_date)` that sets only `amount`, with the user taken from
`auth.uid()`. It runs as the caller (`security invoker`), so row level security, the guard and
the tick trigger apply as for a direct write. It exists because a client upsert would also set
the key columns, which the `update (amount, updated_at)` grant forbids on purpose (an amount
must never move to another day or habit). Tested in `07_set_step_amount`.

## Scoring (§7), as built

`lib/score.ts` and `compute_adherence(p_user, p_date)` return the same JSON:

```
pct, earned, possible      evidence-weighted adherence
per_paper                  the same three numbers for each active paper
dormant                    papers untouched for more than 7 days (left out of everything)
satisfied                  step id -> true/false
consistency                { pct, done, total } over today's daily boxes, every box worth 1
```

How a step is satisfied:

- `action`: a tick exists for today (the user's **local** date).
- `weekly_target`: ticks on `counts_step_id` since Monday of this week ≥ `target_per_week`.
- `condition` `block_weeks_gte`: days since `block_started_at` ≥ weeks × 7.
- `condition` `modality_is`: the user's `modality` choice equals the step's.

Three decisions worth knowing:

1. **Two numbers, one currency.** Evidence-weighted adherence counts only graded steps. Consistency
   counts tick boxes, every box equal, habits included. There are no points.
2. **A session log is not a daily box.** An action that a weekly target counts ("did an interval
   session today") is a log. Skipping it on a rest day costs nothing; the weekly target carries
   the weight.
3. **Weights are summed in tenths** (10, 7, 4, 0) and percentages are rounded half-up with integer
   arithmetic on both sides, so TypeScript and Postgres cannot disagree on a rounding edge.

`npm run parity:gen` writes 40 random scenarios (fixed seed) into
`supabase/tests/database/90_parity.generated.test.sql`; the database must give the same answer as
`lib/score.ts` for all of them.

## Tests

`supabase/tests/database/`, run by `npm run db:test` (Docker) or `npm run db:test:local`.

| File | What it proves |
|---|---|
| `01_contract` | The ten gate tests from §11 of the brief |
| `02_everyday_habits` | Habits are private, cannot carry weight, are capped at 30 |
| `03_guards` | Ticks on derived, retired, un-equipped or out-of-window steps are refused; withdrawal works |
| `04_scoring` | Worked examples of the score and the streak |
| `05_premium` | Feature content and the regimen analysis are locked for free users |
| `06_habit_kinds` | Amounts are private, only on your own target or count habit; the tick follows the amount |
| `07_set_step_amount` | A second amount for the same habit and day replaces the first (no conflict); guards still apply |
| `90_parity.generated` | SQL scoring equals TypeScript scoring, 80 assertions |

`npm run db:mutation` breaks one rule at a time in a copy of the migrations and checks that the
suite **fails**. A test that has never been seen to fail proves little.
