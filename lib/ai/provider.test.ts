/**
 * The model provider, with fetch replaced by recorded responses: no network.
 * The openai-compatible fixture has the shape Groq's /chat/completions returns.
 */

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { complete, completeJson, zodCheck } from "./provider";

const recorded = JSON.parse(readFileSync(new URL("fixtures/groq-chat-completion.json", import.meta.url), "utf8"));
const withContent = (content: string, finish = "stop") => ({ ...recorded, choices: [{ ...recorded.choices[0], message: { role: "assistant", content }, finish_reason: finish }] });
const Shape = z.object({ ok: z.literal(true), facts: z.array(z.string()) });
const request = { stage: "extract" as const, system: "SYSTEM", prompt: "PROMPT" };

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };
function fakeFetch(replies: { status?: number; json?: unknown; text?: string }[]) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    const status = reply.status ?? 200;
    return { ok: status < 300, status, json: async () => reply.json, text: async () => reply.text ?? JSON.stringify(reply.json) };
  }));
  return calls;
}

const ENV = { AI_PROVIDER: "openai-compatible", AI_BASE_URL: "https://api.groq.com/openai/v1", AI_API_KEY: "test-key-not-real", AI_MODEL_EXTRACT: "openai/gpt-oss-120b", AI_MODEL_EDITORIAL: "openai/gpt-oss-120b" };
beforeEach(() => { for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v); vi.stubEnv("AI_MODEL_DRAFT", ""); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("openai-compatible provider", () => {
  it("posts to /chat/completions with a bearer key, the system message, JSON mode and temperature 0 for extract", async () => {
    const calls = fakeFetch([{ json: recorded }]);
    expect(await complete(request)).toBe('{"ok": true, "facts": ["a"]}');
    expect(calls[0].url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(calls[0].headers.authorization).toBe("Bearer test-key-not-real");
    expect(calls[0].body).toMatchObject({
      model: "openai/gpt-oss-120b", temperature: 0, response_format: { type: "json_object" },
      messages: [{ role: "system", content: "SYSTEM" }, { role: "user", content: "PROMPT" }],
    });
  });

  it("asks again without JSON mode and temperature when the server refuses them (400)", async () => {
    const calls = fakeFetch([{ status: 400, text: "response_format not supported" }, { json: recorded }]);
    await complete(request);
    expect(calls).toHaveLength(2);
    expect(calls[1].body).not.toHaveProperty("response_format");
    expect(calls[1].body).not.toHaveProperty("temperature");
  });

  it("fails loudly on a cut-off reply, an empty reply and an HTTP error", async () => {
    fakeFetch([{ json: withContent('{"ok": tr', "length") }]);
    await expect(complete(request)).rejects.toThrow(/ran out of room/);
    fakeFetch([{ json: withContent("") }]);
    await expect(complete(request)).rejects.toThrow(/no text/);
    fakeFetch([{ status: 500, text: "upstream down" }]);
    await expect(complete(request)).rejects.toThrow(/AI request failed \(500\)/);
  });

  it("needs a base URL, and a key unless the server is local (Ollama)", async () => {
    vi.stubEnv("AI_BASE_URL", "");
    await expect(complete(request)).rejects.toThrow(/Set AI_BASE_URL/);
    vi.stubEnv("AI_BASE_URL", "http://localhost:11434/v1");
    vi.stubEnv("AI_API_KEY", "");
    const calls = fakeFetch([{ json: recorded }]);
    await complete(request);
    expect(calls[0].headers).not.toHaveProperty("authorization");
  });

  it("names the variable to rename when AI_MODEL_DRAFT is used instead of AI_MODEL_EDITORIAL", async () => {
    vi.stubEnv("AI_MODEL_EDITORIAL", "");
    vi.stubEnv("AI_MODEL_DRAFT", "openai/gpt-oss-120b");
    await expect(complete({ ...request, stage: "editorial" })).rejects.toThrow(/Rename AI_MODEL_DRAFT to AI_MODEL_EDITORIAL/);
  });
});

describe("completeJson: JSON checked against the schema, one retry with the error, then a loud failure", () => {
  it("returns a valid reply with no retry", async () => {
    fakeFetch([{ json: recorded }]);
    expect(await completeJson(request, zodCheck(Shape))).toEqual({ value: { ok: true, facts: ["a"] }, retries: 0 });
  });

  it("sends a broken reply back once with the error, and takes the corrected one", async () => {
    const calls = fakeFetch([{ json: withContent('{"ok": true, "facts": [1]}') }, { json: recorded }]);
    expect((await completeJson(request, zodCheck(Shape))).retries).toBe(1);
    const second = calls[1].body.messages as { role: string; content: string }[];
    expect(second.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(second[3].content).toMatch(/rejected: facts\.0: .*string/);
  });

  it("treats text that is not JSON as invalid", async () => {
    const calls = fakeFetch([{ json: withContent("Sure! Here is the extraction.") }, { json: recorded }]);
    await completeJson(request, zodCheck(Shape));
    expect((calls[1].body.messages as { content: string }[])[3].content).toMatch(/not valid JSON/);
  });

  it("fails after the second bad reply, and never tries a third time", async () => {
    const calls = fakeFetch([{ json: withContent("{not json") }]);
    await expect(completeJson(request, zodCheck(Shape))).rejects.toThrow(/still invalid after one retry/);
    expect(calls).toHaveLength(2);
  });
});

describe("the anthropic provider still works", () => {
  it("posts to /v1/messages with x-api-key and reads the text parts", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("AI_BASE_URL", "");
    const calls = fakeFetch([{ json: { content: [{ type: "text", text: '{"ok": true, "facts": []}' }], stop_reason: "end_turn" } }]);
    expect(await completeJson(request, zodCheck(Shape))).toEqual({ value: { ok: true, facts: [] }, retries: 0 });
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect(calls[0].headers["x-api-key"]).toBe("test-key-not-real");
    expect(calls[0].body).toMatchObject({ system: "SYSTEM", max_tokens: 16000 });
  });
});
