/**
 * The three pooled results on one line each, with the point of no change
 * marked. Everything here was measured, so everything is solid.
 */

import { Figure } from "@/components/figures/Figure";
import { change, range } from "@/components/figures/format";
import { Gauge, Label } from "@/components/figures/primitives";
import type { Evidence } from "@/components/figures/shared";
import { GRADE_NAME } from "@/lib/evidence";
import type { FigureProps } from "../../registry";

interface Row extends Evidence { label: string }
interface Params { rows: Row[] }

export default function WhatWasMeasured({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  return (
    <Figure title="What interval training changed, measured" desc={alt} height={236}>
      <Label x={8} y={16} tone="muted" size={11.5}>Change against no training, pooled across trials</Label>
      {p.rows.map((row, i) => {
        const estimate = row.fact.estimate!;
        const spread = range(estimate);
        return (
          <Gauge
            key={row.fact.id} x={8} y={46 + i * 62} width={304} min={-3} max={1.5}
            value={estimate.point} low={estimate.ciLow} high={estimate.ciHigh}
            label={row.label} text={spread ? `${change(estimate)}  (${spread})` : change(estimate)}
            note={GRADE_NAME[estimate.tier].toLowerCase()} kind={row.kind} fact={row.fact}
          />
        );
      })}
      <Label x={8} y={228} tone="muted" size={11}>Upright mark: no change. Bar: the range the true change sits in.</Label>
    </Figure>
  );
}
