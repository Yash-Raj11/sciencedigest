"use client";

/**
 * FIGURE-DESIGN 4B, "the order flips". Three pooled results, surest evidence first, beside the
 * order interval training is usually sold in: the connectors cross, so the reader sees that the
 * surest result is the one sold last. Everything drawn is measured; nothing is proposed.
 *
 * Design note (why it is interactive): the paper split its trials by routine, and a reader asks
 * "what about mine?". Picking a routine shows, under each pooled row, the subgroup results the
 * paper printed for it, each on its own row and never summed, because the subgroups share trials.
 * A still picture cannot show which of thirty-odd subgroup rows apply to one reader. The untouched
 * view carries the point alone: the pooled rows and, under fat-free mass, the result with one
 * trial left out. State starts empty and holds only the reader's picks and which outcomes are open.
 *
 * Owner, 2026-11-15: the subgroups are collapsed by default. Each pooled row gets one tap target,
 * "N subgroup results match your routine", that opens only that outcome's subgroups, so a full
 * routine still fits about one phone screen. Each subgroup's range is drawn and its ends printed:
 * nothing lives in a tooltip.
 *
 * The subgroup facts come from the simulator's params, which the read passes in (`simulator`) and
 * the feed card never does: a members' read keeps them out of the public card (rule 7).
 */

import { useState } from "react";
import { wrapLines } from "@/components/figures/crowds-layout";
import { Figure } from "@/components/figures/Figure";
import {
  ORDER_FRAME as F, ORDER_WORDS, afterWords, allSubgroups, crossesNoChange, gradeWords, matchSentences, missingWords,
  pitchPath, pointWords, pooledLabelY, stackBottom, stackTops, subgroupValue, subgroupsFor, summaryWords, surestFirst,
  type CompareSettings, type OutcomeId, type Picks, type PooledRow,
} from "@/components/figures/order-layout";
import { CompareRows, compareRowsHeight, Label, type CompareRow } from "@/components/figures/primitives";
import { LINE, SIGNAL_FILL } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedFact } from "@/lib/content/types";
import type { FigureProps } from "../../registry";

interface Row extends PooledRow { kind: "measured"; pitch: string }
interface Params {
  title: string; pitchTitle: string;
  after: { text: string; ref: string };
  rows: Row[];
  /** The outcomes in the order they are usually sold, top to bottom. */
  pitch: OutcomeId[];
  sensitivity: { outcome: OutcomeId; lead: string; crosses: string };
}

