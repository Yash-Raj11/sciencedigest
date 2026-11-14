"use client";

import { useState } from "react";
import { GRADE_WORDS } from "@/lib/evidence-words";
import type { Game } from "@/lib/store/game";

/**
 * The bar of requirements. Each block is one requirement you have taken on, every block the
 * same width (owner, 2026-11-15: no bar is sized by evidence grade). Filled means done. How
 * sure each one's evidence is shows in words when you tap it; how grades count towards the
 * number is in the "How scoring works" explainer.
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
      <div className="flex h-9 gap-[3px]" role="group" aria-label="Requirements you have taken on">
        {segments.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveId((id) => (id === s.id ? null : s.id))}
            aria-pressed={s.id === activeId}
            aria-label={`${s.label}. ${GRADE_WORDS[s.grade]}. ${s.satisfied ? "Done" : "Not done"}.`}
            style={{ flexGrow: 1, flexBasis: 0 }}
            className={`relative min-w-2 overflow-hidden rounded-[5px] border-2 ${s.satisfied ? "border-signal-evidence-fill" : "border-muted/50"} ${s.id === activeId ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
          >
            {s.satisfied && <span key="fill" className="fill-in absolute inset-0 bg-signal-evidence-fill" />}
          </button>
        ))}
      </div>
      <p className="num mt-2 min-h-[2.5rem] text-sm leading-snug text-muted" aria-live="polite">
        {active
          ? <><strong className="text-ink">{active.label}</strong> ({active.paperTitle}). {GRADE_WORDS[active.grade]}. {active.satisfied ? "Done." : "Not done yet."}</>
          : "Each block is one thing you took on. Tap a block to see what it is and how sure its evidence is."}
      </p>
    </div>
  );
}
