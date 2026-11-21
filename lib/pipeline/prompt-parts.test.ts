/**
 * The cost changes of 2026-11-20 may not change what the model is asked. The split prompts join to
 * the old prompt character for character, the cached part holds nothing of the paper, and the two
 * extract schemas really can be sent as structured output.
 */

import { describe, expect, it } from "vitest";
import { jsonSchemaFor } from "../ai/provider";
import { CoveragePass } from "./coverage";
import { RawExtraction } from "./extraction";
import { editorialPrompt, editorialPromptParts, extractPrompt, extractPromptParts } from "./prompts";

const extractInput = { meta: { doi: "10.1/x" }, source: "THE PAPER TEXT", exampleExtraction: '{"example": true}' };
const editorialInput = { slug: "a-slug", validated: { facts: ["THE FACTS"] }, exampleEditorial: '{"example": true}', kinds: "KINDS", context: "CONTEXT" };

describe("split prompts", () => {
  it("join back to the whole prompt, character for character", () => {
    const e = extractPromptParts(extractInput);
    expect(e.stable + e.rest).toBe(extractPrompt(extractInput));
    const d = editorialPromptParts(editorialInput);
    expect(d.stable + d.rest).toBe(editorialPrompt(editorialInput));
  });

  it("keep the paper, its metadata and its facts out of the cached part (it must be the same for every paper)", () => {
    const e = extractPromptParts(extractInput);
    expect(e.stable).toContain('{"example": true}');
    expect(e.stable).not.toMatch(/THE PAPER TEXT|10\.1\/x/);
    const d = editorialPromptParts(editorialInput);
    expect(d.stable).not.toMatch(/THE FACTS|a-slug|KINDS|CONTEXT/);
  });

  it("give the same cached part for two different papers", () => {
    const other = extractPromptParts({ ...extractInput, source: "ANOTHER PAPER", meta: { doi: "10.2/y" } });
    expect(other.stable).toBe(extractPromptParts(extractInput).stable);
  });
});

describe("the extract schemas sent as structured output", () => {
  const banned = /"(minimum|maximum|minLength|maxLength|pattern|minItems|maxItems|default)"/;

  it("convert to a schema the API accepts: no refused constraint, every object closed", () => {
    for (const schema of [jsonSchemaFor(RawExtraction.omit({ coverage: true })), jsonSchemaFor(CoveragePass)]) {
      expect(schema).not.toBeNull();
      const text = JSON.stringify(schema);
      expect(text).not.toMatch(banned);
      expect(text).not.toMatch(/"additionalProperties":(?!false)/);
    }
  });

  it("cannot carry the first pass's open-ended coverage map (so the first pass leaves it out)", () => {
    expect(jsonSchemaFor(RawExtraction)).toBeNull();
  });
});
