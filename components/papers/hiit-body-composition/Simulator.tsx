"use client";

/**
 * Build an interval programme and see, setting by setting, what the pooled
 * trials reported for it and how far that can be trusted.
 *
 * It does not predict anyone's body. Every row is an estimate read from the
 * paper; a combination the paper's text does not report stays empty.
 */

import { useState } from "react";
import { ChoicePicker, GradeChip, Notice } from "@/components/protocol/primitives";
import { IntervalPlot, crossesZero, digitsOf, weakEnd, type PlotRow } from "@/components/sim/IntervalPlot";
import type { Choice, ResolvedFact } from "@/lib/content/types";
import { weightLabel } from "@/lib/evidence";
import { signed } from "@/lib/pipeline/format";
import type { SimulatorProps } from "../registry";

type OutcomeId = "ffm" | "fm" | "bf";

interface Params {
  outcomes: { id: OutcomeId; label: string; better: "up" | "down"; grade: ResolvedFact; overall: ResolvedFact }[];
  settings: { id: string; label: string; options: ({ id: string; label: string } & Partial<Record<OutcomeId, ResolvedFact | null>>)[] }[];
  leaveOneOut: ResolvedFact;
}

export default function Simulator({ params }: SimulatorProps) {
  const { outcomes, settings, leaveOneOut } = params as unknown as Params;
  const [outcomeId, setOutcomeId] = useState<OutcomeId>(outcomes[0].id);
  const [picks, setPicks] = useState<Record<string, string>>(() => Object.fromEntries(settings.map((s) => [s.id, s.options[0].id])));
  const [withoutOne, setWithoutOne] = useState(false);
  // A session you could actually do. Three of the paper's comparisons follow from it.
  const [session, setSession] = useState({ rounds: 6, work: 45, rest: 60, perWeek: 3 });
  // 60 s and 90 s are where the paper split its trials (see the option labels in editorial.json).
  const live: Record<string, string> = {
    ...picks,
    work: session.work <= 60 ? "short" : "long",
    rest: session.rest <= 90 ? "short" : "long",
    frequency: session.perWeek === 3 ? "three" : session.perWeek === 2 ? "two" : "untested",
  };
  const sessionMinutes = Math.round((session.rounds * (session.work + session.rest)) / 60);

  const outcome = outcomes.find((o) => o.id === outcomeId)!;
  const removable = outcome.id === "ffm";
  const overallFact = removable && withoutOne ? leaveOneOut : outcome.overall;
  const overall = overallFact.estimate!;
  const tier = outcome.overall.estimate!.tier;
  const weak = weakEnd(overall);

  const rows: PlotRow[] = [
    { key: "overall", label: removable && withoutOne ? "All trials, minus one" : "All trials together", estimate: overall, strong: true },
    ...settings.map((setting) => {
      const option = setting.options.find((o) => o.id === live[setting.id]);
      // The paper only pooled trials at two and at three sessions a week. Anything else stays empty.
      if (!option) return { key: setting.id, label: `${setting.label}: ${session.perWeek}`, estimate: null };
      return { key: setting.id, label: `${setting.label}: ${option.label.toLowerCase()}`, estimate: option[outcome.id]?.estimate ?? null };
    }),
  ];

  const choices: Choice[] = settings.filter((s) => !["work", "rest", "frequency"].includes(s.id)).map((s) => ({
    key: s.id, label: s.label, help: null, kind: "single", default: null,
    options: s.options.map((o) => ({ value: o.id, label: o.label })),
  }));

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <fieldset>
        <legend className="font-medium">What do you want to look at?</legend>
        <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-bg">
          {outcomes.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
              <input
                type="radio" name="hiit-outcome" className="h-5 w-5 accent-[var(--ink)]"
                checked={o.id === outcomeId} onChange={() => setOutcomeId(o.id)}
              />
              <span className="min-w-0 flex-1 font-medium leading-snug">{o.label}</span>
              <GradeChip grade={o.overall.estimate!.tier} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-line bg-bg p-3.5">
        <p className="text-sm leading-snug text-muted">
          Average change in {outcome.label.toLowerCase()} against no exercise. Each row is its own group of trials.
        </p>
        <div className="mt-3">
          <IntervalPlot
            rows={rows}
            lowLabel={outcome.better === "down" ? "lost more" : "lost"}
            highLabel={outcome.better === "down" ? "gained" : "gained more"}
          />
        </div>
      </div>

      <Notice tone={crossesZero(overall) ? "warn" : "plain"}>
        {crossesZero(overall) ? (
          <><strong>The range now includes zero.</strong> With that one trial removed, the pooled result can no longer tell a gain from no change.</>
        ) : (
          <>
            <strong>The weak end of the overall range is {weak !== null && weak > 0 ? "+" : ""}{weak !== null ? signed(weak, digitsOf(overall)) : ""} {overall.unit}.</strong>{" "}
            That is the smallest average change these trials support. In your Life Game, requirements resting on this outcome count {weightLabel(tier)}.
          </>
        )}
      </Notice>

      {removable && (
        <button
          type="button" role="switch" aria-checked={withoutOne} onClick={() => setWithoutOne((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3.5 py-3 text-left"
        >
          <span>
            <span className="block font-medium leading-snug">Remove the single most influential trial</span>
            <span className="block text-sm leading-snug text-muted">The authors re-ran the pooling with each trial left out in turn.</span>
          </span>
          <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${withoutOne ? "bg-ink" : "bg-line"}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-[left] ${withoutOne ? "left-6" : "left-1"}`} />
          </span>
        </button>
      )}

      <div className="rounded-xl border border-line bg-bg p-3.5">
        <p className="font-medium">Build a session you could really do</p>
        <p className="text-sm leading-snug text-muted">Move a slider and watch the rows above change with it.</p>
        <div className="mt-3 space-y-3">
          {([
            ["rounds", "Rounds", 3, 12, 1, `${session.rounds}`],
            ["work", "Hard effort each round", 10, 240, 5, `${session.work} s`],
            ["rest", "Rest between rounds", 10, 240, 5, `${session.rest} s`],
            ["perWeek", "Sessions a week", 1, 5, 1, `${session.perWeek}`],
          ] as const).map(([key, label, min, max, step, shown]) => (
            <label key={key} className="block">
              <span className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium">{label}</span><span className="num font-medium">{shown}</span></span>
              <input type="range" min={min} max={max} step={step} value={session[key]} className="mt-1 w-full"
                onChange={(e) => setSession((v) => ({ ...v, [key]: Number(e.target.value) }))} />
            </label>
          ))}
        </div>
        <p className="num mt-3 rounded-lg bg-surface px-3 py-2.5 leading-snug" aria-live="polite">
          <strong>{sessionMinutes} minutes a session, {sessionMinutes * session.perWeek} minutes a week</strong>, before warm-up.
          <span className="block text-sm text-muted">That is your own arithmetic, not a finding. The rows above are the findings.</span>
        </p>
      </div>

      <div className="rounded-xl border border-line bg-bg p-3.5">
        <p className="mb-3 font-medium">The rest of the programme</p>
        <ChoicePicker choices={choices} values={picks} onChange={(key, value) => value && setPicks((p) => ({ ...p, [key]: value }))} />
      </div>

      <p className="text-sm leading-snug text-muted">
        Rows cannot be added together: they come from comparing groups of trials, not from testing one setting directly against another.
      </p>
    </div>
  );
}
