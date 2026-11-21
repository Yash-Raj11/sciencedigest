/**
 * The Instagram deck, second shape (owner, 2026-11-19): a story a reader can follow in six
 * swipes, in this order. The answer comes second, before any explanation.
 *
 *   1 hook      the common belief as a question, and what the study did (a day, a number or a pair)
 *   2 finding   what it found, in plain rows ("no clear difference", "lower", "higher") or numbers
 *   3 why       the mechanism (H9, H10): a picture, or a sketch from a reviewed concept; no caveat
 *   4 who       "does this apply to you?": who was tested, and who was not
 *   5 receipts  what is strong, what is weak (a limitation, H6), what is missing; the range bar
 *               and the design come from the gate, never from here
 *   6 cta       points to the read's interactive part
 *
 * Words: heading and body together at most 25; the art's own words at most 24, each label short.
 * Every number in the art is { n, ref } or { text, ref } and must appear in the cited passage.
 *
 * Pure: no imports from React, Next or Supabase.
 */

import { z } from "zod";
import type { ReceiptInterval } from "../content/types";

export const SLIDE_KINDS = ["hook", "finding", "why", "who", "receipts", "cta"] as const;
export type SlideKind = (typeof SLIDE_KINDS)[number];

/** Kinds that appear exactly once. A finding may repeat (in place) while the deck stays within the limit. */
export const SINGLE_KINDS: readonly SlideKind[] = ["hook", "why", "who", "receipts", "cta"];

export const DECK_LIMITS = {
  slides: 8,
  /** Heading and body together. */
  wordsPerSlide: 25,
  /** Everything the art writes: labels, rows, columns. */
  artWords: 24,
  /** One label, row or column entry. */
  labelWords: 6,
  heading: 90,
  body: 200,
  marks: 4,
  rows: 4,
  whoItems: 4,
  pictureLabels: 3,
  pictureLabel: 28,
  /** Alternate opening slides beside the deck's own hook. */
  altHooks: 3,
  /** A plateau's axis: whole steps, each a tick. */
  plateauSteps: 14,
};

/** The metaphors the art kit can draw. Each is one bold image, no numbers, no axes. */
export const PICTURE_MOTIFS = ["parking-spot", "two-piles", "ledger", "ramp", "doorbell"] as const;
export type PictureMotif = (typeof PICTURE_MOTIFS)[number];

/** Sketch shapes: a shape only, monochrome and dotted, on a reviewed concept (CLAUDE.md, sketch rule). */
export const SKETCH_SHAPES = ["shrink"] as const;

/** What a finding row may say. The words drawn are fixed here, so the lint can check each one. */
export const VERDICTS = { "no-clear-difference": "no clear difference", lower: "lower", higher: "higher" } as const;
export type Verdict = keyof typeof VERDICTS;

const Markup = z.string().min(1);
/** A value printed large: the exact characters of the cited passage. */
const Value = z.object({ text: z.string().min(1), ref: z.string().min(1) }).strict();
/** A number used for geometry or printed small: it must appear in the cited passage. */
const Num = z.object({ n: z.number(), ref: z.string().min(1) }).strict();
/** A shape drawn as the paper's result (solid) or the authors' explanation (dashed). */
const Evidence = { kind: z.enum(["measured", "proposed"]), fact: z.string().regex(/^fact:/) };

const NumberArt = z.object({ motif: z.literal("number"), value: Value, unit: Markup.optional(), label: Markup }).strict();
const PairSide = z.object({ value: Value, unit: Markup.optional(), label: Markup }).strict();
const PairArt = z.object({ motif: z.literal("pair"), a: PairSide, b: PairSide }).strict();
/**
 * A waking day as one line: marks at their time after waking, then the stretch from the last mark
 * to the end of the day. Times come from the paper ({ n, ref }) in minutes or hours.
 */
