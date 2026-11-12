/**
 * Sends the queue to the server and brings the server's copy back.
 *
 * Demo mode (no Supabase configured): there is nowhere to send anything. The
 * queue is emptied and the device's saved copy is the only copy.
 *
 * With Supabase:
 *   - The first write signs the visitor in ANONYMOUSLY. They get a real user
 *     id from the first tap, so their rows exist from day zero and "sign up"
 *     later is just attaching an email to the same user. Nothing to merge.
 *   - Writes are sent oldest first. One the server will never accept is
 *     dropped and reported as an error (never silently); anything else, a
 *     network failure or a 409 included, pauses the queue and retries.
 *   - A write the server has refused "for now" (StuckWrite: a 409, or a
 *     function the database does not have yet) HOLD_AFTER times in a row is
 *     set aside on the held list, with every queued write about the same
 *     thing, and the queue goes on. Held writes are never deleted. They are
 *     tried again when the app opens, when the tab is looked at again, after
 *     every successful sync, once an hour, and on "Try again" (Me).
 *   - After a pull, unsent writes (held and queued) are replayed on top of
 *     the server's copy.
 */

import { CaptchaUnavailable, captchaEnabled, getCaptchaToken } from "../captcha/turnstile";
import { localToday } from "../dates";
import { RejectedWrite, StuckWrite, fetchProfile, pull, push } from "../supabase/remote";
import { isDemo, supabase } from "../supabase/client";
import { HOLD_AFTER, hold, reconcile, related, type Write } from "./reduce";
import { store } from "./index";

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 2000;
const MAX_DELAY = 60000;
/** Invisible CAPTCHA failures in a row; at 2 the Me tab offers the visible check once. */
let captchaFailures = 0;
const VISIBLE_CHECK_AFTER = 2;
/** The write at the head of the queue that the server last refused "for now", and how many times in a row. */
let stuck: { write: Write | null; times: number } = { write: null, times: 0 };
const HELD_RETRY_MS = 60 * 60 * 1000;

/**
 * Returns the signed-in user's id, signing in anonymously on the first write.
 * Demo mode: null. Someone already signed in never sees a CAPTCHA.
 */
export async function ensureUser(): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  const existing = (await db.auth.getSession()).data.session?.user;
  if (existing) return existing.id;
  // CAPTCHA: with NEXT_PUBLIC_TURNSTILE_SITE_KEY set, the invisible Turnstile
  // widget supplies a token and Supabase checks it (when CAPTCHA protection is
  // on in its dashboard). With no site key, the token is undefined and sign-in
  // works as before. If the check cannot run, nothing is sent: the caller keeps
  // the queue and retries. Tested in sync.test.ts.
  const captchaToken = await getCaptchaToken();
  if (captchaEnabled && !captchaToken) throw new CaptchaUnavailable();
  const { data, error } = await db.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
  if (error && /captcha/i.test(error.message)) throw new CaptchaUnavailable(error.message);
  if (error || !data.user) throw new Error(error?.message ?? "anonymous sign-in failed");
  captchaFailures = 0;
  return data.user.id;
}

async function refreshSession(): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  const user = (await db.auth.getSession()).data.session?.user;
  if (!user) return null;
  const profile = await fetchProfile(db, user.id);
  store.setState({
    session: { userId: user.id, anonymous: user.is_anonymous ?? false, email: user.email ?? null, tier: profile?.tier ?? "free" },
  });
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (profile && deviceZone && profile.timezone !== deviceZone) {
    await db.from("user_profiles").update({ timezone: deviceZone }).eq("id", user.id);
  }
  return user.id;
}

