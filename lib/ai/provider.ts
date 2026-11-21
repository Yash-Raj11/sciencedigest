/**
 * The one file that knows which AI model the pipeline uses.
 *
 * Swapping provider or model is a change to this file (or just to .env.local)
 * and nothing else. The pipeline only ever calls `complete()` or `completeJson()`.
 *
 * Settings, all in .env.local:
 *   AI_PROVIDER           "anthropic" (default) or "openai-compatible" (Groq, Ollama, OpenRouter ...)
 *   AI_API_KEY            required, except for a local Ollama
 *   AI_MODEL_EXTRACT      model for stage 1 (reading the paper)
 *   AI_MODEL_EDITORIAL    model for stage 3 (writing the read)
 *   AI_BASE_URL           anthropic: optional, defaults to Anthropic's API.
 *                         openai-compatible: required, the URL that ends before /chat/completions,
 *                         e.g. https://api.groq.com/openai/v1 or http://localhost:11434/v1
 *   AI_CONTEXT_TOKENS     optional: the model's context window (default 128000). A paper that
 *                         does not fit is read in chunks, with a warning (lib/pipeline/chunks.ts).
 *   AI_MAX_TOKENS         optional: room for the reply (default 64000 anthropic, 32000 otherwise;
 *                         a reasoning model spends part of it thinking)
 *   AI_THINKING_EXTRACT   how hard the model thinks: none | minimal | low | medium | high | xhigh,
 *   AI_THINKING_EDITORIAL or "off" to send nothing. Defaults: "high" for extract, "medium" for
 *                         editorial. openai-compatible: sent as reasoning_effort. anthropic: sent as
 *                         output_config.effort (none and minimal become low). A server that
 *                         refuses the setting (400) is asked again without it.
 *
 * Anthropic requests (2026-11-20, for Claude Opus 5.5): streamed, so a long reply cannot hit
 * Node's five-minute wait for the first byte; the system prompt and the worked example are
 * marked for prompt caching (the same for every paper, read back at a tenth of the price);
 * a request may carry a JSON schema (structured outputs), so the reply cannot come back
 * malformed and need a paid retry. No temperature: current models refuse sampling settings.
 * Every request's token use is added up (`usageSoFar`) and printed by scripts/paper.mts.
 *
 * Structured extraction is the step where a weak model produces exactly the
 * errors this product exists to avoid. Whatever the model, the gate and the lint
 * judge its output unchanged.
 */

import { z } from "zod";

export interface CompletionRequest {
  stage: "extract" | "editorial";
  system: string;
  prompt: string;
  /**
   * The start of the prompt that is the same for every paper (the worked example). Sent first;
   * anthropic marks it for caching, openai-compatible sends `stable + prompt` as one text, exactly
   * as before the split.
   */
  stable?: string;
  /** A JSON schema the reply must follow (anthropic structured outputs; see `jsonSchemaFor`). */
  schema?: Record<string, unknown>;
  maxTokens?: number;
}

type Provider = "anthropic" | "openai-compatible";

export function providerName(): Provider {
  const name = process.env.AI_PROVIDER || "anthropic";
  if (name !== "anthropic" && name !== "openai-compatible") {
    throw new Error(`AI_PROVIDER is "${name}"; use "anthropic" or "openai-compatible" (see docs/MANUAL.md).`);
  }
  return name;
}

function modelFor(stage: CompletionRequest["stage"]): string {
  const model = stage === "extract" ? process.env.AI_MODEL_EXTRACT : process.env.AI_MODEL_EDITORIAL;
  if (!model && stage === "editorial" && process.env.AI_MODEL_DRAFT) {
    throw new Error("Rename AI_MODEL_DRAFT to AI_MODEL_EDITORIAL in .env.local (the name docs/MANUAL.md uses).");
  }
  if (!model) throw new Error(`Set AI_MODEL_${stage === "extract" ? "EXTRACT" : "EDITORIAL"} in .env.local (see .env.example).`);
  return model;
}

/** The model's context window in tokens, for deciding whether a paper must be read in chunks. */
export function contextTokens(): number {
  const n = Number(process.env.AI_CONTEXT_TOKENS ?? 128000);
  if (!Number.isFinite(n) || n < 4000) throw new Error("AI_CONTEXT_TOKENS must be a number of tokens, e.g. 128000.");
  return n;
}

export function replyTokens(request?: Pick<CompletionRequest, "maxTokens">): number {
  if (request?.maxTokens) return request.maxTokens;
  if (process.env.AI_MAX_TOKENS) return Number(process.env.AI_MAX_TOKENS);
  return providerName() === "anthropic" ? 64000 : 32000;
}

