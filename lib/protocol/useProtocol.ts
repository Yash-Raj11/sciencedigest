"use client";

/**
 * The shared brain behind every per-paper widget.
 *
 * A widget in components/papers/<slug>/ decides how a protocol LOOKS. It gets
 * everything it needs from this hook and may not reach past it: no database
 * calls, no store internals, no percentage sums of its own. ESLint enforces
 * that (see eslint.config.mjs), because two hundred papers each doing their own
 * sync is two hundred slightly different bugs.
 */

import { useMemo } from "react";
import { choicesFor, defaultChoices, getPaper, stepsFor } from "../content";
import type { Choice, ContentStep, PaperMeta } from "../content/types";
import { feederIds, stepApplies, type ProgramState } from "../score";
import { isDemo } from "../supabase/client";
import { useGame } from "../store/game";
import { useStore } from "../store";
import { diffDays } from "../dates";

export interface ProtocolRow {
  step: ContentStep;
  /** log: a session log that feeds a weekly target. box: a daily tick. target / condition: derived, no checkbox. */
  role: "box" | "log" | "target" | "condition";
  satisfied: boolean;
  tickedToday: boolean;
  /** For a target: sessions logged so far this week. */
  weekCount: number | null;
  /** For a block condition: days since the block started, or null if not started. */
  blockDay: number | null;
}

export interface Protocol {
  paper: PaperMeta;
  hydrated: boolean;
  equipped: boolean;
  dormant: boolean;
  /** Premium paper and the viewer is not premium: the protocol cannot be added. */
  locked: boolean;
  /** Percentage of protocol completed, 0-100, with its parts. Never compute your own. */
  progress: { pct: number; done: number; total: number };
  weighted: { pct: number; earned: number; possible: number } | null;
  rows: ProtocolRow[];
  choices: Choice[];
  state: ProgramState;
  conflict: boolean;
  today: string;
  equip: () => void;
  unequip: () => void;
  toggle: (stepId: string) => void;
  setChoice: (key: string, value: string | null) => void;
  startBlock: (date: string | null) => void;
}

const EMPTY_STATE: ProgramState = { blockStartedAt: null, choices: {} };

export function useProtocol(slug: string): Protocol {
  const paper = getPaper(slug);
  if (!paper) throw new Error(`useProtocol: no paper with slug "${slug}"`);

  const game = useGame();
  const hydrated = useStore((s) => s.hydrated);
  const tier = useStore((s) => (isDemo ? s.demoTier : s.session.tier));
  const { equip, unequip, toggleTick, setChoice, startBlock } = useStore.getState();

  return useMemo(() => {
    const view = game.protocols.find((p) => p.paper.id === paper.id);
    const equipped = view !== undefined;
    const state = view?.state ?? { ...EMPTY_STATE, choices: defaultChoices(slug) };
    const steps = stepsFor(paper.id);
    const feeders = feederIds(steps);

    const rows: ProtocolRow[] = steps.filter((s) => stepApplies(s, state.choices)).map((step) => ({
      step,
      role: step.kind === "weekly_target" ? "target" : step.kind === "condition" ? "condition" : feeders.has(step.id) ? "log" : "box",
      satisfied: game.result.satisfied[step.id] ?? false,
      tickedToday: game.ticks.has(`${step.id}|${game.today}`),
      weekCount: step.kind === "weekly_target" ? (view?.progress.weekCounts[step.id] ?? 0) : null,
      blockDay: step.conditionKey === "block_weeks_gte" && state.blockStartedAt ? diffDays(game.today, state.blockStartedAt) : null,
    }));

    return {
      paper,
      hydrated,
      equipped,
      dormant: view?.dormant ?? false,
      locked: paper.accessTier === "premium" && tier !== "premium",
      progress: view ? { pct: view.progress.pct, done: view.progress.done, total: view.progress.total } : { pct: 0, done: 0, total: rows.filter((r) => r.role !== "log").length },
      weighted: view?.weighted ?? null,
      rows,
      choices: choicesFor(slug),
      state,
      conflict: game.conflicts.some((c) => c.paperId === paper.id),
      today: game.today,
      equip: () => equip(paper.id, defaultChoices(slug)),
      unequip: () => unequip(paper.id),
      toggle: (stepId: string) => toggleTick(stepId, game.today),
      setChoice: (key: string, value: string | null) => setChoice(paper.id, key, value),
      startBlock: (date: string | null) => startBlock(paper.id, date),
    };
  }, [game, paper, slug, hydrated, tier, equip, unequip, toggleTick, setChoice, startBlock]);
}
