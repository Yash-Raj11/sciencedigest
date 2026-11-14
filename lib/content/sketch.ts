/**
 * The sketch (owner's ruling, 2026-11-15; docs/FIGURE-DESIGN.md 0.1, SIMULATORS.md j1).
 *
 * Where the paper measured something relevant, a figure draws that data: solid, bound to fact
 * ids. Otherwise it may draw a sketch: a SHAPE ONLY, no numbers, monochrome and dotted, tagged
 * "Sketch, not data" on the figure itself, resting on a background concept the owner has
 * reviewed. A sketch never contradicts the paper's finding (a person checks that; the rules
 * below are what code can hold).
 *
 * A read declares its sketches in editorial.json, `sketches`:
 *
 *   { "id": "sleep-pressure", "concept": "adenosine", "tag": "Sketch, not data",
 *     "ink": "muted", "stroke": "dotted",
 *     "words": { "alt": "...", "labels": { "rising": "Sleep pressure keeps building" } } }
 *
 * Refused (each rule has a failing fixture in lib/content/sketch.test.ts):
 *   sketch-number   a digit in any of its words, any number in the spec, or a field that would
 *                   carry a value (facts, ticks, values, axis, ref, n ...)
 *   sketch-concept  no concept, a concept that does not exist or fails its checks, or one the
 *                   owner has not reviewed
 *   sketch-colour   any ink but the monochrome ones (ink, muted, meta, line); any word naming
 *                   orange or the finding's colours
 *   sketch          the wrong tag, a stroke that is not dotted, an unknown field
 *
 * Pure: no React, Next or Supabase.
 */

import type { ConceptState } from "../pipeline/concepts";

export const SKETCH_TAG = "Sketch, not data";
export const SKETCH_INKS = ["ink", "muted", "meta", "line"] as const;

export interface SketchProblem { rule: "sketch" | "sketch-number" | "sketch-concept" | "sketch-colour"; where: string; message: string }

const ALLOWED = new Set(["id", "concept", "tag", "ink", "stroke", "words"]);
/** Fields that would make the sketch carry a value, or bind it to a fact. */
const VALUE_FIELDS = /^(facts?|simulator|ticks?|values?|axis|axes|scale|ref|refs|n|number|height|points?|data)$/i;
/** Words that name orange or the finding's colours, anywhere in the spec. */
const ORANGE = /signal-evidence|on-signal|\borange\b|\bpeach\b|\bapricot\b|\baccent\b|\bband\b|SIGNAL_(TEXT|FILL)/i;

export function sketchProblems(raw: unknown, where: string, concepts: Record<string, ConceptState>): SketchProblem[] {
  const out: SketchProblem[] = [];
  const add = (rule: SketchProblem["rule"], at: string, message: string) => out.push({ rule, where: at, message });

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    add("sketch", where, "a sketch is an object: { id, concept, tag, ink, stroke, words }");
    return out;
  }
  const spec = raw as Record<string, unknown>;

  // Numbers and values: anywhere, at any depth.
  const walk = (value: unknown, at: string, key: string) => {
    if (VALUE_FIELDS.test(key)) add("sketch-number", at, `"${key}" would give the sketch a value or a fact; a sketch is a shape only`);
    if (typeof value === "number") add("sketch-number", at, `a sketch holds no number: ${value}`);
    else if (typeof value === "string") {
      if (/\p{N}/u.test(value)) add("sketch-number", at, `a sketch's words hold no digit: "${value}"`);
      if (ORANGE.test(value)) add("sketch-colour", at, `a sketch is monochrome; no orange or finding colour: "${value}"`);
    } else if (value && typeof value === "object") {
      for (const [k, child] of Object.entries(value)) walk(child, `${at}.${k}`, k);
    }
  };
  for (const [key, value] of Object.entries(spec)) walk(value, `${where}.${key}`, key);

  for (const key of Object.keys(spec)) if (!ALLOWED.has(key) && !VALUE_FIELDS.test(key)) add("sketch", `${where}.${key}`, `unknown field "${key}"`);
  if (typeof spec.id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(spec.id)) add("sketch", `${where}.id`, "a sketch needs an id in kebab case");

  // The concept it rests on: present, sound, and reviewed by the owner.
  if (typeof spec.concept !== "string" || !spec.concept) {
    add("sketch-concept", `${where}.concept`, "a sketch rests on a background concept the owner has reviewed: name it");
  } else {
    const state = concepts[spec.concept];
    if (!state) add("sketch-concept", `${where}.concept`, `no content/concepts/${spec.concept}.json`);
    else if (!state.ok) add("sketch-concept", `${where}.concept`, `the concept "${spec.concept}" fails its own checks (${state.errors[0]})`);
    else if (!state.reviewed) add("sketch-concept", `${where}.concept`, `the concept "${spec.concept}" has not been reviewed by the owner; a sketch may rest only on a reviewed concept`);
  }

  if (spec.tag !== SKETCH_TAG) add("sketch", `${where}.tag`, `the tag on the figure must read "${SKETCH_TAG}"`);
  if (spec.stroke !== "dotted") add("sketch", `${where}.stroke`, 'a sketch is drawn dotted ("stroke": "dotted"), never solid or dashed');
  if (!(SKETCH_INKS as readonly string[]).includes(spec.ink as string)) add("sketch-colour", `${where}.ink`, `a sketch is monochrome: ink is one of ${SKETCH_INKS.join(", ")}, not "${String(spec.ink)}"`);

  const words = spec.words as Record<string, unknown> | undefined;
  if (!words || typeof words !== "object" || typeof words.alt !== "string" || !words.alt.trim()) add("sketch", `${where}.words.alt`, "a sketch needs alt text that says it is a sketch of a shape, not data");
  return out;
}