export default function OrderFlips({ params, alt, interactive = true, glance, simulator }: FigureProps) {
  const p = params as unknown as Params;
  const sim = simulator as unknown as CompareSettings | undefined;
  const full = !glance;
  const [picks, setPicks] = useState<Picks>({});
  const [open, setOpen] = useState<Record<OutcomeId, boolean>>({});
  const picked = Object.values(picks).some(Boolean);

  const rows = surestFirst(p.rows);
  for (const row of rows) assertEvidence(row.kind, row.fact);
  const sizes = { size: F.size, small: F.small };

  const blocks = rows.map((row) => {
    const out: CompareRow[] = [{ kind: "pooled", fact: row.fact, lead: `${row.label}: `, number: pointWords(row.fact), note: gradeWords(row.fact) }];
    const extent: ResolvedFact[] = [];
    const loo = full && sim?.leaveOneOut && p.sensitivity.outcome === row.outcome ? sim.leaveOneOut : null;
    if (loo) {
      const crosses = crossesNoChange(loo);
      out.push({ kind: "sensitivity", fact: loo, lead: `${p.sensitivity.lead}: `, number: pointWords(loo), tail: crosses ? "," : "", note: crosses ? p.sensitivity.crosses : "" });
      extent.push(loo);
    }
    const found = full && sim ? subgroupsFor(sim, picks, row.outcome) : { rows: [], missing: [] };
    if (full && sim) {
      extent.push(...allSubgroups(sim, row.outcome));
      if (found.rows.length || found.missing.length) {
        const expanded = Boolean(open[row.outcome]);
        out.push({
          kind: "toggle", id: row.outcome, text: summaryWords(found.rows.length), expanded,
          onToggle: () => setOpen((v) => ({ ...v, [row.outcome]: !v[row.outcome] })),
        });
        if (expanded) {
          for (const s of found.rows) out.push({ kind: "subgroup", fact: s.fact, lead: s.words, value: subgroupValue(s), clear: s.clear });
          if (found.missing.length) {
            for (const line of wrapLines(missingWords(found.missing), F.rowsWidth, F.small)) out.push({ kind: "line", text: line });
          }
        }
      }
    }
    return { row, out, extent, matched: found.rows.length };
  });

  const heights = blocks.map((b, i) => compareRowsHeight(b.out, sizes, F.rowsWidth, !i));
  const tops = stackTops(heights, F.rows, F.gap);
  const height = stackBottom(tops, heights, F.gap);
  // Where each pooled row's label sits, for the pitch connectors.
  const labelY = (outcome: OutcomeId) => {
    const i = blocks.findIndex((b) => b.row.outcome === outcome);
    return pooledLabelY(tops[i], !i);
  };
  const sentences = matchSentences(blocks.map((b) => ({ label: b.row.label, n: b.matched })), picked);

  return (
    <div data-order-flips data-mode={full ? "full" : "card"}>
      {full && interactive && sim ? (
        <fieldset className="mx-4 mb-3 space-y-3" data-simulator>
          <legend className="text-sm leading-snug text-muted">{ORDER_WORDS.pick}</legend>
          {sim.settings.map((setting) => (
            <div key={setting.id} role="group" aria-label={setting.label}>
              <p className="label">{setting.label}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {setting.options.map((option) => {
                  const on = picks[setting.id] === option.id;
                  return (
                    <button
                      key={option.id} type="button" aria-pressed={on} data-pick={`${setting.id}:${option.id}`}
                      onClick={() => setPicks((v) => ({ ...v, [setting.id]: on ? undefined : option.id }))}
                      className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${on ? "border-ink bg-ink text-bg" : "border-line bg-bg text-ink"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>
      ) : null}

      <Figure title={p.title} desc={alt} height={height} interactive={full && interactive && Boolean(sim)}>
        <Label x={F.pitchLeft} y={F.title} size={F.size} bold>{p.title}</Label>
        <Label x={F.pitchLeft} y={F.phase} tone="muted" size={F.small}>{p.pitchTitle}</Label>
        <Label x={F.rowsLeft} y={F.phase} tone="muted" size={F.small}>{ORDER_WORDS.start}</Label>
        <Label x={F.rowsLeft + F.rowsWidth} y={F.phase} anchor="end" tone="muted" size={F.small}>{afterWords(p.after.text)}</Label>
        <rect x={F.rowsLeft} y={F.key - F.small * 0.7} width={F.swatch} height={F.small * 0.7} rx={F.small * 0.35} fill={SIGNAL_FILL} />
        <Label x={F.rowsLeft + F.swatch + F.small * 0.5} y={F.key} tone="muted" size={F.small}>{ORDER_WORDS.band}</Label>

        {p.pitch.map((outcome, i) => {
          const row = rows.find((r) => r.outcome === outcome);
          if (!row) return null;
          const y = labelY(rows[i]?.outcome ?? outcome);
          const lines = wrapLines(row.pitch, F.pitchRight, F.small);
          return (
            <g key={outcome} data-pitch={outcome}>
              <Label x={F.pitchLeft} y={y} tone="muted" size={F.small} lines={lines} />
              <path d={pitchPath({ x: F.pitchRight + F.small * 0.3, y: y - F.small * 0.35 }, { x: F.rowsLeft - F.small * 0.4, y: labelY(outcome) - F.size * 0.35 })}
                fill="none" stroke={LINE} strokeWidth={1} />
            </g>
          );
        })}

        {blocks.map((b, i) => (
          <g key={b.row.outcome} data-outcome={b.row.outcome}>
            <CompareRows
              x={F.rowsLeft} y={tops[i]} width={F.rowsWidth} rows={b.out} extent={b.extent}
              baselineLabel={i ? undefined : ORDER_WORDS.baseline} size={F.size} small={F.small}
            />
          </g>
        ))}
      </Figure>

      {full && sentences.length ? (
        <p className="mx-4 mt-2 text-sm leading-snug text-ink" aria-live="polite" data-match>{sentences.join(" ")}</p>
      ) : null}
    </div>
  );
}