const Time = Num.extend({ unit: z.enum(["min", "h"]) }).strict();
const DayArt = z.object({
  motif: z.literal("day"),
  start: Markup,
  end: Markup,
  marks: z.array(z.object({ at: Time, label: Markup }).strict()).min(1).max(DECK_LIMITS.marks),
  tail: z.object({ length: Time, label: Markup }).strict(),
}).strict();
const VerdictsArt = z.object({
  motif: z.literal("verdicts"),
  rows: z.array(z.object({ label: Markup, verdict: z.enum(Object.keys(VERDICTS) as [Verdict, ...Verdict[]]), fact: z.string().regex(/^fact:/) }).strict())
    .min(1).max(DECK_LIMITS.rows),
}).strict();
const PictureArt = z.object({
  motif: z.enum(PICTURE_MOTIFS), ...Evidence,
  /** On the picture beside the part they name, in the motif's slot order (lib/carousel/art-geometry.ts). */
  labels: z.array(Markup).max(DECK_LIMITS.pictureLabels).optional(),
}).strict();
/**
 * A curve that drops, then levels off, on the paper's own axis (the steps read: days a week with
 * 8,000 steps). The axis ends and the stretch where it levels off are the paper's numbers
 * ({ n, ref }); the whole steps between are unlabelled ticks. The curve's height is shape only:
 * the paper prints no value for it, and the slide says so under the drawing.
 */
const PlateauArt = z.object({
  motif: z.literal("plateau"), ...Evidence,
  /** Under the axis: what it counts. */
  axis: Markup,
  /** Beside the curve's start: what it measures. */
  y: Markup,
  from: Num,
  to: Num,
  levels: z.object({ from: Num, to: Num, label: Markup }).strict(),
}).strict();
const SketchArt = z.object({
  motif: z.literal("sketch"),
  shape: z.enum(SKETCH_SHAPES),
  /** The reviewed background concept the shape rests on (content/concepts/<slug>.json). */
  concept: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  a: Markup,
  b: Markup,
  /** What the shape stands for, in words. */
  caption: Markup,
}).strict();
const WhoArt = z.object({
  motif: z.literal("who"),
  tested: z.array(Markup).min(1).max(DECK_LIMITS.whoItems),
  /** Each cites the paper's own words: a limitation or the authors' statement of what they did not test. */
  notTested: z.array(Markup).max(DECK_LIMITS.whoItems),
}).strict();
const ChecksArt = z.object({
  motif: z.literal("checks"),
  strong: Markup,
  /** Must cite a limitation fact (H6). */
  weak: Markup,
  missing: Markup.nullable().default(null),
}).strict();

export const SlideArt = z.discriminatedUnion("motif", [NumberArt, PairArt, DayArt, VerdictsArt, PictureArt, PlateauArt, SketchArt, WhoArt, ChecksArt]);
export type SlideArtDef = z.infer<typeof SlideArt>;

/** Which art each kind may carry, and whether it must. The cta draws its own. */
export const ART_FOR: Record<SlideKind, { motifs: readonly string[]; required: boolean }> = {
  hook: { motifs: ["day", "number", "pair", "plateau"], required: true },
  finding: { motifs: ["verdicts", "number", "pair"], required: true },
  why: { motifs: ["plateau", "sketch", ...PICTURE_MOTIFS], required: false },
  who: { motifs: ["who"], required: true },
  receipts: { motifs: ["checks"], required: true },
  cta: { motifs: [], required: false },
};

export const SlideDef = z.object({
  kind: z.enum(SLIDE_KINDS),
  heading: Markup,
  body: Markup.nullable().default(null),
  art: SlideArt.nullable().default(null),
});
export type SlideDefT = z.infer<typeof SlideDef>;

/**
 * An alternate opening slide (owner, 2026-11-20): the same hook, opened from another angle, so the
 * owner chooses the opening in /admin/queue. Held to every rule the hook is held to. `name` is for
 * the owner only ("The plateau"); it is never drawn.
 */
export const AltHook = SlideDef.extend({ name: z.string().min(1).max(40) });
export type AltHookT = z.infer<typeof AltHook>;
/** Option letters: the deck's own hook is A, the alternates B, C, D. */
export const HOOK_LETTERS = ["a", "b", "c", "d"] as const;

