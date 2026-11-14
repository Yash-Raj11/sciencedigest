/**
 * FIGURE-DESIGN 2A, "from the tongue to the blood". Two rows, the plain egg and the egg with
 * black pepper, each a chain: the meal, a sensor in the mouth, the gut's "food has arrived"
 * signal, the blood. The middle of the chain is the authors' idea (dashed, in --meta): no hormone
 * was measured. Under the pepper row, one solid arrow runs straight from the meal to the blood:
 * what the randomized trial showed. The pastel and the bright orange belong to that result only.
 *
 * Not interactive: there is nothing a reader could change that the paper measured.
 */

import { Figure } from "@/components/figures/Figure";
import {
  CHAIN_FRAME as F, atWords, chainHeight, colMid, colX, ideaWidth, labelLines, lastWidth, lineY, linkX, rowMid,
} from "@/components/figures/chain-layout";
import { Arrow, Gut, Label, Plate, Tongue, Vessel } from "@/components/figures/primitives";
import { DASH, FONT, META, MUTED, ON_SIGNAL_FILL, SIGNAL_FILL, type Evidence } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Params {
  title: string;
  rows: { plain: string; spiced: string };
  sensor: Evidence & { name: string };
  signal: Evidence & { name: string; spiced: string };
  /** Pepper to sensor (with the line under it), sensor to signal, signal to blood. */
  links: [Evidence & { spiced: string }, Evidence, Evidence];
  meal: { dose: { text: string; ref: string }; words: string };
  blood: Evidence & { lead: string; signal: string };
  when: Evidence & { lead: string; minutes: { n: number; ref: string }; unit: string };
  trial: Evidence & { words: string };
  idea: string;
  measured: string;
}

export default function TongueToBlood({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  for (const e of [p.sensor, p.signal, ...p.links, p.blood, p.when, p.trial]) assertEvidence(e.kind, e.fact);

  const mealLines = labelLines(`${p.meal.dose.text} ${p.meal.words}`);
  const bloodLead = [p.blood.lead];
  const bloodSignal = labelLines(p.blood.signal, lastWidth());
  const whenLines = labelLines(atWords(p.when.lead, p.when.minutes.n, p.when.unit), lastWidth());
  const ideaLines = labelLines(p.idea, ideaWidth());
  const [pepperLink] = p.links;
  const ideaY = lineY(F.under, mealLines.length) + F.gap;
  const measuredY = F.under;
  const bloodY = lineY(measuredY, [p.measured].length);
  const signalY = lineY(bloodY, bloodLead.length);
  const whenY = lineY(signalY, bloodSignal.length);
  const height = chainHeight([
    { y: whenY, lines: whenLines.length }, { y: ideaY, lines: ideaLines.length },
  ]);

  const row = (top: number, spiced: boolean) => {
    const mid = rowMid(top);
    return (
      <g data-row={spiced ? "spiced" : "plain"}>
        <text x={F.titleX} y={mid} transform={`rotate(-90 ${F.titleX} ${mid})`} textAnchor="middle" fill={MUTED} fontSize={F.size} fontFamily={FONT}>
          {spiced ? p.rows.spiced : p.rows.plain}
        </text>
        <Plate x={colX(0)} y={top} w={F.box} h={F.icon} specks={spiced} />
        <g data-evidence={p.sensor.kind} data-fact={p.sensor.fact.id}>
          <Tongue x={colX(1)} y={top} w={F.box} h={F.icon} lit={spiced} dashed />
        </g>
        <g data-evidence={p.signal.kind} data-fact={p.signal.fact.id}>
          <Gut x={colX(2)} y={top} w={F.box} h={F.icon} signal={spiced} dashed />
          {spiced ? <Label x={colMid(2)} y={F.stateAbove} anchor="middle" tone="muted" size={F.size} lines={labelLines(p.signal.spiced, F.box)} /> : null}
        </g>
        {spiced ? <rect x={colX(3)} y={top - F.gap / 2} width={F.box} height={F.icon + F.gap} rx={F.gap} fill={SIGNAL_FILL} data-band /> : null}
        <Vessel x={colX(3)} y={top} w={F.box} h={F.icon} ink={spiced ? ON_SIGNAL_FILL : undefined} />
        {p.links.map((link, i) => (
          <g key={i} data-evidence={link.kind} data-fact={link.fact.id}>
            <line {...linkX(i)} y1={mid} y2={mid} stroke={META} strokeWidth={1.5} strokeDasharray={DASH} />
            {spiced && !i ? (
              <Label x={colMid(1)} y={F.stateAbove} anchor="middle" tone="muted" size={F.size} lines={labelLines(pepperLink.spiced, F.box)} />
            ) : null}
          </g>
        ))}
      </g>
    );
  };

  return (
    <Figure title={p.title} desc={alt} height={height}>
      <Label x={colMid(1)} y={F.header} anchor="middle" tone="muted" size={F.size} lines={labelLines(p.sensor.name)} />
      <Label x={colMid(2)} y={F.header} anchor="middle" tone="muted" size={F.size} lines={labelLines(p.signal.name)} />
      {row(F.top, false)}
      {row(F.bottom, true)}

      <Arrow x1={colX(0) + F.box / 2} y1={F.arrow} x2={colX(3) - F.link / 2} y2={F.arrow} kind={p.trial.kind} fact={p.trial.fact} />
      <Label x={colMid(1) + F.box / 2 + F.link / 2} y={F.arrow + F.line} anchor="middle" size={F.size}>{p.trial.words}</Label>
      <Label x={colMid(3)} y={measuredY} anchor="middle" tone="muted" size={F.size}>{p.measured}</Label>

      <Label x={colX(0)} y={F.under} size={F.size} lines={mealLines} />
      <g data-evidence={p.blood.kind} data-fact={p.blood.fact.id}>
        <Label x={colMid(3)} y={bloodY} anchor="middle" size={F.size} lines={bloodLead} />
        <Label x={colMid(3)} y={signalY} anchor="middle" tone="signal" size={F.size} bold lines={bloodSignal} />
      </g>
      <g data-evidence={p.when.kind} data-fact={p.when.fact.id}>
        <Label x={colMid(3)} y={whenY} anchor="middle" size={F.size} lines={whenLines} />
      </g>
      <Label x={colX(0)} y={ideaY} tone="muted" size={F.size} lines={ideaLines} />
    </Figure>
  );
}
