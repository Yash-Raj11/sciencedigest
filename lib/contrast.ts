/**
 * WCAG 2 contrast, for the theme tokens in app/globals.css (owner, 2026-11-14: every text
 * token on its surface, both modes, at least 4.5:1). Pure: no React, Next or Supabase.
 */

export type Mode = "light" | "dark";

/** "#rrggbb", or "rgb(r g b / a)" composited over `under` (a hex colour). */
export function solid(colour: string, under?: string): string {
  const hex = colour.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  const m = hex.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/);
  if (!m) throw new Error(`not a colour this checker reads: ${colour}`);
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  const base = under ? channels(solid(under)) : [0, 0, 0];
  const mixed = [1, 2, 3].map((i, k) => Math.round(Number(m[i]) * alpha + base[k] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(solid(a)), luminance(solid(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The custom properties of the light block (`:root, [data-theme="light"]`) and the dark block. */
export function themeTokens(css: string): Record<Mode, Record<string, string>> {
  const block = (selector: RegExp) => {
    const body = css.match(selector)?.[1];
    if (!body) throw new Error(`theme block not found: ${selector}`);
    return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  };
  return {
    light: block(/:root,\s*\[data-theme="light"\]\s*\{([^}]*)\}/),
    dark: block(/\[data-theme="dark"\]\s*\{([^}]*)\}/),
  };
}

/** Every text token, and every surface it is set on. */
export const TEXT_TOKENS = ["ink", "muted", "meta", "accent-text"] as const;
export const SURFACES = ["bg", "surface"] as const;
const NAME: Record<string, string> = {
  ink: "text", muted: "secondary", meta: "meta", "accent-text": "orange text", "accent-ink": "text on orange",
  bg: "page", surface: "card", accent: "orange fill", raised: "raised card", band: "peach band (over the page)",
};

export interface ContrastRow { mode: Mode; text: string; on: string; textValue: string; onValue: string; ratio: number }

/** The table: each text token on the page and on a card, plus text on the orange fill. */
export function contrastTable(css: string): ContrastRow[] {
  const tokens = themeTokens(css);
  const rows: ContrastRow[] = [];
  for (const mode of ["dark", "light"] as const) {
    const t = tokens[mode];
    const pairs: [string, string][] = [
      ...TEXT_TOKENS.flatMap((text) => SURFACES.map((on) => [text, on] as [string, string])),
      ["ink", "raised"], ["muted", "raised"], ["accent-ink", "accent"], ["ink", "band"], ["muted", "band"],
    ];
    for (const [text, on] of pairs) {
      // The band is translucent: measured as it shows, over the page.
      const surface = on === "band" ? solid(t.band, t.bg) : t[on];
      rows.push({ mode, text: NAME[text], on: NAME[on], textValue: t[text], onValue: surface, ratio: contrast(t[text], surface) });
    }
  }
  return rows;
}

export function formatContrastTable(rows: ContrastRow[]): string {
  const lines = ["| Mode | Text | On | Text value | Surface value | Ratio | ≥ 4.5 |", "|---|---|---|---|---|---|---|"];
  for (const r of rows) lines.push(`| ${r.mode} | ${r.text} | ${r.on} | ${r.textValue} | ${r.onValue} | ${r.ratio.toFixed(2)} | ${r.ratio >= 4.5 ? "yes" : "NO"} |`);
  return lines.join("\n");
}
