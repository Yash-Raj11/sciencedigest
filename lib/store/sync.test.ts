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
  fetchProfile: vi.fn(async () => ({ tier: "free", timezone: "UTC" })),
  pull: vi.fn(),
  push: h.push,
}));
vi.mock("./index", async () => {
  const { createStore } = await import("zustand/vanilla");
  return {
    store: createStore(() => ({
      queue: [] as unknown[],
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
