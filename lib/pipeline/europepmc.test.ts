import { describe, expect, it } from "vitest";
import { readSearchRecord, xmlToText } from "./europepmc";
import { checkLicense } from "./license";
import { locate } from "./gate";

describe("xmlToText", () => {
  const xml = `<article><front><article-title>Steps &amp; mortality</article-title></front><body>
    <sec><title>Results</title><p>Risk fell by 14.9 points (95% CI &#x2212;18.8 to &#8722;10.9)<xref ref-type="bibr" rid="r1">1</xref>.</p>
    <table-wrap><table><tr><th>Group</th><th>Deaths</th></tr><tr><td>0 days</td><td>257/632 (40.7)</td></tr></table></table-wrap></sec>
    </body><back><ref-list><ref>Smith J. A cited paper with the number 99.</ref></ref-list></back></article>`;
  const text = xmlToText(xml);

  it("decodes entities, including numeric ones", () => {
    expect(text).toContain("Steps & mortality");
    expect(text).toContain("(95% CI −18.8 to −10.9)");
  });
  it("drops the reference list and citation markers", () => {
    expect(text).not.toContain("cited paper");
    expect(text).toContain("to −10.9).");
  });
  it("keeps table cells on one line, so a quoted cell can be found again", () => {
    expect(locate(text, "257/632 (40.7)")).not.toBeNull();
    expect(text).toMatch(/0 days \| 257\/632 \(40\.7\) \|/);
  });
});

describe("readSearchRecord", () => {
  const record = { doi: "10.1/x", pmid: "1", pmcid: "PMC1", title: "A title.", authorString: "Inoue K, Ritz B.", pubYear: "2023",
    journalInfo: { journal: { title: "JAMA Network Open" } }, license: "cc by", isOpenAccess: "Y" };

  it("maps the fields the pipeline needs", () => {
    expect(readSearchRecord(record)).toEqual({ doi: "10.1/x", pmid: "1", pmcid: "PMC1", title: "A title", authors: "Inoue K, Ritz B",
      journal: "JAMA Network Open", year: 2023, license: "cc by", openAccess: true });
  });
  it("its licence string passes the allowlist only when the licence does", () => {
    expect(checkLicense(readSearchRecord(record).license).ok).toBe(true);
    expect(checkLicense(readSearchRecord({ ...record, license: "cc by-nc" }).license).ok).toBe(false);
    expect(checkLicense(readSearchRecord({ ...record, license: "cc by-nd" }).license).ok).toBe(false);
    expect(checkLicense(readSearchRecord({ ...record, license: undefined }).license).ok).toBe(false);
  });
});
