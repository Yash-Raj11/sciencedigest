import { LINE, SURFACE } from "../shared";
import { Label } from "./Label";

/** A place in the body, drawn as a soft container the other shapes sit inside. */
export function Cell({ x, y, width, height, label }: { x: number; y: number; width: number; height: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={22} fill={SURFACE} stroke={LINE} strokeWidth={1.5} />
      <Label x={x + 16} y={y + 22} size={11} tone="muted">{label}</Label>
    </g>
  );
}
