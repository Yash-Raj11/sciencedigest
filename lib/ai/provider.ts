/**
 * The one file that knows which AI model the pipeline uses.
 *
 * Swapping provider or model is a change to this file (or just to .env.local)
 * and nothing else. The pipeline only ever calls `complete()`.
 *
 * Settings, all in .env.local:
 *   AI_API_KEY            required to run `paper extract` / `paper draft`
 *   AI_MODEL_EXTRACT      model for stage 1 (reading the paper)
 *   AI_MODEL_EDITORIAL    model for stage 3 (writing the read)
 *   AI_BASE_URL           optional; defaults to Anthropic's API
 *
 * Structured extraction is the step where a weak model produces exactly the
 * errors this product exists to avoid, so use a strong model for both. At ten
 * papers a week the cost is a few dollars a month.
 */

export interface CompletionRequest {
  stage: "extract" | "editorial";
  system: string;
  prompt: string;
  maxTokens?: number;
}

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.anthropic.com";

function modelFor(stage: CompletionRequest["stage"]): string {
  const model = stage === "extract" ? process.env.AI_MODEL_EXTRACT : process.env.AI_MODEL_EDITORIAL;
  if (!model) throw new Error(`Set AI_MODEL_${stage === "extract" ? "EXTRACT" : "EDITORIAL"} in .env.local (see .env.example).`);
  return model;
}

async function call(body: Record<string, unknown>): Promise<Response> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("Set AI_API_KEY in .env.local (see .env.example).");
  return fetch(`${BASE_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
}

export async function complete(request: CompletionRequest): Promise<string> {
  const body: Record<string, unknown> = {
    model: modelFor(request.stage),
    max_tokens: request.maxTokens ?? 16000,
    system: request.system,
    messages: [{ role: "user", content: request.prompt }],
  };
  // Extraction should be as repeatable as the model allows.
  if (request.stage === "extract") body.temperature = 0;

  let response = await call(body);
  if (response.status === 400 && "temperature" in body) {
    // Some models do not accept a temperature setting. Ask again without it.
    delete body.temperature;
    response = await call(body);
  }
  if (!response.ok) throw new Error(`AI request failed (${response.status}): ${(await response.text()).slice(0, 400)}`);

  const data = (await response.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
  const text = (data.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
  if (data.stop_reason === "max_tokens") throw new Error("The model ran out of room before finishing. Raise maxTokens in lib/ai/provider.ts.");
  if (!text) throw new Error("The model returned no text.");
  return text;
}

/** Pulls the JSON object out of a model reply, tolerating a code fence or a stray sentence around it. */
export function parseJsonReply(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model's reply contained no JSON object.");
  return JSON.parse(reply.slice(start, end + 1));
}
