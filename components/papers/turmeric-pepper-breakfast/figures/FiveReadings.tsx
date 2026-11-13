/**
 * What was measured: five finger-prick readings after each of the four meals.
 * It draws no curve and no height, because the paper prints no glucose values.
 * A dot says a reading was taken; the orange ones are where the paper says a
 * meal differed from the plain one.
 */

import { Figure } from "@/components/figures/Figure";
import { Timeline } from "@/components/figures/primitives";
import type { Evidence } from "@/components/figures/shared";
import type { FigureProps } from "../../registry";

interface Num { n: number; ref: string }
interface Params {
  times: Num[];
  unit: string;
  meals: { label: string; differed: Num[] }[];
  pValue: { text: string; ref: string };
  early: Evidence & { at: Num };
  total: Evidence;
}

export default function FiveReadings({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  const times = p.times.map((time) => time.n);
  return (
    <Figure title="Five blood glucose readings after four breakfasts" desc={alt} height={226}>
      <Timeline
        x={8} y={56} width={304} times={times} unit={p.unit}
        rows={p.meals.map((meal) => ({ label: meal.label, flagged: meal.differed.map((time) => time.n) }))}
        span={{ lines: [`total over ${Math.max(...times)} ${p.unit}: no difference`], fact: p.total.fact }}
        flag={{ time: p.early.at.n, lines: ["differed from plain", `(p = ${p.pValue.text})`], fact: p.early.fact }}
      />
    </Figure>
  );
}
