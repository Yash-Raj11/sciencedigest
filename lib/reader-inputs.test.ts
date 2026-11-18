/**
 * Reader inputs on the device only (docs/SIMULATORS.md e; owner, 2026-11-19). Each test fails
 * when its rule is broken: docs/evidence/reader-inputs/breaks.txt shows each break.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DECAY_INPUTS, READER_INPUTS_PREFIX, SWITCH_INPUTS, WEEK_INPUTS, createScratchpad, deviceStorage, hasInputs, inputsKey,
  mealInputs, parseInputs, routineInputs, serialiseInputs, type DeviceStorage,
} from "./reader-inputs";

/** localStorage in memory: one per "device", kept across scratchpads as a reload would. */
class MemoryStorage implements DeviceStorage {
  items = new Map<string, string>();
  get length() { return this.items.size; }
  key(i: number) { return [...this.items.keys()][i] ?? null; }
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
  removeItem(key: string) { this.items.delete(key); }
}

/** Storage that refuses everything, as a blocked private window can. */
class ThrowingStorage implements DeviceStorage {
  get length(): number { throw new Error("SecurityError"); }
  key(): string | null { throw new Error("SecurityError"); }
  getItem(): string | null { throw new Error("SecurityError"); }
  setItem(): void { throw new Error("QuotaExceededError"); }
  removeItem(): void { throw new Error("SecurityError"); }
}

const CAFFEINE = inputsKey("daytime-caffeine-sleep", "decay");
const STEPS = inputsKey("steps-days-per-week", "association-curve");
const stored = (text: Record<string, unknown>) => JSON.stringify({ v: 1, values: text });

describe("reader inputs: round trip", () => {
  it("what a reader types comes back on a reopened read (a new scratchpad on the same storage)", () => {
    const device = new MemoryStorage();
    createScratchpad(() => device).write(CAFFEINE, DECAY_INPUTS, { dose: "16:00", bed: "23:00", amount: "95" });
    const reopened = createScratchpad(() => device);
    expect(reopened.read(CAFFEINE, DECAY_INPUTS)).toEqual({ dose: "16:00", bed: "23:00", amount: "95" });
  });

  it("every simulator's shape survives the trip", () => {
    const device = new MemoryStorage();
    const pad = createScratchpad(() => device);
    const meals = mealInputs(["plain", "pepper", "turmeric", "both"]);
    const routine = routineInputs([{ id: "modality", options: [{ id: "cycling" }, { id: "running" }] }, { id: "rest", options: [{ id: "active" }, { id: "passive" }] }]);
    pad.write(STEPS, WEEK_INPUTS, { week: [true, false, false, true, false, false, false] });
    pad.write("sd.sim.turmeric-pepper-breakfast.breakfast-meals", meals, { meal: "both" });
    pad.write("sd.sim.turmeric-pepper-breakfast.first-half-hour", SWITCH_INPUTS, { picked: { pepper: true, turmeric: false } });
    pad.write("sd.sim.hiit-body-composition.order-flips", routine, { picks: { modality: "cycling", rest: "passive" } });
    const again = createScratchpad(() => device);
    expect(again.read(STEPS, WEEK_INPUTS)).toEqual({ week: [true, false, false, true, false, false, false] });
    expect(again.read("sd.sim.turmeric-pepper-breakfast.breakfast-meals", meals)).toEqual({ meal: "both" });
    expect(again.read("sd.sim.turmeric-pepper-breakfast.first-half-hour", SWITCH_INPUTS)).toEqual({ picked: { pepper: true, turmeric: false } });
    expect(again.read("sd.sim.hiit-body-composition.order-flips", routine)).toEqual({ picks: { modality: "cycling", rest: "passive" } });
  });

  it("the stored value is versioned JSON under sd.sim.<slug>.<simulator>, with nothing but the reader's answers", () => {
    const device = new MemoryStorage();
    createScratchpad(() => device).write(CAFFEINE, DECAY_INPUTS, { dose: "16:00", amount: "95" });
    expect([...device.items.keys()]).toEqual(["sd.sim.daytime-caffeine-sleep.decay"]);
    expect(JSON.parse(device.getItem(CAFFEINE)!)).toEqual({ v: 1, values: { dose: "16:00", amount: "95" } });
  });

  it("an unset input stays unset: an empty field is not stored, and a simulator with nothing typed has no key", () => {
    const device = new MemoryStorage();
    const pad = createScratchpad(() => device);
    pad.write(CAFFEINE, DECAY_INPUTS, { dose: "16:00", bed: "", amount: "" });
    expect(createScratchpad(() => device).read(CAFFEINE, DECAY_INPUTS)).toEqual({ dose: "16:00" });
    pad.write(CAFFEINE, DECAY_INPUTS, { dose: "", bed: "", amount: "" });
    expect(device.getItem(CAFFEINE)).toBeNull();
    expect(createScratchpad(() => device).read(CAFFEINE, DECAY_INPUTS)).toEqual({});
  });
});

