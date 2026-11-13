/**
 * H11, voice: splitting text into sentences and counting their words.
 *
 * Written here instead of pulled in as a package: the rule is small, and the
 * cases that matter for clinical writing ("e.g.", "et al.", "vs.", decimals,
 * initials) are easier to pin down in forty lines we own and test.
 *
 * When unsure, this does NOT split. Two sentences read as one make a longer
 * sentence, so the length rule errs on the strict side, never the lenient one.
 * Pure: no imports from supabase, react or next.
 */

/** Abbreviations whose full stop does not end a sentence. Lower case, with the stop. */
const ABBREVIATIONS = new Set([
  "e.g.", "i.e.", "al.", "vs.", "etc.", "cf.", "approx.", "ca.", "fig.", "figs.",
  "dr.", "mr.", "mrs.", "ms.", "prof.",
]);

const CLOSERS = new Set(["\"", "'", "”", "’", ")", "]"]);
const OPENERS = /[A-Z0-9"'“‘(\[]/;

/** The run of non-space characters that ends at `end` (exclusive). */
function tokenBefore(text: string, end: number): string {
  let start = end;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  return text.slice(start, end);
}

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") { i += 1; continue; }

    // Take the whole run: "?!", "...", and any quote or bracket that closes it.
    let end = i + 1;
    while (end < text.length && (text[end] === "." || text[end] === "!" || text[end] === "?")) end += 1;
    while (end < text.length && CLOSERS.has(text[end])) end += 1;

    // A sentence ends only before white space (or the end of the text). This is
    // what keeps "0.63", "3.5 mg" and "p < .05" in one piece.
    let next = end;
    while (next < text.length && /\s/.test(text[next])) next += 1;
    const atEnd = next >= text.length;
    if (!atEnd && next === end) { i = end; continue; }
    // The next sentence starts with a capital, a digit or an opening mark.
    if (!atEnd && !OPENERS.test(text[next])) { i = end; continue; }

    if (ch === "." && !atEnd) {
      const token = tokenBefore(text, i + 1).replace(/^[("'“‘\[]+/, "");
      // "e.g.", "et al.", "vs."
      if (ABBREVIATIONS.has(token.toLowerCase())) { i = end; continue; }
      // An initial: "J. Weibel".
      if (/^[A-Z]\.$/.test(token)) { i = end; continue; }
    }

    const sentence = text.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = next;
    i = next;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Words as a reader counts them: "8-hour" is one, "0.63" is one, a lone dash is none. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}