export async function flush(): Promise<void> {
  if (flushing) return;
  if (isDemo) {
    if (store.getState().queue.length > 0) store.setState({ queue: [] });
    return;
  }
  if (store.getState().queue.length === 0) return;

  flushing = true;
  const setSync = (patch: Partial<ReturnType<typeof store.getState>["sync"]>) =>
    store.setState((s) => ({ sync: { ...s.sync, ...patch } }));
  setSync({ status: "syncing" });

  try {
    const userId = await ensureUser();
    const db = supabase();
    if (!userId || !db) return;
    if (store.getState().session.userId !== userId) await refreshSession();

    // A write the server refuses for good is taken off the queue (or it would
    // hold up everything behind it), but never silently: the run ends as an
    // error with the reason, not "Everything is saved". Anything else, a 409
    // included, stops the run with the write still queued (remote.ts decides).
    let refused: string | null = null;
    let setAside = false;
    while (store.getState().queue.length > 0) {
      const next = store.getState().queue[0];
      try {
        await push(db, userId, next);
      } catch (error) {
        if (error instanceof StuckWrite) {
          // Only an answer from the server about this very write counts. No
          // network, a failed CAPTCHA or a sign-in problem never get here.
          stuck = { write: next, times: stuck.write === next ? stuck.times + 1 : 1 };
          if (stuck.times < HOLD_AFTER) throw error; // pause and retry, as before
          stuck = { write: null, times: 0 };
          setAside = true;
          const { code } = error;
          store.setState((s) => hold({ queue: s.queue, held: s.held }, next, code, new Date().toISOString()));
          continue; // the queue goes on without it
        }
        if (!(error instanceof RejectedWrite)) throw error;
        refused = `The server did not accept a change, so it was not saved (${error.message}).`;
      }
      // Drop exactly the write that was sent; newer writes may have been added meanwhile.
      store.setState((s) => ({ queue: s.queue.filter((w) => w !== next) }));
    }
    retryDelay = 2000;
    if (refused) setSync({ status: "error", lastError: refused });
    else setSync({ status: "idle", lastSyncedAt: new Date().toISOString() });
    // The server just took writes: a good moment to offer it the held ones
    // again (not in the run that set one aside; it was refused a moment ago).
    if (!setAside && store.getState().held.length > 0) void retryHeld();
  } catch (error) {
    // A CAPTCHA that could not run is treated like a lost connection: the ticks
    // are safe on the device, nothing to alarm anyone about, try again later.
    const captcha = error instanceof CaptchaUnavailable;
    if (captcha) {
      captchaFailures += 1;
      if (captchaFailures >= VISIBLE_CHECK_AFTER && store.getState().humanCheck === "none") {
        store.setState({ humanCheck: "needed" });
      }
    }
    const offline = captcha || (typeof navigator !== "undefined" && !navigator.onLine);
    setSync({ status: offline ? "offline" : "error", lastError: (error as Error).message });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => void flush(), retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
  } finally {
    flushing = false;
  }
}

let retrying = false;

/**
 * Offers the held writes to the server again, oldest first. One it takes
 * leaves the list. One it refuses stays, with the new reason, and everything
 * behind it about the same thing is skipped this time, so order is kept. If
 * the server cannot be reached at all, the list is left exactly as it is.
 */
export async function retryHeld(): Promise<void> {
  if (retrying || isDemo || store.getState().held.length === 0) return;
  retrying = true;
  try {
    const userId = await ensureUser();
    const db = supabase();
    if (!userId || !db) return;
    const tried = new Set<Write>();
    const refused: Write[] = [];
    for (;;) {
      // Read the list afresh each time: a tap during a send may have added to it.
      const entry = store.getState().held.find((h) => !tried.has(h.write) && !refused.some((r) => related(r, h.write)));
      if (!entry) break;
      tried.add(entry.write);
      try {
        await push(db, userId, entry.write);
        store.setState((s) => ({ held: s.held.filter((h) => h.write !== entry.write) }));
      } catch (error) {
        if (!(error instanceof StuckWrite) && !(error instanceof RejectedWrite)) return;
        refused.push(entry.write);
        const code = error instanceof StuckWrite ? error.code : (/^\w+/.exec(error.message)?.[0] ?? entry.code);
        store.setState((s) => ({ held: s.held.map((h) => (h.write === entry.write ? { ...h, code } : h)) }));
      }
    }
  } catch {
    // Sign-in or the CAPTCHA could not run: nothing was sent, nothing changes.
  } finally {
    retrying = false;
  }
}

/** Reads the server's copy and replays unsent writes on top of it. */
export async function refresh(): Promise<void> {
  const db = supabase();
  if (!db) return;
  try {
    const userId = await refreshSession();
    if (!userId) return;
    await flush();
    await retryHeld();
    const server = await pull(db, userId, localToday());
    store.setState((s) => ({ data: reconcile(server, s.queue, s.held) }));
  } catch (error) {
    store.setState((s) => ({ sync: { ...s.sync, status: "error", lastError: (error as Error).message } }));
  }
}

let started = false;

/** Called once from <StoreBoot/> after the saved state has loaded. */
export function startSync(): () => void {
  if (started) return () => {};
  started = true;

  let debounce: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.queue === previous.queue || state.queue.length === 0) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void flush(), isDemo ? 0 : 400);
  });

  const onOnline = () => void flush();
  // Coming back to the tab reads the server's copy, which also retries the held writes.
  const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
  const onFocus = () => void retryHeld();
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisible);
  const hourly = setInterval(() => void retryHeld(), HELD_RETRY_MS);

  const auth = supabase()?.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "SIGNED_OUT") void refreshSession();
  });

  void (isDemo ? flush() : refresh());

  return () => {
    unsubscribe();
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onFocus);
    clearInterval(hourly);
    document.removeEventListener("visibilitychange", onVisible);
    auth?.data.subscription.unsubscribe();
    started = false;
  };
}

/** Attaches an email to the current (anonymous) user. Same user id, so nothing to merge. */
export async function linkEmail(email: string): Promise<{ ok: boolean; message: string }> {
  const db = supabase();
  if (!db) return { ok: false, message: "This copy of the app is not connected to a database yet." };
  try {
    await ensureUser();
    const { error } = await db.auth.updateUser({ email });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Check ${email} for a confirmation link.` };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}
