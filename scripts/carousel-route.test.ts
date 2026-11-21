/**
 * The admin routes are local only (Phase 11, 4B): outside `npm run dev` they answer 404, so the
 * slide renderer is never a free image service on the internet and the queue cannot be written.
 */

import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The queue decides at load, the slide route at each request: both are checked under each environment. */
async function routes(env: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  const queue = await import("../app/api/admin/queue/route");
  vi.unstubAllEnvs();
  // Loaded under the test environment (React's dev JSX runtime cannot load under vitest), then
  // asked under `env`, since this route reads NODE_ENV per request.
  const carousel = await import("../app/api/admin/carousel/route");
  vi.stubEnv("NODE_ENV", env);
  return { carousel, queue };
}
const slide = (q: string) => new Request(`http://localhost/api/admin/carousel?${q}`);

afterEach(() => { vi.unstubAllEnvs(); });

describe("the slide export route", () => {
  it("refuses outside development: 404, no image", async () => {
    for (const env of ["production", "test"]) {
      const { carousel, queue } = await routes(env);
      const res = await carousel.GET(slide("slug=steps-days-per-week&slide=1"));
      expect([env, res.status, res.headers.get("content-type")]).toEqual([env, 404, "text/plain;charset=UTF-8"]);
      expect((await queue.GET()).status).toBe(404);
      const post = await queue.POST(new Request("http://localhost/api/admin/queue", { method: "POST", body: JSON.stringify({ slug: "steps-days-per-week", action: "approve" }) }));
      expect(post.status).toBe(404);
    }
  });
  it("draws a PNG under npm run dev, and refuses a bad slug or slide number", async () => {
    const { carousel } = await routes("development");
    const ok = await carousel.GET(slide("slug=steps-days-per-week&slide=1"));
    expect([ok.status, ok.headers.get("content-type")]).toEqual([200, "image/png"]);
    expect([...new Uint8Array(await ok.arrayBuffer()).subarray(1, 4)].map((c) => String.fromCharCode(c)).join("")).toBe("PNG");
    expect((await carousel.GET(slide("slug=nope&slide=1"))).status).toBe(400);
    expect((await carousel.GET(slide("slug=steps-days-per-week&slide=99"))).status).toBe(400);
    // Each look is its own image; an unknown look is refused, not quietly drawn in the default.
    const light = await carousel.GET(slide("slug=steps-days-per-week&slide=1&look=light-vivid"));
    expect(light.status).toBe(200);
    const bad = await carousel.GET(slide("slug=steps-days-per-week&slide=1&look=neon"));
    expect([bad.status, (await bad.json()).error]).toEqual([400, expect.stringContaining("look must be one of dark, light")]);
    // An alternate opening is drawn as slide 1; an opening the deck does not have is refused.
    expect((await carousel.GET(slide("slug=steps-days-per-week&slide=1&hook=c"))).status).toBe(200);
    const noHook = await carousel.GET(slide("slug=hiit-body-composition&slide=1&hook=d"));
    expect([noHook.status, (await noHook.json()).error]).toEqual([400, "hook must be one of a, b."]);
  }, 30000);
});

describe("the approval queue", () => {
  it("records the chosen opening, and refuses one the deck does not have without writing anything", async () => {
    const { queue } = await routes("development");
    const before = existsSync("content/queue/hiit-body-composition.json") ? readFileSync("content/queue/hiit-body-composition.json", "utf8") : null;
    const res = await queue.POST(new Request("http://localhost/api/admin/queue", { method: "POST", body: JSON.stringify({ slug: "hiit-body-composition", action: "approve", hook: "z" }) }));
    expect([res.status, (await res.json()).error]).toEqual([400, "hook must be one of a, b."]);
    const after = existsSync("content/queue/hiit-body-composition.json") ? readFileSync("content/queue/hiit-body-composition.json", "utf8") : null;
    expect(after).toBe(before);
  });
  // The owner has reviewed every entry today, so the route is handed a copy of the decks in which
  // one deck still waits on a review. The rule is tested whatever the real files say.
  it("will not approve a deck that rests on a concept or common fact the owner has not reviewed", async () => {
    const slug = (JSON.parse(readFileSync("content/generated/carousels.json", "utf8")) as { decks: { slug: string }[] }).decks[0].slug;
    const pending = ["caffeine-tolerance"];
    vi.doMock("node:fs", async (importOriginal) => {
      const fs = await importOriginal<typeof import("node:fs")>();
      const readFileSync = ((file: string, ...rest: unknown[]) => {
        const text = (fs.readFileSync as (...a: unknown[]) => string | Buffer)(file, ...rest);
        if (!String(file).endsWith("carousels.json")) return text;
        const data = JSON.parse(String(text)) as { decks: { slug: string; pending: string[] }[] };
        data.decks = data.decks.map((d) => (d.slug === slug ? { ...d, pending } : d));
        return JSON.stringify(data);
      }) as typeof fs.readFileSync;
      return { ...fs, default: { ...fs, readFileSync }, readFileSync };
    });
    try {
      const { queue } = await routes("development");
      const before = existsSync(`content/queue/${slug}.json`) ? readFileSync(`content/queue/${slug}.json`, "utf8") : null;
      const res = await queue.POST(new Request("http://localhost/api/admin/queue", { method: "POST", body: JSON.stringify({ slug, action: "approve" }) }));
      expect(res.status).toBe(409);
      expect((await res.json()).error).toContain(pending[0]);
      expect(existsSync(`content/queue/${slug}.json`) ? readFileSync(`content/queue/${slug}.json`, "utf8") : null).toBe(before);
    } finally {
      vi.doUnmock("node:fs");
    }
  });
});
