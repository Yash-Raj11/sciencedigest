/**
 * Stage 0: reading a paper from Europe PMC (https://europepmc.org), the open
 * repository this project ingests from. Pure helpers here; the network calls
 * are in scripts/paper.mts.
 */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/**
 * Full-text XML (the JATS format) to plain text. The reference list is dropped;
 * headings, paragraphs and table rows each end up on their own line, so a quote
 * copied from the result can be found in it again by the gate.
 */
export function xmlToText(xml: string): string {
  const body = xml
    .replace(/<ref-list[\s\S]*?<\/ref-list>/g, "")
    .replace(/<xref[^>]*ref-type="bibr"[^>]*>[\s\S]*?<\/xref>/g, "")
    .replace(/<\/(p|title|sec|tr|caption|abstract|article-title)>/g, "\n\n")
    .replace(/<\/(td|th)>/g, " | ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(body)
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface PaperMetaRaw {
  doi: string | null;
  pmid: string | null;
  pmcid: string | null;
  title: string;
  authors: string;
  journal: string;
  year: number | null;
  license: string | null;
  openAccess: boolean;
}

/** Maps one record from Europe PMC's search API (resultType=core) to what the pipeline needs. */
export function readSearchRecord(record: Record<string, unknown>): PaperMetaRaw {
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : null);
  const journal = (record.journalInfo as { journal?: { title?: string } } | undefined)?.journal?.title;
  return {
    doi: text("doi"),
    pmid: text("pmid"),
    pmcid: text("pmcid"),
    title: (text("title") ?? "").replace(/\.$/, ""),
    authors: (text("authorString") ?? "").replace(/\.$/, ""),
    journal: journal ?? text("journalTitle") ?? "",
    year: text("pubYear") ? Number(text("pubYear")) : null,
    license: text("license"),
    openAccess: text("isOpenAccess") === "Y",
  };
}
