/**
 * The coverage-only run (owner, 2026-11-19), end to end through the real script, on a scratch
 * copy of the turmeric paper, with a fake model on 127.0.0.1 standing in for the real one:
 *
 *   - it sends one request, the conditions & confounds pass, listing the hand-checked ids
 *     (never the first-pass extract);
 *   - it leaves every hand-checked fact exactly as written, appends the new facts and writes the
 *     coverage map, the model's answer and the review into the scratch copy;
 *   - content/ is never written, even with a guard broken (the fake model refuses every
 *     request it does not expect, so nothing reaches the save);
 *   - it refuses, before any request, without a scratch folder, with one inside content/, on a
 *     context study, and on a copy that already has a coverage map.
 *
 * Nothing here reaches the network or uses a real key.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COVERAGE_SYSTEM, EXTRACT_SYSTEM } from "../lib/pipeline/prompts";

const TSX = "node_modules/.bin/tsx";
const SLUG = "turmeric-pepper-breakfast";
const REAL = `content/papers/${SLUG}/extraction.json`;
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

const hand = JSON.parse(readFileSync(REAL, "utf8"));
// The file as it was hand-checked: the coverage pass was merged into it on 2026-11-19.
delete hand.coverage;
const sugar = hand.facts.find((f: { id: string }) => f.id === "sugar_row");
/** The hand-checked facts without one the pass is then asked to find. */
const base = { ...hand, facts: hand.facts.filter((f: { id: string }) => f.id !== "sugar_row") };
const answer = {
  facts: [sugar],
  relabelAsLimitation: ["glp1"],
  coverage: { conditions: ["in_egg", "plate"], dosing: ["single_meal"], confounds: ["sugar_row"], priorEvidence: ["animals_before"], furtherInvestigation: [], funding: [] },
};

let server: Server;
let baseUrl = "";
const requests: { system: string; prompt: string }[] = [];
const scratch: string[] = [];
/**
 * The fake model answers only in the one test that is meant to reach it. Everywhere else it
 * refuses (403), which the script reports as a failed request before it saves anything, so a
 * broken guard is counted in `requests` and still writes nothing into content/.
 */
let answering = false;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const sent = JSON.parse(body) as { messages: { role: string; content: string }[] };
      requests.push({ system: sent.messages[0].content, prompt: sent.messages[1].content });
      res.setHeader("content-type", "application/json");
      if (!answering) { res.statusCode = 403; res.end(JSON.stringify({ error: "this test expects no request" })); return; }
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) }, finish_reason: "stop" }] }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(() => {
  server.close();
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A scratch papers folder holding the turmeric source and the given extraction. */
function copy(extraction: unknown): string {
  const root = mkdtempSync(join(tmpdir(), "sd-coverage-"));
  scratch.push(root);
  mkdirSync(join(root, SLUG));
  cpSync(`content/papers/${SLUG}/source.txt`, join(root, SLUG, "source.txt"));
  writeFileSync(join(root, SLUG, "extraction.json"), `${JSON.stringify(extraction, null, 2)}\n`);
  return root;
}

function paper(args: string[], env: Record<string, string | undefined>): Promise<{ status: number | null; output: string }> {
  const model = { AI_PROVIDER: "openai-compatible", AI_BASE_URL: baseUrl, AI_MODEL_EXTRACT: "fake-model", AI_API_KEY: "not-a-real-key" };
  const merged: NodeJS.ProcessEnv = { ...process.env, ...model, ...env };
  if (!("SD_PAPERS_DIR" in env)) delete merged.SD_PAPERS_DIR;
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete merged[key];
  return new Promise((resolve) => {
    const child = spawn(TSX, ["scripts/paper.mts", ...args], { env: merged });
    let output = "";
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    child.on("close", (status) => resolve({ status, output }));
  });
}

describe("paper extract --coverage-only", () => {
  it("runs only the coverage pass, on the scratch copy, and leaves every hand-checked fact as written", async () => {
    const before = hash(REAL);
    const dir = copy(base);
    requests.length = 0;
    answering = true;
    const { status, output } = await paper(["extract", SLUG, "--coverage-only"], { SD_PAPERS_DIR: dir }).finally(() => { answering = false; });
    expect(output).toContain("gate ok");
    expect(status).toBe(0);

    expect(requests).toHaveLength(1);
    expect(requests[0].system).toBe(COVERAGE_SYSTEM);
    expect(requests[0].system).not.toBe(EXTRACT_SYSTEM);
    expect(requests[0].prompt).toContain("- plate (context):");
    expect(requests[0].prompt).not.toContain("- sugar_row (");

    const after = JSON.parse(readFileSync(join(dir, SLUG, "extraction.json"), "utf8"));
    for (const [i, fact] of base.facts.entries()) {
      expect(after.facts[i]).toEqual(fact.id === "glp1" ? { ...fact, kind: "limitation" } : fact);
    }
    expect(after.facts.slice(base.facts.length)).toEqual([sugar]);
    expect(after.coverage.confounds).toEqual(["sugar_row"]);
    expect(after.coverage.conditions).toEqual(["in_egg", "plate"]);
    expect(JSON.parse(readFileSync(join(dir, SLUG, "coverage-pass.json"), "utf8"))).toEqual([{ ...answer, facts: [sugar] }]);

    const review = readFileSync(join(dir, SLUG, "coverage-review.txt"), "utf8");
    expect(review).toContain("New facts (1):\n  sugar_row  [context]");
    expect(review).toContain("relabelled as limitations (1): glp1");
    expect(review).toContain("  furtherInvestigation: not found");
    expect(review).toContain("Problems (must be none before a merge): none");

    expect(hash(REAL)).toBe(before);
  }, 60_000);

  it("refuses without a scratch folder, before any request", async () => {
    requests.length = 0;
    const { status, output } = await paper(["extract", SLUG, "--coverage-only"], { SD_PAPERS_DIR: undefined });
    expect(status).toBe(1);
    expect(output).toContain("writes to a scratch copy only");
    expect(requests).toHaveLength(0);
  }, 30_000);

  it.each([
    ["content/papers", "content/papers"],
    ["content/papers by a roundabout path", "content/papers/../papers"],
    ["content itself", "content"],
    ["a folder inside content/papers", `content/papers/${SLUG}`],
  ])("refuses SD_PAPERS_DIR = %s, before any request", async (_, dir) => {
    const before = hash(REAL);
    requests.length = 0;
    const { status, output } = await paper(["extract", SLUG, "--coverage-only"], { SD_PAPERS_DIR: dir });
    expect(status).toBe(1);
    expect(output).toContain("is inside content/");
    expect(requests).toHaveLength(0);
    expect(hash(REAL)).toBe(before);
  }, 30_000);

  it("refuses a context study", async () => {
    const study = "content/context/caffeine-saliva-half-life/extraction.json";
    const before = hash(study);
    requests.length = 0;
    const { status, output } = await paper(["extract", "caffeine-saliva-half-life", "--coverage-only", "--role", "context"], { SD_PAPERS_DIR: copy(base) });
    expect(status).toBe(1);
    expect(output).toContain("runs on a paper, not on a context study");
    expect(requests).toHaveLength(0);
    expect(hash(study)).toBe(before);
  }, 30_000);

  it("refuses a copy that already has a coverage map", async () => {
    requests.length = 0;
    const { status, output } = await paper(["extract", SLUG, "--coverage-only"], { SD_PAPERS_DIR: copy({ ...base, coverage: answer.coverage }) });
    expect(status).toBe(1);
    expect(output).toContain("already has a coverage map");
    expect(requests).toHaveLength(0);
  }, 30_000);
});
