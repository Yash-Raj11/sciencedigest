"use client";

/**
 * FIGURE-DESIGN 2B, "the first half hour". Two blood-sugar lines after breakfast, compared over the
 * study's reading times.
 *
 *   measured (solid)  the five reading times as dots on the axis (the 30-minute one larger, bound to
 *                     glucose_30), the pastel column at 30 minutes, the bracket over the whole 3
 *                     hours (glucose_total), and the result sentences under the chart.
 *   sketch (dotted)   both lines, on the reviewed concept post-meal-blood-sugar. Their heights mean
 *                     nothing: the paper prints no blood sugar values. They part only inside the
 *                     column and are the same line everywhere else (half-hour-layout.ts), so the
 *                     shape never shows a difference the paper did not find.
 *
 * Design note (why it is interactive): the trial had four meals, and a reader asks "what about my
 * egg?". Two switches, black pepper and turmeric, pick the meal; the chart redraws in place and the
 * sentence under it says what the paper found for that meal. The untouched view is the paper's own
 * comparison (plain egg against egg with pepper), which carries the point alone, and it is the feed
 * card's still. State starts empty and holds only the two switches. No timer, no motion.
 */

import { useState } from "react";
import { Figure } from "@/components/figures/Figure";
import { HALF_FRAME as F, curves, differs, labelSpots, lastOf, lines, mealOf, tickWords, timeX, withNumber, type Meal } from "@/components/figures/half-hour-layout";
import { Bracket, Label, SketchPath, SketchTag, assertSketch, sketchLabel } from "@/components/figures/primitives";
import { INK, LINE, MUTED, SIGNAL_PALE, type Evidence } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedSketch } from "@/lib/content/types";
import type { FigureProps } from "../../registry";

interface Num { n: number; ref: string }
interface Said { lead: string; n: Num; rest: string }
interface Params {
  title: string;
  curves: ResolvedSketch;
  times: Num[]; unit: string; start: string;
  column: Evidence & { label: string; at: Num };
  bracket: Evidence & Said & { still: string };
  dots: { label: string };
  phases: [string, string, string];
  notes: { shape: string; people: { n: Num; rest: string; } };
  switches: { legend: string; pepper: string; turmeric: string };
  results: {
    plain: string;
    pepper: Evidence & { words: string; at: Said; total: Said };
    turmeric: Evidence & { words: string };
    sugar: { lead: string; more: Num; mid: string; less: Num; end: string };
  };
}

