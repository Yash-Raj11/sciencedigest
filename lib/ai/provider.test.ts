/**
 * The model provider, with fetch replaced by recorded responses: no network.
 * The openai-compatible fixture has the shape Groq's /chat/completions returns.
 */

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { complete, completeJson, describeUsage, forGemini, jsonSchemaFor, readAnthropicReply, resetUsage, usageSoFar, zodCheck } from "./provider";

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

  it("asks again after a 503 or 429 (busy, rate-limited), then gives up loudly after four tries", async () => {
    vi.stubEnv("AI_RETRY_BASE_MS", "0");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let calls = fakeFetch([{ status: 503, text: "high demand" }, { status: 429, text: "quota" }, { json: recorded }]);
    expect(await complete(request)).toBe('{"ok": true, "facts": ["a"]}');
    expect(calls).toHaveLength(3);
    calls = fakeFetch([{ status: 503, text: "high demand" }]);
    await expect(complete(request)).rejects.toThrow(/AI request failed \(503\)/);
    expect(calls).toHaveLength(4);
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

describe("Gemini through the openai-compatible endpoint (recorded 2026-11-14, gemini-4-hydrogen)", () => {
  const gemini = JSON.parse(readFileSync(new URL("fixtures/gemini-chat-completion.json", import.meta.url), "utf8"));
  beforeEach(() => {
    vi.stubEnv("AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/");
    vi.stubEnv("AI_MODEL_EXTRACT", "gemini-4-hydrogen");
    vi.stubEnv("AI_MODEL_EDITORIAL", "gemini-4-hydrogen");
  });

  it("reads Gemini's reply (extra_content beside the text) and strips the trailing slash of the base URL", async () => {
    const calls = fakeFetch([{ json: gemini }]);
    expect(await completeJson(request, zodCheck(Shape))).toEqual({ value: { ok: true, facts: ["a"] }, retries: 0 });
    expect(calls[0].url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  });

  it("sends reasoning_effort: high for extract and medium for editorial by default", async () => {
    vi.stubEnv("AI_THINKING_EXTRACT", "");
    vi.stubEnv("AI_THINKING_EDITORIAL", "");
    const calls = fakeFetch([{ json: gemini }]);
    await complete(request);
    await complete({ ...request, stage: "editorial" });
    expect(calls[0].body.reasoning_effort).toBe("high");
    expect(calls[1].body.reasoning_effort).toBe("medium");
  });

  it("takes the level from AI_THINKING_EXTRACT / AI_THINKING_EDITORIAL, and sends nothing for off", async () => {
    vi.stubEnv("AI_THINKING_EXTRACT", "xhigh");
    vi.stubEnv("AI_THINKING_EDITORIAL", "off");
    const calls = fakeFetch([{ json: gemini }]);
    await complete(request);
    await complete({ ...request, stage: "editorial" });
    expect(calls[0].body.reasoning_effort).toBe("xhigh");
    expect(calls[1].body).not.toHaveProperty("reasoning_effort");
  });

  it("refuses an unknown level before sending anything", async () => {
    vi.stubEnv("AI_THINKING_EXTRACT", "bogus");
    const calls = fakeFetch([{ json: gemini }]);
    await expect(complete(request)).rejects.toThrow(/AI_THINKING_EXTRACT is "bogus"/);
    expect(calls).toHaveLength(0);
  });

  it("strips top_k and out-of-range sampling values for Gemini only", () => {
    const body = { model: "m", top_k: 40, temperature: 3, top_p: 1.5, max_tokens: 10 };
    expect(forGemini("https://generativelanguage.googleapis.com/v1beta/openai/", body)).toEqual({ model: "m", max_tokens: 10 });
    expect(forGemini("https://generativelanguage.googleapis.com/v1beta/openai/", { temperature: 0, top_p: 0.9 })).toEqual({ temperature: 0, top_p: 0.9 });
    expect(forGemini("https://api.groq.com/openai/v1", body)).toEqual(body);
  });

  it("asks again without reasoning_effort when a server refuses it (400)", async () => {
    const calls = fakeFetch([{ status: 400, text: "unknown field reasoning_effort" }, { json: gemini }]);
    await complete(request);
    expect(calls[0].body).toHaveProperty("reasoning_effort");
    expect(calls[1].body).not.toHaveProperty("reasoning_effort");
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

/** A streamed Anthropic reply, as server-sent events. */
function sse(text: string, stop = "end_turn", u = { input_tokens: 100, cache_creation_input_tokens: 50, cache_read_input_tokens: 2000, output_tokens: 300 }): string {
  const events = [
    { type: "message_start", message: { usage: { input_tokens: u.input_tokens, cache_creation_input_tokens: u.cache_creation_input_tokens, cache_read_input_tokens: u.cache_read_input_tokens, output_tokens: 1 } } },
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "not part of the reply" } },
    { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: text.slice(0, 5) } },
    { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: text.slice(5) } },
    { type: "message_delta", delta: { stop_reason: stop }, usage: { output_tokens: u.output_tokens } },
    { type: "message_stop" },
  ];
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n`).join("\n");
}

describe("the anthropic provider (Claude Opus 5.5 settings, 2026-11-20)", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("AI_BASE_URL", "");
    vi.stubEnv("AI_MODEL_EXTRACT", "claude-opus-5-5");
    vi.stubEnv("AI_MODEL_EDITORIAL", "claude-opus-5-5");
    resetUsage();
  });

  it("posts a streamed request to /v1/messages and reads only the text, never the thinking", async () => {
    const calls = fakeFetch([{ text: sse('{"ok": true, "facts": []}') }]);
    expect(await completeJson(request, zodCheck(Shape))).toEqual({ value: { ok: true, facts: [] }, retries: 0 });
    // Exactly the text blocks: the JSON reader would skip leading thinking, so compare the raw reply too.
    expect(await complete(request)).toBe('{"ok": true, "facts": []}');
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect(calls[0].headers["x-api-key"]).toBe("test-key-not-real");
    expect(calls[0].body).toMatchObject({ stream: true, max_tokens: 64000 });
  });

  it("sends no temperature (current models refuse sampling settings)", async () => {
    const calls = fakeFetch([{ text: sse('{"ok": true, "facts": []}') }]);
    await complete(request);
    expect(calls[0].body).not.toHaveProperty("temperature");
  });

  it("marks the system prompt and the same-for-every-paper example for caching, example first", async () => {
    const calls = fakeFetch([{ text: sse("{}") }]);
    await complete({ ...request, stable: "EXAMPLE\n\n" });
    expect(calls[0].body.system).toEqual([{ type: "text", text: "SYSTEM", cache_control: { type: "ephemeral" } }]);
    expect(calls[0].body.messages).toEqual([{ role: "user", content: [
      { type: "text", text: "EXAMPLE\n\n", cache_control: { type: "ephemeral" } },
      { type: "text", text: "PROMPT" },
    ] }]);
  });

  it("keeps the cached example on a JSON retry, so the retry reads it from the cache", async () => {
    const calls = fakeFetch([{ text: sse("{not json") }, { text: sse('{"ok": true, "facts": []}') }]);
    await completeJson({ ...request, stable: "EXAMPLE" }, zodCheck(Shape));
    const first = (calls[1].body.messages as { content: unknown }[])[0];
    expect(first.content).toEqual([{ type: "text", text: "EXAMPLE", cache_control: { type: "ephemeral" } }, { type: "text", text: "PROMPT" }]);
  });

  it("sends the thinking setting as effort: high for extract, medium for the draft, none when off", async () => {
    const calls = fakeFetch([{ text: sse("{}") }]);
    await complete(request);
    await complete({ ...request, stage: "editorial" });
    expect(calls[0].body.output_config).toEqual({ effort: "high" });
    expect(calls[1].body.output_config).toEqual({ effort: "medium" });
    vi.stubEnv("AI_THINKING_EXTRACT", "off");
    await complete(request);
    expect(calls[2].body).not.toHaveProperty("output_config");
    vi.stubEnv("AI_THINKING_EXTRACT", "minimal");
    await complete(request);
    expect(calls[3].body.output_config).toEqual({ effort: "low" });
  });

  it("sends a schema as structured output, and asks again without only the schema when the API refuses it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = { type: "object", properties: { ok: { type: "boolean" } }, additionalProperties: false };
    const calls = fakeFetch([{ status: 400, text: "schema too complex" }, { text: sse('{"ok": true, "facts": []}') }]);
    await complete({ ...request, schema });
    expect(calls[0].body.output_config).toEqual({ effort: "high", format: { type: "json_schema", schema } });
    expect(calls[1].body.output_config).toEqual({ effort: "high" });
  });

  it("adds up every request's tokens and prices them at the model's list price", async () => {
    fakeFetch([{ text: sse("{not json") }, { text: sse('{"ok": true, "facts": []}') }]);
    await completeJson(request, zodCheck(Shape));
    const used = usageSoFar();
    expect(used).toEqual({ requests: 2, input: 200, cacheWrite: 100, cacheRead: 4000, output: 600 });
    // 200×4 + 100×5 + 4000×0.4 + 600×20 = 14,900 per million → $0.01
    expect(describeUsage(used, "claude-opus-5-5")).toMatch(/about \$0\.01 at claude-opus-5-5 list price/);
    expect(describeUsage(used, "some-other-model")).not.toMatch(/\$/);
  });

  it("stops loudly on a refusal, a full reply and a streamed error, instead of saving half a reply", async () => {
    fakeFetch([{ text: sse("{}", "refusal") }]);
    await expect(complete(request)).rejects.toThrow(/declined/);
    fakeFetch([{ text: sse('{"ok": tr', "max_tokens") }]);
    await expect(complete(request)).rejects.toThrow(/ran out of room/);
    fakeFetch([{ text: 'event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n' }]);
    await expect(complete(request)).rejects.toThrow(/Overloaded/);
  });

  it("still reads a plain JSON message (an older recording)", () => {
    expect(readAnthropicReply(JSON.stringify({ content: [{ type: "text", text: "hi" }], stop_reason: "end_turn", usage: { input_tokens: 3, output_tokens: 4 } })))
      .toEqual({ text: "hi", stopReason: "end_turn", usage: { input: 3, cacheWrite: 0, cacheRead: 0, output: 4 } });
  });
});

describe("the openai-compatible provider with a split prompt", () => {
  it("sends stable + prompt as one text, exactly the prompt it sent before the split", async () => {
    const calls = fakeFetch([{ json: recorded }]);
    await complete({ ...request, stable: "EXAMPLE\n\n" });
    expect(calls[0].body.messages).toEqual([{ role: "system", content: "SYSTEM" }, { role: "user", content: "EXAMPLE\n\nPROMPT" }]);
  });
});

describe("jsonSchemaFor (the schema sent as structured output)", () => {
  const banned = /"(minimum|maximum|exclusiveMinimum|exclusiveMaximum|multipleOf|minLength|maxLength|pattern|minItems|maxItems|default)"/;

  it("drops every constraint Anthropic refuses, closes every object, and keeps the shape", () => {
    const schema = jsonSchemaFor(z.object({ id: z.string().regex(/^[a-z]+$/).min(1), year: z.number().int().min(1900), tags: z.array(z.string()).min(1).default([]) }));
    expect(schema).not.toBeNull();
    expect(JSON.stringify(schema)).not.toMatch(banned);
    expect(schema).toMatchObject({ type: "object", additionalProperties: false, properties: { id: { type: "string" }, year: { type: "integer" }, tags: { type: "array" } } });
  });

  it("gives up (null) on an open-ended object, which structured outputs cannot express", () => {
    expect(jsonSchemaFor(z.object({ map: z.record(z.string(), z.array(z.string())) }))).toBeNull();
  });
});
