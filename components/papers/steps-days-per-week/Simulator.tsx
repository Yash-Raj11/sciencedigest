"use client";

/**
 * Mark the days you reach the step count, see which of the study's three
 * groups that puts you in, then watch what happens to the gap between groups
 * as the authors account for more of the ways those groups differed.
 *
 * Every number is read from the paper. Nothing here estimates your own risk.
 */

import { useState } from "react";
import { Notice } from "@/components/protocol/primitives";
import { IntervalPlot } from "@/components/sim/IntervalPlot";
import type { ResolvedFact } from "@/lib/content/types";
import type { SimulatorProps } from "../registry";

interface Num { n: number; ref: string }
type GroupId = "g0" | "g1" | "g2";

interface Params {
  threshold: Num;
  followupYears: Num;
  groups: { id: GroupId; label: string; from: Num; to: Num; meanAge: Num }[];
  outcomes: {
    id: string; label: string;
    crude: Record<GroupId, ResolvedFact>;
    models: { id: string; label: string; g1: ResolvedFact; g2: ResolvedFact }[];
  }[];
  modelNote: ResolvedFact;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Simulator({ params }: SimulatorProps) {
  const p = params as unknown as Params;
  const [days, setDays] = useState<boolean[]>([false, false, true, false, false, true, false]);
  const [outcomeId, setOutcomeId] = useState(p.outcomes[0].id);
  const [level, setLevel] = useState(0);
  const [usual, setUsual] = useState("");
  const [per10, setPer10] = useState("");
  const gapSteps = Math.max(0, p.threshold.n - (Number(usual) || 0));
  const extraMinutes = Number(per10) > 0 && usual !== "" ? Math.ceil((gapSteps / Number(per10)) * 10) : null;

  const count = days.filter(Boolean).length;
  const mine = p.groups.find((g) => count >= g.from.n && count <= g.to.n) ?? p.groups[0];
  const outcome = p.outcomes.find((o) => o.id === outcomeId)!;
  const model = outcome.models[level];
  const steps = p.threshold.n.toLocaleString("en");
  const widest = Math.max(...p.groups.map((g) => outcome.crude[g.id].estimate!.point));

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <fieldset>
        <legend className="font-semibold">Which days this week did you reach {steps} steps?</legend>
        <div className="mt-2 flex gap-1.5">
          {DAYS.map((day, i) => (
            <button
              key={day} type="button" aria-pressed={days[i]}
              onClick={() => setDays((d) => d.map((v, j) => (j === i ? !v : v)))}
              className={`h-12 min-w-0 flex-1 rounded-lg border-2 text-sm font-bold ${days[i] ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg text-muted"}`}
            >
              {day}
            </button>
          ))}
        </div>
        <p className="mt-2 leading-snug" aria-live="polite">
          <span className="num font-bold">{count} {count === 1 ? "day" : "days"}.</span> In this study that is the <strong>&ldquo;{mine.label.toLowerCase()}&rdquo;</strong> group.
        </p>
      </fieldset>

      <div className="flex gap-2" role="group" aria-label="Outcome">
        {p.outcomes.map((o) => (
          <button
            key={o.id} type="button" aria-pressed={o.id === outcomeId} onClick={() => setOutcomeId(o.id)}
            className={`min-w-0 flex-1 rounded-full border px-3 py-2 text-sm font-semibold ${o.id === outcomeId ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-bg p-3.5">
        <p className="font-semibold">First, the raw counts</p>
        <p className="text-sm leading-snug text-muted">Share of each group who died within {p.followupYears.n} years, before any adjustment.</p>
        <ul className="mt-3 space-y-2.5">
          {p.groups.map((g) => {
            const e = outcome.crude[g.id].estimate!;
            const isMine = g.id === mine.id;
            return (
              <li key={g.id}>
                <p className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={isMine ? "font-bold" : "font-medium"}>{g.label}{isMine ? " (you, this week)" : ""}</span>
                  <span className="num font-semibold">{e.point}%</span>
                </p>
                <div className="mt-1 h-3 rounded-full bg-line/60">
                  <div className={`h-3 rounded-full ${isMine ? "bg-accent" : "bg-muted/70"}`} style={{ width: `${(e.point / widest) * 100}%`, transition: "width 240ms" }} />
                </div>
                <p className="num mt-0.5 text-xs text-muted">Average age {g.meanAge.n}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <Notice tone="warn">
        <strong>Look at the ages.</strong> The group that never reached {steps} steps was {(p.groups[0].meanAge.n - p.groups[2].meanAge.n).toFixed(1)} years older on average than the most active group. Older people die sooner whatever they do, so the raw gap is not the effect of walking.
      </Notice>

      <div className="rounded-xl border border-line bg-bg p-3.5">
        <label htmlFor="steps-model" className="font-semibold">Now account for the differences</label>
        <p className="text-sm leading-snug text-muted">Slide right to adjust for more. The gap is measured against the group with no {steps}-step days.</p>
        <input
          id="steps-model" type="range" min={0} max={outcome.models.length - 1} step={1} value={level}
          onChange={(e) => setLevel(Number(e.target.value))} className="mt-3 w-full"
          aria-valuetext={model.label}
        />
        <p className="num text-sm font-semibold" aria-live="polite">Adjusted for: {model.label.toLowerCase()}</p>
        <div className="mt-3">
          <IntervalPlot
            rows={[
              { key: "g1", label: p.groups[1].label, estimate: model.g1.estimate ?? null, strong: mine.id === "g1" },
              { key: "g2", label: p.groups[2].label, estimate: model.g2.estimate ?? null, strong: mine.id === "g2" },
            ]}
            lowLabel="lower risk"
            highLabel="higher risk"
          />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-bg p-3.5">
        <p className="font-semibold">Would it fit your week?</p>
        <p className="text-sm leading-snug text-muted">Two numbers from your own phone or watch. Nothing here comes from the study.</p>
        <div className="mt-3 flex gap-2">
          <label className="block min-w-0 flex-1">
            <span className="block text-sm font-medium leading-snug">Steps on a normal day</span>
            <input type="number" inputMode="numeric" min={0} max={50000} value={usual} onChange={(e) => setUsual(e.target.value)} placeholder="4500"
              className="num mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-muted" />
          </label>
          <label className="block min-w-0 flex-1">
            <span className="block text-sm font-medium leading-snug">Steps in a 10-minute walk</span>
            <input type="number" inputMode="numeric" min={1} max={5000} value={per10} onChange={(e) => setPer10(e.target.value)} placeholder="count once"
              className="num mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-muted" />
          </label>
        </div>
        <p className="num mt-3 rounded-lg bg-surface px-3 py-2.5 leading-snug" aria-live="polite">
          {extraMinutes === null ? (
            <span className="text-muted">Fill in both to see the walking time a {steps}-step day would add.</span>
          ) : gapSteps === 0 ? (
            <strong>Your normal day already reaches {steps}.</strong>
          ) : (
            <>
              <strong>About {extraMinutes} more minutes of walking on each {steps}-step day.</strong>{" "}
              For the {count} {count === 1 ? "day" : "days"} you marked, that is {extraMinutes * count} minutes this week.
            </>
          )}
        </p>
      </div>

      <p className="text-sm leading-snug text-muted">
        Risk differences are in percentage points over {p.followupYears.n} years. This was an observational study: it shows what went together in these people, and cannot show that the walking caused the difference.
      </p>
    </div>
  );
}
