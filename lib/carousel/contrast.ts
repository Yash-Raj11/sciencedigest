/**
 * Contrast as drawn (owner's carousel design technique, 2026-11-20): every look must be readable on
 * a phone. WCAG 2 relative luminance; pure, no imports, so the parity script and the tests share it.
 *
 *   text on the ground (ink, muted, the orange used for words and numbers)   at least 4.5:1
 *   a label on the orange fill (the "Link in bio" button, 32 px bold)       at least 3:1 (large text)
 */

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text: 4.5:1. Large text (24 px and up, or bold from about 19 px): 3:1. */
export const CONTRAST = { text: 4.5, large: 3 } as const;

/** The pairs a slide draws as words, with the ratio each must reach. */
const PAIRS: [fg: string, bg: string, min: number, what: string][] = [
  ["ink", "bg", CONTRAST.text, "headings and body text"],
  ["muted", "bg", CONTRAST.text, "muted labels and the source line"],
  ["signal-evidence-text", "bg", CONTRAST.text, "orange words, numbers and the measured line"],
  ["on-signal-evidence-fill", "signal-evidence-fill", CONTRAST.large, "the button label on the orange fill"],
];

export function contrastProblems(palette: Record<string, string>, look: string): string[] {
  return PAIRS.flatMap(([fg, bg, min, what]) => {
    const ratio = contrast(palette[fg], palette[bg]);
    return ratio >= min ? [] : [`${look}: ${what} (--${fg} ${palette[fg]} on --${bg} ${palette[bg]}) is ${ratio.toFixed(2)}:1; it needs ${min}:1`];
  });
}
