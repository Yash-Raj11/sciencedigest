import { beforeEach, describe, expect, it, vi } from "vitest";

// ensureUser() talks to Supabase and Turnstile; both are replaced here so the
// test sees exactly what it would send.
const h = vi.hoisted(() => ({
  db: null as null | { auth: { getSession: ReturnType<typeof vi.fn>; signInAnonymously: ReturnType<typeof vi.fn> } },
  getCaptchaToken: vi.fn<() => Promise<string | undefined>>(),
}));

vi.mock("../supabase/client", () => ({
  supabase: () => h.db,
  get isDemo() {
    return h.db === null;
  },
}));
vi.mock("../captcha/turnstile", () => ({ getCaptchaToken: h.getCaptchaToken }));
vi.mock("../supabase/remote", () => ({
  RejectedWrite: class RejectedWrite extends Error {},
  fetchProfile: vi.fn(),
  pull: vi.fn(),
  push: vi.fn(),
}));
vi.mock("./index", () => ({
  store: { getState: () => ({ queue: [] }), setState: () => {}, subscribe: () => () => {} },
}));

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
});

describe("ensureUser()", () => {
  it("sends the Turnstile token as captchaToken when one is present", async () => {
    h.db = supabaseWith();
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

  it("already signed in: returns that user and never asks for a CAPTCHA", async () => {
    h.db = supabaseWith({ session: { user: { id: "existing-user" } } });

    await expect(ensureUser()).resolves.toBe("existing-user");
    expect(h.getCaptchaToken).not.toHaveBeenCalled();
    expect(h.db.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("a refused sign-in reports Supabase's own message", async () => {
    h.db = supabaseWith({ signIn: { data: { user: null }, error: { message: "captcha verification process failed" } } });
    h.getCaptchaToken.mockResolvedValue(undefined);

    await expect(ensureUser()).rejects.toThrow("captcha verification process failed");
  });
});
