/**
 * FIGURE-DESIGN 1A, "the parking spot". Two panels, without and with caffeine, each the surface of
 * a brain cell with one dock rising from it.
 *
 *   proposed (dashed)  the dock, the token parked in it, caffeine's hexagon and the glow: how the
 *                      authors describe caffeine acting (adenosine_block). Not measured here.
 *   sketch (dotted)    the tiredness tokens building up and crowding: the reviewed concept
 *                      adenosine. How many are drawn means nothing; the alt text says so.
 *
 * This figure holds no result, so it has no pastel fill. The only orange is the two feeling words,
 * "sleepy" and "alert", as the spec gives them.
 *
 * Not interactive: there is nothing a reader could change that the paper measured.
 */

import { Figure } from "@/components/figures/Figure";
import {
  PARKING_FRAME as F, crowded, dockMid, dockPath, drifting, glow, hexagon, lineY, panelLines, panelMid, panelX, panelWidth, parked, type Side,
} from "@/components/figures/parking-layout";
import { Label, SketchShape, SketchTag, assertSketch, sketchLabel } from "@/components/figures/primitives";
import { FONT, INK, LINE, META, MUTED, SIGNAL_TEXT, strokeOf, type Evidence } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedSketch } from "@/lib/content/types";
import type { FigureProps } from "../../registry";

interface Feeling { lead: string; word: string; end: string }
interface Params {
  title: string;
  tokens: ResolvedSketch;
  block: Evidence & { tag: string };
  without: { title: string; dock: string; feeling: Feeling };
  with: { title: string; caffeine: string; dock: string; crowd: string; feeling: Feeling };
}

export default function ParkingSpot({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  assertSketch(p.tokens);
  assertEvidence(p.block.kind, p.block.fact);
  const dashed = { fill: "none", strokeWidth: F.stroke, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, ...strokeOf(p.block.kind) };

  const feeling = (side: Side, f: Feeling) => (
    <text x={panelMid(side)} y={lineY(F.under, 1)} textAnchor="middle" fill={INK} fontSize={F.size} fontFamily={FONT}>
      {f.lead} <tspan fill={SIGNAL_TEXT} fontWeight={F.strong}>{f.word}</tspan>{f.end}
    </text>
  );

  const cell = (side: Side) => (
    <g stroke={MUTED} strokeWidth={1.25} fill="none" data-cell>
      <line x1={panelX(side)} x2={panelX(side) + panelWidth()} y1={F.cell.y} y2={F.cell.y} />
      <line x1={panelX(side)} x2={panelX(side) + panelWidth()} y1={F.cell.y + F.cell.height} y2={F.cell.y + F.cell.height} />
    </g>
  );

  const signalLines = panelLines(sketchLabel(p.tokens, "signal"));
  const crowdLines = panelLines(p.with.crowd);
  const hex = parked("with");

  return (
    <Figure title={p.title} desc={alt} height={lineY(F.tags, 1) + F.pad}>
      <Label x={panelMid("without")} y={F.title} anchor="middle" tone="muted" size={F.size} bold>{p.without.title}</Label>
      <Label x={panelMid("with")} y={F.title} anchor="middle" tone="muted" size={F.size} bold>{p.with.title}</Label>
      <line x1={F.mid} x2={F.mid} y1={F.pad} y2={lineY(F.under, 1)} stroke={LINE} strokeWidth={1} />

      {/* Without caffeine: the signal builds up, drifts down, and one lands in the dock. */}
      <Label x={panelX("without")} y={F.topLabel} size={F.size} lines={signalLines} />
      <SketchShape sketch={p.tokens}>
        {drifting("without").map((t, i) => <circle key={i} cx={t.cx} cy={t.cy} r={F.token} />)}
      </SketchShape>
      {cell("without")}
      <g data-evidence={p.block.kind} data-fact={p.block.fact.id}>
        <path d={dockPath("without")} stroke={INK} {...dashed} />
        <circle cx={parked("without").cx} cy={parked("without").cy} r={F.token} stroke={MUTED} {...dashed} />
        <path d={glow("without")} stroke={META} {...dashed} />
      </g>
      <Label x={panelMid("without")} y={F.under} anchor="middle" tone="muted" size={F.size}>{p.without.dock}</Label>
      {feeling("without", p.without.feeling)}

      {/* With caffeine: caffeine holds the dock; the signal is still there and cannot land. */}
      <Label x={panelX("with")} y={F.topLabel} size={F.size} lines={crowdLines} />
      <SketchShape sketch={p.tokens}>
        {crowded("with").map((t, i) => <circle key={i} cx={t.cx} cy={t.cy} r={F.token} />)}
      </SketchShape>
      {cell("with")}
      <g data-evidence={p.block.kind} data-fact={p.block.fact.id}>
        <path d={dockPath("with")} stroke={INK} {...dashed} />
        <polygon points={hexagon(hex.cx, hex.cy, F.token + 1)} stroke={INK} {...dashed} strokeWidth={1.75} />
      </g>
      <Label x={dockMid("with") + F.dock.width / 2 + F.pad} y={hex.cy + F.size / 3} size={F.size} bold>{p.with.caffeine}</Label>
      <Label x={panelMid("with")} y={F.under} anchor="middle" tone="muted" size={F.size}>{p.with.dock}</Label>
      {feeling("with", p.with.feeling)}

      <line x1={0} x2={F.right} y1={F.tags - F.line} y2={F.tags - F.line} stroke={LINE} strokeWidth={1} />
      <Label x={0} y={F.tags} tone="muted" size={F.size}>{p.block.tag}</Label>
      <SketchTag sketch={p.tokens} x={0} y={lineY(F.tags, 1)} size={F.size} />
    </Figure>
  );
}
