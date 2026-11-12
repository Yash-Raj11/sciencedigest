/**
 * Text helpers shared by the gate (stage 2) and the lint (stage 4).
 * Pure: no imports from supabase, react or next.
 */

/** Unicode minus, en dash and figure dash all become "-"; odd spaces become " ". */
export function normalize(text: string): string {
  return text
    .replace(/[−–‒‐‑]/g, "-")
    .replace(/[    ]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase();
}

/**
 * Every number in a piece of text, as numbers. "10 000", "10,000" and "10000"
 * are all 10000. A hyphen directly after a letter or digit ("3-7", "CI-0.4")
 * is treated as a range dash, not a minus sign, unless a space precedes it.
 */
export function numbersIn(text: string): number[] {
  const clean = normalize(text).replace(/(\d)[, ](?=\d{3}(\D|$))/g, "$1");
  const found: number[] = [];
  const pattern = /(^|[^\w.])(-?\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(clean)) !== null) {
    found.push(Number(match[2] ?? match[3]));
  }
  return found;
}

/** True when every wanted number appears in the text, ignoring sign formatting. */
export function containsNumbers(text: string, wanted: number[]): boolean {
  const have = numbersIn(text);
  return wanted.every((w) => have.some((h) => h === w || Math.abs(h) === Math.abs(w)));
}

export function words(text: string): string[] {
  return normalize(text).match(/[a-z0-9]+(?:\.[0-9]+)?/g) ?? [];
}

/** Word-level n-grams ("shingles") used to measure copying from the source. */
export function shingles(text: string, size = 7): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + size <= w.length; i += 1) out.add(w.slice(i, i + size).join(" "));
  return out;
}

export function sharedShingles(a: string, b: string, size = 7): string[] {
  const left = shingles(a, size);
  const right = shingles(b, size);
  return [...left].filter((s) => right.has(s));
}

const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Numbers written as words, zero to ninety-nine: "Twenty male volunteers" -> [20]. */
export function wordNumbersIn(text: string): number[] {
  const out: number[] = [];
  const pattern = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](one|two|three|four|five|six|seven|eight|nine))?\b|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/g;
  let match: RegExpExecArray | null;
  const clean = normalize(text);
  while ((match = pattern.exec(clean)) !== null) {
    if (match[1]) out.push(TENS.indexOf(match[1]) * 10 + (match[2] ? UNITS.indexOf(match[2]) : 0));
    else out.push(UNITS.indexOf(match[3]));
  }
  return out;
}
