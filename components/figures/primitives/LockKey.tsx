import { assertEvidence } from "@/lib/content/figures";
import { ACCENT, BG, INK, MUTED, strokeOf, type Evidence } from "../shared";

/** A key pointing left, its tip at (tipX, mid). The real key has teeth; the blank has none. */
function Key({ tipX, mid, size, real, faint = false }: { tipX: number; mid: number; size: number; real: boolean; faint?: boolean }) {
  return (
    <g opacity={faint ? 0.55 : 1}>
      <line x1={tipX} x2={tipX + size * 0.9} y1={mid} y2={mid} stroke={real ? INK : MUTED} strokeWidth={3} strokeLinecap="round" />
      {real ? (
        <path d={`M ${tipX + 6} ${mid} v 7 M ${tipX + 13} ${mid} v 5 M ${tipX + 20} ${mid} v 7`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      ) : null}
      <circle cx={tipX + size * 0.9 + 8} cy={mid} r={8} fill={BG} stroke={real ? INK : MUTED} strokeWidth={3} />
    </g>
  );
}

/**
 * A lock with a key in it, and optionally a second key left outside.
 *   key "real"         the body's own key: its teeth match, the lock is open
 *   key "placeholder"  a blank that fits the slot and turns nothing: the lock stays shut
 * `shutOut` draws the real key waiting outside a lock that is already occupied.
 */
export function LockKey({ x, y, size = 44, keyIn, shutOut = false, kind, fact }: {
  x: number; y: number; size?: number; keyIn: "real" | "placeholder"; shutOut?: boolean;
} & Evidence) {
  assertEvidence(kind, fact);
  const measured = kind === "measured";
  const open = keyIn === "real";
  const body = { fill: measured ? ACCENT : BG, stroke: INK, strokeWidth: 1.75, ...strokeOf(kind) };
  const w = size;
  const h = size * 0.8;
  const top = y + size * 0.45;
  const mid = top + h / 2;
  return (
    <g data-evidence={kind} data-fact={fact.id}>
      {/* The shackle: swung open when the real key is in, closed otherwise. */}
      <path
        d={open
          ? `M ${x + w * 0.25} ${top} v ${-size * 0.2} a ${w * 0.25} ${w * 0.25} 0 0 1 ${w * 0.5} ${-size * 0.12}`
          : `M ${x + w * 0.25} ${top} v ${-size * 0.18} a ${w * 0.25} ${w * 0.25} 0 0 1 ${w * 0.5} 0 v ${size * 0.18}`}
        fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round"
      />
      <rect x={x} y={top} width={w} height={h} rx={7} {...body} />
      <circle cx={x + w * 0.5} cy={mid} r={4} fill={INK} />
      <Key tipX={x + w * 0.5} mid={mid} size={size} real={open} />
      {shutOut ? <Key tipX={x + w * 0.5 + size * 1.55} mid={mid} size={size} real faint /> : null}
    </g>
  );
}
