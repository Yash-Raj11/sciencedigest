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
 *   AI_MAX_TOKENS         optional: room for the reply (default 16000 anthropic, 32000 otherwise;
 *                         a reasoning model spends part of it thinking)
 *   AI_THINKING_EXTRACT   openai-compatible only: how hard the model thinks, sent as reasoning_effort.
 *   AI_THINKING_EDITORIAL none | minimal | low | medium | high | xhigh, or "off" to send nothing.
 *                         Defaults: "high" for extract, "medium" for editorial. A server that
 *                         refuses the setting (400) is asked again without it.
 *
 * Structured extraction is the step where a weak model produces exactly the
 * errors this product exists to avoid. Whatever the model, the gate and the lint
 * judge its output unchanged.
 */

export interface CompletionRequest {
  stage: "extract" | "editorial";
  system: string;
  prompt: string;
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
  return providerName() === "anthropic" ? 16000 : 32000;
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

async function anthropic(request: CompletionRequest, messages: Message[]): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("Set AI_API_KEY in .env.local (see .env.example).");
  const body: Record<string, unknown> = {
    model: modelFor(request.stage),
    max_tokens: replyTokens(request),
    system: request.system,
    messages,
  };
  // Extraction should be as repeatable as the model allows.
  if (request.stage === "extract") body.temperature = 0;
  const response = await postWithFallback(`${process.env.AI_BASE_URL || "https://api.anthropic.com"}/v1/messages`,
    { "x-api-key": key, "anthropic-version": "2023-06-01" }, body, ["temperature"]);
  const data = (await response.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
  const text = (data.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
  if (data.stop_reason === "max_tokens") throw new Error("The model ran out of room before finishing. Raise AI_MAX_TOKENS in .env.local.");
  if (!text) throw new Error("The model returned no text.");
  return text;
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
    messages: [{ role: "system", content: request.system }, ...messages],
    response_format: { type: "json_object" },
  };
  if (request.stage === "extract") body.temperature = 0;
  const thinking = thinkingFor(request.stage);
  if (thinking) body.reasoning_effort = thinking;
  const response = await postWithFallback(`${base.replace(/\/$/, "")}/chat/completions`,
    key ? { authorization: `Bearer ${key}` } : {}, forGemini(base, body), ["temperature", "response_format", "reasoning_effort"]);
  const data = (await response.json()) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
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
