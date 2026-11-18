/**
 * FIGURE-DESIGN 4A, "two piles and a session".
 *
 * Top band: the body as two piles, before and after the trials. The piles are a sketch on the
 * reviewed concept fat-free-mass (dotted, monochrome, "Sketch, not data") and are drawn the same
 * size in both panels: the paper prints no block sizes. What was measured is carried by two short
 * orange labels beside the blocks, each bound to its pooled result (fm_all, ffm_all), and the
 * trial length (trials). "The trials did not test why." says the figure offers no mechanism.
 *
 * Bottom band: two session patterns as strips. The cut-offs (60 s, 90 s) are the paper's own
 * subgroup edges, bound to their results. The dashed outline round the first strip is the
 * authors' recipe (a statement), so it is drawn as proposed.
 *
 * Not interactive: nothing here would change with a reader's input.
 */

import { Figure } from "@/components/figures/Figure";
import {
  PILES_FRAME as F, blockMid, centredFrom, chevron, chevronX, cutWords, personX, stripLabelX, fatBlock, freeBlock, labelX, type Side, panelMid, pileLines, stripBlocks, stripLines,
} from "@/components/figures/piles-layout";
import { Label, Person, SketchShape, SketchTag, assertSketch, sketchLabel } from "@/components/figures/primitives";
import { INK, LINE, META, MUTED, SIGNAL_TEXT, strokeOf, type Evidence } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedSketch } from "@/lib/content/types";
import type { FigureProps } from "../../registry";

interface Cut { lead: string; n: { n: number; ref: string }; unit: string }
interface Params {
  title: string;
  body: ResolvedSketch;
  before: string;
  after: { lead: string; span: { text: string; ref: string } };
  fat: Evidence & { change: string };
  free: Evidence & { change: string };
  why: string;
  short: Evidence & { title: string; burst: Cut; rest: Cut };
  long: { title: string };
  recipe: Evidence & { words: string };
}

export default function TwoPiles({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  assertSketch(p.body);
  for (const e of [p.fat, p.free, p.short, p.recipe]) assertEvidence(e.kind, e.fact);

  const panel = (i: Side) => {
    const free = freeBlock(i);
    const fat = fatBlock(i);
    const after = i === "after";
    const freeText = after ? p.free.change : sketchLabel(p.body, "free");
    const fatText = after ? p.fat.change : sketchLabel(p.body, "fat");
    const freeLines = pileLines(freeText, i);
    const fatLines = pileLines(fatText, i);
    const title = after ? `${p.after.lead} ${p.after.span.text}` : p.before;
    return (
      <g data-panel={after ? "after" : "before"}>
        <Label x={panelMid(i)} y={F.title} anchor="middle" tone="muted" size={F.size}>{title}</Label>
        <Person x={personX(i)} y={F.person.top} height={F.person.height} />
        <SketchShape sketch={p.body}>
          <rect {...free} rx={3} />
        </SketchShape>
        <g opacity={0.7}>
          <SketchShape sketch={p.body}>
            <rect {...fat} rx={3} />
          </SketchShape>
        </g>
        {after ? (
          <>
            <g data-evidence={p.free.kind} data-fact={p.free.fact.id}>
              <path d={chevron(chevronX(i), blockMid(free), false)} fill="none" stroke={SIGNAL_TEXT} strokeWidth={1.5} strokeLinecap="round" />
              <Label x={labelX(i)} y={centredFrom(blockMid(free), freeLines.length)} tone="signal" size={F.size} bold lines={freeLines} />
            </g>
            <g data-evidence={p.fat.kind} data-fact={p.fat.fact.id}>
              <path d={chevron(chevronX(i), blockMid(fat), true)} fill="none" stroke={SIGNAL_TEXT} strokeWidth={1.5} strokeLinecap="round" />
              <Label x={labelX(i)} y={centredFrom(blockMid(fat), fatLines.length)} tone="signal" size={F.size} bold lines={fatLines} />
            </g>
          </>
        ) : (
          <>
            <Label x={labelX(i)} y={centredFrom(blockMid(free), freeLines.length)} size={F.size} lines={freeLines} />
            <Label x={labelX(i)} y={centredFrom(blockMid(fat), fatLines.length)} size={F.size} lines={fatLines} />
          </>
        )}
      </g>
    );
  };

  const short = stripBlocks(F.shortTop, F.short, true);
  const long = stripBlocks(F.longTop, F.long, false);
  const burstLines = stripLines(cutWords(p.short.burst.lead, p.short.burst.n.n, p.short.burst.unit), short.end);
  const restLines = stripLines(cutWords(p.short.rest.lead, p.short.rest.n.n, p.short.rest.unit), short.end);
  const labelAt = stripLabelX(short.end);
  const { lastBurst, lastRest } = short;

  return (
    <Figure title={p.title} desc={alt} height={F.after + F.line}>
      {panel("before")}
      <line x1={F.mid} x2={F.mid} y1={F.title - F.size} y2={F.why - F.line} stroke={LINE} strokeWidth={1} />
      {panel("after")}
      <Label x={F.inset} y={F.why} size={F.size}>{p.why}</Label>
      <SketchTag sketch={p.body} x={F.right - F.inset} y={F.why} anchor="end" size={F.size} />

      <line x1={0} x2={F.right} y1={F.rule} y2={F.rule} stroke={LINE} strokeWidth={1} />

      <g data-evidence={p.recipe.kind} data-fact={p.recipe.fact.id}>
        <rect
          x={F.strip.x / 2} y={F.shortTitle - F.size - 4} width={F.right - F.strip.x} height={short.base - F.shortTitle + F.size + 10}
          rx={8} fill="none" stroke={META} strokeWidth={1} {...strokeOf(p.recipe.kind)}
        />
      </g>
      <g data-evidence={p.short.kind} data-fact={p.short.fact.id}>
        <Label x={F.strip.x} y={F.shortTitle} size={F.size} bold>{p.short.title}</Label>
        {short.bursts.map((b, i) => <rect key={`b${i}`} {...b} fill={INK} />)}
        {short.rests.map((r, i) => <rect key={`r${i}`} {...r} fill={MUTED} opacity={0.6} />)}
        <line x1={F.strip.x} x2={short.end} y1={short.base} y2={short.base} stroke={MUTED} strokeWidth={1} />
        <line x1={lastBurst.x + lastBurst.width} x2={labelAt - 4} y1={lastBurst.y + 5} y2={lastBurst.y + 5} stroke={META} strokeWidth={1} />
        <Label x={labelAt} y={lastBurst.y + 5 + F.size / 3} size={F.size} lines={burstLines} />
        <line x1={lastRest.x + lastRest.width} x2={labelAt - 4} y1={lastRest.y + 4} y2={lastRest.y + 4} stroke={META} strokeWidth={1} />
        <Label x={labelAt} y={lastRest.y + 4 + F.size / 3} size={F.size} lines={restLines} />
      </g>

      <Label x={F.strip.x} y={F.longTitle} size={F.size} bold>{p.long.title}</Label>
      {long.bursts.map((b, i) => <rect key={`lb${i}`} {...b} fill={MUTED} />)}
      <line x1={F.strip.x} x2={long.end} y1={long.base} y2={long.base} stroke={MUTED} strokeWidth={1} />

      <Label x={0} y={F.after} tone="muted" size={F.size}>{p.recipe.words}</Label>
    </Figure>
  );
}
