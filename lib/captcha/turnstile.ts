/**
 * Cloudflare Turnstile, for the one place a visitor needs a CAPTCHA token:
 * the anonymous sign-in on their first tap (`ensureUser()` in lib/store/sync.ts).
 *
 * No site key (local dev, demo mode, or before the Turnstile site exists):
 * `getCaptchaToken()` returns undefined and touches nothing in the page, so
 * sign-in works exactly as before. Supabase only demands a token once CAPTCHA
 * protection is switched on in its dashboard, which must come AFTER the site
 * key is deployed (docs/MANUAL.md, part 10).
 *
 * With a site key: Cloudflare's script is loaded the first time a token is
 * needed, which is the first sync of someone with no session (never on page
 * load, never on a tap, never for someone already signed in). One invisible
 * widget is rendered into a hidden element, and each later token comes from
 * resetting that same widget (tokens are single-use). If the script cannot load
 * or the challenge fails, this resolves undefined rather than hanging; sync then
 * raises CaptchaUnavailable, keeps the queue, shows "offline" and retries. After
 * two such failures the Me tab offers the visible check once (renderVisibleCheck).
 *
 * No npm package: the script is loaded straight from Cloudflare.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_TIMEOUT_MS = 15000;

interface TurnstileOptions {
  sitekey: string;
  execution: "render" | "execute";
  appearance: "always" | "execute" | "interaction-only";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** True when a site key was built into this deployment. */
export const captchaEnabled = SITE_KEY !== undefined;

/**
 * The check that protects sign-in could not run (script blocked, challenge
 * failed, or Supabase refused the token). Nothing is lost: the sync queue keeps
 * every write, reports "offline" and retries with its normal backoff.
 */
export class CaptchaUnavailable extends Error {
  constructor(message = "The check that protects sign-in could not run yet.") {
    super(message);
    this.name = "CaptchaUnavailable";
  }
}

let scriptLoading: Promise<TurnstileApi> | null = null;
let widgetId: string | null = null;
let pending: ((token: string | undefined) => void) | null = null;
/** A token from the visible check on Me, used by the next sign-in. */
let handedToken: string | undefined;

/** The visible check on Me passes its token here; the next getCaptchaToken() returns it. */
export function acceptCheckToken(token: string): void {
  handedToken = token;
}

/**
 * The visible (interactive) check, rendered into a container the Me sheet
 * owns. Only used after the invisible check failed twice. Resolves the token,
 * or undefined if Cloudflare could not be reached or the check failed.
 */
export async function renderVisibleCheck(container: HTMLElement): Promise<string | undefined> {
  if (!SITE_KEY || typeof window === "undefined") return undefined;
  try {
    const api = await loadScript();
    return await new Promise<string | undefined>((resolve) => {
      api.render(container, {
        sitekey: SITE_KEY,
        execution: "render",
        appearance: "always",
        callback: (token) => resolve(token),
        "error-callback": () => resolve(undefined),
        "expired-callback": () => resolve(undefined),
        "timeout-callback": () => resolve(undefined),
      });
    });
  } catch {
    return undefined;
  }
}

function settle(token: string | undefined) {
  const resolve = pending;
  pending = null;
  resolve?.(token);
}

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not start")));
    script.onerror = () => {
      scriptLoading = null; // let the next attempt try again
      reject(new Error("Turnstile could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

function widget(api: TurnstileApi, siteKey: string): string {
  if (widgetId) return widgetId;
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.bottom = "0";
  container.style.left = "0";
  document.body.appendChild(container);
  widgetId = api.render(container, {
    sitekey: siteKey,
    execution: "execute", // no token is made until one is asked for
    appearance: "interaction-only", // invisible unless Cloudflare needs the visitor to click
    callback: (token) => settle(token),
    "error-callback": () => settle(undefined),
    "expired-callback": () => settle(undefined),
    "timeout-callback": () => settle(undefined),
  });
  return widgetId;
}

/**
 * A fresh single-use token, or undefined when CAPTCHA is not configured or the
 * challenge could not be completed.
 */
export async function getCaptchaToken(): Promise<string | undefined> {
  if (!SITE_KEY || typeof window === "undefined") return undefined;
  if (handedToken) {
    const token = handedToken;
    handedToken = undefined; // single-use
    return token;
  }
  try {
    const api = await loadScript();
    const firstRender = widgetId === null;
    const id = widget(api, SITE_KEY);
    settle(undefined); // a caller still waiting gives up its place
    const token = new Promise<string | undefined>((resolve) => {
      pending = resolve;
    });
    if (!firstRender) api.reset(id);
    api.execute(id);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), TOKEN_TIMEOUT_MS);
    });
    try {
      return await Promise.race([token, timeout]);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return undefined;
  }
}
