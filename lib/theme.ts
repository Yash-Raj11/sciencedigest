/**
 * The theme choice (owner, 2026-11-15): System (default: follows the device between dark and
 * light), Dark, Light, or Bedtime (warm and low-glare, for reading at night).
 *
 * The choice is a per-device convenience, so it lives in localStorage and never goes to the
 * server. The colours themselves are in app/globals.css.
 */

export type ThemeChoice = "system" | "light" | "dark" | "bedtime";
export type Theme = Exclude<ThemeChoice, "system">;

export const THEME_KEY = "sd-theme";
const SAVED: readonly string[] = ["light", "dark", "bedtime"];

export function readThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved !== null && SAVED.includes(saved) ? (saved as Theme) : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(choice: ThemeChoice): Theme {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Private windows may refuse storage; the theme still applies for this visit.
  }
  const theme = resolveTheme(choice);
  document.documentElement.dataset.theme = theme;
  // The browser chrome follows the page (an installed app cannot read a CSS variable).
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => { meta.content = PAGE_COLOUR[theme]; });
}

/** Runs in <head> before the page paints, so there is no flash of the wrong theme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});var t=${JSON.stringify(SAVED)}.indexOf(s)>=0?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}})()`;

/**
 * The page colour of each theme, for the browser chrome and the installed app (which cannot
 * read a CSS variable). A copy of --bg in app/globals.css; scripts/visual-system.test.ts
 * fails if they drift apart.
 */
export const PAGE_COLOUR: Record<Theme, string> = { dark: "#090909", light: "#ffffff", bedtime: "#0d0d0c" };
