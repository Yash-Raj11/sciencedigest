/**
 * Stage 0: retraction screening against the Retraction Watch data.
 *
 * Crossref publishes the database as one CSV in a git repository
 * (https://gitlab.com/crossref/retraction-watch-data, CC0, updated each
 * working day). Never call an API per paper: pull the file, then join locally.
 * Pure: the network and database parts live in scripts/retractions-sync.mts.
 */

export interface Retraction {
  doi: string;
  nature: string;
  date: string | null;
  reason: string;
}

/** Minimal RFC 4180 CSV reader: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function normalizeDoi(doi: string): string {
  return doi.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");
}

function toIsoDate(raw: string): string | null {
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

/**
 * Reads the Retraction Watch CSV. Column names are looked up by header, so a
 * reordered file still parses; a file missing a needed column throws.
 */
export function parseRetractionWatch(csv: string): Retraction[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const col = (name: string) => {
    const i = header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    if (i < 0) throw new Error(`Retraction Watch CSV has no "${name}" column; the file format has changed`);
    return i;
  };
  const doi = col("OriginalPaperDOI");
  const nature = col("RetractionNature");
  const date = col("RetractionDate");
  const reason = col("Reason");
  const out: Retraction[] = [];
  for (const row of rows) {
    const value = normalizeDoi(row[doi] ?? "");
    if (!value || value === "unavailable") continue;
    out.push({ doi: value, nature: row[nature] ?? "", date: toIsoDate(row[date] ?? ""), reason: row[reason] ?? "" });
  }
  return out;
}

/** Only these natures mean "do not publish / take down". A correction is not a retraction. */
const BLOCKING = new Set(["retraction", "expression of concern"]);

export function isBlocking(retraction: Retraction): boolean {
  return BLOCKING.has(retraction.nature.trim().toLowerCase());
}

/** The backward join: which of our live papers now appear in the retraction data? */
export function findRetracted(liveDois: string[], retractions: Retraction[]): Retraction[] {
  const live = new Set(liveDois.map(normalizeDoi));
  return retractions.filter((r) => live.has(r.doi) && isBlocking(r));
}
