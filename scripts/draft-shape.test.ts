/**
 * Step 2E, end to end through the real script: `paper draft` refuses a model reply in the old
 * flat shape (sections, top-level limitations) and saves nothing. A fake model on 127.0.0.1
 * stands in for the real one, on a scratch copy of the steps paper (source and extraction only).
 *
 *   - an old-shape reply: the script asks once more, naming the old shape, then gives up with
 *     exit 1 and no editorial.json;
 *   - a three-layer reply: saved on the first try, and the request carried the three-layer
 *     rules and the list of other sources the read may cite.
 *
 * Nothing here reaches the network or uses a real key.
 */

import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OLD_SHAPE_MESSAGE } from "../lib/pipeline/editorial";
import { EDITORIAL_SYSTEM } from "../lib/pipeline/prompts";

const TSX = "node_modules/.bin/tsx";
const SLUG = "steps-days-per-week";
const layered = JSON.parse(readFileSync(`content/papers/${SLUG}/editorial.json`, "utf8"));
const { layers, ...rest } = layered;
delete rest.glossary;
/** What a model copying the pre-2E example would write: the same read, in sections. */
const oldShape = {
  ...rest,
  sections: [
    { id: "found", heading: "What they found", paragraphs: layers.mechanism.paragraphs },
    { id: "lower-bound", heading: "How sure is that?", paragraphs: [layers.audit.weakEnd] },
  ],
  limitations: layers.audit.limitations,
};

let server: Server;
let baseUrl = "";
let answer: unknown = null;
const requests: { role: string; content: string }[][] = [];
const scratch: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      requests.push((JSON.parse(body) as { messages: { role: string; content: string }[] }).messages);
      res.setHeader("content-type", "application/json");
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

/** A scratch papers folder holding the steps paper's source and extraction, and no editorial. */
function copy(): string {
  const root = mkdtempSync(join(tmpdir(), "sd-draft-"));
  scratch.push(root);
  mkdirSync(join(root, SLUG));
  for (const file of ["source.txt", "extraction.json"]) cpSync(`content/papers/${SLUG}/${file}`, join(root, SLUG, file));
  return root;
}

function draft(dir: string): Promise<{ status: number | null; output: string }> {
  const env: NodeJS.ProcessEnv = {
    ...process.env, SD_PAPERS_DIR: dir,
    AI_PROVIDER: "openai-compatible", AI_BASE_URL: baseUrl, AI_MODEL_EDITORIAL: "fake-model", AI_API_KEY: "not-a-real-key",
  };
  return new Promise((resolve) => {
    const child = spawn(TSX, ["scripts/paper.mts", "draft", SLUG], { env });
    let output = "";
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    child.on("close", (status) => resolve({ status, output }));
  });
}

describe("paper draft and the old flat shape", () => {
  it("refuses an old-shape reply, says why on the retry, and saves nothing", async () => {
    const dir = copy();
    requests.length = 0;
    answer = oldShape;
    const { status, output } = await draft(dir);
    expect(status).toBe(1);
    expect(output).toContain("still invalid after one retry");
    expect(output).toContain(OLD_SHAPE_MESSAGE.slice(0, 40));
    expect(existsSync(join(dir, SLUG, "editorial.json"))).toBe(false);
    expect(requests).toHaveLength(2);
    expect(requests[1].at(-1)?.content).toContain(`Your reply was rejected: ${OLD_SHAPE_MESSAGE}`);
  }, 60_000);

  it("saves a three-layer reply on the first try, from a prompt that asks for the layers", async () => {
    const dir = copy();
    requests.length = 0;
    answer = layered;
    const { status, output } = await draft(dir);
    expect(output).toContain("JSON retries: 0");
    expect(status).toBe(0);
    expect(requests).toHaveLength(1);
    expect(requests[0][0].content).toBe(EDITORIAL_SYSTEM);
    expect(requests[0][1].content).toContain("OTHER SOURCES YOU MAY CITE");
    expect(requests[0][1].content).toContain("[concept:adenosine]");
    const saved = JSON.parse(readFileSync(join(dir, SLUG, "editorial.json"), "utf8"));
    expect(saved.layers).toEqual(layered.layers);
    expect(saved.sections).toBeUndefined();
  }, 60_000);
});
