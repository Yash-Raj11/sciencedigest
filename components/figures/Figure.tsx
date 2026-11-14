/**
 * The frame every figure is drawn in: one SVG, 320 units wide, that scales to
 * the column and never past 360 px. It carries the <title> and <desc> a screen
 * reader announces. A figure does not animate in: motion is kept for measured
 * change (amendment B to step 2D). A figure with buttons in it is a group, not
 * an image, so a screen reader can reach them.
 */

import { useId, type ReactNode } from "react";

export function Figure({ title, desc, height, interactive = false, children }: { title: string; desc: string; height: number; interactive?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <svg
      viewBox={`0 0 320 ${height}`} role={interactive ? "group" : "img"} aria-labelledby={`${id}-t ${id}-d`}
      className="mx-auto block w-full max-w-[360px]" data-figure
    >
      <title id={`${id}-t`}>{title}</title>
      <desc id={`${id}-d`}>{desc}</desc>
      {children}
    </svg>
  );
}
