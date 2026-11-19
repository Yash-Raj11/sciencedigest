/**
 * Step 3B, "the energy ledger" (sleep extension and energy intake).
 *
 * The mechanism layer's model is a ledger: food in one column, energy burned in the other. This
 * draws what the trial measured in each column, for each group, as the change from that group's
 * own usual weeks: a solid bar to the point estimate and a thin line for its printed 95% range,
 * all four on one scale. The reader sees the food bar move, and the energy-burned bar move much
 * less, in opposite directions in the two groups. Under each group, its measured change in weight.
 * Everything drawn is measured (Table 2 of the paper); nothing is proposed, and nothing is a sketch.
 *
 * The glance view (the feed card) draws the same bars and ranges with no numbers: no values and
 * no weight lines, and the axis words from the read's glance labels.
 *
 * Not interactive: there is nothing for a reader to put in. Each group is fixed by the trial.
 */

import { Figure } from "@/components/figures/Figure";
import { change, signedPoint } from "@/components/figures/format";
import {
  LEDGER_FRAME as F, ROWS, barRect, barsBottom, dividerY, groupTop, lastGroupTop, ledgerHeight, ledgerScale, rangeLine, rowLabelY, valuePlace, weightY, type Row,
} from "@/components/figures/ledger-layout";
import { Label } from "@/components/figures/primitives";
import { INK, LINE, MUTED, SIGNAL_FILL, SIGNAL_TEXT, type Evidence } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Group { label: string; food: Evidence; burned: Evidence; weight: Evidence }
interface Params {
  title: string; unit: string;
  less: string; noChange: string; more: string;
  food: string; burned: string; weight: string;
  groups: Group[];
}

export default function EnergyLedger({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  const full = !glance;
  for (const g of p.groups) for (const e of [g.food, g.burned, g.weight]) {
    assertEvidence(e.kind, e.fact);
    if (!e.fact.estimate) throw new Error(`figure: "${e.fact.id}" has no estimate to draw`);
  }
  const at = ledgerScale(p.groups.flatMap((g) => [g.food.fact.estimate!, g.burned.fact.estimate!]));
  const height = ledgerHeight(p.groups.length, full);
  const lastTop = lastGroupTop(p.groups.length, full);

  const bar = (e: Evidence, words: string, top: number, row: Row) => {
    const est = e.fact.estimate!;
    const rect = barRect(est, at, top, row);
    const range = rangeLine(est, at, top, row);
    const text = signedPoint(est);
    const place = valuePlace(est, at, top, row, text);
    return (
      <g data-evidence={e.kind} data-fact={e.fact.id} data-row={row === ROWS.burned ? "burned" : "food"}>
        <Label x={0} y={rowLabelY(top, row)} tone="muted" size={F.small}>{words}</Label>
        <rect {...rect} rx={2} fill={SIGNAL_FILL} stroke={SIGNAL_TEXT} strokeWidth={1} />
        {range ? (
          <g data-range stroke={INK} strokeWidth={1}>
            <line x1={range.x1} x2={range.x2} y1={range.y} y2={range.y} />
            <line x1={range.x1} x2={range.x1} y1={range.y - range.cap} y2={range.y + range.cap} />
            <line x1={range.x2} x2={range.x2} y1={range.y - range.cap} y2={range.y + range.cap} />
          </g>
        ) : null}
        {full ? <Label x={place.x} y={place.y} anchor={place.anchor} size={F.size} bold>{text}</Label> : null}
      </g>
    );
  };

  return (
    <Figure title={p.title} desc={alt} height={height}>
      <Label x={0} y={F.title} size={F.size} bold>{p.title}</Label>
      <Label x={0} y={F.subtitle} tone="muted" size={F.small}>{glance?.x ?? p.unit}</Label>
      <Label x={F.plot.left} y={F.axis} tone="muted" size={F.small}>{p.less}</Label>
      <Label x={at(0)} y={F.axis} anchor="middle" tone="muted" size={F.small}>{p.noChange}</Label>
      <Label x={F.plot.right} y={F.axis} anchor="end" tone="muted" size={F.small}>{p.more}</Label>
      <line x1={at(0)} x2={at(0)} y1={F.axis + F.cap * 2} y2={barsBottom(lastTop) + F.cap} stroke={MUTED} strokeWidth={1} data-no-change />

      {p.groups.map((g, i) => {
        const top = groupTop(i, full);
        return (
          <g key={g.food.fact.id} data-group={i}>
            {i ? <line x1={0} x2={F.right} y1={dividerY(i, full)} y2={dividerY(i, full)} stroke={LINE} strokeWidth={1} /> : null}
            <Label x={0} y={top} size={F.size} bold>{g.label}</Label>
            {bar(g.food, p.food, top, ROWS.food)}
            {bar(g.burned, p.burned, top, ROWS.burned)}
            {full ? (
              <g data-evidence={g.weight.kind} data-fact={g.weight.fact.id} data-weight>
                <Label x={0} y={weightY(top)} size={F.size}>{`${p.weight}: ${change(g.weight.fact.estimate!)}`}</Label>
              </g>
            ) : null}
          </g>
        );
      })}
    </Figure>
  );
}
