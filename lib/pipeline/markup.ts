/**
 * Editorial markup: every sentence carries the ids of the facts it rests on.
 *
 *   "People who did X had a rate 14.9 points lower. [ard_1_2] Here is the catch. [-]"
 *
 * `[id, id]` lists fact ids from the validated extraction. `[-]` marks a
 * framing sentence that makes no claim; the lint refuses a `[-]` sentence that
 * contains a number or a causal verb. Text with no marker at all is an error:
 * that is how an unsourced claim would otherwise slip through.
 */

export interface Sentence {
  text: string;
  refs: string[];
}

export function parseMarkup(source: string): Sentence[] {
  const sentences: Sentence[] = [];
  const pattern = /\s*([^[\]]+?)\s*\[([^\]]*)\]/gy;
  let index = 0;
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(source)) !== null) {
    index = pattern.lastIndex;
    const marker = match[2].trim();
    const refs = marker === "-" ? [] : marker.split(",").map((r) => r.trim()).filter(Boolean);
    if (marker !== "-" && refs.length === 0) {
      throw new Error(`empty reference marker after: "${match[1].slice(0, 60)}"`);
    }
    sentences.push({ text: match[1].trim(), refs });
  }
  const rest = source.slice(index).trim();
  if (rest.length > 0) {
    throw new Error(`text without a [reference] marker: "${rest.slice(0, 80)}"`);
  }
  if (sentences.length === 0) throw new Error("empty text");
  return sentences;
}

export function plain(sentences: Sentence[]): string {
  return sentences.map((s) => s.text).join(" ");
}
