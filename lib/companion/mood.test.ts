import { describe, expect, it } from "vitest";
import { lineFor, moodOf } from "./mood";

describe("moodOf", () => {
  it("is asleep with nothing ticked and no streak", () => expect(moodOf({ done: 0, total: 4, streak: 0 })).toBe("resting"));
  it("is awake and waiting when a streak is alive but today is empty", () => expect(moodOf({ done: 0, total: 4, streak: 3 })).toBe("waiting"));
  it("perks up on the first tick", () => expect(moodOf({ done: 1, total: 4, streak: 1 })).toBe("alert"));
  it("is lively from half way", () => expect(moodOf({ done: 2, total: 4, streak: 1 })).toBe("lively"));
  it("glows only when every daily box is ticked", () => {
    expect(moodOf({ done: 3, total: 4, streak: 9 })).toBe("lively");
    expect(moodOf({ done: 4, total: 4, streak: 9 })).toBe("glowing");
  });
  it("a new user with nothing to tick is asleep, not glowing (0 of 0 is not 'all done')", () =>
    expect(moodOf({ done: 0, total: 0, streak: 0 })).toBe("resting"));
  it("a long streak alone never makes it glow", () => expect(moodOf({ done: 0, total: 2, streak: 200 })).toBe("waiting"));
});

describe("lineFor", () => {
  const cases = [
    { done: 0, total: 0, streak: 0 }, { done: 0, total: 3, streak: 0 }, { done: 0, total: 3, streak: 5 },
    { done: 1, total: 3, streak: 1 }, { done: 2, total: 3, streak: 2 }, { done: 3, total: 3, streak: 12 },
  ];
  it("never makes a claim about health or the body", () => {
    for (const input of cases) {
      expect(lineFor(moodOf(input), input)).not.toMatch(/health|healthy|sick|energy|body|stronger|fitter|sleep better|weight/i);
    }
  });
  it("states the counts it was given", () => {
    expect(lineFor("lively", { done: 2, total: 3, streak: 2 })).toBe("2 of 3 done. 1 to go.");
    expect(lineFor("glowing", { done: 3, total: 3, streak: 12 })).toBe("Everything for today is done. 12 days running.");
  });
});
