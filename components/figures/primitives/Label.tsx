import type { ReactNode } from "react";
import { ACCENT_TEXT, BG, FONT, INK, MUTED } from "../shared";

const FILL = { ink: INK, muted: MUTED, accent: ACCENT_TEXT, onInk: BG };

/** One line of text. `lines` stacks several, since SVG text does not wrap. */
export function Label({ x, y, anchor = "start", tone = "ink", size = 12, bold = false, lines, children }: {
  x: number; y: number; anchor?: "start" | "middle" | "end"; tone?: keyof typeof FILL; size?: number; bold?: boolean;
  lines?: string[]; children?: ReactNode;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill={FILL[tone]} fontSize={size} fontWeight={bold ? 500 : 400} fontFamily={FONT}>
      {lines ? lines.map((line, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : size * 1.25}>{line}</tspan>) : children}
    </text>
  );
}
