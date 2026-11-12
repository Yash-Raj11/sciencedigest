/**
 * HTTP status of paper pages, checked against the PRODUCTION server.
 *
 *   npm run build && npm run test:http
 *
 * Why a real server: with Cache Components and Partial Prefetching, Next.js can
 * answer an unknown /papers/<slug> with the prerendered App Shell and a 200
 * before the page decides it does not exist (notFound() then only adds a
 * noindex tag). Only `next start` behaves like the deployed site here; a dev
 * server or a unit test would not show it.
 *
 * Kept out of `npm test` (vitest.config.ts only includes lib/ and scripts/; this file runs from vitest.http.config.mts)
 * because it needs a build. It uses whatever is in .next/, so build first.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { papers } from "@/lib/content";

let server: ChildProcess | undefined;
let base = "";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, () => {
      const address = probe.address();
      probe.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port"))));
    });
  });
}

async function waitUntilUp(url: string, ms = 30000): Promise<void> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      await fetch(url, { redirect: "manual" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`the production server did not start within ${ms / 1000} s`);
}

async function status(path: string): Promise<number> {
  const response = await fetch(base + path, { redirect: "manual" });
  await response.arrayBuffer(); // read the whole stream: the status must already be final
  return response.status;
}

beforeAll(async () => {
  if (!existsSync(".next/BUILD_ID")) {
    throw new Error("No production build in .next/. Run `npm run build` first, then `npm run test:http`.");
  }
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn("node_modules/.bin/next", ["start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore" });
  await waitUntilUp(base + "/");
}, 40000);

afterAll(() => {
  server?.kill();
});

describe("paper pages on the production server", () => {
  it("an unknown slug answers 404, not 200", async () => {
    expect(await status("/papers/does-not-exist")).toBe(404);
  });

  it("a near-miss of a real slug also answers 404", async () => {
    expect(await status(`/papers/${papers[0]!.slug}-x`)).toBe(404);
  });

  it.each(papers.map((p) => [p.slug, p.accessTier]))("the published paper %s (%s) answers 200", async (slug) => {
    expect(await status(`/papers/${slug}`)).toBe(200);
  });

  it("the privacy page answers 200", async () => {
    expect(await status("/privacy")).toBe(200);
  });
});
