import { assertEvidence } from "@/lib/content/figures";
import { BG, INK, strokeOf, type Evidence } from "../shared";

/**
 * A claim that one thing leads to another. Solid with a filled head when the
 * paper measured it; dashed with an open head when the authors propose it.
 * There is no arrow without evidence: `kind` and `fact` are both required.
 */
export function Arrow({ x1, y1, x2, y2, kind, fact }: { x1: number; y1: number; x2: number; y2: number } & Evidence) {
  assertEvidence(kind, fact);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 7;
  const at = (turn: number) => `${x2 - head * Math.cos(angle + turn)},${y2 - head * Math.sin(angle + turn)}`;
  // The line stops short of the tip so a dashed line never pokes through an open head.
  const bx = x2 - head * 0.85 * Math.cos(angle);
  const by = y2 - head * 0.85 * Math.sin(angle);
  return (
    <g data-evidence={kind} data-fact={fact.id}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={INK} strokeWidth={1.75} strokeLinecap="round" {...strokeOf(kind)} />
      <polygon points={`${x2},${y2} ${at(0.5)} ${at(-0.5)}`} fill={kind === "measured" ? INK : BG} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
}