describe("reader inputs: junk never crashes a read", () => {
  const junk: [string, string][] = [
    ["not JSON", "{dose: 16:00"],
    ["JSON that is not an object", '"16:00"'],
    ["an array", "[1,2,3]"],
    ["null", "null"],
    ["no version", JSON.stringify({ values: { dose: "16:00" } })],
    ["another version", JSON.stringify({ v: 2, values: { dose: "16:00" } })],
    ["values that are not an object", JSON.stringify({ v: 1, values: "16:00" })],
    ["values that are an array", JSON.stringify({ v: 1, values: ["16:00"] })],
    ["far too long", stored({ dose: "16:00", pad: "x".repeat(5000) })],
  ];
  for (const [what, text] of junk) {
    it(`${what}: nothing comes back`, () => {
      const device = new MemoryStorage();
      device.setItem(CAFFEINE, text);
      expect(createScratchpad(() => device).read(CAFFEINE, DECAY_INPUTS)).toEqual({});
    });
  }

  it("a field the shape does not name is dropped", () => {
    expect(parseInputs(stored({ dose: "16:00", userId: "abc" }), DECAY_INPUTS)).toEqual({ dose: "16:00" });
    expect(parseInputs('{"v":1,"values":{"__proto__":{"amount":"95"},"dose":"16:00"}}', DECAY_INPUTS)).toEqual({ dose: "16:00" });
  });
});

