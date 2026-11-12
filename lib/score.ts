/**
 * The scoring rule. Pure: no imports from supabase, react or next.
 *
 * Mirrored in SQL as public.compute_adherence() and public.compute_streak()
 * (supabase/migrations/20261112000200_scoring.sql). The generated parity test
 * asserts both return the same JSON for the same data, so a change here
 * without the matching SQL change fails `npm run db:test`.
 *
 * Two numbers come out, and they answer different questions:
 *
 *   evidence-weighted adherence (pct, earned, possible)
 *     Of everything you committed to, weighted by how well it is supported,
 *     how much did you follow? An everyday habit weighs 0 here.
 *
 *   consistency
 *     Of today's daily boxes, how many did you tick? Every box counts 1,
 *     evidence or not.
 *
 * Neither number says anything about a body. A tick records an action.
 */

import { addDays, diffDays, isoWeekStart } from "./dates";
import { WEIGHT_TENTHS, pct, type EvidenceGrade } from "./evidence";

export const DORMANCY_DAYS = 7;

export type StepKind = "action" | "weekly_target" | "condition";
export type ConditionKey = "block_weeks_gte" | "modality_is";

export interface Step {
  id: string;
  /** null for an everyday habit the user created themselves. */
  paperId: string | null;
  kind: StepKind;
  grade: EvidenceGrade;
  targetPerWeek?: number | null;
  countsStepId?: string | null;
  conditionKey?: ConditionKey | null;
  conditionValue?: Record<string, unknown> | null;
  /** The step only counts when the user's choices contain every pair here. */
  appliesWhen?: Record<string, string> | null;
}

export interface ProgramState {
  blockStartedAt: string | null;
  choices: Record<string, string>;
}

export interface ScoreInput {
  /** The user's LOCAL date, never UTC. */
  today: string;
  /** Currently equipped papers. Un-equipped and withdrawn papers are left out. */
  equipped: { paperId: string; lastActiveOn: string | null }[];
  /** Every non-retired step of the equipped papers, plus the user's habits. */
  steps: Step[];
  checkins: { stepId: string; localDate: string }[];
  programState: Record<string, ProgramState>;
  dormancyDays?: number;
}

export interface Tally {
  pct: number;
  earned: number;
  possible: number;
}

export interface ScoreResult extends Tally {
  perPaper: Record<string, Tally>;
  dormant: string[];
  satisfied: Record<string, boolean>;
  consistency: { pct: number; done: number; total: number };
}

const EMPTY_STATE: ProgramState = { blockStartedAt: null, choices: {} };

export function stepApplies(step: Step, choices: Record<string, string>): boolean {
  if (!step.appliesWhen) return true;
  return Object.entries(step.appliesWhen).every(([key, value]) => choices[key] === value);
}

/** Ids of action steps that a weekly target counts. They are logs, not daily boxes. */
export function feederIds(steps: Step[]): Set<string> {
  const ids = new Set<string>();
  for (const step of steps) {
    if (step.kind === "weekly_target" && step.countsStepId) ids.add(step.countsStepId);
  }
  return ids;
}

export function countThisWeek(ticks: Set<string>, stepId: string, today: string): number {
  let count = 0;
  for (let day = isoWeekStart(today); day <= today; day = addDays(day, 1)) {
    if (ticks.has(`${stepId}|${day}`)) count += 1;
  }
  return count;
}

export function tickSet(checkins: { stepId: string; localDate: string }[]): Set<string> {
  return new Set(checkins.map((c) => `${c.stepId}|${c.localDate}`));
}

export function isSatisfied(step: Step, today: string, ticks: Set<string>, state: ProgramState): boolean {
  switch (step.kind) {
    case "action":
      return ticks.has(`${step.id}|${today}`);
    case "weekly_target":
      if (!step.countsStepId || !step.targetPerWeek) return false;
      return countThisWeek(ticks, step.countsStepId, today) >= step.targetPerWeek;
    case "condition":
      if (step.conditionKey === "block_weeks_gte") {
        const weeks = Number(step.conditionValue?.weeks);
        if (!state.blockStartedAt || !Number.isFinite(weeks)) return false;
        return diffDays(today, state.blockStartedAt) >= weeks * 7;
      }
      if (step.conditionKey === "modality_is") {
        const wanted = step.conditionValue?.modality;
        return typeof wanted === "string" && state.choices.modality === wanted;
      }
      return false;
  }
}

function tally(earnedTenths: number, possibleTenths: number): Tally {
  return {
    pct: pct(earnedTenths, possibleTenths),
    earned: earnedTenths / 10,
    possible: possibleTenths / 10,
  };
}

export function score(input: ScoreInput): ScoreResult {
  const dormancyDays = input.dormancyDays ?? DORMANCY_DAYS;
  const ticks = tickSet(input.checkins);
  const feeders = feederIds(input.steps);

  const active = new Set<string>();
  const dormant: string[] = [];
  for (const { paperId, lastActiveOn } of input.equipped) {
    const idle = lastActiveOn ? diffDays(input.today, lastActiveOn) : 0;
    if (idle > dormancyDays) dormant.push(paperId);
    else active.add(paperId);
  }
  dormant.sort();

  const perPaperTenths = new Map<string, { earned: number; possible: number }>();
  for (const paperId of active) perPaperTenths.set(paperId, { earned: 0, possible: 0 });

  const satisfied: Record<string, boolean> = {};
  let earned = 0;
  let possible = 0;
  let boxesDone = 0;
  let boxesTotal = 0;

  for (const step of input.steps) {
    const state = step.paperId ? (input.programState[step.paperId] ?? EMPTY_STATE) : EMPTY_STATE;

    if (step.paperId !== null) {
      if (!active.has(step.paperId)) continue;
      if (!stepApplies(step, state.choices)) continue;
    }

    const ok = isSatisfied(step, input.today, ticks, state);
    const tenths = WEIGHT_TENTHS[step.grade];
    satisfied[step.id] = ok;

    possible += tenths;
    if (ok) earned += tenths;

    if (step.paperId !== null) {
      const bucket = perPaperTenths.get(step.paperId)!;
      bucket.possible += tenths;
      if (ok) bucket.earned += tenths;
    }

    if (step.kind === "action" && !feeders.has(step.id)) {
      boxesTotal += 1;
      if (ok) boxesDone += 1;
    }
  }

  const perPaper: Record<string, Tally> = {};
  for (const [paperId, t] of perPaperTenths) perPaper[paperId] = tally(t.earned, t.possible);

  return {
    ...tally(earned, possible),
    perPaper,
    dormant,
    satisfied,
    consistency: { pct: pct(boxesDone, boxesTotal), done: boxesDone, total: boxesTotal },
  };
}

/**
 * Consecutive days with at least one tick. If today has no tick yet, the
 * streak is counted up to yesterday so it does not read zero every morning.
 */
export function streak(tickDates: Iterable<string>, today: string): number {
  const days = new Set(tickDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
