/**
 * Protocol conflicts: requirements that cannot all be true at once.
 *
 * Today there is one kind. Two steps of the same paper that both apply to the
 * user and each demand a different training modality (one says cycle, one says
 * run) cannot both be satisfied, because a paper holds a single modality
 * choice. The score will never reach 100% for that paper until one track is
 * switched off, so the dashboard has to say so.
 *
 * A check over the equipped set, recomputed on every render. Never stored.
 * Pure: no imports from supabase, react or next.
 */

import { stepApplies, type ProgramState, type Step } from "./score";

export interface Conflict {
  paperId: string;
  kind: "modality";
  /** The competing demands, in step order. */
  demands: { stepId: string; value: string }[];
}

export function findConflicts(
  activePaperIds: Iterable<string>,
  steps: Step[],
  programState: Record<string, ProgramState>,
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const paperId of activePaperIds) {
    const choices = programState[paperId]?.choices ?? {};
    const demands: { stepId: string; value: string }[] = [];

    for (const step of steps) {
      if (step.paperId !== paperId) continue;
      if (step.kind !== "condition" || step.conditionKey !== "modality_is") continue;
      if (!stepApplies(step, choices)) continue;
      const value = step.conditionValue?.modality;
      if (typeof value === "string") demands.push({ stepId: step.id, value });
    }

    if (new Set(demands.map((d) => d.value)).size > 1) {
      conflicts.push({ paperId, kind: "modality", demands });
    }
  }

  return conflicts;
}
