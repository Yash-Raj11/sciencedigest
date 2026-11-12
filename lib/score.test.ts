import { describe, expect, it } from "vitest";
import { findConflicts } from "./conflicts";
import { addDays, diffDays, isDateString, isoWeekStart, isoWeekday } from "./dates";
import { WEIGHT_TENTHS, pct, weightLabel } from "./evidence";
import { protocolProgress } from "./progress";
import { score, streak, tickSet, type ScoreInput, type Step } from "./score";

/**
 * The hand-worked example. The same data is asserted against the SQL mirror in
 * supabase/tests/database/04_scoring.test.sql and traced line by line in the
 * operating manual ("How the score works"). Change one, change all three.
 *
 * Today is Thursday 2026-11-12; its ISO week starts Monday 2026-11-09.
 */
const P1 = "paper-one";
const P2 = "paper-two";
const steps: Step[] = [
  { id: "S1", paperId: P1, kind: "action", grade: "low" },
  { id: "S2", paperId: P1, kind: "action", grade: "none" },
  { id: "S3", paperId: P1, kind: "action", grade: "none" },
  { id: "S4", paperId: P1, kind: "weekly_target", grade: "low", targetPerWeek: 3, countsStepId: "S3" },
  { id: "S5", paperId: P2, kind: "condition", grade: "high", conditionKey: "block_weeks_gte", conditionValue: { weeks: 8 } },
  { id: "S6", paperId: P2, kind: "action", grade: "moderate", appliesWhen: { modality: "cycling" } },
  { id: "S7", paperId: P2, kind: "condition", grade: "low", conditionKey: "modality_is", conditionValue: { modality: "running" } },
  { id: "H1", paperId: null, kind: "action", grade: "none" },
];

function example(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    today: "2026-11-12",
    equipped: [
      { paperId: P1, lastActiveOn: "2026-11-12" },
      { paperId: P2, lastActiveOn: "2026-11-12" },
    ],
    steps,
    checkins: [
      { stepId: "S1", localDate: "2026-11-12" },
      { stepId: "S3", localDate: "2026-11-08" },
      { stepId: "S3", localDate: "2026-11-09" },
      { stepId: "S3", localDate: "2026-11-11" },
      { stepId: "H1", localDate: "2026-11-12" },
    ],
    programState: { [P2]: { blockStartedAt: "2026-09-17", choices: { modality: "running" } } },
    ...overrides,
  };
}

describe("score: the hand-worked example", () => {
  const r = score(example());

  it("earns 1.8 of a possible 2.2, which rounds to 82%", () => {
    expect(r.earned).toBe(1.8);
    expect(r.possible).toBe(2.2);
    expect(r.pct).toBe(82);
  });

  it("scores each paper on its own", () => {
    expect(r.perPaper[P1]).toEqual({ pct: 50, earned: 0.4, possible: 0.8 });
    expect(r.perPaper[P2]).toEqual({ pct: 100, earned: 1.4, possible: 1.4 });
  });

  it("leaves the weekly target unmet at 2 of 3: Sunday belongs to last week", () => {
    expect(r.satisfied).toEqual({ S1: true, S2: false, S3: false, S4: false, S5: true, S7: true, H1: true });
  });

  it("does not count a step that does not apply to the user's choices", () => {
    expect("S6" in r.satisfied).toBe(false);
  });

  it("counts consistency over daily boxes only: 2 of 3", () => {
    expect(r.consistency).toEqual({ pct: 67, done: 2, total: 3 });
  });
});

