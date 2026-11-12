import { afterEach, describe, expect, it, vi } from "vitest";

// The module reads the site key when it loads, so each case loads it afresh.
async function load(siteKey: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", siteKey);
  return import("./turnstile");
}

function fakePage(turnstile?: unknown) {
  const page = {
    window: { turnstile } as Record<string, unknown>,
    document: {
      createElement: vi.fn(() => ({ setAttribute: vi.fn(), style: {} as Record<string, string> })),
      head: { appendChild: vi.fn() },
      body: { appendChild: vi.fn() },
    },
  };
  vi.stubGlobal("window", page.window);
  vi.stubGlobal("document", page.document);
  return page;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getCaptchaToken()", () => {
  it("with no site key: returns undefined and touches nothing in the page", async () => {
    const page = fakePage();
    const { captchaEnabled, getCaptchaToken } = await load("");

    expect(captchaEnabled).toBe(false);
    await expect(getCaptchaToken()).resolves.toBeUndefined();
    expect(page.document.createElement).not.toHaveBeenCalled();
    expect(page.document.head.appendChild).not.toHaveBeenCalled();
  });

  it("with a site key: renders one invisible widget, and resets it for the next token", async () => {
    let issued = 0;
    let onToken: ((token: string) => void) | undefined;
    const api = {
      render: vi.fn((_el: unknown, options: { sitekey: string; execution: string; callback: (t: string) => void }) => {
        onToken = options.callback;
        return "widget-1";
      }),
      execute: vi.fn(() => onToken?.(`token-${++issued}`)),
      reset: vi.fn(),
    };
    fakePage(api);
    const { captchaEnabled, getCaptchaToken } = await load("site-key-abc");

    expect(captchaEnabled).toBe(true);
    await expect(getCaptchaToken()).resolves.toBe("token-1");
    await expect(getCaptchaToken()).resolves.toBe("token-2");

    expect(api.render).toHaveBeenCalledTimes(1);
    expect(api.render.mock.calls[0]?.[1]).toMatchObject({ sitekey: "site-key-abc", execution: "execute" });
    expect(api.reset).toHaveBeenCalledTimes(1);
    expect(api.reset).toHaveBeenCalledWith("widget-1");
  });

  it("with a site key but a failed challenge: returns undefined instead of hanging", async () => {
    let onError: (() => void) | undefined;
    const api = {
      render: vi.fn((_el: unknown, options: { "error-callback": () => void }) => {
        onError = options["error-callback"];
        return "widget-1";
      }),
      execute: vi.fn(() => onError?.()),
      reset: vi.fn(),
    };
    fakePage(api);
    const { getCaptchaToken } = await load("site-key-abc");

    await expect(getCaptchaToken()).resolves.toBeUndefined();
  });
});
