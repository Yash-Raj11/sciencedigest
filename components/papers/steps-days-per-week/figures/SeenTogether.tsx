/**
 * An association, and drawn as one: two measured gaps side by side and a
 * bracket that says they were seen together. There is no arrow anywhere in
 * this figure, because the study watched people and assigned nothing.
 */

import { Figure } from "@/components/figures/Figure";
import { gap, range, size, thousands } from "@/components/figures/format";
import { BarPair, Bracket, Label, type Bar } from "@/components/figures/primitives";
import type { Evidence } from "@/components/figures/shared";
import type { FigureProps } from "../../registry";

interface Num { n: number; ref: string }
interface Group extends Evidence { from: Num; to: Num }
interface Params { threshold: Num; years: Num; few: Group; many: Group }

function bar(group: Group): Bar {
  const estimate = group.fact.estimate!;
  const spread = range(estimate, true);
  return {
    kind: group.kind, fact: group.fact,
    label: `${group.from.n} to ${group.to.n} days a week`,
    value: size(estimate), text: gap(estimate), note: spread ? `range ${spread}` : null,
  };
}

export default function SeenTogether({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  return (
    <Figure title="Step days and deaths, seen together" desc={alt} height={222}>
      <Label
        x={8} y={16} tone="muted" size={11.5}
        lines={[`Risk of death over ${p.years.n} years, next to people`, `with no days at ${thousands(p.threshold.n)} steps`]}
      />
      <BarPair x={8} y={62} width={304} max={20} bars={[bar(p.few), bar(p.many)]} />
      <Bracket x1={8} x2={312} y={176} side="below" lines={["seen together: the study watched,", "it did not assign the walking"]} />
    </Figure>
  );
}