/** Every markup string a slide shows, with where it lives, in reading order. `art` marks the art's own words. */
export function slideMarkup(slide: SlideDefT, i: number, at = `carousel.slides[${i}]`): { where: string; markup: string; art: boolean }[] {
  const out = [{ where: `${at}.heading`, markup: slide.heading, art: false }];
  if (slide.body) out.push({ where: `${at}.body`, markup: slide.body, art: false });
  const a = slide.art;
  if (!a) return out;
  const add = (path: string, markup: string) => out.push({ where: `${at}.art.${path}`, markup, art: true });
  const side = (s: z.infer<typeof PairSide>, name: string) => { if (s.unit) add(`${name}.unit`, s.unit); add(`${name}.label`, s.label); };
  switch (a.motif) {
    case "number": side(a, "value"); break;
    case "pair": side(a.a, "a"); side(a.b, "b"); break;
    case "day": add("start", a.start); a.marks.forEach((m, j) => add(`marks[${j}].label`, m.label)); add("tail.label", a.tail.label); add("end", a.end); break;
    case "verdicts": a.rows.forEach((r, j) => add(`rows[${j}].label`, r.label)); break;
    case "plateau": add("y", a.y); add("levels.label", a.levels.label); add("axis", a.axis); break;
    case "sketch": add("a", a.a); add("b", a.b); add("caption", a.caption); break;
    case "who": a.tested.forEach((m, j) => add(`tested[${j}]`, m)); a.notTested.forEach((m, j) => add(`notTested[${j}]`, m)); break;
    case "checks": add("strong", a.strong); add("weak", a.weak); if (a.missing) add("missing", a.missing); break;
    default: (a.labels ?? []).forEach((m, j) => add(`labels[${j}]`, m));
  }
  return out;
}

/** The big values a slide prints, with where they live. */
export function slideValues(slide: SlideDefT, i: number, base = `carousel.slides[${i}]`): { where: string; value: { text: string; ref: string } }[] {
  const at = `${base}.art`;
  const a = slide.art;
  if (a?.motif === "number") return [{ where: `${at}.value`, value: a.value }];
  if (a?.motif === "pair") return [{ where: `${at}.a.value`, value: a.a.value }, { where: `${at}.b.value`, value: a.b.value }];
  return [];
}

/** The numbers a slide's art places by (a day's times, a plateau's axis). Each must be in its cited passage. */
export function slideNumbers(slide: SlideDefT, i: number, base = `carousel.slides[${i}]`): { where: string; num: { n: number; ref: string } }[] {
  const at = `${base}.art`;
  const a = slide.art;
  if (a?.motif === "plateau") {
    return [["from", a.from], ["to", a.to], ["levels.from", a.levels.from], ["levels.to", a.levels.to]].map(([k, num]) => ({ where: `${at}.${k as string}`, num: num as { n: number; ref: string } }));
  }
  if (a?.motif !== "day") return [];
  return [...a.marks.map((m, j) => ({ where: `${at}.marks[${j}].at`, num: m.at })), { where: `${at}.tail.length`, num: a.tail.length }];
}

/** The fact ids a slide's art draws as evidence ("fact:<id>"), with where. */
export function slideEvidence(slide: SlideDefT, i: number, base = `carousel.slides[${i}]`): { where: string; fact: string; kind: "measured" | "verdict" | "proposed" }[] {
  const at = `${base}.art`;
  const a = slide.art;
  if (!a) return [];
  if (a.motif === "verdicts") return a.rows.map((r, j) => ({ where: `${at}.rows[${j}]`, fact: r.fact.slice(5), kind: "verdict" as const }));
  if ("fact" in a) return [{ where: at, fact: a.fact.slice(5), kind: a.kind }];
  return [];
}

/**
 * The shape of a deck: kinds in the order above, the single ones once each, every kind present,
 * at most 8 slides, and only the art each kind may carry. Returns problems as [where, message].
 */
export function deckShapeProblems(slides: SlideDefT[]): [string, string][] {
  const problems: [string, string][] = [];
  if (slides.length > DECK_LIMITS.slides) problems.push(["carousel.slides", `at most ${DECK_LIMITS.slides} slides; this has ${slides.length}`]);
  for (const kind of SLIDE_KINDS) {
    const n = slides.filter((s) => s.kind === kind).length;
    if (n === 0) problems.push(["carousel.slides", `no ${kind} slide; a deck has all six kinds: ${SLIDE_KINDS.join(", ")}`]);
    if (n > 1 && SINGLE_KINDS.includes(kind)) problems.push(["carousel.slides", `${n} ${kind} slides; a deck has one`]);
  }
  let last = -1;
  slides.forEach((s, i) => {
    const rank = SLIDE_KINDS.indexOf(s.kind);
    if (rank < last) problems.push([`carousel.slides[${i}]`, `a ${s.kind} slide after a ${SLIDE_KINDS[last]} slide; the order is ${SLIDE_KINDS.join(" → ")}`]);
    last = Math.max(last, rank);
    const { motifs, required } = ART_FOR[s.kind];
    if (s.art && !motifs.includes(s.art.motif)) {
      problems.push([`carousel.slides[${i}].art`, motifs.length === 0 ? `a ${s.kind} slide draws its own art; remove "art"` : `a ${s.kind} slide draws ${motifs.join(" or ")}, not "${s.art.motif}"`]);
    }
    if (!s.art && required) problems.push([`carousel.slides[${i}].art`, `a ${s.kind} slide needs its art (${motifs.join(" or ")})`]);
    problems.push(...artProblems(s, `carousel.slides[${i}].art`));
    if (s.kind === "receipts" && s.body) problems.push([`carousel.slides[${i}].body`, "the receipts slide says it in its art (strong, weak, missing); remove the body"]);
  });
  return problems;
}

