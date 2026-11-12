import { describe, expect, it } from "vitest";
import { EMPTY_DATA, SAVED_VERSION, applyWrite, checkinsOf, enqueue, enqueuePending, hold, migrateSaved, pruneTicks, reconcile, type Data, type HeldWrite, type Write } from "./reduce";

const tick = (stepId: string, localDate = "2026-11-12"): Write => ({ op: "tick", stepId, localDate });
const untick = (stepId: string, localDate = "2026-11-12"): Write => ({ op: "untick", stepId, localDate });

describe("applyWrite", () => {
  it("ticks once, however many times it is asked", () => {
    const once = applyWrite(EMPTY_DATA, tick("a"));
    expect(applyWrite(once, tick("a"))).toBe(once);
    expect(once.ticks).toEqual({ "2026-11-12": ["a"] });
  });
  it("removes the day when its last tick is undone", () => {
    expect(applyWrite(applyWrite(EMPTY_DATA, tick("a")), untick("a")).ticks).toEqual({});
  });
  it("re-equipping moves the start date instead of adding a second entry", () => {
    const first = applyWrite(EMPTY_DATA, { op: "equip", paperId: "p", localDate: "2026-11-01" });
    const again = applyWrite(first, { op: "equip", paperId: "p", localDate: "2026-11-12" });
    expect(again.equipped).toEqual([{ paperId: "p", since: "2026-11-12" }]);
  });
  it("un-equipping keeps the ticks: history is never thrown away", () => {
    let data = applyWrite(EMPTY_DATA, { op: "equip", paperId: "p", localDate: "2026-11-12" });
    data = applyWrite(data, tick("a"));
    data = applyWrite(data, { op: "unequip", paperId: "p" });
    expect(data.equipped).toEqual([]);
    expect(data.ticks).toEqual({ "2026-11-12": ["a"] });
  });
  it("retires a habit rather than deleting it", () => {
    let data = applyWrite(EMPTY_DATA, { op: "habit_add", id: "h", label: "Drink 3 L water", position: 1 });
    data = applyWrite(data, { op: "habit_update", id: "h", retired: true });
    expect(data.habits).toEqual([{ id: "h", label: "Drink 3 L water", position: 1, retired: true, kind: "check", unit: null, target: null }]);
  });
  it("never mutates its input", () => {
    const frozen = Object.freeze({ ...EMPTY_DATA, ticks: Object.freeze({ "2026-11-12": Object.freeze(["a"]) }) }) as unknown as Data;
    expect(() => applyWrite(frozen, tick("b"))).not.toThrow();
    expect(() => applyWrite(frozen, untick("a"))).not.toThrow();
  });
});

describe("the queue", () => {
  it("last write wins per step and day", () => {
    const queue = enqueue(enqueue(enqueue([], tick("a")), tick("b")), untick("a"));
    expect(queue).toEqual([tick("b"), untick("a")]);
  });
  it("keeps writes for the same step on different days", () => {
    expect(enqueue([tick("a", "2026-11-11")], tick("a", "2026-11-12"))).toHaveLength(2);
  });
  it("keeps only the newest programme setting per paper", () => {
    const one: Write = { op: "program", paperId: "p", blockStartedAt: null, choices: { modality: "cycling" } };
    const two: Write = { op: "program", paperId: "p", blockStartedAt: "2026-11-12", choices: { modality: "running" } };
    expect(enqueue([one], two)).toEqual([two]);
  });
});

describe("reconcile", () => {
  it("replays unsent writes on top of the server's copy", () => {
    const server: Data = { ...EMPTY_DATA, ticks: { "2026-11-12": ["a", "b"] } };
    const local = reconcile(server, [untick("a"), tick("c")]);
    expect(local.ticks).toEqual({ "2026-11-12": ["b", "c"] });
  });
  it("with nothing queued, the server's copy is the truth", () => {
    const server: Data = { ...EMPTY_DATA, ticks: { "2026-11-12": ["a"] } };
    expect(reconcile(server, [])).toBe(server);
  });
});

describe("helpers", () => {
  it("flattens and prunes ticks", () => {
    const ticks = { "2026-01-01": ["a"], "2026-11-12": ["a", "b"] };
    expect(checkinsOf(ticks)).toHaveLength(3);
    expect(pruneTicks(ticks, "2026-06-01")).toEqual({ "2026-11-12": ["a", "b"] });
  });
});

