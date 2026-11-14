/**
 * "Start on": which screen the app opens on, the feed (default) or the Life
 * Game. A per-device convenience like the theme, so it lives in localStorage
 * and never goes to the server.
 *
 * It applies once per visit, when the app opens at "/". After that "/" is the
 * feed, so the Feed tab always works.
 */

export type StartChoice = "feed" | "game";

export const START_KEY = "sd-start";
export const STARTED_KEY = "sd-started";

export function readStartChoice(): StartChoice {
  try {
    return localStorage.getItem(START_KEY) === "game" ? "game" : "feed";
  } catch {
    return "feed";
  }
}

export function saveStartChoice(choice: StartChoice): void {
  try {
    if (choice === "feed") localStorage.removeItem(START_KEY);
    else localStorage.setItem(START_KEY, choice);
  } catch {
    // Private windows may refuse storage; the app then opens on the feed.
  }
}

/** Runs in <head> before the page paints: the first load of a visit at "/" goes to /today when chosen. */
export const START_BOOT_SCRIPT = `(function(){try{var f=sessionStorage.getItem(${JSON.stringify(STARTED_KEY)});sessionStorage.setItem(${JSON.stringify(STARTED_KEY)},"1");if(!f&&location.pathname==="/"&&localStorage.getItem(${JSON.stringify(START_KEY)})==="game")location.replace("/today")}catch(e){}})()`;
