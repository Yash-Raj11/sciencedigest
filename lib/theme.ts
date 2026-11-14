/**
 * Light / dark theme choice.
 *
 * "system" follows the device. The choice is a per-device convenience, so it
 * lives in localStorage and never goes to the server. The colours themselves
 * are in app/globals.css.
 */

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "sd-theme";

export function readThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
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
  document.documentElement.dataset.theme = resolveTheme(choice);
}

/** Runs in <head> before the page paints, so there is no flash of the wrong theme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}})()`;

/**
 * The page colour of each mode, for the browser chrome and the installed app (which cannot
 * read a CSS variable). A copy of --bg in app/globals.css; scripts/visual-system.test.ts
 * fails if the two drift apart.
 */
export const PAGE_COLOUR = { dark: "#0d0d0c", light: "#faf7f2" } as const;