describe("amounts (target and count habits)", () => {
  const day = "2026-11-12";
  const set = (data: Data, amount: number, needed: number) => applyWrite(data, { op: "amount", stepId: "h1", localDate: day, amount, needed });

  it("below the target: the amount is kept and there is no tick", () => {
    const data = set(EMPTY_DATA, 12, 20);
    expect(data.amounts[day].h1).toBe(12);
    expect(data.ticks[day]).toBeUndefined();
  });
  it("reaching the target adds the tick; passing it does not add a second", () => {
    const data = set(set(set(EMPTY_DATA, 12, 20), 20, 20), 25, 20);
    expect(data.ticks[day]).toEqual(["h1"]);
  });
  it("falling back below the target removes the tick", () => {
    const data = set(set(EMPTY_DATA, 20, 20), 19, 20);
    expect(data.ticks[day]).toBeUndefined();
    expect(data.amounts[day].h1).toBe(19);
  });
  it("a count habit is done at 1 and undone at 0", () => {
    expect(set(EMPTY_DATA, 1, 1).ticks[day]).toEqual(["h1"]);
    expect(set(set(EMPTY_DATA, 3, 1), 0, 1).ticks[day]).toBeUndefined();
  });
  it("clamps nonsense: negative becomes 0, fractions round", () => {
    expect(set(EMPTY_DATA, -5, 1).amounts[day].h1).toBe(0);
    expect(set(EMPTY_DATA, 2.6, 1).amounts[day].h1).toBe(3);
  });
  it("six quick taps while offline send one write, the last", () => {
    let queue: Write[] = [];
    for (let n = 1; n <= 6; n += 1) queue = enqueue(queue, { op: "amount", stepId: "h1", localDate: day, amount: n, needed: 1 });
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ amount: 6 });
  });
  it("replaying a queued amount on top of the server's copy gives the same tick", () => {
    const server: Data = { ...EMPTY_DATA, amounts: { [day]: { h1: 4 } } };
    const merged = reconcile(server, [{ op: "amount", stepId: "h1", localDate: day, amount: 20, needed: 20 }]);
    expect(merged.amounts[day].h1).toBe(20);
    expect(merged.ticks[day]).toEqual(["h1"]);
  });
});

describe("held writes keep their order", () => {
  const day = "2026-11-13";
  const amount = (n: number, localDate = day): Write => ({ op: "amount", stepId: "water", localDate, amount: n, needed: 12 });
  const since = "2026-11-13T08:00:00.000Z";
  const later = "2026-11-13T09:00:00.000Z";
  const heldAmount = (n: number): HeldWrite => ({ write: amount(n), code: "PGRST202", since });

  it("a newer amount for the same habit and day replaces the held one, so the older can never overwrite it", () => {
    const next = enqueuePending({ queue: [], held: [heldAmount(2)] }, amount(5), later);
    expect(next.queue).toEqual([]); // it does not go to the server ahead of the held one
    expect(next.held.map((h) => h.write)).toEqual([amount(5)]);
    // Whatever order the server answers in, the last amount to arrive is the newest.
    expect(reconcile(EMPTY_DATA, next.queue, next.held).amounts[day]).toEqual({ water: 5 });
  });

  it("a write about the same habit on another day waits behind the held one, in order", () => {
    const next = enqueuePending({ queue: [], held: [heldAmount(2)] }, amount(1, "2026-11-14"), later);
    expect(next.queue).toEqual([]);
    expect(next.held.map((h) => h.write)).toEqual([amount(2), amount(1, "2026-11-14")]);
    expect(next.held[1]).toMatchObject({ code: "PGRST202", since: later });
  });

  it("a write about something else goes to the queue as usual", () => {
    const next = enqueuePending({ queue: [], held: [heldAmount(2)] }, tick("walk"), later);
    expect(next.queue).toEqual([tick("walk")]);
    expect(next.held).toEqual([heldAmount(2)]);
  });

  it("holding a write takes the queued writes about the same thing with it and leaves the rest", () => {
    const add: Write = { op: "habit_add", id: "h1", label: "Read", position: 1 };
    const rename: Write = { op: "habit_update", id: "h1", label: "Read 20 pages" };
    const queue = [add, tick("walk"), tick("h1"), rename];
    const next = hold({ queue, held: [] }, add, "PGRST202", since);
    expect(next.queue).toEqual([tick("walk")]);
    expect(next.held.map((h) => h.write)).toEqual([add, tick("h1"), rename]);
  });

  it("a write that a newer one already replaced in the queue is not held", () => {
    const stale = amount(1);
    const pending = { queue: [amount(2)], held: [] };
    expect(hold(pending, stale, "PGRST202", since)).toBe(pending);
  });

  it("held writes still show on screen after a pull", () => {
    expect(reconcile(EMPTY_DATA, [tick("walk", day)], [heldAmount(12)]).ticks[day]?.sort()).toEqual(["walk", "water"]);
  });
});

describe("the saved state from an older version", () => {
  it("version 2 loads as version 3 with nothing lost and an empty held list", () => {
    expect(SAVED_VERSION).toBe(3);
    const v2 = {
      data: {
        equipped: [{ paperId: "p1", since: "2026-11-01" }],
        ticks: { "2026-11-12": ["a", "b"] },
        program: { p1: { blockStartedAt: "2026-11-02", choices: { days: "3" } } },
        habits: [{ id: "h1", label: "Drink 3 L of water", position: 1, retired: false, kind: "target", unit: "glasses", target: 12 }],
        amounts: { "2026-11-12": { h1: 5 } },
      },
      queue: [{ op: "tick", stepId: "a", localDate: "2026-11-13" }],
      demoTier: "free",
    };
    const before = structuredClone(v2);
    expect(migrateSaved(v2)).toEqual({ ...before, held: [] });
  });

  it("version 1 (no amounts, no habit kinds) is filled in, not reset", () => {
    const v1 = { data: { equipped: [], ticks: { "2026-11-01": ["a"] }, program: {}, habits: [{ id: "h1", label: "Stretch", position: 1, retired: false }] }, queue: [] };
    expect(migrateSaved(v1)).toEqual({
      data: { equipped: [], ticks: { "2026-11-01": ["a"] }, program: {}, amounts: {}, habits: [{ id: "h1", label: "Stretch", position: 1, retired: false, kind: "check", unit: null, target: null }] },
      queue: [], held: [],
    });
  });
});