/** Rules on one slide's art that the schema cannot say. */
function artProblems(s: SlideDefT, at: string): [string, string][] {
  if (s.art?.motif !== "plateau") return [];
  const problems: [string, string][] = [];
  const { from, to, levels } = s.art;
  const steps = to.n - from.n;
  if (!(from.n < levels.from.n && levels.from.n <= levels.to.n && levels.to.n < to.n)) {
    problems.push([at, `the stretch where it levels off (${levels.from.n} to ${levels.to.n}) must sit inside the axis (${from.n} to ${to.n})`]);
  }
  if (!Number.isInteger(steps) || steps > DECK_LIMITS.plateauSteps) problems.push([at, `the axis runs in whole steps, at most ${DECK_LIMITS.plateauSteps} of them`]);
  return problems;
}

/** Alternate hooks: hook slides only, the hook's art, at most three, each with its own name. */
export function altHookProblems(alts: AltHookT[]): [string, string][] {
  const problems: [string, string][] = [];
  if (alts.length > DECK_LIMITS.altHooks) problems.push(["carousel.altHooks", `at most ${DECK_LIMITS.altHooks} alternate hooks; this has ${alts.length}`]);
  const seen = new Set<string>();
  alts.forEach((h, j) => {
    const at = `carousel.altHooks[${j}]`;
    if (h.kind !== "hook") problems.push([at, `an alternate opening slide is a hook, not a ${h.kind} slide`]);
    const { motifs } = ART_FOR.hook;
    if (!h.art) problems.push([`${at}.art`, `a hook slide needs its art (${motifs.join(" or ")})`]);
    else if (!motifs.includes(h.art.motif)) problems.push([`${at}.art`, `a hook slide draws ${motifs.join(" or ")}, not "${h.art.motif}"`]);
    const key = h.name.trim().toLowerCase();
    if (seen.has(key)) problems.push([`${at}.name`, `"${h.name}" names another alternate already; give each its own name`]);
    seen.add(key);
    problems.push(...artProblems(h, `${at}.art`));
  });
  return problems;
}

/**
 * The hook opens with the question and what the study did (H2). A caveat there is a hedge before
 * the point is made; it belongs on the receipts slide.
 */
export const HOOK_HEDGES: [string, RegExp][] = [
  ["small study", /\bsmall (?:trial|study|sample|group)\b/i],
  ["observational", /\bobservational\b/i],
  ["only", /\bonly\b/i],
  ["may not", /\bmay not\b/i],
  ["cannot show", /\bcan(?:not|'t) (?:show|prove|say|tell)\b/i],
  ["caution", /\bcaution|\bcareful\b|\bhold (?:it|this) loosely\b/i],
  ["more research", /\bmore (?:research|studies) (?:is|are) needed\b/i],
];

/** Minutes, for placing a day's marks. */
export const minutesOf = (t: { n: number; unit: "min" | "h" }) => (t.unit === "h" ? t.n * 60 : t.n);

const RATIOS = new Set(["RR", "HR", "OR"]);
const shown = (n: number) => (n < 0 ? "−" : "") + String(Math.abs(n));

/**
 * The receipts slide's range bar (owner, 2026-11-19; van der Bles et al. 2020: a printed range keeps
 * trust where a verbal hedge loses it). Drawn from the headline estimate's own gated numbers, never
 * written in the deck. Null when the headline result is not an estimate or has no 95% interval:
 * the slide then says so in words.
 */
export function receiptInterval(est: { measure: string; point: number; ciLow: number | null; ciHigh: number | null; unit: string | null } | null | undefined): ReceiptInterval | null {
  if (!est || est.ciLow === null || est.ciHigh === null) return null;
  return {
    low: est.ciLow, point: est.point, high: est.ciHigh,
    none: RATIOS.has(est.measure) ? 1 : 0,
    text: { low: shown(est.ciLow), point: shown(est.point), high: shown(est.ciHigh) },
    unit: est.unit ?? null,
  };
}