describe("score: rules that must fire", () => {
  it("an everyday habit never moves the evidence-weighted score", () => {
    const withTick = score(example());
    const without = score(example({ checkins: example().checkins.filter((c) => c.stepId !== "H1") }));
    expect(without.pct).toBe(withTick.pct);
    expect(without.earned).toBe(withTick.earned);
    expect(without.consistency.done).toBe(withTick.consistency.done - 1);
  });

  it("a third session this week satisfies the weekly target", () => {
    const input = example();
    input.checkins.push({ stepId: "S3", localDate: "2026-11-12" });
    expect(score(input).pct).toBe(100);
  });

  it("the eight-week condition is unmet at 55 days and met at 56", () => {
    expect(score(example({ today: "2026-11-11" })).satisfied.S5).toBe(false);
    expect(score(example()).satisfied.S5).toBe(true);
  });

  it("a condition with no block start date is unmet, not an error", () => {
    const r = score(example({ programState: { [P2]: { blockStartedAt: null, choices: { modality: "running" } } } }));
    expect(r.satisfied.S5).toBe(false);
  });

  it("7 idle days is still active; 8 is dormant and leaves the denominator", () => {
    const at7 = score(example({ equipped: [{ paperId: P1, lastActiveOn: "2026-11-12" }, { paperId: P2, lastActiveOn: "2026-11-05" }] }));
    expect(at7.dormant).toEqual([]);
    const at8 = score(example({ equipped: [{ paperId: P1, lastActiveOn: "2026-11-12" }, { paperId: P2, lastActiveOn: "2026-11-04" }] }));
    expect(at8.dormant).toEqual([P2]);
    expect(at8.possible).toBe(0.8);
    expect(at8.perPaper[P2]).toBeUndefined();
  });

  it("a tick on a different day does not satisfy today's action", () => {
    const r = score(example({ checkins: [{ stepId: "S1", localDate: "2026-11-11" }] }));
    expect(r.satisfied.S1).toBe(false);
  });

  it("nothing equipped and no habits scores 0 of 0 without dividing by zero", () => {
    const r = score({ today: "2026-11-12", equipped: [], steps: [], checkins: [], programState: {} });
    expect(r).toMatchObject({ pct: 0, earned: 0, possible: 0, consistency: { pct: 0, done: 0, total: 0 } });
  });

  it("a high-grade step outweighs a low-grade one by 2.5 to 1", () => {
    const two: Step[] = [
      { id: "lean", paperId: P1, kind: "action", grade: "high" },
      { id: "fat", paperId: P1, kind: "action", grade: "low" },
    ];
    const base = { today: "2026-11-12", equipped: [{ paperId: P1, lastActiveOn: "2026-11-12" }], steps: two, programState: {} };
    expect(score({ ...base, checkins: [{ stepId: "lean", localDate: "2026-11-12" }] }).pct).toBe(71);
    expect(score({ ...base, checkins: [{ stepId: "fat", localDate: "2026-11-12" }] }).pct).toBe(29);
  });
});

describe("streak", () => {
  const days = ["2026-11-08", "2026-11-09", "2026-11-11", "2026-11-12"];
  it("counts back from today", () => expect(streak(days, "2026-11-12")).toBe(2));
  it("still reads yesterday's streak before today's first tick", () => expect(streak(days, "2026-11-13")).toBe(2));
  it("is 0 after two empty days", () => expect(streak(days, "2026-11-14")).toBe(0));
  it("is 0 with no ticks at all", () => expect(streak([], "2026-11-12")).toBe(0));
});

describe("protocolProgress", () => {
  const input = example();
  const r = score(input);
  const ticks = tickSet(input.checkins);

  it("counts requirements, not weight: paper one is 1 of 3 = 33%", () => {
    const p = protocolProgress(P1, steps, r.satisfied, ticks, input.today);
    expect(p).toMatchObject({ pct: 33, done: 1, total: 3 });
    expect(p.weekCounts.S4).toBe(2);
  });

  it("skips steps that do not apply: paper two is 2 of 2 = 100%", () => {
    const p = protocolProgress(P2, steps, r.satisfied, ticks, input.today, input.programState[P2]);
    expect(p).toMatchObject({ pct: 100, done: 2, total: 2 });
  });
});

describe("findConflicts", () => {
  const tracks: Step[] = [
    { id: "cycle", paperId: P2, kind: "condition", grade: "high", conditionKey: "modality_is", conditionValue: { modality: "cycling" }, appliesWhen: { lean: "on" } },
    { id: "run", paperId: P2, kind: "condition", grade: "low", conditionKey: "modality_is", conditionValue: { modality: "running" }, appliesWhen: { fat: "on" } },
  ];
  it("flags two applicable steps that demand different modalities", () => {
    const found = findConflicts([P2], tracks, { [P2]: { blockStartedAt: null, choices: { lean: "on", fat: "on" } } });
    expect(found).toEqual([{ paperId: P2, kind: "modality", demands: [{ stepId: "cycle", value: "cycling" }, { stepId: "run", value: "running" }] }]);
  });
  it("stays quiet when only one track is on", () => {
    expect(findConflicts([P2], tracks, { [P2]: { blockStartedAt: null, choices: { lean: "on" } } })).toEqual([]);
  });
});

describe("dates and evidence helpers", () => {
  it("ISO weeks start on Monday", () => {
    expect(isoWeekStart("2026-11-12")).toBe("2026-11-09");
    expect(isoWeekStart("2026-11-09")).toBe("2026-11-09");
    expect(isoWeekStart("2026-11-08")).toBe("2026-11-02");
    expect(isoWeekday("2026-11-08")).toBe(6);
  });
  it("crosses month, year and leap-day boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(diffDays("2026-11-12", "2026-09-17")).toBe(56);
  });
  it("rejects strings that are not real dates", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("12-11-2026")).toBe(false);
    expect(isDateString("2026-11-12")).toBe(true);
  });
  it("rounds half up in whole numbers", () => {
    expect(pct(1, 8)).toBe(13);
    expect(pct(18, 22)).toBe(82);
    expect(pct(0, 0)).toBe(0);
  });
  it("weights are 1.0 / 0.7 / 0.4 / 0", () => {
    expect(WEIGHT_TENTHS).toEqual({ high: 10, moderate: 7, low: 4, none: 0 });
    expect(weightLabel("none")).toBe("×0");
    expect(weightLabel("high")).toBe("×1.0");
  });
});
