/**
 * Small drawn objects for a "from the mouth to the blood" chain (FIGURE-DESIGN 2A): a meal on a
 * plate, a tongue in side view with one sensor bump, a loop of gut with a signal drop, a blood
 * vessel in cross-section with sugar cubes. Each fills a box (x, y, w, h).
 *
 * They are pictures, not data: no size, count or position here means a quantity. A pictogram
 * that stands for a step the authors propose is drawn dashed in `--meta` (`dashed`); the figure
 * wraps it in a group that names the fact (data-evidence, data-fact).
 */

import { DASH, INK, LINE, META } from "../shared";

interface Box { x: number; y: number; w: number; h: number }

const stroke = (dashed: boolean) => (dashed ? { stroke: META, strokeDasharray: DASH } : { stroke: INK });

/** A fried egg on a plate; `specks` adds the dark flecks of ground pepper. */
export function Plate({ x, y, w, h, specks = false }: Box & { specks?: boolean }) {
  const cx = x + w / 2;
  const cy = y + h * 0.6;
  const flecks = [[-0.2, -0.05], [-0.08, 0.1], [0.05, -0.12], [0.2, 0.06], [-0.28, 0.08], [0.12, 0.14], [0.27, -0.06]];
  return (
    <g data-pictogram="plate">
      <ellipse cx={cx} cy={cy} rx={w * 0.48} ry={h * 0.3} fill="none" stroke={INK} strokeWidth={1.5} />
      <path
        d={`M ${cx - w * 0.3} ${cy} C ${cx - w * 0.32} ${cy - h * 0.2} ${cx - w * 0.05} ${cy - h * 0.24} ${cx + w * 0.08} ${cy - h * 0.16}
            C ${cx + w * 0.3} ${cy - h * 0.2} ${cx + w * 0.34} ${cy + h * 0.06} ${cx + w * 0.16} ${cy + h * 0.14}
            C ${cx} ${cy + h * 0.22} ${cx - w * 0.28} ${cy + h * 0.16} ${cx - w * 0.3} ${cy} Z`}
        fill="none" stroke={INK} strokeWidth={1.25}
      />
      <circle cx={cx + w * 0.02} cy={cy - h * 0.02} r={h * 0.1} fill={INK} />
      {specks ? flecks.map(([dx, dy], i) => <circle key={i} cx={cx + dx * w} cy={cy + dy * h} r={1.3} fill={INK} data-speck />) : null}
    </g>
  );
}

/** A tongue in side view with one sensor bump; `lit`: the bump switched on (short rays). */
export function Tongue({ x, y, w, h, lit = false, dashed = false }: Box & { lit?: boolean; dashed?: boolean }) {
  const bx = x + w * 0.55;
  const by = y + h * 0.36;
  return (
    <g data-pictogram="tongue">
      <path
        d={`M ${x + w * 0.08} ${y + h * 0.78} C ${x + w * 0.1} ${y + h * 0.4} ${x + w * 0.35} ${y + h * 0.34} ${x + w * 0.6} ${y + h * 0.4}
            C ${x + w * 0.92} ${y + h * 0.46} ${x + w * 0.96} ${y + h * 0.7} ${x + w * 0.8} ${y + h * 0.78} Z`}
        fill="none" strokeWidth={1.5} {...stroke(dashed)}
      />
      <circle cx={bx} cy={by} r={h * 0.08} fill="none" strokeWidth={1.5} {...stroke(dashed)} />
      {lit ? [-0.9, 0, 0.9].map((turn) => (
        <line key={turn}
          x1={bx + Math.sin(turn) * h * 0.14} y1={by - Math.cos(turn) * h * 0.14}
          x2={bx + Math.sin(turn) * h * 0.26} y2={by - Math.cos(turn) * h * 0.26}
          strokeWidth={1.5} strokeLinecap="round" {...stroke(dashed)} data-lit />
      )) : null}
    </g>
  );
}

/** A loop of gut; `signal` draws one drop leaving it (a hormone released). */
export function Gut({ x, y, w, h, signal = false, dashed = false }: Box & { signal?: boolean; dashed?: boolean }) {
  const r = h * 0.12;
  const rows = [y + h * 0.25, y + h * 0.25 + 2 * r, y + h * 0.25 + 4 * r];
  const dx = x + w * 0.86;
  const dy = rows[2] + h * 0.18;
  return (
    <g data-pictogram="gut">
      <path
        d={`M ${x + w * 0.06} ${rows[0]} H ${x + w * 0.72} A ${r} ${r} 0 0 1 ${x + w * 0.72} ${rows[1]} H ${x + w * 0.28}
            A ${r} ${r} 0 0 0 ${x + w * 0.28} ${rows[2]} H ${x + w * 0.94}`}
        fill="none" strokeWidth={1.75} strokeLinecap="round" {...stroke(dashed)}
      />
      {signal ? (
        <path d={`M ${dx} ${dy - h * 0.12} Q ${dx + h * 0.08} ${dy} ${dx} ${dy + h * 0.06} Q ${dx - h * 0.08} ${dy} ${dx} ${dy - h * 0.12} Z`}
          fill="none" strokeWidth={1.25} {...stroke(dashed)} data-drop />
      ) : null}
    </g>
  );
}

/** A blood vessel in cross-section with sugar cubes inside. The cubes are not a count. */
export function Vessel({ x, y, w, h, ink = INK }: Box & { ink?: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.44;
  const cube = r * 0.26;
  const at = [[-0.42, -0.2], [0.12, -0.38], [0.28, 0.12], [-0.2, 0.3]];
  return (
    <g data-pictogram="vessel">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={1.75} />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={ink === INK ? LINE : ink} strokeWidth={1} opacity={ink === INK ? 1 : 0.4} />
      {at.map(([px, py], i) => (
        <rect key={i} x={cx + px * r} y={cy + py * r} width={cube} height={cube} rx={1} fill="none" stroke={ink} strokeWidth={1.25} />
      ))}
    </g>
  );
}
