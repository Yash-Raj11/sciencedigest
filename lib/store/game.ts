"use client";

/**
 * The dashboard's numbers, derived on every render from what the user did and
 * what the papers say. Nothing here is saved: change a weight or a grade and
 * every past day recalculates.
 */

import { useMemo, useSyncExternalStore } from "react";
import { findConflicts, type Conflict } from "../conflicts";
import { STEPS } from "../content/generated";
import { getPaperById } from "../content";
import type { ContentStep, PaperMeta } from "../content/types";
import { addDays, isoWeekStart, localToday } from "../dates";
import { protocolProgress, type ProtocolProgress } from "../progress";
import { score, streak, tickSet, type ProgramState, type ScoreResult, type Step } from "../score";
import { checkinsOf, type Habit } from "./reduce";
import { useStore } from "./index";

/**
 * The device's local date, kept current across midnight.
 *
 * While the page is being pre-built on the server there is no "today", so a
 * fixed placeholder is used until the browser takes over. Screens show nothing
 * date-dependent before the store reports `hydrated`.
 */
const SERVER_DAY = "2000-01-03";

function subscribeToClock(onChange: () => void): () => void {
  const timer = setInterval(onChange, 30_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function useToday(): string {
  return useSyncExternalStore(subscribeToClock, () => localToday(), () => SERVER_DAY);
}

export interface ProtocolView {
  paper: PaperMeta;
  dormant: boolean;
  steps: ContentStep[];
  state: ProgramState;
  progress: ProtocolProgress;
  /** The evidence-weighted tally for this paper alone. */
  weighted: { pct: number; earned: number; possible: number } | null;
}

export interface Game {
  today: string;
  result: ScoreResult;
  streak: number;
  /** Mon..Sun of the current week: did the user tick anything that day? */
  week: { date: string; active: boolean; isToday: boolean; future: boolean }[];
  ticks: Set<string>;
  habits: Habit[];
  /** local date -> habit id -> amount, for target and count habits. */
  amounts: Record<string, Record<string, number>>;
  protocols: ProtocolView[];
  conflicts: Conflict[];
  /** Every step in play today that carries weight, for the weighted bar. */
  segments: { id: string; label: string; paperTitle: string; tenths: number; satisfied: boolean; grade: Step["grade"] }[];
}

const EMPTY_STATE: ProgramState = { blockStartedAt: null, choices: {} };
const LIVE_STEPS = STEPS.filter((s) => !s.retired);

export function useGame(): Game {
  const data = useStore((s) => s.data);
  const today = useToday();

  return useMemo(() => {
    const checkins = checkinsOf(data.ticks);
    const ticks = tickSet(checkins);
    const equippedIds = new Set(data.equipped.map((e) => e.paperId));
    const paperSteps = LIVE_STEPS.filter((s) => s.paperId !== null && equippedIds.has(s.paperId));

    // Last activity = the later of the (re-)equip date and the newest tick on any of the paper's steps.
    const lastTick = new Map<string, string>();
    const owner = new Map(paperSteps.map((s) => [s.id, s.paperId!]));
    for (const { stepId, localDate } of checkins) {
      const paperId = owner.get(stepId);
      if (paperId && localDate > (lastTick.get(paperId) ?? "")) lastTick.set(paperId, localDate);
    }
    const equipped = data.equipped.map((e) => {
      const tick = lastTick.get(e.paperId);
      return { paperId: e.paperId, lastActiveOn: tick && tick > e.since ? tick : e.since };
    });

    const habits = data.habits.filter((h) => !h.retired).sort((a, b) => a.position - b.position);
    const habitSteps: Step[] = habits.map((h) => ({ id: h.id, paperId: null, kind: "action", grade: "none" }));
    const steps: Step[] = [...paperSteps, ...habitSteps];

    const result = score({ today, equipped, steps, checkins, programState: data.program });
    const dormant = new Set(result.dormant);

    const protocols: ProtocolView[] = [];
    for (const { paperId } of data.equipped) {
      const paper = getPaperById(paperId);
      if (!paper) continue;
      const state = data.program[paperId] ?? EMPTY_STATE;
      const own = paperSteps.filter((s) => s.paperId === paperId).sort((a, b) => a.position - b.position);
      protocols.push({
        paper,
        dormant: dormant.has(paperId),
        steps: own,
        state,
        progress: protocolProgress(paperId, own, result.satisfied, ticks, today, state),
        weighted: result.perPaper[paperId] ?? null,
      });
    }

    const active = equipped.filter((e) => !dormant.has(e.paperId)).map((e) => e.paperId);
    const segments: Game["segments"] = [];
    for (const step of paperSteps) {
      if (!(step.id in result.satisfied) || step.grade === "none") continue;
      segments.push({
        id: step.id,
        label: step.label,
        paperTitle: getPaperById(step.paperId!)?.category ?? "",
        tenths: { high: 10, moderate: 7, low: 4, none: 0 }[step.grade],
        satisfied: result.satisfied[step.id],
        grade: step.grade,
      });
    }

    const monday = isoWeekStart(today);
    const tickDays = new Set(Object.keys(data.ticks));
    const week = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      return { date, active: tickDays.has(date), isToday: date === today, future: date > today };
    });

    return {
      today,
      result,
      streak: streak(tickDays, today),
      week,
      ticks,
      habits,
      amounts: data.amounts ?? {},
      protocols,
      conflicts: findConflicts(active, paperSteps, data.program),
      segments,
    };
  }, [data, today]);
}
