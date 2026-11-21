/**
 * The publication-type screen at fetch. The type lists are Europe PMC's, as printed for real
 * records on 2026-11-20.
 */

import { describe, expect, it } from "vitest";
import { publicationTypes, screenPublicationType } from "./pubtype";

const NARRATIVE_REVIEW = ["Research Support, Non-U.S. Gov't", "review-article", "Review", "Journal Article"]; // PMC9471313, sugar and inflammation
const META_ANALYSIS = ["Meta-Analysis", "Systematic Review", "review-article", "Journal Article"]; // PMC5986486
const RCT = ["research-article", "Randomized Controlled Trial", "Journal Article"]; // PMC8459234
const UNTAGGED_RESEARCH = ["Research Support, Non-U.S. Gov't", "research-article", "Journal Article"]; // PMC10051082, the steps cohort

describe("screenPublicationType", () => {
  it("refuses a narrative review before any model reads it", () => {
    const result = screenPublicationType(NARRATIVE_REVIEW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/narrative review/);
  });

  it("passes a systematic review with a meta-analysis", () => {
    expect(screenPublicationType(META_ANALYSIS)).toEqual({ ok: true });
  });

  it("passes a trial, and a research article with no design tag (the gate judges it)", () => {
    expect(screenPublicationType(RCT)).toEqual({ ok: true });
    expect(screenPublicationType(UNTAGGED_RESEARCH)).toEqual({ ok: true });
    expect(screenPublicationType([])).toEqual({ ok: true });
  });

  it("refuses an editorial, a letter, a comment and a retraction notice, whatever the case", () => {
    for (const type of ["Editorial", "LETTER", "Comment", "Retraction of Publication"]) {
      expect(screenPublicationType(["Journal Article", type]).ok).toBe(false);
    }
  });
});

describe("publicationTypes", () => {
  it("reads the list, a single string, or nothing", () => {
    expect(publicationTypes({ pubTypeList: { pubType: RCT } })).toEqual(RCT);
    expect(publicationTypes({ pubTypeList: { pubType: "Review" } })).toEqual(["Review"]);
    expect(publicationTypes({})).toEqual([]);
  });
});
