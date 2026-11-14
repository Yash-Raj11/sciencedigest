import { glanceAxes, GLANCE_FRAME } from "../glance-layout";
import type { Frame } from "../decay-layout";
import { INK } from "../shared";
import { Label } from "./Label";

/**
 * The glance view's axes (owner, 2026-11-14): two lines and two labels in words, no ticks and
 * no values. The y label sits over the left axis, the x label under the right end with an
 * arrow, so both read left to right at phone width.
 */
export function GlanceAxes({ x, y, frame = GLANCE_FRAME, left = true }: { x: string; y?: string | null; frame?: Frame; left?: boolean }) {
  const a = glanceAxes(frame);
  return (
    <g data-glance-axes>
      {left ? <line x1={a.left} x2={a.left} y1={a.top} y2={a.bottom} stroke={INK} strokeWidth={1.5} /> : null}
      <line x1={a.left} x2={a.right} y1={a.bottom} y2={a.bottom} stroke={INK} strokeWidth={1.5} />
      {y ? <Label x={a.yLabel.x} y={a.yLabel.y} tone="muted" size={GLANCE_FRAME.size}>{y}</Label> : null}
      <Label x={a.xLabel.x} y={a.xLabel.y} anchor="end" tone="muted" size={GLANCE_FRAME.size}>{`${x} →`}</Label>
    </g>
  );
}