/** Anthropic's effort for a stage, from the same AI_THINKING_* setting; null for "off". */
export function effortFor(stage: CompletionRequest["stage"]): string | null {
  const level = thinkingFor(stage);
  if (level === null) return null;
  return level === "none" || level === "minimal" ? "low" : level;
}

/** JSON-schema keys Anthropic's structured outputs refuse. The zod check still enforces them in code. */
const UNSUPPORTED_SCHEMA_KEYS = new Set([
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
  "minLength", "maxLength", "pattern", "minItems", "maxItems", "uniqueItems", "default", "$schema",
]);

/**
 * A zod schema as a JSON schema Anthropic's structured outputs accept: unsupported constraints
 * removed, every object closed (additionalProperties: false). An open-ended object (a record)
 * cannot be expressed, so a schema holding one returns null and the request goes without it.
 * The full zod check still runs on the reply (completeJson), so nothing is checked less.
 */
export function jsonSchemaFor(schema: z.ZodType): Record<string, unknown> | null {
  let open = false;
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_SCHEMA_KEYS.has(key)) continue;
      if (key === "additionalProperties" && value !== false) { open = true; continue; }
      if (key === "propertyNames" || key === "patternProperties") { open = true; continue; }
      out[key] = clean(value);
    }
    if (out.type === "object") out.additionalProperties = false;
    return out;
  };
  const result = clean(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })) as Record<string, unknown>;
  return open ? null : result;
}

/** Tokens used since the last reset, over every request (retries included). */
export interface Usage { requests: number; input: number; cacheWrite: number; cacheRead: number; output: number }
let usage: Usage = { requests: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
export function usageSoFar(): Usage { return { ...usage }; }
export function resetUsage(): void { usage = { requests: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }; }
function addUsage(part: Partial<Usage>): void {
  usage = {
    requests: usage.requests + (part.requests ?? 0),
    input: usage.input + (part.input ?? 0),
    cacheWrite: usage.cacheWrite + (part.cacheWrite ?? 0),
    cacheRead: usage.cacheRead + (part.cacheRead ?? 0),
    output: usage.output + (part.output ?? 0),
  };
}

/**
 * Anthropic list prices in dollars per million tokens (input, output), checked 2026-11-20.
 * Cache writes cost 1.25× input, cache reads 0.1× (5-minute cache). A model not listed shows
 * tokens only. Only for the printed estimate: nothing is decided by it.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-fable-5-2": { input: 8, output: 40 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** One line: the tokens, and the list-price cost when the model's price is known. */
export function describeUsage(u: Usage, model: string | undefined): string {
  const tokens = `${u.requests} request(s): ${u.input.toLocaleString("en")} input + ${u.cacheWrite.toLocaleString("en")} cache write + ${u.cacheRead.toLocaleString("en")} cache read, ${u.output.toLocaleString("en")} output (thinking included)`;
  const price = model ? PRICES[model] : undefined;
  if (!price || providerName() !== "anthropic") return `tokens: ${tokens}`;
  const dollars = (u.input * price.input + u.cacheWrite * price.input * 1.25 + u.cacheRead * price.input * 0.1 + u.output * price.output) / 1e6;
  return `tokens: ${tokens}; about $${dollars.toFixed(2)} at ${model} list price`;
}

const THINKING_LEVELS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;

/** The reasoning_effort to send for a stage, or null for "off". An unknown value fails before any request. */
export function thinkingFor(stage: CompletionRequest["stage"]): string | null {
  const name = stage === "extract" ? "AI_THINKING_EXTRACT" : "AI_THINKING_EDITORIAL";
  const value = process.env[name] || (stage === "extract" ? "high" : "medium");
  if (value === "off") return null;
  if (!(THINKING_LEVELS as readonly string[]).includes(value)) {
    throw new Error(`${name} is "${value}"; use one of ${THINKING_LEVELS.join(", ")}, or "off" (see docs/MANUAL.md).`);
  }
  return value;
}

/**
 * Gemini's openai-compatible endpoint refuses top_k and sampling values outside its range
 * (temperature 0–2, top_p 0–1). Nothing sets them today; this keeps a future caller from
 * breaking every request. Other providers get the body unchanged.
 */
export function forGemini(base: string, body: Record<string, unknown>): Record<string, unknown> {
  if (!/generativelanguage\.googleapis\.com/.test(base)) return body;
  const out = { ...body };
  delete out.top_k;
  const inRange = (key: string, max: number) => {
    const v = out[key];
    if (v !== undefined && !(typeof v === "number" && v >= 0 && v <= max)) delete out[key];
  };
  inRange("temperature", 2);
  inRange("top_p", 1);
  return out;
}

/** Busy or rate-limited: worth asking again after a pause. Any other status is final. */
const TRANSIENT = new Set([429, 503]);
const TRANSIENT_TRIES = 4;

/** Pause before try `n` (1, 2, 3): Retry-After if the server sends one, else 5 s, 15 s, 45 s. AI_RETRY_BASE_MS scales it (tests use 0). */
function pauseMs(response: Response, n: number): number {
  const base = Number(process.env.AI_RETRY_BASE_MS ?? 5000);
  const after = Number(response.headers?.get?.("retry-after"));
  return Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 120000) * (base / 5000) : base * 3 ** (n - 1);
}

