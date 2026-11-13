/**
 * The frame every figure is drawn in: one SVG, 320 units wide, that scales to
 * the column and never past 360 px. It carries the <title> and <desc> a screen
 * reader announces, and the one entrance animation a figure is allowed
 * (`figure-enter` in app/globals.css, switched off under prefers-reduced-motion).
 */

import { useId, type ReactNode } from "react";

export function Figure({ title, desc, height, children }: { title: string; desc: string; height: number; children: ReactNode }) {
  const id = useId();
  return (
    <svg
      viewBox={`0 0 320 ${height}`} role="img" aria-labelledby={`${id}-t ${id}-d`}
      className="figure-enter mx-auto block w-full max-w-[360px]" data-figure
    >
      <title id={`${id}-t`}>{title}</title>
      <desc id={`${id}-d`}>{desc}</desc>
      {children}
    </svg>
  );
}
