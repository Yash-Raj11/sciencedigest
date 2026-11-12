import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ensureUser() and flush() talk to Supabase and Turnstile; both are replaced
// here so the tests see exactly what would be sent, and what the store shows.
const h = vi.hoisted(() => {
  class CaptchaUnavailable extends Error {
    constructor(message = "The check that protects sign-in could not run yet.") {
      super(message);
      this.name = "CaptchaUnavailable";
    }
  }
  return {
    db: null as null | { auth: { getSession: ReturnType<typeof vi.fn>; signInAnonymously: ReturnType<typeof vi.fn> } },
    captchaEnabled: false,
    getCaptchaToken: vi.fn<() => Promise<string | undefined>>(),
    push: vi.fn(),
    CaptchaUnavailable,
  };
});

vi.mock("../supabase/client", () => ({
  supabase: () => h.db,
  get isDemo() {
    return h.db === null;
  },
}));
vi.mock("../captcha/turnstile", () => ({
  getCaptchaToken: h.getCaptchaToken,
  get captchaEnabled() {
    return h.captchaEnabled;
  },
  CaptchaUnavailable: h.CaptchaUnavailable,
}));
vi.mock("../supabase/remote", () => ({
  RejectedWrite: class RejectedWrite extends Error {},
  StuckWrite: class StuckWrite extends Error {
    constructor(readonly code: string, message: string) {
      super(`${code}: ${message}`);
    }
  },
  fetchProfile: vi.fn(async () => ({ tier: "free", timezone: "UTC" })),
  pull: vi.fn(),
  push: h.push,
}));
vi.mock("./index", async () => {
  const { createStore } = await import("zustand/vanilla");
  return {
    store: createStore(() => ({
      queue: [] as unknown[],
      held: [] as { write: unknown; code: string; since: string }[],
      sync: { status: "local", lastError: null as string | null, lastSyncedAt: null as string | null },
      session: { userId: null as string | null, anonymous: true, email: null, tier: "free" },
      humanCheck: "none" as "none" | "needed" | "dismissed" | "done",
    })),
  };
});

import { store } from "./index";
import { ensureUser } from "./sync";

function supabaseWith({ session = null as null | { user: { id: string } }, signIn = { data: { user: { id: "new-user" } }, error: null } as unknown } = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      signInAnonymously: vi.fn(async () => signIn),
    },
  };
}

beforeEach(() => {
  h.getCaptchaToken.mockReset();
  h.push.mockReset();
  h.captchaEnabled = false;
});

