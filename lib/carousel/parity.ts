/**
 * Parity between what a slide draws and what the rest of the system says (Phase 11, 4B).
 * scripts/verify-parity.mts runs these on every published deck; each returns problems, and an
 * empty list means it holds.
 *
 *   1. tokens: each slide palette is its theme in app/globals.css, value for value (the bright
 *      orange reads the deck-only tokens of the same theme);
 *   2. numbers: every number in a slide's drawn text appears in a passage the slide cites;
 *   3. words: every word of the deck's slide reaches the drawing (nothing dropped by the layout);
 *   4. tree: Satori rules and glyph coverage (render.ts);
 *   5. files: the exported PNGs are the current decks, byte for byte.
 */

import type { CarouselDeck } from "../content/types";
import { numbersIn } from "../pipeline/text";
import { inspectTree } from "./satori-rules";
import { COLOR, COLOR_THEME, SANS } from "./tokens";

/** The colour tokens of one theme block of globals.css, e.g. [data-theme="dark"] { --bg: #0a0a0a; }. */
export function themeTokens(css: string, theme: string): Record<string, string> {
  const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(css);
  if (!block) return {};
  const out: Record<string, string> = {};
  for (const m of block[1].matchAll(/--([a-z-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim().toLowerCase();
  return out;
}

/** `names` maps a palette key to the token it reads when that differs (the deck's bright orange). */
export function tokenProblems(css: string, palette: Record<string, string> = COLOR, theme = COLOR_THEME, names: Record<string, string> = {}): string[] {
  const site = themeTokens(css, theme);
  if (Object.keys(site).length === 0) return [`app/globals.css has no [data-theme="${theme}"] block`];
  return Object.entries(palette).map(([key, value]) => [names[key] ?? key, value] as const).flatMap(([name, value]) =>
    site[name] === undefined ? [`--${name} is not a ${theme} token in app/globals.css`]
      : site[name] !== value.toLowerCase() ? [`--${name}: the slides use ${value}, the site's ${theme} theme uses ${site[name]}`] : []);
}

/** The words the slide shows, in tree order, as drawn. */
export function drawnText(element: unknown): string {
  return inspectTree(element, { family: SANS, weight: 400, style: "normal" }).runs.map((r) => r.text).join(" ");
}

/**
 * Every number drawn on slide `index` must appear in a passage the slide cites (`quotes`: fact id
 * to verbatim passage). The slide's own chrome holds no digits, so nothing is exempt.
 */
export function numberProblems(deck: CarouselDeck, index: number, drawn: string, quotes: Record<string, string>): string[] {
  const slide = deck.slides[index];
  const allowed = slide.refs.flatMap((ref) => (quotes[ref] ? numbersIn(quotes[ref]).map(Math.abs) : []));
  const where = `${deck.slug} slide ${index + 1} (${slide.kind})`;
  const unknown = slide.refs.filter((ref) => !/[:/]/.test(ref) && quotes[ref] === undefined);
  return [
    ...unknown.map((ref) => `${where}: cites "${ref}", which is not a gated fact of this paper`),
    ...[...new Set(numbersIn(drawn).map(Math.abs))].filter((n) => !allowed.includes(n))
      .map((n) => `${where}: draws ${n}, which is in none of the passages it cites (${slide.refs.join(", ") || "none"})`),
  ];
}

/** Every word of the deck's slide (heading, body, art) must be in the drawing. */
export function wordProblems(deck: CarouselDeck, index: number, drawn: string): string[] {
  const slide = deck.slides[index];
  const art = slide.art;
  const parts = [slide.heading, slide.body ?? ""];
  switch (art.motif) {
    case "number": parts.push(art.figure.value, art.figure.unit ?? "", art.figure.label); break;
    case "pair": for (const f of [art.a, art.b]) parts.push(f.value, f.unit ?? "", f.label); break;
    case "day": parts.push(art.start, art.end, art.tail.label, ...art.marks.map((m) => m.label)); break;
    case "verdicts": for (const r of art.rows) parts.push(r.label, r.verdict); break;
    case "plateau": parts.push(art.y, art.axis, art.levels.label, ...[art.from, art.to, art.levels.from, art.levels.to].map(String)); break;
    case "sketch": parts.push(art.a, art.b, art.caption); break;
    case "who": parts.push(...art.tested, ...art.notTested); break;
    case "receipt":
      parts.push(art.strong, art.weak, art.missing ?? "", art.design, art.who);
      if (art.interval) parts.push(art.interval.text.low, art.interval.text.point, art.interval.text.high);
      break;
    case "cta": if (art.day) parts.push(art.day.start, art.day.end, art.day.tail.label, ...art.day.marks.map((m) => m.label)); break;
    default: parts.push(...art.labels);
  }
  const squash = (t: string) => t.replace(/\s+/g, " ").trim();
  const text = squash(drawn);
  return parts.filter(Boolean).filter((p) => !text.includes(squash(p)))
    .map((p) => `${deck.slug} slide ${index + 1}: "${p}" is in the deck but not drawn`);
}
