/**
 * FIGURE-DESIGN 3A, "three different crowds": where the columns go and the words under each
 * figure. Figures hold no number of their own (the figure guard), so the frame, the rounding
 * into plain fractions and the line breaks live here. Pure.
 */

import { textWidth } from "./interval-layout";

export const CROWDS_FRAME = { left: 4, col: 100, gap: 10, span: 16, title: 40, strip: 48, person: 68, personHeight: 62, ageLabel: 150, age: 168, fact: 190, size: 12, line: 15, height: 270 };

export function crowdColumns(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const x = CROWDS_FRAME.left + i * (CROWDS_FRAME.col + CROWDS_FRAME.gap);
    return { x, width: CROWDS_FRAME.col, mid: x + CROWDS_FRAME.col / 2 };
  });
}

const printed = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 6 });

/**
 * A printed share as a plain fraction: "Half", "1 in 5", "About 1 in 15". "About" whenever the
 * fraction is not within a tenth of the printed share's own "1 in n".
 */
export function plainFraction(percent: number): string {
  const n = 100 / percent;
  const whole = Math.round(n);
  if (whole === 2 && Math.abs(percent - 50) <= 1.5) return "Half";
  return `${Math.abs(n - whole) <= 0.1 ? "" : "About "}1 in ${whole}`;
}

/** The fact line under a column: the first says the whole phrase, the rest "did"; the exact share follows. */
export function mobilityLine(percent: number, words: string, first: boolean): string {
  return `${plainFraction(percent)} ${first ? words : "did"} (${printed(percent)}%)`;
}

/** Break a label into lines that fit a column at the label size. */
export function wrapLines(text: string, width = CROWDS_FRAME.col, size = CROWDS_FRAME.size): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && textWidth(`${last} ${word}`, size) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

export const ageWords = (age: number) => printed(age);