describe("ensureUser()", () => {
  it("sends the Turnstile token as captchaToken when one is present", async () => {
    h.db = supabaseWith();
    h.captchaEnabled = true;
    h.getCaptchaToken.mockResolvedValue("turnstile-token-123");

    await expect(ensureUser()).resolves.toBe("new-user");
    expect(h.db.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(h.db.auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "turnstile-token-123" } });
  });

  it("no site key (local dev): still signs in, with no captchaToken", async () => {
    h.db = supabaseWith();
    h.getCaptchaToken.mockResolvedValue(undefined);

    await expect(ensureUser()).resolves.toBe("new-user");
    expect(h.db.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    const sent = h.db.auth.signInAnonymously.mock.calls[0]?.[0] as { options?: { captchaToken?: string } } | undefined;
    expect(sent?.options?.captchaToken).toBeUndefined();
  });

  it("demo mode (no Supabase): no sign-in and no CAPTCHA", async () => {
    h.db = null;

    await expect(ensureUser()).resolves.toBeNull();
    expect(h.getCaptchaToken).not.toHaveBeenCalled();
  });

  it("already signed in: returns that user and never asks for a CAPTCHA (no script is loaded)", async () => {
    h.db = supabaseWith({ session: { user: { id: "existing-user" } } });
    h.captchaEnabled = true;

    await expect(ensureUser()).resolves.toBe("existing-user");
    expect(h.getCaptchaToken).not.toHaveBeenCalled();
    expect(h.db.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("site key set but the check could not run: raises CaptchaUnavailable and sends nothing", async () => {
    h.db = supabaseWith();
    h.captchaEnabled = true;
    h.getCaptchaToken.mockResolvedValue(undefined);

    await expect(ensureUser()).rejects.toBeInstanceOf(h.CaptchaUnavailable);
    expect(h.db.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("Supabase refusing the CAPTCHA is CaptchaUnavailable, with Supabase's own message", async () => {
    h.db = supabaseWith({ signIn: { data: { user: null }, error: { message: "captcha verification process failed" } } });
    h.getCaptchaToken.mockResolvedValue(undefined);

    const attempt = ensureUser();
    await expect(attempt).rejects.toBeInstanceOf(h.CaptchaUnavailable);
    await expect(attempt).rejects.toThrow("captcha verification process failed");
  });
});

describe("flush() when the CAPTCHA cannot run", () => {
  const ticks = [
    { op: "tick" as const, stepId: "a", localDate: "2026-11-12" },
    { op: "tick" as const, stepId: "b", localDate: "2026-11-12" },
    { op: "tick" as const, stepId: "c", localDate: "2026-11-12" },
  ];

  beforeEach(() => {
    vi.useFakeTimers(); // the retry timer is scheduled, not run
    // The device is online: "offline" must come from the CAPTCHA rule, not from the network.
    vi.stubGlobal("navigator", { onLine: true });
    h.db = supabaseWith();
    h.captchaEnabled = true;
    h.getCaptchaToken.mockResolvedValue(undefined);
    store.setState({ queue: [...ticks], sync: { status: "local", lastError: null, lastSyncedAt: null }, humanCheck: "none" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps every write, shows offline (not an error), and offers the visible check after two failures", async () => {
    const { flush } = await import("./sync");

    await flush();
    expect(store.getState().queue).toHaveLength(3);
    expect(store.getState().sync.status).toBe("offline");
    expect(store.getState().humanCheck).toBe("none"); // one failure: keep trying invisibly
    expect(h.push).not.toHaveBeenCalled();

    await flush();
    expect(store.getState().queue).toHaveLength(3);
    expect(store.getState().sync.status).toBe("offline");
    expect(store.getState().humanCheck).toBe("needed");
    expect(vi.getTimerCount()).toBeGreaterThan(0); // the normal backoff retry is scheduled
  });

  it("a dismissed check is not offered again by itself", async () => {
    const { flush } = await import("./sync");
    store.setState({ humanCheck: "dismissed" });

    await flush();
    await flush();
    expect(store.getState().humanCheck).toBe("dismissed");
    expect(store.getState().sync.status).toBe("offline");
  });
});

describe("flush() never drops a write silently", () => {
  const amount = (n: number) => ({ op: "amount" as const, stepId: "water", localDate: "2026-11-12", amount: n, needed: 12 });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { onLine: true });
    h.db = supabaseWith({ session: { user: { id: "user-1" } } });
    store.setState({
      queue: [amount(1), { op: "tick" as const, stepId: "walk", localDate: "2026-11-12" }],
      sync: { status: "local", lastError: null, lastSyncedAt: null },
      session: { userId: "user-1", anonymous: true, email: null, tier: "free" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a write that fails for a reason that can pass later (a 409, a server not updated yet) stays queued", async () => {
    const { flush } = await import("./sync");
    h.push.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint"));

    await flush();
    expect(store.getState().queue).toHaveLength(2);
    expect(store.getState().sync.status).toBe("error");
    expect(h.push).toHaveBeenCalledTimes(1); // the queue waits behind it, in order
  });

  it("a write the server refuses for good is reported: the status is an error, never 'Everything is saved'", async () => {
    const { flush } = await import("./sync");
    const { RejectedWrite } = await import("../supabase/remote");
    h.push.mockRejectedValueOnce(new RejectedWrite("23514: step is a tick-off habit and takes no amount"));
    h.push.mockResolvedValueOnce(undefined);

    await flush();
    expect(h.push).toHaveBeenCalledTimes(2); // the refusal does not hold up the writes behind it
    expect(store.getState().queue).toHaveLength(0);
    expect(store.getState().sync.status).not.toBe("idle");
    expect(store.getState().sync.status).toBe("error");
    expect(store.getState().sync.lastError).toContain("tick-off habit");
  });
});

describe("a write the server keeps refusing for now is set aside, never lost", () => {
  const day = "2026-11-13";
  const amount = (n: number) => ({ op: "amount" as const, stepId: "water", localDate: day, amount: n, needed: 12 });
  const tick = (stepId: string) => ({ op: "tick" as const, stepId, localDate: day });
  const missing = async () => new (await import("../supabase/remote")).StuckWrite("PGRST202", "Could not find the function set_step_amount");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { onLine: true });
    h.db = supabaseWith({ session: { user: { id: "user-1" } } });
    store.setState({
      queue: [], held: [],
      sync: { status: "local", lastError: null, lastSyncedAt: null },
      session: { userId: "user-1", anonymous: true, email: null, tier: "free" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("the queue unblocks: after HOLD_AFTER refusals the write is held and the ones behind it are sent", async () => {
    const { flush } = await import("./sync");
    const { HOLD_AFTER } = await import("./reduce");
    const stuck = amount(3);
    const walk = tick("walk");
    const read = tick("read");
    store.setState({ queue: [stuck, walk, read] });
    const refusal = await missing();
    h.push.mockImplementation(async (_db: unknown, _user: unknown, write: unknown) => {
      if (write === stuck) throw refusal;
    });

    // Before the limit: the queue waits behind it, in order, exactly as before.
    for (let attempt = 1; attempt < HOLD_AFTER; attempt++) {
      await flush();
      expect(store.getState().queue).toEqual([stuck, walk, read]);
      expect(store.getState().held).toEqual([]);
      expect(store.getState().sync.status).toBe("error");
    }

    await flush();
    expect(store.getState().queue).toEqual([]); // nothing is stuck behind it any more
    expect(h.push.mock.calls.map((call) => call[2])).toEqual([...Array(HOLD_AFTER).fill(stuck), walk, read]);
    // The held write is kept, whole, with the server's reason.
    expect(store.getState().held).toHaveLength(1);
    expect(store.getState().held[0]).toMatchObject({ write: stuck, code: "PGRST202" });
    expect(store.getState().sync.status).toBe("idle");
  });

  it("a lost connection never counts: the write stays at the head of the queue however often it fails", async () => {
    const { flush } = await import("./sync");
    const first = amount(4);
    store.setState({ queue: [first, tick("walk")] });
    h.push.mockRejectedValue(new TypeError("Failed to fetch"));

    for (let attempt = 0; attempt < 6; attempt++) await flush();
    expect(store.getState().queue).toHaveLength(2);
    expect(store.getState().held).toEqual([]);
  });

  it("writes about the same habit go with it, in order; unrelated ones are sent", async () => {
    const { flush } = await import("./sync");
    const { HOLD_AFTER } = await import("./reduce");
    const add = { op: "habit_add" as const, id: "h1", label: "Read", position: 1 };
    const tickIt = tick("h1");
    const walk = tick("walk");
    store.setState({ queue: [add, tickIt, walk] });
    const refusal = await missing();
    h.push.mockImplementation(async (_db: unknown, _user: unknown, write: unknown) => {
      if (write === add) throw refusal;
    });

    for (let attempt = 0; attempt < HOLD_AFTER; attempt++) await flush();
    expect(store.getState().held.map((held) => held.write)).toEqual([add, tickIt]);
    // The tick for a habit the server does not have yet was never sent ahead of it.
    expect(h.push.mock.calls.map((call) => call[2])).not.toContain(tickIt);
    expect(h.push.mock.calls.map((call) => call[2])).toContain(walk);
  });

  it("retryHeld() sends held writes oldest first and removes only what the server took", async () => {
    const { retryHeld } = await import("./sync");
    const add = { op: "habit_add" as const, id: "h1", label: "Read", position: 1 };
    const tickIt = tick("h1");
    const water = amount(5);
    const since = "2026-11-13T08:00:00.000Z";
    store.setState({ held: [add, tickIt, water].map((write) => ({ write, code: "PGRST202", since })) });
    const refusal = await missing();
    h.push.mockImplementation(async (_db: unknown, _user: unknown, write: unknown) => {
      if (write === add) throw refusal;
    });

    await retryHeld();
    // The habit is still refused, so its tick is not tried; the unrelated amount goes through.
    expect(h.push.mock.calls.map((call) => call[2])).toEqual([add, water]);
    expect(store.getState().held.map((held) => held.write)).toEqual([add, tickIt]);

    h.push.mockReset();
    h.push.mockResolvedValue(undefined);
    await retryHeld();
    expect(h.push.mock.calls.map((call) => call[2])).toEqual([add, tickIt]); // original order
    expect(store.getState().held).toEqual([]);
  });

  it("a held write the server refuses for good is dropped and reported, and the writes behind it are released", async () => {
    const { retryHeld } = await import("./sync");
    const { RejectedWrite } = await import("../supabase/remote");
    const rename = { op: "habit_update" as const, id: "h1", label: "x".repeat(500) };
    const tickIt = tick("h1");
    const since = "2026-11-13T08:00:00.000Z";
    store.setState({ held: [rename, tickIt].map((write) => ({ write, code: "PGRST202", since })) });
    h.push.mockImplementation(async (_db: unknown, _user: unknown, write: unknown) => {
      if (write === rename) throw new RejectedWrite("23514: label is too long");
    });

    await retryHeld();
    // The later write for the same habit is not blocked for ever behind it.
    expect(h.push.mock.calls.map((call) => call[2])).toEqual([rename, tickIt]);
    expect(store.getState().held).toEqual([]);
    // Never silently: Me shows the refusal, as it does for a queued write.
    expect(store.getState().sync.status).toBe("error");
    expect(store.getState().sync.lastError).toContain("The server did not accept a change, so it was not saved");
    expect(store.getState().sync.lastError).toContain("label is too long");
  });

  it("a held write still refused 'for now' keeps the writes behind it waiting", async () => {
    const { retryHeld } = await import("./sync");
    const rename = { op: "habit_update" as const, id: "h1", label: "Read" };
    const tickIt = tick("h1");
    store.setState({ held: [rename, tickIt].map((write) => ({ write, code: "PGRST202", since: "2026-11-13T08:00:00.000Z" })) });
    const refusal = await missing();
    h.push.mockImplementation(async (_db: unknown, _user: unknown, write: unknown) => {
      if (write === rename) throw refusal;
    });

    await retryHeld();
    expect(h.push.mock.calls.map((call) => call[2])).toEqual([rename]);
    expect(store.getState().held.map((held) => held.write)).toEqual([rename, tickIt]);
  });

  it("retryHeld() with no connection leaves every held write where it is", async () => {
    const { retryHeld } = await import("./sync");
    const held = [{ write: amount(6), code: "PGRST202", since: "2026-11-13T08:00:00.000Z" }];
    store.setState({ held });
    h.push.mockRejectedValue(new TypeError("Failed to fetch"));

    await retryHeld();
    expect(store.getState().held).toEqual(held);
  });

  it("held writes are tried again after a successful sync", async () => {
    const { flush } = await import("./sync");
    const water = amount(7);
    store.setState({ queue: [tick("walk")], held: [{ write: water, code: "PGRST202", since: "2026-11-13T08:00:00.000Z" }] });
    h.push.mockResolvedValue(undefined);

    await flush();
    await vi.waitFor(() => expect(store.getState().held).toEqual([]));
    expect(h.push.mock.calls.map((call) => call[2])).toContain(water);
  });
});

describe("when held writes are tried again without being asked", () => {
  const water = { op: "amount" as const, stepId: "water", localDate: "2026-11-13", amount: 8, needed: 12 };
  const heldWater = () => [{ write: water, code: "PGRST202", since: "2026-11-13T08:00:00.000Z" }];
  const handlers: Record<string, () => void> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { onLine: true });
    const listen = (name: string, handler: () => void) => { handlers[name] = handler; };
    vi.stubGlobal("window", { addEventListener: listen, removeEventListener: () => {} });
    vi.stubGlobal("document", { addEventListener: listen, removeEventListener: () => {}, visibilityState: "visible" });
    h.db = {
      ...supabaseWith({ session: { user: { id: "user-1" } } }),
      from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }), // the time zone note on the profile
      auth: {
        ...supabaseWith({ session: { user: { id: "user-1" } } }).auth,
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as never;
    store.setState({ queue: [], held: [], session: { userId: "user-1", anonymous: true, email: null, tier: "free" } });
    h.push.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("when the tab regains focus, and once an hour while it stays open", async () => {
    const { startSync } = await import("./sync");
    const stop = startSync();
    await vi.advanceTimersByTimeAsync(1000); // let the opening refresh finish
    h.push.mockClear();

    store.setState({ held: heldWater() });
    handlers.focus!();
    await vi.waitFor(() => expect(store.getState().held).toEqual([]));
    expect(h.push.mock.calls.map((call) => call[2])).toEqual([water]);

    h.push.mockClear();
    store.setState({ held: heldWater() });
    await vi.advanceTimersByTimeAsync(59 * 60 * 1000);
    expect(h.push).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(store.getState().held).toEqual([]);
    expect(h.push.mock.calls.map((call) => call[2])).toEqual([water]);
    stop();
  });

  it("when the app opens", async () => {
    const { startSync } = await import("./sync");
    store.setState({ held: heldWater() });
    const stop = startSync();
    await vi.waitFor(() => expect(store.getState().held).toEqual([]));
    stop();
  });
});
