/**
 * Reads the colour tokens of one theme block of app/globals.css, e.g. the `--bg` line inside
 * `[data-theme="dark"] { ... }`. Pure: takes the stylesheet's text, returns name → value.
 */
export function themeTokens(css: string, theme: string): Record<string, string> {
  const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(css);
  if (!block) return {};
  const out: Record<string, string> = {};
  for (const m of block[1].matchAll(/--([a-z-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim().toLowerCase();
  return out;
}
