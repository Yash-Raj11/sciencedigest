/**
 * "Percentage of protocol completed" for one paper, as shown on every widget.
 *
 * This is deliberately NOT the evidence-weighted score. It answers the plain
 * question "how much of this protocol is in place right now?", one point per
 * requirement:
 *
 *   daily box        ticked today
 *   weekly target    met so far this week
 *   condition        true for the user's programme state
 *
 * A session log that feeds a weekly target is not a requirement of its own:
 * the target is. Pure: no imports from supabase, react or next.
 */

import { pct } from "./evidence";
import { countThisWeek, feederIds, stepApplies, type ProgramState, type Step } from "./score";

export interface ProtocolProgress {
  pct: number;
  done: number;
  total: number;
  /** Sessions logged this ISO week, per weekly-target step id. */
  weekCounts: Record<string, number>;
}

const EMPTY_STATE: ProgramState = { blockStartedAt: null, choices: {} };

export function protocolProgress(
  paperId: string,
  steps: Step[],
  satisfied: Record<string, boolean>,
  ticks: Set<string>,
  today: string,
  state: ProgramState = EMPTY_STATE,
): ProtocolProgress {
  const feeders = feederIds(steps);
  let done = 0;
  let total = 0;
  const weekCounts: Record<string, number> = {};

  for (const step of steps) {
    if (step.paperId !== paperId) continue;
    if (!stepApplies(step, state.choices)) continue;
    if (step.kind === "weekly_target" && step.countsStepId) {
      weekCounts[step.id] = countThisWeek(ticks, step.countsStepId, today);
    }
    if (step.kind === "action" && feeders.has(step.id)) continue;
    total += 1;
    if (satisfied[step.id]) done += 1;
  }

  return { pct: pct(done, total), done, total, weekCounts };
}
