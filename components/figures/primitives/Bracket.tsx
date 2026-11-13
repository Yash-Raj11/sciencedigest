import { MUTED } from "../shared";
import { Label } from "./Label";

/** A span with a name: "these belong together". It has no head, so it claims no direction. */
export function Bracket({ x1, x2, y, side = "above", lines }: { x1: number; x2: number; y: number; side?: "above" | "below"; lines: string[] }) {
  const tip = side === "above" ? 6 : -6;
  const text = side === "above" ? y - 7 - (lines.length - 1) * 14 : y + 17;
  return (
    <g>
      <path d={`M ${x1} ${y + tip} V ${y} H ${x2} V ${y + tip}`} fill="none" stroke={MUTED} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <Label x={(x1 + x2) / 2} y={text} anchor="middle" size={11.5} bold lines={lines} />
    </g>
  );
}