async function post(url: string, headers: Record<string, string>, body: Record<string, unknown>): Promise<Response> {
  let response!: Response;
  for (let n = 1; n <= TRANSIENT_TRIES; n++) {
    response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    if (!TRANSIENT.has(response.status) || n === TRANSIENT_TRIES) return response;
    const wait = pauseMs(response, n);
    console.warn(`AI server answered ${response.status} (busy or rate-limited); asking again in ${Math.round(wait / 1000)} s (try ${n + 1} of ${TRANSIENT_TRIES}).`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return response;
}

/** Retries once without an optional setting the server refused (some models take no temperature, or no JSON mode). */
async function postWithFallback(url: string, headers: Record<string, string>, body: Record<string, unknown>, optional: string[]): Promise<Response> {
  let response = await post(url, headers, body);
  const present = optional.filter((key) => key in body);
  if (response.status === 400 && present.length > 0) {
    for (const key of present) delete body[key];
    response = await post(url, headers, body);
  }
  if (!response.ok) throw new Error(`AI request failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
  return response;
}

const CACHED = { type: "ephemeral" } as const;

/**
 * Reads an Anthropic reply: a streamed one (server-sent events) or, from an older recording, one
 * JSON message. Returns the text parts, the stop reason and the token use.
 */
export function readAnthropicReply(raw: string): { text: string; stopReason: string | null; usage: Partial<Usage> } {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{")) {
    const data = JSON.parse(trimmed) as { content?: { type: string; text?: string }[]; stop_reason?: string; usage?: Record<string, number> };
    const u = data.usage ?? {};
    return {
      text: (data.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join(""),
      stopReason: data.stop_reason ?? null,
      usage: { input: u.input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0 },
    };
  }
  let text = "";
  let stopReason: string | null = null;
  const used: Partial<Usage> = {};
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const event = JSON.parse(line.slice(5)) as {
      type: string; message?: { usage?: Record<string, number> }; delta?: { type?: string; text?: string; stop_reason?: string };
      usage?: Record<string, number>; error?: { message?: string };
    };
    if (event.type === "error") throw new Error(`AI request failed while streaming: ${event.error?.message ?? "unknown error"}`);
    if (event.type === "message_start") {
      const u = event.message?.usage ?? {};
      used.input = u.input_tokens ?? 0;
      used.cacheWrite = u.cache_creation_input_tokens ?? 0;
      used.cacheRead = u.cache_read_input_tokens ?? 0;
    }
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") text += event.delta.text ?? "";
    if (event.type === "message_delta") {
      if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
      if (event.usage?.output_tokens !== undefined) used.output = event.usage.output_tokens;
    }
  }
  return { text, stopReason, usage: used };
}

async function anthropic(request: CompletionRequest, messages: Message[]): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("Set AI_API_KEY in .env.local (see .env.example).");
  // The same-for-every-paper parts go first and are marked for caching: the system prompt, then the
  // worked example at the start of the first user message. A JSON retry re-reads them from the cache too.
  const sent = messages.map((message, i) => (i === 0 && request.stable
    ? { role: message.role, content: [{ type: "text", text: request.stable, cache_control: CACHED }, { type: "text", text: message.content }] }
    : message));
  const outputConfig: Record<string, unknown> = {};
  const effort = effortFor(request.stage);
  if (effort) outputConfig.effort = effort;
  if (request.schema) outputConfig.format = { type: "json_schema", schema: request.schema };
  const body: Record<string, unknown> = {
    model: modelFor(request.stage),
    max_tokens: replyTokens(request),
    system: [{ type: "text", text: request.system, cache_control: CACHED }],
    messages: sent,
    stream: true,
  };
  if (Object.keys(outputConfig).length > 0) body.output_config = outputConfig;
  const url = `${process.env.AI_BASE_URL || "https://api.anthropic.com"}/v1/messages`;
  const headers = { "x-api-key": key, "anthropic-version": "2023-06-01" };
  let response = await post(url, headers, body);
  // A schema the API cannot compile is not worth losing the request over: ask again without it.
  // The zod check in completeJson still judges the reply.
  if (response.status === 400 && request.schema) {
    console.warn(`warning: the API refused the JSON schema (${(await response.text()).slice(0, 200)}); asking again without it.`);
    delete outputConfig.format;
    if (Object.keys(outputConfig).length === 0) delete body.output_config;
    response = await post(url, headers, body);
  }
  if (response.status === 400 && body.output_config) {
    delete body.output_config;
    response = await post(url, headers, body);
  }
  if (!response.ok) throw new Error(`AI request failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
  const reply = readAnthropicReply(await response.text());
  addUsage({ requests: 1, ...reply.usage });
  if (reply.stopReason === "max_tokens") throw new Error("The model ran out of room before finishing. Raise AI_MAX_TOKENS in .env.local.");
  if (reply.stopReason === "refusal") throw new Error("The model declined this request (stop reason: refusal). Nothing was saved.");
  if (!reply.text) throw new Error("The model returned no text.");
  return reply.text;
}

async function openaiCompatible(request: CompletionRequest, messages: Message[]): Promise<string> {
  const base = process.env.AI_BASE_URL;
  if (!base) throw new Error("Set AI_BASE_URL in .env.local, e.g. https://api.groq.com/openai/v1 (see docs/MANUAL.md).");
  const key = process.env.AI_API_KEY;
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(base);
  if (!key && !local) throw new Error("Set AI_API_KEY in .env.local (see docs/MANUAL.md).");
  const body: Record<string, unknown> = {
    model: modelFor(request.stage),
    max_tokens: replyTokens(request),
    messages: [{ role: "system", content: request.system },
      ...messages.map((message, i) => (i === 0 && request.stable ? { ...message, content: request.stable + message.content } : message))],
    response_format: { type: "json_object" },
  };
  if (request.stage === "extract") body.temperature = 0;
  const thinking = thinkingFor(request.stage);
  if (thinking) body.reasoning_effort = thinking;
  const response = await postWithFallback(`${base.replace(/\/$/, "")}/chat/completions`,
    key ? { authorization: `Bearer ${key}` } : {}, forGemini(base, body), ["temperature", "response_format", "reasoning_effort"]);
  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
  };
  const cached = data.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  addUsage({ requests: 1, input: (data.usage?.prompt_tokens ?? 0) - cached, cacheRead: cached, output: data.usage?.completion_tokens ?? 0 });
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("The model ran out of room before finishing. Raise AI_MAX_TOKENS in .env.local.");
  const text = choice?.message?.content ?? "";
  if (!text) throw new Error("The model returned no text.");
  return text;
}

type Message = { role: "user" | "assistant"; content: string };

function send(request: CompletionRequest, messages: Message[]): Promise<string> {
  return providerName() === "anthropic" ? anthropic(request, messages) : openaiCompatible(request, messages);
}

export async function complete(request: CompletionRequest): Promise<string> {
  return send(request, [{ role: "user", content: request.prompt }]);
}

/** Pulls the JSON object out of a model reply, tolerating a code fence or a stray sentence around it. */
export function parseJsonReply(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model's reply contained no JSON object.");
  return JSON.parse(reply.slice(start, end + 1));
}

/** Says what is wrong with a parsed reply, or null if it is the right shape. Usually a zod schema's safeParse. */
export type JsonCheck = (value: unknown) => string | null;

/**
 * Asks for one JSON object and checks its shape. A reply that is not JSON, or
 * not the right shape, is sent back once with the error; a second bad reply
 * fails loudly. The shape check is only the schema: the gate and the lint
 * still judge the content afterwards.
 */
export async function completeJson(request: CompletionRequest, check: JsonCheck): Promise<{ value: unknown; retries: number }> {
  const messages: Message[] = [{ role: "user", content: request.prompt }];
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await send(request, messages);
    let problem: string | null;
    let value: unknown;
    try {
      value = parseJsonReply(reply);
      problem = check(value);
    } catch (error) {
      problem = `not valid JSON: ${(error as Error).message}`;
    }
    if (problem === null) return { value, retries: attempt };
    lastError = problem;
    messages.push({ role: "assistant", content: reply },
      { role: "user", content: `Your reply was rejected: ${problem.slice(0, 2000)}\nReply again with the whole corrected JSON object and nothing else.` });
  }
  throw new Error(`The model's reply was still invalid after one retry: ${lastError.slice(0, 600)}`);
}

/** Turns a zod safeParse result into a JsonCheck message. */
export function zodCheck(schema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }): JsonCheck {
  return (value) => {
    const result = schema.safeParse(value);
    if (result.success) return null;
    return (result.error?.issues ?? []).slice(0, 12).map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`).join("; ");
  };
}