export default function FirstHalfHour({ params, alt, interactive = true, glance }: FigureProps) {
  const p = params as unknown as Params;
  assertSketch(p.curves);
  for (const e of [p.column, p.bracket, p.results.pepper, p.results.turmeric]) assertEvidence(e.kind, e.fact);
  const [picked, setPicked] = useState<{ pepper: boolean; turmeric: boolean } | null>(null);
  const full = !glance;
  // Untouched, the chart is the paper's own comparison: the plain egg against the egg with pepper.
  const meal: Meal = picked ? mealOf(picked.pepper, picked.turmeric) : "pepper";
  const two = differs(meal);

  const times = p.times.map((t) => t.n);
  const last = lastOf(times);
  const c = curves(times, p.column.at.n);
  const upperLabel = sketchLabel(p.curves, meal === "turmeric" ? "turmeric" : "plain");
  const lowerLabel = sketchLabel(p.curves, meal === "both" ? "both" : "pepper");
  const { colX, signalX, curveX, curveWidth, lowerWidth } = labelSpots(c.centre);
  const bracketWords = full ? `${withNumber(p.bracket.lead, p.bracket.n.n, p.bracket.rest)}` : p.bracket.still;

  const result = (() => {
    const r = p.results;
    if (meal === "plain") return [r.plain];
    if (meal === "turmeric") return [r.turmeric.words];
    const said = [r.pepper.words, withNumber(r.pepper.at.lead, r.pepper.at.n.n, r.pepper.at.rest), withNumber(r.pepper.total.lead, r.pepper.total.n.n, r.pepper.total.rest)];
    return meal === "both" ? [...said, `${r.sugar.lead} ${r.sugar.more.n} ${r.sugar.mid} ${r.sugar.less.n} ${r.sugar.end}`] : said;
  })();
  const resultFact = meal === "turmeric" ? p.results.turmeric.fact.id : two ? p.results.pepper.fact.id : null;

  const toggle = (key: "pepper" | "turmeric") => setPicked((v) => {
    const now = v ?? { pepper: false, turmeric: false };
    return { ...now, [key]: !now[key] };
  });

  return (
    <div data-first-half-hour data-mode={full ? "full" : "card"} data-meal={meal}>
      {full && interactive ? (
        <fieldset className="mx-4 mb-3" data-simulator>
          <legend className="text-sm leading-snug text-muted">{p.switches.legend}</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(["pepper", "turmeric"] as const).map((key) => {
              const on = Boolean(picked?.[key]);
              return (
                <button
                  key={key} type="button" role="switch" aria-checked={on} data-switch={key} onClick={() => toggle(key)}
                  className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${on ? "border-ink bg-ink text-bg" : "border-line bg-bg text-ink"}`}
                >
                  {p.switches[key]}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <Figure title={p.title} desc={alt} height={F.height} interactive={full && interactive}>
        {/* The bracket: the whole three hours showed no clear difference. */}
        <g data-evidence={p.bracket.kind} data-fact={p.bracket.fact.id}>
          <Bracket x1={timeX(0, last)} x2={timeX(last, last)} y={F.bracket} lines={[bracketWords]} />
        </g>

        {/* The column at the 30-minute reading: the one clear difference (pepper meals only). */}
        {two ? (
          <g data-evidence={p.column.kind} data-fact={p.column.fact.id}>
            <rect x={colX} y={F.top - F.line} width={F.column} height={F.base - F.top + F.line} rx={4} fill={SIGNAL_PALE} data-band />
            <Label x={signalX} y={F.top} tone="signal" size={F.size} bold>{p.column.label}</Label>
          </g>
        ) : null}

        {/* The lines: a sketch of the shape of blood sugar after a meal, not data. */}
        {two ? (
          <>
            {c.shared.map((d, i) => <SketchPath key={i} sketch={p.curves} d={d} ink="ink" width={F.stroke} />)}
            <SketchPath sketch={p.curves} d={c.upperIn} ink="muted" width={F.stroke} />
            <SketchPath sketch={p.curves} d={c.lowerIn} ink="ink" width={F.stroke} />
          </>
        ) : <SketchPath sketch={p.curves} d={c.whole} ink="ink" width={F.stroke} />}
        <line x1={c.peak.x + F.small / 2} x2={curveX - F.small / 2} y1={c.peak.y} y2={c.peak.y + F.line} stroke={LINE} strokeWidth={1} />
        <Label x={curveX} y={c.peak.y + F.line + F.size / 3} tone={two ? "muted" : "ink"} size={F.size} lines={lines(upperLabel, curveWidth)} />
        {two ? (
          <>
            <line x1={c.lowAtCentre.x} x2={signalX - F.small / 2} y1={c.lowAtCentre.y + F.small / 2} y2={F.base - F.line} stroke={LINE} strokeWidth={1} />
            <Label x={signalX} y={F.base - F.line + F.size / 3} size={F.size} bold lines={lines(lowerLabel, lowerWidth)} />
          </>
        ) : null}

        {/* The axis and the five readings: when blood sugar was checked. */}
        <line x1={timeX(0, last)} x2={timeX(last, last)} y1={F.base} y2={F.base} stroke={MUTED} strokeWidth={1} />
        {times.map((t, i) => {
          const lit = two && t === p.column.at.n;
          return lit ? (
            <g key={i} data-evidence={p.column.kind} data-fact={p.column.fact.id}>
              <circle cx={timeX(t, last)} cy={F.base} r={F.dotLit} fill={INK} data-reading={t} />
            </g>
          ) : <circle key={i} cx={timeX(t, last)} cy={F.base} r={F.dot} fill={MUTED} data-reading={t} />;
        })}
        {full ? (
          <>
            {times.map((t, i) => (
              <Label key={i} x={timeX(t, last)} y={F.ticks} anchor={i ? "middle" : "start"} tone="muted" size={F.small}>{tickWords(times, i, p.unit, p.start)}</Label>
            ))}
            <Label x={timeX(last, last)} y={F.phases} anchor="end" tone="muted" size={F.small}>{p.dots.label}</Label>
          </>
        ) : (
          <>
            <Label x={timeX(0, last)} y={F.ticks} tone="muted" size={F.small}>{p.start}</Label>
            {glance?.x ? <Label x={timeX(last, last)} y={F.ticks} anchor="end" tone="muted" size={F.small}>{`${glance.x} →`}</Label> : null}
          </>
        )}
        <SketchTag sketch={p.curves} x={0} y={F.tag} size={F.small} />
        {full ? <Label x={timeX(last, last)} y={F.tag} anchor="end" tone="muted" size={F.small}>{p.phases.join(" · ")}</Label> : null}
      </Figure>

      {full ? (
        <div className="mx-4 mt-2 space-y-1.5">
          <p className="text-sm leading-snug text-ink" aria-live="polite" data-result data-fact={resultFact ?? undefined}>
            {result.map((s, i) => <span key={i}>{i ? " " : ""}{s}</span>)}
          </p>
          <p className="text-xs leading-snug text-muted">{p.notes.shape} {p.notes.people.n.n} {p.notes.people.rest}</p>
        </div>
      ) : null}
    </div>
  );
}