describe("reader inputs: storage that throws", () => {
  it("blocked storage reads as nothing typed, and the simulator still works for this visit", () => {
    const pad = createScratchpad(() => new ThrowingStorage());
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({});
    expect(pad.write(CAFFEINE, DECAY_INPUTS, { dose: "16:00" })).toBe(false);
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({ dose: "16:00" });
    expect(() => pad.clear(CAFFEINE)).not.toThrow();
    expect(() => pad.clearAll()).not.toThrow();
    expect(pad.stored()).toBe(0);
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({});
  });

  it("no storage at all (the server, or a browser without it) reads as nothing typed", () => {
    const pad = createScratchpad(() => null);
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({});
    expect(pad.write(CAFFEINE, DECAY_INPUTS, { dose: "16:00" })).toBe(false);
  });

  it("deviceStorage() gives null where touching localStorage throws", () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError"); } });
    try {
      expect(deviceStorage()).toBeNull();
    } finally {
      if (before) Object.defineProperty(globalThis, "localStorage", before);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

describe("reader inputs: a value outside the simulator's own range or shape is dropped, not clamped", () => {
  it("caffeine: times must be HH:MM in a day; the amount a plain number of 0 or more", () => {
    const read = (values: Record<string, unknown>) => parseInputs(stored(values), DECAY_INPUTS);
    expect(read({ dose: "24:00", bed: "23:60", amount: "-5" })).toEqual({});
    expect(read({ dose: "7:00", bed: "11 pm", amount: "1e400" })).toEqual({});
    expect(read({ dose: 960, bed: null, amount: 95 })).toEqual({});
    expect(read({ dose: "25:00", bed: "23:00", amount: "abc" })).toEqual({ bed: "23:00" });
    expect(read({ dose: "00:00", bed: "23:59", amount: "0" })).toEqual({ dose: "00:00", bed: "23:59", amount: "0" });
    expect(read({ amount: "95.5" })).toEqual({ amount: "95.5" });
  });

  it("steps: exactly seven days, each ticked or not", () => {
    const read = (week: unknown) => parseInputs(stored({ week }), WEEK_INPUTS);
    expect(read([true, false, true, false, false, false])).toEqual({});
    expect(read([true, false, true, false, false, false, false, true])).toEqual({});
    expect(read([true, "yes", false, false, false, false, false])).toEqual({});
    expect(read([1, 0, 0, 0, 0, 0, 0])).toEqual({});
    expect(read([false, false, false, false, false, false, false])).toEqual({ week: [false, false, false, false, false, false, false] });
  });

  it("turmeric: a meal the read no longer offers is dropped (a correction never reads an old pick)", () => {
    const now = mealInputs(["plain", "pepper", "both"]);
    expect(parseInputs(stored({ meal: "turmeric" }), now)).toEqual({});
    expect(parseInputs(stored({ meal: "PEPPER" }), now)).toEqual({});
    expect(parseInputs(stored({ meal: "pepper" }), now)).toEqual({ meal: "pepper" });
  });

  it("turmeric switches: both switches or neither", () => {
    const read = (picked: unknown) => parseInputs(stored({ picked }), SWITCH_INPUTS);
    expect(read({ pepper: true })).toEqual({});
    expect(read({ pepper: true, turmeric: "no" })).toEqual({});
    expect(read({ pepper: true, turmeric: false, sugar: true })).toEqual({});
    expect(read({ pepper: false, turmeric: true })).toEqual({ picked: { pepper: false, turmeric: true } });
  });

  it("HIIT: each pick must be one of its setting's options; a pick that no longer fits goes alone", () => {
    const routine = routineInputs([{ id: "modality", options: [{ id: "cycling" }, { id: "running" }] }, { id: "weeks", options: [{ id: "over8" }] }]);
    expect(parseInputs(stored({ picks: { modality: "rowing", weeks: "over8" } }), routine)).toEqual({ picks: { weeks: "over8" } });
    expect(parseInputs(stored({ picks: { colour: "red" } }), routine)).toEqual({});
    expect(parseInputs(stored({ picks: ["cycling"] }), routine)).toEqual({});
  });

  it("a value typed on this visit is kept as typed while the read is open, but only checked values are stored", () => {
    const device = new MemoryStorage();
    const pad = createScratchpad(() => device);
    pad.write(CAFFEINE, DECAY_INPUTS, { dose: "16:00", amount: "-5" });
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({ dose: "16:00", amount: "-5" });
    expect(JSON.parse(device.getItem(CAFFEINE)!).values).toEqual({ dose: "16:00" });
    expect(createScratchpad(() => device).read(CAFFEINE, DECAY_INPUTS)).toEqual({ dose: "16:00" });
  });

  it("serialiseInputs never writes a value its check refuses", () => {
    expect(serialiseInputs({ dose: "99:99", amount: "-1" }, DECAY_INPUTS)).toBeNull();
  });
});

describe("reader inputs: one paper's key is never read by another", () => {
  it("each paper and simulator has its own key", () => {
    expect(inputsKey("daytime-caffeine-sleep", "decay")).not.toBe(inputsKey("steps-days-per-week", "decay"));
    expect(inputsKey("daytime-caffeine-sleep", "decay")).toBe(`${READER_INPUTS_PREFIX}daytime-caffeine-sleep.decay`);
  });

  it("caffeine's answers are not seen by another read using the same kind, and clearing one leaves the other", () => {
    const device = new MemoryStorage();
    const pad = createScratchpad(() => device);
    const other = inputsKey("another-caffeine-paper", "decay");
    pad.write(CAFFEINE, DECAY_INPUTS, { dose: "16:00", bed: "23:00", amount: "95" });
    expect(pad.read(other, DECAY_INPUTS)).toEqual({});
    expect(createScratchpad(() => device).read(other, DECAY_INPUTS)).toEqual({});
    pad.write(other, DECAY_INPUTS, { dose: "08:00" });
    pad.clear(other);
    expect(createScratchpad(() => device).read(CAFFEINE, DECAY_INPUTS)).toEqual({ dose: "16:00", bed: "23:00", amount: "95" });
  });

  it("names that could run two keys together are refused", () => {
    expect(() => inputsKey("daytime.caffeine", "decay")).toThrow();
    expect(() => inputsKey("daytime-caffeine-sleep", "de.cay")).toThrow();
    expect(() => inputsKey("Daytime", "decay")).toThrow();
    expect(() => inputsKey("", "decay")).toThrow();
  });
});

describe("reader inputs: clearing", () => {
  it("clear forgets one simulator; clearAll forgets every simulator and nothing else on the device", () => {
    const device = new MemoryStorage();
    device.setItem("sd-theme", "dark");
    device.setItem("sd-store-v1", '{"state":{"checkins":[]}}');
    const pad = createScratchpad(() => device);
    pad.write(CAFFEINE, DECAY_INPUTS, { dose: "16:00" });
    pad.write(STEPS, WEEK_INPUTS, { week: [true, true, true, true, true, true, true] });
    expect(pad.stored()).toBe(2);
    pad.clear(CAFFEINE);
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({});
    expect(device.getItem(CAFFEINE)).toBeNull();
    expect(pad.stored()).toBe(1);
    expect(pad.clearAll()).toBe(1);
    expect(pad.read(STEPS, WEEK_INPUTS)).toEqual({});
    expect([...device.items.keys()].sort()).toEqual(["sd-store-v1", "sd-theme"]);
  });

  it("listeners hear writes and clears; another tab's change is picked up after forget", () => {
    const device = new MemoryStorage();
    const pad = createScratchpad(() => device);
    let heard = 0;
    const stop = pad.subscribe(() => heard++);
    pad.write(CAFFEINE, DECAY_INPUTS, { dose: "16:00" });
    pad.clear(CAFFEINE);
    pad.clearAll();
    expect(heard).toBe(3);
    device.setItem(CAFFEINE, stored({ dose: "09:30" }));
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({});
    pad.forget(CAFFEINE);
    expect(pad.read(CAFFEINE, DECAY_INPUTS)).toEqual({ dose: "09:30" });
    pad.forget("sd-theme");
    expect(heard).toBe(4);
    stop();
    pad.clearAll();
    expect(heard).toBe(4);
  });

  it("hasInputs: empty strings and missing fields are nothing typed", () => {
    expect(hasInputs({})).toBe(false);
    expect(hasInputs({ dose: "", bed: undefined })).toBe(false);
    expect(hasInputs({ dose: "16:00" })).toBe(true);
    expect(hasInputs({ week: [false, false, false, false, false, false, false] })).toBe(true);
  });
});

describe("reader inputs: never synced, never in the store", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx|mts)$/.test(name) ? [path] : [];
    });

  it("the helper imports nothing (no React, no Next, no Supabase, no store)", () => {
    expect(readFileSync("lib/reader-inputs.ts", "utf8")).not.toMatch(/^\s*import\s/m);
  });

  it("nothing that saves or syncs (lib/store, lib/supabase, supabase/) mentions reader inputs", () => {
    for (const file of [...walk("lib/store"), ...walk("lib/supabase"), ...walk("supabase")].filter((f) => !f.endsWith(".test.ts"))) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/reader-inputs|sd\.sim\.|scratchpad/);
    }
  });

  it("figures get remembered values as props: no figure file touches the scratchpad or storage", () => {
    const figures = [...walk("components/figures"), ...walk("components/papers")];
    for (const file of figures) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/localStorage|sessionStorage|\bscratchpad\b|deviceStorage|components\/read\/remembered/);
      expect(source, file).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+"@\/lib\/reader-inputs"/m);
    }
  });
});
