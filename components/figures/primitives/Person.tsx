/**
 * A plain standing outline: a head and a body. The same in every column, with no age or health
 * cues, so the drawing caricatures nobody; the label beside it carries the fact.
 */

import { MUTED } from "../shared";

export function Person({ x, y, height }: { x: number; y: number; height: number }) {
  const head = height * 0.13;
  const shoulders = height * 0.2;
  const cx = x;
  const neck = y + head * 2.2;
  return (
    <g fill="none" stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" data-person>
      <circle cx={cx} cy={y + head} r={head} />
      <path d={`M ${cx - shoulders} ${y + height * 0.62} V ${neck + head * 0.6} Q ${cx - shoulders} ${neck} ${cx - shoulders * 0.4} ${neck} H ${cx + shoulders * 0.4} Q ${cx + shoulders} ${neck} ${cx + shoulders} ${neck + head * 0.6} V ${y + height * 0.62}`} />
      <path d={`M ${cx - shoulders * 0.55} ${y + height * 0.5} V ${y + height}`} />
      <path d={`M ${cx + shoulders * 0.55} ${y + height * 0.5} V ${y + height}`} />
    </g>
  );
}
