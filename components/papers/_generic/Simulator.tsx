"use client";

/**
 * The simulator a new paper gets before anyone has built it a custom one.
 * Simulator kind: "estimate-explorer".
 *
 * It lays the paper's own estimates side by side on one scale and lets the
 * reader switch each on and off, so "which result is bigger, and which is
 * surer" can be seen instead of read. Every row is a fact from the paper.
 */

import { useState } from "react";
import { GradeChip } from "@/components/protocol/primitives";
import { IntervalPlot } from "@/components/sim/IntervalPlot";
import type { ResolvedFact } from "@/lib/content/types";
import type { SimulatorProps } from "../registry";

interface Params {
  lowLabel?: string;
  highLabel?: string;
  rows: { label: string; fact: ResolvedFact }[];
}

export default function Simulator({ params }: SimulatorProps) {
  const p = params as unknown as Params;
  const rows = (p.rows ?? []).filter((row) => row.fact?.estimate);
  const [off, setOff] = useState<Set<string>>(new Set());
  const shown = rows.filter((row) => !off.has(row.fact.id));

  if (rows.length === 0) return <p className="text-sm text-muted">This paper has no estimates to compare.</p>;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <fieldset>
        <legend className="font-medium">Pick the results to compare</legend>
        <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-bg">
          {rows.map((row) => (
            <label key={row.fact.id} className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
              <input
                type="checkbox" className="h-5 w-5 accent-[var(--ink)]" checked={!off.has(row.fact.id)}
                onChange={() => setOff((current) => {
                  const next = new Set(current);
                  if (next.has(row.fact.id)) next.delete(row.fact.id); else next.add(row.fact.id);
                  return next;
                })}
              />
              <span className="min-w-0 flex-1 font-medium leading-snug">{row.label}</span>
              <GradeChip grade={row.fact.estimate!.tier} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-line bg-bg p-3.5">
        {shown.length > 0 ? (
          <IntervalPlot
            rows={shown.map((row) => ({ key: row.fact.id, label: row.label, estimate: row.fact.estimate! }))}
            lowLabel={p.lowLabel ?? "lower"} highLabel={p.highLabel ?? "higher"}
          />
        ) : (
          <p className="text-sm text-muted">Tick a result above to draw it.</p>
        )}
      </div>

      <p className="text-sm leading-snug text-muted">
        The dot is the average the study found; the bar is the range the true value plausibly sits in. A grey bar reaches zero: no clear change.
      </p>
    </div>
  );
}
