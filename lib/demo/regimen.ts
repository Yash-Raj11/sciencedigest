/**
 * DEMO MODE ONLY. A stand-in for the database function public.regimen_analysis()
 * so the premium screens can be looked at before Supabase is connected.
 *
 * With Supabase configured this file is never loaded: the analysis is computed
 * in the database behind a tier check, and nothing premium reaches a free
 * user's device.
 */

import { stepsFor } from "../content";
import { addDays, diffDays, isoWeekStart } from "../dates";
import { stepApplies } from "../score";
import { store } from "../store";
import type { Regimen } from "../content/gated";

export function demoRegimen(paperId: string, today: string): Regimen {
  const { data } = store.getState();
  const state = data.program[paperId] ?? { blockStartedAt: null, choices: {} };
  const targets = stepsFor(paperId).filter((s) => s.kind === "weekly_target" && stepApplies(s, state.choices));
  const counted = new Set(targets.map((t) => t.countsStepId));
  const target = targets.length > 0 ? Math.max(...targets.map((t) => t.targetPerWeek ?? 0)) : null;
  const monday = isoWeekStart(today);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = addDays(monday, -7 * (7 - i));
    let sessions = 0;
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(weekStart, d);
      if (date > today) break;
      sessions += (data.ticks[date] ?? []).filter((id) => counted.has(id)).length;
    }
    return { week_start: weekStart, sessions, target, met: target !== null && sessions >= target };
  });

  return {
    weeks,
    weeks_met: weeks.filter((w) => w.met).length,
    block: {
      started_on: state.blockStartedAt,
      days_elapsed: state.blockStartedAt ? diffDays(today, state.blockStartedAt) : null,
    },
  };
}
