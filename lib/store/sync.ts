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
 *     dropped and reported; a network failure pauses the queue and retries.
 *   - After a pull, unsent writes are replayed on top of the server's copy.
 */

import { localToday } from "../dates";
import { RejectedWrite, fetchProfile, pull, push } from "../supabase/remote";
import { isDemo, supabase } from "../supabase/client";
import { reconcile } from "./reduce";
import { store } from "./index";

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 2000;
const MAX_DELAY = 60000;

async function ensureUser(): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  const existing = (await db.auth.getSession()).data.session?.user;
  if (existing) return existing.id;
  // If CAPTCHA protection is on in Supabase (it should be, before launch), pass
  // the widget's token here: signInAnonymously({ options: { captchaToken } }).
  const { data, error } = await db.auth.signInAnonymously();
  if (error || !data.user) throw new Error(error?.message ?? "anonymous sign-in failed");
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

    while (store.getState().queue.length > 0) {
      const next = store.getState().queue[0];
      try {
        await push(db, userId, next);
      } catch (error) {
        if (!(error instanceof RejectedWrite)) throw error;
        setSync({ lastError: error.message });
      }
      // Drop exactly the write that was sent; newer writes may have been added meanwhile.
      store.setState((s) => ({ queue: s.queue.filter((w) => w !== next) }));
    }
    retryDelay = 2000;
    setSync({ status: "idle", lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    setSync({ status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error", lastError: (error as Error).message });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => void flush(), retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
  } finally {
    flushing = false;
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
    const server = await pull(db, userId, localToday());
    store.setState((s) => ({ data: reconcile(server, s.queue) }));
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
  const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);

  const auth = supabase()?.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "SIGNED_OUT") void refreshSession();
  });

  void (isDemo ? flush() : refresh());

  return () => {
    unsubscribe();
    window.removeEventListener("online", onOnline);
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
