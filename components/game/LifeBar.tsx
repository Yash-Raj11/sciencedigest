"use client";

import { useState } from "react";
import { GRADE_NAME, weightLabel } from "@/lib/evidence";
import type { Game } from "@/lib/store/game";

/**
 * The weighted bar. Each block is one requirement you have taken on, and its
 * WIDTH is its evidence weight: a high-certainty block is two and a half
 * times as wide as a low-certainty one. Filled means done. The bar is the
 * scoring rule, drawn.
 */
export function LifeBar({ segments }: { segments: Game["segments"] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = segments.find((s) => s.id === activeId) ?? null;

  if (segments.length === 0) {
    return (
      <div>
        <div aria-hidden className="h-9 rounded-md border-2 border-dashed border-line" />
        <p className="mt-2 text-sm leading-snug text-muted">
          Nothing with evidence weight is being tracked yet. Add a protocol from a paper and its requirements appear here as blocks.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-9 gap-[3px]" role="group" aria-label="Requirements, sized by evidence weight">
        {segments.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveId((id) => (id === s.id ? null : s.id))}
            aria-pressed={s.id === activeId}
            aria-label={`${s.label}. ${GRADE_NAME[s.grade]}, counts ${weightLabel(s.grade)}. ${s.satisfied ? "Done" : "Not done"}.`}
            style={{ flexGrow: s.tenths, flexBasis: 0 }}
            className={`relative min-w-2 overflow-hidden rounded-[5px] border-2 ${s.satisfied ? "border-ink" : "border-muted/50"} ${s.id === activeId ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
          >
            {s.satisfied && <span key="fill" className="fill-in absolute inset-0 bg-ink" />}
          </button>
        ))}
      </div>
      <p className="num mt-2 min-h-[2.5rem] text-sm leading-snug text-muted" aria-live="polite">
        {active
          ? <><strong className="text-ink">{active.label}</strong> ({active.paperTitle}). {GRADE_NAME[active.grade]}, so it counts {weightLabel(active.grade)}. {active.satisfied ? "Done." : "Not done yet."}</>
          : "Wider blocks have stronger evidence behind them. Tap a block to see what it is."}
      </p>
    </div>
  );
}
