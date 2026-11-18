/**
 * FIGURE-DESIGN 1B, "the hidden tiredness day": panel 2, the phase strip and the result box. It sits
 * under the decay simulator (panel 1, caffeine in the body) in the read, and its still view is the
 * feed card.
 *
 *   sketch (dotted)   both lines and the hatched gap: the reviewed concept adenosine. Sleep pressure
 *                     keeps building; how tired you feel follows it until the first dose, then runs
 *                     below it. The gap narrows as caffeine fades and never closes. Nothing is drawn
 *                     after bed, and no line joins the sketch to the result box.
 *   bound numbers     the day itself: the study's dose times (schedule) and bed, the recording gap
 *                     after the last dose (recording). Positions only; the sketch carries no value.
 *   measured          the result box: what the sleep laboratory found (sleep_same), for the men it
 *                     studied (sample, who). The one pastel fill.
 *
 * Not interactive. The reader's own times live in the simulator above; a sketch holds no number, so
 * it does not change with them (FIGURE-DESIGN 1B).
 */

import { Figure } from "@/components/figures/Figure";
import { TIRED_FRAME as F, boxHeight, boxWidth, bracketPath, ends, gapClear, labelSpots, phaseSpans, tirednessLines, withNumber, wrap } from "@/components/figures/tiredness-layout";
import { Label, SketchPath, SketchTag, assertSketch, sketchLabel } from "@/components/figures/primitives";
import { FONT, MUTED, ON_SIGNAL_FILL, SIGNAL_FILL, type Evidence } from "@/components/figures/shared";
import { assertEvidence } from "@/lib/content/figures";
import type { ResolvedSketch } from "@/lib/content/types";
import type { FigureProps } from "../../registry";

interface Num { n: number; ref: string }
interface Params {
  title: string;
  tiredness: ResolvedSketch;
  day: { wake: string; bed: string };
  doses: { times: Num[]; lead: string; amount: { text: string; ref: string }; rest: string };
  recording: { lead: string; hours: Num; rest: string };
  phases: [string, string, string];
  found: Evidence & { title: string; finding: string; who: { lead: string; from: Num; to: Num; rest: string } };
}

export default function HiddenTiredness({ params, alt, glance }: FigureProps) {
  const p = params as unknown as Params;
  assertSketch(p.tiredness);
  assertEvidence(p.found.kind, p.found.fact);
  const full = !glance;
  const doses = p.doses.times.map((t) => t.n);
  const gapWords = sketchLabel(p.tiredness, "gap");
  const t = tirednessLines(doses, p.recording.hours.n, gapClear(doses, p.recording.hours.n, gapWords));
  const { day } = t;
  const { wakeX, bedX } = ends(day);
  const spot = labelSpots(t);

  const findingLines = wrap(p.found.finding, boxWidth());
  const whoLines = full ? wrap(`${p.found.who.lead} ${p.found.who.from.n} to ${p.found.who.to.n} ${p.found.who.rest}`, boxWidth(), F.small) : [];
  const boxLines = [p.found.title, ...findingLines, ...whoLines];
  const boxTop = full ? F.box : F.phases;
  const height = boxTop + boxHeight(boxLines.length);

  return (
    <Figure title={p.title} desc={alt} height={height}>
      <Label x={wakeX} y={F.title} tone="muted" size={F.size} bold>{sketchLabel(p.tiredness, "panel")}</Label>

      {/* The sketch: sleep pressure and how tired you feel, wake to bed only. */}
      <SketchPath sketch={p.tiredness} d={t.hatch} ink="line" width={1} />
      <SketchPath sketch={p.tiredness} d={t.pressure} ink="ink" width={F.stroke} />
      <SketchPath sketch={p.tiredness} d={t.felt} ink="muted" width={F.stroke} />
      <Label x={spot.pressure.x} y={spot.pressure.y} anchor="end" size={F.size}>{sketchLabel(p.tiredness, "pressure")}</Label>
      <Label x={spot.felt.x} y={spot.felt.y} tone="muted" size={F.size}>{sketchLabel(p.tiredness, "felt")}</Label>
      <g transform={spot.gap.rotate}><Label x={spot.gap.x} y={spot.gap.baseline} anchor="middle" size={F.size} bold>{gapWords}</Label></g>
      {full ? <Label x={spot.narrows.x} y={spot.narrows.y} anchor="end" size={F.small} tone="muted" lines={wrap(sketchLabel(p.tiredness, "narrows"), spot.narrowsWidth, F.small)} /> : null}

      {/* The day: wake, the study's three doses, bed. Positions from the paper's own times. */}
      <line x1={wakeX} x2={bedX} y1={F.axis} y2={F.axis} stroke={MUTED} strokeWidth={1} />
      {doses.map((m, i) => <line key={i} x1={day.x(m)} x2={day.x(m)} y1={F.axis - F.tick} y2={F.axis + F.tick} stroke={MUTED} strokeWidth={1.5} data-dose={m} />)}
      <line x1={bedX} x2={bedX} y1={F.top} y2={F.axis + F.tick} stroke={MUTED} strokeWidth={1} data-bed />
      <Label x={wakeX} y={F.marks} tone="muted" size={F.small}>{p.day.wake}</Label>
      <Label x={bedX} y={F.marks} anchor="end" tone="muted" size={F.small}>{p.day.bed}</Label>
      {full ? (
        <>
          <Label x={wakeX} y={F.doses} tone="muted" size={F.small}>{`${p.doses.lead} ${p.doses.amount.text}, ${p.doses.rest}`}</Label>
          {phaseSpans(doses, p.recording.hours.n).map((s, i) => (
            <g key={i} data-phase={p.phases[i]}>
              <path d={bracketPath(s.x1, s.x2)} fill="none" stroke={MUTED} strokeWidth={1} />
              <Label x={s.mid} y={F.phases} anchor="middle" tone="muted" size={F.small}>{p.phases[i]}</Label>
            </g>
          ))}
          <Label x={bedX} y={F.recording} anchor="end" tone="muted" size={F.small}>{withNumber(p.recording.lead, p.recording.hours.n, p.recording.rest)}</Label>
          <SketchTag sketch={p.tiredness} x={wakeX} y={F.tag} size={F.small} />
        </>
      ) : (
        <>
          <SketchTag sketch={p.tiredness} x={wakeX} y={F.marks + F.line} size={F.small} />
          {glance?.x ? <Label x={bedX} y={F.marks + F.line} anchor="end" tone="muted" size={F.small}>{`${glance.x} →`}</Label> : null}
        </>
      )}

      {/* The result box: what the study found, on its own, touching no line. */}
      <g data-evidence={p.found.kind} data-fact={p.found.fact.id}>
        <rect x={0} y={boxTop} width={F.right} height={boxHeight(boxLines.length)} rx={10} fill={SIGNAL_FILL} data-band />
        <text x={F.boxPad} y={boxTop + F.boxPad + F.size} fill={ON_SIGNAL_FILL} fontSize={F.size} fontFamily={FONT} fontWeight={F.strong}>
          {boxLines.map((line, i) => <tspan key={i} x={F.boxPad} dy={i ? F.line : 0} fontWeight={i && i <= findingLines.length ? F.strong : F.regular}>{line}</tspan>)}
        </text>
      </g>
    </Figure>
  );
}
